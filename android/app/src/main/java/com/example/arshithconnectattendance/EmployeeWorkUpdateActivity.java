
package com.example.arshithconnectattendance;

import android.app.AlertDialog;
import android.graphics.Color;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ImageButton;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import com.google.firebase.Timestamp;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;
import com.google.firebase.firestore.DocumentSnapshot;
import com.google.firebase.firestore.FirebaseFirestore;

import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

public class EmployeeWorkUpdateActivity extends AppCompatActivity {

    private FirebaseAuth auth;
    private FirebaseFirestore db;
    private FirebaseUser currentUser;

    private ImageButton btnBack;

    private LinearLayout[] sections = new LinearLayout[5];
    private TextView[] statusViews = new TextView[5];
    private Button[] sectionButtons = new Button[5];

    private final boolean[] submitted = new boolean[5];
    private final boolean[] saving = new boolean[5];

    private Handler handler;
    private Runnable timeRunnable;

    private static final int SECTION_COUNT = 4;

    private static final int[] START_HOUR = {
            0, 10, 12, 15, 18
    };

    private static final int[] START_MINUTE = {
            0, 30, 30, 30, 0
    };

    private static final int[] END_HOUR = {
            0, 11, 13, 16, 18
    };

    private static final int[] END_MINUTE = {
            0, 0, 0, 0, 30
    };

    private static final String[] TITLES = {
            "",
            "Work Update 01",
            "Work Update 02",
            "Work Update 03",
            "Work Update 04"
    };

    private static final String[] WINDOWS = {
            "",
            "10:30 AM - 11:00 AM",
            "12:30 PM - 1:00 PM",
            "3:30 PM - 4:00 PM",
            "6:00 PM - 6:30 PM"
    };

    private static final String[] SCHEDULES = {
            "",
            "9:30 AM - 11:00 AM",
            "11:15 AM - 1:00 PM",
            "2:00 PM - 4:00 PM",
            "4:15 PM - 6:00 PM"
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        setContentView(R.layout.employee_work_update);

        auth = FirebaseAuth.getInstance();
        db = FirebaseFirestore.getInstance();
        currentUser = auth.getCurrentUser();

        initializeViews();
        setupClickListeners();
        updateSectionStates();
        loadTodaySubmissions();
        startTimeChecker();
    }

    private void initializeViews() {

        btnBack = findViewById(R.id.btnBack);

        sections[1] = findViewById(R.id.section1);
        sections[2] = findViewById(R.id.section2);
        sections[3] = findViewById(R.id.section3);
        sections[4] = findViewById(R.id.section4);

        statusViews[1] = findViewById(R.id.tvSection1Status);
        statusViews[2] = findViewById(R.id.tvSection2Status);
        statusViews[3] = findViewById(R.id.tvSection3Status);
        statusViews[4] = findViewById(R.id.tvSection4Status);

        sectionButtons[1] = findViewById(R.id.btnSection1);
        sectionButtons[2] = findViewById(R.id.btnSection2);
        sectionButtons[3] = findViewById(R.id.btnSection3);
        sectionButtons[4] = findViewById(R.id.btnSection4);
    }

    private void setupClickListeners() {

        btnBack.setOnClickListener(v -> finish());

        for (int i = 1; i <= SECTION_COUNT; i++) {
            final int sectionNumber = i;

            sectionButtons[i].setOnClickListener(
                    v -> handleSectionClick(sectionNumber)
            );
        }
    }

    private void handleSectionClick(int sectionNumber) {

        if (currentUser == null) {
            Toast.makeText(
                    this,
                    "Your login session has expired. Please log in again.",
                    Toast.LENGTH_LONG
            ).show();
            return;
        }

        if (submitted[sectionNumber]) {
            Toast.makeText(
                    this,
                    "Work update has already been submitted today.",
                    Toast.LENGTH_SHORT
            ).show();
            return;
        }

        if (saving[sectionNumber]) {
            Toast.makeText(
                    this,
                    "Your work update is being submitted. Please wait.",
                    Toast.LENGTH_SHORT
            ).show();
            return;
        }

        if (!isSectionOpen(sectionNumber)) {
            Toast.makeText(
                    this,
                    "This section is available only from "
                            + WINDOWS[sectionNumber] + ".",
                    Toast.LENGTH_LONG
            ).show();
            return;
        }

        openWorkUpdateForm(sectionNumber);
    }

