/**
 * Procurement Service for TradeTrackr
 * 
 * Handles CRUD and workflow operations for:
 * - Procurement Requests (Anfragen / RFQs)
 * - Purchase Orders (Bestellungen)
 * - Supplier Deliveries (Lieferungen)
 * - Supplier Invoices (Eingangsrechnungen)
 * 
 * All operations are scoped to the current concern (multi-tenant).
 */

import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  runTransaction,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import {
  ProcurementRequest,
  ProcurementRequestCreateInput,
  ProcurementRequestStatus,
  PurchaseOrder,
  PurchaseOrderCreateInput,
  PurchaseOrderStatus,
  SupplierDelivery,
  SupplierDeliveryCreateInput,
  SupplierDeliveryStatus,
  SupplierInvoice,
  SupplierInvoiceCreateInput,
  SupplierInvoiceStatus,
  ProcurementHistoryEvent,
  ProcurementEventType,
  OrderLineItem,
  DeliveryLineItem,
  SupplierPayment,
} from '@/types/procurement';
import { SupplierSnapshot, UserSnapshot } from '@/types/suppliers';
import { SupplierService } from './supplierService';

// Collection names
const REQUESTS_COLLECTION = 'procurementRequests';
const ORDERS_COLLECTION = 'purchaseOrders';
const DELIVERIES_COLLECTION = 'supplierDeliveries';
const INVOICES_COLLECTION = 'supplierInvoices';
const COUNTERS_COLLECTION = 'procurementCounters';

// ============================================
// SANITIZATION HELPERS (shared with supplierService)
// ============================================

/**
 * Deep check for undefined values in an object.
 */
function findUndefinedPaths(obj: Record<string, any>, path: string = ''): string[] {
  const undefinedPaths: string[] = [];
  
  for (const key of Object.keys(obj)) {
    const currentPath = path ? `${path}.${key}` : key;
    const value = obj[key];
    
    if (value === undefined) {
      undefinedPaths.push(currentPath);
    } else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      if (!(value.constructor && value.constructor.name === 'Timestamp') &&
          !(value._methodName === 'serverTimestamp')) {
        undefinedPaths.push(...findUndefinedPaths(value, currentPath));
      }
    } else if (Array.isArray(value)) {
      // Check array items
      value.forEach((item, idx) => {
        if (item === undefined) {
          undefinedPaths.push(`${currentPath}[${idx}]`);
        } else if (item !== null && typeof item === 'object') {
          // GUARD: Detect serverTimestamp() inside arrays (not allowed by Firestore)
          if (item._methodName === 'serverTimestamp') {
            throw new Error(
              `Ungültige Daten: serverTimestamp() darf nicht in Arrays verwendet werden (Pfad: ${currentPath}[${idx}])`
            );
          }
          // Also check nested objects for serverTimestamp
          for (const nestedKey of Object.keys(item)) {
            const nestedValue = item[nestedKey];
            if (nestedValue && typeof nestedValue === 'object' && nestedValue._methodName === 'serverTimestamp') {
              throw new Error(
                `Ungültige Daten: serverTimestamp() darf nicht in Arrays verwendet werden (Pfad: ${currentPath}[${idx}].${nestedKey})`
              );
            }
          }
          undefinedPaths.push(...findUndefinedPaths(item, `${currentPath}[${idx}]`));
        }
      });
    }
  }
  
  return undefinedPaths;
}

/**
 * Remove undefined values from an object.
 */
function sanitizeForFirestore<T extends Record<string, any>>(obj: T): Partial<T> {
  const result: Partial<T> = {};
  
  for (const key of Object.keys(obj)) {
    const value = obj[key];
    
    if (value === undefined) {
      continue;
    }
    
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      if ((value.constructor && value.constructor.name === 'Timestamp') ||
          (value._methodName === 'serverTimestamp')) {
        result[key as keyof T] = value;
      } else {
        const sanitized = sanitizeForFirestore(value);
        if (Object.keys(sanitized).length > 0) {
          result[key as keyof T] = sanitized as any;
        }
      }
    } else if (Array.isArray(value)) {
      result[key as keyof T] = value.map(item => {
        if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
          return sanitizeForFirestore(item);
        }
        return item;
      }) as any;
    } else {
      result[key as keyof T] = value;
    }
  }
  
  return result;
}

/**
 * Validate and sanitize data before Firestore write.
 */
