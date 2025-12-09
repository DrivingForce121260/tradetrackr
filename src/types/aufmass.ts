// ============================================================================
// AUFMASS TYPES - TradeTrackr Portal
// ============================================================================

/**
 * Report record interface with minimal fields for conservative assumptions
 */
export interface ReportRecord {
  reportId: string;
  projectId: string;
  projectNumber?: string;   // human-readable number
  date: string;             // ISO YYYY-MM-DD
  items?: Array<{
    position?: string;      // e.g. LV position
    description: string;
    unit?: string;          // m, m², Stk, h
    quantity?: number;
    unitPrice?: number;     // optional
    section?: string;       // optional grouping (Raum/Gewerk)
  }>;
  hours?: Array<{
    employeeId: string;
    role?: string;
    hours: number;
    description?: string;
  }>;
  materials?: Array<{
    sku?: string;
    name: string;
    unit?: string;
    quantity: number;
    unitCost?: number;
  }>;
}

/**
 * Normalized line item from report data
 */
export interface AufmassLineItem {
  key: string;                // aggregation key
  position?: string;          // LV position if available
  description: string;
  unit: string;
  quantity: number;
  section?: string;           // optional grouping
  source: 'items' | 'hours' | 'materials';
}

/**
 * Aggregated line for final Aufmaß
 */
export interface AufmassAggregatedLine {
  position?: string;
  description: string;
  unit: string;
  totalQuantity: number;
  section?: string;
}

/**
 * Request type for generateAufmass Cloud Function
 */
export interface GenerateAufmassRequest {
  projectId: string;
  projectNumber?: string;
  range: {
    mode: 'project' | 'custom';
    from?: string;  // ISO YYYY-MM-DD
    to?: string;    // ISO YYYY-MM-DD
  };
  sources: {
    items: boolean;
    hours: boolean;
    materials: boolean;
  };
  aggregateBy: 'positionUnit' | 'descriptionUnit';
  hideZeroQuantities?: boolean;
  csvAlso: boolean;
}

/**
 * Response type for generateAufmass Cloud Function
 */
export interface GenerateAufmassResponse {
  docId: string;
  fileName: string;           // PDF name
  storagePath: string;
  csvPath?: string;
  rowCount: number;
  period: {
    from: string;             // ISO YYYY-MM-DD
    to: string;               // ISO YYYY-MM-DD
  };
}

/**
 * Aggregation options
 */
export interface AggregationOptions {
  aggregateBy: 'positionUnit' | 'descriptionUnit';
  hideZeroQuantities?: boolean;
}













