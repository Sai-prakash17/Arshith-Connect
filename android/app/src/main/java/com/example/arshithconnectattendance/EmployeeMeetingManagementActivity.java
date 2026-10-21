package com.example.arshithconnectattendance;

import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.LayoutInflater;
import android.view.View;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;
import com.google.firebase.firestore.DocumentSnapshot;
import com.google.firebase.firestore.FirebaseFirestore;
import com.google.firebase.firestore.ListenerRegistration;
import com.google.firebase.Timestamp;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;

public class EmployeeMeetingManagementActivity
        extends AppCompatActivity {

    private static final long ACCESS_DURATION_MS = 5 * 60 * 1000L;
    private static final long REFRESH_INTERVAL_MS = 1000L;

    private FirebaseAuth firebaseAuth;
    private FirebaseFirestore firestore;
    private FirebaseUser currentUser;

    private LinearLayout meetingsContainer;
    private ListenerRegistration meetingsListener;

    private final Handler handler = new Handler(Looper.getMainLooper());

    private boolean listenerStarted = false;

    private final Runnable refreshRunnable = new Runnable() {
        @Override
        public void run() {
            if (isFinishing() || isDestroyed()) {
                return;
            }

            // Refresh the cards so access expires even when
            // Firestore does not send another update.
            if (meetingsContainer != null) {
                loadMeetingsViewFromCache();
            }

            handler.postDelayed(this, REFRESH_INTERVAL_MS);
        }
    };

    // Keep the latest meeting documents for local timer refreshes.
    private final List<DocumentSnapshot> cachedMeetings =
            new ArrayList<>();

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.employee_meeting_management);

        firebaseAuth = FirebaseAuth.getInstance();
        firestore = FirebaseFirestore.getInstance();
        currentUser = firebaseAuth.getCurrentUser();

        meetingsContainer = findViewById(R.id.meetingsContainer);

        if (currentUser == null) {
            Toast.makeText(
                    this,
                    "Please log in to view meetings.",
                    Toast.LENGTH_LONG
            ).show();
            finish();
            return;
        }

        loadMeetings();
    }

    private void loadMeetings() {
        if (currentUser == null || listenerStarted) {
            return;
        }

        listenerStarted = true;
        final String employeeUid = currentUser.getUid();

        meetingsListener = firestore.collection("meetings")
                .addSnapshotListener((snapshots, error) -> {

                    if (isFinishing() || isDestroyed()) {
                        return;
                    }

                    if (error != null) {
                        Toast.makeText(
                                EmployeeMeetingManagementActivity.this,
                                "Unable to load meetings: "
                                        + error.getMessage(),
                                Toast.LENGTH_LONG
                        ).show();
                        return;
                    }

                    if (snapshots == null) {
                        return;
                    }

                    cachedMeetings.clear();

                    for (DocumentSnapshot document :
                            snapshots.getDocuments()) {

                        String status = getString(document, "status");

                        if (status.isEmpty()) {
                            status = "Scheduled";
                        }

                        if (!isSupportedStatus(status)) {
                            continue;
                        }

                        if (employeeCanSeeMeeting(
                                document,
                                employeeUid
                        )) {
                            cachedMeetings.add(document);
                        }
                    }

                    sortMeetings(cachedMeetings);
                    loadMeetingsViewFromCache();
                });

        handler.removeCallbacks(refreshRunnable);
        handler.postDelayed(refreshRunnable, REFRESH_INTERVAL_MS);
    }

    private void loadMeetingsViewFromCache() {
        meetingsContainer.removeAllViews();

        if (cachedMeetings.isEmpty()) {
            showEmptyMessage("No meetings available.");
            return;
        }

        for (DocumentSnapshot document : cachedMeetings) {
            addMeetingCard(document);
        }
    }

    private void sortMeetings(List<DocumentSnapshot> meetings) {
        Collections.sort(
                meetings,
                new Comparator<DocumentSnapshot>() {
                    @Override
                    public int compare(
                            DocumentSnapshot first,
                            DocumentSnapshot second
                    ) {
                        String firstDate = getString(first, "date");
                        String secondDate = getString(second, "date");

                        int dateCompare =
                                firstDate.compareTo(secondDate);

                        if (dateCompare != 0) {
                            return dateCompare;
                        }

                        return getString(first, "time").compareTo(
                                getString(second, "time")
                        );
                    }
                }
        );
    }

    private boolean isSupportedStatus(String status) {
        return "Scheduled".equalsIgnoreCase(status)
                || "Active".equalsIgnoreCase(status)
                || "Ended".equalsIgnoreCase(status);
    }

    private String getString(
            DocumentSnapshot document,
            String field
    ) {
        String value = document.getString(field);
        return value == null ? "" : value.trim();
    }

    private void showEmptyMessage(String message) {
        TextView emptyText = new TextView(this);
        emptyText.setText(message);
        emptyText.setTextSize(16);
        emptyText.setTextColor(0xFF777777);
        emptyText.setPadding(
                dp(20), dp(40), dp(20), dp(40)
        );

        meetingsContainer.addView(emptyText);
    }

    private boolean employeeCanSeeMeeting(
            DocumentSnapshot document,
            String employeeUid
    ) {
        String audienceType =
                getString(document, "audienceType");

        // Preserve visibility for legacy documents.
        if (audienceType.isEmpty()) {
            return true;
        }

        if ("ALL".equalsIgnoreCase(audienceType)) {
            return true;
        }

        if ("SELECTED".equalsIgnoreCase(audienceType)) {
            Object rawIds = document.get("selectedEmployeeIds");

            if (!(rawIds instanceof List<?>)) {
                return false;
            }

            for (Object id : (List<?>) rawIds) {
                if (id instanceof String
                        && employeeUid.equals(id)) {
                    return true;
                }
            }

            return false;
        }

        return false;
    }

    private void addMeetingCard(DocumentSnapshot document) {
        View card = LayoutInflater.from(this).inflate(
                R.layout.item_employee_meeting,
                meetingsContainer,
                false
        );

        TextView tvTitle =
                card.findViewById(R.id.tvMeetingTitle);
        TextView tvDate =
                card.findViewById(R.id.tvMeetingDate);
        TextView tvTime =
                card.findViewById(R.id.tvMeetingTime);
        TextView tvDescription =
                card.findViewById(R.id.tvMeetingDescription);
        TextView tvStatus =
                card.findViewById(R.id.tvMeetingStatus);
        Button btnRequest =
                card.findViewById(R.id.btnRequestJoin);

        String title = getString(document, "title");
        String date = getString(document, "date");
        String time = getString(document, "time");
        String description = getString(document, "description");
        String meetingLink = getString(document, "meetingLink");
        String status = getString(document, "status");

        if (title.isEmpty()) title = "Meeting";
        if (date.isEmpty()) date = "--";
        if (time.isEmpty()) time = "--";
        if (description.isEmpty()) description = "No description";
        if (status.isEmpty()) status = "Scheduled";

        tvTitle.setText(title);
        tvDate.setText("Date: " + date);
        tvTime.setText("Time: " + time);
        tvDescription.setText("Description: " + description);

        if ("Scheduled".equalsIgnoreCase(status)) {
            tvStatus.setText("Status: Scheduled");
            btnRequest.setText("WAITING FOR MEETING");
            btnRequest.setEnabled(false);
            btnRequest.setOnClickListener(null);

        } else if ("Active".equalsIgnoreCase(status)) {

            long startedAt = getStartedAtMillis(document);
            long now = System.currentTimeMillis();

            if (startedAt <= 0) {
                // Fail closed: no valid start timestamp means
                // employees cannot join.
                tvStatus.setText("Status: Start time unavailable");
                btnRequest.setText("ACCESS UNAVAILABLE");
                btnRequest.setEnabled(false);
                btnRequest.setOnClickListener(null);

            } else if (now >= startedAt + ACCESS_DURATION_MS) {
                tvStatus.setText("Status: Access expired");
                btnRequest.setText("ACCESS EXPIRED");
                btnRequest.setEnabled(false);
                btnRequest.setOnClickListener(null);

            } else {
                long remainingMs =
                        startedAt + ACCESS_DURATION_MS - now;

                long remainingSeconds =
                        (remainingMs + 999L) / 1000L;

                tvStatus.setText(
                        "Status: Active - "
                                + remainingSeconds
                                + " seconds left"
                );

                btnRequest.setText("OPEN GOOGLE MEET");
                btnRequest.setEnabled(true);

                final String finalMeetingLink = meetingLink;
                final String meetingId = document.getId();
                final long finalStartedAt = startedAt;

                btnRequest.setOnClickListener(v ->
                        verifyAndJoinMeeting(
                                meetingId,
                                finalStartedAt,
                                finalMeetingLink
                        )
                );
            }

        } else {
            tvStatus.setText("Status: Ended");
            btnRequest.setText("MEETING ENDED");
            btnRequest.setEnabled(false);
            btnRequest.setOnClickListener(null);
        }

        meetingsContainer.addView(card);
    }

    private long getStartedAtMillis(DocumentSnapshot document) {
        Object value = document.get("startedAt");

        if (value instanceof Timestamp) {
            return ((Timestamp) value).toDate().getTime();
        }

        if (value instanceof Number) {
            return ((Number) value).longValue();
        }

        return 0L;
    }

    private void verifyAndJoinMeeting(
            String meetingId,
            long expectedStartedAt,
            String meetingLink
    ) {
        if (meetingId == null || meetingId.trim().isEmpty()) {
            Toast.makeText(
                    this,
                    "Meeting information is unavailable.",
                    Toast.LENGTH_LONG
            ).show();
            return;
        }

        // Re-read the document before opening the link so a stale
        // card cannot be used after the meeting ends or expires.
        firestore.collection("meetings")
                .document(meetingId)
                .get()
                .addOnSuccessListener(document -> {

                    if (isFinishing() || isDestroyed()) {
                        return;
                    }

                    String latestStatus =
                            getString(document, "status");

                    long latestStartedAt =
                            getStartedAtMillis(document);

                    long now = System.currentTimeMillis();

                    if (!"Active".equalsIgnoreCase(latestStatus)) {
                        Toast.makeText(
                                this,
                                "This meeting is no longer active.",
                                Toast.LENGTH_LONG
                        ).show();
                        return;
                    }

                    if (latestStartedAt <= 0
                            || latestStartedAt != expectedStartedAt
                            || now >= latestStartedAt + ACCESS_DURATION_MS) {
                        Toast.makeText(
                                this,
                                "The 5-minute meeting access period has expired.",
                                Toast.LENGTH_LONG
                        ).show();
                        loadMeetingsViewFromCache();
                        return;
                    }

                    // Use the latest Firestore link, not just the
                    // link captured when the card was created.
                    joinMeeting(getString(document, "meetingLink"));

                })
                .addOnFailureListener(error -> {
                    if (isFinishing() || isDestroyed()) {
                        return;
                    }

                    Toast.makeText(
                            this,
                            "Unable to verify meeting access. Please try again.",
                            Toast.LENGTH_LONG
                    ).show();
                });
    }

    private void joinMeeting(String meetingLink) {
        if (meetingLink == null || meetingLink.trim().isEmpty()) {
            Toast.makeText(
                    this,
                    "Google Meet link is not available.",
                    Toast.LENGTH_LONG
            ).show();
            return;
        }

        String cleanLink = meetingLink
                .replace("\n", "")
                .replace("\r", "")
                .trim();

        if (cleanLink.startsWith("meet.google.com/")) {
            cleanLink = "https://" + cleanLink;
        } else if (cleanLink.startsWith("www.meet.google.com/")) {
            cleanLink = "https://" + cleanLink;
        }

        Uri uri = Uri.parse(cleanLink);

        if (!"https".equalsIgnoreCase(uri.getScheme())
                || !"meet.google.com".equalsIgnoreCase(uri.getHost())
                || uri.getUserInfo() != null) {
            Toast.makeText(
                    this,
                    "Invalid Google Meet link.",
                    Toast.LENGTH_LONG
            ).show();
            return;
        }

        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, uri);
            startActivity(intent);

        } catch (ActivityNotFoundException e) {
            Toast.makeText(
                    this,
                    "No app is available to open the meeting.",
                    Toast.LENGTH_LONG
            ).show();

        } catch (Exception e) {
            Toast.makeText(
                    this,
                    "Unable to open Google Meet.",
                    Toast.LENGTH_LONG
            ).show();
        }
    }

    private int dp(int value) {
        return (int) (
                value * getResources()
                        .getDisplayMetrics()
                        .density
        );
    }

    @Override
    protected void onDestroy() {
        handler.removeCallbacks(refreshRunnable);

        if (meetingsListener != null) {
            meetingsListener.remove();
            meetingsListener = null;
        }

        listenerStarted = false;

        super.onDestroy();
    }
}
