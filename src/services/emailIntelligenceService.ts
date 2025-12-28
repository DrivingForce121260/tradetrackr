/**
 * Email Intelligence Service
 * Handles Firestore operations for Email Intelligence Agent
 * 
 * NEW: Supports canonical message deduplication.
 * Emails are stored concern-wide with single AI analysis.
 * User inbox items link to canonical messages.
 */

import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  doc as docRef, 
  getDoc,
  updateDoc,
  getDocs,
  Timestamp,
  QueryConstraint,
  DocumentData,
} from 'firebase/firestore';
import { db, functionsEU } from '@/config/firebase';
import { httpsCallable } from 'firebase/functions';
import { 
  EmailSummary, 
  IncomingEmail, 
  EmailAttachment,
  EmailCategory,
  EmailSummaryStatus,
  EmailPriority,
} from '@/types/email';

// Reply state enum
export type ReplyState = 'none' | 'drafted' | 'sent' | 'failed';

// Reply draft structure
export interface ReplyDraft {
  subject: string;
  body: string;
  bodyHtml?: string;
  to: string[];
  cc?: string[];
  createdAt: { toDate: () => Date };
  createdBy: string;
  model?: string;
  tone?: 'neutral' | 'friendly' | 'formal';
  language?: 'de' | 'en';
}

// Reply status structure
export interface ReplyStatus {
  state: ReplyState;
  updatedAt: { toDate: () => Date };
  updatedBy: string;
  replyId?: string;
  error?: {
    message: string;
    at: { toDate: () => Date };
  } | null;
}

// Canonical message structure (from backend)
export interface CanonicalMessage {
  messageKey: string;
  concernId: string;
  providerMessageId?: string | null;
  from: { name?: string; email: string };
  to: string[];
  subject: string;
  date: { toDate: () => Date };
  snippet: string;
  attachmentsCount: number;
  analysis: {
    status: 'none' | 'queued' | 'processing' | 'done' | 'error';
    updatedAt: { toDate: () => Date };
    error?: string;
  };
  analysisResult?: {
    summary: string[];
    category: string;
    priority: string;
    intent?: string;
    suggestedActions?: string[];
    confidence?: number;
  } | null;
  // Reply workflow
  reply?: {
    draft?: ReplyDraft | null;
    status?: ReplyStatus | null;
  } | null;
}

// User inbox item structure
export interface UserInboxItem {
  id: string;
  concernId: string;
  ownerUid: string;
  messageKey: string;
  accountId: string;
  folder: string;
  unread: boolean;
  flagged: boolean;
  archived: boolean;
  deleted: boolean;
  receivedAt: { toDate: () => Date };
  readAt?: { toDate: () => Date } | null;
  archivedAt?: { toDate: () => Date } | null;
  createdAt: { toDate: () => Date };
}

/**
 * Calculate the date for 30 days ago (approximately 1 month)
 * Shows emails from the last month
 */
function getThirtyDaysAgo(): Date {
  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  
  // Go back 30 calendar days
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  // Set to start of day (00:00:00)
  thirtyDaysAgo.setHours(0, 0, 0, 0);
  
  return thirtyDaysAgo;
}

/**
 * Subscribe to email summaries for a user within an organization.
 * 
 * @deprecated Use subscribeToUserInbox() instead for canonical message support.
 * This function reads from the legacy emailSummaries collection.
 * It will be removed once all clients migrate to canonical messages.
 * 
 * IMPORTANT: Summaries are filtered by the user's owned email accounts.
 * This ensures users only see emails from their own accounts.
 */
