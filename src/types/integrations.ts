// Integrations and Interfaces types

export type InterfaceJobStatus = 'queued' | 'running' | 'success' | 'failed';

export interface InterfaceJob {
  jobId: string;
  type: 'GAEB_IMPORT' | 'GAEB_EXPORT' | 'DATANORM_IMPORT' | 'IDS_REFRESH' | 'DATEV_EXPORT' | 'LEXWARE_EXPORT' | 'API_SYNC';
  concernId: string;
  timestamp: Date;
  status: InterfaceJobStatus;
  logText?: string;
  details?: Record<string, any>;
}

export interface SupplierConfig {
  supplierId: string;
  name: string;
  concernId: string;
  idsSandboxUrl?: string;
  idsApiToken?: string;
  lastSyncAt?: Date;
}

export interface DatanormRecord {
  supplier: string;
  articleNumber: string;
  description: string;
  price: number;
  unit: string;
  group?: string;
  vatRate?: number;
}

export interface GaebPosition {
  id: string;
  titleShort: string;
  titleLong?: string;
  quantity: number;
  unit: string;
  price?: number;
  children?: GaebPosition[];
}














