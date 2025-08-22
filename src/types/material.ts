// ============================================================================
// MATERIAL INTERFACES AND TYPES
// ============================================================================

import { ManagementProps, NavigationProps } from './common';

export interface Material {
  id: string;
  materialNumber: string;
  partNumber: string;
  name: string;
  category: string;
  manufacturer: string;
  supplier: string;
  projectNumber: string;
  workLocation: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  status: MaterialStatus;
  orderDate: string;
  deliveryDate?: string;
  notes: string;
  employee: string;
}

// Material Status Type
export type MaterialStatus = 'available' | 'low-stock' | 'out-of-stock' | 'discontinued';

// Material Props Interfaces
export interface MaterialManagementProps extends NavigationProps {}
