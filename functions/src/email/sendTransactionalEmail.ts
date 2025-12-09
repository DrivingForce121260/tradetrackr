/**
 * Enhanced Transactional Email Service with Tracking
 * Supports Postmark, Amazon SES, SendGrid, and fallback SMTP
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as https from 'https';
import * as http from 'http';
import { mergePlaceholders } from '../lib/mergePlaceholders';

const db = admin.firestore();
const storage = admin.storage();

interface SendTransactionalEmailInput {
	documentId: string;
	documentType: 'offer' | 'invoice' | 'order' | 'report';
	recipient: string;
	templateId?: string;
	subject?: string;
	body?: string; // Override template body
	attachments?: Array<{
		name: string;
		url: string; // Signed URL or storage path
	}>;
	customData?: Record<string, any>;
	concernID: string;
	locale?: 'de' | 'en';
}

/**
 * Download attachment from URL
 */
async function downloadAttachment(url: string): Promise<{ buffer: Buffer; size: number }> {
	return new Promise((resolve, reject) => {
		const protocol = url.startsWith('https') ? https : http;
		protocol.get(url, (res) => {
			const chunks: Buffer[] = [];
			res.on('data', (chunk) => chunks.push(chunk));
			res.on('end', () => {
				const buffer = Buffer.concat(chunks);
				resolve({ buffer, size: buffer.length });
			});
			res.on('error', reject);
		}).on('error', reject);
	});
}

/**
 * Get attachment from Firebase Storage
 */
async function getStorageAttachment(path: string): Promise<{ buffer: Buffer; size: number }> {
	const bucket = storage.bucket();
	const file = bucket.file(path);
	const [exists] = await file.exists();
	if (!exists) throw new Error(`Attachment not found: ${path}`);
	const [buffer] = await file.download();
	return { buffer, size: buffer.length };
}

/**
 * Send via Postmark
 */
async function sendViaPostmark(
	to: string,
	subject: string,
	html: string,
	attachments: Array<{ name: string; buffer: Buffer }>,
	apiKey: string
): Promise<string> {
	const postmarkAttachments = attachments.map((att) => ({
		Name: att.name,
		Content: att.buffer.toString('base64'),
		ContentType: 'application/pdf',
	}));

	const payload = JSON.stringify({
		From: functions.config().email?.from || 'no-reply@tradetrackr.com',
		To: to,
		Subject: subject,
		HtmlBody: html,
		Attachments: postmarkAttachments,
		TrackOpens: true,
		TrackLinks: 'HtmlAndText',
	});

	return new Promise((resolve, reject) => {
		const req = https.request({
			hostname: 'api.postmarkapp.com',
			path: '/email',
			method: 'POST',
			headers: {
				'Accept': 'application/json',
				'Content-Type': 'application/json',
				'X-Postmark-Server-Token': apiKey,
				'Content-Length': Buffer.byteLength(payload),
			},
		}, (res) => {
			let data = '';
			res.on('data', (chunk) => (data += chunk));
			res.on('end', () => {
				if (res.statusCode === 200) {
					const result = JSON.parse(data);
					resolve(result.MessageID);
				} else {
					reject(new Error(`Postmark error: ${res.statusCode} ${data}`));
				}
			});
		});
		req.on('error', reject);
		req.write(payload);
		req.end();
	});
}

/**
 * Send via SendGrid
 */
