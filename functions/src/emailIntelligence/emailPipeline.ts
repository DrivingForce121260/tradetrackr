/**
 * Email Intelligence Pipeline
 * 
 * Gated pipeline for AI email analysis:
 * 1. Spam check (gate)
 * 2. Companion document detection
 * 3. Document analysis (reuses Dokumentenverwaltung KI)
 * 4. Routing signals detection
 * 5. Procurement record creation
 * 
 * IDEMPOTENT: Uses idempotencyKey = `${emailId}:v${analysisVersion}`
 */

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { sanitizeForFirestore, safeMergeWrite } from '../utils/sanitizeForFirestore';
import { processCrmIntegration } from './crmIntegration';

const db = admin.firestore();

// Pipeline version - bump when logic changes
export const PIPELINE_VERSION = 2; // Bumped for CRM integration

// ============================================
// TYPES
// ============================================

export type PipelineState = 
  | 'pending'
  | 'spam_checked'
  | 'stopped_spam'
  | 'companions_detected'
  | 'docs_analyzed'
  | 'routed'
  | 'crm_processed'
  | 'procurement_created'
  | 'completed'
  | 'error';

export interface SpamCheckResult {
  isSpam: boolean;
  score: number;
  reasons: string[];
  checkedAt: admin.firestore.Timestamp;
  checkedBy: 'rule-based' | 'llm' | 'hybrid';
}

export interface CompanionDocument {
  kind: 'attachment' | 'link' | 'thread';
  ref: string;
  filename?: string;
  mimeType?: string;
  size?: number;
  hash?: string;
  analysisId?: string;
  analysisResult?: {
    type: string;
    confidence: number;
    extractedData?: Record<string, any>;
  };
}

export interface RoutingSignals {
  documentAnalysis: boolean;
  procurement: {
    isAnfrageResponse: boolean;
    isInvoice: boolean;
    isDeliveryNote: boolean;
    confidence: number;
    refs: {
      requestNumber?: string;
      orderNumber?: string;
      invoiceNumber?: string;
      deliveryNoteNumber?: string;
    };
  };
  projectRefs: string[];
  concernRefs: string[];
  supplierRefs: string[];
  keywords: string[];
}

export interface EmailPipelineData {
  pipelineState: PipelineState;
  pipelineVersion: number;
  idempotencyKey: string;
  spam?: SpamCheckResult;
  companions?: CompanionDocument[];
  routing?: RoutingSignals;
  derivedRecords?: Array<{
    type: string;
    id: string;
    createdAt: admin.firestore.Timestamp;
  }>;
  startedAt?: admin.firestore.Timestamp;
  completedAt?: admin.firestore.Timestamp;
  error?: {
    message: string;
    phase: PipelineState;
    at: admin.firestore.Timestamp;
  };
}

// ============================================
// SPAM DETECTION
// ============================================

const SPAM_KEYWORDS = [
  'newsletter', 'abmelden', 'unsubscribe', 'werbung', 'angebot des tages',
  'jetzt kaufen', 'rabatt', 'sonderangebot', 'gratis', 'gewinnspiel',
  'lottery', 'prize', 'winner', 'congratulations',
  'click here', 'act now', 'limited time', 'special offer', 'free trial',
  'discount', 'promotion', 'deal', 'sale',
  'no-reply', 'noreply', 'do-not-reply', 'mailer-daemon',
];

const SPAM_DOMAINS = [
  'mailchimp.com', 'sendgrid.net', 'constantcontact.com',
  'hubspot.com', 'mailerlite.com', 'klaviyo.com',
];

/**
 * Rule-based spam detection
 */
