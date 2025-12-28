/**
 * Cloud Function: Create Sales Offer Draft from Email Inquiry
 * 
 * Idempotent function that:
 * 1. Creates/updates CRM Company and CRM Note at conversion time
 * 2. Creates a Sales Offer draft (in ROOT 'offers' collection)
 * 3. Links everything back to the email inquiry
 * 
 * This is for CUSTOMER INQUIRIES (incoming sales requests).
 * For SUPPLIER OFFERS, use the procurement pipeline instead.
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

// Allowed roles for sales conversion
const SALES_CONVERSION_ROLES = ['admin', 'manager', 'office', 'project_manager'];

/**
 * Generate deterministic ID from string (SHA-1 hash, first 20 chars)
 */
function deterministicId(str: string): string {
  return crypto.createHash('sha1').update(str).digest('hex').substring(0, 20);
}

/**
 * Get next offer number (simple increment approach)
 */
async function getNextOfferNumber(concernId: string): Promise<string> {
  const year = new Date().getFullYear();
  const counterRef = db.doc(`concerns/${concernId}/counters/offers`);
  
  const result = await db.runTransaction(async (transaction) => {
    const counterDoc = await transaction.get(counterRef);
    let currentCounter = 1;
    
    if (counterDoc.exists) {
      const data = counterDoc.data();
      if (data?.year === year) {
        currentCounter = (data.counter || 0) + 1;
      }
    }
    
    transaction.set(counterRef, { year, counter: currentCounter }, { merge: true });
    return currentCounter;
  });
  
  return `${year}-${String(result).padStart(4, '0')}`;
}

interface CreateOfferInput {
  concernId: string;
  inquiryId: string;
  title?: string;
  projectId?: string;
  projectNumber?: string;
  projectName?: string;
  customerId?: string; // Optional: link to existing customer
}

interface CreateOfferOutput {
  offerId: string;
  offerNumber: string;
  alreadyExists: boolean;
  crmCompanyId?: string;
  crmNoteId?: string;
}

