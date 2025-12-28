# 🎯 Quick Fix for TaskBoard - Run from Browser Console

The maintenance functions are deployed as Cloud Functions. You can call them directly from your browser console to fix the issues immediately.

---

## 🚀 **Step 1: Analyze Orphaned Tasks**

Open your browser console (F12) and run:

```javascript
// Analyze orphaned tasks
const analyzeOrphaned = firebase.functions('europe-west1').httpsCallable('analyzeOrphanedTasks');
analyzeOrphaned({}).then(result => {
  console.log('📊 Orphaned Tasks Analysis:');
  console.log(`Total Projects: ${result.data.totalProjects}`);
  console.log(`Total Tasks: ${result.data.totalTasks}`);
  console.log(`Orphaned Tasks: ${result.data.orphanedTasks.length}`);
  console.table(result.data.orphanedTasks);
  
  // Save for next step
  window.orphanedTaskIds = result.data.orphanedTasks.map(t => t.taskId);
  console.log('✅ Task IDs saved to window.orphanedTaskIds');
});
```

---

## 🗑️ **Step 2: Delete Orphaned Tasks**

After reviewing the orphaned tasks, delete them:

```javascript
// Delete orphaned tasks
const deleteOrphaned = firebase.functions('europe-west1').httpsCallable('deleteOrphanedTasks');
deleteOrphaned({ taskIds: window.orphanedTaskIds }).then(result => {
  console.log('✅ Deleted', result.data.deletedCount, 'orphaned tasks');
});
```

---

## 📋 **Step 3: Analyze Internal Projects**

Check which internal projects need migration:

```javascript
// Analyze internal projects
const analyzeInternal = firebase.functions('europe-west1').httpsCallable('analyzeInternalProjects');
analyzeInternal({}).then(result => {
  console.log('📊 Internal Projects Analysis:');
  console.log(`Total Projects: ${result.data.totalProjects}`);
  console.log(`Need Migration: ${result.data.internalProjects.length}`);
  console.table(result.data.internalProjects);
  
  // Save for next step
  window.internalProjectMappings = result.data.internalProjects;
  console.log('✅ Mappings saved to window.internalProjectMappings');
});
```

---

## 🔧 **Step 4: Migrate Internal Projects**

After reviewing, migrate them:

```javascript
// Migrate internal projects
const migrateInternal = firebase.functions('europe-west1').httpsCallable('migrateInternalProjects');
migrateInternal({ mappings: window.internalProjectMappings }).then(result => {
  console.log('✅ Migration Complete!');
  console.log(`Projects Migrated: ${result.data.projectsMigrated}`);
  console.log(`Tasks Updated: ${result.data.tasksUpdated}`);
  console.log(`Documents Updated: ${result.data.documentsUpdated}`);
});
```

---

## 📊 **All-in-One Script**

Or run everything in sequence:

```javascript
// Complete fix in one go
(async function() {
  const functions = firebase.functions('europe-west1');
  
  console.log('🔍 Step 1: Analyzing orphaned tasks...');
  const analyzeOrphaned = functions.httpsCallable('analyzeOrphanedTasks');
  const orphanedResult = await analyzeOrphaned({});
  console.log(`Found ${orphanedResult.data.orphanedTasks.length} orphaned tasks`);
  console.table(orphanedResult.data.orphanedTasks);
  
  if (orphanedResult.data.orphanedTasks.length > 0) {
    console.log('🗑️ Step 2: Deleting orphaned tasks...');
    const deleteOrphaned = functions.httpsCallable('deleteOrphanedTasks');
    const taskIds = orphanedResult.data.orphanedTasks.map(t => t.taskId);
    const deleteResult = await deleteOrphaned({ taskIds });
    console.log(`✅ Deleted ${deleteResult.data.deletedCount} orphaned tasks`);
  }
  
  console.log('📋 Step 3: Analyzing internal projects...');
  const analyzeInternal = functions.httpsCallable('analyzeInternalProjects');
  const internalResult = await analyzeInternal({});
  console.log(`Found ${internalResult.data.internalProjects.length} internal projects to migrate`);
  console.table(internalResult.data.internalProjects);
  
  if (internalResult.data.internalProjects.length > 0) {
    console.log('🔧 Step 4: Migrating internal projects...');
    const migrateInternal = functions.httpsCallable('migrateInternalProjects');
    const migrateResult = await migrateInternal({ mappings: internalResult.data.internalProjects });
    console.log(`✅ Migrated ${migrateResult.data.projectsMigrated} projects`);
    console.log(`  - Tasks updated: ${migrateResult.data.tasksUpdated}`);
    console.log(`  - Documents updated: ${migrateResult.data.documentsUpdated}`);
  }
  
  console.log('\n🎉 All fixes complete! Refresh your Kanban board.');
})();
```

---

## ✅ **Expected Results**

After running the all-in-one script, you should see:

```
🔍 Step 1: Analyzing orphaned tasks...
Found 3 orphaned tasks
┌─────┬──────────────────┬────────────────────┬─────────────────┐
│ idx │ taskTitle        │ projectId          │ projectExists   │
├─────┼──────────────────┼────────────────────┼─────────────────┤
│  0  │ MIttagessen...   │ 1Grou39Rjm154i5... │ false           │
└─────┴──────────────────┴────────────────────┴─────────────────┘

🗑️ Step 2: Deleting orphaned tasks...
✅ Deleted 3 orphaned tasks

📋 Step 3: Analyzing internal projects...
Found 9 internal projects to migrate
┌─────┬──────────────────┬─────────────────┬─────────────────┐
│ idx │ oldProjectNumber │ newProjectNumber│ projectName     │
├─────┼──────────────────┼─────────────────┼─────────────────┤
│  0  │ DE689E0F2D-ADM   │ PN-0AA012       │ Admin Project   │
│  1  │ DE689E0F2D-FBU   │ PN-0AA013       │ Finance         │
└─────┴──────────────────┴─────────────────┴─────────────────┘

🔧 Step 4: Migrating internal projects...
✅ Migrated 9 projects
  - Tasks updated: 12
  - Documents updated: 5

🎉 All fixes complete! Refresh your Kanban board.
```

---

## 🎯 **Then Refresh Kanban**

After the script completes:
1. Hard refresh browser (Ctrl+Shift+R)
2. Go to Kanban board
3. All tasks should now show correct `PN-??????` format!

---

**Copy the "All-in-One Script" above, paste it in your browser console, and run it!** 🚀



