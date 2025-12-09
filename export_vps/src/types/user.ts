// ============================================================================
// USER INTERFACES AND TYPES
// ============================================================================

import { ManagementProps, NavigationProps } from './common';

export interface User {
  id: string;
  uid?: string; // Firebase UID
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  permissions: string[];
  isActive: boolean;
  concernID?: string; // Concern ID for multi-tenant
  ConcernID?: string; // Alternative spelling
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

// User Role Type
export type UserRole = 'admin' | 'office' | 'manager' | 'employee' | 'auftraggeber';

// User Props Interfaces
export interface UserManagementProps extends NavigationProps {}

export interface AuftraggeberDashboardProps extends ManagementProps {}
