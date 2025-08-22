// ============================================================================
// PROJECT INTERFACES AND TYPES
// ============================================================================

import { FormProps, ListProps, ManagementProps, ManagementWithNavigationProps } from './common';

// Base Project Interface - Common properties for all project types
export interface BaseProject {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  createdAt: string;
}

// Standard Project Interface - Used in most components
export interface Project extends BaseProject {
  title: string;
  client: string;
  location: string;
  startDate: string;
  endDate: string;
  budget: string;
  priority: ProjectPriority;
}

// Extended Project Interface - Used in ProjectManagement
export interface ExtendedProject extends BaseProject {
  projectNumber: string;
  customerReference: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerAddress: string;
  category: string;
  assignedManager: string;
  city: string;
  postalCode: string;
  workLocation: string;
  workAddress: string;
  workCity: string;
  workPostalCode: string;
  workLocationNotes: string;
  notes: string;
  assignedEmployees: string[];
  assignedMaterialGroups: string[];
  projectStartDate: string;
  plannedEndDate: string;
  customerUserId?: string; // ID of the auftraggeber user for this project
}

// Auftraggeber Project Interface - Used in AuftraggeberDashboard
export interface AuftraggeberProject extends BaseProject {
  projectNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  projectStartDate: string;
  plannedEndDate: string;
  assignedEmployees: string[];
  assignedMaterialGroups: string[];
}

// Project Information Interface
export interface ProjectInfo {
  id: string;
  projectId: string;
  projectNumber: string;
  title: string;
  type: ProjectInfoType;
  description: string;
  content: string;
  uploadedBy: string;
  uploadedAt: string;
}

// Project Status and Priority Types
export type ProjectStatus = 'planned' | 'active' | 'completed' | 'archived' | 'planning' | 'in-progress' | 'on-hold';
export type ProjectPriority = 'low' | 'medium' | 'high';
export type ProjectInfoType = 'checklist' | 'diagram' | 'pdf' | 'leistungsverzeichnis' | 'other';

// Project Props Interfaces
export interface ProjectDashboardProps {
  projects: Project[];
}

export interface ProjectFormProps extends FormProps<Project | ExtendedProject> {}

export interface ProjectListProps extends ListProps<Project> {}

export interface ProjectManagementProps extends ManagementWithNavigationProps {}

export interface ProjectInformationProps extends ManagementWithNavigationProps {}
