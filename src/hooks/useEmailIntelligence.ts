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
} from '@/services/emailIntelligenceService';

/**
 * Hook to fetch and subscribe to email summaries
 */
export function useEmailSummaries(
  orgId: string,
  filters: {
    category?: EmailCategory;
    status?: EmailSummaryStatus;
    priority?: EmailPriority;
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
  }, [orgId, filters.category, filters.status, filters.priority]);

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

