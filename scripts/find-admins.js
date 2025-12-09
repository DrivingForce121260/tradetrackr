/**
 * Find Admin Users Script
 * Checks which users have admin role in Firestore
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin with Application Default Credentials
admin.initializeApp({
  projectId: 'reportingapp817'
});

const db = admin.firestore();

async function findAdmins() {
  try {
    console.log('🔍 Searching for admin users in Firestore...\n');

    // Get all users
    const usersSnapshot = await db.collection('users').get();
    
    if (usersSnapshot.empty) {
      console.log('❌ No users found in Firestore');
      return;
    }

    console.log(`Found ${usersSnapshot.size} users in Firestore\n`);

    // Filter admin users
    const admins = [];
    
    for (const doc of usersSnapshot.docs) {
      const userData = doc.data();
      if (userData.role === 'admin' || userData.role === 'Admin') {
        admins.push({
          uid: doc.id,
          email: userData.email,
          role: userData.role,
          name: userData.name || userData.displayName || 'N/A',
          concernID: userData.concernID || userData.ConcernID || 'N/A'
        });
      }
    }

    if (admins.length === 0) {
      console.log('❌ No admin users found!\n');
      console.log('All user roles:');
      usersSnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`  - ${data.email || 'No email'}: role = ${data.role || 'not set'}`);
      });
    } else {
      console.log(`✅ Found ${admins.length} admin user(s):\n`);
      admins.forEach((admin, index) => {
        console.log(`${index + 1}. Admin User:`);
        console.log(`   Email:      ${admin.email}`);
        console.log(`   Name:       ${admin.name}`);
        console.log(`   Role:       ${admin.role}`);
        console.log(`   UID:        ${admin.uid}`);
        console.log(`   ConcernID:  ${admin.concernID}`);
        console.log('');
      });
      
      console.log('✅ Use one of these email addresses with the cleanup script.\n');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

findAdmins();

