/**
 * Migration Script: Link Documents to Projects
 * 
 * This script ensures all existing documents have a projectId
 * Uses deterministic linking rules and creates internal projects as needed
 * 
 * Run: node scripts/migrate-documents-to-projects.js
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, updateDoc, doc: docRef, query, where } = require('firebase/firestore');
const { getFunctions, httpsCallable } = require('firebase/functions');
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
const functions = getFunctions(app, 'europe-west1');

async function migrateDocuments() {
  try {
    console.log('🚀 Starting Document-Project Migration\n');

    // Authenticate
    await signInWithEmailAndPassword(auth, 'david@3d-systems.com', 'L8174822');
    console.log('✅ Authenticated\n');

    // Step 1: Get all unique concernIds to ensure internal projects exist
    console.log('📋 Step 1: Ensuring internal projects exist for all orgs...\n');
    
    const ensureInternalProjects = httpsCallable(functions, 'ensureInternalProjectsForAllOrgs');
    const ensureResult = await ensureInternalProjects();
    console.log(`✅ Internal projects ensured for ${ensureResult.data.orgsProcessed} organizations\n`);

    // Step 2: Get all documents
    console.log('📄 Step 2: Finding documents without projectId...\n');
    
    const documentsSnapshot = await getDocs(collection(db, 'documents'));
    console.log(`Found ${documentsSnapshot.size} total documents\n`);

    const docsWithoutProject = [];
    const docsWithProject = [];

    documentsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (!data.projectId) {
        docsWithoutProject.push({ id: doc.id, data });
      } else {
        docsWithProject.push({ id: doc.id, data });
      }
    });

    console.log(`📊 Status:`);
    console.log(`   ✅ Documents with projectId: ${docsWithProject.length}`);
    console.log(`   ❌ Documents without projectId: ${docsWithoutProject.length}\n`);

    if (docsWithoutProject.length === 0) {
      console.log('✨ All documents already have projectId. Migration not needed!\n');
      process.exit(0);
      return;
    }

    // Step 3: Migrate documents without projectId
    console.log('🔄 Step 3: Assigning projects to documents...\n');

    let migrated = 0;
    let failed = 0;
    const results = [];

    for (const doc of docsWithoutProject) {
      try {
        const concernId = doc.data.orgId || doc.data.concernId;
        
        if (!concernId) {
          console.log(`⚠️  Skipping ${doc.id}: No orgId/concernId found`);
          failed++;
          continue;
        }

        // Determine project using simple heuristics
        const projectId = await assignProjectId(concernId, doc.data);
        
        if (!projectId) {
          console.log(`⚠️  Could not determine project for ${doc.id} (${doc.data.originalFilename})`);
          failed++;
          continue;
        }

        // Update document
        const documentRef = docRef(db, 'documents', doc.id);
        await updateDoc(documentRef, {
          projectId,
          concernId: concernId || doc.data.concernId,  // Normalize field
          orgId: concernId,  // Normalize field
          routeDecision: {
            ruleId: 'migration-script',
            reason: 'Assigned during document-project migration',
            timestamp: new Date().toISOString()
          }
        });

        migrated++;
        results.push({
          docId: doc.id,
          filename: doc.data.originalFilename,
          projectId,
          status: 'migrated'
        });

        if (migrated % 10 === 0) {
          console.log(`   Migrated: ${migrated}/${docsWithoutProject.length}`);
        }

      } catch (error) {
        console.error(`❌ Error migrating ${doc.id}:`, error.message);
        failed++;
        results.push({
          docId: doc.id,
          filename: doc.data.originalFilename,
          error: error.message,
          status: 'failed'
        });
      }
    }

    // Summary
    console.log('\n📊 Migration Summary:');
    console.log(`   ✅ Successfully migrated: ${migrated}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   📝 Total processed: ${docsWithoutProject.length}\n`);

    // Show project distribution
    const projectCounts = {};
    results.filter(r => r.status === 'migrated').forEach(r => {
      projectCounts[r.projectId] = (projectCounts[r.projectId] || 0) + 1;
    });

    console.log('📂 Documents by Project:');
    Object.entries(projectCounts).forEach(([projectId, count]) => {
      console.log(`   ${projectId}: ${count} documents`);
    });

    console.log('\n✅ Migration complete!\n');
    process.exit(0);

  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  }
}

/**
 * Simple deterministic project assignment
 * (Note: This is a simplified version for migration - production code uses the full linkProject module)
 */
async function assignProjectId(concernId, docData) {
  
  // Rule 1: Check if document type suggests internal project
  const typeToCategory = {
    'personnel.timesheet': 'personnel',
    'personnel.travel_log': 'personnel',
    'personnel.expense_claim': 'personnel',
    'client.invoice': 'finance',
    'material.delivery_note': 'finance',
    'material.requisition': 'finance',
    'compliance.certificate': 'compliance',
    'compliance.insurance': 'compliance',
    'compliance.training_record': 'training',
  };

  const category = typeToCategory[docData.type];
  if (category) {
    return `${concernId}-internal-${category}`;
  }

  // Rule 2: Check filename for project numbers
  const filename = docData.originalFilename || '';
  const projectNumberMatch = filename.match(/P-?(\d{3,6})|PR-?(\d{3,6})|Project[_\s-]?(\d{3,6})/i);
  
  if (projectNumberMatch) {
    const projectNumber = parseInt(projectNumberMatch[1] || projectNumberMatch[2] || projectNumberMatch[3], 10);
    
    // Try to find project by number
    const projectsQuery = query(
      collection(db, 'projects'),
      where('concernID', '==', concernId),
      where('projectNumber', '==', projectNumber)
    );
    
    const projectsSnapshot = await getDocs(projectsQuery);
    if (!projectsSnapshot.empty) {
      return projectsSnapshot.docs[0].id;
    }
  }

  // Rule 3: Default to admin internal project
  return `${concernId}-internal-admin`;
}

// Run migration
migrateDocuments();








