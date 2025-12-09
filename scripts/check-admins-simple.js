/**
 * Simple script to check admin users using Firebase client SDK
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');
const { getAuth, signInAnonymously } = require('firebase/auth');

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

async function checkAdmins() {
  try {
    console.log('🔍 Checking for admin users...\n');
    
    // Try to sign in anonymously first
    console.log('Attempting anonymous authentication...');
    await signInAnonymously(auth);
    console.log('✅ Authenticated\n');

    // Try to read users collection
    const usersRef = collection(db, 'users');
    const snapshot = await getDocs(usersRef);

    console.log(`Found ${snapshot.size} users\n`);

    const admins = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.role === 'admin' || data.role === 'Admin') {
        admins.push({
          email: data.email || 'No email',
          name: data.name || data.displayName || 'N/A',
          role: data.role
        });
      }
    });

    if (admins.length > 0) {
      console.log(`✅ Found ${admins.length} admin user(s):\n`);
      admins.forEach((admin, index) => {
        console.log(`${index + 1}. ${admin.email}`);
        console.log(`   Name: ${admin.name}`);
        console.log(`   Role: ${admin.role}\n`);
      });
    } else {
      console.log('❌ No admin users found\n');
      console.log('All users found:');
      snapshot.forEach(doc => {
        const data = doc.data();
        console.log(`  - ${data.email || 'No email'}: ${data.role || 'no role'}`);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.code, '-', error.message);
    
    if (error.code === 'permission-denied') {
      console.log('\n💡 Cannot read users collection - permission denied');
      console.log('This is expected if Firestore Rules restrict access.\n');
      console.log('Alternative: Ask the user which account they use to login to TradeTrackr.');
    }
    
    process.exit(1);
  }
}

checkAdmins();








