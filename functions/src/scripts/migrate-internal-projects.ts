/**
 * Script to migrate internal projects (DE689E0F2D-*) to new PN- format
 * Run with: npx ts-node tools/migrate-internal-projects.ts --dry-run
 * Or: npx ts-node tools/migrate-internal-projects.ts --apply
 */

import * as admin from 'firebase-admin';

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'reportingapp817'
  });
}

const db = admin.firestore();

const YEAR_BASE = 2025;

function toHexDigit(n: number): string {
  if (n < 0 || n > 15) throw new Error(`Number must be 0-15, got ${n}`);
  return n.toString(16).toUpperCase();
}

function yearHex(year: number): string {
  const offset = year - YEAR_BASE;
  if (offset < 0 || offset > 15) throw new Error(`Year must be ${YEAR_BASE}-${YEAR_BASE + 15}, got ${year}`);
  return toHexDigit(offset);
}

function monthHex(month1to12: number): string {
  if (month1to12 < 1 || month1to12 > 12) throw new Error(`Month must be 1-12, got ${month1to12}`);
  return toHexDigit(month1to12);
}

function dayHexWrapped(day1to31: number): string {
  if (day1to31 < 1 || day1to31 > 31) throw new Error(`Day must be 1-31, got ${day1to31}`);
  if (day1to31 <= 15) {
    return toHexDigit(day1to31);
  } else {
    const wrapped = day1to31 - 16;
    return toHexDigit(wrapped);
  }
}

function halfOfMonthDigit(day: number): '0' | '1' {
  if (day < 1 || day > 31) throw new Error(`Day must be 1-31, got ${day}`);
  return day <= 15 ? '0' : '1';
}

function buildDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const y = yearHex(year);
  const h1 = monthHex(month);
  const h2 = dayHexWrapped(day);
  const h3 = halfOfMonthDigit(day);
  return `${y}${h1}${h2}${h3}`;
}

function formatCounter(counter: number): string {
  if (counter < 0 || counter > 99) throw new Error(`Counter must be 0-99, got ${counter}`);
  return counter.toString().padStart(2, '0');
}

function buildProjectNumber(dateKey: string, counter: number): string {
  return `PN-${dateKey}${formatCounter(counter)}`;
}

interface InternalProject {
  id: string;
  projectNumber: string;
  projectName?: string;
  concernID: string;
  createdAt: any;
}

async function findInternalProjects(concernId?: string): Promise<InternalProject[]> {
  console.log('\n🔍 Scanning for internal projects with old format...\n');
  
  let projectsQuery = db.collection('projects');
  if (concernId) {
    projectsQuery = projectsQuery.where('concernID', '==', concernId) as any;
  }
  
  const projectsSnapshot = await projectsQuery.get();
  const internalProjects: InternalProject[] = [];
  
  for (const doc of projectsSnapshot.docs) {
    const data = doc.data();
    const pn = data.projectNumber;
    
    // Find projects with old format (not PN-?????? format)
    if (typeof pn === 'string' && !pn.startsWith('PN-')) {
      internalProjects.push({
        id: doc.id,
        projectNumber: pn,
        projectName: data.projectName || data.projectTitle || data.name,
        concernID: data.concernID,
        createdAt: data.createdAt || data.dateCreated
      });
    }
  }
  
  return internalProjects;
}

