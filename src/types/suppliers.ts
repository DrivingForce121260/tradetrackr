/**
 * Supplier Types for TradeTrackr
 * 
 * Represents vendors/suppliers for incoming invoices and materials.
 * Collection: suppliers/{supplierId}
 */

/**
 * User snapshot for audit trail
 */
export interface UserSnapshot {
  userId: string;
  name: string;
}

/**
 * Supplier status
 */
export type SupplierStatus = 'active' | 'inactive' | 'archived';

/**
 * Main Supplier interface
 * Stored in Firestore: suppliers/{supplierId}
 */
export interface Supplier {
  id: string;
  concernID: string;
  
  // Basic info
  name: string;
  legalForm?: string; // GmbH, AG, etc.
  contactPerson?: string;
  
  // Contact
  email?: string;
  phone?: string;
  website?: string;
  
  // Address
  addressLine1?: string;
  addressLine2?: string;
  postalCode?: string;
  city?: string;
  country: string; // Default: "Deutschland"
  
  // Tax & Banking
  vatId?: string; // USt-IdNr.
  taxNumber?: string; // Steuernummer
  iban?: string;
  bic?: string;
  
  // Payment & DATEV
  paymentTerms?: string; // e.g. "14 Tage netto", "30 Tage 2% Skonto"
  defaultExpenseAccount?: string; // DATEV expense account, e.g. "3400"
  
  // Status & Notes
  status: SupplierStatus;
  notes?: string;
  
  // Metadata
  createdAt: any; // Firestore Timestamp or ISO string
  updatedAt: any;
  createdBy?: UserSnapshot;
  updatedBy?: UserSnapshot;
}

/**
 * Input for creating a new supplier
 * Omits id, timestamps, and metadata fields
 */
export interface SupplierCreateInput {
  name: string;
  legalForm?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  website?: string;
  addressLine1?: string;
  addressLine2?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  vatId?: string;
  taxNumber?: string;
  iban?: string;
  bic?: string;
  paymentTerms?: string;
  defaultExpenseAccount?: string;
  status?: SupplierStatus;
  notes?: string;
}

/**
 * Input for updating a supplier
 * All fields optional
 */
export interface SupplierUpdateInput {
  name?: string;
  legalForm?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  website?: string;
  addressLine1?: string;
  addressLine2?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  vatId?: string;
  taxNumber?: string;
  iban?: string;
  bic?: string;
  paymentTerms?: string;
  defaultExpenseAccount?: string;
  status?: SupplierStatus;
  notes?: string;
}

/**
 * Supplier snapshot for embedding in other documents
 * (e.g., on a supplier invoice to preserve data if supplier changes)
 * 
 * For CRM-derived inquiries (supplierId=null), we use a minimal snapshot:
 * - name: derived from email domain or sender
 * - domain: normalized email domain
 * - email: sender email address
 * - phone: extracted phone (if available)
 * 
 * Note: `id` is optional - not present for CRM-derived inquiries.
 * For those, use sourceCompanyId field on the parent document.
 */
export interface SupplierSnapshot {
  id?: string; // Optional: not present for CRM-derived inquiries
  name: string;
  vatId?: string;
  iban?: string;
  // CRM-derived fields (used when supplierId is null)
  domain?: string | null;
  email?: string | null;
  phone?: string | null;
}

/**
 * German labels for supplier fields
 */
export const SUPPLIER_FIELD_LABELS: Record<string, string> = {
  name: 'Firmenname',
  legalForm: 'Rechtsform',
  contactPerson: 'Ansprechpartner',
  email: 'E-Mail',
  phone: 'Telefon',
  website: 'Website',
  addressLine1: 'Adresse Zeile 1',
  addressLine2: 'Adresse Zeile 2',
  postalCode: 'PLZ',
  city: 'Ort',
  country: 'Land',
  vatId: 'USt-IdNr.',
  taxNumber: 'Steuernummer',
  iban: 'IBAN',
  bic: 'BIC',
  paymentTerms: 'Zahlungsziel',
  defaultExpenseAccount: 'Standard-Aufwandskonto',
  status: 'Status',
  notes: 'Notizen',
};

/**
 * German labels for supplier status
 */
export const SUPPLIER_STATUS_LABELS: Record<SupplierStatus, string> = {
  active: 'Aktiv',
  inactive: 'Inaktiv',
  archived: 'Archiviert',
};

/**
 * Status badge colors for UI
 */
export const SUPPLIER_STATUS_COLORS: Record<SupplierStatus, { bg: string; text: string; border: string }> = {
  active: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
  inactive: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' },
  archived: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' },
};

