/**
 * Project Number Detection for Document Management
 * 
 * Detects PN-?????? patterns in extracted text and resolves them to projectId.
 * Format: PN- followed by exactly 6 alphanumeric characters (e.g., PN-0AA012)
 */

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

const db = admin.firestore();

/**
 * Regex pattern for project numbers: PN-[A-Za-z0-9]{6}
 * Matches: PN-0AA012, PN-ABC123, pn-xyz789 (case insensitive)
 */
const PROJECT_NUMBER_PATTERN = /\bPN-[A-Za-z0-9]{6}\b/gi;

/**
 * Detect all project numbers in text
 */
export function detectProjectNumbers(text: string): string[] {
  if (!text || typeof text !== 'string') {
    return [];
  }

  const matches = text.match(PROJECT_NUMBER_PATTERN);
  if (!matches) {
    return [];
  }

  // Normalize to uppercase and deduplicate
  const unique = Array.from(new Set(
    matches.map(m => m.toUpperCase())
  ));

  functions.logger.info('[detectProjectNumbers] Found patterns:', unique);
  return unique;
}

/**
 * Resolve a project number to projectId
 * Returns null if not found or not unique
 */
export async function resolveProjectNumber(
  concernId: string,
  projectNumber: string
): Promise<string | null> {
  if (!concernId || !projectNumber) {
    return null;
  }

  try {
    // Query projects collection
    // Note: The existing projects collection has projectNumber as a number field,
    // but new external projects use string format like "PN-0AA012"
    // We need to query by the string projectNumber field (assuming it's been added)
    
    const snapshot = await db.collection('projects')
      .where('concernID', '==', concernId)
      .where('projectNumber', '==', projectNumber)
      .limit(2) // Get at most 2 to detect duplicates
      .get();

    if (snapshot.empty) {
      functions.logger.info('[resolveProjectNumber] No project found:', { concernId, projectNumber });
      return null;
    }

    if (snapshot.size > 1) {
      functions.logger.warn('[resolveProjectNumber] Multiple projects found (should not happen):', {
        concernId,
        projectNumber,
        count: snapshot.size
      });
      return null; // Ambiguous
    }

    const projectDoc = snapshot.docs[0];
    functions.logger.info('[resolveProjectNumber] Resolved to project:', {
      projectNumber,
      projectId: projectDoc.id
    });
    
    return projectDoc.id;
  } catch (error: any) {
    functions.logger.error('[resolveProjectNumber] Error:', error);
    return null;
  }
}

/**
 * Detect and resolve project numbers from document text
 * Returns:
 * - Single projectId if exactly one PN found and resolved
 * - null if none found, multiple found, or resolution failed
 * - Also returns detected patterns for storage in document
 */
export interface ProjectNumberDetectionResult {
  projectId: string | null;
  detectedPatterns: string[];
  resolution: 'single' | 'none' | 'multiple' | 'not_found' | 'ambiguous';
  reason: string;
}

export async function detectAndResolveProjectNumber(
  concernId: string,
  textSample: string
): Promise<ProjectNumberDetectionResult> {
  const detectedPatterns = detectProjectNumbers(textSample);

  // Case 1: No project numbers found
  if (detectedPatterns.length === 0) {
    return {
      projectId: null,
      detectedPatterns: [],
      resolution: 'none',
      reason: 'Keine Projektnummer (PN-XXXXXX) im Dokument gefunden.'
    };
  }

  // Case 2: Multiple different project numbers found
  if (detectedPatterns.length > 1) {
    functions.logger.info('[detectAndResolveProjectNumber] Multiple patterns found:', detectedPatterns);
    return {
      projectId: null,
      detectedPatterns,
      resolution: 'multiple',
      reason: `Mehrere Projektnummern gefunden: ${detectedPatterns.join(', ')}. Bitte manuell auswählen.`
    };
  }

  // Case 3: Exactly one project number found - try to resolve it
  const projectNumber = detectedPatterns[0];
  const projectId = await resolveProjectNumber(concernId, projectNumber);

  if (!projectId) {
    return {
      projectId: null,
      detectedPatterns,
      resolution: 'not_found',
      reason: `Projektnummer ${projectNumber} wurde im Dokument gefunden, aber das Projekt existiert nicht im System.`
    };
  }

  // Success!
  return {
    projectId,
    detectedPatterns,
    resolution: 'single',
    reason: `Projekt automatisch erkannt: ${projectNumber}`
  };
}



