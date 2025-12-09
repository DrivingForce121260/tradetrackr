/**
 * Check for orphaned email summaries
 * Finds emailSummaries that reference deleted emails
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, getDoc } = require('firebase/firestore');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');

const firebaseConfig = {
  apiKey: "AIzaSyBgpmu_B5D--n7L8AQpn2GzHP47zMPbeqw",
  authDomain: "reportingapp817.firebaseapp.com",
  projectId: "reportingapp817",
  storageBucket: "reportingapp817.firebasestorage.app",
  messagingSenderId: "1092243252525",
  appId: "1:1092243252525:android:2d7a3cb22a75c90f215fa4"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

async function checkOrphans() {
  try {
    console.log('🔍 Checking for orphaned email summaries...\n');

    const email = 'david@3d-systems.com';
    const password = 'L8174822';

    await signInWithEmailAndPassword(auth, email, password);
    console.log('✅ Authenticated\n');

    // Get all email summaries
    const summariesSnapshot = await getDocs(collection(db, 'emailSummaries'));
    console.log(`Found ${summariesSnapshot.size} email summaries\n`);

    let orphanedCount = 0;
    const orphanedIds = [];

    for (const summaryDoc of summariesSnapshot.docs) {
      const summaryData = summaryDoc.data();
      const emailId = summaryData.emailId;

      // Check if email exists
      const emailRef = doc(db, 'emails', emailId);
      const emailDoc = await getDoc(emailRef);

      if (!emailDoc.exists()) {
        orphanedCount++;
        orphanedIds.push({
          summaryId: summaryDoc.id,
          emailId: emailId,
          category: summaryData.category,
          status: summaryData.status
        });
        console.log(`❌ Orphaned: Summary ${summaryDoc.id} -> Email ${emailId} (MISSING)`);
      }
    }

    console.log(`\n📊 Results:`);
    console.log(`   Total summaries: ${summariesSnapshot.size}`);
    console.log(`   Orphaned: ${orphanedCount}`);
    console.log(`   Valid: ${summariesSnapshot.size - orphanedCount}`);

    if (orphanedCount > 0) {
      console.log(`\n⚠️  Found ${orphanedCount} orphaned email summaries!`);
      console.log('These summaries reference emails that no longer exist.');
      console.log('\nRun cleanup-orphaned-summaries.js to remove them.');
    } else {
      console.log('\n✅ No orphaned summaries found!');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkOrphans();








