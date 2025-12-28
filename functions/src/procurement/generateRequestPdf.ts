/**
 * Generate Procurement Request PDF Cloud Function
 * 
 * Generates a German-compliant procurement request PDF and stores it in Cloud Storage.
 * Returns a public download URL for immediate access.
 * 
 * Mirrors the pattern from generateOfferPdf.ts
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';

const db = admin.firestore();
const storage = admin.storage();

interface GenerateRequestPdfInput {
  concernId: string;
  requestId: string;
}

interface GenerateRequestPdfResult {
  storagePath: string;
  downloadUrl: string;
  fileName: string;
  generatedAt: string;
}

/**
 * Format date for display (German format)
 */
function formatDate(timestamp: any): string {
  if (!timestamp) return '-';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('de-DE');
}

/**
 * Generate HTML for the procurement request PDF
 */
function generateRequestHtml(request: any, branding: any, supplier: any): string {
  // Use branding settings for issuer details
  const issuer = branding || {};
  const issuerAddressParts = [
    issuer.street,
    `${issuer.postalCode || ''} ${issuer.city || ''}`.trim(),
    issuer.country
  ].filter(Boolean);
  const issuerContactParts = [issuer.phone, issuer.email, issuer.website].filter(Boolean);

  // Supplier address
  const supplierAddressParts = [
    request.supplierSnapshot?.name || supplier?.name,
    supplier?.contactPerson,
    supplier?.street,
    supplier?.postalCode && supplier?.city
      ? `${supplier.postalCode} ${supplier.city}`
      : '',
    supplier?.country,
  ].filter(Boolean);

  // Project info
  const projectLine = request.project
    ? `<div><strong>Projekt:</strong> ${request.project.projectNumber} - ${request.project.name}</div>`
    : '';

  // Line items table rows
  const rows = (request.lineItems || []).map((it: any) => `
    <tr>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;vertical-align:top;">${it.position}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;white-space:pre-wrap;word-break:break-word;vertical-align:top;">${it.description}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;vertical-align:top;">${(it.qty || 0).toLocaleString('de-DE')}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;vertical-align:top;">${it.unit}</td>
    </tr>`).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>Anfrage ${request.requestNumber}</title>
      <style>
        @page { size: A4; margin: 15mm; }
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color:#333; line-height:1.4; font-size:11px; margin:0; padding:0; }
        .container { max-width:210mm; margin:0 auto; }
        .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:25px; }
        .issuer-info { font-size:10px; line-height:1.3; }
        .issuer-info strong { font-size:13px; }
        .logo { max-height:50px; margin-bottom:10px; }
        .doc-title { font-size:22px; font-weight:bold; color:#058bc0; margin-bottom:8px; }
        .doc-meta { font-size:10px; }
        .recipient-block { margin-bottom:25px; padding:12px; border:1px solid #eee; border-radius:4px; background:#f9f9f9; }
        table { width:100%; border-collapse:collapse; margin-bottom:20px; font-size:10px; }
        th, td { padding:8px; border-bottom:1px solid #eee; text-align:left; }
        th { background-color:#f0f0f0; font-weight:bold; font-size:9px; text-transform:uppercase; }
        .project-block { margin-bottom:20px; padding:10px; border:2px solid #058bc0; border-radius:4px; background:#e8f4f8; }
        .footer { margin-top:30px; font-size:9px; color:#666; border-top:1px solid #eee; padding-top:12px; }
        .notes { margin-top:20px; padding:12px; border:1px solid #ddd; border-radius:4px; background:#fafafa; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="issuer-info">
            ${issuer.logoUrl ? `<img src="${issuer.logoUrl}" class="logo" alt="Logo" />` : ''}
            <strong>${issuer.companyName || 'Firma'} ${issuer.legalForm || ''}</strong><br/>
            ${issuerAddressParts.join('<br/>')}<br/>
            ${issuerContactParts.join(' | ')}<br/>
            ${issuer.vatId ? `USt-IdNr.: ${issuer.vatId}<br/>` : ''}
          </div>
          <div class="doc-meta">
            <div class="doc-title">Anfrage</div>
            <div><strong>Nummer:</strong> ${request.requestNumber}</div>
            <div><strong>Datum:</strong> ${formatDate(request.requestedAt)}</div>
            <div><strong>Titel:</strong> ${request.title}</div>
          </div>
        </div>

        <div class="recipient-block">
          <strong>Lieferant:</strong><br/>
          ${supplierAddressParts.join('<br/>')}
          ${supplier?.email ? `<br/>E-Mail: ${supplier.email}` : ''}
          ${supplier?.phone ? `<br/>Tel: ${supplier.phone}` : ''}
        </div>

        ${request.project ? `
          <div class="project-block">
            <strong>📁 Projekt:</strong> ${request.project.projectNumber} - ${request.project.name}
          </div>
        ` : ''}

        <p style="margin-bottom:15px;">
          Sehr geehrte Damen und Herren,<br/><br/>
          wir bitten Sie um ein Angebot für die nachfolgend aufgeführten Positionen:
        </p>

        <table>
          <thead>
            <tr>
              <th style="width:8%;">Pos.</th>
              <th style="width:62%;">Beschreibung</th>
              <th style="width:15%;text-align:right;">Menge</th>
              <th style="width:15%;">Einheit</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>

        ${request.notes ? `
          <div class="notes">
            <strong>Anmerkungen:</strong><br/>
            ${request.notes.replace(/\n/g, '<br/>')}
          </div>
        ` : ''}

        <p style="margin-top:20px;">
          Bitte senden Sie uns Ihr Angebot mit Preisen und voraussichtlichen Lieferzeiten.<br/><br/>
          Mit freundlichen Grüßen<br/>
          ${issuer.companyName || 'Ihr TradeTrackr Team'}
        </p>

        <div class="footer">
          ${issuer.companyName ? `<strong>${issuer.companyName} ${issuer.legalForm || ''}</strong><br/>` : ''}
          ${issuerAddressParts.join(' | ')}<br/>
          ${issuerContactParts.join(' | ')}
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Generate Procurement Request PDF Cloud Function
 * 
 * Generates HTML from the request data and stores it in Cloud Storage.
 * Can be printed to PDF by the browser or converted server-side.
 */
export const generateRequestPdf = functions
  .region('europe-west1')
  .https.onCall(async (data: GenerateRequestPdfInput, context): Promise<GenerateRequestPdfResult> => {
    // Auth check
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Login erforderlich');
    }

    const { concernId, requestId } = data;

    if (!concernId || !requestId) {
      throw new functions.https.HttpsError('invalid-argument', 'concernId und requestId sind erforderlich');
    }

    // Permission check - user must belong to concernId
    const userDoc = await db.collection('users').doc(context.auth.uid).get();
    const userData = userDoc.data();
    if (!userData || userData.concernID !== concernId) {
      throw new functions.https.HttpsError('permission-denied', 'Keine Berechtigung für diesen Mandanten');
    }

    // Load procurement request
    const requestDoc = await db.collection('procurementRequests').doc(requestId).get();
    if (!requestDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Anfrage nicht gefunden');
    }
    const request = { id: requestDoc.id, ...requestDoc.data() } as any;

    // Verify request belongs to concernId
    if (request.concernID !== concernId) {
      throw new functions.https.HttpsError('permission-denied', 'Anfrage gehört nicht zu diesem Mandanten');
    }

    // Load branding/company profile
    const concernDoc = await db.collection('concerns').doc(concernId).get();
    const branding = concernDoc.exists ? concernDoc.data()?.branding || {} : {};

    // Load supplier details if available
    let supplier = null;
    if (request.supplierId) {
      const supplierDoc = await db.collection('suppliers').doc(request.supplierId).get();
      if (supplierDoc.exists) {
        supplier = supplierDoc.data();
      }
    }

    // Generate HTML
    const html = generateRequestHtml(request, branding, supplier);

    // Store as HTML file (can be printed to PDF by browser)
    const fileName = `Anfrage_${request.requestNumber.replace(/[^a-zA-Z0-9-]/g, '_')}.html`;
    const storagePath = `procurement/${concernId}/requests/${requestId}/${fileName}`;

    const bucket = storage.bucket();
    const file = bucket.file(storagePath);

    // Generate a download token for public URL access (UUID v4 format)
    const downloadToken = crypto.randomUUID();

    await file.save(html, {
      contentType: 'text/html',
      metadata: {
        contentDisposition: `inline; filename="${fileName}"`,
        metadata: {
          firebaseStorageDownloadTokens: downloadToken,
        },
      },
    });

    // Build public Firebase Storage download URL
    // Format: https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{encodedPath}?alt=media&token={token}
    const bucketName = bucket.name;
    const encodedPath = encodeURIComponent(storagePath);
    const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedPath}?alt=media&token=${downloadToken}`;

    const generatedAt = new Date().toISOString();

    // Update request with PDF path and URL
    await db.collection('procurementRequests').doc(requestId).update({
      pdfStoragePath: storagePath,
      pdfUrl: downloadUrl,
      pdfGeneratedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      storagePath,
      downloadUrl,
      fileName,
      generatedAt,
    };
  });

