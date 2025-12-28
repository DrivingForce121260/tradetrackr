/**
 * DATEV Export Service for TradeTrackr
 * 
 * Handles DATEV settings management and CSV export generation
 * for Buchungsstapel (postings) and Debitoren (customer master data).
 * 
 * Note: This is NOT a full accounting system. We export buchungsfähige
 * Daten from Invoices + Payments without ledger/SKR automation.
 * 
 * German Excel CSV Format:
 * - Delimiter: ';' (semicolon)
 * - Decimal: ',' (comma)
 * - Line ending: CRLF
 * - Encoding: UTF-8 with BOM
 */

import {
  collection,
  collectionGroup,
  doc,
  getDoc,
  setDoc,
  getDocs,
  query,
  where,
  orderBy,
  addDoc,
  serverTimestamp,
  limit,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import {
  DatevSettings,
  DatevExportLog,
  BuchungsstapelExportOptions,
  DebitorenExportOptions,
  DatevExportResult,
  DatevSettingsValidation,
  BuchungsstapelRow,
  DebitorenRow,
  DEFAULT_DATEV_SETTINGS,
  DATEV_FIELD_LABELS,
} from '@/types/datev';
import { Invoice, InvoicePayment } from '@/types/invoicing';
import { buildGermanCsv, downloadCsv, buildCsv } from '@/utils/csv';
import { centsToEuros, formatEurosForGermanCsv } from '@/utils/money';

// ============================================================================
// CONFIGURATION CONSTANTS
// ============================================================================

/**
 * Maximum number of invoices allowed in a single export.
 * Prevents massive exports that would strain Firestore reads.
 */
const MAX_INVOICES_EXPORT = 2000;

/**
 * Maximum number of payments allowed in a single export.
 * This is a soft limit - we warn but allow smaller overages.
 */
const MAX_PAYMENTS_EXPORT = 5000;

/**
 * Threshold for "large export" warning (invoices).
 */
const LARGE_EXPORT_THRESHOLD = 500;

const COLLECTIONS = {
  datevSettings: 'datevSettings',
  datevExports: 'datevExports',
  invoices: 'invoices',
  customers: 'customers',
} as const;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Remove undefined values from an object (Firestore requirement).
 * Recursively cleans nested objects.
 */
function stripUndefined<T extends Record<string, any>>(obj: T): T {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;
    if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date) && !(value instanceof Timestamp)) {
      result[key] = stripUndefined(value);
    } else {
      result[key] = value;
    }
  }
  return result as T;
}

/**
 * Convert various date formats to ISO date string (YYYY-MM-DD).
 */
function toIsoDate(date: any): string | null {
  if (!date) return null;
  
  try {
    if (date.toDate && typeof date.toDate === 'function') {
      // Firestore Timestamp
      return date.toDate().toISOString().split('T')[0];
    }
    if (date instanceof Date) {
      return date.toISOString().split('T')[0];
    }
    if (typeof date === 'string') {
      // Already ISO string or similar
      return date.split('T')[0];
    }
    if (typeof date === 'number') {
      // Unix timestamp
      return new Date(date).toISOString().split('T')[0];
    }
  } catch {
    return null;
  }
  
  return null;
}

/**
 * Convert ISO date string to Firestore Timestamp for queries.
 */
function isoToTimestamp(isoDate: string): Timestamp {
  const date = new Date(isoDate + 'T00:00:00.000Z');
  return Timestamp.fromDate(date);
}

/**
 * Create end-of-day timestamp for range queries.
 */
function isoToEndOfDayTimestamp(isoDate: string): Timestamp {
  const date = new Date(isoDate + 'T23:59:59.999Z');
  return Timestamp.fromDate(date);
}

// ============================================================================
// SETTINGS MANAGEMENT
// ============================================================================

/**
 * Load DATEV settings for a concern.
 */
export async function loadDatevSettings(concernID: string): Promise<DatevSettings | null> {
  const docRef = doc(db, COLLECTIONS.datevSettings, concernID);
  const snap = await getDoc(docRef);
  
  if (!snap.exists()) {
    return null;
  }
  
  return { ...snap.data(), concernID } as DatevSettings;
}

/**
 * Save DATEV settings for a concern.
 */
export async function saveDatevSettings(
  concernID: string,
  settings: Partial<DatevSettings>,
  userId: string
): Promise<void> {
  const docRef = doc(db, COLLECTIONS.datevSettings, concernID);
  
  const data: DatevSettings = {
    ...DEFAULT_DATEV_SETTINGS,
    ...settings,
    concernID,
    updatedAt: new Date().toISOString(),
    updatedBy: userId,
  } as DatevSettings;
  
  await setDoc(docRef, stripUndefined(data), { merge: true });
}