    // ------------------------------------------------------------
    // LOAD TODAY'S SUBMISSIONS
    // ------------------------------------------------------------

    private void loadTodaySubmissions() {

        currentUser = auth.getCurrentUser();

        if (currentUser == null) {
            Toast.makeText(
                    this,
                    "Employee login not found. Please log in again.",
                    Toast.LENGTH_LONG
            ).show();
            return;
        }

        String uid = currentUser.getUid();
        String today = getToday();

        for (int i = 1; i <= SECTION_COUNT; i++) {
            checkSubmission(uid, today, i);
        }
    }

    private void checkSubmission(
            String uid,
            String date,
            int sectionNumber
    ) {

        String documentId = date + "_section_" + sectionNumber;

        db.collection("workUpdates")
                .document(uid)
                .collection("dailyUpdates")
                .document(documentId)
                .get()
                .addOnSuccessListener(snapshot -> {

                    if (isFinishing() || isDestroyed()) {
                        return;
                    }

                    submitted[sectionNumber] = snapshot.exists();
                    updateSectionState(sectionNumber);

                })
                .addOnFailureListener(e -> {

                    if (isFinishing() || isDestroyed()) {
                        return;
                    }

                    // Do not assume a missing document when the read fails.
                    // Display the actual Firestore error.
                    Toast.makeText(
                            this,
                            "Could not check Work Update "
                                    + sectionNumber + ": "
                                    + getErrorMessage(e),
                            Toast.LENGTH_LONG
                    ).show();
                });
    }

    // ------------------------------------------------------------
    // TIME CHECKER
    // ------------------------------------------------------------

    private void startTimeChecker() {

        handler = new Handler(Looper.getMainLooper());

        timeRunnable = new Runnable() {
            @Override
            public void run() {

                if (isFinishing() || isDestroyed()) {
                    return;
                }

                updateSectionStates();

                handler.postDelayed(this, 30000);
            }
        };

        handler.post(timeRunnable);
    }

    // ------------------------------------------------------------
    // UPDATE UI
    // ------------------------------------------------------------

    private void updateSectionStates() {

        for (int i = 1; i <= SECTION_COUNT; i++) {
            updateSectionState(i);
        }
    }

    private void updateSectionState(int sectionNumber) {

        Button button = sectionButtons[sectionNumber];
        TextView status = statusViews[sectionNumber];

        if (button == null || status == null) {
            return;
        }

        if (submitted[sectionNumber]) {

            button.setEnabled(false);
            button.setText("ALREADY SUBMITTED");

            status.setText("Work update submitted for today");
            status.setTextColor(Color.rgb(40, 130, 70));

            return;
        }

        if (saving[sectionNumber]) {

            button.setEnabled(false);
            button.setText("SUBMITTING...");

            status.setText("Saving your work update...");
            status.setTextColor(Color.rgb(50, 90, 160));

            return;
        }

        if (isSectionOpen(sectionNumber)) {

            button.setEnabled(true);
            button.setText("SUBMIT WORK UPDATE");

            status.setText(
                    "Update is available now • "
                            + WINDOWS[sectionNumber]
            );

            status.setTextColor(Color.rgb(40, 130, 70));

        } else {

            button.setEnabled(false);
            button.setText("NOT AVAILABLE");

            int currentMinutes = getCurrentMinutes();
            int start = START_HOUR[sectionNumber] * 60
                    + START_MINUTE[sectionNumber];

            if (currentMinutes < start) {
                status.setText(
                        "Available from " + WINDOWS[sectionNumber]
                );
            } else {
                status.setText("Update window closed");
            }

            status.setTextColor(Color.DKGRAY);
        }
    }

    // ------------------------------------------------------------
    // TIME WINDOWS
    // ------------------------------------------------------------

    private boolean isSectionOpen(int sectionNumber) {

        return isTimeBetween(
                START_HOUR[sectionNumber],
                START_MINUTE[sectionNumber],
                END_HOUR[sectionNumber],
                END_MINUTE[sectionNumber]
        );
    }

