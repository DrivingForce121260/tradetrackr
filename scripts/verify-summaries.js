/**
 * Verify Summaries
 * Checks if summaries have been properly updated
 */

const admin = require('firebase-admin');

admin.initializeApp({ projectId: 'reportingapp817' });
const db = admin.firestore();

async function verifySummaries() {
  try {
    console.log('🔍 Verifying Email Summaries\n');

    const summaries = await db.collection('emailSummaries')
      .limit(10)
      .get();

    console.log(`Checking ${summaries.size} summaries:\n`);

    let fallbackCount = 0;
    let aiCount = 0;

    summaries.forEach((doc, idx) => {
      const data = doc.data();
      const hasFallback = data.summaryBullets?.some(b => 
        b.includes('manuelle Überprüfung erforderlich') || 
        b.includes('manual Überprüfung eforderlich')
      );

      if (hasFallback) {
        fallbackCount++;
        console.log(`${idx + 1}. ❌ Fallback - ${doc.id.substring(0, 8)}...`);
      } else {
        aiCount++;
        console.log(`${idx + 1}. ✅ AI-analyzed - ${doc.id.substring(0, 8)}...`);
      }
      
      console.log(`   Category: ${data.category}`);
      console.log(`   Bullets:`);
      (data.summaryBullets || []).forEach(b => {
        console.log(`     • ${b}`);
      });
      console.log('');
    });

    console.log(`\n📊 Summary:`);
    console.log(`   AI-analyzed: ${aiCount}`);
    console.log(`   Fallback: ${fallbackCount}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

verifySummaries();








