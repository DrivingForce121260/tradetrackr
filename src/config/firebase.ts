import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager 
} from 'firebase/firestore';
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

// Firestore-Datenbank initialisieren with modern persistent cache
// Uses the new cache API (Firestore v10+) instead of deprecated enableIndexedDbPersistence
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
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