    private boolean isTimeBetween(
            int startHour,
            int startMinute,
            int endHour,
            int endMinute
    ) {

        int current = getCurrentMinutes();
        int start = startHour * 60 + startMinute;
        int end = endHour * 60 + endMinute;

        return current >= start && current <= end;
    }

    private int getCurrentMinutes() {

        Calendar calendar = Calendar.getInstance();

        return calendar.get(Calendar.HOUR_OF_DAY) * 60
                + calendar.get(Calendar.MINUTE);
    }

    // ------------------------------------------------------------
    // OPEN FORM
    // ------------------------------------------------------------

    private void openWorkUpdateForm(int sectionNumber) {

        showUpdateDialog(
                sectionNumber,
                TITLES[sectionNumber],
                SCHEDULES[sectionNumber],
                WINDOWS[sectionNumber]
        );
    }

    // ------------------------------------------------------------
    // FORM DIALOG
    // ------------------------------------------------------------

    private void showUpdateDialog(
            int sectionNumber,
            String title,
            String schedule,
            String window
    ) {

        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setPadding(30, 10, 30, 0);

        TextView info = new TextView(this);
        info.setText(
                "Work schedule: " + schedule
                        + "\nUpdate window: " + window
        );
        info.setTextSize(14);
        info.setTextColor(Color.DKGRAY);

        layout.addView(info);

        EditText input = new EditText(this);
        input.setHint("Enter your work update");
        input.setGravity(Gravity.TOP | Gravity.START);
        input.setMinLines(6);
        input.setPadding(20, 20, 20, 20);
        input.setInputType(
                android.text.InputType.TYPE_CLASS_TEXT
                        | android.text.InputType.TYPE_TEXT_FLAG_MULTI_LINE
                        | android.text.InputType.TYPE_TEXT_FLAG_CAP_SENTENCES
        );

        layout.addView(
                input,
                new LinearLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        220
                )
        );

        AlertDialog dialog = new AlertDialog.Builder(this)
                .setTitle(title)
                .setView(layout)
                .setNegativeButton("Cancel", null)
                .setPositiveButton("Submit", null)
                .create();

        dialog.setOnShowListener(unused -> {

            Button submitButton = dialog.getButton(
                    AlertDialog.BUTTON_POSITIVE
            );

            submitButton.setOnClickListener(v -> {

                String update = input.getText()
                        .toString()
                        .trim();

                if (update.isEmpty()) {
                    input.setError("Enter your work update");
                    input.requestFocus();
                    return;
                }

                if (currentUser == null) {
                    Toast.makeText(
                            this,
                            "Employee login not found. Please log in again.",
                            Toast.LENGTH_LONG
                    ).show();
                    return;
                }

                if (submitted[sectionNumber]) {
                    Toast.makeText(
                            this,
                            "This work update has already been submitted today.",
                            Toast.LENGTH_LONG
                    ).show();
                    dialog.dismiss();
                    return;
                }

                if (!isSectionOpen(sectionNumber)) {
                    Toast.makeText(
                            this,
                            "Update window has closed.",
                            Toast.LENGTH_LONG
                    ).show();

                    dialog.dismiss();
                    updateSectionState(sectionNumber);
                    return;
                }

                // Prevent repeated taps while Firestore is saving.
                saving[sectionNumber] = true;
                submitButton.setEnabled(false);
                submitButton.setText("Submitting...");
                updateSectionState(sectionNumber);

                saveWorkUpdate(
                        sectionNumber,
                        update,
                        dialog,
                        submitButton
                );
            });
        });

