/**
 * Check Email Summaries
 * Verifies that summaries have been updated with AI analysis
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, limit } = require('firebase/firestore');
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

async function checkSummaries() {
  try {
    console.log('🔍 Checking Email Summaries\n');

    await signInWithEmailAndPassword(auth, 'david@3d-systems.com', 'L8174822');
    console.log('✅ Authenticated\n');

    // Get some email summaries
    const q = query(collection(db, 'emailSummaries'), limit(10));
    const snapshot = await getDocs(q);

    console.log(`Found ${snapshot.size} email summaries\n`);

    let fallbackCount = 0;
    let aiCount = 0;

    snapshot.forEach((doc, idx) => {
      const data = doc.data();
      const hasFallback = data.summaryBullets?.includes('E-Mail erhalten - manuelle Überprüfung erforderlich');
      
      if (hasFallback) {
        fallbackCount++;
      } else {
        aiCount++;
      }

      console.log(`${idx + 1}. Summary ID: ${doc.id}`);
      console.log(`   Category: ${data.category || 'N/A'}`);
      console.log(`   Priority: ${data.priority || 'N/A'}`);
      console.log(`   Status: ${data.status || 'N/A'}`);
      console.log(`   Bullets:`);
      (data.summaryBullets || []).forEach(bullet => {
        console.log(`     - ${bullet}`);
      });
      console.log('');
    });

    console.log(`\n📊 Summary:`);
    console.log(`   AI-analyzed: ${aiCount}`);
    console.log(`   Fallback: ${fallbackCount}`);

    if (fallbackCount > 0) {
      console.log(`\n⚠️  ${fallbackCount} summaries still have fallback text!`);
      console.log('This means the re-analysis may not have worked correctly.');
    } else {
      console.log('\n✅ All checked summaries have AI analysis!');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkSummaries();








