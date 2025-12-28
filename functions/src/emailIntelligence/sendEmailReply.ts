/**
 * Cloud Function: Send Email Reply
 * 
 * UPDATED: Now updates canonical message reply status.
 * Sends a reply email via the appropriate provider.
 * 
 * Priority:
 * 1. Update canonical message reply.status
 * 2. Update emailReplies collection (for reply content)
 * 3. Legacy: Update emailSummaries only if LEGACY_EMAIL_SUMMARIES=true
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { CanonicalMessage, ReplyStatus } from './canonicalMessage';
// @ts-ignore
import { google } from 'googleapis';

// Feature flag
const LEGACY_EMAIL_SUMMARIES = process.env.LEGACY_EMAIL_SUMMARIES === 'true';

interface SendEmailReplyRequest {
  concernId: string;
  replyId: string;
  messageKey?: string;  // Optional: canonical messageKey for direct update
}

interface SendEmailReplyResponse {
  success: boolean;
  providerSentId?: string;
  messageKey?: string;
}

const db = admin.firestore();

/**
 * Callable function to send an email reply
 */
export const sendEmailReply = functions
  .region('europe-west1')
  .https.onCall(async (data: SendEmailReplyRequest, context): Promise<SendEmailReplyResponse> => {
    // ============================================
    // 1. AUTHENTICATION
    // ============================================
    
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Benutzer muss angemeldet sein');
    }

    const { concernId, replyId, messageKey: providedMessageKey } = data;
    const userId = context.auth.uid;

    if (!concernId || !replyId) {
      throw new functions.https.HttpsError('invalid-argument', 'concernId und replyId sind erforderlich');
    }

    functions.logger.info('sendEmailReply: starting', {
      concernId,
      replyId,
      messageKey: providedMessageKey?.substring(0, 8),
      userId: userId.substring(0, 8),
    });

    try {
      // ============================================
      // 2. LOAD & VALIDATE REPLY
      // ============================================
      
      const replyDoc = await db.collection('emailReplies').doc(replyId).get();
      
      if (!replyDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Antwort nicht gefunden');
      }

      const replyData = replyDoc.data()!;
      
      // Verify concernId matches
      if (replyData.concernId !== concernId) {
        throw new functions.https.HttpsError('permission-denied', 'Antwort gehört nicht zu diesem Concern');
      }

      // Get messageKey from reply or parameter
      const messageKey = providedMessageKey || replyData.messageKey;

      // Validate status
      const validStatuses = ['draft', 'generated', 'edited', 'send_failed'];
      if (!validStatuses.includes(replyData.status)) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          `Antwort kann nicht gesendet werden (Status: ${replyData.status})`
        );
      }

      // Validate required fields
      if (!replyData.to || replyData.to.length === 0) {
        throw new functions.https.HttpsError('invalid-argument', 'Empfänger (to) fehlt');
      }

      if (!replyData.subject || !replyData.bodyText) {
        throw new functions.https.HttpsError('invalid-argument', 'Betreff oder Text fehlt');
      }

      // ============================================
      // 3. UPDATE STATUS TO SENDING
      // ============================================
      
      const now = admin.firestore.Timestamp.now();
      
      await db.collection('emailReplies').doc(replyId).update({
        status: 'sending',
        updatedBy: userId,
        updatedAt: now,
      });

      // Update canonical message if we have messageKey
      if (messageKey) {
        await updateCanonicalReplyStatus(concernId, messageKey, 'drafted', userId, now);
      }

      // ============================================
      // 4. LOAD EMAIL ACCOUNT & CREDENTIALS
      // ============================================
      
      let accountId = replyData.accountId;
      
      // If no accountId in reply, try to get from canonical message or email
      if (!accountId && messageKey) {
        const canonicalDoc = await db.doc(`concerns/${concernId}/emailMessages/${messageKey}`).get();
        if (canonicalDoc.exists) {
          // We need to find the account - check user's inbox items
          const inboxQuery = await db
            .collection(`concerns/${concernId}/users/${userId}/emailInbox`)
            .where('messageKey', '==', messageKey)
            .limit(1)
            .get();
          
          if (!inboxQuery.empty) {
            accountId = inboxQuery.docs[0].data().accountId;
          }
        }
      }

      if (!accountId) {
        throw new functions.https.HttpsError('not-found', 'E-Mail-Konto nicht gefunden');
      }

      const accountDoc = await db.collection('emailAccounts').doc(accountId).get();
      
      if (!accountDoc.exists) {
        functions.logger.error(`Email account not found: ${accountId}`);
        throw new functions.https.HttpsError('not-found', 'E-Mail-Konto nicht gefunden');
      }

      const accountData = accountDoc.data()!;
      
      // Check if IMAP (not supported for sending)
      if (accountData.provider === 'imap' || replyData.provider === 'imap') {
        throw new functions.https.HttpsError(
          'unimplemented',
          'IMAP-Antworten werden noch nicht unterstützt. Bitte verwenden Sie Gmail oder Microsoft 365.'
        );
      }
      
      // Get OAuth credentials
      if (!accountData.oauthRef) {
        throw new functions.https.HttpsError('not-found', 'OAuth-Referenz fehlt im E-Mail-Konto');
      }

      const oauthDoc = await db.collection('emailOAuth').doc(accountData.oauthRef).get();
      
      if (!oauthDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'OAuth-Zugangsdaten nicht gefunden');
      }

      const oauthData = oauthDoc.data()!;

      // ============================================
      // 5. SEND VIA PROVIDER
      // ============================================
      
      let providerSentId: string | undefined;
      const provider = replyData.provider || accountData.provider;

      if (provider === 'gmail') {
        providerSentId = await sendViaGmail(
          oauthData.accessToken,
          replyData.to,
          replyData.cc || [],
          replyData.bcc || [],
          replyData.subject,
          replyData.bodyText,
          replyData.bodyHtml,
          replyData.threadId
        );
      } else if (provider === 'm365') {
        providerSentId = await sendViaM365(
          oauthData.accessToken,
          replyData.to,
          replyData.cc || [],
          replyData.bcc || [],
          replyData.subject,
          replyData.bodyText,
          replyData.bodyHtml
        );
      } else {
        throw new functions.https.HttpsError('invalid-argument', `Unbekannter Provider: ${provider}`);
      }

      // ============================================
      // 6. UPDATE STATUS TO SENT
      // ============================================
      
      const sentAt = admin.firestore.Timestamp.now();
      
      // Update emailReplies
      await db.collection('emailReplies').doc(replyId).update({
        status: 'sent',
        providerSentId: providerSentId || null,
        lastError: null,
        updatedBy: userId,
        updatedAt: sentAt,
        history: admin.firestore.FieldValue.arrayUnion({
          at: sentAt,
          by: userId,
          action: 'sent',
          note: `Sent via ${provider}`,
        }),
      });

      // Update canonical message
      if (messageKey) {
        await updateCanonicalReplyStatus(concernId, messageKey, 'sent', userId, sentAt, replyId);
      }

      // Legacy: Update emailSummaries (only if enabled)
      if (LEGACY_EMAIL_SUMMARIES && replyData.emailId) {
        try {
          await db.collection('emailSummaries').doc(replyData.emailId).update({
            replyStatus: 'sent',
          });
        } catch (legacyErr) {
          functions.logger.warn('Failed to update legacy emailSummaries', { error: legacyErr });
        }
      }

      functions.logger.info('sendEmailReply: success', {
        replyId,
        messageKey: messageKey?.substring(0, 8),
        providerSentId,
      });

      return {
        success: true,
        providerSentId,
        messageKey,
      };

    } catch (error: any) {
      functions.logger.error('sendEmailReply error:', error);
      
      // Update reply status to failed
      const failedAt = admin.firestore.Timestamp.now();
      
      try {
        await db.collection('emailReplies').doc(replyId).update({
          status: 'send_failed',
          lastError: error.message || 'Unbekannter Fehler',
          updatedBy: userId,
          updatedAt: failedAt,
          history: admin.firestore.FieldValue.arrayUnion({
            at: failedAt,
            by: userId,
            action: 'failed',
            note: error.message || 'Unbekannter Fehler',
          }),
        });

        // Update canonical message
        const messageKey = providedMessageKey || (await db.collection('emailReplies').doc(replyId).get()).data()?.messageKey;
        if (messageKey) {
          await updateCanonicalReplyStatusError(concernId, messageKey, error.message, userId, failedAt);
        }

        // Legacy: Update emailSummaries (only if enabled)
        if (LEGACY_EMAIL_SUMMARIES) {
          const replyDoc = await db.collection('emailReplies').doc(replyId).get();
          const emailId = replyDoc.data()?.emailId;
          if (emailId) {
            await db.collection('emailSummaries').doc(emailId).update({
              replyStatus: 'failed',
            });
          }
        }
      } catch (updateError) {
        functions.logger.error('Failed to update reply status:', updateError);
      }
      
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      
      throw new functions.https.HttpsError(
        'internal',
        `Fehler beim Senden der E-Mail: ${error.message}`
      );
    }
  });

