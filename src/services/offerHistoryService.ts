/**
 * Offer History Service
 * 
 * Client-side service for reading and writing offer history.
 * History entries are stored in: offers/{offerId}/history
 * 
 * Note: History entries do NOT store a tenant field. They are scoped
 * under the parent offer document, and security rules validate access
 * via the parent offer's concernID field.
 */

import { 
	collection, 
	addDoc, 
	getDocs, 
	query, 
	orderBy
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { 
	OfferHistoryEntry, 
	OfferHistoryEventType, 
	OfferHistoryChange,
	HISTORY_EVENT_LABELS 
} from '@/types/offerHistory';

/**
 * Add a history entry to an offer
 * Note: No tenant field is stored - history is scoped by parent offer
 */
export async function addOfferHistoryEntry(params: {
	offerId: string;
	type: OfferHistoryEventType;
	userId: string;
	userName: string;
	summary?: string;
	changes?: OfferHistoryChange[];
}): Promise<string> {
	const { offerId, type, userId, userName, summary, changes } = params;

	const historyRef = collection(db, 'offers', offerId, 'history');
	
	const entry = {
		offerId,
		type,
		at: new Date().toISOString(),
		byUserId: userId,
		byUserName: userName,
		summary: summary || HISTORY_EVENT_LABELS[type],
		...(changes && changes.length > 0 ? { changes } : {}),
	};

	const docRef = await addDoc(historyRef, entry);
	return docRef.id;
}

/**
 * Get all history entries for an offer
 */
export async function getOfferHistory(offerId: string): Promise<OfferHistoryEntry[]> {
	const historyRef = collection(db, 'offers', offerId, 'history');
	const q = query(historyRef, orderBy('at', 'desc'));
	
	const snapshot = await getDocs(q);
	
	return snapshot.docs.map(doc => ({
		id: doc.id,
		offerId, // Add offerId from parameter since it's not stored in doc
		...doc.data(),
	} as OfferHistoryEntry));
}

/**
 * Record that an offer was created
 */
export async function recordOfferCreated(params: {
	offerId: string;
	userId: string;
	userName: string;
	offerNumber: string;
}): Promise<void> {
	await addOfferHistoryEntry({
		offerId: params.offerId,
		type: 'CREATED',
		userId: params.userId,
		userName: params.userName,
		summary: `Angebot ${params.offerNumber} erstellt`,
	});
}

/**
 * Record that an offer was updated
 */
export async function recordOfferUpdated(params: {
	offerId: string;
	userId: string;
	userName: string;
	changes?: OfferHistoryChange[];
}): Promise<void> {
	const changesSummary = params.changes && params.changes.length > 0
		? `${params.changes.length} Feld(er) geändert`
		: 'Angebot bearbeitet';

	await addOfferHistoryEntry({
		offerId: params.offerId,
		type: 'UPDATED',
		userId: params.userId,
		userName: params.userName,
		summary: changesSummary,
		changes: params.changes,
	});
}

/**
 * Record that a PDF was generated
 */
export async function recordPdfGenerated(params: {
	offerId: string;
	userId: string;
	userName: string;
}): Promise<void> {
	await addOfferHistoryEntry({
		offerId: params.offerId,
		type: 'PDF_GENERATED',
		userId: params.userId,
		userName: params.userName,
		summary: 'PDF erstellt',
	});
}
