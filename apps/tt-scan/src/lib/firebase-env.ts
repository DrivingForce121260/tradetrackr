/**
 * Alternative Firebase-Konfiguration mit Umgebungsvariablen
 * 
 * Um diese zu verwenden:
 * 1. Kopieren Sie .env.example zu .env
 * 2. Füllen Sie die Werte aus der Firebase Console aus
 * 3. Importieren Sie diese Datei statt firebase.ts in Ihrer App
 * 4. Installieren Sie: npm install react-native-dotenv
 * 5. Konfigurieren Sie babel.config.js mit dem dotenv-Plugin
 */

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions, httpsCallable as createCallable } from 'firebase/functions';
import Constants from 'expo-constants';

const firebaseConfig = {
  apiKey: Constants.expoConfig?.extra?.firebaseApiKey,
  authDomain: Constants.expoConfig?.extra?.firebaseAuthDomain,
  projectId: Constants.expoConfig?.extra?.firebaseProjectId,
  storageBucket: Constants.expoConfig?.extra?.firebaseStorageBucket,
  messagingSenderId: Constants.expoConfig?.extra?.firebaseMessagingSenderId,
  appId: Constants.expoConfig?.extra?.firebaseAppId,
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

export const httpsCallable = createCallable;











