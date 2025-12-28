export type LocaleCode = 'de' | 'en';

export type DocumentType = 'offer' | 'order' | 'invoice';

export type OfferState = 'draft' | 'sent' | 'accepted' | 'rejected';
export type OrderState = 'open' | 'in-progress' | 'done';
export type InvoiceState = 'draft' | 'sent' | 'paid' | 'overdue';

export type CurrencyCode = 'EUR';

export interface Address {
	company?: string;
	firstName?: string;
	lastName?: string;
	street?: string;
	postalCode?: string;
	city?: string;
	country?: string;
	email?: string;
	phone?: string;
}

export interface Client {
	id: string;
	concernID: string;
	name: string;
	billingAddress: Address;
	shippingAddress?: Address;
	vatId?: string; // USt-IdNr.
	defaultTaxKey?: string; // e.g. "DE19", "DE7", "DE0"
	currency?: CurrencyCode;
	createdAt: string; // ISO
	updatedAt: string; // ISO
}

export interface TaxKey {
	key: string; // e.g. "DE19"
	ratePct: number; // 19 = 19%
	descriptionDe: string;
	descriptionEn: string;
}

export interface LineItem {
	position: number;
	description: string;
	quantity: number; // stored as decimal
	unit: string; // e.g. Stk, Std, m²
	unitPrice: number; // net per unit
	taxKey: string; // references TaxKey.key
	discountPct?: number; // optional line discount in percent
	// Costing fields (optional for backward compatibility)
	type?: 'material' | 'labor' | 'service';
	unitCost?: number; // cost per unit (before markup)
	unitSell?: number; // selling price per unit (if different from unitPrice)
	markupPct?: number; // markup percentage applied
	lineMargin?: number; // calculated margin for this line (sellTotal - costTotal)
	notes?: string; // costing notes
	materialId?: string; // reference to material library if type='material'
	personnelId?: string; // reference to personnel if type='labor'
}

export interface Totals {
	subtotalNet: number; // Sum of net line totals pre-discount
	lineDiscountTotal: number; // Sum of line discounts
	itemNetAfterDiscount: number; // Net after line discounts
	additionalDiscountAbs: number; // extra document-level discount (absolute)
	vatByKey: Record<string, number>; // taxKey -> tax amount
	totalVat: number;
	grandTotalGross: number;
}

/**
 * Issuer snapshot - frozen company profile at document creation time
 * Ensures documents remain accurate even if company details change later
 */
export interface IssuerSnapshot {
	companyName: string;
	legalForm?: string;
	street?: string;
	postalCode?: string;
	city?: string;
	country?: string;
	email?: string;
	phone?: string;
	website?: string;
	vatId?: string; // USt-IdNr.
	taxNumber?: string; // Steuernummer
	commercialRegister?: string; // Handelsregister
	managingDirector?: string; // Geschäftsführer
	bankName?: string;
	iban?: string;
	bic?: string;
	isSmallBusiness?: boolean; // Kleinunternehmer §19 UStG
	logoUrl?: string;
}

export interface BaseDocument {
	id: string;
	number: string; // YYYY-#### per type
	documentType: DocumentType;
	concernID: string;
	clientId: string;
	clientSnapshot: Pick<Client, 'name' | 'billingAddress' | 'vatId' | 'currency' | 'defaultTaxKey'>;
	issuerSnapshot?: IssuerSnapshot; // Frozen company profile at document creation
	locale: LocaleCode;
	currency: CurrencyCode;
	issueDate: string; // ISO date (YYYY-MM-DD)
	validUntil?: string; // Offer validity date (ISO date)
	dueDate?: string; // invoices
	noteInternal?: string;
	noteCustomer?: string;
	paymentTermsText?: string; // Payment terms for this document
	lineItems: LineItem[];
	additionalDiscountAbs?: number; // absolute document-level
	taxKeys: TaxKey[]; // used to compute totals
	totals: Totals;
	createdBy: string; // uid
	createdAt: string;
	updatedAt: string;
	// PDF generation
	pdfStoragePath?: string; // Cloud Storage path
	pdfGeneratedAt?: string; // ISO timestamp
}

