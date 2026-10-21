package com.example.arshithconnectattendance;

import android.app.DatePickerDialog;
import android.app.TimePickerDialog;
import android.graphics.Color;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.Spinner;
import android.widget.TextView;
import android.widget.Toast;

import androidx.activity.ComponentActivity;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;
import com.google.firebase.firestore.DocumentReference;
import com.google.firebase.firestore.DocumentSnapshot;
import com.google.firebase.firestore.FirebaseFirestore;
import com.google.firebase.firestore.Query;

import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

public class LeaveManagementActivity extends ComponentActivity {

    private FirebaseAuth firebaseAuth;
    private FirebaseFirestore firestore;

    private Spinner spinnerLeaveType;
    private Spinner spinnerLeaveDuration;

    private Button btnStartTime;
    private Button btnEndTime;

    private String startTime = "";
    private String endTime = "";

    private Button btnFromDate;
    private Button btnToDate;
    private Button btnSubmitLeave;
    private Button btnShowApplyLeave;

    private EditText etLeaveReason;

    private LinearLayout requestsContainer;
    private LinearLayout applyLeaveForm;

    private TextView tvNoRequests;
    private TextView btnBack;
    private TextView btnFormBack;

    // Screen containers from XML
    private ScrollView mainScrollView;
    private ScrollView applyLeaveScrollView;

    private String fromDate = "";
    private String toDate = "";


    @Override
    protected void onCreate(Bundle savedInstanceState) {

        super.onCreate(savedInstanceState);

        setContentView(R.layout.leave_management);


        // =====================================================
        // FIREBASE
        // =====================================================

        firebaseAuth = FirebaseAuth.getInstance();

        firestore = FirebaseFirestore.getInstance();


        // =====================================================
        // FIND VIEWS
        // =====================================================

        mainScrollView =
                findViewById(R.id.mainScrollView);

        applyLeaveScrollView =
                findViewById(R.id.applyLeaveScrollView);

        btnShowApplyLeave =
                findViewById(R.id.btnShowApplyLeave);

        btnFormBack =
                findViewById(R.id.btnFormBack);

        spinnerLeaveType =
                findViewById(R.id.spinnerLeaveType);

        spinnerLeaveDuration =
                findViewById(R.id.spinnerLeaveDuration);

        btnStartTime = findViewById(R.id.btnStartTime);
        btnEndTime = findViewById(R.id.btnEndTime);

        btnFromDate =
                findViewById(R.id.btnFromDate);

        btnToDate =
                findViewById(R.id.btnToDate);

        btnSubmitLeave =
                findViewById(R.id.btnSubmitLeave);

        etLeaveReason =
                findViewById(R.id.etLeaveReason);

        requestsContainer =
                findViewById(R.id.requestsContainer);

        tvNoRequests =
                findViewById(R.id.tvNoRequests);

        btnBack =
                findViewById(R.id.btnBack);

        applyLeaveForm =
                findViewById(R.id.applyLeaveForm);


        // =====================================================
        // INITIAL SCREEN
        // =====================================================

        mainScrollView.setVisibility(View.VISIBLE);

        applyLeaveScrollView.setVisibility(View.GONE);


        // =====================================================
        // APPLY FOR LEAVE
        // =====================================================

        btnShowApplyLeave.setOnClickListener(v -> {

            // Hide the entire requests screen
            mainScrollView.setVisibility(View.GONE);

            // Show only the application form screen
            applyLeaveScrollView.setVisibility(View.VISIBLE);

        });


        // =====================================================
        // BACK TO LEAVE REQUESTS
        // =====================================================

        btnFormBack.setOnClickListener(v -> {

            applyLeaveScrollView.setVisibility(View.GONE);

            mainScrollView.setVisibility(View.VISIBLE);

        });


        // =====================================================
        // BACK TO PREVIOUS APP SCREEN
        // =====================================================

        btnBack.setOnClickListener(v -> finish());


        // =====================================================
        // LEAVE TYPES
        // =====================================================

        String[] leaveTypes = {
                "Casual Leave",
                "Sick Leave",
                "Earned Leave",
                "Emergency Leave",
                "Other"
        };


        ArrayAdapter<String> adapter =
                new ArrayAdapter<>(
                        this,
                        android.R.layout.simple_spinner_item,
                        leaveTypes
                );


        adapter.setDropDownViewResource(
                android.R.layout.simple_spinner_dropdown_item
        );


        spinnerLeaveType.setAdapter(adapter);

        // =====================================================
        // LEAVE DURATION: FULL DAY OR HOURLY
        // =====================================================

        String[] durationOptions = {"Full-Day Leave", "Hourly Leave"};
        ArrayAdapter<String> durationAdapter = new ArrayAdapter<>(
                this,
                android.R.layout.simple_spinner_item,
                durationOptions
        );
        durationAdapter.setDropDownViewResource(
                android.R.layout.simple_spinner_dropdown_item
        );
        spinnerLeaveDuration.setAdapter(durationAdapter);

        spinnerLeaveDuration.setOnItemSelectedListener(
                new android.widget.AdapterView.OnItemSelectedListener() {
                    @Override
                    public void onItemSelected(
                            android.widget.AdapterView<?> parent,
                            View view,
                            int position,
                            long id
                    ) {
                        boolean hourly = position == 1;
                        btnToDate.setVisibility(hourly ? View.GONE : View.VISIBLE);
                        findViewById(R.id.labelToDate).setVisibility(
                                hourly ? View.GONE : View.VISIBLE
                        );
                        btnStartTime.setVisibility(hourly ? View.VISIBLE : View.GONE);
                        btnEndTime.setVisibility(hourly ? View.VISIBLE : View.GONE);
                        findViewById(R.id.labelStartTime).setVisibility(
                                hourly ? View.VISIBLE : View.GONE
                        );
                        findViewById(R.id.labelEndTime).setVisibility(
                                hourly ? View.VISIBLE : View.GONE
                        );

                        if (hourly) {
                            btnFromDate.setText("SELECT LEAVE DATE");
                        } else {
                            btnFromDate.setText(fromDate.isEmpty()
                                    ? "SELECT START DATE" : fromDate);
                            btnToDate.setText(toDate.isEmpty()
                                    ? "SELECT END DATE" : toDate);
                        }
                    }

                    @Override
                    public void onNothingSelected(android.widget.AdapterView<?> parent) {
                    }
                }
        );

        btnStartTime.setOnClickListener(v -> openTimePicker(true));
        btnEndTime.setOnClickListener(v -> openTimePicker(false));


        // =====================================================
        // FROM DATE
        // =====================================================

        btnFromDate.setOnClickListener(v -> {
            if (isHourlyLeave()) {
                openHourlyDatePicker();
            } else {
                openDatePicker(true);
            }
        });


        // =====================================================
        // TO DATE
        // =====================================================

        btnToDate.setOnClickListener(v ->
                openDatePicker(false)
        );


        // =====================================================
        // SUBMIT LEAVE
        // =====================================================

        btnSubmitLeave.setOnClickListener(v ->
                submitLeaveRequest()
        );


        // =====================================================
        // LOAD LEAVE REQUESTS
        // =====================================================

        loadLeaveRequests();
    }