export const createSalesOfferFromEmailInquiry = functions
  .region('europe-west1')
  .https.onCall(async (data: CreateOfferInput, context): Promise<CreateOfferOutput> => {
    // 1. Authentication check
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Nicht angemeldet');
    }
    
    const uid = context.auth.uid;
    const { concernId, inquiryId, title, projectId, projectNumber, projectName, customerId } = data;
    
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
    
    if (!SALES_CONVERSION_ROLES.includes(userRole) && !hasLegacyAccess) {
      throw new functions.https.HttpsError(
        'permission-denied', 
        'Nur Office, Admin oder Projektleiter können Kundenanfragen konvertieren'
      );
    }
    
    const userName = userData?.displayName || userData?.name || 
      [userData?.vorname, userData?.nachname].filter(Boolean).join(' ') || 
      'Unbekannt';

    // 3. Load the email inquiry
    const inquiryRef = db.doc(`concerns/${concernId}/emailInquiries/${inquiryId}`);
    const inquiryDoc = await inquiryRef.get();
    
    if (!inquiryDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'E-Mail-Anfrage nicht gefunden');
    }
    
    const inquiry = inquiryDoc.data()!;
    
    // Check spam gate: never convert spam
    if (inquiry.pipelineState === 'stopped_spam' || inquiry.isSpam) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Spam-E-Mails können nicht konvertiert werden'
      );
    }
    
    // Initialize CRM IDs and company details
    let crmCompanyId = inquiry.crmCompanyId;
    let crmNoteId = inquiry.crmNoteId;
    let companyName = inquiry.companyName || 'Unbekanntes Unternehmen';
    let senderEmail = inquiry.senderEmail || null;
    let domain: string | null = null;
    let senderPhone: string | null = inquiry.extracted?.phone || null;

    // 4. Check if already linked to a sales offer (idempotency)
    const idempotencyKey = `${inquiryId}:sales_offer:v1`;
    const offerId = deterministicId(`${concernId}:${idempotencyKey}`);
    const existingOfferRef = db.doc(`offers/${offerId}`);
    const existingOffer = await existingOfferRef.get();

    if (existingOffer.exists) {
      // Already converted - return existing
      functions.logger.info('[Sales] Offer already exists for inquiry', {
        offerId,
        inquiryId,
      });
      return {
        offerId,
        offerNumber: existingOffer.data()?.number || '',
        alreadyExists: true,
        crmCompanyId: inquiry.crmCompanyId,
        crmNoteId: inquiry.crmNoteId,
      };
    }
    
    // 5. Ensure CRM company and note exist (create at conversion time)
    if (!crmCompanyId && inquiry.senderEmail) {
      senderEmail = extractSenderEmail(inquiry.senderEmail) || inquiry.senderEmail;
      const senderName = inquiry.senderName || extractSenderName(inquiry.senderEmail);
      domain = normalizeEmailDomain(senderEmail);
      
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
            { name: companyName, domain, email: senderEmail, phone: senderPhone },
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
          
          functions.logger.info('[Sales] Upserted CRM company from inquiry', {
            companyId: crmCompanyId,
            noteId: crmNoteId,
            isNewCompany: companyResult.isNew,
          });
        } catch (err) {
          functions.logger.warn('[Sales] Failed to upsert CRM company, continuing', { error: err });
        }
      }
    }
    
    // 6. Get next offer number
    const offerNumber = await getNextOfferNumber(concernId);
    
    // 7. Create the offer draft
    const now = admin.firestore.Timestamp.now();
    const offerTitle = title || inquiry.subject || inquiry.title || 'Kundenanfrage';
    
    // Build customer snapshot for the offer
    const clientSnapshot = sanitizeForFirestore({
      name: companyName,
      billingAddress: {
        company: companyName,
        email: senderEmail,
        phone: senderPhone,
      },
      vatId: null,
      currency: 'EUR',
      defaultTaxKey: 'DE19',
    });
    
    const offerData = sanitizeForFirestore({
      // Core fields matching Offer interface
      concernID: concernId, // NOTE: uppercase ID to match existing invoicing data
      documentType: 'offer',
      number: offerNumber,
      state: 'draft',
      locale: 'de',
      currency: 'EUR',
      
      // Client info (can be linked to real customer later)
      clientId: customerId || `crm:${crmCompanyId}`, // Temporary client reference
      clientSnapshot,
      
      // Dates
      issueDate: new Date().toISOString().split('T')[0],
      
      // Content (empty - user fills in)
      lineItems: [],
      taxKeys: [{ key: 'DE19', ratePct: 19, descriptionDe: 'Umsatzsteuer 19%', descriptionEn: 'VAT 19%' }],
      additionalDiscountAbs: 0,
      totals: {
        subtotalNet: 0,
        lineDiscountTotal: 0,
        itemNetAfterDiscount: 0,
        additionalDiscountAbs: 0,
        vatByKey: { DE19: 0 },
        totalVat: 0,
        grandTotalGross: 0,
      },
      
      // Notes with email context
      noteInternal: [
        `Erstellt aus E-Mail-Anfrage`,
        `Absender: ${senderEmail || 'Unbekannt'}`,
        inquiry.subject ? `Betreff: ${inquiry.subject}` : null,
        Array.isArray(inquiry.aiSummary) ? `KI-Zusammenfassung: ${inquiry.aiSummary.join('; ')}` : null,
      ].filter(Boolean).join('\n'),
      noteCustomer: '',
      
      // Audit trail
      createdBy: uid,
      createdAt: now.toDate().toISOString(),
      updatedAt: now.toDate().toISOString(),
      
      // History for tracking (consistent with procurement)
      history: [{
        at: now,
        type: 'created_from_email_inquiry',
        byUserId: uid,
        byUserName: userName,
        message: 'Aus E-Mail-Anfrage erstellt',
        details: {
          inquiryId,
          emailId: inquiry.emailId || null,
          source: 'sales',
        },
      }],
      
      // Source tracking
      source: 'email_inquiry',
      sourceEmailId: inquiry.emailId || null,
      sourceInquiryId: inquiryId,
      sourceCrmCompanyId: crmCompanyId || null,
      sourceCrmNoteId: crmNoteId || null,
      idempotencyKey,
    });
    
    // 8. Write in batch for atomicity
    const batch = db.batch();
    
    // Create the offer
    batch.set(existingOfferRef, offerData);
    
    // Update inquiry with linkage and CRM IDs
    const inquiryUpdateData: Record<string, any> = {
      linkedSalesOfferId: offerId,
      linkedSalesOfferNumber: offerNumber,
      conversionState: 'converted',
      convertedAt: admin.firestore.FieldValue.serverTimestamp(),
      convertedBy: uid,
      status: inquiry.status === 'new' ? 'in_review' : inquiry.status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    if (crmCompanyId && !inquiry.crmCompanyId) {
      inquiryUpdateData.crmCompanyId = crmCompanyId;
    }
    if (crmNoteId && !inquiry.crmNoteId) {
      inquiryUpdateData.crmNoteId = crmNoteId;
    }
    if (projectId) {
      inquiryUpdateData.linkedProjectId = projectId;
      if (projectNumber) inquiryUpdateData.linkedProjectNumber = projectNumber;
    }
    batch.update(inquiryRef, sanitizeForFirestore(inquiryUpdateData));
    
    // Also update the CRM note with linkage if it exists
    if (crmNoteId) {
      const noteRef = db.doc(`concerns/${concernId}/crmNotes/${crmNoteId}`);
      batch.update(noteRef, sanitizeForFirestore({
        linkedSalesOfferId: offerId,
        linkedSalesOfferNumber: offerNumber,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }));
    }
    
    await batch.commit();
    
    functions.logger.info('[Sales] Created offer from email inquiry', {
      offerId,
      offerNumber,
      inquiryId,
      concernId,
      createdBy: uid.substring(0, 8),
      crmCompanyId,
      crmNoteId,
    });
    
    return {
      offerId,
      offerNumber,
      alreadyExists: false,
      crmCompanyId,
      crmNoteId,
    };
  });

