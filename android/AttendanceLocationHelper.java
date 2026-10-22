package com.arshithconnect.attendance;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.location.Location;
import android.location.LocationManager;
import android.net.Uri;
import android.provider.Settings;
import android.util.Log;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.google.android.gms.location.FusedLocationProviderClient;
import com.google.android.gms.location.LocationServices;
import com.google.android.gms.location.Priority;
import com.google.android.gms.tasks.CancellationTokenSource;

/**
 * AttendanceLocationHelper
 *
 * Implements authoritative office GPS Geofencing and WFO / WFH check-in verification
 * using only the required exact coordinates:
 * - Latitude: 12.9104417
 * - Longitude: 77.6442435
 * - Radius: 100 metres
 */
public class AttendanceLocationHelper {

    private static final String TAG = "AttendanceLocation";

    // =========================================================================
    // 1. Authoritative Office Coordinates & Geofencing Constants
    // =========================================================================
    public static final double OFFICE_LATITUDE = 12.9104417;
    public static final double OFFICE_LONGITUDE = 77.6442435;
    public static final float OFFICE_RADIUS_METERS = 250f;
    public static final float MAX_GPS_ACCURACY_METERS = 100f;

    public static final int LOCATION_PERMISSION_REQUEST_CODE = 1001;

    // Host Activity reference
    private final AppCompatActivity activity;
    private final FusedLocationProviderClient fusedLocationClient;
    private final AttendanceCallbacks callbacks;

    // Interface to connect to host activity check-in and camera workflow
    public interface AttendanceCallbacks {
        void onProceedToCameraCheckIn(Location verifiedLocation);
        void onProceedToLateCheckIn(String workMode);
        void onLocationVerificationFailed(String reason, String errorCode);
    }

    public AttendanceLocationHelper(@NonNull AppCompatActivity activity, @NonNull AttendanceCallbacks callbacks) {
        this.activity = activity;
        this.callbacks = callbacks;
        this.fusedLocationClient = LocationServices.getFusedLocationProviderClient(activity);
    }

    /**
     * Primary Check-In Entrypoint
     *
     * Validates work mode:
     * - "WFH": Bypasses all location permissions and GPS geofence checks completely.
     *          Proceeds directly to late validation / camera selfie check-in.
     * - "WFO": Enforces runtime permissions, fresh high-accuracy GPS acquisition,
     *          accuracy threshold (<= 50m), and geofence radius check (<= 100m).
     *
     * @param selectedWorkMode "WFO" or "WFH"
     */
    public void checkLocationAndCheckIn(String selectedWorkMode) {

        // ========================================================
        // A. WFH Check-In Workflow (No GPS or Geofencing Required)
        // ========================================================
        if ("WFH".equals(selectedWorkMode)) {
            Log.d(TAG, "WFH mode selected. Bypassing location permissions and GPS geofence.");
            callbacks.onProceedToLateCheckIn("WFH");
            return;
        }

        // ========================================================
        // B. WFO Check-In Workflow (Strict GPS Verification)
        // ========================================================
        boolean fineLocationGranted = ContextCompat.checkSelfPermission(
                activity,
                Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED;

        boolean coarseLocationGranted = ContextCompat.checkSelfPermission(
                activity,
                Manifest.permission.ACCESS_COARSE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED;

        // 1. Check runtime permissions
        if (!fineLocationGranted && !coarseLocationGranted) {
            Log.d(TAG, "Location permissions not granted. Requesting ACCESS_FINE_LOCATION.");
            ActivityCompat.requestPermissions(
                    activity,
                    new String[]{
                            Manifest.permission.ACCESS_FINE_LOCATION,
                            Manifest.permission.ACCESS_COARSE_LOCATION
                    },
                    LOCATION_PERMISSION_REQUEST_CODE
            );
            return;
        }

        // 2. Verify GPS Hardware / Device Location Provider is enabled
        LocationManager locationManager = (LocationManager) activity.getSystemService(Context.LOCATION_SERVICE);
        boolean isGpsEnabled = locationManager != null &&
                (locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER) ||
                 locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER));

        if (!isGpsEnabled) {
            String errorMsg = "Unable to get your location. Please turn on device GPS/Location services.";
            Toast.makeText(activity, errorMsg, Toast.LENGTH_LONG).show();
            callbacks.onLocationVerificationFailed(errorMsg, "GPS_DISABLED");
            promptEnableGps();
            return;
        }

        // 3. Acquire fresh high-accuracy location reading (Avoid stale cached readings)
        fetchFreshLocationAndValidate();
    }

    /**
     * Acquire a fresh location reading with high accuracy using FusedLocationProviderClient.
     * Uses getCurrentLocation() first, falling back to getLastLocation() if necessary.
     */
    @SuppressWarnings("MissingPermission")
    private void fetchFreshLocationAndValidate() {
        CancellationTokenSource cancellationTokenSource = new CancellationTokenSource();

        Toast.makeText(activity, "Verifying office location...", Toast.LENGTH_SHORT).show();

        fusedLocationClient.getCurrentLocation(Priority.PRIORITY_HIGH_ACCURACY, cancellationTokenSource.getToken())
                .addOnSuccessListener(activity, location -> {
                    if (location != null) {
                        validateLocationReading(location);
                    } else {
                        // Fallback to getLastLocation() if fresh reading is temporarily null
                        fallbackToLastLocation();
                    }
                })
                .addOnFailureListener(activity, e -> {
                    Log.w(TAG, "getCurrentLocation failed, trying getLastLocation fallback: " + e.getMessage());
                    fallbackToLastLocation();
                });
    }