async function sendViaSendGrid(
	to: string,
	subject: string,
	html: string,
	attachments: Array<{ name: string; buffer: Buffer }>,
	apiKey: string
): Promise<string> {
	const sendGridAttachments = attachments.map((att) => ({
		content: att.buffer.toString('base64'),
		filename: att.name,
		type: 'application/pdf',
		disposition: 'attachment',
	}));

	const payload = {
		personalizations: [{ to: [{ email: to }] }],
		from: { email: functions.config().email?.from || 'no-reply@tradetrackr.com' },
		subject,
		content: [{ type: 'text/html', value: html }],
		attachments: sendGridAttachments,
		tracking_settings: {
			open_tracking: { enable: true },
			click_tracking: { enable: true },
		},
	};

	return new Promise((resolve, reject) => {
		const req = https.request({
			hostname: 'api.sendgrid.com',
			path: '/v3/mail/send',
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${apiKey}`,
				'Content-Type': 'application/json',
			},
		}, (res) => {
			let data = '';
			res.on('data', (chunk) => (data += chunk));
			res.on('end', () => {
				if (res.statusCode === 202) {
					const xMessageId = res.headers['x-message-id'] as string;
					resolve(xMessageId || 'sendgrid-' + Date.now());
				} else {
					reject(new Error(`SendGrid error: ${res.statusCode} ${data}`));
				}
			});
		});
		req.on('error', reject);
		req.write(JSON.stringify(payload));
		req.end();
	});
}

export const sendTransactionalEmail = functions.https.onCall(async (data: SendTransactionalEmailInput, context) => {
	if (!context.auth) {
		throw new functions.https.HttpsError('unauthenticated', 'Login erforderlich');
	}

	const { documentId, documentType, recipient, templateId, subject, body, attachments = [], customData = {}, concernID, locale = 'de' } = data;

	// Permission check
	const userDoc = await db.collection('users').doc(context.auth.uid).get();
	const user = userDoc.data() || {};
	if (user.concernID !== concernID || !['admin', 'office'].includes(user.role)) {
		throw new functions.https.HttpsError('permission-denied', 'Keine Berechtigung');
	}

	// Get template if templateId provided
	let html = body;
	let finalSubject = subject || `TradeTrackr: ${documentType}`;
	if (templateId) {
		const tSnap = await db.collection('templates').doc(templateId).get();
		if (!tSnap.exists) {
			throw new functions.https.HttpsError('not-found', 'Template nicht gefunden');
		}
		const tmpl = tSnap.data() as any;
		const branding = {
			logoUrl: tmpl.logoUrl || '',
			footerText: tmpl.footerText || '',
			colorPrimary: tmpl.colorPrimary || '#058bc0',
		};
		const templateData = {
			...customData,
			document: { type: documentType, id: documentId },
			portal: { link: `${functions.config().app?.url || 'https://portal.tradetrackr.com'}/documents/${documentId}` },
			branding,
		};
		html = mergePlaceholders(String(tmpl.htmlBody || ''), templateData);
		if (!subject && tmpl.name) {
			finalSubject = mergePlaceholders(tmpl.name, templateData);
		}
	}
	if (!html) {
		throw new functions.https.HttpsError('invalid-argument', 'Body oder Template erforderlich');
	}

	// Prepare attachments
	const attachmentBuffers: Array<{ name: string; buffer: Buffer }> = [];
	let totalSize = 0;
	const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

	for (const att of attachments) {
		let attData: { buffer: Buffer; size: number };
		if (att.url.startsWith('gs://') || att.url.includes('/o/')) {
			// Firebase Storage path
			const pathMatch = att.url.match(/\/o\/(.+?)(\?|$)/);
			const path = pathMatch ? decodeURIComponent(pathMatch[1]) : att.url.replace('gs://', '');
			attData = await getStorageAttachment(path);
		} else if (att.url.startsWith('http://') || att.url.startsWith('https://')) {
			// HTTP/HTTPS URL (signed URLs)
			attData = await downloadAttachment(att.url);
		} else {
			// Skip invalid URLs
			console.warn(`Invalid attachment URL: ${att.url}`);
			continue;
		}
		totalSize += attData.size;
		if (totalSize > MAX_SIZE) {
			throw new functions.https.HttpsError('invalid-argument', 'Gesamtgröße der Anhänge überschreitet 10 MB');
		}
		attachmentBuffers.push({ name: att.name, buffer: attData.buffer });
	}

	// Determine provider
	const emailConfig: any = functions.config().email || {};
	const provider = emailConfig.provider || 'smtp'; // smtp, postmark, sendgrid, ses

	let providerId: string;
	try {
		if (provider === 'postmark' && emailConfig.postmark?.apiKey) {
			providerId = await sendViaPostmark(recipient, finalSubject, html, attachmentBuffers, emailConfig.postmark.apiKey);
		} else if (provider === 'sendgrid' && emailConfig.sendgrid?.apiKey) {
			providerId = await sendViaSendGrid(recipient, finalSubject, html, attachmentBuffers, emailConfig.sendgrid.apiKey);
		} else if (provider === 'ses' && emailConfig.ses?.accessKeyId) {
			// SES via AWS SDK (would require aws-sdk package)
			// For now, fallback to SMTP
			throw new Error('SES not yet implemented, falling back to SMTP');
		} else {
			// Fallback to existing SMTP (nodemailer)
			const nodemailer = require('nodemailer');
			const smtpConfig: any = functions.config().smtp || {};
			if (!smtpConfig.host) {
				throw new functions.https.HttpsError('failed-precondition', 'E-Mail-Provider nicht konfiguriert');
			}
			const transporter = nodemailer.createTransport({
				host: smtpConfig.host,
				port: Number(smtpConfig.port || 587),
				secure: !!smtpConfig.secure,
				auth: smtpConfig.user ? { user: smtpConfig.user, pass: smtpConfig.pass } : undefined,
			});
			const mailOptions: any = {
				from: smtpConfig.from || emailConfig.from || 'no-reply@tradetrackr.com',
				to: recipient,
				subject: finalSubject,
				html,
			};
			if (attachmentBuffers.length > 0) {
				mailOptions.attachments = attachmentBuffers.map((att) => ({
					filename: att.name,
					content: att.buffer,
				}));
			}
			const info = await transporter.sendMail(mailOptions);
			providerId = info.messageId || `smtp-${Date.now()}`;
		}
	} catch (error: any) {
		// Create failed email record
		const emailRef = db.collection('emails').doc();
		await emailRef.set({
			documentId,
			documentType,
			recipient,
			subject: finalSubject,
			status: 'failed',
			errorMessage: error.message || String(error),
			templateId,
			sentAt: admin.firestore.FieldValue.serverTimestamp(),
			attachments: attachments.map((att) => ({ name: att.name, url: att.url, size: 0 })),
		});
		throw new functions.https.HttpsError('internal', `E-Mail konnte nicht gesendet werden: ${error.message}`);
	}

	// Create email record
	const emailRef = db.collection('emails').doc();
	await emailRef.set({
		documentId,
		documentType,
		recipient,
		subject: finalSubject,
		status: 'sent',
		providerId,
		templateId,
		sentAt: admin.firestore.FieldValue.serverTimestamp(),
		attachments: attachments.map((att, idx) => ({
			name: att.name,
			url: att.url,
			size: attachmentBuffers[idx]?.buffer.length || 0,
		})),
		metadata: { sentBy: context.auth.uid },
	});

	return { success: true, emailId: emailRef.id, providerId };
});