export interface CalcSummary {
	materialsCost: number;
	laborCost: number;
	overheadPct: number; // default 10%
	overheadValue: number; // calculated overhead amount
	marginPct: number; // calculated margin percentage
	marginValue: number; // calculated margin amount
	sellTotal: number; // total selling price
	costTotal: number; // materials + labor + overhead
	snapshotDate?: string; // ISO date when snapshot was locked
	snapshotLocked?: boolean; // if true, costs are frozen
}

/**
 * User identity snapshot for audit trail
 */
export interface UserSnapshot {
	userId: string;
	name: string;
}

export interface Offer extends BaseDocument {
	documentType: 'offer';
	state: OfferState;
	calcSummary?: CalcSummary; // optional costing summary
	// Finalization fields (set when offer is sent/finalized)
	sentAt?: any; // Firestore Timestamp or ISO string (backward compatible)
	sentBy?: UserSnapshot;
	finalizedAt?: any; // Firestore Timestamp or ISO string
	finalizedBy?: UserSnapshot;
}

export interface Order extends BaseDocument {
	documentType: 'order';
	state: OrderState;
	relatedOfferId?: string;
}

/**
 * Payment method for invoice payments
 */
export type PaymentMethod = 'UEBERWEISUNG' | 'BAR' | 'EC' | 'KREDITKARTE' | 'PAYPAL' | 'SONSTIGES';

/**
 * Payment status for invoices
 */
export type PaymentStatus = 'open' | 'partial' | 'paid' | 'overpaid';

/**
 * Payment method display labels (German)
 */
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
	UEBERWEISUNG: 'Überweisung',
	BAR: 'Bar',
	EC: 'EC-Karte',
	KREDITKARTE: 'Kreditkarte',
	PAYPAL: 'PayPal',
	SONSTIGES: 'Sonstiges',
};

/**
 * Payment status display labels (German)
 */
export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
	open: 'Offen',
	partial: 'Teilweise bezahlt',
	paid: 'Bezahlt',
	overpaid: 'Überbezahlt',
};

/**
 * Invoice payment document (stored in invoices/{invoiceId}/payments/{paymentId})
 */
export interface InvoicePayment {
	id?: string; // Firestore doc ID, added on read
	invoiceId: string;
	concernID: string;
	
	amountCents: number; // integer, avoids float issues
	currency: 'EUR';
	
	paidAt: any; // Firestore Timestamp
	method: PaymentMethod;
	
	reference?: string; // optional payment reference
	note?: string; // optional note
	
	recordedByUserId: string;
	recordedByUserName: string;
	
	createdAt: any; // serverTimestamp
}

/**
 * @deprecated Use InvoicePayment instead - kept for backward compatibility
 */
export interface Payment {
	id: string;
	concernID: string;
	invoiceId: string;
	amount: number; // gross
	method: 'bank' | 'cash' | 'card' | 'other';
	paidAt: string; // ISO date
	note?: string;
	createdAt: string;
	createdBy: string;
}

export interface Invoice extends BaseDocument {
	documentType: 'invoice';
	state: InvoiceState;
	relatedOrderId?: string;
	relatedOrderNumber?: string; // Human-readable order number (e.g., "AU-2025-0007") for PDF display
	
	// Payment tracking fields (computed on payment capture)
	paymentStatus?: PaymentStatus; // 'open' | 'partial' | 'paid' | 'overpaid'
	paidAmountCents?: number; // sum of all payments in cents
	openAmountCents?: number; // max(total - sum, 0) in cents
	lastPaymentAt?: any; // Firestore Timestamp of most recent payment
	paidAt?: any; // Firestore Timestamp when fully paid
	
	// Legacy fields (deprecated, kept for backward compatibility)
	paymentsTotal?: number; // @deprecated use paidAmountCents
	openAmount?: number; // @deprecated use openAmountCents
}

export interface NumberCounter {
	id: string; // `${documentType}-${year}`
	documentType: DocumentType;
	year: number;
	seq: number; // last used sequence
	updatedAt: string;
}

export interface DatevExportOptions {
	includePayments?: boolean;
	accountMapping?: Record<string, string>; // taxKey -> account
	contraAccount?: string;
}