export function subscribeToEmailSummaries(
  orgId: string,
  filters: {
    category?: EmailCategory;
    status?: EmailSummaryStatus;
    priority?: EmailPriority;
    uid?: string; // User ID - REQUIRED for security scoping
  },
  callback: (summaries: EmailSummary[]) => void
): () => void {
  // SECURITY: Always require uid for proper scoping
  if (!filters.uid) {
    console.error('📧 [emailIntelligenceService] SECURITY: uid is required for subscribeToEmailSummaries');
    callback([]);
    return () => {};
  }

  const constraints: QueryConstraint[] = [
    where('orgId', '==', orgId),
  ];

  // HARDENED: Always filter by ownerUid at query level (primary security)
  // This ensures users only see their own email summaries
  constraints.push(where('ownerUid', '==', filters.uid));
  console.debug('📧 [emailIntelligenceService] Query with ownerUid:', filters.uid.substring(0, 8));

  // Only fetch emails from the last 30 days (approximately 1 month)
  const thirtyDaysAgo = getThirtyDaysAgo();
  const cutoffTimestamp = Timestamp.fromDate(thirtyDaysAgo);
  console.log('📅 [Smart Inbox] Filtering emails from last 30 days:', thirtyDaysAgo.toLocaleDateString('de-DE'));
  constraints.push(where('createdAt', '>=', cutoffTimestamp));

  // Filter archived emails unless explicitly requested
  // For archived view, only show archived; for normal view, show non-archived or missing field
  if (filters.status === 'archived' as any) {
    constraints.push(where('archived', '==', true));
  }
  // Don't add where clause for non-archived to support legacy summaries without archived field

  if (filters.category) {
    constraints.push(where('category', '==', filters.category));
  }
  if (filters.status && filters.status !== 'archived' as any) {
    constraints.push(where('status', '==', filters.status));
  }
  if (filters.priority) {
    constraints.push(where('priority', '==', filters.priority));
  }

  constraints.push(orderBy('createdAt', 'desc'));

  const q = query(collection(db, 'emailSummaries'), ...constraints);

  // ownedAccountIds is now a secondary optimization, not security boundary
  let ownedAccountIds: Set<string> | null = null;

  return onSnapshot(q, async (snapshot) => {
    // Load user's owned account IDs for additional filtering (optimization)
    if (!ownedAccountIds) {
      try {
        const userAccountsRef = collection(db, `concerns/${orgId}/users/${filters.uid}/emailAccounts`);
        const userAccountsSnap = await getDocs(userAccountsRef);
        ownedAccountIds = new Set(userAccountsSnap.docs.map(doc => doc.id));
        console.log('📧 [emailIntelligenceService] User owns accounts:', Array.from(ownedAccountIds));
      } catch (err) {
        console.error('Failed to load user owned accounts:', err);
        ownedAccountIds = new Set();
      }
    }

    // Filter out archived emails in client if not showing archived view
    let docs = snapshot.docs;
    if (filters.status !== 'archived' as any) {
      docs = docs.filter(doc => {
        const data = doc.data();
        return !data.archived; // Filter out archived, keep those without field (legacy)
      });
    }

    // Secondary filter by owned accounts (for legacy docs without ownerUid)
    if (ownedAccountIds && ownedAccountIds.size > 0) {
      docs = docs.filter(doc => {
        const data = doc.data();
        // Already filtered by ownerUid at query level, but also check accountId for legacy
        return ownedAccountIds!.has(data.accountId) || data.ownerUid === filters.uid;
      });
      console.log(`📧 [emailIntelligenceService] Filtered to ${docs.length} emails for user's accounts`);
    }

    // Get summaries with email details
    const summariesWithDetails = await Promise.all(
      docs.map(async (doc) => {
        const data = doc.data();
        
        // Get email details to show from/to/subject in list
        let emailFrom = 'Unbekannter Absender';
        let emailTo = '';
        let emailSubject = '(Kein Betreff)';

        try {
          const emailDocReference = docRef(db, 'emails', data.emailId);
          const emailDoc = await getDoc(emailDocReference);
          if (emailDoc.exists()) {
            const emailData = emailDoc.data();
            emailFrom = emailData.from || emailFrom;
            emailTo = Array.isArray(emailData.to) ? emailData.to[0] : (emailData.to || '');
            emailSubject = emailData.subject || emailSubject;
          } else {
            console.warn(`Email ${data.emailId} not found in emails collection`);
          }
        } catch (error: any) {
          console.error(`Could not load email details for ${data.emailId}:`, error.code, error.message);
        }
        
        return {
          id: doc.id,
          orgId: data.orgId,
          emailId: data.emailId,
          accountId: data.accountId, // Include accountId for filtering
          category: data.category,
          summaryBullets: data.summaryBullets || [],
          priority: data.priority,
          status: data.status,
          assignedTo: data.assignedTo || null,
          createdAt: data.createdAt?.toDate() || new Date(),
          archived: data.archived || false,
          archivedAt: data.archivedAt?.toDate(),
          archivedBy: data.archivedBy,
          isNew: data.isNew || false,
          readAt: data.readAt?.toDate(),
          // Add email metadata for display
          emailFrom,
          emailTo,
          emailSubject,
        };
      })
    );
    
    callback(summariesWithDetails as any);
  });
}

/**
 * Get email details by ID
 */
export async function getEmailDetails(emailId: string): Promise<IncomingEmail | null> {
  try {
    const emailDocReference = docRef(db, 'emails', emailId);
    const emailDoc = await getDoc(emailDocReference);
    
    if (!emailDoc.exists()) {
      console.warn(`Email ${emailId} not found - may have been deleted`);
      return null;
    }

    const data = emailDoc.data();
    
    // Validate required fields
    if (!data.orgId || !data.from) {
      console.warn(`Email ${emailId} has missing required fields`);
      return null;
    }
    
    return {
      id: emailDoc.id,
      orgId: data.orgId,
      accountId: data.accountId || '',
      provider: data.provider || 'unknown',
      providerMessageId: data.providerMessageId || '',
      threadId: data.threadId || '',
      from: data.from,
      to: data.to || [],
      cc: data.cc || [],
      subject: data.subject || '(No Subject)',
      bodyText: data.bodyText || '',
      bodyHtml: data.bodyHtml,
      receivedAt: data.receivedAt?.toDate() || new Date(),
      hasAttachments: data.hasAttachments || false,
      category: data.category,
      categoryConfidence: data.categoryConfidence,
      processed: data.processed || false,
      createdAt: data.createdAt?.toDate() || new Date(),
    };
  } catch (error: any) {
    if (error.code === 'permission-denied') {
      console.error(`Permission denied accessing email ${emailId}`);
    } else {
      console.error('Error getting email details:', error);
    }
    return null;
  }
}

