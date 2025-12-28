/**
 * Email Intelligence Agent - Type Definitions
 * Types for Cloud Functions (backend)
 */

import { Timestamp } from 'firebase-admin/firestore';

export type EmailProvider = 'gmail' | 'm365' | 'imap';

export type EmailCategory = 
  | 'INVOICE' 
  | 'ORDER' 
  | 'SHIPPING' 
  | 'CLAIM' 
  | 'COMPLAINT' 
  | 'KYC' 
  | 'GENERAL' 
  | 'SPAM';

export type EmailPriority = 'high' | 'normal' | 'low';
export type EmailSummaryStatus = 'open' | 'in_progress' | 'done';

export type DocumentType = 
  | 'INVOICE' 
  | 'PO' 
  | 'CONTRACT' 
  | 'ID' 
  | 'OTHER';

export type EmailAccountStatus = 'active' | 'disabled' | 'error';

export interface EmailAccount {
  // Identity
  concernId: string;           // Same as orgId for compatibility
  orgId: string;               // Legacy field, kept for compatibility
  ownerUid: string;            // REQUIRED: Owner user ID
  
  // Provider info
  provider: EmailProvider;
  emailAddress: string;
  emailKey?: string;           // Sanitized key for uniqueness checks
  oauthRef: string;            // Reference to OAuth credentials
  
  // Sync state
  syncState?: {
    historyId?: string;
    deltaToken?: string;
    lastSyncedAt?: Timestamp;
    messageCount?: number;
  };
  lastSyncAt?: Timestamp;
  
  // Status
  status: EmailAccountStatus;
  active: boolean;             // Legacy, use status instead
  
  // Sharing (optional)
  sharedWithUids?: string[];   // Users who have shared access
  
  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
  deletedAt?: Timestamp | null; // Soft delete
}

export interface IncomingEmail {
  orgId: string;
  accountId: string;
  provider: EmailProvider;
  providerMessageId: string;
  messageKey?: string; // Link to canonical message
  threadId: string;
  from: string;
  to: string[];
  cc: string[];
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  receivedAt: Timestamp;
  hasAttachments: boolean;
  category?: EmailCategory;
  categoryConfidence?: number;
  processed: boolean;
  createdAt: Timestamp;
}

export interface EmailAttachment {
  orgId: string;
  emailId: string;
  messageKey?: string; // Link to canonical message
  fileName: string;
  mimeType: string;
  storagePath: string;
  docType?: DocumentType;
  metadata?: Record<string, any>;
  linkedDocumentId?: string;
  createdAt: Timestamp;
}

export interface EmailSummary {
  orgId: string;
  accountId?: string; // Link to email account for user filtering
  messageKey?: string; // Link to canonical message
  emailId: string;
  // HARDENED: ownerUid for security scoping - required for new docs
  ownerUid?: string | null;
  category: EmailCategory;
  summaryBullets: string[];
  priority: EmailPriority;
  status: EmailSummaryStatus;
  assignedTo?: string | null;
  archived?: boolean;
  archivedAt?: Timestamp;
  archivedBy?: string;
  isNew?: boolean;
  readAt?: Timestamp;
  createdAt: Timestamp;
}

export interface NormalizedEmail {
  orgId: string;
  accountId: string;
  ownerUid?: string; // Owner user ID - required for user-scoped storage
  provider: EmailProvider;
  providerMessageId: string;
  threadId: string;
  from: string;
  to: string[];
  cc: string[];
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  receivedAt: Date;
  attachments: NormalizedAttachment[];
  headers?: Record<string, string>; // Email headers (for Message-ID extraction)
}

export interface NormalizedAttachment {
  fileName: string;
  mimeType: string;
  data: Buffer;
  size: number;
}

export interface EmailConnectorSyncState {
  historyId?: string;
  deltaToken?: string;
  lastSyncedAt?: Timestamp;
}

export interface EmailConnector {
  fetchNewMessages(params: EmailConnectorSyncState): Promise<NormalizedEmail[]>;
  parseWebhook(req: any): Promise<NormalizedEmail[]>;
}

export interface LLMAnalysisResult {
  category: EmailCategory;
  confidence: number;
  document_types: DocumentType[];
  summary_bullets: string[];
  priority: EmailPriority;
}

export type EmailReplyStatus = 
  | 'draft' 
  | 'generated' 
  | 'edited' 
  | 'sending' 
  | 'sent' 
  | 'send_failed';

export interface EmailReply {
  concernId: string;
  emailId: string;
  accountId: string;
  provider: EmailProvider;
  
  threadId?: string;
  providerMessageId?: string;
  providerDraftId?: string;
  providerSentId?: string;
  
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  
  status: EmailReplyStatus;
  lastError?: string | null;
  
  generatedBy: {
    model: string;
    temperature: number;
  } | null;
  
  createdBy: string;
  updatedBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  
  history: Array<{
    at: Timestamp;
    by: string;
    action: 'generated' | 'edited' | 'sent' | 'failed';
    note?: string;
  }>;
}

export interface LLMReplyGenerationResult {
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  to: string[];
  cc: string[];
}


