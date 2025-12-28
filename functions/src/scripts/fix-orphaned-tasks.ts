/**
 * Utility to find and fix orphaned tasks
 * Run with: npx ts-node tools/fix-orphaned-tasks.ts --dry-run
 * Or: npx ts-node tools/fix-orphaned-tasks.ts --fix
 */

import * as admin from 'firebase-admin';

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'reportingapp817'
  });
}

const db = admin.firestore();

interface OrphanedTask {
  taskId: string;
  taskTitle: string;
  projectId: string;
  concernId: string;
  createdAt: any;
  createdBy: string;
}

async function findOrphanedTasks(concernId?: string): Promise<OrphanedTask[]> {
  console.log('\n🔍 Scanning for orphaned tasks...\n');
  
  // Get all projects
  let projectsQuery = db.collection('projects');
  if (concernId) {
    projectsQuery = projectsQuery.where('concernID', '==', concernId) as any;
  }
  
  const projectsSnapshot = await projectsQuery.get();
  const projectIds = new Set(projectsSnapshot.docs.map(doc => doc.id));
  
  console.log(`✅ Found ${projectIds.size} valid projects`);
  
  // Get all tasks
  let tasksQuery = db.collection('tasks');
  if (concernId) {
    tasksQuery = tasksQuery.where('concernID', '==', concernId) as any;
  }
  
  const tasksSnapshot = await tasksQuery.get();
  console.log(`📋 Found ${tasksSnapshot.size} total tasks`);
  
  // Find orphaned tasks
  const orphaned: OrphanedTask[] = [];
  
  for (const taskDoc of tasksSnapshot.docs) {
    const task = taskDoc.data();
    const projectId = task.projectId;
    
    if (!projectId) {
      console.log(`⚠️  Task ${taskDoc.id} has no projectId`);
      continue;
    }
    
    if (!projectIds.has(projectId)) {
      orphaned.push({
        taskId: taskDoc.id,
        taskTitle: task.title || 'Untitled',
        projectId: projectId,
        concernId: task.concernID,
        createdAt: task.createdAt,
        createdBy: task.createdBy
      });
    }
  }
  
  return orphaned;
}

async function analyzeOrphanedTasks(orphaned: OrphanedTask[]) {
  console.log(`\n❌ Found ${orphaned.length} orphaned tasks:\n`);
  
  for (const task of orphaned) {
    console.log(`📌 Task: "${task.taskTitle}"`);
    console.log(`   ID: ${task.taskId}`);
    console.log(`   Missing Project ID: ${task.projectId}`);
    console.log(`   Concern: ${task.concernId}`);
    console.log(`   Created: ${task.createdAt?.toDate?.() || 'Unknown'}`);
    
    // Check if project exists in ANY concern
    const projectDoc = await db.collection('projects').doc(task.projectId).get();
    
    if (projectDoc.exists) {
      const projectData = projectDoc.data();
      console.log(`   ⚠️  Project EXISTS but in different concern: ${projectData?.concernID}`);
      console.log(`   Project Name: ${projectData?.projectName || projectData?.projectTitle}`);
    } else {
      console.log(`   ❌ Project completely deleted from Firestore`);
    }
    console.log('');
  }
}

async function fixOrphanedTasks(orphaned: OrphanedTask[], dryRun: boolean) {
  console.log(`\n🔧 ${dryRun ? 'DRY RUN - Would fix' : 'Fixing'} ${orphaned.length} orphaned tasks...\n`);
  
  const batch = db.batch();
  let batchCount = 0;
  
  for (const task of orphaned) {
    const taskRef = db.collection('tasks').doc(task.taskId);
    
    // Option: Delete the task
    console.log(`${dryRun ? '📝 Would delete' : '🗑️  Deleting'} task: "${task.taskTitle}"`);
    
    if (!dryRun) {
      batch.delete(taskRef);
      batchCount++;
      
      // Commit in batches of 500
      if (batchCount >= 500) {
        await batch.commit();
        console.log(`✅ Committed batch of ${batchCount} deletions`);
        batchCount = 0;
      }
    }
  }
  
  // Commit remaining
  if (!dryRun && batchCount > 0) {
    await batch.commit();
    console.log(`✅ Committed final batch of ${batchCount} deletions`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = !args.includes('--fix');
  const concernIdArg = args.find(arg => arg.startsWith('--concernId='));
  const concernId = concernIdArg ? concernIdArg.split('=')[1] : undefined;
  
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║           ORPHANED TASKS FINDER & FIXER                      ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log(`\nMode: ${dryRun ? '🏃 DRY RUN (analysis only)' : '💾 FIX MODE (will delete)'}`);
  if (concernId) {
    console.log(`Concern: ${concernId}`);
  }
  
  try {
    // Find orphaned tasks
    const orphaned = await findOrphanedTasks(concernId);
    
    if (orphaned.length === 0) {
      console.log('\n✅ No orphaned tasks found! All tasks have valid projects.\n');
      process.exit(0);
    }
    
    // Analyze them
    await analyzeOrphanedTasks(orphaned);
    
    // Show summary
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`\n📊 SUMMARY:`);
    console.log(`   Total orphaned tasks: ${orphaned.length}`);
    console.log(`   Recommended action: DELETE (projects no longer exist)`);
    console.log('');
    
    if (dryRun) {
      console.log('💡 This was a DRY RUN. To delete these tasks, run:');
      console.log('   npm run fix:orphaned-tasks');
      console.log('');
    } else {
      // Confirm before deletion
      console.log('⚠️  WARNING: This will DELETE all orphaned tasks!');
      console.log('   Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
      
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      await fixOrphanedTasks(orphaned, dryRun);
      
      console.log('\n✅ Orphaned tasks have been deleted.');
    }
    
    console.log('\n═══════════════════════════════════════════════════════════════\n');
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

main();
