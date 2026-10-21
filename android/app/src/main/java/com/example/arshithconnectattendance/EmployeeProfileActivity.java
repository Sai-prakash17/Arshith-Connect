package com.example.arshithconnectattendance;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.text.TextUtils;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ImageButton;
import android.widget.ImageView;
import android.widget.TextView;
import android.widget.Toast;

import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.appcompat.app.AppCompatActivity;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;
import com.google.firebase.firestore.DocumentSnapshot;
import com.google.firebase.firestore.FirebaseFirestore;
import com.google.firebase.firestore.SetOptions;
import com.google.firebase.storage.FirebaseStorage;
import com.google.firebase.storage.StorageReference;
import com.yalantis.ucrop.UCrop;

import java.util.HashMap;
import java.util.Map;

public class EmployeeProfileActivity extends AppCompatActivity {

    // ------------------------------------------------------------
    // UI
    // ------------------------------------------------------------

    private ImageButton btnBack;
    private ImageView imgProfile;
    private Button btnChoosePhoto;
    private Button btnSaveProfile;
    private EditText etProfileName;
    private TextView tvProfileEmail;

    // ------------------------------------------------------------
    // Firebase
    // ------------------------------------------------------------

    private FirebaseAuth auth;
    private FirebaseFirestore db;
    private FirebaseStorage storage;

    private FirebaseUser currentUser;

    // ------------------------------------------------------------
    // Image
    // ------------------------------------------------------------

    private Uri selectedImageUri;
    private Uri croppedImageUri;

    // ------------------------------------------------------------
    // Gallery launcher
    // ------------------------------------------------------------

    private final ActivityResultLauncher<String> galleryLauncher =
            registerForActivityResult(
                    new ActivityResultContracts.GetContent(),
                    uri -> {

                        if (uri == null) {
                            return;
                        }

                        selectedImageUri = uri;

                        startImageCrop(uri);
                    }
            );

    // ------------------------------------------------------------
    // uCrop result launcher
    // ------------------------------------------------------------

    private final ActivityResultLauncher<Intent> cropLauncher =
            registerForActivityResult(
                    new ActivityResultContracts.StartActivityForResult(),
                    result -> {

                        if (result.getResultCode() == RESULT_OK
                                && result.getData() != null) {

                            Uri resultUri =
                                    UCrop.getOutput(result.getData());

                            if (resultUri != null) {

                                croppedImageUri = resultUri;

                                imgProfile.setImageURI(
                                        croppedImageUri
                                );

                                Toast.makeText(
                                        EmployeeProfileActivity.this,
                                        "Photo cropped successfully",
                                        Toast.LENGTH_SHORT
                                ).show();
                            }

                        } else if (result.getResultCode()
                                == UCrop.RESULT_ERROR) {

                            if (result.getData() != null) {

                                Throwable cropError =
                                        UCrop.getError(
                                                result.getData()
                                        );

                                String message =
                                        "Unable to crop photo";

                                if (cropError != null
                                        && cropError.getMessage() != null) {

                                    message =
                                            cropError.getMessage();
                                }

                                Toast.makeText(
                                        EmployeeProfileActivity.this,
                                        message,
                                        Toast.LENGTH_LONG
                                ).show();
                            }
                        }
                    }
            );

    // ------------------------------------------------------------
    // ON CREATE
    // ------------------------------------------------------------

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        setContentView(R.layout.activity_employee_profile);

        initializeFirebase();

        initializeViews();

        setupClicks();