    private boolean isHourlyLeave() {
        return spinnerLeaveDuration != null
                && spinnerLeaveDuration.getSelectedItemPosition() == 1;
    }

    private void openHourlyDatePicker() {
        openDatePicker(true);
        // In hourly mode the selected date is used as both the start and end date.
        // The date-picker callback below synchronizes toDate when hourly mode is selected.
    }

    private void openTimePicker(boolean selectingStart) {
        Calendar calendar = Calendar.getInstance();
        String existing = selectingStart ? startTime : endTime;
        if (!existing.isEmpty()) {
            try {
                String[] parts = existing.split(":");
                calendar.set(Calendar.HOUR_OF_DAY, Integer.parseInt(parts[0]));
                calendar.set(Calendar.MINUTE, Integer.parseInt(parts[1]));
            } catch (Exception ignored) {
            }
        }

        new TimePickerDialog(
                this,
                (view, hourOfDay, minute) -> {
                    String selected = String.format(
                            Locale.getDefault(), "%02d:%02d", hourOfDay, minute
                    );
                    if (selectingStart) {
                        startTime = selected;
                        btnStartTime.setText("START TIME: " + selected);
                    } else {
                        endTime = selected;
                        btnEndTime.setText("END TIME: " + selected);
                    }
                },
                calendar.get(Calendar.HOUR_OF_DAY),
                calendar.get(Calendar.MINUTE),
                true
        ).show();
    }

    // ============================================================
    // DATE PICKER
    // ============================================================

