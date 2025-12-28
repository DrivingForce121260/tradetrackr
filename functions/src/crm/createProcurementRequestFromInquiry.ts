/**
 * Cloud Function: Create Procurement Request from CRM Email Inquiry
 * 
 * Idempotent function that creates a procurement request from an email inquiry.
 * Uses deterministic ID to prevent duplicates.
 * 
 * IMPORTANT: Writes to ROOT collection `procurementRequests` (not concern-scoped)
 * to match existing procurement infrastructure.
 * 
 * Also ensures CRM company/note are created if they don't exist.
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';
import { sanitizeForFirestore } from '../utils/sanitizeForFirestore';
import {
  upsertCrmCompany,
  createCrmInquiryNote,
  normalizeEmailDomain,
  deriveCompanyNameFromDomain,
  extractSenderName,
  extractSenderEmail,
} from '../emailIntelligence/crmIntegration';

const db = admin.firestore();

// Allowed roles for CRM write operations
const CRM_WRITE_ROLES = ['admin', 'manager', 'office', 'project_manager'];

// ROOT collection name (matches procurementService.ts)
const REQUESTS_COLLECTION = 'procurementRequests';

/**
 * Generate deterministic ID from string (SHA-1 hash, first 20 chars)
 */
function deterministicId(str: string): string {
  return crypto.createHash('sha1').update(str).digest('hex').substring(0, 20);
}

/**
 * Generate a request number for display
 */
function generateRequestNumber(concernId: string): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const suffix = concernId.substring(0, 4).toUpperCase();
  return `ANF-${suffix}-${timestamp}`;
}

interface CreateRequestInput {
  concernId: string;
  inquiryId: string;
  title?: string;
  projectId?: string;
  projectNumber?: string;
  projectName?: string;
}

interface CreateRequestOutput {
  requestId: string;
  alreadyExists: boolean;
  crmCompanyId?: string;
  crmNoteId?: string;
}

