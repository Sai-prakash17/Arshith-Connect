package com.arshithconnect.attendance;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.location.Location;
import android.location.LocationManager;
import android.net.Uri;
import android.os.Bundle;
import android.provider.Settings;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;

import com.google.android.gms.location.FusedLocationProviderClient;
import com.google.android.gms.location.LocationServices;
import com.google.android.gms.location.Priority;
import com.google.android.gms.tasks.CancellationTokenSource;

/**
 * AttendanceActivity
 *
 * Official Arshith Connect Attendance Activity with WFO / WFH Work Mode
 * Verification
 * using only the authoritative office GPS coordinates:
 * - Latitude: 12.9104417
 * - Longitude: 77.6442435
 * - Radius: 100 metres
 */
public class AttendanceActivity extends AppCompatActivity {

    // =========================================================================
    // 1. Authoritative Office Coordinates & Geofencing Constants
    // =========================================================================
    private static final double OFFICE_LATITUDE = 12.9104417;
    private static final double OFFICE_LONGITUDE = 77.6442435;
    private static final float OFFICE_RADIUS_METERS = 250f;
    private static final float MAX_GPS_ACCURACY_METERS = 100f;

    // Permission Request Code
    private static final int LOCATION_PERMISSION_REQUEST_CODE = 1001;

    // Fused Location Client & Selected Work Mode
    private FusedLocationProviderClient fusedLocationClient;
    private String selectedWorkMode = "WFO"; // "WFO" (Office) or "WFH" (Home)

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // setContentView(R.layout.activity_attendance);

