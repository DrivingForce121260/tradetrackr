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
	getDocs 
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { getNextDocumentNumber } from '@/services/invoicingNumbering';
import {
	Client,
	DatevExportOptions,
	DocumentType,
	Invoice,
	InvoiceState,
	LineItem,
	Offer,
	OfferState,
	Order,
	OrderState,
	Payment,
	TaxKey,
	Totals,
} from '@/types/invoicing';

const COLLECTIONS = {
	clients: 'clients',
	offers: 'offers',
	orders: 'orders',
	invoices: 'invoices',
	invoiceItems: 'invoiceItems', // optional, we embed items in documents; keep for potential denorm
	payments: 'payments',
} as const;

export class InvoicingService {
	constructor(private concernID: string, private currentUserUid: string) {}

	// -------------- Clients --------------
	async createClient(client: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
		const now = new Date().toISOString();
		const docRef = await addDoc(collection(db, COLLECTIONS.clients), {
			...client,
			concernID: this.concernID,
			createdAt: now,
			updatedAt: now,
		});
		return docRef.id;
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
	async convertOfferToOrder(offerId: string): Promise<string> {
		const offerSnap = await getDoc(doc(db, COLLECTIONS.offers, offerId));
		if (!offerSnap.exists()) throw new Error('Offer not found');
		const offer = offerSnap.data() as Offer;
		const number = await getNextDocumentNumber('order');
		const now = new Date().toISOString();
		const order: Omit<Order, 'id'> = {
			documentType: 'order',
			number,
			concernID: offer.concernID,
			clientId: offer.clientId,
			clientSnapshot: offer.clientSnapshot,
			locale: offer.locale,
			currency: offer.currency,
			issueDate: offer.issueDate,
			noteInternal: offer.noteInternal,
			noteCustomer: offer.noteCustomer,
			lineItems: offer.lineItems,
			additionalDiscountAbs: offer.additionalDiscountAbs,
			taxKeys: offer.taxKeys,
			totals: offer.totals,
			createdBy: this.currentUserUid,
			createdAt: now,
			updatedAt: now,
			state: 'open',
			relatedOfferId: offerId,
		};
		const ref = await addDoc(collection(db, COLLECTIONS.orders), order);
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
	async convertOrderToInvoice(orderId: string, dueDateISO?: string): Promise<string> {
		const orderSnap = await getDoc(doc(db, COLLECTIONS.orders, orderId));
		if (!orderSnap.exists()) throw new Error('Order not found');
		const order = orderSnap.data() as Order;
		const number = await getNextDocumentNumber('invoice');
		const now = new Date().toISOString();
		const invoice: Omit<Invoice, 'id'> = {
			documentType: 'invoice',
			number,
			concernID: order.concernID,
			clientId: order.clientId,
			clientSnapshot: order.clientSnapshot,
			locale: order.locale,
			currency: order.currency,
			issueDate: order.issueDate,
			dueDate: dueDateISO,
			noteInternal: order.noteInternal,
			noteCustomer: order.noteCustomer,
			lineItems: order.lineItems,
			additionalDiscountAbs: order.additionalDiscountAbs,
			taxKeys: order.taxKeys,
			totals: order.totals,
			createdBy: this.currentUserUid,
			createdAt: now,
			updatedAt: now,
			state: 'draft',
			relatedOrderId: orderId,
			paymentsTotal: 0,
			openAmount: order.totals.grandTotalGross,
		};
		const ref = await addDoc(collection(db, COLLECTIONS.invoices), invoice);
		return ref.id;
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