    private void openDatePicker(boolean selectingFromDate) {

        Calendar calendar = Calendar.getInstance();


        // If a date was already selected, use it in the picker.
        String existingDate =
                selectingFromDate ? fromDate : toDate;

        if (!existingDate.isEmpty()) {

            try {

                SimpleDateFormat format =
                        new SimpleDateFormat(
                                "yyyy-MM-dd",
                                Locale.getDefault()
                        );

                Date date = format.parse(existingDate);

                if (date != null) {
                    calendar.setTime(date);
                }

            } catch (Exception ignored) {
                // Use today's date if parsing fails.
            }
        }


        DatePickerDialog dialog =
                new DatePickerDialog(

                        this,

                        (view, year, month, dayOfMonth) -> {

                            String selectedDate =
                                    String.format(
                                            Locale.getDefault(),
                                            "%04d-%02d-%02d",
                                            year,
                                            month + 1,
                                            dayOfMonth
                                    );


                            if (selectingFromDate) {

                                fromDate = selectedDate;

                                btnFromDate.setText(
                                        isHourlyLeave() ? "LEAVE DATE: " + selectedDate : selectedDate
                                );

                                if (isHourlyLeave()) {
                                    toDate = selectedDate;
                                }

                            } else {

                                toDate = selectedDate;

                                btnToDate.setText(selectedDate);
                            }

                        },

                        calendar.get(Calendar.YEAR),

                        calendar.get(Calendar.MONTH),

                        calendar.get(Calendar.DAY_OF_MONTH)
                );


        dialog.show();
    }


    // ============================================================
    // SUBMIT LEAVE
    // ============================================================

    private void submitLeaveRequest() {

        FirebaseUser user =
                firebaseAuth.getCurrentUser();


        if (user == null) {

            Toast.makeText(
                    this,
                    "Please login again",
                    Toast.LENGTH_SHORT
            ).show();

            return;
        }


        // ========================================================
        // VALIDATE DATES / HOURS
        // ========================================================

        boolean hourlyLeave = isHourlyLeave();

        if (fromDate.isEmpty()) {
            Toast.makeText(this,
                    hourlyLeave ? "Please select the leave date" : "Please select the start date",
                    Toast.LENGTH_SHORT).show();
            return;
        }

        if (hourlyLeave) {
            toDate = fromDate;

            if (startTime.isEmpty() || endTime.isEmpty()) {
                Toast.makeText(this, "Please select start and end times", Toast.LENGTH_SHORT).show();
                return;
            }

            int startMinutes = timeToMinutes(startTime);
            int endMinutes = timeToMinutes(endTime);

            if (endMinutes <= startMinutes) {
                Toast.makeText(this, "End time must be after start time", Toast.LENGTH_SHORT).show();
                return;
            }
        } else {
            if (toDate.isEmpty()) {
                Toast.makeText(this, "Please select the end date", Toast.LENGTH_SHORT).show();
                return;
            }

            if (toDate.compareTo(fromDate) < 0) {
                Toast.makeText(this, "End date cannot be before start date", Toast.LENGTH_SHORT).show();
                return;
            }
        }


        // ========================================================
        // VALIDATE REASON
        // ========================================================

        String reason =
                etLeaveReason.getText().toString().trim();


        if (reason.isEmpty()) {

            etLeaveReason.setError(
                    "Please enter the reason"
            );

            etLeaveReason.requestFocus();

            return;
        }


        // ========================================================
        // GET USER DATA
        // ========================================================

        String uid = user.getUid();

        String email = user.getEmail();

        String leaveType =
                spinnerLeaveType.getSelectedItem().toString();


        // ========================================================
        // CREATE REQUEST
        // ========================================================

        Map<String, Object> leaveData =
                new HashMap<>();


        leaveData.put("employeeId", uid);

        leaveData.put("email", email);

        leaveData.put("leaveType", leaveType);

        leaveData.put("fromDate", fromDate);

        leaveData.put("toDate", toDate);
        leaveData.put("durationType", hourlyLeave ? "Hourly" : "Full-Day");
        if (hourlyLeave) {
            leaveData.put("startTime", startTime);
            leaveData.put("endTime", endTime);
            leaveData.put("hours", (timeToMinutes(endTime) - timeToMinutes(startTime)) / 60.0);
        }

        leaveData.put("reason", reason);

        leaveData.put("status", "Pending");

        leaveData.put("appliedAt", new Date());


        // ========================================================
        // SAVE TO FIRESTORE
        // ========================================================

        btnSubmitLeave.setEnabled(false);


        DocumentReference newRequest =
                firestore
                        .collection("leaves")
                        .document(uid)
                        .collection("requests")
                        .document();


        newRequest
                .set(leaveData)

                .addOnSuccessListener(aVoid -> {

                    Toast.makeText(
                            LeaveManagementActivity.this,
                            "Leave request submitted",
                            Toast.LENGTH_SHORT
                    ).show();


                    // Clear the form

                    fromDate = "";

                    toDate = "";
                    startTime = "";
                    endTime = "";

                    btnStartTime.setText("SELECT START TIME");
                    btnEndTime.setText("SELECT END TIME");
                    spinnerLeaveDuration.setSelection(0);

                    btnFromDate.setText(
                            "SELECT START DATE"
                    );

                    btnToDate.setText(
                            "SELECT END DATE"
                    );

                    etLeaveReason.setText("");

                    spinnerLeaveType.setSelection(0);

                    btnSubmitLeave.setEnabled(true);


                    // =============================================
                    // RETURN TO REQUESTS SCREEN
                    // =============================================

                    applyLeaveScrollView.setVisibility(View.GONE);

                    mainScrollView.setVisibility(View.VISIBLE);


                    // Refresh requests from Firebase

                    loadLeaveRequests();

                })

                .addOnFailureListener(e -> {

                    btnSubmitLeave.setEnabled(true);


                    Toast.makeText(
                            LeaveManagementActivity.this,
                            "Failed to submit leave: "
                                    + e.getMessage(),
                            Toast.LENGTH_LONG
                    ).show();

                    // Keep the form visible so the user can retry.
                });
    }


