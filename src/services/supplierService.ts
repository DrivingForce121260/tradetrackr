/**
 * Supplier Service for TradeTrackr
 *
 * Workstream F: Migrated to dataClient (Phase 1)
 *
 * Handles CRUD operations for suppliers (Lieferanten).
 * All operations are scoped to the current concern (multi-tenant).
 */

import {
  queryDocs,
  getDoc,
  addDoc,
  updateDoc,
  serverTimestamp,
  QueryFilter,
} from '@/services/dataClient';
import {
  Supplier,
  SupplierCreateInput,
  SupplierUpdateInput,
  UserSnapshot,
} from '@/types/suppliers';

const COLLECTION = 'suppliers';

// ============================================
// NORMALIZATION HELPERS
// ============================================

/**
 * Normalize VAT ID for comparison and storage.
 * - Trim whitespace
 * - Convert to uppercase
 * - Remove spaces and common separators (dashes, dots)
 *
 * @param vatId - Raw VAT ID string
 * @returns Normalized VAT ID (e.g., "DE123456789")
 */
export function normalizeVatId(vatId: string | undefined | null): string {
  if (!vatId) return '';
  return vatId
    .trim()
    .toUpperCase()
    .replace(/[\s\-\.]/g, '');
}

/**
 * Normalize IBAN for comparison and storage.
 * - Trim whitespace
 * - Convert to uppercase
 * - Remove all spaces
 *
 * @param iban - Raw IBAN string
 * @returns Normalized IBAN (e.g., "DE89370400440532013000")
 */
export function normalizeIban(iban: string | undefined | null): string {
  if (!iban) return '';
  return iban
    .trim()
    .toUpperCase()
    .replace(/\s/g, '');
}

/**
 * Normalize name for fuzzy matching.
 * - Trim whitespace
 * - Convert to lowercase
 * - Collapse multiple spaces
 *
 * @param name - Raw name string
 * @returns Normalized name for comparison
 */
export function normalizeName(name: string | undefined | null): string {
  if (!name) return '';
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

// ============================================
// SANITIZATION HELPERS
// ============================================

/**
 * Deep check for undefined values in an object.
 * Used as a safety check before writes.
 *
 * @param obj - Object to check
 * @param path - Current path (for error messages)
 * @returns Array of paths containing undefined values
 */
function findUndefinedPaths(obj: Record<string, unknown>, path = ''): string[] {
  const undefinedPaths: string[] = [];

  for (const key of Object.keys(obj)) {
    const currentPath = path ? `${path}.${key}` : key;
    const value = obj[key];

    if (value === undefined) {
      undefinedPaths.push(currentPath);
    } else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      // Recursively check nested objects (but not arrays or null)
      // Skip special marker objects (serverTimestamp, etc.)
      const v = value as Record<string, unknown>;
      if (!('__fieldValue' in v)) {
        undefinedPaths.push(...findUndefinedPaths(v, currentPath));
      }
    }
  }

  return undefinedPaths;
}

/**
 * Remove undefined values from an object to prevent API errors.
 * Also performs deep sanitization of nested objects.
 */
function sanitizeForWrite<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const result: Partial<T> = {};

  for (const key of Object.keys(obj)) {
    const value = obj[key];

    if (value === undefined) {
      // Skip undefined values
      continue;
    }

    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      const v = value as Record<string, unknown>;
      // Check if it's a special marker object
      if ('__fieldValue' in v) {
        result[key as keyof T] = value as T[keyof T];
      } else {
        // Recursively sanitize nested objects
        const sanitized = sanitizeForWrite(v);
        if (Object.keys(sanitized).length > 0) {
          result[key as keyof T] = sanitized as T[keyof T];
        }
      }
    } else {
      result[key as keyof T] = value as T[keyof T];
    }
  }

  return result;
}

/**
 * Validate and sanitize data before write.
 * Throws descriptive error if any undefined values remain.
 *
 * @param data - Data to validate
 * @param operation - Operation name for error message
 * @returns Sanitized data safe for API
 */
function validateAndSanitize<T extends Record<string, unknown>>(
  data: T,
  operation: string
): Partial<T> {
  const sanitized = sanitizeForWrite(data);

  // Double-check for any remaining undefined values
  const undefinedPaths = findUndefinedPaths(sanitized as Record<string, unknown>);
  if (undefinedPaths.length > 0) {
    const errorMessage = `Schreibfehler (${operation}): Undefined-Werte gefunden in: ${undefinedPaths.join(', ')}`;
    console.error(errorMessage, { data, sanitized });
    throw new Error(errorMessage);
  }

  return sanitized;
}

// ============================================
// SUPPLIER SERVICE CLASS
// ============================================

/**
 * SupplierService - All supplier operations scoped to a concern
 */
export class SupplierService {
  private concernID: string;

  constructor(concernID: string) {
    if (!concernID) {
      throw new Error('SupplierService requires concernID');
    }
    this.concernID = concernID;
  }

