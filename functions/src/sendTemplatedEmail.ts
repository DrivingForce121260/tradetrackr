import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import nodemailer from 'nodemailer';
import { mergePlaceholders } from './lib/mergePlaceholders';

const db = admin.firestore();

interface SendEmailInput {
	concernID: string;
	locale: 'de' | 'en';
	entityType: 'invoice' | 'offer' | 'report';
	entityId: string;
	to: string;
	subject: string;
	data: Record<string, any>;
}

export const sendTemplatedEmail = functions.https.onCall(async (data: SendEmailInput, context) => {
	if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login erforderlich');
	const { concernID, locale, entityType, to, subject } = data;

	const userDoc = await db.collection('users').doc(context.auth.uid).get();
	const user = userDoc.data() || {};
	if (user.concernID !== concernID || !['admin', 'office'].includes(user.role)) {
		throw new functions.https.HttpsError('permission-denied', 'Keine Berechtigung');
	}

	// Active email template by type
    let q: any = db
		.collection('templates')
		.where('concernID', '==', concernID)
		.where('type', '==', 'email')
		.where('locale', '==', locale)
		.where('active', '==', true);

	// prefer context-specific template
	q = q.where('useFor', '==', entityType);
	let snap = await q.limit(1).get();
	if (snap.empty) {
		// fallback: any active email template for locale
		snap = await db
			.collection('templates')
			.where('concernID', '==', concernID)
			.where('type', '==', 'email')
			.where('locale', '==', locale)
			.where('active', '==', true)
			.limit(1)
			.get();
	}
	if (snap.empty) throw new functions.https.HttpsError('failed-precondition', 'Kein aktives E-Mail-Template');
	const tmpl = snap.docs[0].data() as any;

	const branding = {
		logoUrl: tmpl.logoUrl || '',
		footerText: tmpl.footerText || '',
		colorPrimary: tmpl.colorPrimary || '#058bc0',
	};
	const html = mergePlaceholders(String(tmpl.htmlBody || ''), { ...data.data, branding });

	// SMTP config via functions:config:set smtp.*
	const cfg: any = functions.config().smtp || {};
	if (!cfg.host) throw new functions.https.HttpsError('failed-precondition', 'SMTP nicht konfiguriert');

	const transporter = nodemailer.createTransport({
		host: cfg.host,
		port: Number(cfg.port || 587),
		secure: !!cfg.secure,
		auth: cfg.user ? { user: cfg.user, pass: cfg.pass } : undefined,
	});

	await transporter.sendMail({
		from: cfg.from || 'no-reply@tradetrackr.com',
		to,
		subject,
		html,
	});

	return { success: true };
});


