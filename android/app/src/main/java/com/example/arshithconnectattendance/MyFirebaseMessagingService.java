package com.example.arshithconnectattendance;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;

import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

import java.util.Map;

public class MyFirebaseMessagingService
        extends FirebaseMessagingService {

    private static final String CHANNEL_ID =
            "arshith_connect_notifications";

    @Override
    public void onNewToken(@NonNull String token) {
        super.onNewToken(token);

        NotificationTokenManager.saveToken(token);
    }

    @Override
    public void onMessageReceived(
            @NonNull RemoteMessage remoteMessage) {

        super.onMessageReceived(remoteMessage);

        String title = "Arshith Connect";
        String body = "You have a new notification.";

        if (remoteMessage.getNotification() != null) {

            if (remoteMessage.getNotification().getTitle() != null) {
                title =
                        remoteMessage
                                .getNotification()
                                .getTitle();
            }

            if (remoteMessage.getNotification().getBody() != null) {
                body =
                        remoteMessage
                                .getNotification()
                                .getBody();
            }
        }

        Map<String, String> data =
                remoteMessage.getData();

        if (data.containsKey("title")) {
            title = data.get("title");
        }

        if (data.containsKey("body")) {
            body = data.get("body");
        }

        showNotification(title, body);
    }

    private void showNotification(
            String title,
            String body) {

        createNotificationChannel();

        Intent intent =
                new Intent(
                        this,
                        EmployeeDashboardActivity.class
                );

        intent.addFlags(
                Intent.FLAG_ACTIVITY_CLEAR_TOP
        );

        PendingIntent pendingIntent =
                PendingIntent.getActivity(
                        this,
                        0,
                        intent,
                        PendingIntent.FLAG_ONE_SHOT
                                | PendingIntent.FLAG_IMMUTABLE
                );

        NotificationCompat.Builder builder =
                new NotificationCompat.Builder(
                        this,
                        CHANNEL_ID
                )
                        .setSmallIcon(
                                R.drawable.ic_notification
                        )
                        .setContentTitle(title)
                        .setContentText(body)
                        .setStyle(
                                new NotificationCompat
                                        .BigTextStyle()
                                        .bigText(body)
                        )
                        .setPriority(
                                NotificationCompat
                                        .PRIORITY_HIGH
                        )
                        .setAutoCancel(true)
                        .setContentIntent(
                                pendingIntent
                        );

        if (Build.VERSION.SDK_INT >=
                Build.VERSION_CODES.TIRAMISU) {

            if (checkSelfPermission(
                    Manifest.permission.POST_NOTIFICATIONS
            ) != PackageManager.PERMISSION_GRANTED) {

                return;
            }
        }

        NotificationManagerCompat
                .from(this)
                .notify(
                        (int) System.currentTimeMillis(),
                        builder.build()
                );
    }

    private void createNotificationChannel() {

        if (Build.VERSION.SDK_INT >=
                Build.VERSION_CODES.O) {

            NotificationChannel channel =
                    new NotificationChannel(
                            CHANNEL_ID,
                            "Arshith Connect Notifications",
                            NotificationManager
                                    .IMPORTANCE_HIGH
                    );

            channel.setDescription(
                    "Notifications from Arshith Connect"
            );

            channel.enableVibration(true);

            NotificationManager manager =
                    getSystemService(
                            NotificationManager.class
                    );

            if (manager != null) {
                manager.createNotificationChannel(
                        channel
                );
            }
        }
    }
}