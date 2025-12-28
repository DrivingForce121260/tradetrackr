import { 
	Timestamp, 
	addDoc, 
	collection, 
	doc, 
	getDoc, 
	setDoc, 
	updateDoc, 
	query, 
	where, 
	getDocs,
	limit,
	orderBy,
	runTransaction
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { getNextDocumentNumber } from '@/services/invoicingNumbering';
import {
	Client,
	DatevExportOptions,
	DocumentType,
	Invoice,
	InvoiceState,
	InvoicePayment,
	LineItem,
	Offer,
	OfferState,
	Order,
	OrderState,
	Payment,
	PaymentMethod,
	PaymentStatus,
	TaxKey,
	Totals,
} from '@/types/invoicing';
import { serverTimestamp } from 'firebase/firestore';

const COLLECTIONS = {
	customers: 'customers', // Changed from 'clients' to use unified customers collection
	offers: 'offers',
	orders: 'orders',
	invoices: 'invoices',
	invoiceItems: 'invoiceItems', // optional, we embed items in documents; keep for potential denorm
	payments: 'payments',
} as const;

/**
 * Recursively removes undefined values from an object to prevent Firestore errors.
 * Firestore rejects writes with undefined values.
 */
function stripUndefined<T extends Record<string, any>>(obj: T): T {
	const result: Record<string, any> = {};
	for (const [key, value] of Object.entries(obj)) {
		if (value === undefined) continue;
		if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
			result[key] = stripUndefined(value);
		} else if (Array.isArray(value)) {
			result[key] = value.map(item => 
				item !== null && typeof item === 'object' && !(item instanceof Date) 
					? stripUndefined(item) 
					: item
			);
		} else {
			result[key] = value;
		}
	}
	return result as T;
}

export class InvoicingService {
	constructor(private concernID: string, private currentUserUid: string) {}

	// -------------- Customers (formerly Clients) --------------
	async createCustomer(customerData: {
		name: string;
		company?: string;
		email?: string;
		phone?: string;
		address?: string;
		city?: string;
		postalCode?: string;
		contactPerson?: string;
		notes?: string;
		vatId?: string;
		status?: string;
	}): Promise<string> {
		const now = new Date().toISOString();
		const docRef = await addDoc(collection(db, COLLECTIONS.customers), {
			...customerData,
			concernID: this.concernID,
			status: customerData.status || 'active',
			createdAt: now,
			updatedAt: now,
		});
		return docRef.id;
	}

	// Legacy alias for backward compatibility
	async createClient(client: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
		// Convert Client format to Customer format
		return this.createCustomer({
			name: client.name,
			company: client.billingAddress?.company || client.name,
			email: client.billingAddress?.email || '',
			phone: client.billingAddress?.phone || '',
			address: client.billingAddress?.street || '',
			city: client.billingAddress?.city || '',
			postalCode: client.billingAddress?.postalCode || '',
			contactPerson: `${client.billingAddress?.firstName || ''} ${client.billingAddress?.lastName || ''}`.trim(),
			vatId: client.vatId || '',
			status: 'active',
		});
	}

	// -------------- Offers --------------
	async createOffer(input: Omit<Offer, 'id' | 'number' | 'createdAt' | 'updatedAt' | 'totals' | 'documentType'>): Promise<string> {
		const number = await getNextDocumentNumber('offer');
		const now = new Date().toISOString();
		const totals = this.computeTotals(input.lineItems, input.taxKeys, input.additionalDiscountAbs ?? 0);
		const payload: Omit<Offer, 'id'> = {
			...input,
			documentType: 'offer',
			number,
			totals,
			createdAt: now,
			updatedAt: now,
		};
		const ref = await addDoc(collection(db, COLLECTIONS.offers), payload);
		return ref.id;
	}

	async updateOffer(id: string, update: Partial<Offer>): Promise<void> {
		update.updatedAt = new Date().toISOString();
		if (update.lineItems || update.taxKeys || typeof update.additionalDiscountAbs === 'number') {
			const docSnap = await getDoc(doc(db, COLLECTIONS.offers, id));
			const current = docSnap.data() as Offer;
			const items = update.lineItems ?? current.lineItems;
			const taxKeys = update.taxKeys ?? current.taxKeys;
			const addDisc = update.additionalDiscountAbs ?? current.additionalDiscountAbs ?? 0;
			update.totals = this.computeTotals(items, taxKeys, addDisc);
		}
		await updateDoc(doc(db, COLLECTIONS.offers, id), update as any);
	}