export function checkSpamRuleBased(
  from: string,
  subject: string,
  bodyText: string
): SpamCheckResult {
  const reasons: string[] = [];
  let score = 0;
  
  const lowerFrom = from.toLowerCase();
  const lowerSubject = subject.toLowerCase();
  const lowerBody = bodyText.toLowerCase().substring(0, 2000);
  
  // Check sender domain
  for (const domain of SPAM_DOMAINS) {
    if (lowerFrom.includes(domain)) {
      score += 0.4;
      reasons.push(`Marketing-Domain: ${domain}`);
      break;
    }
  }
  
  // Check for no-reply senders
  if (lowerFrom.includes('noreply') || lowerFrom.includes('no-reply')) {
    score += 0.2;
    reasons.push('No-Reply Absender');
  }
  
  // Check keywords in subject
  let subjectKeywords = 0;
  for (const keyword of SPAM_KEYWORDS) {
    if (lowerSubject.includes(keyword)) {
      subjectKeywords++;
      if (subjectKeywords <= 2) {
        reasons.push(`Betreff enthält: ${keyword}`);
      }
    }
  }
  score += Math.min(subjectKeywords * 0.15, 0.3);
  
  // Check keywords in body
  let bodyKeywords = 0;
  for (const keyword of SPAM_KEYWORDS) {
    if (lowerBody.includes(keyword)) {
      bodyKeywords++;
    }
  }
  score += Math.min(bodyKeywords * 0.05, 0.2);
  
  // Check for unsubscribe links
  if (lowerBody.includes('abmelden') || lowerBody.includes('unsubscribe')) {
    score += 0.1;
    reasons.push('Abmelde-Link vorhanden');
  }
  
  // Normalize score to 0-1
  score = Math.min(score, 1);
  
  return {
    isSpam: score >= 0.5,
    score,
    reasons,
    checkedAt: admin.firestore.Timestamp.now(),
    checkedBy: 'rule-based',
  };
}

// ============================================
// PROCUREMENT KEYWORDS
// ============================================

