import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { mergePlaceholders } from './lib/mergePlaceholders';
let puppeteer: any;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  puppeteer = require('puppeteer');
} catch {}

const db = admin.firestore();
const storage = admin.storage();

interface RenderCall {
	concernID: string;
	templateId: string;
	data: Record<string, any>;
	output?: 'pdf' | 'html';
}

export const renderTemplate = functions.https.onCall(async (data: RenderCall, context) => {
	if (!context.auth) {
		throw new functions.https.HttpsError('unauthenticated', 'Login erforderlich');
	}
	const { concernID, templateId, output = 'html' } = data;

	// Permission check (basic): only allow admin/office or same concern
	const userDoc = await db.collection('users').doc(context.auth.uid).get();
	const user = userDoc.data() || {};
	if (user.concernID !== concernID || !['admin', 'office'].includes(user.role)) {
		throw new functions.https.HttpsError('permission-denied', 'Keine Berechtigung');
	}

	const tSnap = await db.collection('templates').doc(templateId).get();
	if (!tSnap.exists) throw new functions.https.HttpsError('not-found', 'Template nicht gefunden');
	const t = tSnap.data() as any;

// merge placeholders
	const branding = {
		logoUrl: t.logoUrl || '',
		footerText: t.footerText || '',
		colorPrimary: t.colorPrimary || '#058bc0',
	};
const mergeData = { ...data.data, branding };
const html: string = mergePlaceholders(String(t.htmlBody || ''), mergeData);

	// For now, store HTML; PDF can be added via headless Chromium/Puppeteer
	const bucket = storage.bucket();
	const fileName = `${templateId}_${Date.now()}.${output === 'pdf' ? 'pdf' : 'html'}`;
	const filePath = `renders/${concernID}/${fileName}`;
	const file = bucket.file(filePath);

if (output === 'pdf' && puppeteer) {
    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    try {
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'load' });
        const pdfBuffer = await page.pdf({ printBackground: true, format: 'A4' });
        await file.save(pdfBuffer, { contentType: 'application/pdf' });
    } finally {
        await browser.close();
    }
} else {
    await file.save(html, { contentType: 'text/html;charset=utf-8' });
}

	const [url] = await file.getSignedUrl({ action: 'read', expires: Date.now() + 24 * 60 * 60 * 1000 });
	return { url, contentType: output === 'pdf' ? 'application/pdf' : 'text/html' };
});