  /**
   * Get all suppliers for the current concern
   */
  async getAllSuppliers(): Promise<Supplier[]> {
    const filters: QueryFilter[] = [
      { field: 'concernID', op: '==', value: this.concernID },
    ];

    const result = await queryDocs<Supplier>(COLLECTION, filters, {
      orderBy: { field: 'name', dir: 'asc' },
    });

    return result.items.map((doc) => ({
      id: doc.doc_id,
      ...doc.data,
    }));
  }

  /**
   * Get active suppliers only (for selection dropdowns)
   */
  async getActiveSuppliers(): Promise<Supplier[]> {
    const filters: QueryFilter[] = [
      { field: 'concernID', op: '==', value: this.concernID },
      { field: 'status', op: '==', value: 'active' },
    ];

    const result = await queryDocs<Supplier>(COLLECTION, filters, {
      orderBy: { field: 'name', dir: 'asc' },
    });

    return result.items.map((doc) => ({
      id: doc.doc_id,
      ...doc.data,
    }));
  }

  /**
   * Get a supplier by ID
   */
  async getSupplierById(id: string): Promise<Supplier | null> {
    const doc = await getDoc<Supplier>(COLLECTION, id);

    if (!doc) {
      return null;
    }

    // Verify concernID matches (security check)
    if (doc.data.concernID !== this.concernID) {
      console.warn(`Supplier ${id} belongs to different concern`);
      return null;
    }

    return {
      id: doc.doc_id,
      ...doc.data,
    };
  }

  /**
   * Check for potential duplicate before creating
   * Uses VAT ID, IBAN, and name matching
   *
   * @returns Matching supplier if found, null otherwise
   */
  async checkForDuplicate(input: SupplierCreateInput): Promise<Supplier | null> {
    return this.autoMatchSupplier({
      vatId: input.vatId,
      iban: input.iban,
      name: input.name,
    });
  }

  /**
   * Create a new supplier
   * Uses serverTimestamp() for consistent timestamps
   */
  async createSupplier(
    input: SupplierCreateInput,
    userSnapshot: UserSnapshot
  ): Promise<string> {
    if (!input.name || input.name.trim().length === 0) {
      throw new Error('SUPPLIER_NAME_REQUIRED');
    }

    // Build data with serverTimestamp for consistency
    const rawData = {
      name: input.name.trim(),
      legalForm: input.legalForm?.trim() || null,
      contactPerson: input.contactPerson?.trim() || null,
      email: input.email?.trim() || null,
      phone: input.phone?.trim() || null,
      website: input.website?.trim() || null,
      addressLine1: input.addressLine1?.trim() || null,
      addressLine2: input.addressLine2?.trim() || null,
      postalCode: input.postalCode?.trim() || null,
      city: input.city?.trim() || null,
      country: input.country?.trim() || 'Deutschland',
      vatId: input.vatId?.trim() || null,
      taxNumber: input.taxNumber?.trim() || null,
      iban: input.iban?.trim() || null,
      bic: input.bic?.trim() || null,
      paymentTerms: input.paymentTerms?.trim() || null,
      defaultExpenseAccount: input.defaultExpenseAccount?.trim() || null,
      status: input.status || 'active',
      notes: input.notes?.trim() || null,
      concernID: this.concernID,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: userSnapshot,
      updatedBy: userSnapshot,
    };

    // Validate and sanitize
    const supplierData = validateAndSanitize(rawData as Record<string, unknown>, 'createSupplier');

    const doc = await addDoc(COLLECTION, supplierData);
    return doc.doc_id;
  }

  /**
   * Update an existing supplier
   * Uses serverTimestamp() for consistent timestamps
   */
  async updateSupplier(
    id: string,
    input: SupplierUpdateInput,
    userSnapshot: UserSnapshot
  ): Promise<void> {
    // First verify the supplier exists and belongs to this concern
    const existing = await this.getSupplierById(id);
    if (!existing) {
      throw new Error('SUPPLIER_NOT_FOUND');
    }

    // Block updates to archived suppliers (except status changes to unarchive)
    if (existing.status === 'archived') {
      if (input.status !== 'active' && input.status !== 'inactive') {
        throw new Error('SUPPLIER_ARCHIVED');
      }
    }

    if (input.name !== undefined && input.name.trim().length === 0) {
      throw new Error('SUPPLIER_NAME_REQUIRED');
    }

    // Build update data - only include fields that are explicitly set
    const rawData: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
      updatedBy: userSnapshot,
    };