        dialog.show();
    }

    // ------------------------------------------------------------
    // SAVE WORK UPDATE TO FIRESTORE
    // ------------------------------------------------------------

    private void saveWorkUpdate(
            int sectionNumber,
            String update,
            AlertDialog dialog,
            Button submitButton
    ) {

        currentUser = auth.getCurrentUser();

        if (currentUser == null) {
            saving[sectionNumber] = false;
            updateSectionState(sectionNumber);

            Toast.makeText(
                    this,
                    "Employee login not found. Please log in again.",
                    Toast.LENGTH_LONG
            ).show();
            return;
        }

        String uid = currentUser.getUid();
        String today = getToday();
        String documentId = today + "_section_" + sectionNumber;

        db.collection("workUpdates")
                .document(uid)
                .collection("dailyUpdates")
                .document(documentId)
                .get()
                .addOnSuccessListener(existing -> {

                    if (isFinishing() || isDestroyed()) {
                        saving[sectionNumber] = false;
                        return;
                    }

                    if (existing.exists()) {

                        saving[sectionNumber] = false;
                        submitted[sectionNumber] = true;

                        dialog.dismiss();
                        updateSectionState(sectionNumber);

                        Toast.makeText(
                                this,
                                "This work update has already been submitted today.",
                                Toast.LENGTH_LONG
                        ).show();

                        return;
                    }

                    // Check the time again after the database read.
                    if (!isSectionOpen(sectionNumber)) {

                        saving[sectionNumber] = false;

                        if (dialog.isShowing()) {
                            dialog.dismiss();
                        }

                        updateSectionState(sectionNumber);

                        Toast.makeText(
                                this,
                                "Update window has closed. Please try during the next available window.",
                                Toast.LENGTH_LONG
                        ).show();

                        return;
                    }

                    Map<String, Object> data = new HashMap<>();

                    data.put("employeeId", uid);
                    data.put("employeeEmail", currentUser.getEmail());
                    data.put("date", today);
                    data.put("section", sectionNumber);
                    data.put("update", update);
                    data.put("submittedAt", Timestamp.now());

                    data.put(
                            "submittedTime",
                            new SimpleDateFormat(
                                    "hh:mm a",
                                    Locale.getDefault()
                            ).format(Calendar.getInstance().getTime())
                    );

                    db.collection("workUpdates")
                            .document(uid)
                            .collection("dailyUpdates")
                            .document(documentId)
                            .set(data)
                            .addOnSuccessListener(unused -> {

                                if (isFinishing() || isDestroyed()) {
                                    saving[sectionNumber] = false;
                                    return;
                                }

                                saving[sectionNumber] = false;
                                submitted[sectionNumber] = true;

                                if (dialog.isShowing()) {
                                    dialog.dismiss();
                                }

                                updateSectionState(sectionNumber);

                                Toast.makeText(
                                        this,
                                        "Work update submitted successfully.",
                                        Toast.LENGTH_LONG
                                ).show();
                            })
                            .addOnFailureListener(e -> {

                                saving[sectionNumber] = false;

                                if (isFinishing() || isDestroyed()) {
                                    return;
                                }

                                submitButton.setEnabled(true);
                                submitButton.setText("Submit");

                                updateSectionState(sectionNumber);

                                Toast.makeText(
                                        this,
                                        "Failed to submit work update: "
                                                + getErrorMessage(e),
                                        Toast.LENGTH_LONG
                                ).show();
                            });
                })
                .addOnFailureListener(e -> {

                    saving[sectionNumber] = false;

                    if (isFinishing() || isDestroyed()) {
                        return;
                    }

                    submitButton.setEnabled(true);
                    submitButton.setText("Submit");

                    updateSectionState(sectionNumber);

                    Toast.makeText(
                            this,
                            "Could not verify the existing submission: "
                                    + getErrorMessage(e),
                            Toast.LENGTH_LONG
                    ).show();
                });
    }

    // ------------------------------------------------------------
    // HELPER METHODS
    // ------------------------------------------------------------

    private String getToday() {

        return new SimpleDateFormat(
                "yyyy-MM-dd",
                Locale.getDefault()
        ).format(Calendar.getInstance().getTime());
    }

    private String getErrorMessage(Exception e) {

        if (e == null || e.getMessage() == null) {
            return "Unknown error. Check your internet connection and Firebase configuration.";
        }

        return e.getMessage();
    }

    @Override
    protected void onResume() {
        super.onResume();

        currentUser = auth.getCurrentUser();

        updateSectionStates();
        loadTodaySubmissions();
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();

        if (handler != null && timeRunnable != null) {
            handler.removeCallbacks(timeRunnable);
        }
    }
}
