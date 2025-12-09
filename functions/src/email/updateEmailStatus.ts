/**
 * Email Status Webhook Handler
 * Receives webhooks from email providers (Postmark, SendGrid, SES) and updates tracking
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import express from 'express';
import type { Request, Response } from 'express';

const db = admin.firestore();
const app = express();

app.use(express.json({ verify: (req: any, res, buf) => { req.rawBody = buf; } }));

/**
 * Postmark webhook handler
 */
app.post('/webhook/postmark', async (req: Request, res: Response) => {
	try {
		const { RecordType, MessageID, Recipient, Metadata } = req.body;
		
		if (RecordType === 'Delivery') {
			const emailQuery = await db.collection('emails').where('providerId', '==', MessageID).limit(1).get();
			if (!emailQuery.empty) {
				await emailQuery.docs[0].ref.update({
					status: 'delivered',
					updatedAt: admin.firestore.FieldValue.serverTimestamp(),
				});
			}
		} else if (RecordType === 'Open') {
			const emailQuery = await db.collection('emails').where('providerId', '==', MessageID).limit(1).get();
			if (!emailQuery.empty) {
				await emailQuery.docs[0].ref.update({
					status: 'opened',
					openedAt: admin.firestore.FieldValue.serverTimestamp(),
					updatedAt: admin.firestore.FieldValue.serverTimestamp(),
				});
			}
		} else if (RecordType === 'Bounce' || RecordType === 'SpamComplaint') {
			const emailQuery = await db.collection('emails').where('providerId', '==', MessageID).limit(1).get();
			if (!emailQuery.empty) {
				await emailQuery.docs[0].ref.update({
					status: 'bounced',
					bounceReason: req.body.Description || req.body.Message || 'Unknown',
					updatedAt: admin.firestore.FieldValue.serverTimestamp(),
				});
			}
		}
		
		res.status(200).send('OK');
	} catch (error: any) {
		console.error('Postmark webhook error:', error);
		res.status(500).send('Error');
	}
});

/**
 * SendGrid webhook handler
 */
app.post('/webhook/sendgrid', async (req: Request, res: Response) => {
	try {
		const events = Array.isArray(req.body) ? req.body : [req.body];
		
		for (const event of events) {
			const { sg_message_id, email, event: eventType, reason, timestamp } = event;
			const messageId = sg_message_id?.replace(/[<>]/g, '').split('.')[0];
			
			if (!messageId) continue;
			
			const emailQuery = await db.collection('emails').where('providerId', '==', messageId).limit(1).get();
			if (emailQuery.empty) continue;
			
			const emailRef = emailQuery.docs[0].ref;
			
			if (eventType === 'delivered') {
				await emailRef.update({
					status: 'delivered',
					updatedAt: admin.firestore.FieldValue.serverTimestamp(),
				});
			} else if (eventType === 'open') {
				await emailRef.update({
					status: 'opened',
					openedAt: admin.firestore.FieldValue.serverTimestamp(),
					updatedAt: admin.firestore.FieldValue.serverTimestamp(),
				});
			} else if (eventType === 'bounce' || eventType === 'dropped') {
				await emailRef.update({
					status: 'bounced',
					bounceReason: reason || 'Unknown',
					updatedAt: admin.firestore.FieldValue.serverTimestamp(),
				});
			}
		}
		
		res.status(200).send('OK');
	} catch (error: any) {
		console.error('SendGrid webhook error:', error);
		res.status(500).send('Error');
	}
});

/**
 * Manual status update (for testing or admin)
 */
app.post('/update', async (req: Request, res: Response) => {
	try {
		const { emailId, status, openedAt, bounceReason } = req.body;
		if (!emailId || !status) {
			return res.status(400).json({ error: 'emailId and status required' });
		}
		
		const updates: any = {
			status,
			updatedAt: admin.firestore.FieldValue.serverTimestamp(),
		};
		if (openedAt) updates.openedAt = admin.firestore.Timestamp.fromDate(new Date(openedAt));
		if (bounceReason) updates.bounceReason = bounceReason;
		
		await db.collection('emails').doc(emailId).update(updates);
		res.status(200).json({ success: true });
	} catch (error: any) {
		console.error('Manual status update error:', error);
		res.status(500).json({ error: error.message });
	}
});

export const emailWebhook = functions.https.onRequest(app);

