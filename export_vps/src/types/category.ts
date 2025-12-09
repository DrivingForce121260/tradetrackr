// ============================================================================
// CATEGORY INTERFACES AND TYPES
// ============================================================================

import { Timestamp } from 'firebase/firestore';
import { ManagementProps, NavigationProps } from './common';

/**
 * Normalized Category Model (Single Source of Truth)
 * 
 * This is the canonical category structure used across portal and mobile.
 * Replaces/adepends existing category structures:
 * - src/services/firestoreService.ts Category (legacy, kept for compatibility)
 * - src/types/category.ts Category (legacy, kept for compatibility)
 * 
 * Firestore Collection: /categories/{categoryId}
 */
export interface Category {
  categoryId: string;            // doc.id (Firestore document ID)
  orgId: string;                 // Multi-tenant key (concernID equivalent)
  parentId: string | null;       // null = root category, otherwise parent categoryId
  name: string;                  // Display name
  path: string[];                // ["Electrical", "Lighting", "Switches"] - derived from parent chain
  depth: number;                 // 0 for root, 1 for child, etc. - derived from parent
  sortOrder: number;             // 0..N for ordering among siblings
  active: boolean;               // false = hidden from pickers but not deleted (soft delete)
  createdAt: Timestamp;          // Firebase Timestamp
  updatedAt: Timestamp;          // Firebase Timestamp
}

/**
 * Legacy Category Interface (kept for backward compatibility)
 * Used by existing Categories.tsx component
 */
export interface LegacyCategory {
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

/**
 * Input for creating a new category
 */
export interface CreateCategoryInput {
  orgId: string;
  parentId: string | null;
  name: string;
}

/**
 * Input for renaming a category
 */
export interface RenameCategoryInput {
  categoryId: string;
  newName: string;
}

/**
 * Input for moving a category
 */
export interface MoveCategoryInput {
  categoryId: string;
  newParentId: string | null;
}

/**
 * Input for reordering categories
 */
export interface ReorderCategoryInput {
  categoryId: string;
  newSortOrder: number;
}

/**
 * Tree node structure for UI rendering
 */
export interface CategoryTreeNode extends Category {
  children?: CategoryTreeNode[];
}
