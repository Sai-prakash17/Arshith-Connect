package com.example.arshithconnectattendance;

import android.os.Bundle;
import android.view.View;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import com.google.firebase.Timestamp;
import com.google.firebase.firestore.DocumentSnapshot;
import com.google.firebase.firestore.FirebaseFirestore;
import com.google.firebase.firestore.Query;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public class EmployeeAnnouncementsActivity extends AppCompatActivity {

    private FirebaseFirestore firestore;

    private LinearLayout announcementsContainer;

    private TextView tvNoAnnouncements;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        setContentView(R.layout.activity_employee_announcements);

        firestore =
                FirebaseFirestore.getInstance();

        initializeViews();

        loadAnnouncements();
    }

    // ============================================================
    // INITIALIZE VIEWS
    // ============================================================

    private void initializeViews() {

        announcementsContainer =
                findViewById(
                        R.id.announcementsContainer
                );

        tvNoAnnouncements =
                findViewById(
                        R.id.tvNoAnnouncements
                );
    }

    // ============================================================
    // LOAD ANNOUNCEMENTS
    // ============================================================

    private void loadAnnouncements() {

        firestore
                .collection("announcements")
                .orderBy(
                        "createdAt",
                        Query.Direction.DESCENDING
                )
                .get()
                .addOnSuccessListener(
                        querySnapshot -> {

                            if (announcementsContainer == null) {
                                return;
                            }

                            announcementsContainer
                                    .removeAllViews();

                            if (querySnapshot.isEmpty()) {

                                if (tvNoAnnouncements != null) {

                                    tvNoAnnouncements.setVisibility(
                                            View.VISIBLE
                                    );
                                }

                                return;
                            }

                            if (tvNoAnnouncements != null) {

                                tvNoAnnouncements.setVisibility(
                                        View.GONE
                                );
                            }

                            for (DocumentSnapshot document :
                                    querySnapshot.getDocuments()) {

                                addAnnouncementCard(
                                        document
                                );
                            }
                        }
                )
                .addOnFailureListener(
                        e -> {

                            Toast.makeText(
                                    this,
                                    "Unable to load announcements: "
                                            + e.getMessage(),
                                    Toast.LENGTH_LONG
                            ).show();
                        }
                );
    }

    // ============================================================
    // ADD ANNOUNCEMENT CARD
    // ============================================================

    private void addAnnouncementCard(
            DocumentSnapshot document
    ) {

        // ========================================================
        // CARD
        // ========================================================

        LinearLayout card =
                new LinearLayout(this);

        card.setOrientation(
                LinearLayout.VERTICAL
        );

        card.setBackgroundColor(
                0xFFFFFFFF
        );

        card.setPadding(
                dp(20),
                dp(18),
                dp(20),
                dp(18)
        );

        LinearLayout.LayoutParams cardParams =
                new LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.MATCH_PARENT,
                        LinearLayout.LayoutParams.WRAP_CONTENT
                );

        cardParams.setMargins(
                0,
                0,
                0,
                dp(16)
        );

        card.setLayoutParams(
                cardParams
        );

        card.setElevation(
                dp(3)
        );

        // ========================================================
        // TYPE
        // ========================================================

        TextView tvType =
                new TextView(this);

        String type =
                document.getString(
                        "type"
                );

        if (type == null ||
                type.trim().isEmpty()) {

            type = "General";
        }

        tvType.setText(
                type.toUpperCase(
                        Locale.getDefault()
                )
        );

        tvType.setTextColor(
                0xFF7651E8
        );

        tvType.setTextSize(
                12
        );

        tvType.setTypeface(
                null,
                android.graphics.Typeface.BOLD
        );

        tvType.setIncludeFontPadding(
                true
        );

        card.addView(
                tvType
        );

        // ========================================================
        // TITLE
        // ========================================================

        TextView tvTitle =
                new TextView(this);

        String title =
                document.getString(
                        "title"
                );

        if (title == null ||
                title.trim().isEmpty()) {

            title = "Announcement";
        }

        tvTitle.setText(
                title
        );

        tvTitle.setTextColor(
                0xFF241E31
        );

        tvTitle.setTextSize(
                19
        );

        tvTitle.setTypeface(
                null,
                android.graphics.Typeface.BOLD
        );

        tvTitle.setIncludeFontPadding(
                true
        );

        tvTitle.setSingleLine(
                false
        );

        tvTitle.setMaxLines(
                3
        );

        LinearLayout.LayoutParams titleParams =
                new LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.MATCH_PARENT,
                        LinearLayout.LayoutParams.WRAP_CONTENT
                );

        titleParams.setMargins(
                0,
                dp(7),
                0,
                0
        );

        tvTitle.setLayoutParams(
                titleParams
        );

        card.addView(
                tvTitle
        );

        // ========================================================
        // MESSAGE
        // ========================================================

        TextView tvMessage =
                new TextView(this);

        String message =
                document.getString(
                        "message"
                );

        if (message == null) {

            message = "";
        }

        tvMessage.setText(
                message
        );

        tvMessage.setTextColor(
                0xFF5E576A
        );

        tvMessage.setTextSize(
                14
        );

        tvMessage.setIncludeFontPadding(
                true
        );

        tvMessage.setSingleLine(
                false
        );

        tvMessage.setMaxLines(
                10
        );

        tvMessage.setLineSpacing(
                dp(3),
                1.1f
        );

        LinearLayout.LayoutParams messageParams =
                new LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.MATCH_PARENT,
                        LinearLayout.LayoutParams.WRAP_CONTENT
                );

        messageParams.setMargins(
                0,
                dp(8),
                0,
                0
        );

        tvMessage.setLayoutParams(
                messageParams
        );

        card.addView(
                tvMessage
        );

        // ========================================================
        // DATE
        // ========================================================

        TextView tvDate =
                new TextView(this);

        Timestamp createdAt =
                document.getTimestamp(
                        "createdAt"
                );

        if (createdAt != null) {

            tvDate.setText(
                    formatDate(
                            createdAt.toDate()
                    )
            );

        } else {

            tvDate.setText(
                    ""
            );
        }

        tvDate.setTextColor(
                0xFF918A9B
        );

        tvDate.setTextSize(
                12
        );

        tvDate.setIncludeFontPadding(
                true
        );

        LinearLayout.LayoutParams dateParams =
                new LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.MATCH_PARENT,
                        LinearLayout.LayoutParams.WRAP_CONTENT
                );

        dateParams.setMargins(
                0,
                dp(12),
                0,
                0
        );

        tvDate.setLayoutParams(
                dateParams
        );

        card.addView(
                tvDate
        );

        // ========================================================
        // ADD CARD TO CONTAINER
        // ========================================================

        announcementsContainer.addView(
                card
        );
    }

    // ============================================================
    // DP CONVERTER
    // ============================================================

    private int dp(
            int value
    ) {

        return (int) (
                value *
                        getResources()
                                .getDisplayMetrics()
                                .density
        );
    }

    // ============================================================
    // FORMAT DATE
    // ============================================================

    private String formatDate(
            Date date
    ) {

        return new SimpleDateFormat(
                "dd MMM yyyy, hh:mm a",
                Locale.getDefault()
        ).format(
                date
        );
    }

    // ============================================================
    // ON RESUME
    // ============================================================

    @Override
    protected void onResume() {

        super.onResume();

        loadAnnouncements();
    }
}