    // Only include fields that are explicitly provided (not undefined)
    if (input.name !== undefined) rawData.name = input.name.trim();
    if (input.legalForm !== undefined) rawData.legalForm = input.legalForm?.trim() || null;
    if (input.contactPerson !== undefined) rawData.contactPerson = input.contactPerson?.trim() || null;
    if (input.email !== undefined) rawData.email = input.email?.trim() || null;
    if (input.phone !== undefined) rawData.phone = input.phone?.trim() || null;
    if (input.website !== undefined) rawData.website = input.website?.trim() || null;
    if (input.addressLine1 !== undefined) rawData.addressLine1 = input.addressLine1?.trim() || null;
    if (input.addressLine2 !== undefined) rawData.addressLine2 = input.addressLine2?.trim() || null;
    if (input.postalCode !== undefined) rawData.postalCode = input.postalCode?.trim() || null;
    if (input.city !== undefined) rawData.city = input.city?.trim() || null;
    if (input.country !== undefined) rawData.country = input.country?.trim() || 'Deutschland';
    if (input.vatId !== undefined) rawData.vatId = input.vatId?.trim() || null;
    if (input.taxNumber !== undefined) rawData.taxNumber = input.taxNumber?.trim() || null;
    if (input.iban !== undefined) rawData.iban = input.iban?.trim() || null;
    if (input.bic !== undefined) rawData.bic = input.bic?.trim() || null;
    if (input.paymentTerms !== undefined) rawData.paymentTerms = input.paymentTerms?.trim() || null;
    if (input.defaultExpenseAccount !== undefined) rawData.defaultExpenseAccount = input.defaultExpenseAccount?.trim() || null;
    if (input.status !== undefined) rawData.status = input.status;
    if (input.notes !== undefined) rawData.notes = input.notes?.trim() || null;

    // Validate and sanitize
    const updateData = validateAndSanitize(rawData, 'updateSupplier');

    await updateDoc(COLLECTION, id, updateData);
  }

  /**
   * Search suppliers by name, VAT ID, or IBAN
   * Uses client-side filtering to avoid complex composite indexes
   *
   * Note: This is fine for < 1000 suppliers per concern.
   * For larger datasets, consider Algolia/ElasticSearch.
   */
  async searchSuppliers(searchQuery: string): Promise<Supplier[]> {
    const all = await this.getAllSuppliers();

    const normalizedQuery = normalizeName(searchQuery);
    if (!normalizedQuery) {
      return all;
    }

    // Also normalize for VAT/IBAN matching
    const vatIbanQuery = normalizeVatId(searchQuery);

    return all.filter((s) => {
      const name = normalizeName(s.name);
      const vatId = normalizeVatId(s.vatId);
      const iban = normalizeIban(s.iban);

      return (
        name.includes(normalizedQuery) ||
        vatId.includes(vatIbanQuery) ||
        iban.includes(vatIbanQuery)
      );
    });
  }

  /**
   * Find a supplier by exact VAT ID match
   * Uses normalized comparison
   */
  async findByVatId(vatId: string): Promise<Supplier | null> {
    const normalized = normalizeVatId(vatId);
    if (!normalized) return null;

    const all = await this.getAllSuppliers();

    return all.find((s) => normalizeVatId(s.vatId) === normalized) || null;
  }

  /**
   * Find a supplier by exact IBAN match
   * Uses normalized comparison
   */
  async findByIban(iban: string): Promise<Supplier | null> {
    const normalized = normalizeIban(iban);
    if (!normalized) return null;

    const all = await this.getAllSuppliers();

    return all.find((s) => normalizeIban(s.iban) === normalized) || null;
  }

  /**
   * Auto-match a supplier based on extracted document data
   * Priority: VAT ID (exact) > IBAN (exact) > Name (contains, single match only)
   */
  async autoMatchSupplier(data: {
    vatId?: string;
    iban?: string;
    name?: string;
  }): Promise<Supplier | null> {
    // 1. Try VAT ID exact match (highest priority)
    if (data.vatId) {
      const byVat = await this.findByVatId(data.vatId);
      if (byVat) return byVat;
    }

    // 2. Try IBAN exact match
    if (data.iban) {
      const byIban = await this.findByIban(data.iban);
      if (byIban) return byIban;
    }

    // 3. Try name contains match (only if exactly one match)
    if (data.name) {
      const normalizedInputName = normalizeName(data.name);
      if (normalizedInputName.length >= 3) {
        // Minimum 3 chars for name matching
        const all = await this.getAllSuppliers();
        const matches = all.filter((s) => {
          const supplierName = normalizeName(s.name);
          return (
            supplierName.includes(normalizedInputName) ||
            normalizedInputName.includes(supplierName)
          );
        });

        if (matches.length === 1) {
          return matches[0];
        }
      }
    }

    return null;
  }

  /**
   * Get supplier snapshot for embedding in other documents
   */
  async getSupplierSnapshot(
    id: string
  ): Promise<{ id: string; name: string; vatId?: string; iban?: string } | null> {
    const supplier = await this.getSupplierById(id);
    if (!supplier) return null;

    return {
      id: supplier.id,
      name: supplier.name,
      vatId: supplier.vatId || undefined,
      iban: supplier.iban || undefined,
    };
  }
}

/**
 * Create a SupplierService instance
 * Convenience function for components
 */
export function createSupplierService(concernID: string): SupplierService {
  return new SupplierService(concernID);
}
