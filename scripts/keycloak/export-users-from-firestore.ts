#!/usr/bin/env npx tsx
/**
 * Export Users from Firestore for Keycloak Import
 * 
 * This script connects to Firestore and exports user data in the format
 * expected by the Keycloak import script.
 * 
 * Usage:
 *   npx tsx scripts/keycloak/export-users-from-firestore.ts > users.json
 * 
 * The output can be used with:
 *   npx tsx scripts/keycloak/import-users.ts --input users.json
 * 
 * Environment:
 *   GOOGLE_APPLICATION_CREDENTIALS - Path to Firebase service account key
 * 
 * @see /runbooks/user-migration.md
 */

import * as admin from 'firebase-admin';

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'reportingapp817',
  });
}

const db = admin.firestore();

interface ExportedUser {
  email: string;
  tenant_id: string;
  roles: string[];
  firstName?: string;
  lastName?: string;
  firestoreUid?: string;
}

async function exportUsers(): Promise<void> {
  console.error('Connecting to Firestore...');
  
  const usersRef = db.collection('users');
  const snapshot = await usersRef.get();
  
  const users: ExportedUser[] = [];
  const seenEmails = new Set<string>();
  
  snapshot.forEach((doc) => {
    const data = doc.data();
    const email = data.email?.toLowerCase();
    
    // Skip if no email or already seen (duplicates)
    if (!email || seenEmails.has(email)) {
      return;
    }
    
    // Skip deleted or inactive users
    if (data.isDeleted || data.isActive === false) {
      console.error(`Skipping inactive/deleted user: ${email}`);
      return;
    }
    
    // Skip users with pending verification
    if (data.verificationCode) {
      console.error(`Skipping user with pending verification: ${email}`);
      return;
    }
    
    seenEmails.add(email);
    
    // Map role
    const role = data.role || 'staff';
    const roles: string[] = [];
    
    if (role === 'admin' || role === 'Admin' || data.isAdmin) {
      roles.push('admin');
    }
    if (role === 'manager' || role === 'Manager') {
      roles.push('manager');
    }
    if (role === 'office' || role === 'Office') {
      roles.push('office');
    }
    if (role === 'accounting' || role === 'Accounting') {
      roles.push('accounting');
    }
    if (roles.length === 0) {
      roles.push('staff');
    }
    
    const user: ExportedUser = {
      email,
      tenant_id: data.concernID || data.ConcernID || '',
      roles,
      firstName: data.vorname || data.firstName || '',
      lastName: data.nachname || data.lastName || '',
      firestoreUid: doc.id,
    };
    
    if (!user.tenant_id) {
      console.error(`WARNING: User ${email} has no concernID, skipping`);
      return;
    }
    
    users.push(user);
  });
  
  console.error(`Exported ${users.length} users`);
  console.error('');
  
  // Output JSON to stdout
  console.log(JSON.stringify(users, null, 2));
}

exportUsers().catch((error) => {
  console.error('Error exporting users:', error);
  process.exit(1);
});

