// ============================================================================
// USER INTERFACES AND TYPES
// ============================================================================

import { ManagementProps, NavigationProps } from './common';

export interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  permissions: string[];
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

// User Role Type
export type UserRole = 'admin' | 'office' | 'manager' | 'employee' | 'auftraggeber';

// User Props Interfaces
export interface UserManagementProps extends NavigationProps {}

export interface AuftraggeberDashboardProps extends ManagementProps {}
