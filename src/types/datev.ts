/**
 * DATEV Export Types for TradeTrackr
 * 
 * These types define the configuration and export structures for
 * DATEV-compatible CSV exports (Buchungsstapel + Debitoren).
 * 
 * Note: This is NOT a full accounting system. We export buchungsfähige
 * Daten from Invoices + Payments without ledger/SKR automation.
 */

/**
 * Debitor numbering mode
 */
export type DebitorMode = 'collective' | 'perCustomer';

/**
 * VAT determination mode
 */
export type VatMode = 'deriveFromInvoice' | 'force19';

/**
 * DATEV settings document stored per concern
 * Collection: datevSettings/{concernID}
 */
export interface DatevSettings {
  concernID: string;
  
  // Company info
  companyName: string;
  consultantNumber?: string;  // Beraternummer
  clientNumber?: string;      // Mandantennummer
  fiscalYear: number;         // e.g. 2025
  currency: 'EUR';
  
  // Revenue accounts (Erlöskonten)
  revenueAccount19: string;   // e.g. "8400" for 19% VAT
  revenueAccount7?: string;   // e.g. "8300" for 7% VAT
  revenueAccount0?: string;   // e.g. "8200" for 0% VAT
  
  // Receivables account (Forderungskonto)
  receivablesAccountDefault: string;  // e.g. "1400" (Debitorensammelkonto)
  
  // Bank account
  bankAccountDefault: string;  // e.g. "1200"
  
  // Debitor configuration
  debitorMode: DebitorMode;
  debitorStartNumber?: number;  // e.g. 10000
  debitorNumberField?: string;  // field name on customer doc, default: "datevDebitorNumber"
  
  // VAT logic
  vatMode: VatMode;
  
  // Metadata
  updatedAt?: string;
  updatedBy?: string;
}

/**
 * Default settings for new concerns
 */
export const DEFAULT_DATEV_SETTINGS: Partial<DatevSettings> = {
  currency: 'EUR',
  fiscalYear: new Date().getFullYear(),
  revenueAccount19: '8400',
  revenueAccount7: '8300',
  revenueAccount0: '8200',
  receivablesAccountDefault: '1400',
  bankAccountDefault: '1200',
  debitorMode: 'collective',
  debitorStartNumber: 10000,
  vatMode: 'deriveFromInvoice',
};

/**
 * DATEV export log entry
 * Collection: datevExports/{autoId}
 */
export interface DatevExportLog {
  id?: string;
  concernID: string;
  createdAt: any;  // serverTimestamp
  createdByUserId: string;
  createdByUserName: string;
  type: 'buchungsstapel' | 'debitoren';
  dateFrom: string;  // ISO date
  dateTo: string;    // ISO date
  invoiceCount: number;
  paymentCount: number;
  warnings: string[];  // never undefined, use empty array
}

/**
 * Export options for Buchungsstapel
 */
export interface BuchungsstapelExportOptions {
  dateFrom: string;  // ISO date
  dateTo: string;    // ISO date
  onlyFinalized: boolean;
  includePayments: boolean;
}

/**
 * Export options for Debitoren
 */
export interface DebitorenExportOptions {
  onlyWithInvoices: boolean;  // Only customers who have invoices
}

/**
 * Buchungsstapel row (single booking entry)
 */
export interface BuchungsstapelRow {
  belegdatum: string;       // Date (YYYY-MM-DD)
  buchungstext: string;     // Booking text
  betrag: number;           // Amount in EUR
  sollkonto: string;        // Debit account
  habenkonto: string;       // Credit account
  steuerschluessel: string; // Tax key (19, 7, 0, or empty)
  belegfeld1: string;       // Document reference (invoice number)
  beleglink: string;        // Document link (usually empty)
}

/**
 * Debitoren row (customer master data)
 */
export interface DebitorenRow {
  debitorennummer: string;
  name: string;
  strasse: string;
  plz: string;
  ort: string;
  land: string;
  ustIdNr: string;
  email: string;
}

/**
 * Export result with data and metadata
 */
export interface DatevExportResult {
  csv: string;
  invoiceCount: number;
  paymentCount: number;
  warnings: string[];
  missingDebitorCustomers?: string[];  // Customer names missing debitor numbers
}

/**
 * Validation result for DATEV settings
 */
export interface DatevSettingsValidation {
  valid: boolean;
  missingFields: string[];
  errors: string[];
}

/**
 * German labels for DATEV fields
 */
export const DATEV_FIELD_LABELS: Record<string, string> = {
  companyName: 'Firmenname',
  consultantNumber: 'Beraternummer',
  clientNumber: 'Mandantennummer',
  fiscalYear: 'Geschäftsjahr',
  revenueAccount19: 'Erlöskonto 19%',
  revenueAccount7: 'Erlöskonto 7%',
  revenueAccount0: 'Erlöskonto 0%',
  receivablesAccountDefault: 'Forderungskonto (Sammelkonto)',
  bankAccountDefault: 'Bankkonto',
  debitorMode: 'Debitorenmodus',
  debitorStartNumber: 'Erste Debitorennummer',
  vatMode: 'MwSt-Ermittlung',
};



