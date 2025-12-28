/**
 * Email Intelligence Hooks
 * React hooks for Email Intelligence Agent
 */

import { useState, useEffect } from 'react';
import {
  EmailSummary,
  IncomingEmail,
  EmailAttachment,
  EmailCategory,
  EmailSummaryStatus,
  EmailPriority,
} from '@/types/email';
import {
  subscribeToEmailSummaries,
  getEmailDetails,
  getEmailAttachments,
  updateEmailSummaryStatus,
  assignEmailToUser,
  archiveEmail,
  unarchiveEmail,
  markAsRead,
  // New canonical message imports
  subscribeToUserInbox,
  UserInboxItem,
  CanonicalMessage,
  retryEmailAnalysis,
  markInboxItemAsRead,
  archiveInboxItem,
  unarchiveInboxItem,
  // Analysis status helpers
  getAnalysisStatusLabel,
  getAnalysisStatusColor,
  canRetryAnalysis,
  // Reply workflow helpers
  generateReplyDraft,
  sendReply,
  getReplyStatusLabel,
  getReplyStatusColor,
  subscribeToCanonicalMessage,
  ReplyState,
} from '@/services/emailIntelligenceService';

/**
 * Hook to fetch and subscribe to email summaries
 * 
 * @deprecated Use useUserInbox() for canonical message support.
 * This hook reads from the legacy emailSummaries collection.
 * Keep for backward compatibility until all UI migrates to useUserInbox.
 * 
 * @param orgId - Organization/concern ID
 * @param filters - Filter options including uid for user-scoped filtering
 */
export function useEmailSummaries(
  orgId: string,
  filters: {
    category?: EmailCategory;
    status?: EmailSummaryStatus;
    priority?: EmailPriority;
    uid?: string; // User ID for filtering by owned accounts
  } = {}
) {
  const [summaries, setSummaries] = useState<EmailSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!orgId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = subscribeToEmailSummaries(
      orgId,
      filters,
      (data) => {
        setSummaries(data);
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [orgId, filters.category, filters.status, filters.priority, filters.uid]);

  return { summaries, loading, error };
}

/**
 * Hook to fetch email details
 */
export function useEmailDetails(emailId: string | null) {
  const [email, setEmail] = useState<IncomingEmail | null>(null);
  const [attachments, setAttachments] = useState<EmailAttachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!emailId) {
      setEmail(null);
      setAttachments([]);
      return;
    }

    setLoading(true);
    setError(null);

    Promise.all([
      getEmailDetails(emailId),
      getEmailAttachments(emailId),
    ])
      .then(([emailData, attachmentsData]) => {
        setEmail(emailData);
        setAttachments(attachmentsData);
        setLoading(false);
      })
      .catch((err) => {
        setError(err);
        setLoading(false);
      });
  }, [emailId]);

  return { email, attachments, loading, error };
}

/**
 * Hook to manage email summary actions
 */
export function useEmailActions() {
  const [updating, setUpdating] = useState(false);

  const updateStatus = async (emailId: string, status: EmailSummaryStatus) => {
    setUpdating(true);
    try {
      await updateEmailSummaryStatus(emailId, status);
    } catch (error) {
      console.error('Failed to update status:', error);
      throw error;
    } finally {
      setUpdating(false);
    }
  };

  const assignToUser = async (emailId: string, userId: string | null) => {
    setUpdating(true);
    try {
      await assignEmailToUser(emailId, userId);
    } catch (error) {
      console.error('Failed to assign email:', error);
      throw error;
    } finally {
      setUpdating(false);
    }
  };

  const archive = async (emailId: string, userId: string) => {
    setUpdating(true);
    try {
      await archiveEmail(emailId, userId);
    } catch (error) {
      console.error('Failed to archive email:', error);
      throw error;
    } finally {
      setUpdating(false);
    }
  };

  const unarchive = async (emailId: string) => {
    setUpdating(true);
    try {
      await unarchiveEmail(emailId);
    } catch (error) {
      console.error('Failed to unarchive email:', error);
      throw error;
    } finally {
      setUpdating(false);
    }
  };

  const markEmailAsRead = async (emailId: string) => {
    try {
      await markAsRead(emailId);
    } catch (error) {
      console.error('Failed to mark email as read:', error);
      // Don't throw - this is a background action
    }
  };

  return {
    updateStatus,
    assignToUser,
    archive,
    unarchive,
    markAsRead: markEmailAsRead,
    updating,
  };
}

/**
 * Hook to manage attachment downloads
 */
export function useAttachmentDownload() {
  const [downloading, setDownloading] = useState<string | null>(null);

  const downloadAttachment = async (attachmentId: string, fileName: string) => {
    setDownloading(attachmentId);
    try {
      const { downloadEmailAttachment } = await import('@/services/emailIntelligenceService');
      await downloadEmailAttachment(attachmentId, fileName);
    } catch (error) {
      console.error('Download failed:', error);
      throw error;
    } finally {
      setDownloading(null);
    }
  };

  const downloadAll = async (attachmentIds: string[], emailSubject: string) => {
    setDownloading('all');
    try {
      const { downloadAllAttachments } = await import('@/services/emailIntelligenceService');
      await downloadAllAttachments(attachmentIds, emailSubject);
    } catch (error) {
      console.error('Batch download failed:', error);
      throw error;
    } finally {
      setDownloading(null);
    }
  };

  return {
    downloadAttachment,
    downloadAll,
    downloading,
  };
}

// ============================================
// NEW: User Inbox with Canonical Messages
// ============================================

