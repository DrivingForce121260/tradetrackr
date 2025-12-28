// ============================================================================
// EMAIL SERVICE - FIRESTORE OPERATIONS
// ============================================================================

import {
	collection,
	doc,
	getDoc,
	getDocs,
	query,
	where,
	orderBy,
	limit,
} from 'firebase/firestore';
import { db, functions } from '@/config/firebase';
import { httpsCallable } from 'firebase/functions';
import type { EmailRecord, SendEmailRequest } from '@/types/email';

const COLLECTION = 'emails';

export class EmailService {
	private currentUser: any;

	constructor(currentUser: any) {
		this.currentUser = currentUser;
	}

	async getEmailsByDocument(documentId: string): Promise<EmailRecord[]> {
		const q = query(
			collection(db, COLLECTION),
			where('documentId', '==', documentId),
			orderBy('sentAt', 'desc'),
			limit(50)
		);
		const snap = await getDocs(q);
		return snap.docs.map((d) => {
			const data = d.data();
			return {
				id: d.id,
				...data,
				sentAt: data.sentAt?.toDate() || new Date(),
				openedAt: data.openedAt?.toDate(),
			} as EmailRecord;
		});
	}

	async getEmail(id: string): Promise<EmailRecord | null> {
		const ref = await getDoc(doc(db, COLLECTION, id));
		if (!ref.exists()) return null;
		const data = ref.data();
		return {
			id: ref.id,
			...data,
			sentAt: data.sentAt?.toDate() || new Date(),
			openedAt: data.openedAt?.toDate(),
		} as EmailRecord;
	}

	async sendEmail(request: SendEmailRequest & { concernID: string; locale?: 'de' | 'en' }): Promise<{ success: boolean; emailId: string; providerId?: string }> {
		try {
			const fn = httpsCallable(functions as any, 'sendTransactionalEmail');
			const result = await fn(request);
			return result.data as any;
		} catch (error: any) {
			// Check for specific error types
			const errorMessage = error?.message || String(error);
			const errorCode = error?.code;
			
			// CORS or network errors indicate the Cloud Function may not be deployed
			if (errorMessage.includes('CORS') || errorMessage.includes('network') || errorCode === 'functions/unavailable') {
				throw new Error('E-Mail-Service nicht verfügbar. Bitte kontaktieren Sie den Administrator oder versuchen Sie es später erneut.');
			}
			
			// Permission errors
			if (errorCode === 'functions/permission-denied' || errorCode === 'functions/unauthenticated') {
				throw new Error('Keine Berechtigung zum Senden von E-Mails. Bitte melden Sie sich erneut an.');
			}
			
			// Internal errors from the function
			if (errorCode === 'functions/internal') {
				throw new Error('Interner Fehler beim E-Mail-Versand. Bitte versuchen Sie es später erneut.');
			}
			
			// Re-throw with a cleaner message
			throw new Error(`E-Mail konnte nicht gesendet werden: ${errorMessage}`);
		}
	}

	async resendEmail(emailId: string): Promise<{ success: boolean; emailId: string }> {
		const email = await this.getEmail(emailId);
		if (!email) throw new Error('Email not found');

		// Re-fetch document data if needed
		const request: SendEmailRequest & { concernID: string; locale?: 'de' | 'en' } = {
			documentId: email.documentId,
			documentType: email.documentType,
			recipient: email.recipient,
			templateId: email.templateId,
			subject: email.subject,
			attachments: email.attachments?.map((att) => ({ name: att.name, url: att.url })) || [],
			concernID: this.currentUser?.concernID || '',
		};

		return this.sendEmail(request);
	}
}

export default EmailService;
