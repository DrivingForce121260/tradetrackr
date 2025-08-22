// ============================================================================
// CATEGORY INTERFACES AND TYPES
// ============================================================================

import { ManagementProps, NavigationProps } from './common';

export interface Category {
  id: string;
  title: string;
  items: CategoryItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CategoryItem {
  id: string;
  name: string;
  description?: string;
  unit?: string;
  price?: number;
  supplier?: string;
  category?: string;
  status?: string;
}

// Category Props Interfaces
export interface CategoriesProps extends NavigationProps {}
