/**
 * Email Pipeline Types
 * 
 * Types for the gated email analysis pipeline:
 * 1. Spam check (gate)
 * 2. Companion document detection
 * 3. Document analysis (reuses existing Dokumentenverwaltung KI)
 * 4. Procurement record creation
 */

import { Timestamp } from 'firebase/firestore';

// Pipeline version for idempotency
export const PIPELINE_ANALYSIS_VERSION = 1;

/**
 * Pipeline states - ordered by processing progress
 */
export type PipelineState = 
  | 'pending'           // Not yet processed
  | 'spam_checked'      // Spam check completed
  | 'stopped_spam'      // Stopped because it's spam
  | 'companions_detected' // Companion documents detected
  | 'docs_analyzed'     // Documents analyzed
  | 'routed'            // Routing completed
  | 'procurement_created' // Procurement records created (if applicable)
  | 'completed'         // Pipeline completed
  | 'error';            // Error during processing

/**
 * Spam check result
 */
export interface SpamCheckResult {
  isSpam: boolean;
  score: number; // 0-1, higher = more likely spam
  reasons: string[];
  checkedAt: Timestamp | Date;
  checkedBy: 'rule-based' | 'llm' | 'hybrid';
}

/**
 * Companion document - attachments or linked documents
 */
export interface CompanionDocument {
  kind: 'attachment' | 'link' | 'thread';
  ref: string; // Storage path, URL, or messageKey
  filename?: string;
  mimeType?: string;
  size?: number;
  hash?: string; // For deduplication
  
  // After document analysis
  analysisId?: string;
  analysisResult?: {
    type: string;
    confidence: number;
    extractedData?: Record<string, any>;
  };
}

/**
 * Routing signals detected in email
 */
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

/**
 * Derived record reference - links email to created records
 */
export interface DerivedRecordRef {
  type: 'procurementOffer' | 'document' | 'supplierInvoice' | 'supplierDelivery';
  id: string;
  createdAt: Timestamp | Date;
}

/**
 * Full pipeline state stored on email document
 */
export interface EmailPipelineData {
  pipelineState: PipelineState;
  pipelineVersion: number;
  idempotencyKey: string;
  
  // Spam check result
  spam?: SpamCheckResult;
  
  // Companion documents
  companions?: CompanionDocument[];
  
  // Routing signals
  routing?: RoutingSignals;
  
  // Derived records
  derivedRecords?: DerivedRecordRef[];
  
  // Processing timestamps
  startedAt?: Timestamp | Date;
  completedAt?: Timestamp | Date;
  
  // Error info
  error?: {
    message: string;
    phase: PipelineState;
    at: Timestamp | Date;
  };
}

/**
 * Email-derived procurement offer
 * Collection: procurementOffers/{id}
 * 
 * Created when an email is detected as an Anfrage response (supplier offer)
 */
export interface ProcurementOffer {
  id: string;
  concernId: string;
  ownerUid: string;
  
  // Source
  source: 'email_ai' | 'manual';
  sourceEmailId?: string;
  sourceMessageKey?: string;
  sourceAccountId?: string;
  
  // Status workflow
  status: ProcurementOfferStatus;
  
  // Supplier info (extracted or linked)
  supplierId?: string;
  supplierName?: string;
  supplierEmail?: string;
  
  // Linked Anfrage (if matched)
  linkedRequestId?: string;
  linkedRequestNumber?: string;
  
  // Linked project
  projectId?: string;
  projectNumber?: string;
  projectName?: string;
  
  // AI extracted data
  aiSummary?: string[];
  aiConfidence?: number;
  extractedData?: {
    offerNumber?: string;
    offerDate?: string;
    validUntil?: string;
    totalNet?: number;
    totalGross?: number;
    currency?: string;
    items?: Array<{
      description: string;
      quantity?: number;
      unit?: string;
      unitPrice?: number;
      total?: number;
    }>;
  };
  
  // Attachments (document refs)
  attachmentRefs?: Array<{
    documentId: string;
    filename: string;
    storagePath: string;
  }>;
  
  // Metadata
  receivedAt: Timestamp | Date;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
  
  // Workflow actions
  reviewedBy?: string;
  reviewedAt?: Timestamp | Date;
  notes?: string;
}

export type ProcurementOfferStatus = 
  | 'neu'           // Newly detected
  | 'in_pruefung'   // Under review
  | 'zugeordnet'    // Assigned to Anfrage
  | 'uebernommen'   // Converted to purchase order
  | 'abgelehnt'     // Rejected
  | 'archiviert';   // Archived

export const PROCUREMENT_OFFER_STATUS_LABELS: Record<ProcurementOfferStatus, string> = {
  neu: 'Neu',
  in_pruefung: 'In Prüfung',
  zugeordnet: 'Zugeordnet',
  uebernommen: 'Übernommen',
  abgelehnt: 'Abgelehnt',
  archiviert: 'Archiviert',
};

export const PROCUREMENT_OFFER_STATUS_COLORS: Record<ProcurementOfferStatus, { bg: string; text: string }> = {
  neu: { bg: 'bg-blue-100', text: 'text-blue-700' },
  in_pruefung: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  zugeordnet: { bg: 'bg-purple-100', text: 'text-purple-700' },
  uebernommen: { bg: 'bg-green-100', text: 'text-green-700' },
  abgelehnt: { bg: 'bg-red-100', text: 'text-red-700' },
  archiviert: { bg: 'bg-gray-100', text: 'text-gray-700' },
};

/**
 * Spam detection keywords and patterns
 */
export const SPAM_KEYWORDS = [
  // German
  'newsletter', 'abmelden', 'unsubscribe', 'werbung', 'angebot des tages',
  'jetzt kaufen', 'rabatt', 'sonderangebot', 'gratis', 'gewinnspiel',
  'lottery', 'prize', 'winner', 'congratulations',
  // English
  'click here', 'act now', 'limited time', 'special offer', 'free trial',
  'discount', 'promotion', 'deal', 'sale',
  // Common spam patterns
  'no-reply', 'noreply', 'do-not-reply', 'mailer-daemon',
];

/**
 * Procurement-related keywords for routing
 */
export const PROCUREMENT_KEYWORDS = {
  anfrage: ['anfrage', 'angebot', 'quotation', 'rfq', 'request for quote', 'preisanfrage'],
  invoice: ['rechnung', 'invoice', 'faktura', 'bill'],
  delivery: ['lieferschein', 'lieferung', 'delivery note', 'wareneingang'],
  order: ['bestellung', 'order', 'purchase order', 'po', 'auftrag'],
};