/**
 * Validate DATEV settings for export readiness.
 */
export function validateDatevSettings(settings: DatevSettings | null): DatevSettingsValidation {
  const missingFields: string[] = [];
  const errors: string[] = [];
  
  if (!settings) {
    return {
      valid: false,
      missingFields: ['Alle Einstellungen'],
      errors: ['DATEV-Einstellungen wurden noch nicht konfiguriert.'],
    };
  }
  
  // Required fields for Buchungsstapel export
  const required: (keyof DatevSettings)[] = [
    'companyName',
    'fiscalYear',
    'revenueAccount19',
    'receivablesAccountDefault',
    'bankAccountDefault',
  ];
  
  for (const field of required) {
    if (!settings[field]) {
      missingFields.push(DATEV_FIELD_LABELS[field] || field);
    }
  }
  
  // Validate account numbers are numeric
  const accountFields: (keyof DatevSettings)[] = [
    'revenueAccount19',
    'revenueAccount7',
    'revenueAccount0',
    'receivablesAccountDefault',
    'bankAccountDefault',
  ];
  
  for (const field of accountFields) {
    const value = settings[field];
    if (value && !/^\d+$/.test(String(value))) {
      errors.push(`${DATEV_FIELD_LABELS[field] || field} muss eine Zahl sein.`);
    }
  }
  
  return {
    valid: missingFields.length === 0 && errors.length === 0,
    missingFields,
    errors,
  };
}

// ============================================================================
// DATA LOADING
// ============================================================================

/**
 * Determine tax rate from invoice data.
 */
function getTaxRateFromInvoice(invoice: Invoice, settings: DatevSettings): number {
  if (settings.vatMode === 'force19') {
    return 19;
  }
  
  // Try to derive from invoice totals
  if (invoice.totals?.vatByKey) {
    const keys = Object.keys(invoice.totals.vatByKey);
    if (keys.length > 0) {
      // Parse tax rate from key (e.g., "19%" -> 19, "DE19" -> 19)
      const match = keys[0].match(/(\d+)/);
      if (match) {
        return parseInt(match[1], 10);
      }
    }
  }
  
  // Check taxKeys array
  if (invoice.taxKeys && invoice.taxKeys.length > 0) {
    const firstKey = invoice.taxKeys[0];
    if (firstKey.ratePct != null) {
      return firstKey.ratePct;
    }
  }
  
  // Default to 19%
  return 19;
}

/**
 * Get revenue account based on tax rate.
 */
function getRevenueAccount(taxRate: number, settings: DatevSettings): string {
  if (taxRate === 7 && settings.revenueAccount7) {
    return settings.revenueAccount7;
  }
  if (taxRate === 0 && settings.revenueAccount0) {
    return settings.revenueAccount0;
  }
  return settings.revenueAccount19;
}

/**
 * Load customers for a concern.
 */
async function loadCustomers(concernID: string): Promise<Map<string, any>> {
  const q = query(
    collection(db, COLLECTIONS.customers),
    where('concernID', '==', concernID)
  );
  const snap = await getDocs(q);
  
  const customers = new Map<string, any>();
  snap.forEach(d => {
    customers.set(d.id, { id: d.id, ...d.data() });
  });
  
  return customers;
}

/**
 * Load invoices for export within date range.
 */
async function loadInvoicesForExport(
  concernID: string,
  dateFrom: string,
  dateTo: string,
  onlyFinalized: boolean
): Promise<Invoice[]> {
  const q = query(
    collection(db, COLLECTIONS.invoices),
    where('concernID', '==', concernID)
  );
  const snap = await getDocs(q);
  
  const invoices: Invoice[] = [];
  snap.forEach(d => {
    const inv = { id: d.id, ...d.data() } as Invoice;
    
    // Date filter (client-side since issueDate is stored as string)
    if (inv.issueDate) {
      if (inv.issueDate < dateFrom || inv.issueDate > dateTo) {
        return;
      }
    }
    
    // State filter
    if (onlyFinalized && inv.state === 'draft') {
      return;
    }
    
    invoices.push(inv);
  });
  
  return invoices;
}

// ============================================================================
// PAYMENTS LOADING (SCALABLE)
// ============================================================================

/**
 * Payment loading strategy result.
 */
