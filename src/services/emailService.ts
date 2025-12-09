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
		const fn = httpsCallable(functions as any, 'sendTransactionalEmail');
		const result = await fn(request);
		return result.data as any;
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