const PROCUREMENT_PATTERNS = {
  anfrage: [
    /anfrage\s*nr\.?\s*[:\-]?\s*(\d+[\w-]*)/gi,
    /angebots?nummer\s*[:\-]?\s*(\d+[\w-]*)/gi,
    /quotation\s*(?:no\.?|number)?\s*[:\-]?\s*(\d+[\w-]*)/gi,
    /rfq\s*[:\-#]?\s*(\d+[\w-]*)/gi,
  ],
  invoice: [
    /rechnungs?nummer\s*[:\-]?\s*(\d+[\w-]*)/gi,
    /rechnung\s*nr\.?\s*[:\-]?\s*(\d+[\w-]*)/gi,
    /invoice\s*(?:no\.?|number)?\s*[:\-]?\s*(\d+[\w-]*)/gi,
  ],
  delivery: [
    /lieferschein\s*(?:nr\.?|nummer)?\s*[:\-]?\s*(\d+[\w-]*)/gi,
    /delivery\s*note\s*[:\-]?\s*(\d+[\w-]*)/gi,
  ],
  order: [
    /bestell(?:ungs?)?nummer\s*[:\-]?\s*(\d+[\w-]*)/gi,
    /bestellung\s*nr\.?\s*[:\-]?\s*(\d+[\w-]*)/gi,
    /po\s*[:\-#]?\s*(\d+[\w-]*)/gi,
    /purchase\s*order\s*[:\-]?\s*(\d+[\w-]*)/gi,
  ],
};

const PROJECT_NUMBER_PATTERN = /(?:projekt|project|pn|p)\s*[:\-#]?\s*(\d+[\w-]*)/gi;

/**
 * Detect routing signals in email content
 */
export function detectRoutingSignals(
  from: string,
  subject: string,
  bodyText: string
): RoutingSignals {
  const text = `${subject} ${bodyText}`.substring(0, 5000);
  const refs: RoutingSignals['procurement']['refs'] = {};
  const keywords: string[] = [];
  const projectRefs: string[] = [];
  
  // Detect Anfrage/Angebot references
  let isAnfrageResponse = false;
  let anfrageConfidence = 0;
  
  for (const pattern of PROCUREMENT_PATTERNS.anfrage) {
    const match = pattern.exec(text);
    if (match) {
      refs.requestNumber = match[1];
      isAnfrageResponse = true;
      anfrageConfidence = 0.8;
      keywords.push('anfrage');
      break;
    }
  }
  
  // Check for offer-related keywords
  const offerKeywords = ['angebot', 'quote', 'quotation', 'offer', 'preisanfrage'];
  for (const kw of offerKeywords) {
    if (text.toLowerCase().includes(kw)) {
      if (!isAnfrageResponse) {
        isAnfrageResponse = true;
        anfrageConfidence = 0.6;
      }
      keywords.push(kw);
    }
  }
  
  // Detect invoice references
  let isInvoice = false;
  for (const pattern of PROCUREMENT_PATTERNS.invoice) {
    const match = pattern.exec(text);
    if (match) {
      refs.invoiceNumber = match[1];
      isInvoice = true;
      keywords.push('rechnung');
      break;
    }
  }
  
  // Detect delivery references
  let isDeliveryNote = false;
  for (const pattern of PROCUREMENT_PATTERNS.delivery) {
    const match = pattern.exec(text);
    if (match) {
      refs.deliveryNoteNumber = match[1];
      isDeliveryNote = true;
      keywords.push('lieferschein');
      break;
    }
  }
  
  // Detect order references
  for (const pattern of PROCUREMENT_PATTERNS.order) {
    const match = pattern.exec(text);
    if (match) {
      refs.orderNumber = match[1];
      keywords.push('bestellung');
      break;
    }
  }
  
  // Detect project references
  const projectMatches = text.matchAll(PROJECT_NUMBER_PATTERN);
  for (const match of projectMatches) {
    if (match[1] && !projectRefs.includes(match[1])) {
      projectRefs.push(match[1]);
    }
  }
  
  // Determine if document analysis is needed
  const hasAttachmentSignals = text.toLowerCase().includes('anhang') || 
                               text.toLowerCase().includes('attachment') ||
                               text.toLowerCase().includes('anbei');
  
  const documentAnalysis = hasAttachmentSignals || 
                           isInvoice || 
                           isDeliveryNote ||
                           (isAnfrageResponse && anfrageConfidence > 0.7);
  
  return {
    documentAnalysis,
    procurement: {
      isAnfrageResponse,
      isInvoice,
      isDeliveryNote,
      confidence: Math.max(anfrageConfidence, isInvoice ? 0.9 : 0, isDeliveryNote ? 0.9 : 0),
      refs,
    },
    projectRefs,
    concernRefs: [], // Could be extracted from email domain
    supplierRefs: [from], // Sender as potential supplier
    keywords: [...new Set(keywords)],
  };
}

// ============================================
// MAIN PIPELINE ORCHESTRATOR
// ============================================

interface PipelineContext {
  emailId: string;
  messageKey?: string;
  concernId: string;
  ownerUid: string;
  accountId: string;
}

/**
 * Run the gated email analysis pipeline.
 * IDEMPOTENT: Checks pipelineState before each step.
 * 
 * @param ctx - Pipeline context
 * @returns Final pipeline state
 */
export async function runEmailPipeline(
  ctx: PipelineContext
): Promise<{ ok: boolean; state: PipelineState; error?: string }> {
  const idempotencyKey = `${ctx.emailId}:v${PIPELINE_VERSION}`;
  
  functions.logger.info('[Pipeline] Starting', {
    emailId: ctx.emailId.substring(0, 8),
    concernId: ctx.concernId.substring(0, 8),
    ownerUid: ctx.ownerUid.substring(0, 8),
    idempotencyKey,
  });
  
  try {
    // Load email document
    const emailRef = db.collection('emails').doc(ctx.emailId);
    const emailDoc = await emailRef.get();
    
    if (!emailDoc.exists) {
      return { ok: false, state: 'error', error: 'Email not found' };
    }
    
    const emailData = emailDoc.data()!;
    
    // Ownership check
    const emailOwnerUid = emailData.ownerUid || emailData.createdBy;
    if (emailOwnerUid && emailOwnerUid !== ctx.ownerUid) {
      functions.logger.warn('[Pipeline] Ownership mismatch', {
        emailOwnerUid: emailOwnerUid?.substring(0, 8),
        ctxOwnerUid: ctx.ownerUid.substring(0, 8),
      });
      return { ok: false, state: 'error', error: 'Ownership mismatch' };
    }
    
    // Check existing pipeline state
    const existingPipeline = emailData.pipeline as EmailPipelineData | undefined;
    if (existingPipeline?.idempotencyKey === idempotencyKey) {
      // Already processed with same version
      if (existingPipeline.pipelineState === 'completed' || 
          existingPipeline.pipelineState === 'stopped_spam') {
        functions.logger.info('[Pipeline] Already completed', {
          state: existingPipeline.pipelineState,
        });
        return { ok: true, state: existingPipeline.pipelineState };
      }
      // Resume from current state
    }
    
    // Initialize pipeline data
    let pipeline: EmailPipelineData = {
      pipelineState: 'pending',
      pipelineVersion: PIPELINE_VERSION,
      idempotencyKey,
      startedAt: admin.firestore.Timestamp.now(),
      ...existingPipeline,
    };
    
    // ========================================
    // STEP 1: Spam Check (Gate)
    // ========================================
    if (pipeline.pipelineState === 'pending' || !pipeline.spam) {
      const spamResult = checkSpamRuleBased(
        emailData.from || '',
        emailData.subject || '',
        emailData.bodyText || ''
      );
      
      pipeline.spam = spamResult;
      
      if (spamResult.isSpam) {
        pipeline.pipelineState = 'stopped_spam';
        pipeline.completedAt = admin.firestore.Timestamp.now();
        
        await safeMergeWrite(emailRef, { 
          pipeline: sanitizeForFirestore(pipeline),
          category: 'SPAM',
        }, 'Pipeline:spam_stopped');
        
        functions.logger.info('[Pipeline] Stopped - SPAM', {
          score: spamResult.score,
          reasons: spamResult.reasons.slice(0, 3),
        });
        
        return { ok: true, state: 'stopped_spam' };
      }
      
      pipeline.pipelineState = 'spam_checked';
      
      await safeMergeWrite(emailRef, {
        pipeline: sanitizeForFirestore(pipeline),
      }, 'Pipeline:spam_checked');
    }
    
    // ========================================
    // STEP 2: Companion Document Detection
    // ========================================
    if (pipeline.pipelineState === 'spam_checked') {
      const companions: CompanionDocument[] = [];
      
      // Load attachments
      const attachmentsQuery = await db.collection('emailAttachments')
        .where('emailId', '==', ctx.emailId)
        .get();
      
      for (const attachDoc of attachmentsQuery.docs) {
        const attachData = attachDoc.data();
        companions.push({
          kind: 'attachment',
          ref: attachDoc.id,
          filename: attachData.fileName,
          mimeType: attachData.mimeType,
          size: attachData.size,
        });
      }
      
      // TODO: Detect links in email body
      // TODO: Detect related thread messages
      
      pipeline.companions = companions;
      pipeline.pipelineState = 'companions_detected';
      
      await safeMergeWrite(emailRef, {
        pipeline: sanitizeForFirestore(pipeline),
      }, 'Pipeline:companions_detected');
      
      functions.logger.info('[Pipeline] Companions detected', {
        count: companions.length,
      });
    }
    
    // ========================================
    // STEP 3: Routing Signals
    // ========================================
    if (pipeline.pipelineState === 'companions_detected') {
      const routing = detectRoutingSignals(
        emailData.from || '',
        emailData.subject || '',
        emailData.bodyText || ''
      );
      
      pipeline.routing = routing;
      pipeline.pipelineState = 'routed';
      
      await safeMergeWrite(emailRef, {
        pipeline: sanitizeForFirestore(pipeline),
      }, 'Pipeline:routed');
      
      functions.logger.info('[Pipeline] Routed', {
        documentAnalysis: routing.documentAnalysis,
        isAnfrageResponse: routing.procurement.isAnfrageResponse,
        projectRefs: routing.projectRefs,
      });
    }
    
    // ========================================
    // STEP 4: Document Analysis (if needed)
    // ========================================
    if (pipeline.pipelineState === 'routed' && pipeline.routing?.documentAnalysis) {
      // For each companion attachment, call existing document analysis
      // Note: This reuses the existing analyzeDocument Cloud Function
      
      const companions = pipeline.companions || [];
      let analyzedCount = 0;
      
      for (const companion of companions) {
        if (companion.kind === 'attachment' && !companion.analysisId) {
          try {
            // Get attachment document ID
            const attachmentId = companion.ref;
            
            // Check if there's a linked document
            const attachDoc = await db.collection('emailAttachments').doc(attachmentId).get();
            const attachData = attachDoc.data();
            
            if (attachData?.linkedDocumentId) {
              // Document already exists - could trigger analysis
              companion.analysisId = attachData.linkedDocumentId;
              analyzedCount++;
            }
            // If no linked document, skip for now
            // Full integration would create document and analyze
          } catch (err) {
            functions.logger.warn('[Pipeline] Document analysis skipped', {
              attachmentId: companion.ref,
              error: String(err),
            });
          }
        }
      }
      
      pipeline.companions = companions;
      pipeline.pipelineState = 'docs_analyzed';
      
      await safeMergeWrite(emailRef, {
        pipeline: sanitizeForFirestore(pipeline),
      }, 'Pipeline:docs_analyzed');
      
      functions.logger.info('[Pipeline] Documents analyzed', {
        analyzed: analyzedCount,
        total: companions.length,
      });
    } else if (pipeline.pipelineState === 'routed') {
      // No document analysis needed - skip to next state
      pipeline.pipelineState = 'docs_analyzed';
      
      await safeMergeWrite(emailRef, {
        pipeline: sanitizeForFirestore(pipeline),
      }, 'Pipeline:docs_analyzed_skipped');
    }
    
    // ========================================
    // STEP 5: CRM Integration (Inquiry Detection)
    // ========================================
    // Process email for CRM if it's a product/service inquiry
    // This happens BEFORE procurement (which handles AnfrageResponse/offers)
    if (pipeline.pipelineState === 'docs_analyzed') {
      try {
        const crmResult = await processCrmIntegration(
          ctx.concernId,
          ctx.ownerUid,
          {
            emailId: ctx.emailId,
            messageKey: ctx.messageKey,
            providerMessageId: emailData.providerMessageId,
            from: emailData.from || '',
            subject: emailData.subject || '',
            bodyText: emailData.bodyText || '',
            receivedAt: emailData.receivedAt || admin.firestore.Timestamp.now(),
            summaryBullets: emailData.summaryBullets,
          },
          {
            confidence: pipeline.routing?.procurement?.confidence,
            projectRefs: pipeline.routing?.projectRefs,
            keywords: pipeline.routing?.keywords,
          }
        );
        
        if (crmResult) {
          // Store inquiry reference in derived records
          // NOTE: CRM company/note are NOT created at pipeline time anymore
          // They are created at conversion time (Sales portal "Angebot erstellen")
          pipeline.derivedRecords = pipeline.derivedRecords || [];
          
          // Only record the inquiry (company/note IDs will be empty)
          if (crmResult.isNewInquiry && crmResult.inquiryId) {
            pipeline.derivedRecords.push({
              type: 'emailInquiry',
              id: crmResult.inquiryId,
              createdAt: admin.firestore.Timestamp.now(),
            });
          }
          
          functions.logger.info('[Pipeline] Email inquiry created (CRM deferred to conversion)', {
            inquiryId: crmResult.inquiryId,
            isNewInquiry: crmResult.isNewInquiry,
          });
        }
      } catch (crmError: any) {
        functions.logger.warn('[Pipeline] CRM integration failed (non-blocking)', {
          error: crmError.message,
          emailId: ctx.emailId.substring(0, 8),
        });
        // Continue pipeline - CRM failure is non-blocking
      }
      
      pipeline.pipelineState = 'crm_processed';
      
      await safeMergeWrite(emailRef, {
        pipeline: sanitizeForFirestore(pipeline),
      }, 'Pipeline:crm_processed');
    }
    
    // ========================================
    // STEP 6: Procurement Record Creation
    // ========================================
    if (pipeline.pipelineState === 'crm_processed' && 
        pipeline.routing?.procurement?.isAnfrageResponse) {
      
      // Check if procurement offer already exists (idempotency)
      const existingOfferQuery = await db.collection('procurementOffers')
        .where('sourceEmailId', '==', ctx.emailId)
        .where('ownerUid', '==', ctx.ownerUid)
        .limit(1)
        .get();
      
      if (existingOfferQuery.empty) {
        // Create new procurement offer
        const offerData = sanitizeForFirestore({
          concernId: ctx.concernId,
          ownerUid: ctx.ownerUid,
          source: 'email_ai',
          sourceEmailId: ctx.emailId,
          sourceMessageKey: ctx.messageKey || null,
          sourceAccountId: ctx.accountId,
          status: 'neu',
          supplierEmail: emailData.from,
          supplierName: extractSenderName(emailData.from),
          aiSummary: emailData.summaryBullets || [],
          aiConfidence: pipeline.routing.procurement.confidence,
          extractedData: {
            requestNumber: pipeline.routing.procurement.refs.requestNumber,
            orderNumber: pipeline.routing.procurement.refs.orderNumber,
          },
          attachmentRefs: (pipeline.companions || [])
            .filter(c => c.kind === 'attachment')
            .map(c => ({
              attachmentId: c.ref,
              filename: c.filename,
            })),
          receivedAt: emailData.receivedAt || admin.firestore.Timestamp.now(),
          createdAt: admin.firestore.Timestamp.now(),
          updatedAt: admin.firestore.Timestamp.now(),
        });
        
        const offerRef = await db.collection('procurementOffers').add(offerData);
        
        pipeline.derivedRecords = pipeline.derivedRecords || [];
        pipeline.derivedRecords.push({
          type: 'procurementOffer',
          id: offerRef.id,
          createdAt: admin.firestore.Timestamp.now(),
        });
        
        functions.logger.info('[Pipeline] Procurement offer created', {
          offerId: offerRef.id,
        });
      } else {
        functions.logger.info('[Pipeline] Procurement offer already exists', {
          offerId: existingOfferQuery.docs[0].id,
        });
      }
      
      pipeline.pipelineState = 'procurement_created';
      
      await safeMergeWrite(emailRef, {
        pipeline: sanitizeForFirestore(pipeline),
      }, 'Pipeline:procurement_created');
    } else if (pipeline.pipelineState === 'crm_processed') {
      pipeline.pipelineState = 'procurement_created';
      
      await safeMergeWrite(emailRef, {
        pipeline: sanitizeForFirestore(pipeline),
      }, 'Pipeline:procurement_skipped');
    }
    
    // ========================================
    // STEP 7: Complete
    // ========================================
    pipeline.pipelineState = 'completed';
    pipeline.completedAt = admin.firestore.Timestamp.now();
    
    await safeMergeWrite(emailRef, {
      pipeline: sanitizeForFirestore(pipeline),
    }, 'Pipeline:completed');
    
    functions.logger.info('[Pipeline] Completed', {
      emailId: ctx.emailId.substring(0, 8),
      derivedRecords: pipeline.derivedRecords?.length || 0,
    });
    
    return { ok: true, state: 'completed' };
    
  } catch (error: any) {
    functions.logger.error('[Pipeline] Error', {
      emailId: ctx.emailId.substring(0, 8),
      error: error.message,
    });
    
    // Try to save error state
    try {
      const emailRef = db.collection('emails').doc(ctx.emailId);
      await safeMergeWrite(emailRef, {
        pipeline: sanitizeForFirestore({
          pipelineState: 'error',
          pipelineVersion: PIPELINE_VERSION,
          idempotencyKey,
          error: {
            message: String(error.message || error).substring(0, 500),
            phase: 'error',
            at: admin.firestore.Timestamp.now(),
          },
        }),
      }, 'Pipeline:error');
    } catch {
      // Ignore save error
    }
    
    return { ok: false, state: 'error', error: error.message };
  }
}

/**
 * Extract sender name from email address
 */
function extractSenderName(from: string): string | undefined {
  // Try to extract name from "Name <email@domain.com>" format
  const match = from.match(/^([^<]+)\s*</);
  if (match) {
    return match[1].trim().replace(/"/g, '');
  }
  // Return email prefix as fallback
  const atIndex = from.indexOf('@');
  if (atIndex > 0) {
    return from.substring(0, atIndex);
  }
  return undefined;
}

