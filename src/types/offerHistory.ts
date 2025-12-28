/**
 * Offer History Types
 * 
 * Defines the structure for tracking offer changes and events.
 * History entries are stored in a subcollection: offers/{offerId}/history
 * 
 * IMPORTANT: History entries do NOT contain a tenant field.
 * They are scoped under the parent offer document, and security rules
 * validate access via the parent offer's concernID field.
 */

export type OfferHistoryEventType = 
	| 'CREATED'
	| 'UPDATED'
	| 'PDF_GENERATED'
	| 'SENT'
	| 'FINALIZED';

/**
 * Represents a change to a specific field
 */
export interface OfferHistoryChange {
	field: string;
	fieldLabel: string; // German label for display
	from?: string | number | null;
	to?: string | number | null;
}

/**
 * A single history entry for an offer
 * Note: 'at' can be either a Firestore Timestamp (from server) or ISO string (legacy)
 * Note: No tenant field - history is scoped by parent offer
 */
export interface OfferHistoryEntry {
	id: string;
	offerId: string;
	type: OfferHistoryEventType;
	at: any; // Firestore Timestamp or ISO string (backward compatible)
	byUserId: string;
	byUserName: string;
	summary: string; // German summary text
	changes?: OfferHistoryChange[];
}

/**
 * Helper to normalize timestamp to Date object
 * Handles both Firestore Timestamp and ISO string formats
 */
export function normalizeTimestamp(value: any): Date {
	if (!value) return new Date();
	
	// Firestore Timestamp has toDate() method
	if (typeof value.toDate === 'function') {
		return value.toDate();
	}
	
	// ISO string
	if (typeof value === 'string') {
		return new Date(value);
	}
	
	// Already a Date
	if (value instanceof Date) {
		return value;
	}
	
	// Fallback
	return new Date();
}

/**
 * German labels for history event types
 */
export const HISTORY_EVENT_LABELS: Record<OfferHistoryEventType, string> = {
	CREATED: 'Angebot erstellt',
	UPDATED: 'Angebot bearbeitet',
	PDF_GENERATED: 'PDF erstellt',
	SENT: 'Angebot versendet',
	FINALIZED: 'Angebot finalisiert',
};

/**
 * German labels for common fields that might be changed
 */
export const FIELD_LABELS: Record<string, string> = {
	clientId: 'Kunde',
	clientSnapshot: 'Kundendaten',
	lineItems: 'Positionen',
	totals: 'Summen',
	noteCustomer: 'Kundennotiz',
	noteInternal: 'Interne Notiz',
	issueDate: 'Angebotsdatum',
	validUntil: 'Gültig bis',
	paymentTermsText: 'Zahlungsbedingungen',
	state: 'Status',
};
