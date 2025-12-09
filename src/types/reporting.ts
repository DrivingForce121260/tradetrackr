export type ReportDataset = 'projects' | 'timeEntries' | 'materials' | 'invoices' | 'personnel';

export type ReportAggregation = 'sum' | 'avg' | 'count' | 'groupBy';

export type ReportVisualization = 'table' | 'bar' | 'line' | 'pie';

export interface ReportField {
  key: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'currency' | 'boolean';
}

export interface ReportFilter {
  field: string;
  op: '==' | '!=' | '<' | '<=' | '>' | '>=' | 'in' | 'array-contains' | 'between' | 'contains';
  value: any;
  valueTo?: any; // for range
}

export interface ReportAggregationConfig {
  op: ReportAggregation;
  field?: string;
  groupBy?: string[];
}

export interface ReportTemplate {
  id?: string;
  name: string;
  createdBy: string;
  concernID: string;
  dataset: ReportDataset;
  fields: string[];
  filters: ReportFilter[];
  aggregation?: ReportAggregationConfig;
  visualization: ReportVisualization;
  exportFormats?: Array<'csv' | 'xlsx' | 'pdf'>;
  currency?: 'EUR' | 'USD' | 'GBP';
  branding?: {
    title?: string;
    footerText?: string;
  };
  lastRun?: number;
  schedule?: ReportSchedule | null;
  createdAt?: number;
  updatedAt?: number;
}

export interface ReportResultMeta {
  templateId: string;
  runBy: string;
  runAt: number;
  rowCount: number;
  storagePaths?: {
    csv?: string;
    xlsx?: string;
    pdf?: string;
  };
}

export interface ReportSchedule {
  frequency: 'daily' | 'weekly' | 'monthly';
  recipients: string[];
  nextRunAt?: number;
  active: boolean;
}

export interface ExecuteReportRequest {
  template: ReportTemplate;
  preview?: boolean;
  limit?: number;
}

export interface ExecuteReportResponse {
  rows: any[];
  columns: ReportField[];
  aggregates?: Record<string, number>;
}