function validateAndSanitize<T extends Record<string, any>>(
  data: T,
  operation: string
): Partial<T> {
  const sanitized = sanitizeForFirestore(data);
  
  const undefinedPaths = findUndefinedPaths(sanitized as Record<string, any>);
  if (undefinedPaths.length > 0) {
    const errorMessage = `Firestore-Schreibfehler (${operation}): Undefined-Werte gefunden in: ${undefinedPaths.join(', ')}`;
    console.error(errorMessage, { data, sanitized });
    throw new Error(errorMessage);
  }
  
  return sanitized;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Create a history event
 * 
 * IMPORTANT: Uses Timestamp.now() instead of serverTimestamp()
 * because serverTimestamp() is not supported inside arrays in Firestore.
 * See: https://firebase.google.com/docs/firestore/manage-data/add-data#server_timestamp
 */
function createHistoryEvent(
  type: ProcurementEventType,
  message: string,
  user?: UserSnapshot,
  details?: Record<string, any>
): ProcurementHistoryEvent {
  return {
    at: Timestamp.now(), // Client timestamp - serverTimestamp() not allowed in arrays
    type,
    byUserId: user?.userId,
    byUserName: user?.name,
    message,
    details,
  };
}

/**
 * Generate a document number
 * Format: PREFIX-YYYY-NNNN (e.g., ANF-2025-0001)
 */
async function generateNumber(
  concernID: string,
  prefix: string,
  counterType: string
): Promise<string> {
  const year = new Date().getFullYear();
  const counterId = `${concernID}-${counterType}-${year}`;
  const counterRef = doc(db, COUNTERS_COLLECTION, counterId);
  
  let seq = 1;
  
  await runTransaction(db, async (transaction) => {
    const counterDoc = await transaction.get(counterRef);
    
    if (counterDoc.exists()) {
      seq = (counterDoc.data().seq || 0) + 1;
    }
    
    transaction.set(counterRef, {
      concernID,
      type: counterType,
      year,
      seq,
      updatedAt: serverTimestamp(),
    });
  });
  
  return `${prefix}-${year}-${seq.toString().padStart(4, '0')}`;
}

/**
 * Calculate totals from line items
 */
function calculateTotals(
  lineItems: Array<{ qty: number; unitPriceNet?: number; vatRate?: number }>
): { net: number; vat: number; gross: number } {
  let net = 0;
  let vat = 0;
  
  for (const item of lineItems) {
    const lineNet = (item.qty || 0) * (item.unitPriceNet || 0);
    const lineVat = lineNet * ((item.vatRate || 0) / 100);
    net += lineNet;
    vat += lineVat;
  }
  
  return {
    net: Math.round(net * 100) / 100,
    vat: Math.round(vat * 100) / 100,
    gross: Math.round((net + vat) * 100) / 100,
  };
}

// ============================================
// PROCUREMENT SERVICE CLASS
// ============================================

export class ProcurementService {
  private concernID: string;
  private supplierService: SupplierService;

  constructor(concernID: string) {
    if (!concernID) {
      throw new Error('ProcurementService requires concernID');
    }
    this.concernID = concernID;
    this.supplierService = new SupplierService(concernID);
  }

  // ========================================
  // PROCUREMENT REQUESTS (Anfragen)
  // ========================================

  /**
   * Get all requests for a supplier
   */
  async getRequestsBySupplier(supplierId: string): Promise<ProcurementRequest[]> {
    const q = query(
      collection(db, REQUESTS_COLLECTION),
      where('concernID', '==', this.concernID),
      where('supplierId', '==', supplierId),
      orderBy('requestedAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ProcurementRequest));
  }

  /**
   * Get a request by ID
   */
  async getRequestById(id: string): Promise<ProcurementRequest | null> {
    const docRef = doc(db, REQUESTS_COLLECTION, id);
    const snapshot = await getDoc(docRef);
    
    if (!snapshot.exists()) return null;
    
    const data = snapshot.data();
    if (data.concernID !== this.concernID) return null;
    
    return { id: snapshot.id, ...data } as ProcurementRequest;
  }

  /**
   * Create a new procurement request
   */
  async createRequest(
    input: Omit<ProcurementRequestCreateInput, 'requestNumber' | 'history'>,
    user: UserSnapshot
  ): Promise<string> {
    const requestNumber = await generateNumber(this.concernID, 'ANF', 'request');
    
    const rawData = {
      concernID: this.concernID,
      supplierId: input.supplierId,
      supplierSnapshot: input.supplierSnapshot,
      project: input.project || null,
      requestNumber,
      title: input.title || `Anfrage ${requestNumber}`,
      requestedAt: input.requestedAt || serverTimestamp(),
      dueBy: input.dueBy || null,
      status: input.status || 'draft',
      lineItems: input.lineItems || [],
      totals: input.totals || null,
      notes: input.notes || null,
      history: [createHistoryEvent('created', 'Anfrage erstellt', user)],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: user,
      updatedBy: user,
    };
    
    const data = validateAndSanitize(rawData, 'createRequest');
    const docRef = await addDoc(collection(db, REQUESTS_COLLECTION), data);
    return docRef.id;
  }

  /**
   * Update a request
   */
  async updateRequest(
    id: string,
    updates: Partial<ProcurementRequestCreateInput>,
    user: UserSnapshot
  ): Promise<void> {
    const existing = await this.getRequestById(id);
    if (!existing) throw new Error('REQUEST_NOT_FOUND');
    
    const rawData: Record<string, any> = {
      ...updates,
      updatedAt: serverTimestamp(),
      updatedBy: user,
      history: [
        ...existing.history,
        createHistoryEvent('updated', 'Anfrage bearbeitet', user),
      ],
    };
    
    const data = validateAndSanitize(rawData, 'updateRequest');
    await updateDoc(doc(db, REQUESTS_COLLECTION, id), data);
  }

  /**
   * Mark request as sent
   */
  async sendRequest(id: string, user: UserSnapshot): Promise<void> {
    const existing = await this.getRequestById(id);
    if (!existing) throw new Error('REQUEST_NOT_FOUND');
    
    const rawData = {
      status: 'sent' as ProcurementRequestStatus,
      updatedAt: serverTimestamp(),
      updatedBy: user,
      history: [
        ...existing.history,
        createHistoryEvent('sent', 'Anfrage gesendet', user),
      ],
    };
    
    const data = validateAndSanitize(rawData, 'sendRequest');
    await updateDoc(doc(db, REQUESTS_COLLECTION, id), data);
  }

  /**
   * Close a request
   */
  async closeRequest(id: string, user: UserSnapshot): Promise<void> {
    const existing = await this.getRequestById(id);
    if (!existing) throw new Error('REQUEST_NOT_FOUND');
    
    const rawData = {
      status: 'closed' as ProcurementRequestStatus,
      updatedAt: serverTimestamp(),
      updatedBy: user,
      history: [
        ...existing.history,
        createHistoryEvent('status_changed', 'Anfrage geschlossen', user),
      ],
    };
    
    const data = validateAndSanitize(rawData, 'closeRequest');
    await updateDoc(doc(db, REQUESTS_COLLECTION, id), data);
  }

  // ========================================
  // PURCHASE ORDERS (Bestellungen)
  // ========================================

  /**
   * Get all orders for a supplier
   */
  async getOrdersBySupplier(supplierId: string): Promise<PurchaseOrder[]> {
    const q = query(
      collection(db, ORDERS_COLLECTION),
      where('concernID', '==', this.concernID),
      where('supplierId', '==', supplierId),
      orderBy('orderedAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as PurchaseOrder));
  }

  /**
   * Get an order by ID
   */
  async getOrderById(id: string): Promise<PurchaseOrder | null> {
    const docRef = doc(db, ORDERS_COLLECTION, id);
    const snapshot = await getDoc(docRef);
    
    if (!snapshot.exists()) return null;
    
    const data = snapshot.data();
    if (data.concernID !== this.concernID) return null;
    
    return { id: snapshot.id, ...data } as PurchaseOrder;
  }

  /**
   * Create order from a request (RFQ -> PO)
   */
  async createOrderFromRequest(
    requestId: string,
    pricedLineItems: OrderLineItem[],
    user: UserSnapshot
  ): Promise<string> {
    const request = await this.getRequestById(requestId);
    if (!request) throw new Error('REQUEST_NOT_FOUND');
    
    const orderNumber = await generateNumber(this.concernID, 'BEST', 'order');
    const totals = calculateTotals(pricedLineItems);
    
    const rawData = {
      concernID: this.concernID,
      supplierId: request.supplierId,
      supplierSnapshot: request.supplierSnapshot,
      project: request.project || null,
      sourceRequestId: requestId,
      sourceRequestNumber: request.requestNumber,
      orderNumber,
      orderedAt: serverTimestamp(),
      status: 'ordered' as PurchaseOrderStatus,
      paymentTermsDays: null,
      deliveryAddress: null,
      lineItems: pricedLineItems,
      totals: { ...totals, currency: 'EUR' },
      notes: request.notes || null,
      history: [createHistoryEvent('order_placed', `Bestellung aus Anfrage ${request.requestNumber} erstellt`, user)],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: user,
      updatedBy: user,
    };
    
    const data = validateAndSanitize(rawData, 'createOrderFromRequest');
    const docRef = await addDoc(collection(db, ORDERS_COLLECTION), data);
    
    // Close the source request
    await this.closeRequest(requestId, user);
    
    return docRef.id;
  }

  /**
   * Create a direct order (without RFQ)
   */
  async createOrder(
    input: Omit<PurchaseOrderCreateInput, 'orderNumber' | 'history' | 'totals'> & { lineItems: OrderLineItem[] },
    user: UserSnapshot
  ): Promise<string> {
    const orderNumber = await generateNumber(this.concernID, 'BEST', 'order');
    const totals = calculateTotals(input.lineItems);
    
    const rawData = {
      concernID: this.concernID,
      supplierId: input.supplierId,
      supplierSnapshot: input.supplierSnapshot,
      project: input.project || null,
      sourceRequestId: input.sourceRequestId || null,
      sourceRequestNumber: input.sourceRequestNumber || null,
      orderNumber,
      orderedAt: input.orderedAt || serverTimestamp(),
      status: input.status || 'ordered',
      paymentTermsDays: input.paymentTermsDays || null,
      deliveryAddress: input.deliveryAddress || null,
      lineItems: input.lineItems,
      totals: { ...totals, currency: 'EUR' },
      notes: input.notes || null,
      history: [createHistoryEvent('order_placed', 'Bestellung erstellt', user)],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: user,
      updatedBy: user,
    };
    
    const data = validateAndSanitize(rawData, 'createOrder');
    const docRef = await addDoc(collection(db, ORDERS_COLLECTION), data);
    return docRef.id;
  }

  /**
   * Update an order
   */
  async updateOrder(
    id: string,
    updates: Partial<PurchaseOrderCreateInput>,
    user: UserSnapshot
  ): Promise<void> {
    const existing = await this.getOrderById(id);
    if (!existing) throw new Error('ORDER_NOT_FOUND');
    
    const rawData: Record<string, any> = {
      ...updates,
      updatedAt: serverTimestamp(),
      updatedBy: user,
      history: [
        ...existing.history,
        createHistoryEvent('updated', 'Bestellung bearbeitet', user),
      ],
    };
    
    // Recalculate totals if line items changed
    if (updates.lineItems) {
      const totals = calculateTotals(updates.lineItems as OrderLineItem[]);
      rawData.totals = { ...totals, currency: 'EUR' };
    }
    
    const data = validateAndSanitize(rawData, 'updateOrder');
    await updateDoc(doc(db, ORDERS_COLLECTION, id), data);
  }

  /**
   * Mark order as delivered (or partially delivered)
   */
  async markOrderDelivered(
    id: string,
    deliveryId: string,
    isPartial: boolean,
    user: UserSnapshot
  ): Promise<void> {
    const existing = await this.getOrderById(id);
    if (!existing) throw new Error('ORDER_NOT_FOUND');
    
    const newStatus: PurchaseOrderStatus = isPartial ? 'partially_delivered' : 'delivered';
    
    const rawData = {
      status: newStatus,
      updatedAt: serverTimestamp(),
      updatedBy: user,
      history: [
        ...existing.history,
        createHistoryEvent(
          'delivery_received',
          isPartial ? 'Teillieferung eingegangen' : 'Vollständig geliefert',
          user,
          { deliveryId }
        ),
      ],
    };
    
    const data = validateAndSanitize(rawData, 'markOrderDelivered');
    await updateDoc(doc(db, ORDERS_COLLECTION, id), data);
  }

  // ========================================
  // SUPPLIER DELIVERIES (Lieferungen)
  // ========================================

  /**
   * Get all deliveries for a supplier
   */
  async getDeliveriesBySupplier(supplierId: string): Promise<SupplierDelivery[]> {
    const q = query(
      collection(db, DELIVERIES_COLLECTION),
      where('concernID', '==', this.concernID),
      where('supplierId', '==', supplierId),
      orderBy('deliveredAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as SupplierDelivery));
  }

  /**
   * Get a delivery by ID
   */
  async getDeliveryById(id: string): Promise<SupplierDelivery | null> {
    const docRef = doc(db, DELIVERIES_COLLECTION, id);
    const snapshot = await getDoc(docRef);
    
    if (!snapshot.exists()) return null;
    
    const data = snapshot.data();
    if (data.concernID !== this.concernID) return null;
    
    return { id: snapshot.id, ...data } as SupplierDelivery;
  }

  /**
   * Create a delivery from an order
   */
  async createDeliveryFromOrder(
    orderId: string,
    deliveryLineItems: DeliveryLineItem[],
    deliveryNoteNumber: string,
    user: UserSnapshot
  ): Promise<string> {
    const order = await this.getOrderById(orderId);
    if (!order) throw new Error('ORDER_NOT_FOUND');
    
    const rawData = {
      concernID: this.concernID,
      supplierId: order.supplierId,
      supplierSnapshot: order.supplierSnapshot,
      project: order.project || null,
      purchaseOrderId: orderId,
      purchaseOrderNumber: order.orderNumber,
      deliveryNoteNumber,
      deliveredAt: serverTimestamp(),
      status: 'received' as SupplierDeliveryStatus,
      deliveryNote: {},
      lineItems: deliveryLineItems,
      notes: null,
      history: [createHistoryEvent('delivery_received', `Lieferung für Bestellung ${order.orderNumber} erfasst`, user)],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: user,
      updatedBy: user,
    };
    
    const data = validateAndSanitize(rawData, 'createDeliveryFromOrder');
    const docRef = await addDoc(collection(db, DELIVERIES_COLLECTION), data);
    
    // Check if order is fully delivered
    const totalOrdered = order.lineItems.reduce((sum, li) => sum + li.qty, 0);
    const totalDelivered = deliveryLineItems.reduce((sum, li) => sum + li.qtyDelivered, 0);
    const isPartial = totalDelivered < totalOrdered;
    
    await this.markOrderDelivered(orderId, docRef.id, isPartial, user);
    
    return docRef.id;
  }

  /**
   * Create a direct delivery (without order reference)
   */
  async createDelivery(
    input: Omit<SupplierDeliveryCreateInput, 'history'>,
    user: UserSnapshot
  ): Promise<string> {
    const rawData = {
      concernID: this.concernID,
      supplierId: input.supplierId,
      supplierSnapshot: input.supplierSnapshot,
      project: input.project || null,
      purchaseOrderId: input.purchaseOrderId || null,
      purchaseOrderNumber: input.purchaseOrderNumber || null,
      deliveryNoteNumber: input.deliveryNoteNumber,
      deliveredAt: input.deliveredAt || serverTimestamp(),
      status: input.status || 'received',
      deliveryNote: input.deliveryNote || {},
      lineItems: input.lineItems || [],
      notes: input.notes || null,
      history: [createHistoryEvent('delivery_received', 'Lieferung erfasst', user)],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: user,
      updatedBy: user,
    };
    
    const data = validateAndSanitize(rawData, 'createDelivery');
    const docRef = await addDoc(collection(db, DELIVERIES_COLLECTION), data);
    return docRef.id;
  }

  /**
   * Update a delivery
   */
  async updateDelivery(
    id: string,
    updates: Partial<SupplierDeliveryCreateInput>,
    user: UserSnapshot
  ): Promise<void> {
    const existing = await this.getDeliveryById(id);
    if (!existing) throw new Error('DELIVERY_NOT_FOUND');
    
    const rawData: Record<string, any> = {
      ...updates,
      updatedAt: serverTimestamp(),
      updatedBy: user,
      history: [
        ...existing.history,
        createHistoryEvent('updated', 'Lieferung bearbeitet', user),
      ],
    };
    
    const data = validateAndSanitize(rawData, 'updateDelivery');
    await updateDoc(doc(db, DELIVERIES_COLLECTION, id), data);
  }

  /**
   * Confirm delivery receipt (triggers materials linking)
   * Returns the delivery for materials processing
   */
  async confirmDelivery(id: string, user: UserSnapshot): Promise<SupplierDelivery> {
    const existing = await this.getDeliveryById(id);
    if (!existing) throw new Error('DELIVERY_NOT_FOUND');
    
    const rawData = {
      status: 'confirmed' as SupplierDeliveryStatus,
      updatedAt: serverTimestamp(),
      updatedBy: user,
      history: [
        ...existing.history,
        createHistoryEvent('delivery_confirmed', 'Wareneingang bestätigt', user),
      ],
    };
    
    const data = validateAndSanitize(rawData, 'confirmDelivery');
    await updateDoc(doc(db, DELIVERIES_COLLECTION, id), data);
    
    // Return updated delivery for materials processing
    return { ...existing, ...rawData, status: 'confirmed' };
  }

  /**
   * Update delivery line items with linked material IDs
   */
  async updateDeliveryLineItemMaterialLinks(
    id: string,
    lineItems: DeliveryLineItem[]
  ): Promise<void> {
    const rawData = {
      lineItems,
      updatedAt: serverTimestamp(),
    };
    
    const data = validateAndSanitize(rawData, 'updateDeliveryLineItemMaterialLinks');
    await updateDoc(doc(db, DELIVERIES_COLLECTION, id), data);
  }

  // ========================================
  // SUPPLIER INVOICES (Eingangsrechnungen)
  // ========================================

  /**
   * Get all invoices for a supplier
   */
  async getInvoicesBySupplier(supplierId: string): Promise<SupplierInvoice[]> {
    const q = query(
      collection(db, INVOICES_COLLECTION),
      where('concernID', '==', this.concernID),
      where('supplierId', '==', supplierId),
      orderBy('invoiceDate', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as SupplierInvoice));
  }

  /**
   * Get an invoice by ID
   */
  async getInvoiceById(id: string): Promise<SupplierInvoice | null> {
    const docRef = doc(db, INVOICES_COLLECTION, id);
    const snapshot = await getDoc(docRef);
    
    if (!snapshot.exists()) return null;
    
    const data = snapshot.data();
    if (data.concernID !== this.concernID) return null;
    
    return { id: snapshot.id, ...data } as SupplierInvoice;
  }

  /**
   * Create an invoice from delivery(ies)
   */
  async createInvoiceFromDeliveries(
    deliveryIds: string[],
    invoiceNumber: string,
    invoiceDate: Timestamp,
    totals: { net: number; vat: number; gross: number },
    user: UserSnapshot
  ): Promise<string> {
    if (deliveryIds.length === 0) throw new Error('NO_DELIVERIES_PROVIDED');
    
    // Get first delivery for supplier info
    const firstDelivery = await this.getDeliveryById(deliveryIds[0]);
    if (!firstDelivery) throw new Error('DELIVERY_NOT_FOUND');
    
    const rawData = {
      concernID: this.concernID,
      supplierId: firstDelivery.supplierId,
      supplierSnapshot: firstDelivery.supplierSnapshot,
      project: firstDelivery.project || null,
      purchaseOrderId: firstDelivery.purchaseOrderId || null,
      purchaseOrderNumber: firstDelivery.purchaseOrderNumber || null,
      deliveryIds,
      invoiceNumber,
      invoiceDate,
      dueDate: null,
      status: 'open' as SupplierInvoiceStatus,
      totals: { ...totals, currency: 'EUR' },
      payments: [],
      paidAmount: 0,
      openAmount: totals.gross,
      attachments: [],
      notes: null,
      history: [createHistoryEvent('invoice_received', `Rechnung ${invoiceNumber} erfasst`, user)],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: user,
      updatedBy: user,
    };
    
    const data = validateAndSanitize(rawData, 'createInvoiceFromDeliveries');
    const docRef = await addDoc(collection(db, INVOICES_COLLECTION), data);
    return docRef.id;
  }

  /**
   * Create a direct invoice
   */
  async createInvoice(
    input: Omit<SupplierInvoiceCreateInput, 'history'>,
    user: UserSnapshot
  ): Promise<string> {
    const rawData = {
      concernID: this.concernID,
      supplierId: input.supplierId,
      supplierSnapshot: input.supplierSnapshot,
      project: input.project || null,
      purchaseOrderId: input.purchaseOrderId || null,
      purchaseOrderNumber: input.purchaseOrderNumber || null,
      deliveryIds: input.deliveryIds || [],
      invoiceNumber: input.invoiceNumber,
      invoiceDate: input.invoiceDate,
      dueDate: input.dueDate || null,
      status: input.status || 'open',
      totals: input.totals,
      payments: input.payments || [],
      paidAmount: 0,
      openAmount: input.totals.gross,
      attachments: input.attachments || [],
      notes: input.notes || null,
      history: [createHistoryEvent('invoice_received', `Rechnung ${input.invoiceNumber} erfasst`, user)],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: user,
      updatedBy: user,
    };
    
    const data = validateAndSanitize(rawData, 'createInvoice');
    const docRef = await addDoc(collection(db, INVOICES_COLLECTION), data);
    return docRef.id;
  }

  /**
   * Record a payment on an invoice
   */
  async recordPayment(
    id: string,
    payment: SupplierPayment,
    user: UserSnapshot
  ): Promise<void> {
    const existing = await this.getInvoiceById(id);
    if (!existing) throw new Error('INVOICE_NOT_FOUND');
    
    const payments = [...(existing.payments || []), { ...payment, recordedBy: user }];
    const paidAmount = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const openAmount = Math.max(0, existing.totals.gross - paidAmount);
    
    let newStatus: SupplierInvoiceStatus = 'open';
    if (paidAmount >= existing.totals.gross) {
      newStatus = 'paid';
    } else if (paidAmount > 0) {
      newStatus = 'partial';
    }
    
    const rawData = {
      payments,
      paidAmount,
      openAmount,
      status: newStatus,
      updatedAt: serverTimestamp(),
      updatedBy: user,
      history: [
        ...existing.history,
        createHistoryEvent(
          'payment_recorded',
          `Zahlung über ${payment.amount.toFixed(2)} € erfasst`,
          user,
          { amount: payment.amount }
        ),
      ],
    };
    
    const data = validateAndSanitize(rawData, 'recordPayment');
    await updateDoc(doc(db, INVOICES_COLLECTION, id), data);
  }

  /**
   * Mark invoice as fully paid
   */
  async markInvoicePaid(id: string, user: UserSnapshot): Promise<void> {
    const existing = await this.getInvoiceById(id);
    if (!existing) throw new Error('INVOICE_NOT_FOUND');
    
    const rawData = {
      status: 'paid' as SupplierInvoiceStatus,
      paidAmount: existing.totals.gross,
      openAmount: 0,
      updatedAt: serverTimestamp(),
      updatedBy: user,
      history: [
        ...existing.history,
        createHistoryEvent('status_changed', 'Rechnung als bezahlt markiert', user),
      ],
    };
    
    const data = validateAndSanitize(rawData, 'markInvoicePaid');
    await updateDoc(doc(db, INVOICES_COLLECTION, id), data);
  }

  // ========================================
  // PROJECT LINKAGE
  // ========================================

  /**
   * Link a document to a project
   */
  async linkToProject(
    collection_name: string,
    docId: string,
    project: { projectId: string; projectNumber: string; name: string },
    user: UserSnapshot
  ): Promise<void> {
    const collections: Record<string, string> = {
      request: REQUESTS_COLLECTION,
      order: ORDERS_COLLECTION,
      delivery: DELIVERIES_COLLECTION,
      invoice: INVOICES_COLLECTION,
    };
    
    const coll = collections[collection_name];
    if (!coll) throw new Error('INVALID_COLLECTION');
    
    const docRef = doc(db, coll, docId);
    const snapshot = await getDoc(docRef);
    
    if (!snapshot.exists()) throw new Error('DOCUMENT_NOT_FOUND');
    
    const existing = snapshot.data();
    if (existing.concernID !== this.concernID) throw new Error('ACCESS_DENIED');
    
    const rawData = {
      project,
      updatedAt: serverTimestamp(),
      updatedBy: user,
      history: [
        ...(existing.history || []),
        createHistoryEvent('linked_to_project', `Projekt ${project.projectNumber} zugeordnet`, user, { projectId: project.projectId }),
      ],
    };
    
    const data = validateAndSanitize(rawData, 'linkToProject');
    await updateDoc(docRef, data);
  }

  /**
   * Unlink a document from a project
   */
  async unlinkFromProject(
    collection_name: string,
    docId: string,
    user: UserSnapshot
  ): Promise<void> {
    const collections: Record<string, string> = {
      request: REQUESTS_COLLECTION,
      order: ORDERS_COLLECTION,
      delivery: DELIVERIES_COLLECTION,
      invoice: INVOICES_COLLECTION,
    };
    
    const coll = collections[collection_name];
    if (!coll) throw new Error('INVALID_COLLECTION');
    
    const docRef = doc(db, coll, docId);
    const snapshot = await getDoc(docRef);
    
    if (!snapshot.exists()) throw new Error('DOCUMENT_NOT_FOUND');
    
    const existing = snapshot.data();
    if (existing.concernID !== this.concernID) throw new Error('ACCESS_DENIED');
    
    const rawData = {
      project: null,
      updatedAt: serverTimestamp(),
      updatedBy: user,
      history: [
        ...(existing.history || []),
        createHistoryEvent('unlinked_from_project', 'Projekt-Zuordnung entfernt', user),
      ],
    };
    
    const data = validateAndSanitize(rawData, 'unlinkFromProject');
    await updateDoc(docRef, data);
  }

  // ========================================
  // GLOBAL LIST METHODS (cross-supplier)
  // ========================================

  /**
   * List all procurement requests (optionally filtered)
   */
  async listRequests(options?: {
    supplierId?: string;
    projectId?: string;
    status?: ProcurementRequestStatus;
    limit?: number;
  }): Promise<ProcurementRequest[]> {
    let q = query(
      collection(db, REQUESTS_COLLECTION),
      where('concernID', '==', this.concernID),
      orderBy('requestedAt', 'desc')
    );

    const snapshot = await getDocs(q);
    let results = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ProcurementRequest));

    // Client-side filtering (Firestore limits compound queries)
    if (options?.supplierId) {
      results = results.filter(r => r.supplierId === options.supplierId);
    }
    if (options?.projectId) {
      results = results.filter(r => r.project?.projectId === options.projectId);
    }
    if (options?.status) {
      results = results.filter(r => r.status === options.status);
    }
    if (options?.limit) {
      results = results.slice(0, options.limit);
    }

    return results;
  }

  /**
   * List all purchase orders (optionally filtered)
   */
  async listOrders(options?: {
    supplierId?: string;
    projectId?: string;
    status?: PurchaseOrderStatus;
    limit?: number;
  }): Promise<PurchaseOrder[]> {
    let q = query(
      collection(db, ORDERS_COLLECTION),
      where('concernID', '==', this.concernID),
      orderBy('orderedAt', 'desc')
    );

    const snapshot = await getDocs(q);
    let results = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as PurchaseOrder));

    // Client-side filtering
    if (options?.supplierId) {
      results = results.filter(r => r.supplierId === options.supplierId);
    }
    if (options?.projectId) {
      results = results.filter(r => r.project?.projectId === options.projectId);
    }
    if (options?.status) {
      results = results.filter(r => r.status === options.status);
    }
    if (options?.limit) {
      results = results.slice(0, options.limit);
    }

    return results;
  }

  /**
   * List all deliveries (optionally filtered)
   */
  async listDeliveries(options?: {
    supplierId?: string;
    projectId?: string;
    status?: SupplierDeliveryStatus;
    limit?: number;
  }): Promise<SupplierDelivery[]> {
    let q = query(
      collection(db, DELIVERIES_COLLECTION),
      where('concernID', '==', this.concernID),
      orderBy('deliveredAt', 'desc')
    );

    const snapshot = await getDocs(q);
    let results = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as SupplierDelivery));

    // Client-side filtering
    if (options?.supplierId) {
      results = results.filter(r => r.supplierId === options.supplierId);
    }
    if (options?.projectId) {
      results = results.filter(r => r.project?.projectId === options.projectId);
    }
    if (options?.status) {
      results = results.filter(r => r.status === options.status);
    }
    if (options?.limit) {
      results = results.slice(0, options.limit);
    }

    return results;
  }

  /**
   * List all supplier invoices (optionally filtered)
   */
  async listInvoices(options?: {
    supplierId?: string;
    projectId?: string;
    status?: SupplierInvoiceStatus;
    limit?: number;
  }): Promise<SupplierInvoice[]> {
    let q = query(
      collection(db, INVOICES_COLLECTION),
      where('concernID', '==', this.concernID),
      orderBy('invoiceDate', 'desc')
    );

    const snapshot = await getDocs(q);
    let results = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as SupplierInvoice));

    // Client-side filtering
    if (options?.supplierId) {
      results = results.filter(r => r.supplierId === options.supplierId);
    }
    if (options?.projectId) {
      results = results.filter(r => r.project?.projectId === options.projectId);
    }
    if (options?.status) {
      results = results.filter(r => r.status === options.status);
    }
    if (options?.limit) {
      results = results.slice(0, options.limit);
    }

    return results;
  }

  // ========================================
  // AGGREGATED HISTORY
  // ========================================

  /**
   * Get combined history for a supplier (across all document types)
   */
  async getSupplierHistory(supplierId: string): Promise<ProcurementHistoryEvent[]> {
    const [requests, orders, deliveries, invoices] = await Promise.all([
      this.getRequestsBySupplier(supplierId),
      this.getOrdersBySupplier(supplierId),
      this.getDeliveriesBySupplier(supplierId),
      this.getInvoicesBySupplier(supplierId),
    ]);
    
    const allHistory: ProcurementHistoryEvent[] = [];
    
    for (const req of requests) {
      allHistory.push(...(req.history || []));
    }
    for (const ord of orders) {
      allHistory.push(...(ord.history || []));
    }
    for (const del of deliveries) {
      allHistory.push(...(del.history || []));
    }
    for (const inv of invoices) {
      allHistory.push(...(inv.history || []));
    }
    
    // Sort by timestamp (newest first)
    return allHistory.sort((a, b) => {
      const aTime = a.at?.toMillis?.() || 0;
      const bTime = b.at?.toMillis?.() || 0;
      return bTime - aTime;
    });
  }
}

/**
 * Create a ProcurementService instance
 */
export function createProcurementService(concernID: string): ProcurementService {
  return new ProcurementService(concernID);
}

