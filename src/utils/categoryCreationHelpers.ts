/**
 * Unified Category Creation Helpers
 * Consistent logic for Type 1 and Type 2 creation
 */

import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';

export interface CreateCategoryType1Params {
  title: string;
  content: string;
  concernId: string;
  projectId?: string; // Optional project association
}

export interface CreateCategoryType2Params {
  title: string;
  characteristic1: string;
  characteristic2: string;
  characteristic3: string;
  items: Array<{
    id: string;
    value1: string;
    value2: string;
    value3: string;
  }>;
  concernId: string;
  projectId?: string; // Optional project association
}

export interface CreateCategoryResult {
  success: boolean;
  familyId: string;
  optionsCount: number;
  error?: string;
}

/**
 * Creates a Type 1 category (simple list)
 * 
 * STRUCTURE:
 * - lookupFamilies: NO level0/level1/level2 fields
 * - lookupOptions: Single Level 1 option with content
 */
export async function createType1Category(
  params: CreateCategoryType1Params
): Promise<CreateCategoryResult> {
  try {
    const { title, content, concernId, projectId } = params;

    // Create lookupFamilies document WITHOUT level fields
    // This makes it Type 1
    const familyData = {
      concernId: concernId,
      familyId: title,
      familyName: title,
      projectNumber: projectId || 'FFFFF', // Store projectNumber or 'FFFFF' if not project-specific
      // NO level0, level1, level2 → Type 1
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      version: 1
    };

    const familyRef = await addDoc(collection(db, 'lookupFamilies'), familyData);

    // Create single lookupOptions document for content
    await addDoc(collection(db, 'lookupOptions'), {
      concernId: concernId,
      familyId: title,
      key: 'Content',
      level: 1,
      order: 1,
      parent_Type: 'Information',
      value: content,
      valueNumber: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    return {
      success: true,
      familyId: familyRef.id,
      optionsCount: 1
    };

  } catch (error: any) {
    console.error('Error creating Type 1 category:', error);
    return {
      success: false,
      familyId: '',
      optionsCount: 0,
      error: error.message || 'Unknown error'
    };
  }
}

/**
 * Creates a Type 2 category (3-column structured lookup)
 * 
 * STRUCTURE:
 * - lookupFamilies: WITH level0/level1/level2 fields
 * - lookupOptions: 3 options per row (Level 1, 2, 3)
 */
export async function createType2Category(
  params: CreateCategoryType2Params
): Promise<CreateCategoryResult> {
  try {
    const { title, characteristic1, characteristic2, characteristic3, items, concernId, projectId } = params;

    // Create lookupFamilies document WITH level fields
    // This makes it Type 2
    const familyData = {
      concernId: concernId,
      familyId: title,
      familyName: title,
      projectNumber: projectId || 'FFFFF', // Store projectNumber or 'FFFFF' if not project-specific
      level0: characteristic1,  // These fields make it Type 2
      level1: characteristic2,
      level2: characteristic3,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      version: 1
    };

    const familyRef = await addDoc(collection(db, 'lookupFamilies'), familyData);

    // Create lookupOptions documents for each item
    // Filter out completely empty rows
    const validItems = items.filter(item => 
      item.value1.trim() || item.value2.trim() || item.value3.trim()
    );

    let optionsCount = 0;

    for (let index = 0; index < validItems.length; index++) {
      const item = validItems[index];
      const order = index + 1;
      const parentType = item.value1.trim() || 'Unknown';

      // Level 1 (always create if value1 exists)
      if (item.value1.trim()) {
        await addDoc(collection(db, 'lookupOptions'), {
          concernId: concernId,
          familyId: title,
          key: characteristic1,
          level: 1,
          order: order,
          parent_Type: parentType,
          value: item.value1.trim(),
          valueNumber: null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        optionsCount++;
      }

      // Level 2 (only if value2 exists)
      if (item.value2.trim()) {
        const valueNumber2 = parseFloat(item.value2.trim());
        await addDoc(collection(db, 'lookupOptions'), {
          concernId: concernId,
          familyId: title,
          key: characteristic2,
          level: 2,
          order: order,
          parent_Type: parentType,
          value: item.value2.trim(),
          valueNumber: isNaN(valueNumber2) ? null : valueNumber2,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        optionsCount++;
      }

      // Level 3 (only if value3 exists)
      if (item.value3.trim()) {
        const valueNumber3 = parseFloat(item.value3.trim());
        await addDoc(collection(db, 'lookupOptions'), {
          concernId: concernId,
          familyId: title,
          key: characteristic3,
          level: 3,
          order: order,
          parent_Type: parentType,
          value: item.value3.trim(),
          valueNumber: isNaN(valueNumber3) ? null : valueNumber3,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        optionsCount++;
      }
    }

    return {
      success: true,
      familyId: familyRef.id,
      optionsCount: optionsCount
    };

  } catch (error: any) {
    console.error('Error creating Type 2 category:', error);
    return {
      success: false,
      familyId: '',
      optionsCount: 0,
      error: error.message || 'Unknown error'
    };
  }
}

/**
 * Converts Type 2 items to Type 1 content
 * Takes only the first column values and creates a simple list
 */
export function convertType2ToType1Content(items: Array<{ value1: string; value2: string; value3: string }>): string {
  return items
    .filter(item => item.value1.trim())
    .map(item => item.value1.trim())
    .join('\n');
}

/**
 * Gets user-friendly error message
 */
export function getCategoryErrorMessage(error: any): string {
  if (!error) return 'Unbekannter Fehler';

  const message = error.message || String(error);

  if (message.includes('permission-denied') || message.includes('Missing or insufficient permissions')) {
    return 'Keine Berechtigung zum Speichern in der Datenbank';
  }
  
  if (message.includes('unavailable')) {
    return 'Datenbank ist derzeit nicht verfügbar';
  }
  
  if (message.includes('unauthenticated')) {
    return 'Sie sind nicht angemeldet';
  }
  
  if (message.includes('already exists')) {
    return 'Eine Kategorie mit diesem Namen existiert bereits';
  }

  return `Fehler: ${message}`;
}






