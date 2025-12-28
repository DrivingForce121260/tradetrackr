/**
 * Client script to call the project number migration Cloud Function
 * Run with: npm run migrate:projects:call:dry-run
 * Or: npm run migrate:projects:call:apply
 */

import { initializeApp } from 'firebase/app';
import { getFunctions, httpsCallable, connectFunctionsEmulator } from 'firebase/functions';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

// Firebase config (from your existing setup)
const firebaseConfig = {
  apiKey: "AIzaSyDaUrvI4xvIMzGxZBq6CmE54uTq6D2qiFA",
  authDomain: "reportingapp817.firebaseapp.com",
  projectId: "reportingapp817",
  storageBucket: "reportingapp817.firebasestorage.app",
  messagingSenderId: "441028992471",
  appId: "1:441028992471:web:d2da3c5ea8dd5e45f55f8d"
};

const app = initializeApp(firebaseConfig);
const functions = getFunctions(app, 'europe-west1');
const auth = getAuth(app);

async function callMigration(dryRun: boolean, tenantId?: string) {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║     CALLING PROJECT NUMBER MIGRATION CLOUD FUNCTION         ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log(`\n⚙️  Mode: ${dryRun ? '🏃 DRY RUN' : '💾 APPLY'}`);
  if (tenantId) {
    console.log(`⚙️  Tenant: ${tenantId}`);
  }
  
  // Check if user is authenticated
  if (!auth.currentUser) {
    console.log('\n⚠️  Not authenticated. Attempting anonymous authentication...');
    console.log('   Note: You need admin privileges for this to work.');
    console.log('   If this fails, you can call the function from Firebase Console instead.');
  }
  
  console.log('\n📞 Calling Cloud Function...\n');

  try {
    const callable = httpsCallable(functions, 'runProjectNumberMigration');
    const result = await callable({ dryRun, tenantId });
    
    const data = result.data as any;
    
    console.log('\n✅ Migration completed successfully!\n');
    console.log('📊 Summary:');
    console.log(`   Total projects: ${data.totalProjects}`);
    console.log(`   Already migrated: ${data.alreadyMigrated}`);
    console.log(`   To migrate: ${data.toMigrate}`);
    console.log(`   Errors: ${data.errors?.length || 0}`);
    
    if (data.relatedCollectionsUpdated) {
      console.log(`   Related collections updated:`);
      console.log(`      Documents: ${data.relatedCollectionsUpdated.documents || 0}`);
      console.log(`      Reports: ${data.relatedCollectionsUpdated.reports || 0}`);
      console.log(`      Tasks: ${data.relatedCollectionsUpdated.tasks || 0}`);
      console.log(`      Materials: ${data.relatedCollectionsUpdated.materials || 0}`);
      console.log(`      Aufmass: ${data.relatedCollectionsUpdated.aufmass || 0}`);
    }
    
    if (data.mappings && data.mappings.length > 0) {
      console.log(`\n📋 Sample mappings (first ${data.mappings.length}):`);
      for (const mapping of data.mappings) {
        console.log(`   ${mapping.oldProjectNumber} → ${mapping.newProjectNumber} (${mapping.projectId})`);
      }
    }
    
    if (data.errors && data.errors.length > 0) {
      console.log('\n❌ Errors:');
      for (const error of data.errors) {
        console.log(`   ${error.projectId}: ${error.error}`);
      }
    }
    
    if (dryRun) {
      console.log('\n💡 This was a DRY RUN. To apply, run with --apply flag');
      console.log('   Run: npm run migrate:projects:call:apply');
    } else {
      console.log('\n🎉 Migration applied successfully!');
    }
    
    return data;
  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
    if (error.details) {
      console.error('Details:', error.details);
    }
    
    if (error.code === 'unauthenticated' || error.code === 'functions/unauthenticated') {
      console.log('\n💡 Authentication required. Options:');
      console.log('   1. Run this from Firebase Console Functions tab');
      console.log('   2. Authenticate with admin credentials first');
      console.log('   3. Call from your web app while logged in as admin');
    }
    
    throw error;
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = !args.includes('--apply');
const tenantIdArg = args.find(arg => arg.startsWith('--tenantId='));
const tenantId = tenantIdArg ? tenantIdArg.split('=')[1] : undefined;

callMigration(dryRun, tenantId)
  .then(() => process.exit(0))
  .catch(() => process.exit(1));