export interface PaymentLoadResult {
  payments: InvoicePayment[];
  strategy: 'collectionGroup' | 'perInvoice' | 'none';
  warning?: string;
}

/**
 * Load payments using collection group query (scalable).
 * 
 * This requires:
 * - Payment documents to have `concernID` and `paidAt` fields
 * - A Firestore composite index on: collectionGroup('payments') 
 *   with fields: concernID (ASC), paidAt (ASC)
 * 
 * Index creation command:
 * firebase firestore:indexes:create --collection-group payments \
 *   --field concernID,paidAt
 * 
 * Or via Firebase Console:
 * Collection group: payments
 * Fields: concernID Ascending, paidAt Ascending
 */
async function loadPaymentsViaCollectionGroup(
  concernID: string,
  dateFrom: string,
  dateTo: string
): Promise<InvoicePayment[]> {
  const fromTs = isoToTimestamp(dateFrom);
  const toTs = isoToEndOfDayTimestamp(dateTo);
  
  // Collection group query across all payments subcollections
  // Requires composite index: concernID, paidAt
  const q = query(
    collectionGroup(db, 'payments'),
    where('concernID', '==', concernID),
    where('paidAt', '>=', fromTs),
    where('paidAt', '<=', toTs),
    orderBy('paidAt', 'desc'),
    limit(MAX_PAYMENTS_EXPORT)
  );
  
  const snap = await getDocs(q);
  
  return snap.docs.map(d => ({
    id: d.id,
    ...(d.data() as Omit<InvoicePayment, 'id'>),
  }));
}

/**
 * Load payments per invoice (N+1 fallback).
 * Used when collectionGroup is unavailable.
 */
async function loadPaymentsPerInvoice(
  invoices: Invoice[],
  dateFrom: string,
  dateTo: string
): Promise<InvoicePayment[]> {
  const allPayments: InvoicePayment[] = [];
  
  // Process invoices in batches to limit concurrent reads
  const BATCH_SIZE = 10;
  for (let i = 0; i < invoices.length; i += BATCH_SIZE) {
    const batch = invoices.slice(i, i + BATCH_SIZE);
    
    const batchPromises = batch.map(async (inv) => {
      const paymentsCol = collection(db, COLLECTIONS.invoices, inv.id, 'payments');
      const snap = await getDocs(query(paymentsCol, orderBy('paidAt', 'desc')));
      
      const payments: InvoicePayment[] = [];
      snap.docs.forEach(d => {
        const payment = { id: d.id, ...(d.data() as Omit<InvoicePayment, 'id'>) };
        
        // Filter by date range
        const paymentDate = toIsoDate(payment.paidAt);
        if (paymentDate && paymentDate >= dateFrom && paymentDate <= dateTo) {
          payments.push(payment);
        }
      });
      
      return payments;
    });
    
    const batchResults = await Promise.all(batchPromises);
    batchResults.forEach(payments => allPayments.push(...payments));
    
    // Check limit
    if (allPayments.length >= MAX_PAYMENTS_EXPORT) {
      break;
    }
  }
  
  return allPayments.slice(0, MAX_PAYMENTS_EXPORT);
}

/**
 * Load payments for export using the best available strategy.
 * 
 * Strategy selection:
 * 1. Try collectionGroup query first (fastest, scalable)
 * 2. Fall back to per-invoice loading if collectionGroup fails
 *    (e.g., missing index or payments don't have concernID)
 */
export async function loadPaymentsForExport(
  concernID: string,
  dateFrom: string,
  dateTo: string,
  invoices: Invoice[]
): Promise<PaymentLoadResult> {
  // Try collectionGroup approach first
  try {
    const payments = await loadPaymentsViaCollectionGroup(concernID, dateFrom, dateTo);
    
    if (payments.length >= MAX_PAYMENTS_EXPORT) {
      return {
        payments,
        strategy: 'collectionGroup',
        warning: `Maximale Anzahl Zahlungen erreicht (${MAX_PAYMENTS_EXPORT}). Bitte Zeitraum einschränken.`,
      };
    }
    
    return {
      payments,
      strategy: 'collectionGroup',
    };
  } catch (error: any) {
    // Check if it's an index-related error
    const errorMessage = error?.message || '';
    const isIndexError = errorMessage.includes('index') || 
                         errorMessage.includes('The query requires an index') ||
                         errorMessage.includes('requires a composite index');
    
    // Log for debugging
    console.warn(
      'DATEV Export: collectionGroup query failed, falling back to per-invoice loading.',
      isIndexError ? '(Missing Firestore index)' : '',
      error
    );
    
    // Fall back to per-invoice loading
    const payments = await loadPaymentsPerInvoice(invoices, dateFrom, dateTo);
    
    let warning = 'Zahlungen werden im Kompatibilitätsmodus geladen (langsamer). ';
    if (isIndexError) {
      warning += 'Für bessere Performance: Firestore-Index für payments (concernID + paidAt) erstellen.';
    } else {
      warning += 'Für bessere Performance: Payments sollten concernID + paidAt enthalten.';
    }
    
    if (payments.length >= MAX_PAYMENTS_EXPORT) {
      warning = `Maximale Anzahl Zahlungen erreicht (${MAX_PAYMENTS_EXPORT}). ${warning}`;
    }
    
    return {
      payments,
      strategy: 'perInvoice',
      warning,
    };
  }
}

