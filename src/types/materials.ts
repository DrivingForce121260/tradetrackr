/**
 * Materials Management Types for TradeTrackr
 * 
 * Handles inventory/stock management with supplier delivery integration.
 * Materials are created/updated when supplier deliveries are confirmed.
 * 
 * Collections:
 * - materials/{id}: Material master data + current stock
 * - materialMovements/{id}: Stock movement history
 */

import { SupplierSnapshot, UserSnapshot } from './suppliers';
import { ProjectSnapshot } from './procurement';

// ============================================================================
// MATERIAL
// ============================================================================

/**
 * Material document
 * Collection: materials/{id}
 */
export interface Material {
  id: string;
  concernID: string;
  
  // Optional project scoping (allows project-specific stock buckets)
  projectId?: string;
  projectSnapshot?: ProjectSnapshot;
  
  // Material details
  name: string;
  description?: string;
  sku?: string;
  category?: string;
  unit: string; // Stk, m, kg, l, m², m³, etc.
  
  // Supplier info (last supplier this was purchased from)
  supplierId?: string;
  supplierSnapshot?: SupplierSnapshot;
  
  // Stock tracking
  stock: {
    onHand: number;
    reserved?: number; // For future use (reservations)
    available?: number; // Computed: onHand - reserved
  };
  
  // Pricing (last known values)
  lastPurchasePriceNet?: number;
  vatRate?: number;
  
  // Status
  status: MaterialStatus;
  
  // Thresholds for low stock alerts (optional)
  minStock?: number;
  reorderPoint?: number;
  
  notes?: string;
  
  // Metadata
  createdAt: any; // Firestore Timestamp
  updatedAt: any;
  createdBy?: UserSnapshot;
  updatedBy?: UserSnapshot;
}

export type MaterialStatus = 'available' | 'low_stock' | 'out_of_stock' | 'discontinued';

export const MATERIAL_STATUS_LABELS: Record<MaterialStatus, string> = {
  available: 'Verfügbar',
  low_stock: 'Niedriger Bestand',
  out_of_stock: 'Nicht auf Lager',
  discontinued: 'Auslaufend',
};

export const MATERIAL_STATUS_COLORS: Record<MaterialStatus, { bg: string; text: string }> = {
  available: { bg: 'bg-green-100', text: 'text-green-700' },
  low_stock: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  out_of_stock: { bg: 'bg-red-100', text: 'text-red-700' },
  discontinued: { bg: 'bg-gray-100', text: 'text-gray-700' },
};

export type MaterialCreateInput = Omit<
  Material,
  'id' | 'concernID' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'
>;

export type MaterialUpdateInput = Partial<MaterialCreateInput>;

// ============================================================================
// MATERIAL MOVEMENT
// ============================================================================

export type MovementType = 'in' | 'out' | 'adjust';

export const MOVEMENT_TYPE_LABELS: Record<MovementType, string> = {
  in: 'Eingang',
  out: 'Ausgang',
  adjust: 'Korrektur',
};

/**
 * Reference to source document for traceability
 */
export interface MovementReference {
  supplierDeliveryId?: string;
  deliveryNoteNumber?: string;
  supplierId?: string;
  supplierName?: string;
  supplierInvoiceId?: string;
  invoiceNumber?: string;
  purchaseOrderId?: string;
  orderNumber?: string;
}

/**
 * Material Movement document
 * Collection: materialMovements/{id}
 */
export interface MaterialMovement {
  id: string;
  concernID: string;
  materialId: string;
  
  // Optional project scoping
  projectId?: string;
  
  // Movement details
  type: MovementType;
  qty: number; // Positive for in, negative for out, +/- for adjust
  
  // Reference to source documents
  reference?: MovementReference;
  
  // When this movement occurred
  at: any; // Firestore Timestamp
  
  notes?: string;
  
  // Audit
  createdBy?: UserSnapshot;
  createdAt: any;
}

export type MaterialMovementCreateInput = Omit<
  MaterialMovement,
  'id' | 'concernID' | 'createdAt'
>;

// ============================================================================
// COMMON UNITS (German)
// ============================================================================

export const MATERIAL_UNITS = [
  { value: 'Stk', label: 'Stück' },
  { value: 'm', label: 'Meter' },
  { value: 'cm', label: 'Zentimeter' },
  { value: 'mm', label: 'Millimeter' },
  { value: 'm²', label: 'Quadratmeter' },
  { value: 'm³', label: 'Kubikmeter' },
  { value: 'kg', label: 'Kilogramm' },
  { value: 'g', label: 'Gramm' },
  { value: 'l', label: 'Liter' },
  { value: 'ml', label: 'Milliliter' },
  { value: 'Paar', label: 'Paar' },
  { value: 'Set', label: 'Set' },
  { value: 'Rolle', label: 'Rolle' },
  { value: 'Karton', label: 'Karton' },
  { value: 'Palette', label: 'Palette' },
  { value: 'Std', label: 'Stunde' },
] as const;

// ============================================================================
// MATERIAL SNAPSHOT (for embedding)
// ============================================================================

export interface MaterialSnapshot {
  id: string;
  name: string;
  sku?: string;
  unit: string;
}



