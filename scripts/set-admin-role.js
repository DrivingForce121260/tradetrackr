/**
 * Set Admin Role Script
 * Sets the admin role for a specific user in Firestore
 * 
 * Usage: node set-admin-role.js USER_EMAIL
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, doc, getDoc, setDoc, updateDoc } = require('firebase/firestore');
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

async function setAdminRole() {
  try {
    const targetEmail = process.argv[2] || 'david@3d-systems.com';
    const currentEmail = process.env.ADMIN_EMAIL;
    const currentPassword = process.env.ADMIN_PASSWORD;

    if (!currentEmail || !currentPassword) {
      console.error('❌ Error: Admin credentials not provided');
      console.log('\nUsage:');
      console.log('  ADMIN_EMAIL=current-admin@email.com ADMIN_PASSWORD=password node set-admin-role.js [target-email]');
      process.exit(1);
    }

    console.log('🔧 Set Admin Role for User');
    console.log('==========================\n');

    // Sign in
    console.log('🔐 Signing in...');
    const userCredential = await signInWithEmailAndPassword(auth, currentEmail, currentPassword);
    const currentUid = userCredential.user.uid;
    console.log(`✅ Signed in as: ${currentEmail}\n`);

    // Check if we're setting our own role
    const targetUid = targetEmail === currentEmail ? currentUid : 'IvLgYIT0jLgYnmgrqgSVkeoP2I53';

    console.log(`Setting admin role for: ${targetEmail}`);
    console.log(`User UID: ${targetUid}\n`);

    // Get current user document
    const userRef = doc(db, 'users', targetUid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      console.log('⚠️  User document does not exist. Creating it...');
      
      await setDoc(userRef, {
        email: targetEmail,
        role: 'admin',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      console.log('✅ User document created with admin role!\n');
    } else {
      const userData = userSnap.data();
      console.log(`Current role: ${userData.role || 'not set'}`);
      
      await updateDoc(userRef, {
        role: 'admin',
        updatedAt: new Date()
      });
      
      console.log('✅ User role updated to admin!\n');
    }

    console.log('🎉 Done! You can now run the cleanup script.\n');

    await auth.signOut();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    
    if (error.code === 'permission-denied') {
      console.error('\n💡 Permission denied. You may need to update Firestore Rules to allow this operation.');
      console.error('Alternatively, set the role manually in Firebase Console:');
      console.error('  1. Go to Firestore Database');
      console.error('  2. Navigate to users collection');
      console.error('  3. Find user: IvLgYIT0jLgYnmgrqgSVkeoP2I53');
      console.error('  4. Set field "role" to "admin"');
    }

    process.exit(1);
  }
}

setAdminRole();