async function migrateInternalProjects(projects: InternalProject[], dryRun: boolean) {
  console.log(`\n📋 Found ${projects.length} internal projects to migrate:\n`);
  
  // Group by concern and date for counter allocation
  const grouped = new Map<string, InternalProject[]>();
  
  for (const project of projects) {
    const date = project.createdAt?.toDate?.() || new Date();
    const dateKey = buildDateKey(date);
    const groupKey = `${project.concernID}_${dateKey}`;
    
    if (!grouped.has(groupKey)) {
      grouped.set(groupKey, []);
    }
    grouped.get(groupKey)!.push(project);
  }
  
  // Allocate new project numbers
  const mappings: Array<{
    projectId: string;
    oldProjectNumber: string;
    newProjectNumber: string;
    projectName?: string;
  }> = [];
  
  for (const [groupKey, groupProjects] of Array.from(grouped.entries())) {
    const [concernId, dateKey] = groupKey.split('_');
    
    // Check how many projects already exist for this date/concern
    const existingQuery = await db.collection('projects')
      .where('concernID', '==', concernId)
      .where('projectNumber', '>=', `PN-${dateKey}00`)
      .where('projectNumber', '<=', `PN-${dateKey}99`)
      .get();
    
    let counter = existingQuery.size;
    
    for (const project of groupProjects) {
      const newProjectNumber = buildProjectNumber(dateKey, counter);
      
      mappings.push({
        projectId: project.id,
        oldProjectNumber: project.projectNumber,
        newProjectNumber,
        projectName: project.projectName
      });
      
      console.log(`${dryRun ? '📝' : '✅'} ${project.projectNumber} → ${newProjectNumber} (${project.projectName || project.id})`);
      
      counter++;
    }
  }
  
  if (dryRun) {
    console.log(`\n💡 This was a DRY RUN. ${mappings.length} projects would be updated.`);
    console.log('   Run with --apply to perform the migration.');
    return;
  }
  
  // Apply migration
  console.log(`\n🔧 Applying migration to ${mappings.length} projects...\n`);
  
  const batch = db.batch();
  let batchCount = 0;
  
  for (const mapping of mappings) {
    const projectRef = db.collection('projects').doc(mapping.projectId);
    
    batch.update(projectRef, {
      projectNumber: mapping.newProjectNumber,
      previousProjectNumber: mapping.oldProjectNumber,
      projectNumberMigratedAt: admin.firestore.Timestamp.now(),
      projectNumberMigrationVersion: 1
    });
    
    batchCount++;
    
    if (batchCount >= 500) {
      await batch.commit();
      console.log(`✅ Committed batch of ${batchCount} updates`);
      batchCount = 0;
    }
  }
  
  if (batchCount > 0) {
    await batch.commit();
    console.log(`✅ Committed final batch of ${batchCount} updates`);
  }
  
  // Also update related collections (tasks, documents, etc.)
  console.log(`\n🔧 Updating related collections...\n`);
  
  for (const mapping of mappings) {
    // Update tasks
    const tasksSnapshot = await db.collection('tasks')
      .where('projectId', '==', mapping.projectId)
      .get();
    
    if (!tasksSnapshot.empty) {
      const taskBatch = db.batch();
      tasksSnapshot.docs.forEach(doc => {
        taskBatch.update(doc.ref, { projectNumber: mapping.newProjectNumber });
      });
      await taskBatch.commit();
      console.log(`  ✅ Updated ${tasksSnapshot.size} tasks for project ${mapping.newProjectNumber}`);
    }
    
    // Update documents
    const docsSnapshot = await db.collection('documents')
      .where('projectId', '==', mapping.projectId)
      .get();
    
    if (!docsSnapshot.empty) {
      const docBatch = db.batch();
      docsSnapshot.docs.forEach(doc => {
        docBatch.update(doc.ref, { projectNumber: mapping.newProjectNumber });
      });
      await docBatch.commit();
      console.log(`  ✅ Updated ${docsSnapshot.size} documents for project ${mapping.newProjectNumber}`);
    }
  }
  
  console.log(`\n✅ Migration complete! ${mappings.length} projects updated.`);
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = !args.includes('--apply');
  const concernIdArg = args.find(arg => arg.startsWith('--concernId='));
  const concernId = concernIdArg ? concernIdArg.split('=')[1] : undefined;
  
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║        INTERNAL PROJECTS MIGRATION TO PN- FORMAT            ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log(`\nMode: ${dryRun ? '🏃 DRY RUN' : '💾 APPLY'}`);
  if (concernId) {
    console.log(`Concern: ${concernId}`);
  }
  
  try {
    const projects = await findInternalProjects(concernId);
    
    if (projects.length === 0) {
      console.log('\n✅ No internal projects found with old format. All are already migrated!\n');
      process.exit(0);
    }
    
    await migrateInternalProjects(projects, dryRun);
    
    console.log('\n═══════════════════════════════════════════════════════════════\n');
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

main();
