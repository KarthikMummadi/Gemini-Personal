import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile,
  User as FirebaseUser,
  Auth,
} from 'firebase/auth';
import {
  getFirestore,
  Firestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  where,
  writeBatch,
} from 'firebase/firestore';

// Public Firebase Web Client configuration pointing to intended project
const firebaseConfig = {
  projectId: import.meta.env?.VITE_FIREBASE_PROJECT_ID || "gemini-journal-507808",
  appId: import.meta.env?.VITE_FIREBASE_APP_ID || "1:696566766542:web:fbd6eed828a82faea7699f",
  apiKey: import.meta.env?.VITE_FIREBASE_API_KEY || "AIzaSyBqrI_5S6I8ND5LqHfIGtkyOkG2tZ9N31g",
  authDomain: import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN || "gemini-journal-507808.firebaseapp.com",
  firestoreDatabaseId: import.meta.env?.VITE_FIREBASE_DATABASE_ID || "(default)",
  storageBucket: import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET || "gemini-journal-507808.firebasestorage.app",
  messagingSenderId: import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID || "696566766542",
};

// Initialize Firebase App singleton
const app: FirebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firebase Authentication
export const auth: Auth = getAuth(app);

// Initialize Cloud Firestore targeting the designated database
export const db: Firestore = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

/**
 * Sign in using Google OAuth popup
 */
export async function signInWithGoogle(): Promise<FirebaseUser> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

/**
 * Sign in with email and password
 */
export async function signInWithEmail(email: string, pass: string): Promise<FirebaseUser> {
  const result = await signInWithEmailAndPassword(auth, email, pass);
  return result.user;
}

/**
 * Register account with email and password
 */
export async function signUpWithEmail(email: string, pass: string, name?: string): Promise<FirebaseUser> {
  const result = await createUserWithEmailAndPassword(auth, email, pass);
  if (name && result.user) {
    await updateProfile(result.user, { displayName: name });
  }
  return result.user;
}

/**
 * Sign out current authenticated user
 */
export async function logOut(): Promise<void> {
  await fbSignOut(auth);
}

/**
 * Send password reset email
 */
export async function resetUserPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}

/**
 * Safely retrieve current user ID token to authorize server API calls
 */
export async function getCurrentUserIdToken(): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) return null;
  return await user.getIdToken(false);
}

export {
  onAuthStateChanged,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  where,
  writeBatch,
};
export type { FirebaseUser };
