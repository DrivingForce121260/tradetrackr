// ============================================================================
// REPORT INTERFACES AND TYPES
// ============================================================================

import { ManagementWithNavigationProps } from './common';

// Arbeitszeile Interface für detaillierte Arbeitsbeschreibungen
export interface WorkLine {
  id?: string; // Optional for compatibility with Firestore service
  linenumber: number;
  reportID: string;
  component: string;
  workDone: string;
  quantity: number;
  hours: number;
  dateCreated: string;
  text: string;
  zusatz: string;
  activeProject: string;
  location: string;
  UIDAB: string;
  mitarbeiterID: string;
  mitarbeiterName: string;
  activeprojectName: string;
  gewerk: string;
}

// Erweitertes Report Interface basierend auf Mobile App
export interface Report {
  id: string;
  reportNumber: string;
  employee: string;
  customer: string;
  projectNumber: string;
  workLocation: string;
  workDate: string;
  totalHours: number;
  workDescription: string;
  status: ReportStatus;
  
  // Neue Felder aus Mobile App
  mitarbeiterID: string;
  projectReportNumber: string;
  reportData: string; // CSV-Format der Arbeitszeilen
  reportDate: string;
  signatureReference: string;
  stadt: string;
  concernID: string;
  
  // Arbeitszeilen als strukturierte Daten
  workLines: WorkLine[];
  
  // Projektinfo
  activeprojectName: string;
  location: string;
  
  // Firestore compatibility fields
  createdAt?: Date | any; // Timestamp from Firestore
  updatedAt?: Date | any; // Timestamp from Firestore
}

// Report Status Type
export type ReportStatus = 'pending' | 'approved' | 'rejected';

// Report Props Interfaces
export interface ReportsManagementProps extends ManagementWithNavigationProps {}
