/**
 * Firebase Configuration & Initialization
 * 
 * IMPORTANT: Sovereignty Phase 03 Migration
 * 
 * Authentication is now handled via Keycloak OIDC.
 * Firebase Auth is NO LONGER USED for user authentication.
 * 
 * This file now only provides:
 * - Firestore (db) - for data storage (until Phase 04 PostgreSQL migration)
 * - Storage (storage) - for file storage (until Phase 05 IONOS S3 migration)
 * 
 * @see /docs/sovereignty/PHASE3_PLAN.md
 */

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

// Firebase configuration from google-services.json
const firebaseConfig = {
  apiKey: "AIzaSyBgpmu_B5D--n7L8AQpn2GzHP47zMPbeqw",
  authDomain: "reportingapp817.firebaseapp.com",
  projectId: "reportingapp817",
  storageBucket: "reportingapp817.firebasestorage.app",
  messagingSenderId: "1092243252525",
  appId: "1:1092243252525:android:2d7a3cb22a75c90f215fa4",
};

// Initialize Firebase (only once)
const app: FirebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firebase services (Firestore + Storage only)
export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);

// NOTE: Firebase Auth is DEPRECATED - Use Keycloak OIDC instead
// See src/lib/auth/oidc-client.ts for authentication

// Log initialization in development
if (typeof __DEV__ !== 'undefined' && __DEV__) {
  console.log('✅ Firebase initialized (Firestore + Storage only)');
  console.log('📦 Project:', firebaseConfig.projectId);
}

export const initError: string | null = null;

export default app;
