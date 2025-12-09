/**
 * Cloud Function: Route Document
 * 
 * Applies deterministic routing heuristics to uploaded documents.
 * Does not use AI - only filename, MIME type, and context analysis.
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

interface RouteDocumentRequest {
  docId: string;
}

interface RouteDocumentResponse {
  decision: 'routed' | 'needs_review' | 'stored';
  type?: string;
  confidence?: number;
  reason?: string;
}

export const routeDocument = functions.https.onCall(
  async (data: RouteDocumentRequest, context): Promise<RouteDocumentResponse> => {
    // Verify authentication
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated'
      );
    }

    const { docId } = data;

    try {
      // Fetch document
      const docsQuery = await db.collection('documents')
        .where('docId', '==', docId)
        .limit(1)
        .get();

      if (docsQuery.empty) {
        throw new functions.https.HttpsError(
          'not-found',
          'Document not found'
        );
      }

      const docRef = docsQuery.docs[0].ref;
      const docData = docsQuery.docs[0].data();

      // Apply routing heuristics
      const routingResult = applyRoutingRules(docData);

      // Update document with routing decision
      const updates: any = {
        routeDecision: {
          ruleId: routingResult.ruleId,
          reason: routingResult.reason
        }
      };

      if (routingResult.confidence >= 0.9 && routingResult.type) {
        // High confidence - auto-store
        updates.type = routingResult.type;
        updates.typeConfidence = routingResult.confidence;
        updates.status = 'stored';
      } else if (routingResult.confidence >= 0.6 && routingResult.type) {
        // Medium confidence - needs review
        updates.type = routingResult.type;
        updates.typeConfidence = routingResult.confidence;
        updates.status = 'needs_review';
      } else {
        // Low confidence - needs manual selection or AI
        updates.status = 'needs_review';
      }

      await docRef.update(updates);

      return {
        decision: updates.status,
        type: routingResult.type,
        confidence: routingResult.confidence,
        reason: routingResult.reason
      };

    } catch (error) {
      console.error('[routeDocument] Error:', error);
      throw new functions.https.HttpsError(
        'internal',
        'Failed to route document'
      );
    }
  }
);

/**
 * Apply routing rules (deterministic, no AI)
 */
function applyRoutingRules(docData: any): {
  type?: string;
  confidence: number;
  ruleId: string;
  reason: string;
} {
  const filename = (docData.originalFilename || '').toLowerCase();
  const mimeType = (docData.mimeType || '').toLowerCase();

  // Rule 1: Project context
  if (docData.projectId) {
    if (filename.includes('tagesbericht') || filename.includes('daily')) {
      return {
        type: 'project.site_daily_report',
        confidence: 0.92,
        ruleId: 'RULE_1_PROJECT_DAILY',
        reason: 'Daily report in project context'
      };
    }
    if (filename.includes('arbeitsauftrag') || filename.includes('work_order')) {
      return {
        type: 'project.task_work_order',
        confidence: 0.91,
        ruleId: 'RULE_1_PROJECT_WORKORDER',
        reason: 'Work order in project context'
      };
    }
  }

  // Rule 2: Filename patterns
  const filenamePatterns = [
    { regex: /lieferschein|delivery[_-]?note/i, type: 'material.delivery_note', confidence: 0.95 },
    { regex: /rechnung|invoice/i, type: 'client.invoice', confidence: 0.96 },
    { regex: /angebot|quote/i, type: 'client.offer_quote', confidence: 0.94 },
    { regex: /gutschrift|credit[_-]?note/i, type: 'client.credit_note', confidence: 0.94 },
    { regex: /stundenzettel|timesheet/i, type: 'personnel.timesheet', confidence: 0.94 },
    { regex: /fahrtenbuch|travel[_-]?log/i, type: 'personnel.travel_log', confidence: 0.93 },
    { regex: /abnahme|acceptance/i, type: 'client.acceptance_report', confidence: 0.93 },
    { regex: /inbetriebnahme|commissioning/i, type: 'quality.commissioning_report', confidence: 0.92 },
    { regex: /wartung|maintenance/i, type: 'quality.maintenance_log', confidence: 0.89 }
  ];

  for (const pattern of filenamePatterns) {
    if (pattern.regex.test(filename)) {
      return {
        type: pattern.type,
        confidence: pattern.confidence,
        ruleId: 'RULE_2_FILENAME',
        reason: `Filename pattern match: ${pattern.type}`
      };
    }
  }

  // Rule 3: MIME type defaults
  if (mimeType.startsWith('image/')) {
    return {
      type: 'quality.photo_doc',
      confidence: 0.65,
      ruleId: 'RULE_3_IMAGE_DEFAULT',
      reason: 'Image file defaults to photo documentation'
    };
  }

  // No confident match
  return {
    confidence: 0.0,
    ruleId: 'NO_MATCH',
    reason: 'No confident routing rule matched'
  };
}













