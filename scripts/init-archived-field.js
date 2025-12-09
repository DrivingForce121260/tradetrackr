/**
 * Initialize archived field on existing email summaries
 * Sets archived: false on all summaries that don't have this field yet
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, updateDoc, writeBatch } = require('firebase/firestore');
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

async function initArchivedField() {
  try {
    console.log('🔧 Initializing archived field on email summaries\n');

    await signInWithEmailAndPassword(auth, 'david@3d-systems.com', 'L8174822');
    console.log('✅ Authenticated\n');

    // Get all email summaries
    const summariesSnapshot = await getDocs(collection(db, 'emailSummaries'));
    console.log(`Found ${summariesSnapshot.size} email summaries\n`);

    let updateCount = 0;
    const batch = writeBatch(db);
    let batchSize = 0;

    for (const summaryDoc of summariesSnapshot.docs) {
      const data = summaryDoc.data();
      
      // Only update if archived field doesn't exist
      if (data.archived === undefined) {
        batch.update(summaryDoc.ref, { archived: false });
        updateCount++;
        batchSize++;

        // Firestore batch limit is 500
        if (batchSize >= 450) {
          await batch.commit();
          console.log(`Committed batch (${updateCount} updated so far)`);
          batchSize = 0;
        }
      }
    }

    // Commit remaining updates
    if (batchSize > 0) {
      await batch.commit();
    }

    console.log(`\n✅ Updated ${updateCount} email summaries with archived: false`);
    console.log(`${summariesSnapshot.size - updateCount} summaries already had the field`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

initArchivedField();