/**
 * Update canonical message reply status
 */
async function updateCanonicalReplyStatus(
  concernId: string,
  messageKey: string,
  state: 'drafted' | 'sent',
  userId: string,
  timestamp: admin.firestore.Timestamp,
  replyId?: string
): Promise<void> {
  const canonicalRef = db.doc(`concerns/${concernId}/emailMessages/${messageKey}`);
  
  const updateData: any = {
    'reply.status.state': state,
    'reply.status.updatedAt': timestamp,
    'reply.status.updatedBy': userId,
    'reply.status.error': null,
    updatedAt: timestamp,
  };

  if (replyId) {
    updateData['reply.status.replyId'] = replyId;
  }

  try {
    await canonicalRef.update(updateData);
  } catch (error) {
    functions.logger.warn('Failed to update canonical reply status', { 
      messageKey: messageKey.substring(0, 8), 
      error,
    });
  }
}

/**
 * Update canonical message reply status to error
 */
async function updateCanonicalReplyStatusError(
  concernId: string,
  messageKey: string,
  errorMessage: string,
  userId: string,
  timestamp: admin.firestore.Timestamp
): Promise<void> {
  const canonicalRef = db.doc(`concerns/${concernId}/emailMessages/${messageKey}`);
  
  try {
    await canonicalRef.update({
      'reply.status.state': 'failed',
      'reply.status.updatedAt': timestamp,
      'reply.status.updatedBy': userId,
      'reply.status.error': {
        message: errorMessage?.substring(0, 500) || 'Unbekannter Fehler',
        at: timestamp,
      },
      updatedAt: timestamp,
    });
  } catch (error) {
    functions.logger.warn('Failed to update canonical reply error status', { 
      messageKey: messageKey.substring(0, 8), 
      error,
    });
  }
}