    private int timeToMinutes(String time) {
        String[] parts = time.split(":");
        return Integer.parseInt(parts[0]) * 60 + Integer.parseInt(parts[1]);
    }

    // ============================================================
    // LOAD MY LEAVE REQUESTS
    // ============================================================

    private void loadLeaveRequests() {

        FirebaseUser user =
                firebaseAuth.getCurrentUser();


        if (user == null) {
            return;
        }


        String uid = user.getUid();


        firestore
                .collection("leaves")
                .document(uid)
                .collection("requests")
                .orderBy(
                        "appliedAt",
                        Query.Direction.DESCENDING
                )
                .get()

                .addOnSuccessListener(querySnapshot -> {

                    requestsContainer.removeAllViews();


                    int activeRequests = 0;


                    for (DocumentSnapshot document :
                            querySnapshot.getDocuments()) {

                        String endDate =
                                document.getString("toDate");


                        // Hide leave after its end date has passed.

                        if (isLeaveExpired(endDate)) {
                            continue;
                        }


                        activeRequests++;

                        addRequestCard(document);
                    }


                    // SHOW OR HIDE NO REQUESTS MESSAGE

                    if (activeRequests == 0) {

                        tvNoRequests.setVisibility(
                                View.VISIBLE
                        );

                        tvNoRequests.setText(
                                "No active leave requests"
                        );

                    } else {

                        tvNoRequests.setVisibility(
                                View.GONE
                        );
                    }

                })

                .addOnFailureListener(e -> {

                    Toast.makeText(
                            LeaveManagementActivity.this,
                            "Could not load leave requests: "
                                    + e.getMessage(),
                            Toast.LENGTH_LONG
                    ).show();
                });
    }


    // ============================================================
    // CHECK WHETHER LEAVE END DATE HAS PASSED
    // ============================================================

    private boolean isLeaveExpired(String endDate) {

        if (endDate == null || endDate.trim().isEmpty()) {
            return false;
        }


        try {

            SimpleDateFormat dateFormat =
                    new SimpleDateFormat(
                            "yyyy-MM-dd",
                            Locale.getDefault()
                    );


            dateFormat.setLenient(false);


            Date leaveEndDate =
                    dateFormat.parse(endDate);


            Date today =
                    dateFormat.parse(
                            dateFormat.format(new Date())
                    );


            if (leaveEndDate == null || today == null) {
                return false;
            }


            // Leave ending today remains visible.

            return leaveEndDate.before(today);

        } catch (Exception e) {

            // Keep invalid dates visible rather than hiding them.

            return false;
        }
    }


    // ============================================================
    // ADD REQUEST CARD
    // ============================================================