    /**
     * Fallback to getLastLocation() if getCurrentLocation() does not return a fix.
     */
    @SuppressWarnings("MissingPermission")
    private void fallbackToLastLocation() {
        fusedLocationClient.getLastLocation()
                .addOnSuccessListener(activity, location -> {
                    if (location == null) {
                        String msg = "Unable to get your location. Please turn on GPS and ensure clear satellite reception.";
                        Toast.makeText(activity, msg, Toast.LENGTH_LONG).show();
                        callbacks.onLocationVerificationFailed(msg, "POSITION_UNAVAILABLE");
                        return;
                    }
                    validateLocationReading(location);
                })
                .addOnFailureListener(activity, e -> {
                    String msg = "Failed to acquire GPS location: " + e.getMessage();
                    Toast.makeText(activity, msg, Toast.LENGTH_LONG).show();
                    callbacks.onLocationVerificationFailed(msg, "LOCATION_ERROR");
                });
    }

    /**
     * Validate GPS accuracy and distance against configured office coordinates.
     *
     * @param location Device location reading
     */
    private void validateLocationReading(@NonNull Location location) {

        // Check GPS accuracy threshold (Must be 50 meters or better)
        if (!location.hasAccuracy() || location.getAccuracy() > MAX_GPS_ACCURACY_METERS) {
            float reportedAccuracy = location.hasAccuracy() ? location.getAccuracy() : -1.0f;
            String msg = "Your GPS accuracy is too low (±" + Math.round(reportedAccuracy) + "m). " +
                    "Accurate location within " + (int) MAX_GPS_ACCURACY_METERS + "m is required. " +
                    "Please check your device location settings or move near a window and try again.";
            Toast.makeText(activity, msg, Toast.LENGTH_LONG).show();
            callbacks.onLocationVerificationFailed(msg, "INACCURATE_GPS");
            return;
        }

        // Configure Office Location using ONLY exact latitude and longitude
        Location officeLocation = new Location("office");
        officeLocation.setLatitude(OFFICE_LATITUDE);
        officeLocation.setLongitude(OFFICE_LONGITUDE);

        // Distance in meters using Android's built-in geodesy calculation (WGS84 ellipsoid)
        float distance = location.distanceTo(officeLocation);

        Log.d(TAG, "Measured distance to office: " + distance + "m (Accuracy: ±" + location.getAccuracy() + "m)");

        // Permitted Geofence Radius check (Inclusive boundary: <= 100 meters)
        if (distance <= OFFICE_RADIUS_METERS) {
            Toast.makeText(
                    activity,
                    "Location verified.",
                    Toast.LENGTH_SHORT
            ).show();
            callbacks.onProceedToCameraCheckIn(location);
        } else {
            String msg = "You are outside the permitted attendance area.";
            Toast.makeText(activity, msg, Toast.LENGTH_LONG).show();
            callbacks.onLocationVerificationFailed(msg, "OUTSIDE_OFFICE_GEOFENCE");
        }
    }

    /**
     * Handle onRequestPermissionsResult from Activity
     *
     * @param requestCode Permission request code
     * @param grantResults Results array
     * @param selectedWorkMode Active work mode
     */
    public void handlePermissionsResult(int requestCode, @NonNull int[] grantResults, String selectedWorkMode) {
        if (requestCode != LOCATION_PERMISSION_REQUEST_CODE) return;

        if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
            Log.d(TAG, "Location permission granted by user. Resuming WFO check-in.");
            checkLocationAndCheckIn(selectedWorkMode);
        } else {
            boolean shouldShowRationale = ActivityCompat.shouldShowRequestPermissionRationale(
                    activity,
                    Manifest.permission.ACCESS_FINE_LOCATION
            );

            if (!shouldShowRationale) {
                // Permanently denied (User checked "Don't ask again")
                promptAppSettings();
            } else {
                String msg = "Location permission was denied. Location verification is required for Work From Office (WFO).";
                Toast.makeText(activity, msg, Toast.LENGTH_LONG).show();
                callbacks.onLocationVerificationFailed(msg, "PERMISSION_DENIED");
            }
        }
    }

    /**
     * Show dialog directing user to App Settings if permission was permanently denied.
     */
    private void promptAppSettings() {
        new AlertDialog.Builder(activity)
                .setTitle("Location Permission Required")
                .setMessage("Work From Office (WFO) attendance requires fine location permission to verify physical presence at the office. Please enable Location permission in App Settings.")
                .setPositiveButton("Open Settings", (dialog, which) -> {
                    Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                    Uri uri = Uri.fromParts("package", activity.getPackageName(), null);
                    intent.setData(uri);
                    activity.startActivity(intent);
                })
                .setNegativeButton("Cancel", (dialog, which) -> {
                    callbacks.onLocationVerificationFailed("Permission permanently denied.", "PERMISSION_PERMANENTLY_DENIED");
                })
                .show();
    }

    /**
     * Show dialog directing user to Device Location Settings if GPS is turned off.
     */
    private void promptEnableGps() {
        new AlertDialog.Builder(activity)
                .setTitle("GPS Disabled")
                .setMessage("Device location services are turned off. Please turn on GPS to mark Work From Office attendance.")
                .setPositiveButton("Turn On GPS", (dialog, which) -> {
                    Intent intent = new Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS);
                    activity.startActivity(intent);
                })
                .setNegativeButton("Cancel", null)
                .show();
    }
}
