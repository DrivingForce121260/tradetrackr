/**
 * Canonical Message Management
 * 
 * Handles concern-scoped email deduplication.
 * Same email received by multiple users is stored once.
 */

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { computeMessageKey, MessageKeyInput } from './messageKey';
import { sanitizeForFirestore, normalizeEmailString, normalizeArray } from '../utils/sanitizeForFirestore';

const db = admin.firestore();

// Analysis status enum
export type AnalysisStatus = 'none' | 'queued' | 'processing' | 'done' | 'error';

// Current analysis version - increment when AI model/logic changes
export const CURRENT_ANALYSIS_VERSION = 1;

// Analysis error structure
export interface AnalysisError {
  message: string;
  code?: string;
  at: admin.firestore.Timestamp;
}

// Analysis lock structure
export interface AnalysisLock {
  lockedBy: string;
  lockedAt: admin.firestore.Timestamp;
  expiresAt: admin.firestore.Timestamp;
}

// Analysis state structure
export interface AnalysisState {
  status: AnalysisStatus;
  version: number;                    // CURRENT_ANALYSIS_VERSION
  lastEventId?: string;               // Idempotency marker
  updatedAt: admin.firestore.Timestamp;
  model?: string;
  error?: AnalysisError | null;
  retryCount?: number;
}

// Reply status enum
export type ReplyState = 'none' | 'drafted' | 'sent' | 'failed';

// Reply draft structure
export interface ReplyDraft {
  subject: string;
  body: string;
  bodyHtml?: string;
  to: string[];
  cc?: string[];
  createdAt: admin.firestore.Timestamp;
  createdBy: string;  // uid
  model?: string;
  version?: number;
  tone?: 'neutral' | 'friendly' | 'formal';
  language?: 'de' | 'en';
}

// Reply status structure
export interface ReplyStatus {
  state: ReplyState;
  updatedAt: admin.firestore.Timestamp;
  updatedBy: string;  // uid
  replyId?: string;   // Reference to emailReplies collection (legacy)
  error?: {
    message: string;
    at: admin.firestore.Timestamp;
  } | null;
}

// Reply workflow structure
export interface ReplyWorkflow {
  draft?: ReplyDraft | null;
  status?: ReplyStatus | null;
}

// Canonical message document structure
export interface CanonicalMessage {
  messageKey: string;
  concernId: string;
  providerMessageId?: string | null;
  from: {
    name?: string;
    email: string;
  };
  to: string[];
  cc?: string[];
  subject: string;
  date: admin.firestore.Timestamp;
  snippet: string;
  bodyHash?: string;
  attachmentsCount: number;
  
  // Analysis state (production-hardened)
  analysis: AnalysisState;
  
  // Analysis lock for concurrency safety
  analysisLock?: AnalysisLock | null;
  
  // Analysis result (populated when done)
  analysisResult?: {
    summary: string[];
    category: string;
    priority: string;
    intent?: string;
    entities?: Record<string, unknown>;
    suggestedActions?: string[];
    confidence?: number;
  } | null;
  
  // Reply workflow (draft + status)
  reply?: ReplyWorkflow | null;
  
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
}

// User inbox item - links user to canonical message
export interface UserInboxItem {
  id: string;
  concernId: string;
  ownerUid: string;
  messageKey: string;
  accountId: string;
  
  // User-specific state
  folder: string;
  unread: boolean;
  flagged: boolean;
  archived: boolean;
  deleted: boolean;
  
  // User-specific metadata
  assignedTo?: string | null;
  labels?: string[];
  notes?: string;
  
  // Timestamps
  receivedAt: admin.firestore.Timestamp;
  readAt?: admin.firestore.Timestamp | null;
  archivedAt?: admin.firestore.Timestamp | null;
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
}

// Input for creating/updating canonical message
export interface UpsertCanonicalInput {
  concernId: string;
  providerMessageId?: string | null;
  from: string;
  fromName?: string;
  to: string[];
  cc?: string[];
  subject: string;
  date: Date;
  bodyText?: string | null;
  bodyHtml?: string | null;
  snippet?: string;
  attachmentsCount?: number;
}

/**
 * Upsert a canonical message
 * Creates if not exists, updates metadata if exists
 * Returns the messageKey
 */