	async sendOffer(id: string): Promise<void> {
		await updateDoc(doc(db, COLLECTIONS.offers, id), { state: 'sent' as OfferState, updatedAt: new Date().toISOString() });
	}

	async acceptOffer(id: string): Promise<void> {
		await updateDoc(doc(db, COLLECTIONS.offers, id), { state: 'accepted' as OfferState, updatedAt: new Date().toISOString() });
	}

	// -------------- Orders --------------
	/**
	 * Convert an offer to an order.
	 * 
	 * This method:
	 * 1. Validates the offer exists and has required data
	 * 2. Strips undefined values to prevent Firestore errors
	 * 3. Creates the order with relatedOfferId for duplicate prevention
	 * 
	 * @returns The new order ID
	 * @throws Error if offer not found or missing required data
	 */
	async convertOfferToOrder(offerId: string): Promise<string> {
		console.log('[convertOfferToOrder] Starting conversion for offerId:', offerId);
		
		const offerSnap = await getDoc(doc(db, COLLECTIONS.offers, offerId));
		if (!offerSnap.exists()) {
			console.error('[convertOfferToOrder] Offer not found:', offerId);
			throw new Error('OFFER_NOT_FOUND');
		}
		
		const offer = offerSnap.data() as Offer;
		console.log('[convertOfferToOrder] Offer loaded:', {
			offerId,
			concernID: offer.concernID,
			clientId: offer.clientId,
			hasClientSnapshot: !!offer.clientSnapshot,
			hasLineItems: !!offer.lineItems?.length,
			state: offer.state,
		});
		
		// Validate required fields
		if (!offer.concernID) {
			console.error('[convertOfferToOrder] Missing concernID in offer');
			throw new Error('MISSING_CONCERN_ID');
		}
		if (!offer.clientId && !offer.clientSnapshot) {
			console.error('[convertOfferToOrder] Missing client data in offer');
			throw new Error('MISSING_CLIENT_DATA');
		}
		
		const number = await getNextDocumentNumber('order');
		const now = new Date().toISOString();
		
		// Build order data with safe defaults for optional fields
		const order: Omit<Order, 'id'> = {
			documentType: 'order',
			number,
			concernID: offer.concernID,
			clientId: offer.clientId || '',
			clientSnapshot: offer.clientSnapshot,
			locale: offer.locale || 'de-DE',
			currency: offer.currency || 'EUR',
			issueDate: offer.issueDate || now.split('T')[0],
			noteInternal: offer.noteInternal || '',
			noteCustomer: offer.noteCustomer || '',
			lineItems: offer.lineItems || [],
			additionalDiscountAbs: offer.additionalDiscountAbs || 0,
			taxKeys: offer.taxKeys || [{ key: '19%', rate: 19, label: '19% MwSt.' }],
			totals: offer.totals || { netSubtotal: 0, taxBreakdown: [], grandTotalGross: 0 },
			createdBy: this.currentUserUid,
			createdAt: now,
			updatedAt: now,
			state: 'open',
			relatedOfferId: offerId,
		};
		
		// Strip any remaining undefined values recursively
		const sanitizedOrder = stripUndefined(order);
		
		console.log('[convertOfferToOrder] Creating order with sanitized data');
		const ref = await addDoc(collection(db, COLLECTIONS.orders), sanitizedOrder);
		console.log('[convertOfferToOrder] Order created successfully:', ref.id);
		
		return ref.id;
	}

	async setOrderState(id: string, state: OrderState): Promise<void> {
		await updateDoc(doc(db, COLLECTIONS.orders, id), { state, updatedAt: new Date().toISOString() });
	}

