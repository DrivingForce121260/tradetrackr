/**
 * Cloud Functions for fixing orphaned tasks and migrating internal projects
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const YEAR_BASE = 2025;

// Helper functions for project number generation
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

/**
 * Find and analyze orphaned tasks
 */
export const analyzeOrphanedTasks = functions
  .region('europe-west1')
  .runWith({ timeoutSeconds: 300, memory: '1GB' })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
    }

    const db = admin.firestore();
    const { concernId } = data;

    try {
      functions.logger.info('Analyzing orphaned tasks', { concernId });

      // Get all projects
      let projectsQuery = db.collection('projects');
      if (concernId) {
        projectsQuery = projectsQuery.where('concernID', '==', concernId) as any;
      }

      const projectsSnapshot = await projectsQuery.get();
      const projectIds = new Set(projectsSnapshot.docs.map(doc => doc.id));

      functions.logger.info(`Found ${projectIds.size} valid projects`);

      // Get all tasks
      let tasksQuery = db.collection('tasks');
      if (concernId) {
        tasksQuery = tasksQuery.where('concernID', '==', concernId) as any;
      }

      const tasksSnapshot = await tasksQuery.get();
      functions.logger.info(`Found ${tasksSnapshot.size} total tasks`);

      // Find orphaned tasks
      const orphaned: any[] = [];

      for (const taskDoc of tasksSnapshot.docs) {
        const task = taskDoc.data();
        const projectId = task.projectId;

        if (!projectId) continue;

        if (!projectIds.has(projectId)) {
          // Check if project exists in ANY concern
          const projectDoc = await db.collection('projects').doc(projectId).get();

          orphaned.push({
            taskId: taskDoc.id,
            taskTitle: task.title || 'Untitled',
            projectId: projectId,
            concernId: task.concernID,
            createdAt: task.createdAt,
            projectExists: projectDoc.exists,
            projectConcern: projectDoc.exists ? projectDoc.data()?.concernID : null
          });
        }
      }

      return {
        success: true,
        totalProjects: projectIds.size,
        totalTasks: tasksSnapshot.size,
        orphanedTasks: orphaned
      };
    } catch (error: any) {
      functions.logger.error('Failed to analyze orphaned tasks', error);
      throw new functions.https.HttpsError('internal', error.message);
    }
  });

/**
 * Delete orphaned tasks
 */
export const deleteOrphanedTasks = functions
  .region('europe-west1')
  .runWith({ timeoutSeconds: 540, memory: '1GB' })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
    }

    // Check admin permission
    const db = admin.firestore();
    let isAdmin = false;

    if (context.auth.token.role === 'admin') {
      isAdmin = true;
    } else {
      const userDoc = await db.collection('users').doc(context.auth.uid).get();
      if (userDoc.exists && userDoc.data()?.role === 'admin') {
        isAdmin = true;
      }
    }

    if (!isAdmin) {
      throw new functions.https.HttpsError('permission-denied', 'Only admins can delete orphaned tasks');
    }

    const { taskIds } = data;

    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
      throw new functions.https.HttpsError('invalid-argument', 'taskIds array is required');
    }

    try {
      functions.logger.info(`Deleting ${taskIds.length} orphaned tasks`);

      const batch = db.batch();
      let count = 0;

      for (const taskId of taskIds) {
        const taskRef = db.collection('tasks').doc(taskId);
        batch.delete(taskRef);
        count++;

        if (count >= 500) {
          await batch.commit();
          functions.logger.info(`Committed batch of ${count} deletions`);
          count = 0;
        }
      }

      if (count > 0) {
        await batch.commit();
        functions.logger.info(`Committed final batch of ${count} deletions`);
      }

      return {
        success: true,
        deletedCount: taskIds.length
      };
    } catch (error: any) {
      functions.logger.error('Failed to delete orphaned tasks', error);
      throw new functions.https.HttpsError('internal', error.message);
    }
  });

/**
 * Analyze internal projects that need migration
 */
