// ============================================================================
// CATEGORY HELPER FUNCTIONS - Mobile App
// ============================================================================
// Mobile-specific category helpers that use cache and work offline
// Extends the base categoryHelpers with mobile-specific functionality

import { Category, CategoryNode } from '../types/category';
import { buildCategoryTree, getChildren, findCategoryById, getCategoryPath } from './categoryHelpers';
import { loadCategoriesFromCache } from '../../services/categoryCache';

/**
 * Fetch categories for org with cache fallback (Mobile)
 * Uses cache if available, otherwise fetches from Firestore
 */
export async function fetchCategoriesForOrgMobile(
  orgId: string,
  useCache: boolean = true
): Promise<Category[]> {
  // Try cache first if enabled
  if (useCache) {
    const cached = await loadCategoriesFromCache(orgId);
    if (cached && cached.length > 0) {
      return cached;
    }
  }

  // Fallback to base function (will fetch from Firestore)
  const { fetchCategoriesForOrg } = await import('./categoryHelpers');
  return fetchCategoriesForOrg(orgId);
}

/**
 * Get category by ID with cache support (Mobile)
 */
export async function getCategoryByIdMobile(
  orgId: string,
  categoryId: string | null,
  useCache: boolean = true
): Promise<Category | null> {
  if (!categoryId) return null;

  const categories = await fetchCategoriesForOrgMobile(orgId, useCache);
  return findCategoryById(categories, categoryId);
}

/**
 * Get category path with cache support (Mobile)
 */
export async function getCategoryPathMobile(
  orgId: string,
  categoryId: string | null,
  useCache: boolean = true
): Promise<string[]> {
  if (!categoryId) return [];

  const categories = await fetchCategoriesForOrgMobile(orgId, useCache);
  return getCategoryPath(categories, categoryId);
}

/**
 * Build category tree with cache support (Mobile)
 */
export async function buildCategoryTreeMobile(
  orgId: string,
  useCache: boolean = true
): Promise<CategoryNode[]> {
  const categories = await fetchCategoriesForOrgMobile(orgId, useCache);
  return buildCategoryTree(categories);
}

/**
 * Get children with cache support (Mobile)
 */
export async function getChildrenMobile(
  orgId: string,
  parentId: string | null,
  useCache: boolean = true
): Promise<Category[]> {
  const categories = await fetchCategoriesForOrgMobile(orgId, useCache);
  return getChildren(categories, parentId);
}