    private void addRequestCard(DocumentSnapshot document) {

        String leaveType =
                document.getString("leaveType");

        String startDate =
                document.getString("fromDate");

        String endDate =
                document.getString("toDate");
        String durationType = document.getString("durationType");
        String savedStartTime = document.getString("startTime");
        String savedEndTime = document.getString("endTime");

        String reason =
                document.getString("reason");

        String status =
                document.getString("status");


        if (leaveType == null) {
            leaveType = "Leave";
        }

        if (startDate == null) {
            startDate = "-";
        }

        if (endDate == null) {
            endDate = "-";
        }

        if (reason == null) {
            reason = "-";
        }

        if (status == null) {
            status = "Pending";
        }


        // ========================================================
        // CARD
        // ========================================================

        LinearLayout card =
                new LinearLayout(this);


        card.setOrientation(
                LinearLayout.VERTICAL
        );


        card.setPadding(18, 18, 18, 18);

        card.setBackgroundColor(Color.WHITE);


        LinearLayout.LayoutParams cardParams =
                new LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.MATCH_PARENT,
                        LinearLayout.LayoutParams.WRAP_CONTENT
                );


        cardParams.setMargins(0, 0, 0, 12);

        card.setLayoutParams(cardParams);


        // ========================================================
        // TOP ROW
        // ========================================================

        LinearLayout topRow =
                new LinearLayout(this);


        topRow.setOrientation(
                LinearLayout.HORIZONTAL
        );

        topRow.setGravity(
                Gravity.CENTER_VERTICAL
        );


        TextView typeText =
                new TextView(this);


        typeText.setText(leaveType);

        typeText.setTextColor(
                Color.rgb(36, 30, 49)
        );

        typeText.setTextSize(16);

        typeText.setTypeface(
                null,
                android.graphics.Typeface.BOLD
        );


        LinearLayout.LayoutParams typeParams =
                new LinearLayout.LayoutParams(
                        0,
                        LinearLayout.LayoutParams.WRAP_CONTENT,
                        1
                );


        typeText.setLayoutParams(typeParams);


        TextView statusText =
                new TextView(this);


        statusText.setText(status);

        statusText.setTextSize(12);

        statusText.setTypeface(
                null,
                android.graphics.Typeface.BOLD
        );

        statusText.setPadding(12, 7, 12, 7);


        if (status.equalsIgnoreCase("Approved")) {

            statusText.setTextColor(
                    Color.rgb(30, 130, 75)
            );

        } else if (status.equalsIgnoreCase("Rejected")) {

            statusText.setTextColor(
                    Color.rgb(190, 50, 50)
            );

        } else {

            statusText.setTextColor(
                    Color.rgb(200, 125, 35)
            );
        }


        topRow.addView(typeText);

        topRow.addView(statusText);

        card.addView(topRow);


        // ========================================================
        // DATES
        // ========================================================

        TextView datesText =
                new TextView(this);


        if ("Hourly".equalsIgnoreCase(durationType)) {
            datesText.setText(startDate + "  •  "
                    + (savedStartTime == null ? "" : savedStartTime)
                    + " – "
                    + (savedEndTime == null ? "" : savedEndTime)
                    + " (" + document.get("hours") + " hours)");
        } else {
            datesText.setText(startDate + "  →  " + endDate);
        }

        datesText.setTextColor(
                Color.rgb(118, 109, 130)
        );

        datesText.setTextSize(13);


        LinearLayout.LayoutParams dateParams =
                new LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.WRAP_CONTENT,
                        LinearLayout.LayoutParams.WRAP_CONTENT
                );


        dateParams.setMargins(0, 10, 0, 0);

        datesText.setLayoutParams(dateParams);

        card.addView(datesText);


        // ========================================================
        // REASON
        // ========================================================

        TextView reasonText =
                new TextView(this);


        reasonText.setText("Reason: " + reason);

        reasonText.setTextColor(
                Color.rgb(80, 72, 90)
        );

        reasonText.setTextSize(13);


        LinearLayout.LayoutParams reasonParams =
                new LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.MATCH_PARENT,
                        LinearLayout.LayoutParams.WRAP_CONTENT
                );


        reasonParams.setMargins(0, 7, 0, 0);

        reasonText.setLayoutParams(reasonParams);

        card.addView(reasonText);


        requestsContainer.addView(card);
    }
}