export const analyzeInternalProjects = functions
  .region('europe-west1')
  .runWith({ timeoutSeconds: 300, memory: '1GB' })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
    }

    const db = admin.firestore();
    const { concernId } = data;

    try {
      functions.logger.info('Analyzing internal projects', { concernId });

      let projectsQuery = db.collection('projects');
      if (concernId) {
        projectsQuery = projectsQuery.where('concernID', '==', concernId) as any;
      }

      const projectsSnapshot = await projectsQuery.get();
      const internalProjects: any[] = [];

      // First pass: find all projects with old format (not PN-??????)
      const projectsToMigrate: any[] = [];
      
      for (const doc of projectsSnapshot.docs) {
        const projectData = doc.data();
        const pn = projectData.projectNumber;

        // Find projects with old format (not PN-?????? format)
        if (typeof pn === 'string' && !pn.startsWith('PN-')) {
          projectsToMigrate.push({
            doc,
            data: projectData
          });
        }
      }

      // Second pass: count existing PN- projects per date/concern to get counter
      const counterMap = new Map<string, number>();
      
      for (const doc of projectsSnapshot.docs) {
        const projectData = doc.data();
        const pn = projectData.projectNumber;
        
        // Count existing PN- projects per date prefix
        if (typeof pn === 'string' && pn.startsWith('PN-') && pn.length >= 8) {
          const dateKey = pn.substring(3, 7); // e.g., "0AA0" from "PN-0AA012"
          const concernKey = `${projectData.concernID}_${dateKey}`;
          const currentCount = counterMap.get(concernKey) || 0;
          counterMap.set(concernKey, currentCount + 1);
        }
      }

      // Now assign new project numbers
      for (const { doc, data: projectData } of projectsToMigrate) {
        const createdAt = projectData.createdAt?.toDate?.() || new Date();
        const dateKey = buildDateKey(createdAt);
        const concernKey = `${projectData.concernID}_${dateKey}`;
        
        // Get current counter for this date/concern
        const counter = counterMap.get(concernKey) || 0;
        const newProjectNumber = buildProjectNumber(dateKey, counter);
        
        // Increment counter for next project
        counterMap.set(concernKey, counter + 1);

        internalProjects.push({
          projectId: doc.id,
          oldProjectNumber: projectData.projectNumber,
          newProjectNumber,
          projectName: projectData.projectName || projectData.projectTitle || projectData.name,
          concernID: projectData.concernID
        });
      }

      return {
        success: true,
        totalProjects: projectsSnapshot.size,
        internalProjects
      };
    } catch (error: any) {
      functions.logger.error('Failed to analyze internal projects', error);
      throw new functions.https.HttpsError('internal', error.message);
    }
  });

/**
 * Migrate internal projects
 */
export const migrateInternalProjects = functions
  .region('europe-west1')
  .runWith({ timeoutSeconds: 540, memory: '2GB' })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
    }

    // Check admin permission
    const db = admin.firestore();
    let isAdmin = false;

    if (context.auth.token.role === 'admin') {
      isAdmin = true;
    } else {
      const userDoc = await db.collection('users').doc(context.auth.uid).get();
      if (userDoc.exists && userDoc.data()?.role === 'admin') {
        isAdmin = true;
      }
    }

    if (!isAdmin) {
      throw new functions.https.HttpsError('permission-denied', 'Only admins can migrate projects');
    }

    const { mappings } = data;

    if (!mappings || !Array.isArray(mappings) || mappings.length === 0) {
      throw new functions.https.HttpsError('invalid-argument', 'mappings array is required');
    }

    try {
      functions.logger.info(`Migrating ${mappings.length} internal projects`);

      const now = admin.firestore.Timestamp.now();
      const batch = db.batch();
      let batchCount = 0;

      // Update projects
      for (const mapping of mappings) {
        const projectRef = db.collection('projects').doc(mapping.projectId);

        batch.update(projectRef, {
          projectNumber: mapping.newProjectNumber,
          previousProjectNumber: mapping.oldProjectNumber,
          projectNumberMigratedAt: now,
          projectNumberMigrationVersion: 1
        });

        batchCount++;

        if (batchCount >= 500) {
          await batch.commit();
          functions.logger.info(`Committed batch of ${batchCount} project updates`);
          batchCount = 0;
        }
      }

      if (batchCount > 0) {
        await batch.commit();
        functions.logger.info(`Committed final batch of ${batchCount} project updates`);
      }

      // Update related collections
      let tasksUpdated = 0;
      let docsUpdated = 0;

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
          tasksUpdated += tasksSnapshot.size;
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
          docsUpdated += docsSnapshot.size;
        }
      }

      return {
        success: true,
        projectsMigrated: mappings.length,
        tasksUpdated,
        documentsUpdated: docsUpdated
      };
    } catch (error: any) {
      functions.logger.error('Failed to migrate internal projects', error);
      throw new functions.https.HttpsError('internal', error.message);
    }
  });



