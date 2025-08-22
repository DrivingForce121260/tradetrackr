import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

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

// Firebase-Authentifizierung initialisieren
export const auth = getAuth(app);

// Firebase-Storage initialisieren
export const storage = getStorage(app);

export default app;

