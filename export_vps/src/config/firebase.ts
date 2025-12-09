import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

// Firebase-Konfiguration aus der FlutterFlow-App
const firebaseConfig = {
  apiKey: "AIzaSyBgpmu_B5D--n7L8AQpn2GzHP47zMPbeqw",
  authDomain: "reportingapp817.firebaseapp.com",
  projectId: "reportingapp817",
  storageBucket: "reportingapp817.firebasestorage.app",
  messagingSenderId: "1092243252525",
  appId: "1:1092243252525:android:2d7a3cb22a75c90f215fa4"
};

// Firebase-App initialisieren
const app = initializeApp(firebaseConfig);

// Firestore-Datenbank initialisieren
export const db = getFirestore(app);

// Enable offline persistence to reduce redundant reads
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn('⚠️ Firestore Persistence: Multiple tabs open, persistence only available in one tab');
  } else if (err.code === 'unimplemented') {
    console.warn('⚠️ Firestore Persistence: Not supported in this browser');
  }
});

// Firebase-Authentifizierung initialisieren
export const auth = getAuth(app);

// Firebase-Storage initialisieren
export const storage = getStorage(app);

// Firebase Cloud Functions initialisieren
// Standard Functions (us-central1)
export const functions = getFunctions(app);

// Email Intelligence Functions (europe-west1)
export const functionsEU = getFunctions(app, 'europe-west1');

export default app;

