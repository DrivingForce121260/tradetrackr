/**
 * Procurement Types for TradeTrackr
 * 
 * Covers the supplier procurement workflow:
 * - Procurement Requests (Anfragen / RFQs)
 * - Purchase Orders (Bestellungen)
 * - Supplier Deliveries (Lieferungen / Lieferscheine)
 * - Supplier Invoices (Eingangsrechnungen)
 * 
 * All documents belong to a supplier and concern, optionally linked to a project.
 */

import { SupplierSnapshot, UserSnapshot } from './suppliers';

// ============================================================================
// COMMON TYPES
// ============================================================================

/**
 * Project snapshot for embedding in procurement documents
 */
export interface ProjectSnapshot {
  projectId: string;
  projectNumber: string;
  name: string;
}

/**
 * Attachment reference for stored files
 */
export interface AttachmentRef {
  storagePath: string;
  url?: string;
  name: string;
  uploadedAt?: any; // Firestore Timestamp
}

/**
 * History event for audit trail (embedded in documents)
 * 
 * Supports both legacy `type` and new `eventKey` fields for backward compatibility.
 * New writes should use `eventKey` only.
 */
export interface ProcurementHistoryEvent {
  at: any; // Firestore Timestamp
  type?: ProcurementEventType; // Legacy field (for backward compatibility)
  eventKey?: ProcurementEventType; // Canonical field (new writes use this)
  byUserId?: string;
  byUserName?: string;
  message: string;
  details?: Record<string, any>;
}

/**
 * Get the event key from a history event (supports both legacy and new format)
 */
export function getHistoryEventKey(event: ProcurementHistoryEvent): ProcurementEventType {
  return (event.eventKey ?? event.type) as ProcurementEventType;
}

export type ProcurementEventType =
  | 'created'
  | 'created_from_crm_inquiry' // CRM-derived inquiry from email
  | 'updated'
  | 'sent'
  | 'order_placed'
  | 'delivery_received'
  | 'delivery_confirmed'
  | 'invoice_received'
  | 'payment_recorded'
  | 'status_changed'
  | 'linked_to_project'
  | 'unlinked_from_project'
  | 'cancelled'
  | 'returned';

/**
 * German labels for event types
 */
export const PROCUREMENT_EVENT_LABELS: Record<ProcurementEventType, string> = {
  created: 'Erstellt',
  created_from_crm_inquiry: 'Aus E-Mail-Anfrage erstellt',
  updated: 'Bearbeitet',
  sent: 'Gesendet',
  order_placed: 'Bestellung aufgegeben',
  delivery_received: 'Lieferung eingegangen',
  delivery_confirmed: 'Wareneingang bestätigt',
  invoice_received: 'Rechnung eingegangen',
  payment_recorded: 'Zahlung erfasst',
  status_changed: 'Status geändert',
  linked_to_project: 'Projekt zugeordnet',
  unlinked_from_project: 'Projekt-Zuordnung entfernt',
  cancelled: 'Storniert',
  returned: 'Retoure',
};

// ============================================================================
// PROCUREMENT REQUEST (Anfrage / RFQ)
// ============================================================================

export type ProcurementRequestStatus = 'draft' | 'sent' | 'closed' | 'cancelled';

export const PROCUREMENT_REQUEST_STATUS_LABELS: Record<ProcurementRequestStatus, string> = {
  draft: 'Entwurf',
  sent: 'Gesendet',
  closed: 'Geschlossen',
  cancelled: 'Storniert',
};

export const PROCUREMENT_REQUEST_STATUS_COLORS: Record<ProcurementRequestStatus, { bg: string; text: string }> = {
  draft: { bg: 'bg-gray-100', text: 'text-gray-700' },
  sent: { bg: 'bg-blue-100', text: 'text-blue-700' },
  closed: { bg: 'bg-green-100', text: 'text-green-700' },
  cancelled: { bg: 'bg-red-100', text: 'text-red-700' },
};

/**
 * Line item for procurement request (pricing optional)
 */
export interface RequestLineItem {
  position: number;
  sku?: string;
  description: string;
  qty: number;
  unit: string;
  unitPriceNet?: number;
  vatRate?: number;
  notes?: string;
}

/**
 * Procurement Request document
 * Collection: procurementRequests/{id}
 */