// ============================================================================
// BUCHUNGSSTAPEL EXPORT
// ============================================================================

/**
 * Export Buchungsstapel CSV with German Excel formatting.
 */
export async function exportBuchungsstapelCSV(
  concernID: string,
  settings: DatevSettings,
  options: BuchungsstapelExportOptions,
  customers: Map<string, any>
): Promise<DatevExportResult> {
  const warnings: string[] = [];
  const missingDebitorCustomers: string[] = [];
  const rows: BuchungsstapelRow[] = [];
  
  // Load invoices
  const invoices = await loadInvoicesForExport(
    concernID,
    options.dateFrom,
    options.dateTo,
    options.onlyFinalized
  );
  
  // Check invoice count limits
  if (invoices.length > MAX_INVOICES_EXPORT) {
    return {
      csv: '',
      invoiceCount: invoices.length,
      paymentCount: 0,
      warnings: [`Zu viele Datensätze (${invoices.length} Rechnungen). Bitte Zeitraum einschränken. Maximum: ${MAX_INVOICES_EXPORT}.`],
      blocked: true,
    } as DatevExportResult & { blocked: boolean };
  }
  
  if (invoices.length > LARGE_EXPORT_THRESHOLD) {
    warnings.push(`Große Datenmenge: ${invoices.length} Rechnungen. Export kann langsam sein.`);
  }
  
  let paymentCount = 0;
  let paymentLoadWarning: string | undefined;
  let payments: InvoicePayment[] = [];
  
  // Load payments if requested
  if (options.includePayments) {
    const paymentResult = await loadPaymentsForExport(
      concernID,
      options.dateFrom,
      options.dateTo,
      invoices
    );
    payments = paymentResult.payments;
    paymentLoadWarning = paymentResult.warning;
    
    if (paymentLoadWarning) {
      warnings.push(paymentLoadWarning);
    }
  }
  
  // Create a map of payments by invoice ID for quick lookup
  const paymentsByInvoice = new Map<string, InvoicePayment[]>();
  for (const payment of payments) {
    const invId = payment.invoiceId;
    if (!paymentsByInvoice.has(invId)) {
      paymentsByInvoice.set(invId, []);
    }
    paymentsByInvoice.get(invId)!.push(payment);
  }
  
  // Process invoices
  for (const inv of invoices) {
    const taxRate = getTaxRateFromInvoice(inv, settings);
    const revenueAccount = getRevenueAccount(taxRate, settings);
    
    // Determine debitor account
    let sollKonto = settings.receivablesAccountDefault;
    if (settings.debitorMode === 'perCustomer' && inv.clientId) {
      const customer = customers.get(inv.clientId);
      const debitorField = settings.debitorNumberField || 'datevDebitorNumber';
      if (customer && customer[debitorField]) {
        sollKonto = String(customer[debitorField]);
      } else {
        const customerName = inv.clientSnapshot?.name || inv.clientId;
        if (!missingDebitorCustomers.includes(customerName)) {
          missingDebitorCustomers.push(customerName);
        }
      }
    }
    
    // Customer name for booking text
    const customerName = inv.clientSnapshot?.name || 'Kunde';
    
    // Invoice number - use doc ID if missing and warn
    let invoiceNumber = inv.number;
    if (!invoiceNumber) {
      invoiceNumber = inv.id;
      if (!warnings.includes('Einige Rechnungen haben keine Rechnungsnummer.')) {
        warnings.push('Einige Rechnungen haben keine Rechnungsnummer. Dokument-ID wird verwendet.');
      }
    }
    
    // Invoice posting (revenue recognition)
    const invoiceAmount = inv.totals?.grandTotalGross || 0;
    rows.push({
      belegdatum: inv.issueDate || '',
      buchungstext: `Rechnung ${invoiceNumber} ${customerName}`,
      betrag: invoiceAmount,
      sollkonto: sollKonto,
      habenkonto: revenueAccount,
      steuerschluessel: String(taxRate),
      belegfeld1: invoiceNumber,
      beleglink: '',
    });
    
    // Add payment postings for this invoice
    if (options.includePayments) {
      const invoicePayments = paymentsByInvoice.get(inv.id) || [];
      
      for (const payment of invoicePayments) {
        const paymentDate = toIsoDate(payment.paidAt);
        if (!paymentDate) continue;
        
        // Determine habenkonto for payment
        let habenKonto = settings.receivablesAccountDefault;
        if (settings.debitorMode === 'perCustomer' && inv.clientId) {
          const customer = customers.get(inv.clientId);
          const debitorField = settings.debitorNumberField || 'datevDebitorNumber';
          if (customer && customer[debitorField]) {
            habenKonto = String(customer[debitorField]);
          }
        }
        
        // Payment amount in EUR
        const paymentAmount = centsToEuros(payment.amountCents || 0);
        
        rows.push({
          belegdatum: paymentDate,
          buchungstext: `Zahlung ${invoiceNumber} ${payment.method || ''}`.trim(),
          betrag: paymentAmount,
          sollkonto: settings.bankAccountDefault,
          habenkonto: habenKonto,
          steuerschluessel: '', // No tax on payment posting
          belegfeld1: invoiceNumber,
          beleglink: '',
        });
        
        paymentCount++;
      }
    }
  }
  
  // Check for missing debitor numbers
  if (settings.debitorMode === 'perCustomer' && missingDebitorCustomers.length > 0) {
    warnings.push(`Fehlende Debitorennummern für: ${missingDebitorCustomers.join(', ')}`);
  }
  
  // Build CSV with German formatting (semicolon delimiter, decimal comma)
  const headers: Array<{ 
    key: keyof BuchungsstapelRow; 
    label: string; 
    isNumber?: boolean;
    decimals?: number;
  }> = [
    { key: 'belegdatum', label: 'Belegdatum' },
    { key: 'buchungstext', label: 'Buchungstext' },
    { key: 'betrag', label: 'Betrag', isNumber: true, decimals: 2 },
    { key: 'sollkonto', label: 'Sollkonto' },
    { key: 'habenkonto', label: 'Habenkonto' },
    { key: 'steuerschluessel', label: 'Steuerschlüssel' },
    { key: 'belegfeld1', label: 'Belegfeld1' },
    { key: 'beleglink', label: 'Beleglink' },
  ];
  
  const csv = buildGermanCsv(rows, headers, {
    delimiter: ';',
    bom: true,
    decimalComma: true,
    lineEnding: '\r\n',
  });
  
  return {
    csv,
    invoiceCount: invoices.length,
    paymentCount,
    warnings,
    missingDebitorCustomers: missingDebitorCustomers.length > 0 ? missingDebitorCustomers : undefined,
  };
}