export async function upsertCanonicalMessage(
  input: UpsertCanonicalInput
): Promise<{ messageKey: string; isNew: boolean }> {
  const { 
    concernId, 
    providerMessageId, 
    from, 
    fromName, 
    to, 
    cc,
    subject, 
    date, 
    bodyText, 
    bodyHtml, 
    snippet,
    attachmentsCount 
  } = input;

  // Compute deterministic messageKey
  const messageKeyInput: MessageKeyInput = {
    messageId: providerMessageId,
    from,
    subject,
    date,
    bodyText,
    bodyHtml,
  };
  const messageKey = computeMessageKey(messageKeyInput);

  const messageRef = db.doc(`concerns/${concernId}/emailMessages/${messageKey}`);
  const now = admin.firestore.Timestamp.now();

  let isNew = false;

  await db.runTransaction(async (transaction) => {
    const messageDoc = await transaction.get(messageRef);

    if (messageDoc.exists) {
      // Message already exists - just update timestamp
      transaction.update(messageRef, {
        updatedAt: now,
      });
      isNew = false;
    } else {
      // Create new canonical message
      // IMPORTANT: Never use `undefined` in Firestore - use null or omit
      const fromField: { name?: string; email: string } = {
        email: normalizeEmailString(from, 'unknown'),
      };
      // Only add name if it's truthy
      if (fromName) {
        fromField.name = fromName;
      }

      const newMessage: CanonicalMessage = {
        messageKey,
        concernId,
        providerMessageId: providerMessageId || null,
        from: fromField,
        to: normalizeArray(to),
        cc: normalizeArray(cc),
        subject: normalizeEmailString(subject, '(Kein Betreff)'),
        date: admin.firestore.Timestamp.fromDate(date),
        snippet: normalizeEmailString(snippet, ''),
        attachmentsCount: attachmentsCount || 0,
        analysis: {
          status: 'none',
          version: 0, // Will be set to CURRENT_ANALYSIS_VERSION when analysis runs
          updatedAt: now,
          retryCount: 0,
        },
        analysisLock: null,
        analysisResult: null,
        createdAt: now,
        updatedAt: now,
      };

      const safeMessage = sanitizeForFirestore(newMessage);
      transaction.set(messageRef, safeMessage);
      isNew = true;
    }
  });

  functions.logger.info('upsertCanonicalMessage', {
    concernId,
    messageKey: messageKey.substring(0, 8),
    isNew,
  });

  return { messageKey, isNew };
}

/**
 * Create or update a user inbox item
 * Links user to canonical message
 */
export async function upsertUserInboxItem(
  concernId: string,
  uid: string,
  accountId: string,
  messageKey: string,
  receivedAt: Date,
  folder: string = 'INBOX'
): Promise<string> {
  // Use accountId + messageKey as deterministic ID to prevent duplicates
  const inboxItemId = `${accountId}_${messageKey}`;
  
  const inboxRef = db.doc(
    `concerns/${concernId}/users/${uid}/emailInbox/${inboxItemId}`
  );
  const now = admin.firestore.Timestamp.now();

  await db.runTransaction(async (transaction) => {
    const inboxDoc = await transaction.get(inboxRef);

    if (inboxDoc.exists) {
      // Already exists - update timestamp
      transaction.update(inboxRef, {
        updatedAt: now,
      });
    } else {
      // Create new inbox item
      const newItem: UserInboxItem = {
        id: inboxItemId,
        concernId,
        ownerUid: uid,
        messageKey,
        accountId,
        folder,
        unread: true,
        flagged: false,
        archived: false,
        deleted: false,
        receivedAt: admin.firestore.Timestamp.fromDate(receivedAt),
        createdAt: now,
        updatedAt: now,
      };

      const safeItem = sanitizeForFirestore(newItem);
      transaction.set(inboxRef, safeItem);
    }
  });

  functions.logger.info('upsertUserInboxItem', {
    concernId,
    uid: uid.substring(0, 8),
    accountId: accountId.substring(0, 8),
    messageKey: messageKey.substring(0, 8),
  });

  return inboxItemId;
}

/**
 * Get canonical message by messageKey
 */
export async function getCanonicalMessage(
  concernId: string,
  messageKey: string
): Promise<CanonicalMessage | null> {
  const messageRef = db.doc(`concerns/${concernId}/emailMessages/${messageKey}`);
  const doc = await messageRef.get();
  
  if (!doc.exists) {
    return null;
  }
  
  return doc.data() as CanonicalMessage;
}

/**
 * Get multiple canonical messages by messageKeys
 */
export async function getCanonicalMessages(
  concernId: string,
  messageKeys: string[]
): Promise<Map<string, CanonicalMessage>> {
  const result = new Map<string, CanonicalMessage>();
  
  if (messageKeys.length === 0) {
    return result;
  }

  // Batch fetch (Firestore in query max 30 items)
  const batches: string[][] = [];
  for (let i = 0; i < messageKeys.length; i += 30) {
    batches.push(messageKeys.slice(i, i + 30));
  }

  for (const batch of batches) {
    const refs = batch.map(key => 
      db.doc(`concerns/${concernId}/emailMessages/${key}`)
    );
    const docs = await db.getAll(...refs);
    
    for (const doc of docs) {
      if (doc.exists) {
        const data = doc.data() as CanonicalMessage;
        result.set(data.messageKey, data);
      }
    }
  }

  return result;
}