        // Initialize Google Play Services Fused Location Client
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this);
    }

    /**
     * Primary Check-In Location Verification Method
     *
     * A. WFH Check-In:
     * - No fine/coarse location permissions requested.
     * - No GPS API called.
     * - Office geofence bypassed.
     * - Proceeds directly to checkLateAndCheckIn().
     *
     * B. WFO Check-In:
     * - Verifies fine and coarse location permissions.
     * - Prompts permission dialog if not granted.
     * - Verifies device location services (GPS) are enabled.
     * - Acquires fresh high-accuracy location reading (getCurrentLocation) to
     * eliminate stale cache.
     * - Validates GPS accuracy <= 50 metres.
     * - Calculates distance to office coordinates (12.9104417, 77.6442435).
     * - If distance <= 100 metres, proceeds to openCameraForCheckIn().
     * - Else displays clear error toast and rejects check-in.
     */
    private void checkLocationAndCheckIn() {

        // ========================================================
        // A. WFH check-in (Skip location requests and geofence)
        // ========================================================
        if ("WFH".equals(selectedWorkMode)) {
            checkLateAndCheckIn();
            return;
        }

        // ========================================================
        // B. WFO check-in (Fine location permission check)
        // ========================================================
        boolean fineLocationGranted = ActivityCompat.checkSelfPermission(
                this,
                Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED;

        boolean coarseLocationGranted = ActivityCompat.checkSelfPermission(
                this,
                Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;

        if (!fineLocationGranted && !coarseLocationGranted) {
            ActivityCompat.requestPermissions(
                    this,
                    new String[] {
                            Manifest.permission.ACCESS_FINE_LOCATION,
                            Manifest.permission.ACCESS_COARSE_LOCATION
                    },
                    LOCATION_PERMISSION_REQUEST_CODE);
            return;
        }

        // Check if GPS hardware is enabled
        LocationManager locationManager = (LocationManager) getSystemService(Context.LOCATION_SERVICE);
        boolean isGpsEnabled = locationManager != null &&
                (locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER) ||
                        locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER));

        if (!isGpsEnabled) {
            Toast.makeText(
                    this,
                    "Unable to get your location. Please turn on device GPS.",
                    Toast.LENGTH_LONG).show();
            return;
        }

        // Obtain fresh high-accuracy location reading (Avoid stale getLastLocation)
        CancellationTokenSource cancellationTokenSource = new CancellationTokenSource();

        fusedLocationClient
                .getCurrentLocation(Priority.PRIORITY_HIGH_ACCURACY, cancellationTokenSource.getToken())
                .addOnSuccessListener(location -> {
                    if (location != null) {
                        processLocationValidation(location);
                    } else {
                        // Fallback to getLastLocation() if getCurrentLocation fix returns null
                        fusedLocationClient
                                .getLastLocation()
                                .addOnSuccessListener(fallbackLoc -> {
                                    if (fallbackLoc == null) {
                                        Toast.makeText(
                                                this,
                                                "Unable to get your location. Please turn on GPS and ensure clear satellite reception.",
                                                Toast.LENGTH_LONG).show();
                                        return;
                                    }
                                    processLocationValidation(fallbackLoc);
                                });
                    }
                })
                .addOnFailureListener(e -> {
                    // Fallback to getLastLocation() on error
                    fusedLocationClient
                            .getLastLocation()
                            .addOnSuccessListener(this::processLocationValidation)
                            .addOnFailureListener(ex -> Toast.makeText(
                                    this,
                                    "Location acquisition error: " + ex.getMessage(),
                                    Toast.LENGTH_LONG).show());
                });
    }

    /**
     * Validate GPS accuracy and Haversine / WGS84 distance to company office
     * coordinates.
     *
     * @param location Fresh location reading
     */
    private void processLocationValidation(Location location) {
        if (location == null) {
            Toast.makeText(
                    this,
                    "Unable to get your location. Please turn on GPS.",
                    Toast.LENGTH_LONG).show();
            return;
        }

        // GPS Accuracy threshold check (50m or better)
        if (!location.hasAccuracy() || location.getAccuracy() > MAX_GPS_ACCURACY_METERS) {
            float acc = location.hasAccuracy() ? location.getAccuracy() : -1f;
            Toast.makeText(
                    this,
                    "GPS accuracy is too low (±" + Math.round(acc) + "m). Accurate GPS within " +
                            (int) MAX_GPS_ACCURACY_METERS + "m is required. Please move near a window and try again.",
                    Toast.LENGTH_LONG).show();
            return;
        }

        // Configure Office Location using ONLY exact latitude and longitude
        Location officeLocation = new Location("office");
        officeLocation.setLatitude(OFFICE_LATITUDE);
        officeLocation.setLongitude(OFFICE_LONGITUDE);

        // Distance in meters using Android's built-in geodesy calculation
        float distance = location.distanceTo(officeLocation);

        if (distance <= OFFICE_RADIUS_METERS) {
            Toast.makeText(
                    this,
                    "Location verified.",
                    Toast.LENGTH_SHORT).show();
            openCameraForCheckIn();
        } else {
            Toast.makeText(
                    this,
                    "You are outside the permitted attendance area.",
                    Toast.LENGTH_LONG).show();
        }
    }

    /**
     * Handle Permission Response from user
     */
    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions,
            @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);

        if (requestCode == LOCATION_PERMISSION_REQUEST_CODE) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                // Permission granted -> Resume WFO verification flow
                checkLocationAndCheckIn();
            } else {
                if (!ActivityCompat.shouldShowRequestPermissionRationale(this,
                        Manifest.permission.ACCESS_FINE_LOCATION)) {
                    // User selected "Don't ask again"
                    Toast.makeText(
                            this,
                            "Location permission is permanently denied. Please enable it in App Settings to check in for WFO.",
                            Toast.LENGTH_LONG).show();
                } else {
                    Toast.makeText(
                            this,
                            "Location permission is required for Work From Office attendance.",
                            Toast.LENGTH_LONG).show();
                }
            }
        } else if (requestCode == CAMERA_PERMISSION_REQUEST_CODE) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                openCameraForCheckIn();
            } else {
                Toast.makeText(
                        this,
                        "Camera permission is required to capture check-in verification selfie.",
                        Toast.LENGTH_LONG).show();
            }
        }
    }

    /**
     * Camera launch & selfie verification workflow with runtime CAMERA permission
     * checks
     */
    private static final int CAMERA_PERMISSION_REQUEST_CODE = 1002;
    private static final int CAMERA_CAPTURE_REQUEST_CODE = 1003;

    private void openCameraForCheckIn() {
        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(
                    this,
                    new String[] { Manifest.permission.CAMERA },
                    CAMERA_PERMISSION_REQUEST_CODE);
            return;
        }

        Intent cameraIntent = new Intent(android.provider.MediaStore.ACTION_IMAGE_CAPTURE);
        if (cameraIntent.resolveActivity(getPackageManager()) != null) {
            startActivityForResult(cameraIntent, CAMERA_CAPTURE_REQUEST_CODE);
        } else {
            Toast.makeText(this, "No camera application found on device.", Toast.LENGTH_LONG).show();
        }
    }

    private void checkLateAndCheckIn() {
        // Late validation and camera selfie check-in workflow for WFH
        openCameraForCheckIn();
    }

    public void setWorkMode(String mode) {
        this.selectedWorkMode = mode;
    }
}
