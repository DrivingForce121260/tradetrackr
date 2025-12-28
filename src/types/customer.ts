// ============================================================================
// CUSTOMER INTERFACES AND TYPES
// This is the unified customer type used across the application.
// Previously there were separate 'clients' (invoicing) and 'customers' collections.
// Now everything uses the 'customers' collection.
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
  
  // Optional fields for extended functionality
  concernID?: string;           // Tenant/concern identifier
  vatId?: string;               // USt-IdNr. for invoicing
  
  // Legacy field aliases (for backward compatibility with old data)
  cusName?: string;             // Legacy: same as 'name'
  cusContact?: string;          // Legacy: same as 'contactPerson'
  cusAddress?: string;          // Legacy: same as 'address'
  cusTel?: string;              // Legacy: same as 'phone'
  cusEmail?: string;            // Legacy: same as 'email'
  
  // CRM integration fields
  crmAccountId?: string;        // Reference to CRM account if converted from CRM
  legalForm?: string;           // Legal form (GmbH, AG, etc.)
  industry?: string;            // Industry/branch
}

// Customer Status Type
export type CustomerStatus = 'active' | 'inactive' | 'prospect';

// Customer Props Interfaces
export interface CustomerManagementProps extends NavigationProps {}