export interface ProcurementRequest {
  id: string;
  concernID: string;
  supplierId: string | null; // null for CRM-derived inquiries without supplier
  supplierSnapshot: SupplierSnapshot;
  
  // Optional project link
  project?: ProjectSnapshot;
  
  // Request details
  requestNumber: string;
  title: string;
  requestedAt: any; // Firestore Timestamp
  dueBy?: any; // Firestore Timestamp (optional deadline)
  status: ProcurementRequestStatus;
  
  // Line items
  lineItems: RequestLineItem[];
  
  // Totals (optional until priced)
  totals?: {
    net?: number;
    vat?: number;
    gross?: number;
  };
  
  notes?: string;
  history: ProcurementHistoryEvent[];
  
  // Metadata
  createdAt: any;
  updatedAt: any;
  createdBy?: UserSnapshot;
  updatedBy?: UserSnapshot;
}

export type ProcurementRequestCreateInput = Omit<
  ProcurementRequest,
  'id' | 'concernID' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy' | 'history'
>;

// ============================================================================
// PURCHASE ORDER (Bestellung)
// ============================================================================

export type PurchaseOrderStatus = 'ordered' | 'partially_delivered' | 'delivered' | 'cancelled';

export const PURCHASE_ORDER_STATUS_LABELS: Record<PurchaseOrderStatus, string> = {
  ordered: 'Bestellt',
  partially_delivered: 'Teilgeliefert',
  delivered: 'Geliefert',
  cancelled: 'Storniert',
};

export const PURCHASE_ORDER_STATUS_COLORS: Record<PurchaseOrderStatus, { bg: string; text: string }> = {
  ordered: { bg: 'bg-blue-100', text: 'text-blue-700' },
  partially_delivered: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  delivered: { bg: 'bg-green-100', text: 'text-green-700' },
  cancelled: { bg: 'bg-red-100', text: 'text-red-700' },
};

/**
 * Line item for purchase order (priced)
 */
export interface OrderLineItem {
  position: number;
  sku?: string;
  description: string;
  qty: number;
  qtyDelivered?: number; // Tracks how many have been delivered
  unit: string;
  unitPriceNet: number;
  vatRate: number;
  notes?: string;
}

/**
 * Purchase Order document
 * Collection: purchaseOrders/{id}
 */
export interface PurchaseOrder {
  id: string;
  concernID: string;
  supplierId: string;
  supplierSnapshot: SupplierSnapshot;
  
  // Optional project link
  project?: ProjectSnapshot;
  
  // Source request (if created from RFQ)
  sourceRequestId?: string;
  sourceRequestNumber?: string;
  
  // Order details
  orderNumber: string;
  orderedAt: any; // Firestore Timestamp
  status: PurchaseOrderStatus;
  
  paymentTermsDays?: number;
  deliveryAddress?: string;
  
  // Line items
  lineItems: OrderLineItem[];
  
  // Totals
  totals: {
    net: number;
    vat: number;
    gross: number;
    currency: string;
  };
  
  notes?: string;
  history: ProcurementHistoryEvent[];
  
  // Metadata
  createdAt: any;
  updatedAt: any;
  createdBy?: UserSnapshot;
  updatedBy?: UserSnapshot;
}

export type PurchaseOrderCreateInput = Omit<
  PurchaseOrder,
  'id' | 'concernID' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy' | 'history'
>;

// ============================================================================
// SUPPLIER DELIVERY (Lieferung / Lieferschein)
// ============================================================================

export type SupplierDeliveryStatus = 'received' | 'partially_received' | 'confirmed' | 'returned' | 'cancelled';

export const SUPPLIER_DELIVERY_STATUS_LABELS: Record<SupplierDeliveryStatus, string> = {
  received: 'Eingegangen',
  partially_received: 'Teilweise eingegangen',
  confirmed: 'Bestätigt',
  returned: 'Retoure',
  cancelled: 'Storniert',
};

export const SUPPLIER_DELIVERY_STATUS_COLORS: Record<SupplierDeliveryStatus, { bg: string; text: string }> = {
  received: { bg: 'bg-blue-100', text: 'text-blue-700' },
  partially_received: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  confirmed: { bg: 'bg-green-100', text: 'text-green-700' },
  returned: { bg: 'bg-orange-100', text: 'text-orange-700' },
  cancelled: { bg: 'bg-red-100', text: 'text-red-700' },
};