/**
 * Get email attachments for an email
 */
export async function getEmailAttachments(emailId: string): Promise<EmailAttachment[]> {
  try {
    const q = query(
      collection(db, 'emailAttachments'),
      where('emailId', '==', emailId),
      orderBy('createdAt', 'asc')
    );

    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        orgId: data.orgId || '',
        emailId: data.emailId || emailId,
        fileName: data.fileName || 'attachment',
        mimeType: data.mimeType || 'application/octet-stream',
        storagePath: data.storagePath || '',
        docType: data.docType,
        metadata: data.metadata,
        linkedDocumentId: data.linkedDocumentId,
        createdAt: data.createdAt?.toDate() || new Date(),
      };
    });
  } catch (error: any) {
    if (error.code === 'permission-denied') {
      console.warn(`Permission denied accessing attachments for email ${emailId}`);
    } else {
      console.error('Error getting email attachments:', error);
    }
    return [];
  }
}

/**
 * Update email summary status
 */
export async function updateEmailSummaryStatus(
  emailId: string, 
  status: EmailSummaryStatus
): Promise<void> {
  try {
    const summaryRef = docRef(db, 'emailSummaries', emailId);
    await updateDoc(summaryRef, { 
      status,
      isNew: false, // Mark as read when status changes
      readAt: new Date(),
    });
  } catch (error) {
    console.error('Error updating email summary status:', error);
    throw error;
  }
}

/**
 * Archive/hide email from inbox
 */
export async function markAsRead(emailId: string): Promise<void> {
  try {
    const summaryRef = docRef(db, 'emailSummaries', emailId);
    await updateDoc(summaryRef, {
      isNew: false,
      readAt: new Date(),
    });
  } catch (error) {
    console.error('Error marking email as read:', error);
    throw error;
  }
}

export async function archiveEmail(emailId: string, userId: string): Promise<void> {
  try {
    const summaryRef = docRef(db, 'emailSummaries', emailId);
    await updateDoc(summaryRef, {
      archived: true,
      archivedAt: new Date(),
      archivedBy: userId,
      isNew: false, // Mark as read when archived
      readAt: new Date(),
    });
  } catch (error) {
    console.error('Error archiving email:', error);
    throw error;
  }
}

/**
 * Unarchive/restore email to inbox
 */
export async function unarchiveEmail(emailId: string): Promise<void> {
  try {
    const summaryRef = docRef(db, 'emailSummaries', emailId);
    await updateDoc(summaryRef, {
      archived: false,
      archivedAt: null,
      archivedBy: null,
    });
  } catch (error) {
    console.error('Error unarchiving email:', error);
    throw error;
  }
}

/**
 * Assign email to user
 */
export async function assignEmailToUser(
  emailId: string,
  userId: string | null
): Promise<void> {
  try {
    const summaryRef = docRef(db, 'emailSummaries', emailId);
    await updateDoc(summaryRef, { assignedTo: userId });
  } catch (error) {
    console.error('Error assigning email:', error);
    throw error;
  }
}

/**
 * Get category color for UI
 */
export function getCategoryColor(category: EmailCategory): string {
  const colors: Record<EmailCategory, string> = {
    INVOICE: 'bg-red-100 text-red-800',
    ORDER: 'bg-blue-100 text-blue-800',
    SHIPPING: 'bg-green-100 text-green-800',
    CLAIM: 'bg-orange-100 text-orange-800',
    COMPLAINT: 'bg-purple-100 text-purple-800',
    KYC: 'bg-yellow-100 text-yellow-800',
    GENERAL: 'bg-gray-100 text-gray-800',
    SPAM: 'bg-red-100 text-red-500',
  };
  return colors[category] || colors.GENERAL;
}

/**
 * Get priority color for UI
 */
export function getPriorityColor(priority: EmailPriority): string {
  const colors: Record<EmailPriority, string> = {
    high: 'text-red-600',
    normal: 'text-gray-600',
    low: 'text-gray-400',
  };
  return colors[priority];
}

/**
 * Get category label in German
 */
export function getCategoryLabel(category: EmailCategory): string {
  const labels: Record<EmailCategory, string> = {
    INVOICE: 'Rechnung',
    ORDER: 'Bestellung',
    SHIPPING: 'Versand',
    CLAIM: 'Reklamation',
    COMPLAINT: 'Beschwerde',
    KYC: 'Dokumente',
    GENERAL: 'Allgemein',
    SPAM: 'Spam',
  };
  return labels[category] || labels.GENERAL;
}

