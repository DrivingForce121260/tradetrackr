export type VacationRequestStatus = 'requested' | 'approved' | 'rejected' | 'cancelled';

export interface Qualification {
  title: string;
  issuer?: string;
  issueDate?: string | Date;
  expiryDate?: string | Date;
  documentURL?: string;
}

export interface ServiceHistoryItem {
  projectId: string;
  role?: string;
  from: string | Date;
  to?: string | Date;
  notes?: string;
}

export interface VacationRequest {
  id: string;
  start: string | Date;
  end: string | Date;
  reason?: string;
  status: VacationRequestStatus;
  approvedBy?: string;
  createdAt: string | Date;
}

export interface Personnel {
  id: string;
  concernID: string;
  displayName: string;
  role?: string;
  department?: string;
  currentProjectId?: string;
  vacationBalance?: number;
  vacationRequests?: VacationRequest[];
  qualifications?: Qualification[];
  serviceHistory?: ServiceHistoryItem[];
  createdAt?: any;
  updatedAt?: any;
}