  async updateOrder(id: string, update: Partial<Order>): Promise<void> {
    update.updatedAt = new Date().toISOString();
    if (update.lineItems || update.taxKeys || typeof update.additionalDiscountAbs === 'number') {
      const docSnap = await getDoc(doc(db, COLLECTIONS.orders, id));
      const current = docSnap.data() as Order;
      const items = update.lineItems ?? current.lineItems;
      const taxKeys = update.taxKeys ?? current.taxKeys;
      const addDisc = update.additionalDiscountAbs ?? current.additionalDiscountAbs ?? 0;
      update.totals = this.computeTotals(items, taxKeys, addDisc);
    }
    await updateDoc(doc(db, COLLECTIONS.orders, id), update as any);
  }

	// -------------- Invoices --------------
	/**
	 * Convert an order to an invoice with GUARANTEED uniqueness via deterministic invoice ID.
	 * 
	 * Strategy: Use deterministic invoice doc ID = `inv_${orderId}` which guarantees
	 * that only one invoice can ever exist per order (Firestore doc IDs are unique).
	 * 
	 * This method:
	 * 1. Uses tx.get() on the deterministic invoice ref (fully transaction-consistent)
	 * 2. Returns the existing invoice if found (prevents duplicates across tabs/users)
	 * 3. Creates a new invoice with the deterministic ID only if none exists
	 * 
	 * Fallback: Also checks for legacy invoices created with random IDs before this change.
	 * 
	 * @returns { invoiceId: string, existed: boolean } - invoiceId and whether it already existed
	 */
	async convertOrderToInvoice(orderId: string, dueDateISO?: string): Promise<{ invoiceId: string; existed: boolean }> {
		const orderRef = doc(db, COLLECTIONS.orders, orderId);
		
		// Deterministic invoice ID guarantees uniqueness
		const deterministicInvoiceId = `inv_${orderId}`;
		const invRef = doc(db, COLLECTIONS.invoices, deterministicInvoiceId);

		// Pre-generate invoice number outside transaction (number generation may have its own transaction)
		// This is acceptable as we only use it if we actually create the invoice
		const number = await getNextDocumentNumber('invoice');

		return await runTransaction(db, async (tx) => {
			// 1) Check if invoice with deterministic ID already exists (fully transaction-consistent)
			const invSnap = await tx.get(invRef);
			if (invSnap.exists()) {
				return { invoiceId: invRef.id, existed: true };
			}

			// 2) Fallback: Check for legacy invoices created before deterministic IDs
			// This handles invoices created with random IDs in the old implementation
			const legacyQ = query(
				collection(db, COLLECTIONS.invoices),
				where('concernID', '==', this.concernID),
				where('relatedOrderId', '==', orderId),
				limit(1)
			);
			const legacySnap = await getDocs(legacyQ);
			if (!legacySnap.empty) {
				return { invoiceId: legacySnap.docs[0].id, existed: true };
			}

			// 3) Load order inside transaction
			const orderSnap = await tx.get(orderRef);
			if (!orderSnap.exists()) throw new Error('ORDER_NOT_FOUND');
			const order = orderSnap.data() as Order;

			// 4) Build invoice data from order
			const now = new Date().toISOString();
			const issueDate = order.issueDate || now.slice(0, 10);
			
			// Calculate dueDate with fallback logic
			let calculatedDueDate: string | undefined;
			if (dueDateISO) {
				calculatedDueDate = dueDateISO;
			} else if (order.dueDate) {
				calculatedDueDate = order.dueDate;
			} else if ((order as any).paymentTermsDays != null) {
				const days = Number((order as any).paymentTermsDays);
				if (!isNaN(days) && days > 0) {
					const d = new Date(issueDate);
					d.setDate(d.getDate() + days);
					calculatedDueDate = d.toISOString().slice(0, 10);
				}
			}
			
			const invoiceData: Record<string, any> = {
				documentType: 'invoice',
				number,
				concernID: order.concernID,
				clientId: order.clientId,
				clientSnapshot: order.clientSnapshot,
				locale: order.locale,
				currency: order.currency,
				issueDate,
				noteInternal: order.noteInternal || '',
				noteCustomer: order.noteCustomer || '',
				lineItems: order.lineItems,
				additionalDiscountAbs: order.additionalDiscountAbs || 0,
				taxKeys: order.taxKeys,
				totals: order.totals,
				createdBy: this.currentUserUid,
				createdAt: now,
				updatedAt: now,
				state: 'draft',
				relatedOrderId: orderId, // Link to order for duplicate detection
				relatedOrderNumber: order.number || '', // Human-readable order number for PDF display
				paymentsTotal: 0,
				openAmount: order.totals.grandTotalGross,
			};
			
			// Only include dueDate if it has a value
			if (calculatedDueDate) {
				invoiceData.dueDate = calculatedDueDate;
			}
			
			// Sanitize: remove any undefined values before writing to Firestore
			const sanitizedInvoice = this.stripUndefined(invoiceData);
			
			// 5) Create new invoice doc with DETERMINISTIC ID (guarantees uniqueness)
			tx.set(invRef, sanitizedInvoice);

			return { invoiceId: invRef.id, existed: false };
		});
	}
	
