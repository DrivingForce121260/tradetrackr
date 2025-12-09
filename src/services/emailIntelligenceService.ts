/**
 * Email Intelligence Service
 * Handles Firestore operations for Email Intelligence Agent
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
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { 
  EmailSummary, 
  IncomingEmail, 
  EmailAttachment,
  EmailCategory,
  EmailSummaryStatus,
  EmailPriority,
} from '@/types/email';

/**
 * Subscribe to email summaries for an organization
 */
export function subscribeToEmailSummaries(
  orgId: string,
  filters: {
    category?: EmailCategory;
    status?: EmailSummaryStatus;
    priority?: EmailPriority;
  },
  callback: (summaries: EmailSummary[]) => void
): () => void {
  const constraints: QueryConstraint[] = [
    where('orgId', '==', orgId),
  ];

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

  return onSnapshot(q, async (snapshot) => {
    // Filter out archived emails in client if not showing archived view
    let docs = snapshot.docs;
    if (filters.status !== 'archived' as any) {
      docs = docs.filter(doc => {
        const data = doc.data();
        return !data.archived; // Filter out archived, keep those without field (legacy)
      });
    }

    // Get summaries with email details
    const summariesWithDetails = await Promise.all(
      docs.map(async (doc) => {
        const data = doc.data();
        
        // Get email details to show from/subject in list
        let emailFrom = 'Unbekannter Absender';
        let emailSubject = '(Kein Betreff)';
        
        try {
          const emailDocReference = docRef(db, 'emails', data.emailId);
          const emailDoc = await getDoc(emailDocReference);
          if (emailDoc.exists()) {
            const emailData = emailDoc.data();
            emailFrom = emailData.from || emailFrom;
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

