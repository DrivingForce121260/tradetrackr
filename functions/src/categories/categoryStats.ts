/**
 * Cloud Functions: Category Statistics Aggregation
 * 
 * Incrementally maintains categoryStats collection by listening to
 * document, task, and report changes.
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

/**
 * Get or create categoryStats document
 */
async function getOrCreateCategoryStats(
  orgId: string,
  categoryId: string | null,
  categoryPath: string[] = [],
  categoryDepth: number = 0,
  categoryActive: boolean = true
): Promise<admin.firestore.DocumentReference> {
  if (!categoryId) {
    // No category - skip stats
    throw new Error('CategoryId is required for stats');
  }

  const statsId = `${orgId}_${categoryId}`;
  const statsRef = db.collection('categoryStats').doc(statsId);
  const statsDoc = await statsRef.get();

  if (!statsDoc.exists) {
    // Create new stats document
    await statsRef.set({
      orgId,
      categoryId,
      path: categoryPath,
      depth: categoryDepth,
      totalDocuments: 0,
      totalTasks: 0,
      totalReports: 0,
      lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
      categoryActive
    });
  } else {
    // Update denormalized fields if category changed
    const currentData = statsDoc.data()!;
    if (JSON.stringify(currentData.path) !== JSON.stringify(categoryPath) ||
        currentData.depth !== categoryDepth ||
        currentData.categoryActive !== categoryActive) {
      await statsRef.update({
        path: categoryPath,
        depth: categoryDepth,
        categoryActive,
        lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
  }

  return statsRef;
}

/**
 * Get category info for stats
 */
async function getCategoryInfo(categoryId: string): Promise<{
  path: string[];
  depth: number;
  active: boolean;
} | null> {
  try {
    const categoryDoc = await db.collection('categories').doc(categoryId).get();
    if (!categoryDoc.exists) {
      return null;
    }

    const data = categoryDoc.data()!;
    return {
      path: data.path || [],
      depth: data.depth || 0,
      active: data.active !== false
    };
  } catch (error) {
    console.error('[categoryStats] Failed to get category info:', error);
    return null;
  }
}

/**
 * Update category stats for a document change
 */
async function updateDocumentStats(
  beforeCategoryId: string | null | undefined,
  afterCategoryId: string | null | undefined,
  orgId: string
): Promise<void> {
  const batch = db.batch();

  // Decrement old category
  if (beforeCategoryId) {
    try {
      const categoryInfo = await getCategoryInfo(beforeCategoryId);
      if (categoryInfo) {
        const statsRef = await getOrCreateCategoryStats(
          orgId,
          beforeCategoryId,
          categoryInfo.path,
          categoryInfo.depth,
          categoryInfo.active
        );
        batch.update(statsRef, {
          totalDocuments: admin.firestore.FieldValue.increment(-1),
          lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    } catch (error) {
      console.error('[categoryStats] Failed to decrement document stats:', error);
    }
  }

  // Increment new category
  if (afterCategoryId) {
    try {
      const categoryInfo = await getCategoryInfo(afterCategoryId);
      if (categoryInfo) {
        const statsRef = await getOrCreateCategoryStats(
          orgId,
          afterCategoryId,
          categoryInfo.path,
          categoryInfo.depth,
          categoryInfo.active
        );
        batch.update(statsRef, {
          totalDocuments: admin.firestore.FieldValue.increment(1),
          lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    } catch (error) {
      console.error('[categoryStats] Failed to increment document stats:', error);
    }
  }

  if (beforeCategoryId || afterCategoryId) {
    await batch.commit();
  }
}

/**
 * Update category stats for a task change
 */
async function updateTaskStats(
  beforeCategoryId: string | null | undefined,
  afterCategoryId: string | null | undefined,
  orgId: string
): Promise<void> {
  const batch = db.batch();

  // Decrement old category
  if (beforeCategoryId) {
    try {
      const categoryInfo = await getCategoryInfo(beforeCategoryId);
      if (categoryInfo) {
        const statsRef = await getOrCreateCategoryStats(
          orgId,
          beforeCategoryId,
          categoryInfo.path,
          categoryInfo.depth,
          categoryInfo.active
        );
        batch.update(statsRef, {
          totalTasks: admin.firestore.FieldValue.increment(-1),
          lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    } catch (error) {
      console.error('[categoryStats] Failed to decrement task stats:', error);
    }
  }

  // Increment new category
  if (afterCategoryId) {
    try {
      const categoryInfo = await getCategoryInfo(afterCategoryId);
      if (categoryInfo) {
        const statsRef = await getOrCreateCategoryStats(
          orgId,
          afterCategoryId,
          categoryInfo.path,
          categoryInfo.depth,
          categoryInfo.active
        );
        batch.update(statsRef, {
          totalTasks: admin.firestore.FieldValue.increment(1),
          lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    } catch (error) {
      console.error('[categoryStats] Failed to increment task stats:', error);
    }
  }

  if (beforeCategoryId || afterCategoryId) {
    await batch.commit();
  }
}

/**
 * Update category stats for a report change
 */
async function updateReportStats(
  beforeCategoryId: string | null | undefined,
  afterCategoryId: string | null | undefined,
  orgId: string
): Promise<void> {
  const batch = db.batch();

  // Decrement old category
  if (beforeCategoryId) {
    try {
      const categoryInfo = await getCategoryInfo(beforeCategoryId);
      if (categoryInfo) {
        const statsRef = await getOrCreateCategoryStats(
          orgId,
          beforeCategoryId,
          categoryInfo.path,
          categoryInfo.depth,
          categoryInfo.active
        );
        batch.update(statsRef, {
          totalReports: admin.firestore.FieldValue.increment(-1),
          lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    } catch (error) {
      console.error('[categoryStats] Failed to decrement report stats:', error);
    }
  }

  // Increment new category
  if (afterCategoryId) {
    try {
      const categoryInfo = await getCategoryInfo(afterCategoryId);
      if (categoryInfo) {
        const statsRef = await getOrCreateCategoryStats(
          orgId,
          afterCategoryId,
          categoryInfo.path,
          categoryInfo.depth,
          categoryInfo.active
        );
        batch.update(statsRef, {
          totalReports: admin.firestore.FieldValue.increment(1),
          lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    } catch (error) {
      console.error('[categoryStats] Failed to increment report stats:', error);
    }
  }

  if (beforeCategoryId || afterCategoryId) {
    await batch.commit();
  }
}

/**
 * Trigger: Update stats when document is created/updated/deleted
 */
export const onDocumentChange = functions.firestore
  .document('documents/{documentId}')
  .onWrite(async (change, context) => {
    const before = change.before.exists ? change.before.data() : null;
    const after = change.after.exists ? change.after.data() : null;

    const beforeCategoryId = before?.categoryId || null;
    const afterCategoryId = after?.categoryId || null;
    const orgId = after?.orgId || before?.orgId || after?.concernId || before?.concernId;

    if (!orgId) {
      console.warn('[categoryStats] No orgId found for document:', context.params.documentId);
      return;
    }

    // Skip if categoryId didn't change
    if (beforeCategoryId === afterCategoryId) {
      return;
    }

    await updateDocumentStats(beforeCategoryId, afterCategoryId, orgId);
  });

/**
 * Trigger: Update stats when task is created/updated/deleted
 * Note: Tasks may not have categoryId yet - this is optional
 */
export const onTaskChange = functions.firestore
  .document('tasks/{taskId}')
  .onWrite(async (change, context) => {
    const before = change.before.exists ? change.before.data() : null;
    const after = change.after.exists ? change.after.data() : null;

    // Check if tasks have categoryId field (may not exist yet)
    const beforeCategoryId = before?.categoryId || null;
    const afterCategoryId = after?.categoryId || null;
    const orgId = after?.concernID || before?.concernID;

    if (!orgId) {
      console.warn('[categoryStats] No orgId found for task:', context.params.taskId);
      return;
    }

    // Skip if categoryId didn't change
    if (beforeCategoryId === afterCategoryId) {
      return;
    }

    await updateTaskStats(beforeCategoryId, afterCategoryId, orgId);
  });

/**
 * Trigger: Update stats when category is renamed/moved
 * Updates path and depth in all related categoryStats documents
 */
export const onCategoryChange = functions.firestore
  .document('categories/{categoryId}')
  .onWrite(async (change, context) => {
    const before = change.before.exists ? change.before.data() : null;
    const after = change.after.exists ? change.after.data() : null;

    if (!after) {
      // Category deleted - stats will remain but categoryActive will be false
      return;
    }

    const categoryId = context.params.categoryId;
    const orgId = after.orgId;
    const newPath = after.path || [];
    const newDepth = after.depth || 0;
    const newActive = after.active !== false;

    // Check if path, depth, or active status changed
    const pathChanged = !before || JSON.stringify(before.path) !== JSON.stringify(newPath);
    const depthChanged = !before || before.depth !== newDepth;
    const activeChanged = !before || before.active !== newActive;

    if (pathChanged || depthChanged || activeChanged) {
      // Update all categoryStats documents for this category
      const statsId = `${orgId}_${categoryId}`;
      const statsRef = db.collection('categoryStats').doc(statsId);
      const statsDoc = await statsRef.get();

      if (statsDoc.exists) {
        await statsRef.update({
          path: newPath,
          depth: newDepth,
          categoryActive: newActive,
          lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    }
  });







