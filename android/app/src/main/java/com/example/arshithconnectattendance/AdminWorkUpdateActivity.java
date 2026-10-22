
package com.example.arshithconnectattendance;

import android.app.AlertDialog;
import android.os.Bundle;
import android.graphics.Typeface;
import android.view.View;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import androidx.activity.ComponentActivity;

import com.google.firebase.Timestamp;
import com.google.firebase.firestore.DocumentSnapshot;
import com.google.firebase.firestore.FirebaseFirestore;
import com.google.firebase.firestore.WriteBatch;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Locale;

public class AdminWorkUpdateActivity extends ComponentActivity {

    private FirebaseFirestore firestore;

    private Button btnBack;
    private Button btnDeleteAll;
    private LinearLayout updatesContainer;
    private TextView tvNoUpdates;

    private boolean isDeletingAll = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        setContentView(R.layout.activity_admin_work_updates);

        firestore = FirebaseFirestore.getInstance();

        btnBack = findViewById(R.id.btnBack);
        updatesContainer = findViewById(R.id.updatesContainer);
        tvNoUpdates = findViewById(R.id.tvNoUpdates);

        btnBack.setOnClickListener(v -> finish());

        loadWorkUpdates();
    }

    // =========================================================
    // LOAD WORK UPDATES
    // =========================================================

    private void loadWorkUpdates() {

        updatesContainer.removeAllViews();

        showDeleteAllButton();

        tvNoUpdates.setVisibility(View.VISIBLE);
        tvNoUpdates.setText("Loading work updates...");

        firestore.collectionGroup("dailyUpdates")
                .get()
                .addOnSuccessListener(querySnapshot -> {

                    updatesContainer.removeAllViews();
                    showDeleteAllButton();

                    if (querySnapshot.isEmpty()) {
                        tvNoUpdates.setVisibility(View.VISIBLE);
                        tvNoUpdates.setText("No work updates submitted yet.");
                        return;
                    }

                    tvNoUpdates.setVisibility(View.GONE);

                    List<DocumentSnapshot> documents =
                            new ArrayList<>(querySnapshot.getDocuments());

                    // Sort locally: newest updates first.
                    documents.sort((a, b) -> {

                        Object timeA = a.get("submittedAt");
                        Object timeB = b.get("submittedAt");

                        long millisA = timeA instanceof Timestamp
                                ? ((Timestamp) timeA).toDate().getTime()
                                : 0L;

                        long millisB = timeB instanceof Timestamp
                                ? ((Timestamp) timeB).toDate().getTime()
                                : 0L;

                        return Long.compare(millisB, millisA);
                    });

                    for (DocumentSnapshot document : documents) {
                        loadEmployeeName(document);
                    }
                })
                .addOnFailureListener(e -> {

                    updatesContainer.removeAllViews();
                    showDeleteAllButton();

                    tvNoUpdates.setVisibility(View.VISIBLE);
                    tvNoUpdates.setText(
                            "Unable to load work updates:\n" + e.getMessage()
                    );

                    Toast.makeText(
                            AdminWorkUpdateActivity.this,
                            "Failed to load work updates: " + e.getMessage(),
                            Toast.LENGTH_LONG
                    ).show();
                });
    }

    // =========================================================
    // DELETE ALL BUTTON
    // =========================================================

    private void showDeleteAllButton() {

        btnDeleteAll = new Button(this);
        btnDeleteAll.setText("Delete All Updates");
        btnDeleteAll.setTextSize(15);
        btnDeleteAll.setAllCaps(false);

        btnDeleteAll.setTextColor(0xFFFFFFFF);
        btnDeleteAll.setBackgroundTintList(
                android.content.res.ColorStateList.valueOf(0xFFD32F2F)
        );

        LinearLayout.LayoutParams params =
                new LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.MATCH_PARENT,
                        LinearLayout.LayoutParams.WRAP_CONTENT
                );

        params.setMargins(0, 0, 0, 20);

        // Keep this button at the top of the updates list.
        updatesContainer.addView(btnDeleteAll, params);

        btnDeleteAll.setOnClickListener(v -> confirmDeleteAll());
    }

    // =========================================================
    // CONFIRM DELETE ALL
    // =========================================================

    private void confirmDeleteAll() {

        new AlertDialog.Builder(this)
                .setTitle("Delete All Work Updates?")
                .setMessage(
                        "Are you sure you want to permanently delete all " +
                                "employee work updates? This action cannot be undone."
                )
                .setNegativeButton("Cancel", (dialog, which) -> dialog.dismiss())
                .setPositiveButton("Delete All", (dialog, which) -> {
                    deleteAllWorkUpdates();
                })
                .show();
    }

    // =========================================================
    // DELETE ALL WORK UPDATES
    // =========================================================

    private void deleteAllWorkUpdates() {

        if (isDeletingAll) {
            return;
        }

        isDeletingAll = true;

        if (btnDeleteAll != null) {
            btnDeleteAll.setEnabled(false);
            btnDeleteAll.setText("Deleting Updates...");
        }

        firestore.collectionGroup("dailyUpdates")
                .get()
                .addOnSuccessListener(querySnapshot -> {

                    List<DocumentSnapshot> documents =
                            querySnapshot.getDocuments();

                    if (documents.isEmpty()) {
                        isDeletingAll = false;

                        Toast.makeText(
                                this,
                                "There are no work updates to delete.",
                                Toast.LENGTH_SHORT
                        ).show();

                        loadWorkUpdates();
                        return;
                    }

                    deleteDocumentsInBatches(documents, 0);
                })
                .addOnFailureListener(e -> {

                    isDeletingAll = false;

                    Toast.makeText(
                            this,
                            "Could not retrieve updates: " + e.getMessage(),
                            Toast.LENGTH_LONG
                    ).show();

                    loadWorkUpdates();
                });
    }

    // =========================================================
    // DELETE DOCUMENTS IN BATCHES
    // Firestore allows up to 500 writes per batch.
    // =========================================================

    private void deleteDocumentsInBatches(
            List<DocumentSnapshot> documents,
            int startIndex
    ) {

        if (startIndex >= documents.size()) {

            isDeletingAll = false;

            Toast.makeText(
                    this,
                    "All work updates deleted successfully.",
                    Toast.LENGTH_LONG
            ).show();

            loadWorkUpdates();
            return;
        }

        final int batchSize = 400;

        int endIndex = Math.min(
                startIndex + batchSize,
                documents.size()
        );

        WriteBatch batch = firestore.batch();

        for (int i = startIndex; i < endIndex; i++) {
            batch.delete(documents.get(i).getReference());
        }

        batch.commit()
                .addOnSuccessListener(unused -> {

                    deleteDocumentsInBatches(documents, endIndex);
                })
                .addOnFailureListener(e -> {

                    isDeletingAll = false;

                    Toast.makeText(
                            this,
                            "Some updates could not be deleted: "
                                    + e.getMessage(),
                            Toast.LENGTH_LONG
                    ).show();

                    loadWorkUpdates();
                });
    }

    // =========================================================
    // LOAD EMPLOYEE NAME
    // =========================================================

    private void loadEmployeeName(DocumentSnapshot document) {

        String employeeId = document.getString("employeeId");
        String email = document.getString("employeeEmail");

        // Path:
        // workUpdates/{employeeUID}/dailyUpdates/{updateID}
        if (employeeId == null || employeeId.trim().isEmpty()) {

            if (document.getReference().getParent() != null
                    && document.getReference().getParent().getParent() != null) {

                employeeId = document.getReference()
                        .getParent()
                        .getParent()
                        .getId();
            }
        }

        if (employeeId == null || employeeId.trim().isEmpty()) {
            addUpdateCard(document, "Employee");
            return;
        }

        final String finalEmployeeId = employeeId;

        firestore.collection("employees")
                .document(finalEmployeeId)
                .get()
                .addOnSuccessListener(employeeDocument -> {

                    String name = employeeDocument.getString("name");

                    if (name == null || name.trim().isEmpty()) {
                        name = employeeDocument.getString("employeeName");
                    }

                    if (name == null || name.trim().isEmpty()) {
                        name = email;
                    }

                    if (name == null || name.trim().isEmpty()) {
                        name = "Employee";
                    }

                    addUpdateCard(document, name);
                })
                .addOnFailureListener(e -> {

                    String fallbackName = email;

                    if (fallbackName == null || fallbackName.trim().isEmpty()) {
                        fallbackName = "Employee";
                    }

                    addUpdateCard(document, fallbackName);
                });
    }

    // =========================================================
    // DELETE SINGLE WORK UPDATE
    // =========================================================

    private void confirmDeleteSingle(DocumentSnapshot document) {

        new AlertDialog.Builder(this)
                .setTitle("Delete Work Update?")
                .setMessage(
                        "Are you sure you want to delete this employee's " +
                                "work update? This action cannot be undone."
                )
                .setNegativeButton("Cancel", (dialog, which) -> dialog.dismiss())
                .setPositiveButton("Delete", (dialog, which) -> {

                    document.getReference()
                            .delete()
                            .addOnSuccessListener(unused -> {

                                Toast.makeText(
                                        this,
                                        "Work update deleted successfully.",
                                        Toast.LENGTH_SHORT
                                ).show();

                                loadWorkUpdates();
                            })
                            .addOnFailureListener(e -> {

                                Toast.makeText(
                                        this,
                                        "Failed to delete work update: "
                                                + e.getMessage(),
                                        Toast.LENGTH_LONG
                                ).show();
                            });
                })
                .show();
    }

    // =========================================================
    // CREATE WORK UPDATE CARD
    // =========================================================

    private void addUpdateCard(
            DocumentSnapshot document,
            String employeeName
    ) {

        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setPadding(20, 20, 20, 20);
        card.setBackgroundColor(0xFFFFFFFF);
        card.setElevation(4);

        LinearLayout.LayoutParams params =
                new LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.MATCH_PARENT,
                        LinearLayout.LayoutParams.WRAP_CONTENT
                );

        params.setMargins(0, 0, 0, 16);

        updatesContainer.addView(card, params);

        // EMPLOYEE NAME
        card.addView(createTextView(employeeName, 19, true));

        // EMAIL
        String email = document.getString("employeeEmail");

        TextView emailView = createTextView(
                safe(email),
                13,
                false
        );

        emailView.setTextColor(0xFF66756F);
        card.addView(emailView);

        // DATE
        String date = document.getString("date");

        TextView dateView = createTextView(
                "Date: " + safe(date),
                14,
                false
        );

        dateView.setTextColor(0xFF52635C);

        LinearLayout.LayoutParams dateParams =
                new LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.MATCH_PARENT,
                        LinearLayout.LayoutParams.WRAP_CONTENT
                );

        dateParams.topMargin = 12;
        card.addView(dateView, dateParams);

        // SECTION
        Long section = document.getLong("section");

        TextView sectionView = createTextView(
                "Section: " + safeSection(section),
                14,
                true
        );

        sectionView.setTextColor(0xFF087F5B);
        card.addView(sectionView);

        // WORK SCHEDULE
        String workSchedule = document.getString("workSchedule");

        TextView scheduleView = createTextView(
                "Work Schedule: " + safe(workSchedule),
                14,
                false
        );

        scheduleView.setTextColor(0xFF52635C);
        card.addView(scheduleView);

        // SUBMISSION WINDOW
        String submissionWindow =
                document.getString("submissionWindow");

        TextView windowView = createTextView(
                "Submission Window: " + safe(submissionWindow),
                14,
                false
        );

        windowView.setTextColor(0xFF52635C);
        card.addView(windowView);

        // WORK UPDATE LABEL
        TextView updateLabel = createTextView(
                "Work Update",
                15,
                true
        );

        LinearLayout.LayoutParams labelParams =
                new LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.MATCH_PARENT,
                        LinearLayout.LayoutParams.WRAP_CONTENT
                );

        labelParams.topMargin = 15;
        card.addView(updateLabel, labelParams);

        // WORK UPDATE TEXT
        String update = document.getString("update");

        TextView updateView = createTextView(
                safe(update),
                14,
                false
        );

        updateView.setTextColor(0xFF172A24);
        card.addView(updateView);

        // SUBMITTED TIME
        Object submittedAt = document.get("submittedAt");

        String submittedText = "Submitted";

        if (submittedAt instanceof Timestamp) {

            Timestamp timestamp = (Timestamp) submittedAt;

            submittedText = new SimpleDateFormat(
                    "dd MMM yyyy, hh:mm a",
                    Locale.getDefault()
            ).format(timestamp.toDate());

        } else {

            String submittedTime =
                    document.getString("submittedTime");

            if (submittedTime != null
                    && !submittedTime.trim().isEmpty()) {

                submittedText = submittedTime;
            }
        }

        TextView submittedView = createTextView(
                "Submitted: " + submittedText,
                12,
                false
        );

        submittedView.setTextColor(0xFF77857F);

        LinearLayout.LayoutParams submittedParams =
                new LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.MATCH_PARENT,
                        LinearLayout.LayoutParams.WRAP_CONTENT
                );

        submittedParams.topMargin = 15;
        card.addView(submittedView, submittedParams);

        // DELETE THIS WORK UPDATE BUTTON
        Button btnDelete = new Button(this);

        btnDelete.setText("Delete Work Update");
        btnDelete.setAllCaps(false);
        btnDelete.setTextColor(0xFFFFFFFF);

        btnDelete.setBackgroundTintList(
                android.content.res.ColorStateList.valueOf(0xFFD32F2F)
        );

        LinearLayout.LayoutParams deleteParams =
                new LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.MATCH_PARENT,
                        LinearLayout.LayoutParams.WRAP_CONTENT
                );

        deleteParams.topMargin = 12;

        card.addView(btnDelete, deleteParams);

        btnDelete.setOnClickListener(v ->
                confirmDeleteSingle(document)
        );
    }

    // =========================================================
    // TEXT VIEW HELPER
    // =========================================================

    private TextView createTextView(
            String text,
            float size,
            boolean bold
    ) {

        TextView textView = new TextView(this);

        textView.setText(text);
        textView.setTextSize(size);
        textView.setTextColor(0xFF172A24);

        if (bold) {
            textView.setTypeface(null, Typeface.BOLD);
        }

        return textView;
    }

    private String safe(String value) {

        if (value == null || value.trim().isEmpty()) {
            return "-";
        }

        return value;
    }

    private String safeSection(Long section) {

        if (section == null) {
            return "-";
        }

        return String.valueOf(section);
    }
}
