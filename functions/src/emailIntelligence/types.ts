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

export interface EmailAccount {
  orgId: string;
  provider: EmailProvider;
  emailAddress: string;
  oauthRef: string;
  syncState?: {
    historyId?: string;
    deltaToken?: string;
    lastSyncedAt?: Timestamp;
  };
  active: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface IncomingEmail {
  orgId: string;
  accountId: string;
  provider: EmailProvider;
  providerMessageId: string;
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
  emailId: string;
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


