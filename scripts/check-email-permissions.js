/**
 * Check Email Permissions Script
 * Verifies if emails have correct orgId and user has access
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where, limit } = require('firebase/firestore');
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

async function checkPermissions() {
  try {
    console.log('🔍 Email Permissions Check');
    console.log('=========================\n');

    const email = process.env.ADMIN_EMAIL || 'david@3d-systems.com';
    const password = process.env.ADMIN_PASSWORD || 'L8174822';

    console.log(`🔐 Signing in as: ${email}`);
    const userCred = await signInWithEmailAndPassword(auth, email, password);
    console.log(`✅ Signed in, UID: ${userCred.user.uid}\n`);

    // Get user data to check concernID
    const userDoc = await getDocs(query(collection(db, 'users'), where('__name__', '==', userCred.user.uid)));
    if (!userDoc.empty) {
      const userData = userDoc.docs[0].data();
      console.log(`👤 User Data:`);
      console.log(`   Email: ${userData.email}`);
      console.log(`   Role: ${userData.role}`);
      console.log(`   ConcernID: ${userData.concernID || userData.ConcernID || 'NOT SET'}\n`);
    }

    // Check emails collection
    console.log('📧 Checking emails collection...');
    try {
      const emailsQuery = query(collection(db, 'emails'), limit(3));
      const emailsSnapshot = await getDocs(emailsQuery);
      console.log(`   Found ${emailsSnapshot.size} emails`);
      
      if (emailsSnapshot.size > 0) {
        emailsSnapshot.forEach((doc, idx) => {
          const data = doc.data();
          console.log(`   Email ${idx + 1}:`);
          console.log(`     orgId: ${data.orgId || 'NOT SET'}`);
          console.log(`     from: ${data.from || data.recipient || 'N/A'}`);
          console.log(`     subject: ${data.subject || 'N/A'}`);
        });
      }
    } catch (error) {
      console.error(`   ❌ Error: ${error.code} - ${error.message}`);
    }

    console.log('');

    // Check incomingEmails collection
    console.log('📨 Checking incomingEmails collection...');
    try {
      const incomingQuery = query(collection(db, 'incomingEmails'), limit(3));
      const incomingSnapshot = await getDocs(incomingQuery);
      console.log(`   Found ${incomingSnapshot.size} emails`);
      
      if (incomingSnapshot.size > 0) {
        incomingSnapshot.forEach((doc, idx) => {
          const data = doc.data();
          console.log(`   Email ${idx + 1}:`);
          console.log(`     orgId: ${data.orgId || 'NOT SET'}`);
          console.log(`     from: ${data.from || 'N/A'}`);
          console.log(`     subject: ${data.subject || 'N/A'}`);
        });
      }
    } catch (error) {
      console.error(`   ❌ Error: ${error.code} - ${error.message}`);
    }

    console.log('');

    // Check emailAttachments collection
    console.log('📎 Checking emailAttachments collection...');
    try {
      const attachQuery = query(collection(db, 'emailAttachments'), limit(3));
      const attachSnapshot = await getDocs(attachQuery);
      console.log(`   Found ${attachSnapshot.size} attachments`);
      
      if (attachSnapshot.size > 0) {
        attachSnapshot.forEach((doc, idx) => {
          const data = doc.data();
          console.log(`   Attachment ${idx + 1}:`);
          console.log(`     orgId: ${data.orgId || 'NOT SET'}`);
          console.log(`     emailId: ${data.emailId || 'N/A'}`);
          console.log(`     fileName: ${data.fileName || 'N/A'}`);
        });
      }
    } catch (error) {
      console.error(`   ❌ Error: ${error.code} - ${error.message}`);
    }

    console.log('\n✅ Check complete');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

checkPermissions();