/**
 * Get status label in German
 */
export function getStatusLabel(status: EmailSummaryStatus): string {
  const labels: Record<EmailSummaryStatus, string> = {
    open: 'Offen',
    in_progress: 'In Bearbeitung',
    done: 'Erledigt',
  };
  return labels[status];
}

/**
 * Download email attachment
 */
export async function downloadEmailAttachment(
  attachmentId: string,
  fileName: string
): Promise<void> {
  try {
    const { httpsCallable } = await import('firebase/functions');
    const { functionsEU } = await import('@/config/firebase');
    
    // Get signed download URL from backend
    const getDownloadUrl = httpsCallable(functionsEU, 'getAttachmentDownloadUrl');
    const result = await getDownloadUrl({ attachmentId });
    const data = result.data as any;

    if (!data.downloadUrl) {
      throw new Error('No download URL received');
    }

    // Download file using the signed URL
    const response = await fetch(data.downloadUrl);
    
    if (!response.ok) {
      throw new Error(`Download failed: ${response.status} ${response.statusText}`);
    }

    const blob = await response.blob();

    // Trigger browser download
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();

    // Cleanup
    setTimeout(() => {
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    }, 100);
  } catch (error) {
    console.error('Attachment download error:', error);
    throw error;
  }
}

/**
 * Download multiple attachments as ZIP (batch download)
 */
export async function downloadAllAttachments(
  attachmentIds: string[],
  emailSubject: string
): Promise<void> {
  try {
    const { httpsCallable } = await import('firebase/functions');
    const { functionsEU } = await import('@/config/firebase');
    
    // Get signed download URLs for all attachments
    const getDownloadUrls = httpsCallable(functionsEU, 'getAttachmentDownloadUrls');
    const result = await getDownloadUrls({ attachmentIds });
    const data = result.data as any;

    if (!data.attachments || data.attachments.length === 0) {
      throw new Error('No attachments to download');
    }

    // Download each attachment
    for (const attachment of data.attachments) {
      if (attachment.downloadUrl) {
        try {
          await downloadEmailAttachment(attachment.attachmentId, attachment.fileName);
          // Small delay between downloads to avoid browser blocking
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.error(`Failed to download ${attachment.fileName}:`, error);
        }
      }
    }
  } catch (error) {
    console.error('Batch download error:', error);
    throw error;
  }
}

// ============================================
// NEW: Canonical Message & User Inbox Functions
// ============================================

/**
 * Subscribe to user's inbox items with canonical message data
 * 
 * This is the new approach: user inbox items link to canonical messages.
 * Analysis results are fetched from the canonical message store.
 */
export function subscribeToUserInbox(
  concernId: string,
  uid: string,
  options: {
    showArchived?: boolean;
    folder?: string;
    onlyUnread?: boolean;
  },
  callback: (items: (UserInboxItem & { canonicalMessage?: CanonicalMessage })[] ) => void
): () => void {
  if (!concernId || !uid) {
    callback([]);
    return () => {};
  }

  // Query user's inbox items
  const inboxRef = collection(db, `concerns/${concernId}/users/${uid}/emailInbox`);
  const constraints: QueryConstraint[] = [];

  // Filter by folder
  if (options.folder) {
    constraints.push(where('folder', '==', options.folder));
  }

  // Filter archived
  if (options.showArchived) {
    constraints.push(where('archived', '==', true));
  } else {
    constraints.push(where('archived', '==', false));
  }

  // Filter deleted
  constraints.push(where('deleted', '==', false));

  // Only unread
  if (options.onlyUnread) {
    constraints.push(where('unread', '==', true));
  }

  // Order by received date
  constraints.push(orderBy('receivedAt', 'desc'));

  const q = query(inboxRef, ...constraints);

  return onSnapshot(q, async (snapshot) => {
    const inboxItems: UserInboxItem[] = snapshot.docs.map(doc => ({
      ...doc.data() as UserInboxItem,
      id: doc.id,
    }));

    // Fetch canonical messages in batch
    const messageKeys = [...new Set(inboxItems.map(item => item.messageKey))];
    const canonicalMessages = await fetchCanonicalMessages(concernId, messageKeys);

    // Join inbox items with canonical messages
    const itemsWithMessages = inboxItems.map(item => ({
      ...item,
      canonicalMessage: canonicalMessages.get(item.messageKey),
    }));

    callback(itemsWithMessages);
  });
}

/**
 * Fetch canonical messages by messageKeys (batched)
 */
