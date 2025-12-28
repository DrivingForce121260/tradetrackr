/**
 * Migration: Convert Parts from Type 2 to Type 1
 * 
 * PROBLEM: Parts has level0/level1/level2 fields (Type 2 structure)
 *          but only has Level 1 options (30 items, no Level 2 or 3)
 * 
 * SOLUTION: Convert to Type 1 by:
 *           1. Remove level0/level1/level2 from family document
 *           2. Keep existing Level 1 options (they become the content)
 *           3. System will now treat it as Type 1 (simple list)
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

export const convertPartsToType1 = functions.https.onCall(async (data, context) => {
  // Auth check
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { categoryName, concernId, dryRun = true } = data;

  if (!categoryName) {
    throw new functions.https.HttpsError('invalid-argument', 'categoryName is required');
  }

  try {
    const db = admin.firestore();
    
    // Find the family
    const familiesQuery = concernId 
      ? db.collection('lookupFamilies')
          .where('familyName', '==', categoryName)
          .where('concernId', '==', concernId)
      : db.collection('lookupFamilies')
          .where('familyName', '==', categoryName);
    
    const familiesSnapshot = await familiesQuery.get();
    
    if (familiesSnapshot.empty) {
      throw new functions.https.HttpsError('not-found', `Category "${categoryName}" not found`);
    }

    const familyDoc = familiesSnapshot.docs[0];
    const familyData = familyDoc.data();
    
    // Check if it's currently Type 2
    const isType2 = familyData.level0 && familyData.level1 && familyData.level2;
    
    if (!isType2) {
      return {
        success: false,
        message: `Category "${categoryName}" is already Type 1 (no level0/level1/level2 fields)`
      };
    }
    
    // Get current options
    const optionsQuery = db.collection('lookupOptions')
      .where('familyId', '==', familyData.familyId);
    const optionsSnapshot = await optionsQuery.get();
    
    const level1Count = optionsSnapshot.docs.filter(d => d.data().level === 1).length;
    const level2Count = optionsSnapshot.docs.filter(d => d.data().level === 2).length;
    const level3Count = optionsSnapshot.docs.filter(d => d.data().level === 3).length;
    
    // Verify it's a candidate for conversion (has Level 1 only)
    if (level2Count > 0 || level3Count > 0) {
      return {
        success: false,
        message: `Category "${categoryName}" has Level 2 (${level2Count}) or Level 3 (${level3Count}) options. Cannot convert to Type 1.`,
        stats: { level1Count, level2Count, level3Count }
      };
    }
    
    if (dryRun) {
      return {
        success: true,
        dryRun: true,
        message: `DRY RUN: Would convert "${categoryName}" from Type 2 to Type 1`,
        changes: {
          familyDocument: {
            willRemove: ['level0', 'level1', 'level2'],
            currentValues: {
              level0: familyData.level0,
              level1: familyData.level1,
              level2: familyData.level2
            }
          },
          options: {
            total: optionsSnapshot.docs.length,
            level1: level1Count,
            level2: level2Count,
            level3: level3Count,
            action: 'Keep Level 1 options unchanged'
          }
        }
      };
    }
    
    // ACTUAL MIGRATION (if dryRun = false)
    
    // Update family document - remove level fields
    const updateData: any = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    
    // Use FieldValue.delete() to remove fields
    updateData.level0 = admin.firestore.FieldValue.delete();
    updateData.level1 = admin.firestore.FieldValue.delete();
    updateData.level2 = admin.firestore.FieldValue.delete();
    
    await familyDoc.ref.update(updateData);
    
    return {
      success: true,
      dryRun: false,
      message: `Successfully converted "${categoryName}" from Type 2 to Type 1`,
      changes: {
        familyDocument: {
          removed: ['level0', 'level1', 'level2'],
          previousValues: {
            level0: familyData.level0,
            level1: familyData.level1,
            level2: familyData.level2
          }
        },
        options: {
          total: optionsSnapshot.docs.length,
          level1: level1Count,
          unchanged: true
        }
      }
    };
    
  } catch (error: any) {
    console.error('Migration error:', error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', `Migration failed: ${error.message}`);
  }
});






