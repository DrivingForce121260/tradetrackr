/**
 * Re-analyze Emails Script
 * Re-runs AI analysis on existing emails with fallback summaries
 * 
 * Usage: node scripts/reanalyze-emails.js
 */

const { initializeApp } = require('firebase/app');
const { getFunctions, httpsCallable } = require('firebase/functions');
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

async function runReanalysis() {
  try {
    console.log('🤖 TradeTrackr Email Re-Analysis');
    console.log('=================================\n');

    // Get credentials from environment
    const adminEmail = process.env.ADMIN_EMAIL || 'david@3d-systems.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'L8174822';

    // Sign in as admin
    console.log('🔐 Signing in as admin...');
    const userCredential = await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
    console.log(`✅ Signed in as: ${userCredential.user.email}\n`);

    // Call re-analysis function
    console.log('🤖 Starting AI re-analysis of existing emails...');
    console.log('This will take several minutes (100ms per email).\n');
    console.log('⏳ Please wait...\n');

    const reanalyzeFn = httpsCallable(functions, 'reanalyzeEmails', {
      timeout: 540000 // 9 minutes
    });
    
    const result = await reanalyzeFn();

    // Display results
    console.log('\n✅ Re-analysis completed successfully!\n');
    console.log('Results:');
    console.log('========');
    console.log(`  Total processed:     ${result.data.totalProcessed}`);
    console.log(`  Successfully updated: ${result.data.successful}`);
    console.log(`  Failed:              ${result.data.failed}`);
    
    if (result.data.successful > 0) {
      console.log(`\n🎉 Successfully re-analyzed ${result.data.successful} emails with AI!`);
      console.log('Refresh your browser to see the new summaries.');
    }

    // Sign out
    await auth.signOut();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error during re-analysis:', error.message);
    
    if (error.code === 'auth/user-not-found') {
      console.error('\n💡 The admin email was not found.');
    } else if (error.code === 'auth/wrong-password') {
      console.error('\n💡 Invalid password.');
    } else if (error.code === 'functions/permission-denied') {
      console.error('\n💡 Permission denied. User must have admin role.');
    } else if (error.code === 'functions/deadline-exceeded') {
      console.error('\n💡 Function timeout. This can happen with many emails.');
      console.error('Run the script again to continue re-analyzing remaining emails.');
    }

    process.exit(1);
  }
}

// Run the re-analysis
runReanalysis();








