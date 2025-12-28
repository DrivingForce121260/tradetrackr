/**
 * Category Type 2 Diagnostic Function
 * Analyzes lookupFamilies and lookupOptions data for debugging
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

interface DiagnosticResult {
  familyData: any;
  optionsStats: {
    total: number;
    byLevel: Record<number, number>;
    byOrder: Record<number, number>;
    byConcernId: Record<string, number>;
    missingValues: number;
    duplicateOrderLevel: Array<{ order: number; level: number; count: number }>;
  };
  sampleOptions: any[];
  issues: string[];
  recommendations: string[];
}

/**
 * Diagnostic function to analyze a Category Type 2
 */
export const debugCategoryType2 = functions.https.onCall(async (data, context) => {
  // Auth check
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { categoryName, concernId } = data;

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
    
    // Find all options for this family
    const optionsQuery1 = db.collection('lookupOptions')
      .where('familyId', '==', familyData.familyId);
    const optionsSnapshot1 = await optionsQuery1.get();
    
    // Also try by familyName
    const optionsQuery2 = db.collection('lookupOptions')
      .where('familyId', '==', familyData.familyName);
    const optionsSnapshot2 = await optionsQuery2.get();
    
    // Combine and deduplicate
    const allOptionDocs = [...optionsSnapshot1.docs];
    const existingIds = new Set(optionsSnapshot1.docs.map(d => d.id));
    for (const doc of optionsSnapshot2.docs) {
      if (!existingIds.has(doc.id)) {
        allOptionDocs.push(doc);
      }
    }
    
    // Analyze options
    const byLevel: Record<number, number> = {};
    const byOrder: Record<number, number> = {};
    const byConcernId: Record<string, number> = {};
    const orderLevelCombos: Record<string, number> = {};
    let missingValues = 0;
    
    for (const doc of allOptionDocs) {
      const opt = doc.data();
      
      // Count by level
      byLevel[opt.level] = (byLevel[opt.level] || 0) + 1;
      
      // Count by order
      byOrder[opt.order] = (byOrder[opt.order] || 0) + 1;
      
      // Count by concernId
      byConcernId[opt.concernId] = (byConcernId[opt.concernId] || 0) + 1;
      
      // Check for duplicates
      const combo = `${opt.order}-${opt.level}`;
      orderLevelCombos[combo] = (orderLevelCombos[combo] || 0) + 1;
      
      // Check for empty values
      if (!opt.value || opt.value.trim() === '') {
        missingValues++;
      }
    }
    
    // Find duplicates
    const duplicateOrderLevel = Object.entries(orderLevelCombos)
      .filter(([_, count]) => count > 1)
      .map(([combo, count]) => {
        const [order, level] = combo.split('-').map(Number);
        return { order, level, count };
      });
    
    // Get sample options (first 10)
    const sampleOptions = allOptionDocs.slice(0, 10).map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Analyze issues
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    // Check if Type 2 structure exists
    if (!familyData.level0 || !familyData.level1 || !familyData.level2) {
      issues.push('Missing level definitions (level0, level1, level2) in family document');
      recommendations.push('Add level0, level1, level2 fields to lookupFamilies document');
    }
    
    // Check option counts
    const level1Count = byLevel[1] || 0;
    const level2Count = byLevel[2] || 0;
    const level3Count = byLevel[3] || 0;
    
    if (level1Count === 0 && level2Count === 0 && level3Count === 0) {
      issues.push('No options found with level 1, 2, or 3');
      recommendations.push('Ensure lookupOptions have level field set to 1, 2, or 3');
    }
    
    if (Math.abs(level1Count - level2Count) > 5 || Math.abs(level2Count - level3Count) > 5) {
      issues.push(`Unbalanced level counts: L1=${level1Count}, L2=${level2Count}, L3=${level3Count}`);
      recommendations.push('Each order should have options at all 3 levels');
    }
    
    // Check for missing orders
    const orders = Object.keys(byOrder).map(Number).sort((a, b) => a - b);
    if (orders.length > 0) {
      const minOrder = orders[0];
      const maxOrder = orders[orders.length - 1];
      const expectedCount = maxOrder - minOrder + 1;
      
      if (orders.length < expectedCount) {
        issues.push(`Missing orders: expected ${expectedCount}, found ${orders.length}`);
        recommendations.push('Ensure order values are consecutive (1, 2, 3, ...) or at least consistent');
      }
    }
    
    // Check for duplicates
    if (duplicateOrderLevel.length > 0) {
      issues.push(`Found ${duplicateOrderLevel.length} duplicate order+level combinations`);
      recommendations.push('Each order+level combination should be unique');
    }
    
    // Check for empty values
    if (missingValues > 0) {
      issues.push(`Found ${missingValues} options with empty values`);
      recommendations.push('Ensure all options have non-empty value fields');
    }
    
    // Check concernId consistency
    const concernIds = Object.keys(byConcernId);
    if (concernIds.length > 1) {
      issues.push(`Mixed concernIds: ${concernIds.join(', ')}`);
      recommendations.push('All options should have the same concernId as the family');
    }
    
    return {
      familyData: {
        id: familyDoc.id,
        ...familyData
      },
      optionsStats: {
        total: allOptionDocs.length,
        byLevel,
        byOrder,
        byConcernId,
        missingValues,
        duplicateOrderLevel
      },
      sampleOptions,
      issues,
      recommendations
    } as DiagnosticResult;
    
  } catch (error: any) {
    console.error('Diagnostic error:', error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', `Diagnostic failed: ${error.message}`);
  }
});