// ============================================================================
// DEBITOREN EXPORT
// ============================================================================

/**
 * Export Debitoren CSV with German Excel formatting.
 */
export async function exportDebitorenCSV(
  concernID: string,
  settings: DatevSettings,
  _options: DebitorenExportOptions,
  customers: Map<string, any>
): Promise<DatevExportResult> {
  const warnings: string[] = [];
  const rows: DebitorenRow[] = [];
  
  const debitorField = settings.debitorNumberField || 'datevDebitorNumber';
  
  customers.forEach((customer) => {
    const debitorNr = settings.debitorMode === 'perCustomer' && customer[debitorField]
      ? String(customer[debitorField])
      : '';
    
    const address = customer.billingAddress || customer.address || {};
    
    // Ensure no undefined fields - use empty string as default
    rows.push({
      debitorennummer: debitorNr || '',
      name: customer.name || customer.cusName || customer.company || '',
      strasse: address.street || customer.address || '',
      plz: address.postalCode || customer.postalCode || '',
      ort: address.city || customer.city || '',
      land: address.country || 'Deutschland',
      ustIdNr: customer.vatId || '',
      email: address.email || customer.email || customer.cusEmail || '',
    });
  });
  
  if (settings.debitorMode === 'collective') {
    warnings.push('Debitorenmodus ist "Sammelkonto". Debitorennummern sind leer.');
  }
  
  const missingNumbers = rows.filter(r => !r.debitorennummer).length;
  if (settings.debitorMode === 'perCustomer' && missingNumbers > 0) {
    warnings.push(`${missingNumbers} Kunden ohne Debitorennummer.`);
  }
  
  // Build CSV with German formatting
  const headers: Array<{ key: keyof DebitorenRow; label: string }> = [
    { key: 'debitorennummer', label: 'Debitorennummer' },
    { key: 'name', label: 'Name' },
    { key: 'strasse', label: 'Straße' },
    { key: 'plz', label: 'PLZ' },
    { key: 'ort', label: 'Ort' },
    { key: 'land', label: 'Land' },
    { key: 'ustIdNr', label: 'USt-IdNr' },
    { key: 'email', label: 'E-Mail' },
  ];
  
  const csv = buildCsv(rows, headers, {
    delimiter: ';',
    bom: true,
    lineEnding: '\r\n',
  });
  
  return {
    csv,
    invoiceCount: 0,
    paymentCount: 0,
    warnings,
  };
}