        loadProfile();
    }

    // ------------------------------------------------------------
    // FIREBASE
    // ------------------------------------------------------------

    private void initializeFirebase() {

        auth = FirebaseAuth.getInstance();

        db = FirebaseFirestore.getInstance();

        storage = FirebaseStorage.getInstance();

        currentUser = auth.getCurrentUser();
    }

    // ------------------------------------------------------------
    // INITIALIZE VIEWS
    // ------------------------------------------------------------

    private void initializeViews() {

        btnBack = findViewById(R.id.btnBack);

        imgProfile = findViewById(R.id.imgProfile);

        btnChoosePhoto =
                findViewById(R.id.btnChoosePhoto);

        btnSaveProfile =
                findViewById(R.id.btnSaveProfile);

        etProfileName =
                findViewById(R.id.etProfileName);

        tvProfileEmail =
                findViewById(R.id.tvProfileEmail);
    }

    // ------------------------------------------------------------
    // CLICK EVENTS
    // ------------------------------------------------------------

    private void setupClicks() {

        btnBack.setOnClickListener(v -> finish());

        btnChoosePhoto.setOnClickListener(v -> {

            galleryLauncher.launch("image/*");

        });

        btnSaveProfile.setOnClickListener(v -> {

            saveProfile();

        });
    }

    // ------------------------------------------------------------
    // START IMAGE CROP
    // ------------------------------------------------------------

    private void startImageCrop(Uri sourceUri) {

        String fileName =
                "profile_crop_" + System.currentTimeMillis() + ".jpg";

        Uri destinationUri =
                Uri.fromFile(
                        new java.io.File(
                                getCacheDir(),
                                fileName
                        )
                );

        UCrop.Options options =
                new UCrop.Options();

        // --------------------------------------------------------
        // Crop screen appearance
        // --------------------------------------------------------

        options.setToolbarTitle("Crop Profile Photo");

        options.setToolbarColor(
                android.graphics.Color.rgb(
                        11,
                        143,
                        104
                )
        );


        options.setActiveControlsWidgetColor(
                android.graphics.Color.rgb(
                        11,
                        143,
                        104
                )
        );

        // --------------------------------------------------------
        // IMPORTANT:
        // Show circular crop area
        // --------------------------------------------------------

        options.setCircleDimmedLayer(true);

        // --------------------------------------------------------
        // Show crop guidelines
        // --------------------------------------------------------

        options.setShowCropGrid(true);

        options.setHideBottomControls(false);

        // --------------------------------------------------------
        // JPEG output
        // --------------------------------------------------------

        options.setCompressionFormat(
                android.graphics.Bitmap.CompressFormat.JPEG
        );

        options.setCompressionQuality(90);

        // --------------------------------------------------------
        // Start crop
        // --------------------------------------------------------

        UCrop crop =
                UCrop.of(
                        sourceUri,
                        destinationUri
                );

        /*
         * Square crop area.
         *
         * The employee can still:
         *
         * - zoom
         * - move the photo
         * - position the face
         * - crop the image
         *
         * The crop result will be suitable for the
         * circular profile picture.
         */

        crop.withAspectRatio(1, 1);

        crop.withMaxResultSize(
                1000,
                1000
        );

        crop.withOptions(options);

        crop.start(
                this,
                cropLauncher
        );
    }

    // ------------------------------------------------------------
    // LOAD PROFILE
    // ------------------------------------------------------------

    private void loadProfile() {

        if (currentUser == null) {

            Toast.makeText(
                    this,
                    "User is not logged in",
                    Toast.LENGTH_LONG
            ).show();

            finish();

            return;
        }

        String uid =
                currentUser.getUid();

        String email =
                currentUser.getEmail();

        if (email != null) {

            tvProfileEmail.setText(email);

        } else {

            tvProfileEmail.setText("");
        }

        // --------------------------------------------------------
        // Load Auth display name first
        // --------------------------------------------------------

        if (currentUser.getDisplayName() != null
                && !currentUser.getDisplayName().trim().isEmpty()) {

            etProfileName.setText(
                    currentUser.getDisplayName()
            );
        }

        // --------------------------------------------------------
        // Load Firestore employee profile
        // --------------------------------------------------------

        db.collection("employees")
                .document(uid)
                .get()
                .addOnSuccessListener(documentSnapshot -> {

                    if (!documentSnapshot.exists()) {

                        return;
                    }

                    String name =
                            documentSnapshot.getString("name");

                    String photoUrl =
                            documentSnapshot.getString("photoUrl");

                    if (name != null
                            && !name.trim().isEmpty()) {

                        etProfileName.setText(name);
                    }

                    if (photoUrl != null
                            && !photoUrl.trim().isEmpty()) {

                        loadProfileImage(photoUrl);
                    }

                })
                .addOnFailureListener(e -> {

                    Toast.makeText(
                            this,
                            "Unable to load profile",
                            Toast.LENGTH_SHORT
                    ).show();
                });
    }

    // ------------------------------------------------------------
    // LOAD PROFILE IMAGE FROM FIREBASE
    // ------------------------------------------------------------

    private void loadProfileImage(String photoUrl) {

        try {

            com.bumptech.glide.Glide
                    .with(this)
                    .load(photoUrl)
                    .placeholder(
                            R.drawable.ic_profile_placeholder
                    )
                    .error(
                            R.drawable.ic_profile_placeholder
                    )
                    .centerCrop()
                    .into(imgProfile);

        } catch (Exception e) {

            imgProfile.setImageResource(
                    R.drawable.ic_profile_placeholder
            );
        }
    }

    // ------------------------------------------------------------
    // SAVE PROFILE
    // ------------------------------------------------------------

    private void saveProfile() {

        if (currentUser == null) {

            Toast.makeText(
                    this,
                    "User is not logged in",
                    Toast.LENGTH_LONG
            ).show();

            return;
        }

        String name =
                etProfileName
                        .getText()
                        .toString()
                        .trim();

        if (TextUtils.isEmpty(name)) {

            etProfileName.setError(
                    "Enter your name"
            );

            etProfileName.requestFocus();

            return;
        }

        btnSaveProfile.setEnabled(false);

        btnSaveProfile.setText(
                "SAVING..."
        );

        String uid =
                currentUser.getUid();

        String email =
                currentUser.getEmail();

        // --------------------------------------------------------
        // If employee selected a new cropped photo
        // --------------------------------------------------------

        if (croppedImageUri != null) {

            uploadProfilePhoto(
                    uid,
                    name,
                    email,
                    croppedImageUri
            );

        } else {

            saveProfileData(
                    uid,
                    name,
                    email,
                    null
            );
        }
    }

    // ------------------------------------------------------------
    // UPLOAD PHOTO
    // ------------------------------------------------------------

    private void uploadProfilePhoto(
            String uid,
            String name,
            String email,
            Uri imageUri
    ) {

        StorageReference profileReference =
                storage
                        .getReference()
                        .child("profilePhotos")
                        .child(uid)
                        .child("profile.jpg");

        profileReference
                .putFile(imageUri)
                .addOnSuccessListener(taskSnapshot -> {

                    profileReference
                            .getDownloadUrl()
                            .addOnSuccessListener(downloadUri -> {

                                saveProfileData(
                                        uid,
                                        name,
                                        email,
                                        downloadUri.toString()
                                );

                            })
                            .addOnFailureListener(e -> {

                                resetSaveButton();

                                Toast.makeText(
                                        this,
                                        "Unable to get photo URL",
                                        Toast.LENGTH_LONG
                                ).show();
                            });

                })
                .addOnFailureListener(e -> {

                    resetSaveButton();

                    Toast.makeText(
                            this,
                            "Photo upload failed: "
                                    + e.getMessage(),
                            Toast.LENGTH_LONG
                    ).show();
                });
    }

    // ------------------------------------------------------------
    // SAVE FIRESTORE PROFILE
    // ------------------------------------------------------------

    private void saveProfileData(
            String uid,
            String name,
            String email,
            String photoUrl
    ) {

        Map<String, Object> profile =
                new HashMap<>();

        profile.put(
                "uid",
                uid
        );

        profile.put(
                "name",
                name
        );

        profile.put(
                "email",
                email
        );

        profile.put(
                "role",
                "employee"
        );

        profile.put(
                "updatedAt",
                com.google.firebase.firestore.FieldValue.serverTimestamp()
        );

        if (photoUrl != null) {

            profile.put(
                    "photoUrl",
                    photoUrl
            );
        }

        db.collection("employees")
                .document(uid)
                .set(
                        profile,
                        SetOptions.merge()
                )
                .addOnSuccessListener(unused -> {

                    // Update Firebase Auth display name
                    updateAuthDisplayName(name);

                })
                .addOnFailureListener(e -> {

                    resetSaveButton();

                    Toast.makeText(
                            this,
                            "Profile save failed: "
                                    + e.getMessage(),
                            Toast.LENGTH_LONG
                    ).show();
                });
    }

    // ------------------------------------------------------------
    // UPDATE AUTH DISPLAY NAME
    // ------------------------------------------------------------

    private void updateAuthDisplayName(String name) {

        currentUser
                .updateProfile(
                        new com.google.firebase.auth.UserProfileChangeRequest
                                .Builder()
                                .setDisplayName(name)
                                .build()
                )
                .addOnCompleteListener(task -> {

                    resetSaveButton();

                    if (task.isSuccessful()) {

                        Toast.makeText(
                                this,
                                "Profile saved successfully",
                                Toast.LENGTH_SHORT
                        ).show();

                        // Clear temporary crop reference
                        croppedImageUri = null;

                    } else {

                        Toast.makeText(
                                this,
                                "Profile saved successfully",
                                Toast.LENGTH_SHORT
                        ).show();
                    }
                });
    }

    // ------------------------------------------------------------
    // RESET SAVE BUTTON
    // ------------------------------------------------------------

    private void resetSaveButton() {

        btnSaveProfile.setEnabled(true);

        btnSaveProfile.setText(
                "SAVE PROFILE"
        );
    }
}