export interface InboxItemWithMessage extends UserInboxItem {
  canonicalMessage?: CanonicalMessage;
}

// Re-export analysis + reply status helpers for convenience
export { 
  getAnalysisStatusLabel, 
  getAnalysisStatusColor, 
  canRetryAnalysis,
  getReplyStatusLabel,
  getReplyStatusColor,
};

/**
 * Hook to fetch and subscribe to user's inbox items with canonical messages
 * 
 * This is the new approach for concern-wide email deduplication.
 * Each user sees their own inbox items, but analysis results come from
 * the shared canonical message store.
 */
export function useUserInbox(
  concernId: string,
  uid: string,
  options: {
    showArchived?: boolean;
    folder?: string;
    onlyUnread?: boolean;
  } = {}
) {
  const [items, setItems] = useState<InboxItemWithMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!concernId || !uid) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = subscribeToUserInbox(
      concernId,
      uid,
      options,
      (data) => {
        setItems(data);
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [concernId, uid, options.showArchived, options.folder, options.onlyUnread]);

  return { items, loading, error };
}

/**
 * Hook to manage inbox item actions (with canonical message support)
 */
export function useInboxActions(concernId: string, uid: string) {
  const [updating, setUpdating] = useState(false);
  const [retryingMessageKey, setRetryingMessageKey] = useState<string | null>(null);

  const markAsReadItem = async (inboxItemId: string) => {
    try {
      await markInboxItemAsRead(concernId, uid, inboxItemId);
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const archiveItem = async (inboxItemId: string) => {
    setUpdating(true);
    try {
      await archiveInboxItem(concernId, uid, inboxItemId);
    } catch (error) {
      console.error('Failed to archive:', error);
      throw error;
    } finally {
      setUpdating(false);
    }
  };

  const unarchiveItem = async (inboxItemId: string) => {
    setUpdating(true);
    try {
      await unarchiveInboxItem(concernId, uid, inboxItemId);
    } catch (error) {
      console.error('Failed to unarchive:', error);
      throw error;
    } finally {
      setUpdating(false);
    }
  };

  const retryAnalysis = async (messageKey: string): Promise<{
    ok: boolean;
    status: string;
    message: string;
  }> => {
    setRetryingMessageKey(messageKey);
    setUpdating(true);
    try {
      const result = await retryEmailAnalysis(concernId, messageKey);
      return result;
    } catch (error) {
      console.error('Failed to retry analysis:', error);
      return { ok: false, status: 'error', message: 'Fehler beim Neustart der Analyse' };
    } finally {
      setUpdating(false);
      setRetryingMessageKey(null);
    }
  };

  const isRetrying = (messageKey: string) => retryingMessageKey === messageKey;

  return {
    markAsReadItem,
    archiveItem,
    unarchiveItem,
    retryAnalysis,
    isRetrying,
    updating,
  };
}

/**
 * Hook to manage reply actions for canonical messages
 */
export function useReplyActions(concernId: string) {
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createDraft = async (
    messageKey: string,
    options?: {
      tone?: 'neutral' | 'friendly' | 'formal';
      language?: 'de' | 'en';
      instructions?: string;
    }
  ) => {
    setGenerating(true);
    setError(null);
    try {
      const result = await generateReplyDraft(concernId, messageKey, options);
      if (!result.ok) {
        setError(result.message || 'Fehler beim Erstellen des Entwurfs');
      }
      return result;
    } catch (err: any) {
      const errMsg = err.message || 'Unbekannter Fehler';
      setError(errMsg);
      return { ok: false, message: errMsg };
    } finally {
      setGenerating(false);
    }
  };

  const send = async (replyId: string, messageKey?: string) => {
    setSending(true);
    setError(null);
    try {
      const result = await sendReply(concernId, replyId, messageKey);
      if (!result.ok) {
        setError(result.message || 'Fehler beim Senden');
      }
      return result;
    } catch (err: any) {
      const errMsg = err.message || 'Unbekannter Fehler';
      setError(errMsg);
      return { ok: false, message: errMsg };
    } finally {
      setSending(false);
    }
  };

  return {
    createDraft,
    send,
    generating,
    sending,
    error,
    clearError: () => setError(null),
  };
}

/**
 * Hook to subscribe to a single canonical message (for detail views)
 * Provides real-time updates for analysis and reply status
 */
export function useCanonicalMessage(concernId: string, messageKey: string | null) {
  const [message, setMessage] = useState<CanonicalMessage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!concernId || !messageKey) {
      setMessage(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeToCanonicalMessage(concernId, messageKey, (data) => {
      setMessage(data);
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, [concernId, messageKey]);

  // Derived state helpers
  const analysisStatus = message?.analysis?.status || 'none';
  const analysisStatusLabel = getAnalysisStatusLabel(analysisStatus);
  const analysisStatusColor = getAnalysisStatusColor(analysisStatus);
  const canRetry = canRetryAnalysis(analysisStatus);

  const replyState = message?.reply?.status?.state;
  const replyDraft = message?.reply?.draft;
  const replyStatusLabel = getReplyStatusLabel(replyState);
  const replyStatusColor = getReplyStatusColor(replyState);
  const hasReplyDraft = !!replyDraft;

  return {
    message,
    loading,
    // Analysis
    analysisStatus,
    analysisStatusLabel,
    analysisStatusColor,
    analysisResult: message?.analysisResult,
    canRetry,
    // Reply
    replyState,
    replyDraft,
    replyStatusLabel,
    replyStatusColor,
    hasReplyDraft,
    replyId: message?.reply?.status?.replyId,
  };
}