export async function fetchCanonicalMessages(
  concernId: string,
  messageKeys: string[]
): Promise<Map<string, CanonicalMessage>> {
  const result = new Map<string, CanonicalMessage>();
  
  if (messageKeys.length === 0) {
    return result;
  }

  // Fetch in batches (Firestore 'in' query max 30)
  const batches: string[][] = [];
  for (let i = 0; i < messageKeys.length; i += 30) {
    batches.push(messageKeys.slice(i, i + 30));
  }

  for (const batch of batches) {
    const messagesRef = collection(db, `concerns/${concernId}/emailMessages`);
    const q = query(messagesRef, where('messageKey', 'in', batch));
    
    try {
      const snapshot = await getDocs(q);
      snapshot.docs.forEach(doc => {
        const data = doc.data() as CanonicalMessage;
        result.set(data.messageKey, data);
      });
    } catch (error) {
      console.error('Error fetching canonical messages:', error);
    }
  }

  return result;
}

/**
 * Get a single canonical message
 */
export async function getCanonicalMessage(
  concernId: string,
  messageKey: string
): Promise<CanonicalMessage | null> {
  try {
    const messageRef = docRef(db, `concerns/${concernId}/emailMessages/${messageKey}`);
    const doc = await getDoc(messageRef);
    
    if (!doc.exists()) {
      return null;
    }
    
    return doc.data() as CanonicalMessage;
  } catch (error) {
    console.error('Error fetching canonical message:', error);
    return null;
  }
}

/**
 * Retry email analysis
 * Calls the Cloud Function to re-analyze a canonical message
 */
export async function retryEmailAnalysis(
  concernId: string,
  messageKey: string
): Promise<{ ok: boolean; status: string; message: string }> {
  try {
    const retryFn = httpsCallable(functionsEU, 'retryEmailAnalysis');
    const result = await retryFn({ concernId, messageKey });
    return result.data as { ok: boolean; status: string; message: string };
  } catch (error) {
    console.error('Error retrying email analysis:', error);
    return {
      ok: false,
      status: 'error',
      message: 'Analyse konnte nicht erneut gestartet werden',
    };
  }
}

/**
 * Get analysis status label in German
 */
export function getAnalysisStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    none: 'Ausstehend',
    queued: 'In Warteschlange',
    processing: 'Analyse läuft...',
    done: 'Analysiert',
    error: 'Analyse fehlgeschlagen',
  };
  return labels[status] || 'Unbekannt';
}

/**
 * Get analysis status color for UI
 */
export function getAnalysisStatusColor(status: string): string {
  const colors: Record<string, string> = {
    none: 'bg-gray-100 text-gray-600',
    queued: 'bg-blue-100 text-blue-600',
    processing: 'bg-yellow-100 text-yellow-600',
    done: 'bg-green-100 text-green-600',
    error: 'bg-red-100 text-red-600',
  };
  return colors[status] || 'bg-gray-100 text-gray-600';
}

/**
 * Check if analysis can be retried
 */
export function canRetryAnalysis(status: string): boolean {
  return status === 'error';
}

/**
 * Mark inbox item as read
 */