// ============================================================================
// EXPORT LOGGING
// ============================================================================

/**
 * Record a DATEV export in the audit log.
 */
export async function recordDatevExportLog(
  concernID: string,
  userId: string,
  userName: string,
  type: 'buchungsstapel' | 'debitoren',
  dateFrom: string,
  dateTo: string,
  invoiceCount: number,
  paymentCount: number,
  warnings: string[]
): Promise<string> {
  const log: Omit<DatevExportLog, 'id'> = {
    concernID,
    createdAt: serverTimestamp(),
    createdByUserId: userId,
    createdByUserName: userName,
    type,
    dateFrom,
    dateTo,
    invoiceCount,
    paymentCount,
    warnings: warnings || [], // Ensure never undefined
  };
  
  const docRef = await addDoc(collection(db, COLLECTIONS.datevExports), stripUndefined(log));
  return docRef.id;
}

// ============================================================================
// MAIN EXPORT FUNCTION
// ============================================================================

/**
 * Extended export result with additional metadata.
 */
export interface DatevExportResultExtended extends DatevExportResult {
  blocked?: boolean;
  paymentStrategy?: 'collectionGroup' | 'perInvoice' | 'none';
}

/**
 * Main export function - handles full export flow including logging.
 */
export async function performDatevExport(
  concernID: string,
  userId: string,
  userName: string,
  type: 'buchungsstapel' | 'debitoren',
  settings: DatevSettings,
  options: BuchungsstapelExportOptions | DebitorenExportOptions
): Promise<DatevExportResultExtended> {
  // Load customers
  const customers = await loadCustomers(concernID);
  
  let result: DatevExportResultExtended;
  
  if (type === 'buchungsstapel') {
    const exportResult = await exportBuchungsstapelCSV(
      concernID,
      settings,
      options as BuchungsstapelExportOptions,
      customers
    );
    result = exportResult as DatevExportResultExtended;
    
    // Check if blocked
    if ((result as any).blocked) {
      return result;
    }
  } else {
    result = await exportDebitorenCSV(
      concernID,
      settings,
      options as DebitorenExportOptions,
      customers
    );
  }
  
  // Record audit log
  const buchOptions = type === 'buchungsstapel' ? options as BuchungsstapelExportOptions : null;
  await recordDatevExportLog(
    concernID,
    userId,
    userName,
    type,
    buchOptions?.dateFrom || new Date().toISOString().split('T')[0],
    buchOptions?.dateTo || new Date().toISOString().split('T')[0],
    result.invoiceCount,
    result.paymentCount,
    result.warnings
  );
  
  return result;
}

/**
 * Generate filename for DATEV export.
 */
export function getDatevExportFilename(
  type: 'buchungsstapel' | 'debitoren',
  dateFrom: string,
  dateTo: string
): string {
  const typeLabel = type === 'buchungsstapel' ? 'Buchungsstapel' : 'Debitoren';
  const fromFormatted = dateFrom.replace(/-/g, '');
  const toFormatted = dateTo.replace(/-/g, '');
  return `DATEV_${typeLabel}_${fromFormatted}_${toFormatted}.csv`;
}

// Re-export downloadCsv for convenience
export { downloadCsv };

// Export constants for UI usage
export { MAX_INVOICES_EXPORT, MAX_PAYMENTS_EXPORT, LARGE_EXPORT_THRESHOLD };

