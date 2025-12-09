// ============================================================================
// CATEGORY ANALYTICS SERVICE
// ============================================================================
// Service for fetching and filtering category statistics

import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  limit as firestoreLimit,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { CategoryStats, CategoryAnalyticsFilter, CategoryAnalyticsSort } from '@/types/categoryStats';

/**
 * Fetch category statistics for an organization
 */
export async function fetchCategoryStats(
  orgId: string,
  filter?: CategoryAnalyticsFilter,
  sort?: CategoryAnalyticsSort,
  limitCount?: number
): Promise<CategoryStats[]> {
  try {
    let q = query(
      collection(db, 'categoryStats'),
      where('orgId', '==', orgId)
    );

    // Apply filters
    if (filter?.activeOnly) {
      q = query(q, where('categoryActive', '==', true));
    }

    if (filter?.rootCategoryOnly) {
      q = query(q, where('depth', '==', 0));
    }

    // Apply sorting
    if (sort) {
      switch (sort.field) {
        case 'totalCount':
          q = query(q, orderBy('totalDocuments', sort.order === 'desc' ? 'desc' : 'asc'));
          break;
        case 'documents':
          q = query(q, orderBy('totalDocuments', sort.order === 'desc' ? 'desc' : 'asc'));
          break;
        case 'tasks':
          q = query(q, orderBy('totalTasks', sort.order === 'desc' ? 'desc' : 'asc'));
          break;
        case 'reports':
          q = query(q, orderBy('totalReports', sort.order === 'desc' ? 'desc' : 'asc'));
          break;
        case 'depth':
          q = query(q, orderBy('depth', sort.order === 'desc' ? 'desc' : 'asc'));
          break;
        default:
          // Default: sort by totalDocuments desc
          q = query(q, orderBy('totalDocuments', 'desc'));
      }
    } else {
      // Default sort: totalDocuments desc
      q = query(q, orderBy('totalDocuments', 'desc'));
    }

    // Apply limit
    if (limitCount) {
      q = query(q, firestoreLimit(limitCount));
    }

    const snapshot = await getDocs(q);
    let stats = snapshot.docs.map(doc => ({
      categoryId: doc.id.split('_')[1], // Extract categoryId from {orgId}_{categoryId}
      ...doc.data()
    } as CategoryStats));

    // Client-side filtering (for search term and minCount)
    if (filter?.searchTerm) {
      const searchLower = filter.searchTerm.toLowerCase();
      stats = stats.filter(stat => 
        stat.path.some(segment => segment.toLowerCase().includes(searchLower)) ||
        stat.path.join(' > ').toLowerCase().includes(searchLower)
      );
    }

    if (filter?.minCount !== undefined) {
      stats = stats.filter(stat => {
        const total = stat.totalDocuments + stat.totalTasks + stat.totalReports;
        return total >= filter.minCount!;
      });
    }

    // Client-side type filtering
    if (filter?.type && filter.type !== 'all') {
      stats = stats.filter(stat => {
        switch (filter.type) {
          case 'documents':
            return stat.totalDocuments > 0;
          case 'tasks':
            return stat.totalTasks > 0;
          case 'reports':
            return stat.totalReports > 0;
          default:
            return true;
        }
      });
    }

    // Client-side name sorting (if not already sorted by name)
    if (sort?.field === 'name') {
      stats.sort((a, b) => {
        const aName = a.path.join(' > ');
        const bName = b.path.join(' > ');
        return sort.order === 'desc' 
          ? bName.localeCompare(aName)
          : aName.localeCompare(bName);
      });
    }

    return stats;
  } catch (error) {
    console.error('[categoryAnalyticsService] Failed to fetch category stats:', error);
    throw error;
  }
}

/**
 * Get aggregated totals for all categories in an org
 */
export async function getCategoryTotals(orgId: string): Promise<{
  totalCategories: number;
  totalDocuments: number;
  totalTasks: number;
  totalReports: number;
}> {
  try {
    const stats = await fetchCategoryStats(orgId);
    
    return {
      totalCategories: stats.length,
      totalDocuments: stats.reduce((sum, stat) => sum + stat.totalDocuments, 0),
      totalTasks: stats.reduce((sum, stat) => sum + stat.totalTasks, 0),
      totalReports: stats.reduce((sum, stat) => sum + stat.totalReports, 0)
    };
  } catch (error) {
    console.error('[categoryAnalyticsService] Failed to get totals:', error);
    throw error;
  }
}







