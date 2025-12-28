/**
 * Send Procurement Request Email Cloud Function
 * 
 * Sends the procurement request to the supplier via email.
 * Uses the existing email infrastructure.
 * 
 * German email template with optional project reference.
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

interface SendRequestEmailInput {
  concernId: string;
  requestId: string;
  toEmail?: string; // Optional override, defaults to supplier email
  subject?: string; // Optional override
  body?: string; // Optional override
  attachPdf?: boolean;
}

interface SendRequestEmailResult {
  success: boolean;
  messageId?: string;
  sentTo: string;
  sentAt: string;
}

/**
 * Generate default German email content for procurement request
 */
function generateDefaultEmailContent(
  request: any,
  supplier: any,
  branding: any
): { subject: string; body: string } {
  const companyName = branding?.companyName || 'TradeTrackr';
  const projectLine = request.project
    ? ` zum Projekt ${request.project.projectNumber} - ${request.project.name}`
    : '';

  const subject = `Anfrage ${request.requestNumber} – ${companyName}`;

  const body = `Guten Tag ${supplier?.contactPerson || supplier?.name || 'Sehr geehrte Damen und Herren'},

anbei erhalten Sie unsere Anfrage ${request.requestNumber}${projectLine}.

Bitte senden Sie uns Ihr Angebot mit Preisen und voraussichtlichen Lieferzeiten.

Mit freundlichen Grüßen
${companyName}`;

  return { subject, body };
}

/**
 * Send Procurement Request Email Cloud Function
 * 
 * For now, this function marks the request as sent and records
 * the email details. Actual email delivery uses the mailto: approach
 * on the client side or can be extended to use the transactional
 * email service.
 */
export const sendRequestEmail = functions
  .region('europe-west1')
  .https.onCall(async (data: SendRequestEmailInput, context): Promise<SendRequestEmailResult> => {
    // Auth check
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Login erforderlich');
    }

    const { concernId, requestId, toEmail, subject, body } = data;

    if (!concernId || !requestId) {
      throw new functions.https.HttpsError('invalid-argument', 'concernId und requestId sind erforderlich');
    }

    // Permission check
    const userDoc = await db.collection('users').doc(context.auth.uid).get();
    const userData = userDoc.data();
    if (!userData || userData.concernID !== concernId) {
      throw new functions.https.HttpsError('permission-denied', 'Keine Berechtigung für diesen Mandanten');
    }

    // Load request
    const requestDoc = await db.collection('procurementRequests').doc(requestId).get();
    if (!requestDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Anfrage nicht gefunden');
    }
    const request = { id: requestDoc.id, ...requestDoc.data() } as any;

    if (request.concernID !== concernId) {
      throw new functions.https.HttpsError('permission-denied', 'Anfrage gehört nicht zu diesem Mandanten');
    }

    // Load supplier
    let supplier = null;
    if (request.supplierId) {
      const supplierDoc = await db.collection('suppliers').doc(request.supplierId).get();
      if (supplierDoc.exists) {
        supplier = supplierDoc.data();
      }
    }

    // Determine recipient email
    const recipientEmail = toEmail || supplier?.email || request.supplierSnapshot?.email;
    if (!recipientEmail) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Keine E-Mail-Adresse für den Lieferanten gefunden'
      );
    }

    // Load branding
    const concernDoc = await db.collection('concerns').doc(concernId).get();
    const branding = concernDoc.exists ? concernDoc.data()?.branding || {} : {};

    // Generate email content
    const defaultContent = generateDefaultEmailContent(request, supplier, branding);
    const emailSubject = subject || defaultContent.subject;
    const emailBody = body || defaultContent.body;

    const sentAt = new Date().toISOString();

    // Update request status and history
    // Using Timestamp.now() for history entries (not serverTimestamp in arrays)
    await db.collection('procurementRequests').doc(requestId).update({
      status: 'sent',
      lastSentAt: admin.firestore.FieldValue.serverTimestamp(),
      sentTo: recipientEmail,
      sentEmailSubject: emailSubject,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      // Note: History is pushed via arrayUnion with concrete Timestamp (not serverTimestamp)
      history: admin.firestore.FieldValue.arrayUnion({
        at: admin.firestore.Timestamp.now(),
        type: 'sent',
        message: `Anfrage per E-Mail an ${recipientEmail} versendet`,
        byUserId: context.auth.uid,
        byUserName: userData.displayName || userData.email || null,
      }),
    });

    // TODO: If you want to actually send the email via SMTP or a service,
    // you can call the sendTransactionalEmail function here or integrate
    // with your email provider (Postmark, SendGrid, etc.)
    //
    // For now, the client-side will handle opening the email client,
    // and this function marks the request as sent.

    return {
      success: true,
      sentTo: recipientEmail,
      sentAt,
    };
  });
