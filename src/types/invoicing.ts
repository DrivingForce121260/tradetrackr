export type LocaleCode = 'de' | 'en';

export type DocumentType = 'offer' | 'order' | 'invoice';

export type OfferState = 'draft' | 'sent' | 'accepted';
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

export interface BaseDocument {
	id: string;
	number: string; // YYYY-#### per type
	documentType: DocumentType;
	concernID: string;
	clientId: string;
	clientSnapshot: Pick<Client, 'name' | 'billingAddress' | 'vatId' | 'currency' | 'defaultTaxKey'>;
	locale: LocaleCode;
	currency: CurrencyCode;
	issueDate: string; // ISO date (YYYY-MM-DD)
	dueDate?: string; // invoices
	noteInternal?: string;
	noteCustomer?: string;
	lineItems: LineItem[];
	additionalDiscountAbs?: number; // absolute document-level
	taxKeys: TaxKey[]; // used to compute totals
	totals: Totals;
	createdBy: string; // uid
	createdAt: string;
	updatedAt: string;
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

export interface Offer extends BaseDocument {
	documentType: 'offer';
	state: OfferState;
	calcSummary?: CalcSummary; // optional costing summary
}

export interface Order extends BaseDocument {
	documentType: 'order';
	state: OrderState;
	relatedOfferId?: string;
}

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
	paymentsTotal?: number; // computed
	openAmount?: number; // computed
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