/**
 * Delivery note details
 */
export interface DeliveryNoteDetails {
  receiverName?: string;
  deliveryAddress?: string;
  carrier?: string;
  tracking?: string;
  attachments?: AttachmentRef[];
}

/**
 * Line item for supplier delivery
 */
export interface DeliveryLineItem {
  position: number;
  sku?: string;
  description: string;
  qtyOrdered?: number; // From order
  qtyDelivered: number;
  unit: string;
  batch?: string;
  serials?: string[];
  
  // Material linkage (set after stock confirmation)
  linkedMaterialId?: string;
}

/**
 * Supplier Delivery document
 * Collection: supplierDeliveries/{id}
 */
export interface SupplierDelivery {
  id: string;
  concernID: string;
  supplierId: string;
  supplierSnapshot: SupplierSnapshot;
  
  // Optional project link
  project?: ProjectSnapshot;
  
  // Source order (if delivery is for a specific order)
  purchaseOrderId?: string;
  purchaseOrderNumber?: string;
  
  // Delivery details
  deliveryNoteNumber: string;
  deliveredAt: any; // Firestore Timestamp
  status: SupplierDeliveryStatus;
  
  deliveryNote: DeliveryNoteDetails;
  
  // Line items
  lineItems: DeliveryLineItem[];
  
  notes?: string;
  history: ProcurementHistoryEvent[];
  
  // Metadata
  createdAt: any;
  updatedAt: any;
  createdBy?: UserSnapshot;
  updatedBy?: UserSnapshot;
}

export type SupplierDeliveryCreateInput = Omit<
  SupplierDelivery,
  'id' | 'concernID' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy' | 'history'
>;

// ============================================================================
// SUPPLIER INVOICE (Eingangsrechnung)
// ============================================================================

export type SupplierInvoiceStatus = 'open' | 'partial' | 'paid' | 'cancelled';

export const SUPPLIER_INVOICE_STATUS_LABELS: Record<SupplierInvoiceStatus, string> = {
  open: 'Offen',
  partial: 'Teilbezahlt',
  paid: 'Bezahlt',
  cancelled: 'Storniert',
};

export const SUPPLIER_INVOICE_STATUS_COLORS: Record<SupplierInvoiceStatus, { bg: string; text: string }> = {
  open: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  partial: { bg: 'bg-orange-100', text: 'text-orange-700' },
  paid: { bg: 'bg-green-100', text: 'text-green-700' },
  cancelled: { bg: 'bg-red-100', text: 'text-red-700' },
};

/**
 * Payment record for supplier invoice
 */
export interface SupplierPayment {
  amount: number;
  paidAt: any; // Firestore Timestamp
  method?: string;
  reference?: string;
  recordedBy?: UserSnapshot;
}

/**
 * Supplier Invoice document
 * Collection: supplierInvoices/{id}
 */
export interface SupplierInvoice {
  id: string;
  concernID: string;
  supplierId: string;
  supplierSnapshot: SupplierSnapshot;
  
  // Optional project link
  project?: ProjectSnapshot;
  
  // Related documents
  purchaseOrderId?: string;
  purchaseOrderNumber?: string;
  deliveryIds?: string[];
  
  // Invoice details
  invoiceNumber: string;
  invoiceDate: any; // Firestore Timestamp
  dueDate?: any; // Firestore Timestamp
  status: SupplierInvoiceStatus;
  
  // Totals
  totals: {
    net: number;
    vat: number;
    gross: number;
    currency: string;
  };
  
  // Payments
  payments?: SupplierPayment[];
  paidAmount?: number;
  openAmount?: number;
  
  attachments?: AttachmentRef[];
  notes?: string;
  history: ProcurementHistoryEvent[];
  
  // Metadata
  createdAt: any;
  updatedAt: any;
  createdBy?: UserSnapshot;
  updatedBy?: UserSnapshot;
}

export type SupplierInvoiceCreateInput = Omit<
  SupplierInvoice,
  'id' | 'concernID' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy' | 'history' | 'paidAmount' | 'openAmount'
>;