export const createProcurementRequestFromInquiry = functions
  .region('europe-west1')
  .https.onCall(async (data: CreateRequestInput, context): Promise<CreateRequestOutput> => {
    // 1. Authentication check
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Nicht angemeldet');
    }
    
    const uid = context.auth.uid;
    const { concernId, inquiryId, title, projectId, projectNumber, projectName } = data;
    
    if (!concernId || !inquiryId) {
      throw new functions.https.HttpsError('invalid-argument', 'concernId und inquiryId sind erforderlich');
    }
    
    // 2. Verify user is member of concern with correct role
    let userDoc = await db.doc(`concerns/${concernId}/users/${uid}`).get();
    let userData = userDoc.exists ? userDoc.data() : null;
    
    if (!userData) {
      // Fallback: Check root-level users collection (legacy structure)
      userDoc = await db.doc(`users/${uid}`).get();
      userData = userDoc.exists ? userDoc.data() : null;
      if (!userData || userData.concernID !== concernId) {
        throw new functions.https.HttpsError('permission-denied', 'Kein Zugriff auf diesen Betrieb');
      }
    }
    
    const userRole = userData?.role || '';
    const userRechte = userData?.rechte || 0;
    const hasLegacyAccess = userRechte >= 4;
    
    if (!CRM_WRITE_ROLES.includes(userRole) && !hasLegacyAccess) {
      throw new functions.https.HttpsError(
        'permission-denied', 
        'Keine Berechtigung. Nur Office, Admin oder Projektleiter können Anfragen erstellen.'
      );
    }
    
    const userName = userData?.displayName || userData?.vorname || userData?.email || 'Unbekannt';
    
    // 3. Load the email inquiry
    const inquiryRef = db.doc(`concerns/${concernId}/emailInquiries/${inquiryId}`);
    const inquiryDoc = await inquiryRef.get();
    
    if (!inquiryDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Anfrage nicht gefunden');
    }
    
    const inquiry = inquiryDoc.data()!;
    
    // 4. Check if already linked to a procurement request (idempotency)
    if (inquiry.linkedProcurementRequestId) {
      // Verify the request actually exists
      const existingRef = db.collection(REQUESTS_COLLECTION).doc(inquiry.linkedProcurementRequestId);
      const existingDoc = await existingRef.get();
      if (existingDoc.exists) {
        return {
          requestId: inquiry.linkedProcurementRequestId,
          alreadyExists: true,
          crmCompanyId: inquiry.crmCompanyId,
          crmNoteId: inquiry.crmNoteId,
        };
      }
      // If request doesn't exist but inquiry thinks it does, continue to create
    }
    
    // 5. Create deterministic ID for idempotency
    const idempotencyKey = `${inquiryId}:procurement_request:v2`;
    const requestId = deterministicId(`${concernId}:${idempotencyKey}`);
    
    // 6. Check if request already exists in ROOT collection
    const existingRequestRef = db.collection(REQUESTS_COLLECTION).doc(requestId);
    const existingRequest = await existingRequestRef.get();
    if (existingRequest.exists) {
      // Update inquiry linkage if missing
      if (!inquiry.linkedProcurementRequestId) {
        await inquiryRef.update({
          linkedProcurementRequestId: requestId,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
      return {
        requestId,
        alreadyExists: true,
        crmCompanyId: inquiry.crmCompanyId,
        crmNoteId: inquiry.crmNoteId,
      };
    }
    
    // 7. Ensure CRM company and note exist (reuse crmIntegration logic)
    let crmCompanyId = inquiry.crmCompanyId;
    let crmNoteId = inquiry.crmNoteId;
    let companyName = inquiry.companyName || 'Unbekanntes Unternehmen';
    
    // Extract sender info for snapshot (always, even if CRM company exists)
    const senderEmail = inquiry.senderEmail 
      ? (extractSenderEmail(inquiry.senderEmail) || inquiry.senderEmail)
      : null;
    const senderName = inquiry.senderName || (senderEmail ? extractSenderName(senderEmail) : null);
    const domain = senderEmail ? normalizeEmailDomain(senderEmail) : null;
    const phone = inquiry.extracted?.phone || null;
    
    // If no CRM company yet, create one from email data
    if (!crmCompanyId && senderEmail) {
      if (domain || senderEmail) {
        companyName = domain 
          ? deriveCompanyNameFromDomain(domain)
          : (senderName || 'Unbekannter Absender');
        
        const emailContext = {
          emailId: inquiry.emailId || inquiryId,
          subject: inquiry.subject || inquiry.title || 'E-Mail-Anfrage',
          senderEmail,
          senderName: senderName || undefined,
          receivedAt: inquiry.receivedAt || admin.firestore.Timestamp.now(),
          summaryBullets: Array.isArray(inquiry.aiSummary) ? inquiry.aiSummary : undefined,
          classification: 'anfrage',
          confidence: inquiry.aiConfidence || 0.5,
          extracted: inquiry.extracted,
        };
        
        try {
          const companyResult = await upsertCrmCompany(
            concernId,
            inquiry.ownerUid || uid,
            { name: companyName, domain, email: senderEmail },
            emailContext
          );
          crmCompanyId = companyResult.companyId;
          
          // Also create CRM note if missing
          if (!crmNoteId) {
            const noteResult = await createCrmInquiryNote(
              concernId,
              inquiry.ownerUid || uid,
              companyResult.companyId,
              emailContext
            );
            crmNoteId = noteResult.noteId;
          }
          
          functions.logger.info('[CRM] Upserted company from inquiry button', {
            companyId: crmCompanyId,
            noteId: crmNoteId,
            isNewCompany: companyResult.isNew,
          });
        } catch (err) {
          functions.logger.warn('[CRM] Failed to upsert company, continuing', { error: err });
        }
      }
    }
    
    // 8. Verify project belongs to concern (if specified)
    let projectSnapshot = null;
    if (projectId) {
      const projectDoc = await db.doc(`projects/${projectId}`).get();
      if (projectDoc.exists) {
        const projectData = projectDoc.data();
        if (projectData?.concernID !== concernId) {
          throw new functions.https.HttpsError(
            'permission-denied',
            'Projekt gehört nicht zu diesem Betrieb'
          );
        }
        projectSnapshot = {
          projectId,
          projectNumber: projectNumber || projectData?.projectNumber || '',
          name: projectName || projectData?.projectName || projectData?.name || '',
        };
      }
    }
    
    // 9. Create procurement request in ROOT collection
    // Using the schema expected by procurementService.ts
    const now = admin.firestore.Timestamp.now();
    const requestTitle = title || inquiry.subject || inquiry.title || 'E-Mail-Anfrage';
    
    const requestData = sanitizeForFirestore({
      // Required fields matching ProcurementRequest interface
      concernID: concernId, // NOTE: uppercase ID to match existing procurement data
      supplierId: null, // No supplier yet - this is an incoming inquiry
      // Slim supplier snapshot for CRM-derived inquiries
      // Only contains: name, domain, email, phone (no id, vatId, iban, address, etc.)
      // CRM company ID is stored separately in sourceCompanyId field
      supplierSnapshot: {
        name: companyName,
        domain: domain,
        email: senderEmail,
        phone: phone,
      },
      
      // Request details
      requestNumber: generateRequestNumber(concernId),
      title: requestTitle,
      requestedAt: inquiry.receivedAt || now, // Use email receive time
      status: 'draft', // Start as draft (matches ProcurementRequestStatus)
      
      // Line items (empty - user can add later)
      lineItems: [],
      
      // Optional project link
      project: projectSnapshot,
      
      // Notes with email context
      notes: [
        `E-Mail-Anfrage von: ${inquiry.senderEmail || 'Unbekannt'}`,
        inquiry.subject ? `Betreff: ${inquiry.subject}` : null,
        Array.isArray(inquiry.aiSummary) ? `Zusammenfassung: ${inquiry.aiSummary.join('; ')}` : null,
      ].filter(Boolean).join('\n'),
      
      // History with canonical eventKey field (not type)
      history: [{
        at: now,
        eventKey: 'created_from_crm_inquiry', // Canonical event key (snake_case)
        byUserId: uid,
        byUserName: userName,
        message: 'Aus E-Mail-Anfrage erstellt',
        details: {
          source: 'crm',
          emailId: inquiry.emailId || null,
          inquiryId,
        },
      }],
      
      // Metadata
      createdAt: now,
      updatedAt: now,
      createdBy: {
        userId: uid,
        name: userName,
      },
      updatedBy: {
        userId: uid,
        name: userName,
      },
      
      // Additional fields for traceability (not in original interface but useful)
      source: 'crm_email',
      sourceEmailId: inquiry.emailId || null,
      sourceCrmNoteId: crmNoteId || null,
      sourceInquiryId: inquiryId,
      sourceCompanyId: crmCompanyId || null,
      senderEmail: inquiry.senderEmail || null,
      senderName: inquiry.senderName || null,
      idempotencyKey,
    });
    
    // 10. Write in batch for atomicity
    const batch = db.batch();
    
    // Create the procurement request in ROOT collection
    batch.set(existingRequestRef, requestData);
    
    // Update inquiry with linkage and CRM IDs
    const inquiryUpdateData: Record<string, any> = {
      linkedProcurementRequestId: requestId,
      status: inquiry.status === 'new' ? 'in_review' : inquiry.status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    if (crmCompanyId && !inquiry.crmCompanyId) {
      inquiryUpdateData.crmCompanyId = crmCompanyId;
    }
    if (crmNoteId && !inquiry.crmNoteId) {
      inquiryUpdateData.crmNoteId = crmNoteId;
    }
    batch.update(inquiryRef, sanitizeForFirestore(inquiryUpdateData));
    
    // Also update the CRM note with linkage if it exists
    if (crmNoteId) {
      const noteRef = db.doc(`concerns/${concernId}/crmNotes/${crmNoteId}`);
      batch.update(noteRef, sanitizeForFirestore({
        linkedProcurementRequestId: requestId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }));
    }
    
    await batch.commit();
    
    functions.logger.info('[CRM] Created procurement request from inquiry', {
      requestId,
      inquiryId,
      concernId,
      crmCompanyId,
      crmNoteId,
      createdBy: uid.substring(0, 8),
    });
    
    return {
      requestId,
      alreadyExists: false,
      crmCompanyId,
      crmNoteId,
    };
  });

