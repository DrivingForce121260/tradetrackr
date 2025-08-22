// ============================================================================
// CUSTOMER INTERFACES AND TYPES
// ============================================================================

import { ManagementProps, NavigationProps } from './common';

export interface Customer {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  contactPerson: string;
  notes: string;
  status: CustomerStatus;
  createdAt: string;
  updatedAt: string;
}

// Customer Status Type
export type CustomerStatus = 'active' | 'inactive' | 'prospect';

// Customer Props Interfaces
export interface CustomerManagementProps extends NavigationProps {}