/**
 * Send email via Gmail API
 */
async function sendViaGmail(
  accessToken: string,
  to: string[],
  cc: string[],
  bcc: string[],
  subject: string,
  bodyText: string,
  bodyHtml?: string,
  threadId?: string
): Promise<string> {
  try {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    const gmail = google.gmail({ version: 'v1', auth });

    const email = buildRFC2822Email(to, cc, bcc, subject, bodyText, bodyHtml);
    
    const encodedEmail = Buffer.from(email)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const sendParams: any = {
      userId: 'me',
      requestBody: { raw: encodedEmail },
    };

    if (threadId) {
      sendParams.requestBody.threadId = threadId;
    }

    const response = await gmail.users.messages.send(sendParams);
    
    return response.data.id || '';
  } catch (error: any) {
    throw new Error(`Gmail-Fehler: ${error.message}`);
  }
}

/**
 * Send email via Microsoft Graph API
 */
async function sendViaM365(
  accessToken: string,
  to: string[],
  cc: string[],
  bcc: string[],
  subject: string,
  bodyText: string,
  bodyHtml?: string
): Promise<string> {
  try {
    const message = {
      subject,
      body: {
        contentType: bodyHtml ? 'HTML' : 'Text',
        content: bodyHtml || bodyText,
      },
      toRecipients: to.map(email => ({ emailAddress: { address: email } })),
      ccRecipients: cc.map(email => ({ emailAddress: { address: email } })),
      bccRecipients: bcc.map(email => ({ emailAddress: { address: email } })),
    };

    const response = await (global as any).fetch(
      'https://graph.microsoft.com/v1.0/me/sendMail',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message, saveToSentItems: true }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Graph API error: ${response.status} - ${JSON.stringify(errorData)}`);
    }
    
    return `m365-${Date.now()}`;
  } catch (error: any) {
    throw new Error(`Microsoft 365-Fehler: ${error.message}`);
  }
}

/**
 * Build RFC 2822 formatted email
 */
function buildRFC2822Email(
  to: string[],
  cc: string[],
  bcc: string[],
  subject: string,
  bodyText: string,
  bodyHtml?: string
): string {
  const lines: string[] = [];
  
  lines.push(`To: ${to.join(', ')}`);
  if (cc.length > 0) lines.push(`Cc: ${cc.join(', ')}`);
  if (bcc.length > 0) lines.push(`Bcc: ${bcc.join(', ')}`);
  lines.push(`Subject: ${subject}`);
  lines.push('MIME-Version: 1.0');
  
  if (bodyHtml) {
    const boundary = `boundary_${Date.now()}`;
    lines.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);
    lines.push('');
    lines.push(`--${boundary}`);
    lines.push('Content-Type: text/plain; charset="UTF-8"');
    lines.push('');
    lines.push(bodyText);
    lines.push('');
    lines.push(`--${boundary}`);
    lines.push('Content-Type: text/html; charset="UTF-8"');
    lines.push('');
    lines.push(bodyHtml);
    lines.push('');
    lines.push(`--${boundary}--`);
  } else {
    lines.push('Content-Type: text/plain; charset="UTF-8"');
    lines.push('');
    lines.push(bodyText);
  }
  
  return lines.join('\r\n');
}



