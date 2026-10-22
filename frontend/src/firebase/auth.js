import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { auth } from './firebaseConfig';

/**
 * Firebase Authentication Helper for Arshith Connect
 */
export const loginWithFirebase = async (email, password) => {
  const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
  const token = await userCredential.user.getIdToken();
  return {
    user: userCredential.user,
    token,
  };
};

export const logoutWithFirebase = async () => {
  await firebaseSignOut(auth);
};

export const getFirebaseIdToken = async () => {
  if (auth.currentUser) {
    return await auth.currentUser.getIdToken();
  }
  return null;
};

export const sendResetPassword = async (email) => {
  await sendPasswordResetEmail(auth, email.trim());
};

export const onAuthStatusChange = (callback) => {
  return onAuthStateChanged(auth, callback);
};
