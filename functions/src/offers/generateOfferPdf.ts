/**
 * Generate Offer PDF Cloud Function
 * 
 * Generates a German-compliant offer PDF and stores it in Cloud Storage.
 * Returns a signed download URL for immediate access.
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();
const storage = admin.storage();

interface GenerateOfferPdfInput {
	concernId: string;
	offerId: string;
}

interface GenerateOfferPdfResult {
	storagePath: string;
	downloadUrl: string;
	fileName: string;
	generatedAt: string;
}

/**
 * Format currency value for display
 */
function formatCurrency(value: number): string {
	return value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Generate HTML for the offer PDF
 */
function generateOfferHtml(offer: any, branding: any): string {
	const isDE = offer.locale !== 'en';
	const title = isDE ? 'Angebot' : 'Quotation';
	
	// Use branding settings for issuer details
	const issuer = branding || {};
	const issuerAddressParts = [
		issuer.street, 
		`${issuer.postalCode || ''} ${issuer.city || ''}`.trim(), 
		issuer.country
	].filter(Boolean);
	const issuerContactParts = [issuer.phone, issuer.email, issuer.website].filter(Boolean);

	// Customer address
	const customerAddressParts = [
		offer.clientSnapshot?.billingAddress?.company,
		offer.clientSnapshot?.billingAddress?.firstName && offer.clientSnapshot?.billingAddress?.lastName
			? `${offer.clientSnapshot.billingAddress.firstName} ${offer.clientSnapshot.billingAddress.lastName}`
			: offer.clientSnapshot?.billingAddress?.firstName || offer.clientSnapshot?.billingAddress?.lastName,
		offer.clientSnapshot?.billingAddress?.street,
		offer.clientSnapshot?.billingAddress?.postalCode && offer.clientSnapshot?.billingAddress?.city
			? `${offer.clientSnapshot.billingAddress.postalCode} ${offer.clientSnapshot.billingAddress.city}`
			: '',
		offer.clientSnapshot?.billingAddress?.country,
	].filter(Boolean);

	// Validity date calculation
	const validityDays = issuer.offerValidityDays || 14;
	const issueDate = new Date(offer.issueDate);
	const validUntil = new Date(issueDate);
	validUntil.setDate(validUntil.getDate() + validityDays);
	const validUntilStr = validUntil.toLocaleDateString('de-DE');

	// VAT handling
	const isSmallBusiness = issuer.isSmallBusiness;
	const vatNote = isSmallBusiness 
		? '<p style="font-size:10px; margin-top:10px;">Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.</p>' 
		: '';

	// VAT lines
	const defaultTaxKeys = [
		{ key: 'DE19', ratePct: 19, descriptionDe: 'MwSt 19%', descriptionEn: 'VAT 19%' },
		{ key: 'DE7', ratePct: 7, descriptionDe: 'MwSt 7%', descriptionEn: 'VAT 7%' },
		{ key: 'DE0', ratePct: 0, descriptionDe: 'Steuerfrei', descriptionEn: 'Tax-free' },
	];

	const vatLines = !isSmallBusiness && offer.totals?.vatByKey
		? Object.entries(offer.totals.vatByKey).map(([key, value]) => `
			<div style="display:flex; justify-content:space-between; margin-top:2px;">
				<span>${isDE ? 'Umsatzsteuer' : 'VAT'} (${defaultTaxKeys.find(t => t.key === key)?.ratePct || 0}%):</span>
				<span>${formatCurrency(value as number)} €</span>
			</div>
		`).join('')
		: '';

	// Line items table rows
	const rows = (offer.lineItems || []).map((it: any) => `
		<tr>
			<td style="padding:6px;border-bottom:1px solid #eee;vertical-align:top;">${it.position}</td>
			<td style="padding:6px;border-bottom:1px solid #eee;white-space:pre-wrap;word-break:break-word;vertical-align:top;">${it.description}</td>
			<td style="padding:6px;border-bottom:1px solid #eee;text-align:right;vertical-align:top;">${(it.quantity || 0).toLocaleString('de-DE')}</td>
			<td style="padding:6px;border-bottom:1px solid #eee;vertical-align:top;">${it.unit}</td>
			<td style="padding:6px;border-bottom:1px solid #eee;text-align:right;vertical-align:top;">${formatCurrency(it.unitPrice || 0)} €</td>
			<td style="padding:6px;border-bottom:1px solid #eee;text-align:right;vertical-align:top;">${formatCurrency((it.quantity || 0) * (it.unitPrice || 0) * (1 - (it.discountPct || 0) / 100))} €</td>
		</tr>`).join('');

	return `
		<!DOCTYPE html>
		<html>
		<head>
			<meta charset="utf-8" />
			<title>${title} ${offer.number}</title>
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
				th, td { padding:6px; border-bottom:1px solid #eee; text-align:left; }
				th { background-color:#f0f0f0; font-weight:bold; font-size:9px; text-transform:uppercase; }
				.totals-block { width:280px; margin-left:auto; border:1px solid #ddd; padding:12px; border-radius:4px; background:#fcfcfc; font-size:11px; }
				.totals-row { display:flex; justify-content:space-between; padding:2px 0; }
				.totals-grand-total { font-size:14px; font-weight:bold; color:#058bc0; border-top:1px solid #ddd; padding-top:6px; margin-top:6px; }
				.footer { margin-top:30px; font-size:9px; color:#666; border-top:1px solid #eee; padding-top:12px; }
				.bank-info, .contact-info { margin-bottom:8px; }
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
						${issuer.taxNumber ? `Steuernummer: ${issuer.taxNumber}<br/>` : ''}
						${issuer.commercialRegister ? `Handelsregister: ${issuer.commercialRegister}<br/>` : ''}
						${issuer.managingDirector ? `Geschäftsführer: ${issuer.managingDirector}<br/>` : ''}
					</div>
					<div class="doc-meta">
						<div class="doc-title">${title}</div>
						<div><strong>Nummer:</strong> ${offer.number}</div>
						<div><strong>Datum:</strong> ${new Date(offer.issueDate).toLocaleDateString('de-DE')}</div>
						<div><strong>Gültig bis:</strong> ${validUntilStr}</div>
					</div>
				</div>

				<div class="recipient-block">
					<strong>Empfänger:</strong><br/>
					${offer.clientSnapshot?.name || ''}<br/>
					${customerAddressParts.join('<br/>')}
				</div>

				<table>
					<thead>
						<tr>
							<th style="width:5%;">Pos.</th>
							<th style="width:45%;">Beschreibung</th>
							<th style="width:10%;text-align:right;">Menge</th>
							<th style="width:10%;">Einheit</th>
							<th style="width:15%;text-align:right;">Einzelpreis</th>
							<th style="width:15%;text-align:right;">Gesamt</th>
						</tr>
					</thead>
					<tbody>
						${rows}
					</tbody>
				</table>

				<div class="totals-block">
					<div class="totals-row">
						<span>Nettosumme:</span>
						<span>${formatCurrency(offer.totals?.itemNetAfterDiscount || 0)} €</span>
					</div>
					${vatLines}
					${!isSmallBusiness ? `
						<div class="totals-row totals-grand-total">
							<span>Gesamtbetrag:</span>
							<span>${formatCurrency(offer.totals?.grandTotalGross || 0)} €</span>
						</div>
					` : `
						<div class="totals-row totals-grand-total">
							<span>Gesamtbetrag:</span>
							<span>${formatCurrency(offer.totals?.itemNetAfterDiscount || 0)} €</span>
						</div>
					`}
					${vatNote}
				</div>

				${issuer.paymentTermsText ? `
					<div style="margin-top:20px; font-size:10px;">
						<strong>Zahlungsbedingungen:</strong><br/>
						${issuer.paymentTermsText}
					</div>
				` : ''}

				<div class="footer">
					${issuer.bankName && issuer.iban ? `
						<div class="bank-info">
							<strong>Bankverbindung:</strong><br/>
							${issuer.bankName} | IBAN: ${issuer.iban}${issuer.bic ? ` | BIC: ${issuer.bic}` : ''}
						</div>
					` : ''}
					${issuer.offerFooterText ? `<div style="margin-top:8px;">${issuer.offerFooterText}</div>` : ''}
				</div>
			</div>
		</body>
		</html>
	`;
}

/**
 * Generate Offer PDF Cloud Function
 * 
 * Generates a PDF from the offer data and stores it in Cloud Storage.
 */
export const generateOfferPdf = functions
	.region('europe-west1')
	.https.onCall(async (data: GenerateOfferPdfInput, context): Promise<GenerateOfferPdfResult> => {
		// Auth check
		if (!context.auth) {
			throw new functions.https.HttpsError('unauthenticated', 'Login erforderlich');
		}

		const { concernId, offerId } = data;

		if (!concernId || !offerId) {
			throw new functions.https.HttpsError('invalid-argument', 'concernId und offerId sind erforderlich');
		}

		// Permission check - user must belong to concernId
		const userDoc = await db.collection('users').doc(context.auth.uid).get();
		const userData = userDoc.data();
		if (!userData || userData.concernID !== concernId) {
			throw new functions.https.HttpsError('permission-denied', 'Keine Berechtigung für diesen Mandanten');
		}

		// Load offer
		const offerDoc = await db.collection('offers').doc(offerId).get();
		if (!offerDoc.exists) {
			throw new functions.https.HttpsError('not-found', 'Angebot nicht gefunden');
		}
		const offer = { id: offerDoc.id, ...offerDoc.data() } as any;

		// Verify offer belongs to concernId
		if (offer.concernID !== concernId) {
			throw new functions.https.HttpsError('permission-denied', 'Angebot gehört nicht zu diesem Mandanten');
		}

		// Load branding/company profile
		const concernDoc = await db.collection('concerns').doc(concernId).get();
		const branding = concernDoc.exists ? concernDoc.data()?.branding || {} : {};

		// Generate HTML
		const html = generateOfferHtml(offer, branding);

		// Generate PDF using puppeteer-core or similar
		// For simplicity, we'll use a lightweight approach with just HTML for now
		// In production, use puppeteer or a PDF service
		
		// For now, store HTML as a text file that can be printed to PDF
		// TODO: Integrate proper PDF generation library
		const fileName = `Angebot_${offer.number.replace(/[^a-zA-Z0-9-]/g, '_')}.html`;
		const storagePath = `offers/${concernId}/${offerId}/${fileName}`;
		
		const bucket = storage.bucket();
		const file = bucket.file(storagePath);
		
		await file.save(html, {
			contentType: 'text/html',
			metadata: {
				contentDisposition: `attachment; filename="${fileName}"`,
			},
		});

		// Generate signed URL (valid for 1 hour)
		const [signedUrl] = await file.getSignedUrl({
			action: 'read',
			expires: Date.now() + 60 * 60 * 1000, // 1 hour
		});

		const generatedAt = new Date().toISOString();

		// Update offer with PDF path
		await db.collection('offers').doc(offerId).update({
			pdfStoragePath: storagePath,
			pdfGeneratedAt: generatedAt,
		});

		return {
			storagePath,
			downloadUrl: signedUrl,
			fileName,
			generatedAt,
		};
	});



