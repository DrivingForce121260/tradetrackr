/**
 * Cleanup Script: Remove duplicate emails
 * Run this script to clean up existing duplicate emails in Firestore
 * 
 * Usage: node scripts/cleanup-email-duplicates.js
 */

const { initializeApp } = require('firebase/app');
const { getFunctions, httpsCallable, connectFunctionsEmulator } = require('firebase/functions');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyBgpmu_B5D--n7L8AQpn2GzHP47zMPbeqw",
  authDomain: "reportingapp817.firebaseapp.com",
  projectId: "reportingapp817",
  storageBucket: "reportingapp817.firebasestorage.app",
  messagingSenderId: "1092243252525",
  appId: "1:1092243252525:android:2d7a3cb22a75c90f215fa4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const functions = getFunctions(app, 'europe-west1');

// Uncomment if using emulator:
// connectFunctionsEmulator(functions, 'localhost', 5001);

async function runCleanup() {
  try {
    console.log('🔧 TradeTrackr Email Duplicate Cleanup');
    console.log('=====================================\n');

    // Check if credentials are provided via environment variables
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      console.error('❌ Error: Admin credentials not provided');
      console.log('\nPlease set environment variables:');
      console.log('  ADMIN_EMAIL=your-admin@email.com');
      console.log('  ADMIN_PASSWORD=your-password');
      console.log('\nExample:');
      console.log('  ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=secret123 node scripts/cleanup-email-duplicates.js');
      process.exit(1);
    }

    // Sign in as admin
    console.log('🔐 Signing in as admin...');
    const userCredential = await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
    console.log(`✅ Signed in as: ${userCredential.user.email}\n`);

    // Call cleanup function
    console.log('🧹 Starting duplicate cleanup...');
    console.log('This may take a few minutes depending on the number of emails.\n');

    const cleanupFn = httpsCallable(functions, 'cleanupDuplicateEmails');
    const result = await cleanupFn();

    // Display results
    console.log('\n✅ Cleanup completed successfully!\n');
    console.log('Results:');
    console.log('========');
    console.log(`  Total emails:         ${result.data.totalEmails}`);
    console.log(`  Duplicates found:     ${result.data.duplicatesFound}`);
    console.log(`  Duplicates deleted:   ${result.data.duplicatesDeleted}`);
    console.log(`  Unique emails kept:   ${result.data.totalEmails - result.data.duplicatesDeleted}`);
    
    if (result.data.duplicatesDeleted === 0) {
      console.log('\n🎉 No duplicates found - your database is clean!');
    } else {
      console.log(`\n🎉 Successfully removed ${result.data.duplicatesDeleted} duplicate emails!`);
    }

    // Sign out
    await auth.signOut();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error during cleanup:', error.message);
    
    if (error.code === 'auth/user-not-found') {
      console.error('\n💡 The admin email was not found. Please check your credentials.');
    } else if (error.code === 'auth/wrong-password') {
      console.error('\n💡 Invalid password. Please check your credentials.');
    } else if (error.code === 'functions/permission-denied') {
      console.error('\n💡 Permission denied. This user must have admin role.');
    } else if (error.code === 'functions/unauthenticated') {
      console.error('\n💡 Authentication failed. Please check your credentials.');
    }

    process.exit(1);
  }
}

// Run the cleanup
runCleanup();

