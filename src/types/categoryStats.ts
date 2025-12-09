// ============================================================================
// CATEGORY STATISTICS TYPES
// ============================================================================
// Analytics schema for category usage across documents, tasks, and reports

import { Timestamp } from 'firebase/firestore';

/**
 * Category Statistics Document
 * Firestore Collection: /categoryStats/{orgId}_{categoryId}
 * 
 * Aggregated statistics for category usage across the system
 */
export interface CategoryStats {
  orgId: string;
  categoryId: string;
  path: string[];                 // Denormalized category path for easier display/filter
  depth: number;                 // Denormalized depth for filtering
  totalDocuments: number;         // Count of documents with this categoryId
  totalTasks: number;             // Count of tasks with this categoryId
  totalReports: number;           // Count of reports with this categoryId
  lastUpdatedAt: Timestamp;      // Last time stats were updated
  categoryActive: boolean;        // Denormalized active status from category
}

/**
 * Category Analytics Filter Options
 */
export interface CategoryAnalyticsFilter {
  searchTerm?: string;            // Search by category name/path
  type?: 'documents' | 'tasks' | 'reports' | 'all';  // Filter by type
  rootCategoryOnly?: boolean;    // Show only root categories (depth === 0)
  activeOnly?: boolean;          // Show only active categories
  minCount?: number;              // Minimum total count to show
}

/**
 * Category Analytics Sort Options
 */
export type CategoryAnalyticsSortField = 'totalCount' | 'name' | 'depth' | 'documents' | 'tasks' | 'reports';
export type CategoryAnalyticsSortOrder = 'asc' | 'desc';

export interface CategoryAnalyticsSort {
  field: CategoryAnalyticsSortField;
  order: CategoryAnalyticsSortOrder;
}

/**
 * Category Analytics Result
 */
export interface CategoryAnalyticsResult {
  stats: CategoryStats[];
  totalCategories: number;
  totalDocuments: number;
  totalTasks: number;
  totalReports: number;
}







