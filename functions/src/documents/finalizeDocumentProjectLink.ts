/**
 * Finalize Document-Project Link Cloud Function
 * 
 * Called when user selects a project for a document (manually or auto-detected).
 * Assigns projectId, allocates suffix, sets designation, and updates document status.
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { allocateProjectDocumentSuffix, buildDocumentDesignation } from './allocateProjectDocumentSuffix';

const db = admin.firestore();

interface FinalizeDocumentProjectLinkRequest {
  docId: string;
  projectId: string;
}

interface FinalizeDocumentProjectLinkResponse {
  success: boolean;
  projectNumber: string;
  suffix: number;
  designation: string;
}

/**
 * Finalize the project link for a document
 * 
 * Steps:
 * 1. Verify document exists and user has access
 * 2. Fetch project to get projectNumber
 * 3. Allocate suffix for project
 * 4. Build designation
 * 5. Update document with projectId, projectNumber, suffix, designation
 * 6. Update status to 'stored'
 */
export const finalizeDocumentProjectLink = functions
  .region('europe-west1')
  .https.onCall(async (data: FinalizeDocumentProjectLinkRequest, context): Promise<FinalizeDocumentProjectLinkResponse> => {
    // ============================================
    // 1. AUTHENTICATION & AUTHORIZATION
    // ============================================
    
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Benutzer muss angemeldet sein');
    }

    const { docId, projectId } = data;

    if (!docId || !projectId) {
      throw new functions.https.HttpsError('invalid-argument', 'docId und projectId sind erforderlich');
    }

    functions.logger.info('[finalizeDocumentProjectLink] Request:', {
      docId,
      projectId,
      userId: context.auth.uid
    });

    try {
      // ============================================
      // 2. FETCH DOCUMENT
      // ============================================
      
      const docsQuery = await db.collection('documents')
        .where('docId', '==', docId)
        .limit(1)
        .get();

      if (docsQuery.empty) {
        throw new functions.https.HttpsError('not-found', 'Dokument nicht gefunden');
      }

      const docRef = docsQuery.docs[0].ref;
      const docData = docsQuery.docs[0].data();
      const concernId = docData.concernId || docData.orgId;

      if (!concernId) {
        throw new functions.https.HttpsError('failed-precondition', 'ConcernId fehlt im Dokument');
      }

      // ============================================
      // 3. FETCH PROJECT
      // ============================================
      
      const projectRef = db.collection('projects').doc(projectId);
      const projectDoc = await projectRef.get();

      if (!projectDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Projekt nicht gefunden');
      }

      const projectData = projectDoc.data();
      const projectNumber = projectData?.projectNumber;

      if (!projectNumber) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          'Projektnummer fehlt. Bitte Projekt aktualisieren.'
        );
      }

      // Validate concernId match
      if (projectData?.concernID !== concernId) {
        throw new functions.https.HttpsError(
          'permission-denied',
          'Projekt gehört zu einer anderen Organisation'
        );
      }

      functions.logger.info('[finalizeDocumentProjectLink] Project found:', {
        projectId,
        projectNumber,
        concernId
      });

      // ============================================
      // 4. ALLOCATE SUFFIX
      // ============================================
      
      // Call the allocation function directly (internal call)
      const allocationResult = await allocateProjectDocumentSuffix.run({
        concernId,
        projectId
      }, {
        auth: context.auth,
        instanceIdToken: context.instanceIdToken,
        rawRequest: context.rawRequest
      } as any);

      const suffix = allocationResult.suffix;

      functions.logger.info('[finalizeDocumentProjectLink] Suffix allocated:', {
        docId,
        projectId,
        suffix
      });

      // ============================================
      // 5. BUILD DESIGNATION
      // ============================================
      
      const designation = buildDocumentDesignation(projectNumber, suffix);

      functions.logger.info('[finalizeDocumentProjectLink] Designation built:', {
        docId,
        designation
      });

      // ============================================
      // 6. UPDATE DOCUMENT
      // ============================================
      
      await docRef.update({
        projectId: projectId,
        projectNumber: projectNumber,
        projectDocSuffix: suffix,
        designation: designation,
        status: 'stored',
        'meta.finalizedAt': admin.firestore.FieldValue.serverTimestamp(),
        'meta.finalizedBy': context.auth.uid,
      });

      functions.logger.info('[finalizeDocumentProjectLink] Document finalized:', {
        docId,
        projectId,
        projectNumber,
        suffix,
        designation
      });

      return {
        success: true,
        projectNumber,
        suffix,
        designation
      };

    } catch (error: any) {
      functions.logger.error('[finalizeDocumentProjectLink] Error:', {
        error: error.message,
        docId,
        projectId,
      });

      // Re-throw HttpsError as-is
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      // Wrap other errors
      throw new functions.https.HttpsError(
        'internal',
        `Fehler beim Finalisieren: ${error.message}`
      );
    }
  });



