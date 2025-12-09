/**
 * Simple Migration Script: Link Documents to Projects
 * Direct Firestore approach without Cloud Functions
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, updateDoc, doc: docRef, query, where, setDoc, serverTimestamp } = require('firebase/firestore');
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

// Internal project definitions
const INTERNAL_PROJECTS = [
  { id: 'internal-personnel', name: 'Personal & HR', category: 'personnel' },
  { id: 'internal-finance', name: 'Finanzen & Buchhaltung', category: 'finance' },
  { id: 'internal-admin', name: 'Administration', category: 'admin' },
  { id: 'internal-compliance', name: 'Compliance & Qualität', category: 'compliance' },
  { id: 'internal-training', name: 'Schulung & Weiterbildung', category: 'training' },
  { id: 'internal-it', name: 'IT & Systeme', category: 'it' }
];

async function migrateDocuments() {
  try {
    console.log('🚀 Starting Document-Project Migration (Direct Mode)\n');

    // Authenticate
    await signInWithEmailAndPassword(auth, 'david@3d-systems.com', 'L8174822');
    console.log('✅ Authenticated\n');

    // Step 1: Get all unique concernIds
    console.log('📋 Step 1: Finding all organizations...\n');
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const concernIds = new Set();

    usersSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const concernID = data.concernID || data.ConcernID;
      if (concernID) {
        concernIds.add(concernID);
      }
    });

    console.log(`Found ${concernIds.size} organizations\n`);

    // Step 2: Create internal projects for each org
    console.log('🏢 Step 2: Creating internal projects...\n');
    let projectsCreated = 0;
    let projectsExisting = 0;

    for (const concernId of concernIds) {
      for (const project of INTERNAL_PROJECTS) {
        const projectId = `${concernId}-${project.id}`;
        const projectDocRef = docRef(db, 'projects', projectId);
        
        try {
          const projectDoc = await getDocs(query(collection(db, 'projects'), where('__name__', '==', projectId)));
          
          if (projectDoc.empty) {
            // Create internal project
            await setDoc(projectDocRef, {
              concernID: concernId,
              projectName: project.name,
              projectNumber: 0,
              projectAddendum: 0,
              projectDes: `Internal ${project.category} container`,
              projectStatus: 'active',
              projectCategory: 999,
              projectCustomer: 'Internal',
              projectAddr: '',
              projectContact: '',
              projectCity: '',
              postCode: '',
              projectTel: '',
              projectEmail: '',
              mitarbeiterID: '',
              priority: 'normal',
              projectElementLoaded: false,
              projectAufmassGen: false,
              dateCreated: serverTimestamp(),
              lastModified: serverTimestamp(),
              type: 'internal',
              internalCategory: project.category,
              active: true,
              isSystemProject: true
            });
            
            projectsCreated++;
            console.log(`   Created: ${project.name} for ${concernId}`);
          } else {
            projectsExisting++;
          }
        } catch (error) {
          console.error(`   Error creating ${project.name} for ${concernId}:`, error.message);
        }
      }
    }

    console.log(`\n✅ Projects: Created ${projectsCreated}, Already existed ${projectsExisting}\n`);

    // Step 3: Migrate documents
    console.log('📄 Step 3: Migrating documents...\n');
    
    const documentsSnapshot = await getDocs(collection(db, 'documents'));
    console.log(`Found ${documentsSnapshot.size} total documents\n`);

    let migrated = 0;
    let skipped = 0;
    let failed = 0;

    for (const docSnapshot of documentsSnapshot.docs) {
      const docData = docSnapshot.data();
      
      // Skip if already has projectId
      if (docData.projectId) {
        skipped++;
        continue;
      }

      const concernId = docData.orgId || docData.concernId;
      if (!concernId) {
        console.log(`⚠️  No concernId for ${docSnapshot.id}`);
        failed++;
        continue;
      }

      // Determine project
      let projectId = null;

      // Rule 1: Type-based routing
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
        projectId = `${concernId}-internal-${category}`;
      }

      // Rule 2: Filename patterns
      if (!projectId && docData.originalFilename) {
        const match = docData.originalFilename.match(/P-?(\d{3,6})|PR-?(\d{3,6})/i);
        if (match) {
          const projectNumber = parseInt(match[1] || match[2], 10);
          const projectsQuery = query(
            collection(db, 'projects'),
            where('concernID', '==', concernId),
            where('projectNumber', '==', projectNumber)
          );
          const projectsSnapshot = await getDocs(projectsQuery);
          if (!projectsSnapshot.empty) {
            projectId = projectsSnapshot.docs[0].id;
          }
        }
      }

      // Default: admin project
      if (!projectId) {
        projectId = `${concernId}-internal-admin`;
      }

      // Update document
      try {
        await updateDoc(docRef(db, 'documents', docSnapshot.id), {
          projectId,
          orgId: concernId,
          concernId: concernId,
          routeDecision: {
            ruleId: 'migration-script',
            reason: 'Assigned during migration',
            timestamp: new Date().toISOString()
          }
        });
        migrated++;
        
        if (migrated % 10 === 0) {
          console.log(`   Migrated: ${migrated}/${documentsSnapshot.size - skipped}`);
        }
      } catch (error) {
        console.error(`❌ Error migrating ${docSnapshot.id}:`, error.message);
        failed++;
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`   ✅ Successfully migrated: ${migrated}`);
    console.log(`   ⏭️  Already had projectId: ${skipped}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   📝 Total processed: ${documentsSnapshot.size}\n`);

    console.log('✅ Migration complete!\n');
    process.exit(0);

  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  }
}

// Run migration
migrateDocuments();