export async function markInboxItemAsRead(
  concernId: string,
  uid: string,
  inboxItemId: string
): Promise<void> {
  try {
    const itemRef = docRef(db, `concerns/${concernId}/users/${uid}/emailInbox/${inboxItemId}`);
    await updateDoc(itemRef, {
      unread: false,
      readAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error marking inbox item as read:', error);
  }
}

/**
 * Archive inbox item
 */
export async function archiveInboxItem(
  concernId: string,
  uid: string,
  inboxItemId: string
): Promise<void> {
  try {
    const itemRef = docRef(db, `concerns/${concernId}/users/${uid}/emailInbox/${inboxItemId}`);
    await updateDoc(itemRef, {
      archived: true,
      archivedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error archiving inbox item:', error);
    throw error;
  }
}

/**
 * Unarchive inbox item
 */
export async function unarchiveInboxItem(
  concernId: string,
  uid: string,
  inboxItemId: string
): Promise<void> {
  try {
    const itemRef = docRef(db, `concerns/${concernId}/users/${uid}/emailInbox/${inboxItemId}`);
    await updateDoc(itemRef, {
      archived: false,
      archivedAt: null,
    });
  } catch (error) {
    console.error('Error unarchiving inbox item:', error);
    throw error;
  }
}

/**
 * Delete inbox item (soft delete)
 */
export async function deleteInboxItem(
  concernId: string,
  uid: string,
  inboxItemId: string
): Promise<void> {
  try {
    const itemRef = docRef(db, `concerns/${concernId}/users/${uid}/emailInbox/${inboxItemId}`);
    await updateDoc(itemRef, {
      deleted: true,
    });
  } catch (error) {
    console.error('Error deleting inbox item:', error);
    throw error;
  }
}

// ============================================
// REPLY WORKFLOW FUNCTIONS (Canonical)
// ============================================

/**
 * Generate AI reply draft for a canonical message
 * Uses the canonical messageKey instead of legacy emailId
 */
export async function generateReplyDraft(
  concernId: string,
  messageKey: string,
  options?: {
    tone?: 'neutral' | 'friendly' | 'formal';
    language?: 'de' | 'en';
    instructions?: string;
  }
): Promise<{
  ok: boolean;
  replyId?: string;
  messageKey?: string;
  draft?: {
    subject: string;
    bodyText: string;
    to: string[];
  };
  message?: string;
}> {
  try {
    const generateFn = httpsCallable(functionsEU, 'generateEmailReplyDraft');
    const result = await generateFn({
      concernId,
      messageKey,
      tone: options?.tone || 'neutral',
      language: options?.language || 'de',
      instructions: options?.instructions,
    });

    const data = result.data as any;
    return {
      ok: data.status === 'generated',
      replyId: data.replyId,
      messageKey: data.messageKey,
      draft: data.draft,
      message: data.status === 'generated' ? 'Antwort-Entwurf erstellt' : 'Fehler beim Erstellen',
    };
  } catch (error: any) {
    console.error('Error generating reply draft:', error);
    return {
      ok: false,
      message: error.message || 'Fehler beim Erstellen des Antwort-Entwurfs',
    };
  }
}

/**
 * Send email reply
 * Uses the canonical messageKey for status updates
 */
export async function sendReply(
  concernId: string,
  replyId: string,
  messageKey?: string
): Promise<{
  ok: boolean;
  providerSentId?: string;
  message?: string;
}> {
  try {
    const sendFn = httpsCallable(functionsEU, 'sendEmailReply');
    const result = await sendFn({
      concernId,
      replyId,
      messageKey,
    });

    const data = result.data as any;
    return {
      ok: data.success,
      providerSentId: data.providerSentId,
      message: data.success ? 'E-Mail gesendet' : 'Fehler beim Senden',
    };
  } catch (error: any) {
    console.error('Error sending reply:', error);
    return {
      ok: false,
      message: error.message || 'Fehler beim Senden der E-Mail',
    };
  }
}

/**
 * Get reply status label in German
 */
export function getReplyStatusLabel(state: ReplyState | undefined): string {
  if (!state) return '';
  
  const labels: Record<ReplyState, string> = {
    none: '',
    drafted: 'Entwurf',
    sent: 'Gesendet',
    failed: 'Fehlgeschlagen',
  };
  return labels[state] || '';
}

/**
 * Get reply status color for UI
 */
export function getReplyStatusColor(state: ReplyState | undefined): string {
  if (!state) return '';
  
  const colors: Record<ReplyState, string> = {
    none: '',
    drafted: 'bg-blue-100 text-blue-600',
    sent: 'bg-green-100 text-green-600',
    failed: 'bg-red-100 text-red-600',
  };
  return colors[state] || '';
}

/**
 * Subscribe to a single canonical message for real-time updates
 * Useful for detail views to get live reply status updates
 */
export function subscribeToCanonicalMessage(
  concernId: string,
  messageKey: string,
  callback: (message: CanonicalMessage | null) => void
): () => void {
  if (!concernId || !messageKey) {
    callback(null);
    return () => {};
  }

  const messageRef = docRef(db, `concerns/${concernId}/emailMessages/${messageKey}`);

  return onSnapshot(messageRef, (doc) => {
    if (doc.exists()) {
      callback(doc.data() as CanonicalMessage);
    } else {
      callback(null);
    }
  }, (error) => {
    console.error('Error subscribing to canonical message:', error);
    callback(null);
  });
}

// ============================================
// EMAIL ACCOUNT ISOLATION (User-scoped)
// ============================================

/**
 * Email account with ownership info
 */
export interface AuthorizedEmailAccount {
  id: string;
  concernId: string;
  ownerUid: string;
  provider: string;
  emailAddress: string;
  emailKey?: string;
  status: 'active' | 'disabled' | 'error';
  lastSyncAt?: Date;
  createdAt: Date;
  isOwner: boolean;        // True if current user is owner
  isShared: boolean;       // True if shared with current user
  sharedWithUids?: string[];
}

/**
 * Load email accounts that the current user is authorized to access.
 * Returns accounts where user is owner OR in sharedWithUids.
 * 
 * Uses user-scoped path as primary source.
 */
export async function getAuthorizedEmailAccounts(
  concernId: string,
  uid: string
): Promise<AuthorizedEmailAccount[]> {
  if (!concernId || !uid) {
    console.warn('[getAuthorizedEmailAccounts] missing concernId or uid');
    return [];
  }

  const accounts: AuthorizedEmailAccount[] = [];

  try {
    // Query 1: User-scoped accounts (user is owner via path)
    const userAccountsRef = collection(db, `concerns/${concernId}/users/${uid}/emailAccounts`);
    const userAccountsSnap = await getDocs(userAccountsRef);

    for (const doc of userAccountsSnap.docs) {
      const data = doc.data();
      
      // Validate required fields
      if (!data.provider || !data.email && !data.emailAddress) {
        console.warn('[getAuthorizedEmailAccounts] skipping invalid account', { id: doc.id });
        continue;
      }

      accounts.push({
        id: doc.id,
        concernId,
        ownerUid: data.ownerUid || uid, // Default to current user for legacy
        provider: data.provider,
        emailAddress: data.email || data.emailAddress,
        emailKey: data.emailKey,
        status: data.status || (data.active !== false ? 'active' : 'disabled'),
        lastSyncAt: data.lastSyncAt?.toDate?.() || data.syncState?.lastSyncedAt?.toDate?.(),
        createdAt: data.createdAt?.toDate?.() || new Date(),
        isOwner: true,
        isShared: false,
        sharedWithUids: data.sharedWithUids || [],
      });
    }

    console.info('[getAuthorizedEmailAccounts] loaded', {
      concernId,
      uid: uid.substring(0, 8),
      count: accounts.length,
    });

    return accounts;
  } catch (error) {
    console.error('[getAuthorizedEmailAccounts] failed', error);
    return [];
  }
}

/**
 * Subscribe to authorized email accounts (real-time updates)
 */
export function subscribeToAuthorizedEmailAccounts(
  concernId: string,
  uid: string,
  callback: (accounts: AuthorizedEmailAccount[]) => void
): () => void {
  if (!concernId || !uid) {
    callback([]);
    return () => {};
  }

  const userAccountsRef = collection(db, `concerns/${concernId}/users/${uid}/emailAccounts`);

  return onSnapshot(userAccountsRef, (snapshot) => {
    const accounts: AuthorizedEmailAccount[] = [];

    for (const doc of snapshot.docs) {
      const data = doc.data();
      
      if (!data.provider || (!data.email && !data.emailAddress)) {
        continue;
      }

      accounts.push({
        id: doc.id,
        concernId,
        ownerUid: data.ownerUid || uid,
        provider: data.provider,
        emailAddress: data.email || data.emailAddress,
        emailKey: data.emailKey,
        status: data.status || (data.active !== false ? 'active' : 'disabled'),
        lastSyncAt: data.lastSyncAt?.toDate?.() || data.syncState?.lastSyncedAt?.toDate?.(),
        createdAt: data.createdAt?.toDate?.() || new Date(),
        isOwner: true,
        isShared: false,
        sharedWithUids: data.sharedWithUids || [],
      });
    }

    callback(accounts);
  }, (error) => {
    console.error('[subscribeToAuthorizedEmailAccounts] error', error);
    callback([]);
  });
}

/**
 * Map sync error codes to German user messages
 */
export function getSyncErrorMessage(error: any): string {
  const code = error?.code || '';
  
  if (code.includes('unauthenticated')) {
    return 'Bitte erneut anmelden';
  }
  if (code.includes('not-found')) {
    return 'Account nicht gefunden. Bitte Konto erneut verbinden.';
  }
  if (code.includes('failed-precondition')) {
    return 'Account ist unvollständig konfiguriert. Bitte erneut verbinden.';
  }
  if (code.includes('permission-denied')) {
    return 'Zugriff verweigert. Bitte Konto erneut verbinden.';
  }
  if (code.includes('unavailable')) {
    return 'E-Mail-Server nicht erreichbar. Bitte später erneut versuchen.';
  }
  if (code.includes('internal')) {
    // Extract message if available
    const msg = error?.message || '';
    if (msg.includes('OAuth')) return 'OAuth-Token abgelaufen. Bitte Konto erneut verbinden.';
    if (msg.includes('connect')) return 'Verbindung fehlgeschlagen. Bitte später erneut versuchen.';
    return 'Synchronisierung fehlgeschlagen. Details in Konsole.';
  }
  
  return error?.message?.substring(0, 80) || 'Unbekannter Fehler';
}

// ============================================
// PROCUREMENT OFFERS (Email-derived)
// ============================================

import { 
  ProcurementOffer, 
  ProcurementOfferStatus,
  PIPELINE_ANALYSIS_VERSION,
} from '@/types/emailPipeline';
import { sanitizeForFirestore } from '@/utils/sanitizeForFirestore';

const PROCUREMENT_OFFERS_COLLECTION = 'procurementOffers';

/**
 * Subscribe to email-derived procurement offers for the current user.
 * Only returns offers where ownerUid matches and source == 'email_ai'.
 * 
 * @param concernId - The organization ID
 * @param uid - The current user's UID
 * @param statusFilter - Optional status filter
 * @param callback - Callback with offers
 * @returns Unsubscribe function
 */
export function subscribeToProcurementOffers(
  concernId: string,
  uid: string,
  statusFilter: ProcurementOfferStatus[] | undefined,
  callback: (offers: ProcurementOffer[]) => void
): () => void {
  const constraints: QueryConstraint[] = [
    where('concernId', '==', concernId),
    where('ownerUid', '==', uid),
    where('source', '==', 'email_ai'),
  ];
  
  if (statusFilter && statusFilter.length > 0) {
    constraints.push(where('status', 'in', statusFilter));
  }
  
  constraints.push(orderBy('receivedAt', 'desc'));
  
  const q = query(collection(db, PROCUREMENT_OFFERS_COLLECTION), ...constraints);
  
  return onSnapshot(q, (snapshot) => {
    const offers: ProcurementOffer[] = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        concernId: data.concernId,
        ownerUid: data.ownerUid,
        source: data.source,
        sourceEmailId: data.sourceEmailId,
        sourceMessageKey: data.sourceMessageKey,
        sourceAccountId: data.sourceAccountId,
        status: data.status,
        supplierId: data.supplierId,
        supplierName: data.supplierName,
        supplierEmail: data.supplierEmail,
        linkedRequestId: data.linkedRequestId,
        linkedRequestNumber: data.linkedRequestNumber,
        projectId: data.projectId,
        projectNumber: data.projectNumber,
        projectName: data.projectName,
        aiSummary: data.aiSummary || [],
        aiConfidence: data.aiConfidence,
        extractedData: data.extractedData,
        attachmentRefs: data.attachmentRefs || [],
        receivedAt: data.receivedAt?.toDate?.() || new Date(),
        createdAt: data.createdAt?.toDate?.() || new Date(),
        updatedAt: data.updatedAt?.toDate?.() || new Date(),
        reviewedBy: data.reviewedBy,
        reviewedAt: data.reviewedAt?.toDate?.(),
        notes: data.notes,
      } as ProcurementOffer;
    });
    
    callback(offers);
  }, (error) => {
    console.error('[subscribeToProcurementOffers] error', error);
    callback([]);
  });
}

/**
 * Update procurement offer status
 */
export async function updateProcurementOfferStatus(
  offerId: string,
  uid: string,
  status: ProcurementOfferStatus,
  notes?: string
): Promise<void> {
  const offerRef = docRef(db, PROCUREMENT_OFFERS_COLLECTION, offerId);
  const offerDoc = await getDoc(offerRef);
  
  if (!offerDoc.exists()) {
    throw new Error('Angebot nicht gefunden');
  }
  
  const offerData = offerDoc.data();
  
  // Ownership check
  if (offerData.ownerUid !== uid) {
    throw new Error('Keine Berechtigung');
  }
  
  const update = sanitizeForFirestore({
    status,
    reviewedBy: uid,
    reviewedAt: Timestamp.now(),
    notes: notes || offerData.notes,
    updatedAt: Timestamp.now(),
  });
  
  await updateDoc(offerRef, update);
}

/**
 * Link procurement offer to an existing Anfrage
 */
export async function linkOfferToRequest(
  offerId: string,
  uid: string,
  requestId: string,
  requestNumber: string
): Promise<void> {
  const offerRef = docRef(db, PROCUREMENT_OFFERS_COLLECTION, offerId);
  const offerDoc = await getDoc(offerRef);
  
  if (!offerDoc.exists()) {
    throw new Error('Angebot nicht gefunden');
  }
  
  const offerData = offerDoc.data();
  
  // Ownership check
  if (offerData.ownerUid !== uid) {
    throw new Error('Keine Berechtigung');
  }
  
  const update = sanitizeForFirestore({
    linkedRequestId: requestId,
    linkedRequestNumber: requestNumber,
    status: 'zugeordnet' as ProcurementOfferStatus,
    reviewedBy: uid,
    reviewedAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  
  await updateDoc(offerRef, update);
}

/**
 * Link procurement offer to a project
 */
export async function linkOfferToProject(
  offerId: string,
  uid: string,
  projectId: string,
  projectNumber: string,
  projectName: string
): Promise<void> {
  const offerRef = docRef(db, PROCUREMENT_OFFERS_COLLECTION, offerId);
  const offerDoc = await getDoc(offerRef);
  
  if (!offerDoc.exists()) {
    throw new Error('Angebot nicht gefunden');
  }
  
  const offerData = offerDoc.data();
  
  // Ownership check
  if (offerData.ownerUid !== uid) {
    throw new Error('Keine Berechtigung');
  }
  
  const update = sanitizeForFirestore({
    projectId,
    projectNumber,
    projectName,
    reviewedBy: uid,
    reviewedAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  
  await updateDoc(offerRef, update);
}

/**
 * Get procurement offers count by status
 */
export async function getProcurementOffersCount(
  concernId: string,
  uid: string
): Promise<{ neu: number; inPruefung: number; total: number }> {
  const q = query(
    collection(db, PROCUREMENT_OFFERS_COLLECTION),
    where('concernId', '==', concernId),
    where('ownerUid', '==', uid),
    where('source', '==', 'email_ai'),
    where('status', 'in', ['neu', 'in_pruefung'])
  );
  
  const snapshot = await getDocs(q);
  
  let neu = 0;
  let inPruefung = 0;
  
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    if (data.status === 'neu') neu++;
    if (data.status === 'in_pruefung') inPruefung++;
  });
  
  return { neu, inPruefung, total: snapshot.size };
}