	/**
	 * Recursively removes undefined values from an object.
	 * Firestore rejects documents with undefined field values.
	 */
	private stripUndefined<T extends Record<string, any>>(obj: T): T {
		const result: Record<string, any> = {};
		for (const [key, value] of Object.entries(obj)) {
			if (value === undefined) continue;
			if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
				result[key] = this.stripUndefined(value);
			} else {
				result[key] = value;
			}
		}
		return result as T;
	}

	/**
	 * Find an existing invoice for a given order ID.
	 * Used to prevent duplicate invoices when clicking "Zu Rechnung".
	 * 
	 * Strategy:
	 * 1. First try direct get with deterministic ID (inv_${orderId}) - O(1) lookup
	 * 2. Fallback to query for legacy invoices created before deterministic IDs
	 * 
	 * @returns Invoice with id if found, null otherwise
	 */
	async findInvoiceByOrderId(orderId: string): Promise<(Invoice & { id: string }) | null> {
		// 1) Try deterministic ID first (fast O(1) lookup)
		const deterministicId = `inv_${orderId}`;
		const deterministicRef = doc(db, COLLECTIONS.invoices, deterministicId);
		const deterministicSnap = await getDoc(deterministicRef);
		
		if (deterministicSnap.exists()) {
			const data = deterministicSnap.data() as Invoice;
			// Verify concernID matches (security check)
			if (data.concernID === this.concernID) {
				return { id: deterministicSnap.id, ...data };
			}
		}
		
		// 2) Fallback: Query for legacy invoices created with random IDs
		// Uses limit(1) for efficiency and orderBy(createdAt, desc) for deterministic results
		const q = query(
			collection(db, COLLECTIONS.invoices),
			where('concernID', '==', this.concernID),
			where('relatedOrderId', '==', orderId),
			orderBy('createdAt', 'desc'),
			limit(1)
		);
		const snap = await getDocs(q);
		if (snap.empty) return null;
		const d = snap.docs[0];
		return { id: d.id, ...(d.data() as Invoice) };
	}

	/**
	 * Find an existing order for a given offer ID.
	 * Used to prevent duplicate orders when clicking "Zu Auftrag".
	 * 
	 * @returns Order with id if found, null otherwise
	 */
	async findOrderByOfferId(offerId: string): Promise<(Order & { id: string }) | null> {
		// Note: We intentionally omit orderBy to avoid requiring a composite index.
		// Since we expect at most one order per offer (relatedOfferId is unique per offer),
		// the order doesn't matter. limit(1) ensures we get only one result.
		const q = query(
			collection(db, COLLECTIONS.orders),
			where('concernID', '==', this.concernID),
			where('relatedOfferId', '==', offerId),
			limit(1)
		);
		const snap = await getDocs(q);
		if (snap.empty) return null;
		const d = snap.docs[0];
		return { id: d.id, ...(d.data() as Order) };
	}

	async sendInvoice(id: string): Promise<void> {
		await updateDoc(doc(db, COLLECTIONS.invoices, id), { state: 'sent' as InvoiceState, updatedAt: new Date().toISOString() });
	}

  async updateInvoice(id: string, update: Partial<Invoice>): Promise<void> {
    update.updatedAt = new Date().toISOString();
    if (update.lineItems || update.taxKeys || typeof update.additionalDiscountAbs === 'number') {
      const docSnap = await getDoc(doc(db, COLLECTIONS.invoices, id));
      const current = docSnap.data() as Invoice;
      const items = update.lineItems ?? current.lineItems;
      const taxKeys = update.taxKeys ?? current.taxKeys;
      const addDisc = update.additionalDiscountAbs ?? current.additionalDiscountAbs ?? 0;
      update.totals = this.computeTotals(items, taxKeys, addDisc);
    }
    await updateDoc(doc(db, COLLECTIONS.invoices, id), update as any);
    await this.refreshInvoicePaymentState(id);
  }

	async registerPayment(invoiceId: string, data: Omit<Payment, 'id' | 'createdAt' | 'createdBy' | 'concernID'>): Promise<string> {
		const now = new Date().toISOString();
		const ref = await addDoc(collection(db, COLLECTIONS.payments), {
			...data,
			invoiceId,
			concernID: this.concernID,
			createdAt: now,
			createdBy: this.currentUserUid,
		});
		await this.refreshInvoicePaymentState(invoiceId);
		return ref.id;
	}

	async refreshInvoicePaymentState(invoiceId: string): Promise<void> {
		const invoiceRef = doc(db, COLLECTIONS.invoices, invoiceId);
		const invoiceSnap = await getDoc(invoiceRef);
		if (!invoiceSnap.exists()) return;
		const invoice = invoiceSnap.data() as Invoice;
		const q = query(collection(db, COLLECTIONS.payments), where('invoiceId', '==', invoiceId));
		const paymentsSnap = await getDocs(q);
		const total = paymentsSnap.docs.reduce((sum, d) => sum + (d.data().amount || 0), 0);
		const open = Math.max(0, Math.round((invoice.totals.grandTotalGross - total) * 100) / 100);
		let state: InvoiceState = invoice.state;
		if (open === 0) state = 'paid';
		else if (state === 'sent' || state === 'draft') {
			// overdue check can be performed externally; keep state unless paid
		}
		await updateDoc(invoiceRef, { paymentsTotal: total, openAmount: open, state, updatedAt: new Date().toISOString() });
	}

	async refreshOverdueStatuses(): Promise<void> {
		const today = new Date();
		const qInv = query(collection(db, COLLECTIONS.invoices), where('concernID', '==', this.concernID));
		const snap = await getDocs(qInv);
		const updates: Array<Promise<any>> = [];
		snap.forEach(d => {
			const inv = d.data() as Invoice;
			if (inv.state !== 'paid' && inv.dueDate) {
				const due = new Date(inv.dueDate);
				const isOverdue = due < new Date(today.getFullYear(), today.getMonth(), today.getDate());
				if (isOverdue && inv.state !== 'overdue') {
					updates.push(updateDoc(doc(db, COLLECTIONS.invoices, d.id), { state: 'overdue', updatedAt: new Date().toISOString() }));
				}
			}
		});
		await Promise.all(updates);
	}

	// -------------- Totals --------------
	computeTotals(items: LineItem[], taxKeys: TaxKey[], additionalDiscountAbs: number): Totals {
		const taxMap = new Map<string, number>();
		for (const t of taxKeys) taxMap.set(t.key, t.ratePct);

		let subtotalNet = 0;
		let lineDiscountTotal = 0;
		for (const item of items) {
			const net = item.quantity * item.unitPrice;
			const discount = item.discountPct ? (net * item.discountPct) / 100 : 0;
			subtotalNet += net;
			lineDiscountTotal += discount;
		}

		const itemNetAfterDiscount = subtotalNet - lineDiscountTotal;
		const netAfterAllDiscounts = Math.max(0, itemNetAfterDiscount - (additionalDiscountAbs || 0));

		const vatByKey: Record<string, number> = {};
		for (const item of items) {
			const rate = taxMap.get(item.taxKey) ?? 0;
			const net = item.quantity * item.unitPrice;
			const discount = item.discountPct ? (net * item.discountPct) / 100 : 0;
			const netAfter = net - discount;
			// allocate document-level discount proportionally
			const share = itemNetAfterDiscount > 0 ? netAfter / itemNetAfterDiscount : 0;
			const afterDocDiscount = netAfter - share * (additionalDiscountAbs || 0);
			const vat = (afterDocDiscount * rate) / 100;
			vatByKey[item.taxKey] = (vatByKey[item.taxKey] || 0) + vat;
		}

		const totalVat = Object.values(vatByKey).reduce((a, b) => a + b, 0);
		const grandTotalGross = netAfterAllDiscounts + totalVat;

		// round to 2 decimals
		const round2 = (n: number) => Math.round(n * 100) / 100;

		return {
			subtotalNet: round2(subtotalNet),
			lineDiscountTotal: round2(lineDiscountTotal),
			itemNetAfterDiscount: round2(itemNetAfterDiscount),
			additionalDiscountAbs: round2(additionalDiscountAbs || 0),
			vatByKey: Object.fromEntries(Object.entries(vatByKey).map(([k, v]) => [k, round2(v)])),
			totalVat: round2(totalVat),
			grandTotalGross: round2(grandTotalGross),
		};
	}

	// -------------- Invoice Payments --------------
	
	/**
	 * Record a payment for an invoice (transaction-safe).
	 * Updates invoice payment status and aggregate fields.
	 * 
	 * @param invoiceId - The invoice to record payment for
	 * @param payment - Payment details (amount in EUR, method, date, etc.)
	 * @param userName - Display name of the user recording the payment
	 * @returns The created payment document ID
	 */
	async recordPayment(
		invoiceId: string,
		payment: {
			amountEur: number; // Amount in EUR (will be converted to cents)
			method: PaymentMethod;
			paidAt: Date;
			reference?: string;
			note?: string;
		},
		userName: string
	): Promise<string> {
		const invoiceRef = doc(db, COLLECTIONS.invoices, invoiceId);
		const paymentsCol = collection(invoiceRef, 'payments');
		
		// Convert EUR to cents (integer) to avoid float issues
		const amountCents = Math.round(payment.amountEur * 100);
		
		if (amountCents <= 0) {
			throw new Error('INVALID_AMOUNT');
		}
		
		return await runTransaction(db, async (tx) => {
			// 1) Read invoice
			const invoiceSnap = await tx.get(invoiceRef);
			if (!invoiceSnap.exists()) {
				throw new Error('INVOICE_NOT_FOUND');
			}
			
			const invoice = invoiceSnap.data() as Invoice;
			
			// Verify concernID matches
			if (invoice.concernID !== this.concernID) {
				throw new Error('CONCERN_MISMATCH');
			}
			
			// 2) Calculate invoice total in cents
			const invoiceTotalCents = Math.round((invoice.totals?.grandTotalGross || 0) * 100);
			
			// 3) Get current paid amount (default 0 for legacy invoices)
			const currentPaidCents = invoice.paidAmountCents || 0;
			const newPaidCents = currentPaidCents + amountCents;
			
			// 4) Calculate new open amount
			const newOpenCents = Math.max(invoiceTotalCents - newPaidCents, 0);
			
			// 5) Determine payment status
			let paymentStatus: PaymentStatus;
			if (newPaidCents === 0) {
				paymentStatus = 'open';
			} else if (newPaidCents < invoiceTotalCents) {
				paymentStatus = 'partial';
			} else if (newPaidCents === invoiceTotalCents) {
				paymentStatus = 'paid';
			} else {
				paymentStatus = 'overpaid';
			}
			
			// 6) Create payment document
			const paymentDoc: Omit<InvoicePayment, 'id'> = {
				invoiceId,
				concernID: this.concernID,
				amountCents,
				currency: 'EUR',
				paidAt: Timestamp.fromDate(payment.paidAt),
				method: payment.method,
				recordedByUserId: this.currentUserUid,
				recordedByUserName: userName,
				createdAt: serverTimestamp(),
			};
			
			// Only add optional fields if they have values
			if (payment.reference?.trim()) {
				(paymentDoc as any).reference = payment.reference.trim();
			}
			if (payment.note?.trim()) {
				(paymentDoc as any).note = payment.note.trim();
			}
			
			const paymentRef = doc(paymentsCol);
			tx.set(paymentRef, stripUndefined(paymentDoc));
			
			// 7) Update invoice with new payment aggregates
			const invoiceUpdate: Partial<Invoice> & { updatedAt: string } = {
				paymentStatus,
				paidAmountCents: newPaidCents,
				openAmountCents: newOpenCents,
				lastPaymentAt: Timestamp.fromDate(payment.paidAt),
				updatedAt: new Date().toISOString(),
				// Also update legacy fields for backward compatibility
				paymentsTotal: newPaidCents / 100,
				openAmount: newOpenCents / 100,
			};
			
			// Set paidAt timestamp when fully paid
			if (paymentStatus === 'paid' && !invoice.paidAt) {
				invoiceUpdate.paidAt = Timestamp.fromDate(payment.paidAt);
				// Also update state to 'paid'
				invoiceUpdate.state = 'paid';
			}
			
			tx.update(invoiceRef, stripUndefined(invoiceUpdate));
			
			return paymentRef.id;
		});
	}
	
	/**
	 * Get all payments for an invoice, sorted by paidAt descending (newest first).
	 */
	async getPaymentsForInvoice(invoiceId: string): Promise<InvoicePayment[]> {
		const invoiceRef = doc(db, COLLECTIONS.invoices, invoiceId);
		const paymentsCol = collection(invoiceRef, 'payments');
		
		const q = query(paymentsCol, orderBy('paidAt', 'desc'));
		const snap = await getDocs(q);
		
		return snap.docs.map(d => ({
			id: d.id,
			...(d.data() as Omit<InvoicePayment, 'id'>),
		}));
	}
	
	/**
	 * Recalculate and update invoice payment status from all payments.
	 * Useful for fixing inconsistent data or after payment deletion.
	 */
	async recalculatePaymentStatus(invoiceId: string): Promise<void> {
		const invoiceRef = doc(db, COLLECTIONS.invoices, invoiceId);
		const paymentsCol = collection(invoiceRef, 'payments');
		
		await runTransaction(db, async (tx) => {
			const invoiceSnap = await tx.get(invoiceRef);
			if (!invoiceSnap.exists()) {
				throw new Error('INVOICE_NOT_FOUND');
			}
			
			const invoice = invoiceSnap.data() as Invoice;
			if (invoice.concernID !== this.concernID) {
				throw new Error('CONCERN_MISMATCH');
			}
			
			// Get all payments
			const paymentsSnap = await getDocs(paymentsCol);
			
			let totalPaidCents = 0;
			let lastPaymentAt: any = null;
			
			paymentsSnap.forEach(d => {
				const p = d.data() as InvoicePayment;
				totalPaidCents += p.amountCents || 0;
				if (!lastPaymentAt || (p.paidAt && p.paidAt.toMillis() > lastPaymentAt.toMillis())) {
					lastPaymentAt = p.paidAt;
				}
			});
			
			const invoiceTotalCents = Math.round((invoice.totals?.grandTotalGross || 0) * 100);
			const openCents = Math.max(invoiceTotalCents - totalPaidCents, 0);
			
			let paymentStatus: PaymentStatus;
			if (totalPaidCents === 0) {
				paymentStatus = 'open';
			} else if (totalPaidCents < invoiceTotalCents) {
				paymentStatus = 'partial';
			} else if (totalPaidCents === invoiceTotalCents) {
				paymentStatus = 'paid';
			} else {
				paymentStatus = 'overpaid';
			}
			
			const update: any = {
				paymentStatus,
				paidAmountCents: totalPaidCents,
				openAmountCents: openCents,
				paymentsTotal: totalPaidCents / 100,
				openAmount: openCents / 100,
				updatedAt: new Date().toISOString(),
			};
			
			if (lastPaymentAt) {
				update.lastPaymentAt = lastPaymentAt;
			}
			
			if (paymentStatus === 'paid' && !invoice.paidAt && lastPaymentAt) {
				update.paidAt = lastPaymentAt;
				update.state = 'paid';
			}
			
			tx.update(invoiceRef, update);
		});
	}

	// -------------- PDF Helpers --------------
	
	/**
	 * Resolve the order number for an invoice for PDF display.
	 * 
	 * For new invoices, `relatedOrderNumber` is already stored.
	 * For legacy invoices, we fetch the order document to get the number.
	 * 
	 * This should be called before PDF generation to ensure the order number
	 * is available (without showing Firestore IDs in the PDF).
	 * 
	 * @param invoice - The invoice to resolve order number for
	 * @returns Invoice with resolved `relatedOrderNumber`, or undefined if none
	 */
	async resolveInvoiceOrderNumber(invoice: Invoice): Promise<Invoice> {
		// If already has order number, return as-is
		if (invoice.relatedOrderNumber) {
			return invoice;
		}
		
		// If no related order, nothing to resolve
		if (!invoice.relatedOrderId) {
			return invoice;
		}
		
		// Fetch order to get the canonical order number
		try {
			const orderRef = doc(db, COLLECTIONS.orders, invoice.relatedOrderId);
			const orderSnap = await getDoc(orderRef);
			
			if (orderSnap.exists()) {
				const order = orderSnap.data() as Order;
				
				// Verify concernID matches for security
				if (order.concernID === this.concernID) {
					return {
						...invoice,
						relatedOrderNumber: order.number || '',
					};
				} else {
					console.warn(`Order ${invoice.relatedOrderId} belongs to different concern`);
				}
			} else {
				console.warn(`Order ${invoice.relatedOrderId} not found for invoice ${invoice.id}`);
			}
		} catch (error) {
			console.error('Error resolving order number for invoice:', error);
		}
		
		// Fallback: return invoice without order number (PDF will show "unbekannt")
		return {
			...invoice,
			relatedOrderNumber: '', // Empty string signals "could not resolve"
		};
	}
	
	/**
	 * Backfill relatedOrderNumber for invoices that don't have it.
	 * This is a one-time migration helper for existing invoices.
	 * 
	 * @returns Number of invoices updated
	 */
	async backfillInvoiceOrderNumbers(): Promise<number> {
		const q = query(
			collection(db, COLLECTIONS.invoices),
			where('concernID', '==', this.concernID)
		);
		const snap = await getDocs(q);
		
		let updated = 0;
		const updates: Promise<void>[] = [];
		
		for (const invDoc of snap.docs) {
			const inv = invDoc.data() as Invoice;
			
			// Skip if already has order number or no related order
			if (inv.relatedOrderNumber || !inv.relatedOrderId) {
				continue;
			}
			
			// Fetch order
			try {
				const orderRef = doc(db, COLLECTIONS.orders, inv.relatedOrderId);
				const orderSnap = await getDoc(orderRef);
				
				if (orderSnap.exists()) {
					const order = orderSnap.data() as Order;
					
					if (order.concernID === this.concernID && order.number) {
						updates.push(
							updateDoc(doc(db, COLLECTIONS.invoices, invDoc.id), {
								relatedOrderNumber: order.number,
								updatedAt: new Date().toISOString(),
							})
						);
						updated++;
					}
				}
			} catch (error) {
				console.error(`Error backfilling order number for invoice ${invDoc.id}:`, error);
			}
		}
		
		await Promise.all(updates);
		return updated;
	}
	
	// -------------- DATEV Export (basic Buchungsstapel) --------------
	async exportInvoicesToDATEVCSV(invoiceIds: string[], options?: DatevExportOptions): Promise<string> {
		// Vereinfachter Buchungsstapel-Export (an Ihr SKR/Mapping anpassbar)
		const header = [
			'"EXTF"',
			'"510"',
			'"21"',
			'"Buchungsstapel"',
			'"1"'
		].join(';');

		const lines: string[] = [header];
		const contra = options?.contraAccount || '8400'; // Beispiel-Erlöskonto (SKR03)

		for (const id of invoiceIds) {
			const invSnap = await getDoc(doc(db, COLLECTIONS.invoices, id));
			if (!invSnap.exists()) continue;
			const inv = invSnap.data() as Invoice;

			const amount = Math.round(inv.totals.grandTotalGross * 100) / 100;
			const bookingDate = (inv.issueDate || new Date().toISOString().slice(0, 10)).replace(/-/g, '');
			const customerName = (inv.clientSnapshot?.name || inv.clientId || '').replace(/"/g, '');
			const belegNr = inv.number || id;
			const konto = '10000'; // Debitorensammelkonto (Beispiel)
			const text = `${inv.documentType.toUpperCase()} ${belegNr}`;

			const line = [
				`"${belegNr}"`,
				`"${text}"`,
				`"${konto}"`,
				`"${contra}"`,
				`"${amount.toFixed(2)}"`,
				`"${bookingDate}"`,
				`"${customerName}"`,
			].join(';');
			lines.push(line);
		}

		return lines.join('\n') + '\n';
	}
}


