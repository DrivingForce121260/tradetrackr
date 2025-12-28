/**
 * CRM Integration for Email Pipeline
 * 
 * Creates/updates CRM company records and notes when emails are
 * detected as product/service inquiries (Anfragen).
 * 
 * User-scoped (ownerUid) and concern-scoped (concernId).
 * Idempotent: Same email processed twice will not create duplicates.
 */

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import * as crypto from 'crypto';
import { sanitizeForFirestore, safeMergeWrite } from '../utils/sanitizeForFirestore';

const db = admin.firestore();

// ============================================
// TYPES
// ============================================

export interface CRMCompanyCandidate {
  name: string;
  domain: string | null;
  email: string;
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    postalCode?: string;
    country?: string;
  };
}

export interface EmailContext {
  emailId: string;
  messageKey?: string;
  providerMessageId?: string;
  subject: string;
  senderEmail: string;
  senderName?: string;
  receivedAt: admin.firestore.Timestamp;
  summaryBullets?: string[];
  classification: string;
  confidence: number;
  extracted?: {
    projectNumber?: string;
    requestNumber?: string;
    phone?: string;
    address?: string;
    keywords?: string[];
  };
}

export interface CRMUpsertResult {
  companyId: string;
  noteId: string;
  isNewCompany: boolean;
  isNewNote: boolean;
  inquiryId?: string;
  isNewInquiry?: boolean;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Normalize email domain by stripping common subdomains
 */
export function normalizeEmailDomain(email: string): string | null {
  if (!email || !email.includes('@')) return null;
  
  const domain = email.split('@')[1]?.toLowerCase().trim();
  if (!domain) return null;
  
  // Remove common mail subdomains
  const stripped = domain
    .replace(/^(mail|mx|smtp|email|webmail|imap|pop)\./i, '')
    .replace(/^(m|www)\./i, '');
  
  // Skip generic email providers (no company info)
  const genericProviders = [
    'gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.de',
    'outlook.com', 'hotmail.com', 'hotmail.de', 'live.com',
    'web.de', 'gmx.de', 'gmx.net', 't-online.de', 'freenet.de',
    'aol.com', 'icloud.com', 'me.com', 'protonmail.com', 'proton.me',
    'posteo.de', 'mailbox.org',
  ];
  
  if (genericProviders.includes(stripped)) {
    return null; // Cannot derive company from generic provider
  }
  
  return stripped;
}

/**
 * Derive a company name from domain
 * e.g., "mueller-elektro.de" -> "Mueller Elektro"
 */
export function deriveCompanyNameFromDomain(domain: string): string {
  if (!domain) return 'Unbekanntes Unternehmen';
  
  // Remove TLD
  const parts = domain.split('.');
  const name = parts.length > 1 ? parts.slice(0, -1).join('.') : domain;
  
  // Replace separators with spaces and title case
  const words = name
    .replace(/[-_\.]/g, ' ')
    .split(' ')
    .filter(w => w.length > 0)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
  
  return words.join(' ') || 'Unbekanntes Unternehmen';
}

/**
 * Create a deterministic document ID from a string
 * Uses SHA256, returns first 20 hex characters
 */
export function deterministicId(str: string): string {
  return crypto.createHash('sha256').update(str).digest('hex').substring(0, 20);
}

/**
 * Extract sender name from email "From" field
 * e.g., "Max Müller <max@example.com>" -> "Max Müller"
 */
export function extractSenderName(from: string): string | null {
  if (!from) return null;
  
  // Pattern: "Name <email>" or just "email"
  const match = from.match(/^([^<]+)\s*</);
  if (match && match[1]) {
    return match[1].trim().replace(/^["']|["']$/g, '');
  }
  
  // If just email, return null
  if (from.includes('@')) {
    return null;
  }
  
  return from.trim() || null;
}

/**
 * Extract email address from "From" field
 */
export function extractSenderEmail(from: string): string {
  if (!from) return '';
  
  // Pattern: "Name <email>" or just "email"
  const match = from.match(/<([^>]+)>/);
  if (match && match[1]) {
    return match[1].trim().toLowerCase();
  }
  
  // If just email
  if (from.includes('@')) {
    return from.trim().toLowerCase();
  }
  
  return '';
}

// ============================================
// INQUIRY DETECTION
// ============================================

// Keywords that indicate a product/service inquiry (German focus)
const INQUIRY_KEYWORDS = [
  // Request patterns
  'anfrage', 'preisanfrage', 'angebot', 'angebotswunsch',
  'könnten sie', 'können sie', 'bitte angebot', 'bitte offerte',
  'interessiert an', 'interesse an', 'benötigen', 'brauchen',
  'suchen wir', 'suchen einen', 'suchen eine',
  
  // Service requests
  'reparatur', 'wartung', 'installation', 'montage',
  'beratung', 'termin', 'besichtigung', 'ortsbegehung',
  
  // Quote requests
  'kostenvoranschlag', 'kva', 'preis', 'kosten',
  'wie teuer', 'was kostet', 'preisliste',
  
  // English equivalents
  'request for quote', 'rfq', 'quotation', 'inquiry',
  'interested in', 'price list', 'estimate',
];

/**
 * Detect if email is a product/service inquiry
 */
export function detectInquiry(subject: string, bodyText: string): { isInquiry: boolean; confidence: number; keywords: string[] } {
  const combinedText = `${subject} ${bodyText}`.toLowerCase();
  const foundKeywords: string[] = [];
  let score = 0;
  
  for (const keyword of INQUIRY_KEYWORDS) {
    if (combinedText.includes(keyword.toLowerCase())) {
      foundKeywords.push(keyword);
      score += 0.15;
    }
  }
  
  // Cap at 0.95
  const confidence = Math.min(score, 0.95);
  
  return {
    isInquiry: confidence >= 0.3,
    confidence,
    keywords: foundKeywords,
  };
}

// ============================================
// CRM UPSERT FUNCTIONS
// ============================================

/**
 * Upsert CRM company from email inquiry
 * Creates new company or updates existing one based on domain match.
 */
export async function upsertCrmCompany(
  concernId: string,
  ownerUid: string,
  candidate: CRMCompanyCandidate,
  emailContext: EmailContext
): Promise<{ companyId: string; isNew: boolean }> {
  const collectionPath = `concerns/${concernId}/crmCompanies`;
  const now = admin.firestore.Timestamp.now();
  
  // Try to find existing company by domain
  let existingDoc: admin.firestore.QueryDocumentSnapshot | null = null;
  
  if (candidate.domain) {
    const domainQuery = await db.collection(collectionPath)
      .where('ownerUid', '==', ownerUid)
      .where('domain', '==', candidate.domain)
      .limit(1)
      .get();
    
    if (!domainQuery.empty) {
      existingDoc = domainQuery.docs[0];
    }
  }
  
  // Fallback: try by email
  if (!existingDoc && candidate.email) {
    const emailQuery = await db.collection(collectionPath)
      .where('ownerUid', '==', ownerUid)
      .where('email', '==', candidate.email.toLowerCase())
      .limit(1)
      .get();
    
    if (!emailQuery.empty) {
      existingDoc = emailQuery.docs[0];
    }
  }
  
  if (existingDoc) {
    // Update existing company
    const existingData = existingDoc.data();
    const currentCount = existingData.inquiryCount || 0;
    
    await safeMergeWrite(existingDoc.ref, sanitizeForFirestore({
      // Only update name if currently empty or derived
      ...((!existingData.name || existingData.name === 'Unbekanntes Unternehmen') && candidate.name
        ? { name: candidate.name }
        : {}),
      // Update inquiry tracking
      lastInquiryAt: emailContext.receivedAt,
      lastInquiryEmailId: emailContext.emailId,
      inquiryCount: currentCount + 1,
      updatedAt: now,
    }), 'CRM:updateCompany');
    
    functions.logger.info('[CRM] Company updated', {
      companyId: existingDoc.id,
      domain: candidate.domain,
      inquiryCount: currentCount + 1,
    });
    
    return { companyId: existingDoc.id, isNew: false };
  }
  
  // Create new company
  const newCompanyData = sanitizeForFirestore({
    concernId,
    ownerUid,
    name: candidate.name,
    domain: candidate.domain,
    email: candidate.email?.toLowerCase() || null,
    phone: candidate.phone || null,
    address: candidate.address || null,
    source: 'email_ai',
    lastInquiryAt: emailContext.receivedAt,
    lastInquiryEmailId: emailContext.emailId,
    inquiryCount: 1,
    linkedCrmAccountId: null,
    createdAt: now,
    updatedAt: now,
  });
  
  const newCompanyRef = await db.collection(collectionPath).add(newCompanyData);
  
  functions.logger.info('[CRM] Company created', {
    companyId: newCompanyRef.id,
    name: candidate.name,
    domain: candidate.domain,
  });
  
  return { companyId: newCompanyRef.id, isNew: true };
}

/**
 * Create CRM inquiry note (idempotent)
 * Uses deterministic doc ID based on emailId to prevent duplicates.
 */
export async function createCrmInquiryNote(
  concernId: string,
  ownerUid: string,
  companyId: string,
  emailContext: EmailContext
): Promise<{ noteId: string; isNew: boolean }> {
  const collectionPath = `concerns/${concernId}/crmNotes`;
  const now = admin.firestore.Timestamp.now();
  
  // Deterministic note ID for idempotency
  const idempotencyKey = `${emailContext.emailId}:crmNote:v1`;
  const noteId = deterministicId(`${concernId}:${ownerUid}:${idempotencyKey}`);
  const noteRef = db.doc(`${collectionPath}/${noteId}`);
  
  // Check if note already exists
  const existingNote = await noteRef.get();
  if (existingNote.exists) {
    functions.logger.info('[CRM] Note already exists (idempotent)', {
      noteId,
      emailId: emailContext.emailId.substring(0, 8),
    });
    return { noteId, isNew: false };
  }
  
  // Format note body (German)
  const summaryText = emailContext.summaryBullets?.length 
    ? emailContext.summaryBullets.join('\n• ')
    : 'Keine Zusammenfassung verfügbar.';
  
  const extractedHints: string[] = [];
  if (emailContext.extracted?.projectNumber) {
    extractedHints.push(`Projektnummer: ${emailContext.extracted.projectNumber}`);
  }
  if (emailContext.extracted?.requestNumber) {
    extractedHints.push(`Anfrage-Nr.: ${emailContext.extracted.requestNumber}`);
  }
  if (emailContext.extracted?.phone) {
    extractedHints.push(`Telefon: ${emailContext.extracted.phone}`);
  }
  if (emailContext.extracted?.keywords?.length) {
    extractedHints.push(`Stichworte: ${emailContext.extracted.keywords.join(', ')}`);
  }
  
  const receivedDate = emailContext.receivedAt.toDate().toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  
  const noteBody = `📧 **E-Mail-Anfrage eingegangen**

**Absender:** ${emailContext.senderName ? `${emailContext.senderName} <${emailContext.senderEmail}>` : emailContext.senderEmail}
**Betreff:** ${emailContext.subject}
**Datum:** ${receivedDate}

---

**Zusammenfassung (KI):**
• ${summaryText}

**Erkannt als:** Produkt-/Dienstleistungsanfrage
**KI-Konfidenz:** ${Math.round(emailContext.confidence * 100)}%

${extractedHints.length > 0 ? `**Extrahierte Hinweise:**
${extractedHints.map(h => `• ${h}`).join('\n')}` : ''}

---
_E-Mail-ID: ${emailContext.emailId}_`;

  const noteData = sanitizeForFirestore({
    concernId,
    ownerUid,
    companyId,
    type: 'email_inquiry',
    title: `E-Mail-Anfrage: ${emailContext.subject.substring(0, 80)}`,
    body: noteBody,
    emailId: emailContext.emailId,
    messageKey: emailContext.messageKey || null,
    providerMessageId: emailContext.providerMessageId || null,
    receivedAt: emailContext.receivedAt,
    senderEmail: emailContext.senderEmail,
    senderName: emailContext.senderName || null,
    subject: emailContext.subject,
    ai: {
      confidence: emailContext.confidence,
      classification: emailContext.classification,
      extracted: emailContext.extracted || null,
    },
    idempotencyKey,
    createdAt: now,
    updatedAt: now,
  });
  
  await noteRef.set(noteData);
  
  functions.logger.info('[CRM] Inquiry note created', {
    noteId,
    companyId,
    emailId: emailContext.emailId.substring(0, 8),
  });
  
  return { noteId, isNew: true };
}

/**
 * Create Email Inquiry record (idempotent)
 * This represents an incoming product/service request that can be triaged.
 * Uses deterministic doc ID based on emailId to prevent duplicates.
 * 
 * NOTE: CRM company/note IDs are now optional and set to null initially.
 * They are populated at conversion time when user clicks "Angebot erstellen".
 */
export async function createEmailInquiry(
  concernId: string,
  ownerUid: string,
  companyId: string | null, // Now optional - set at conversion time
  noteId: string | null,     // Now optional - set at conversion time
  emailContext: EmailContext,
  companyName: string
): Promise<{ inquiryId: string; isNew: boolean }> {
  const collectionPath = `concerns/${concernId}/emailInquiries`;
  const now = admin.firestore.Timestamp.now();
  
  // Deterministic inquiry ID for idempotency
  const idempotencyKey = `${emailContext.emailId}:inquiry:v1`;
  const inquiryId = deterministicId(`${concernId}:${ownerUid}:${idempotencyKey}`);
  const inquiryRef = db.doc(`${collectionPath}/${inquiryId}`);
  
  // Check if inquiry already exists
  const existingInquiry = await inquiryRef.get();
  if (existingInquiry.exists) {
    functions.logger.info('[CRM] Email inquiry already exists (idempotent)', {
      inquiryId,
      emailId: emailContext.emailId.substring(0, 8),
    });
    return { inquiryId, isNew: false };
  }
  
  // Build AI summary
  const aiSummary = emailContext.summaryBullets?.length
    ? emailContext.summaryBullets
    : [`Anfrage von ${emailContext.senderName || emailContext.senderEmail}`];
  
  const inquiryData = sanitizeForFirestore({
    concernId,
    ownerUid,
    title: emailContext.subject.substring(0, 200),
    senderEmail: emailContext.senderEmail,
    senderName: emailContext.senderName || null,
    companyName: companyName,
    source: 'email_ai',
    status: 'new',
    emailId: emailContext.emailId,
    messageKey: emailContext.messageKey || null,
    crmCompanyId: companyId,  // null initially, set at conversion
    crmNoteId: noteId,        // null initially, set at conversion
    extracted: emailContext.extracted || null,
    aiConfidence: emailContext.confidence,
    aiSummary: aiSummary,
    projectId: null,
    projectNumber: emailContext.extracted?.projectNumber || null,
    convertedToQuoteId: null,
    convertedToOpportunityId: null,
    receivedAt: emailContext.receivedAt,
    subject: emailContext.subject,
    idempotencyKey,
    createdAt: now,
    updatedAt: now,
  });
  
  await inquiryRef.set(inquiryData);
  
  functions.logger.info('[CRM] Email inquiry created', {
    inquiryId,
    companyId,
    emailId: emailContext.emailId.substring(0, 8),
    subject: emailContext.subject.substring(0, 30),
  });
  
  return { inquiryId, isNew: true };
}

/**
 * Main CRM integration function for email pipeline
 * Called after spam check passes and routing signals are computed.
 */
export async function processCrmIntegration(
  concernId: string,
  ownerUid: string,
  emailData: {
    emailId: string;
    messageKey?: string;
    providerMessageId?: string;
    from: string;
    subject: string;
    bodyText: string;
    receivedAt: admin.firestore.Timestamp;
    summaryBullets?: string[];
  },
  routingSignals?: {
    confidence?: number;
    projectRefs?: string[];
    keywords?: string[];
  }
): Promise<CRMUpsertResult | null> {
  const MIN_INQUIRY_CONFIDENCE = 0.3;
  
  // Detect if this is an inquiry
  const inquiry = detectInquiry(emailData.subject, emailData.bodyText);
  
  if (!inquiry.isInquiry || inquiry.confidence < MIN_INQUIRY_CONFIDENCE) {
    functions.logger.debug('[CRM] Email not classified as inquiry', {
      emailId: emailData.emailId.substring(0, 8),
      confidence: inquiry.confidence,
    });
    return null;
  }
  
  // Extract sender info
  const senderEmail = extractSenderEmail(emailData.from);
  const senderName = extractSenderName(emailData.from);
  const domain = normalizeEmailDomain(senderEmail);
  
  // Build company candidate
  const companyName = domain 
    ? deriveCompanyNameFromDomain(domain)
    : (senderName || 'Unbekannter Absender');
  
  const companyCandidate: CRMCompanyCandidate = {
    name: companyName,
    domain,
    email: senderEmail,
  };
  
  // Build email context
  const emailContext: EmailContext = {
    emailId: emailData.emailId,
    messageKey: emailData.messageKey,
    providerMessageId: emailData.providerMessageId,
    subject: emailData.subject,
    senderEmail,
    senderName: senderName || undefined,
    receivedAt: emailData.receivedAt,
    summaryBullets: emailData.summaryBullets,
    classification: 'anfrage',
    confidence: inquiry.confidence,
    extracted: {
      projectNumber: routingSignals?.projectRefs?.[0],
      keywords: inquiry.keywords,
    },
  };
  
  // ==========================================================
  // REFACTORED: Only create EmailInquiry at pipeline time
  // CRM Company + Note are created at CONVERSION time
  // (when user clicks "Angebot erstellen" in Sales portal)
  // ==========================================================
  
  // Create email inquiry record for triage (no CRM company/note yet)
  const inquiryResult = await createEmailInquiry(
    concernId,
    ownerUid,
    null,  // CRM company ID - set at conversion
    null,  // CRM note ID - set at conversion
    emailContext,
    companyName
  );
  
  functions.logger.info('[CRM] Inquiry created (CRM records deferred to conversion)', {
    emailId: emailData.emailId.substring(0, 8),
    inquiryId: inquiryResult.inquiryId,
    companyName,
    senderEmail,
  });
  
  return {
    companyId: '',  // Empty - not created at pipeline time
    noteId: '',     // Empty - not created at pipeline time
    isNewCompany: false,
    isNewNote: false,
    inquiryId: inquiryResult.inquiryId,
    isNewInquiry: inquiryResult.isNew,
  };
}

