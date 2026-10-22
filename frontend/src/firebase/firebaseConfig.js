import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

/**
 * Firebase Client SDK Configuration for Arshith Connect
 * Configured for project: arshith-connect-attendance
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCdc8YjhNXXS0dSdYs1iKgJvL44G_6MAM8",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "arshith-connect-attendance.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "arshith-connect-attendance",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "arshith-connect-attendance.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "143838395615",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:143838395615:web:80c13dbb4a842dd1c5bd6a",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-9SFMX07LJF",
};

// Check if real Firebase configuration is active
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  !firebaseConfig.apiKey.includes('Placeholder')
);

// Initialize Firebase App
let app;
try {
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
} catch (error) {
  console.warn('[Firebase] App initialization warning:', error.message);
  app = getApps()[0];
}

// Optional named Firestore database ID
const firestoreDatabaseId = import.meta.env.VITE_FIREBASE_DATABASE_NAME || '(default)';

// Initialize and export modular Firebase Services
export const auth = getAuth(app);
export const db = firestoreDatabaseId && firestoreDatabaseId !== '(default)'
  ? getFirestore(app, firestoreDatabaseId)
  : getFirestore(app);
export const storage = getStorage(app);

export default app;
