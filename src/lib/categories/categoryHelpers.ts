// ============================================================================
// CATEGORY HELPER FUNCTIONS
// ============================================================================
// 
// Backend/shared utilities for category operations.
// These functions handle the normalized category model and ensure
// path, depth, and sortOrder are always consistent.
//
// Used by both portal (client-side) and mobile (via callable functions).

import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  writeBatch, 
  serverTimestamp,
  Timestamp,
  limit,
  setDoc,
  increment
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Category, CreateCategoryInput, RenameCategoryInput, MoveCategoryInput, ReorderCategoryInput } from '@/types/category';

/**
 * Increment categories version in orgSettings
 * This invalidates mobile caches when structural changes occur
 */
async function incrementCategoriesVersion(orgId: string, batch?: ReturnType<typeof writeBatch>): Promise<void> {
  const orgSettingsRef = doc(db, 'orgSettings', orgId);
  
  if (batch) {
    // Use existing batch
    const orgSettingsDoc = await getDoc(orgSettingsRef);
    const currentVersion = orgSettingsDoc.exists() ? (orgSettingsDoc.data().categoriesVersion || 0) : 0;
    batch.set(orgSettingsRef, {
      categoriesVersion: currentVersion + 1,
      categoriesUpdatedAt: serverTimestamp()
    }, { merge: true });
  } else {
    // Create new batch
    const orgSettingsDoc = await getDoc(orgSettingsRef);
    const currentVersion = orgSettingsDoc.exists() ? (orgSettingsDoc.data().categoriesVersion || 0) : 0;
    await setDoc(orgSettingsRef, {
      categoriesVersion: currentVersion + 1,
      categoriesUpdatedAt: serverTimestamp()
    }, { merge: true });
  }
}

/**
 * Category Node with children (for tree structures)
 */
export interface CategoryNode extends Category {
  children: CategoryNode[];
}

/**
 * Fetch all categories for an organization
 * Returns flat list, sorted by depth and sortOrder
 */
export async function fetchCategoriesForOrg(orgId: string): Promise<Category[]> {
  try {
    const q = query(
      collection(db, 'categories'),
      where('orgId', '==', orgId),
      orderBy('depth', 'asc'),
      orderBy('sortOrder', 'asc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      categoryId: doc.id,
      ...doc.data()
    } as Category));
  } catch (error) {
    console.error('Error fetching categories:', error);
    throw error;
  }
}

/**
 * Build category tree from flat list
 * Returns CategoryNode[] with children arrays
 */
export function buildCategoryTree(categories: Category[]): CategoryNode[] {
  const categoryMap = new Map<string, CategoryNode>();
  const roots: CategoryNode[] = [];

  // Create map of all categories
  categories.forEach(cat => {
    categoryMap.set(cat.categoryId, { ...cat, children: [] });
  });

  // Build tree structure
  categories.forEach(cat => {
    const node = categoryMap.get(cat.categoryId)!;
    if (cat.parentId === null) {
      roots.push(node);
    } else {
      const parent = categoryMap.get(cat.parentId);
      if (parent) {
        parent.children.push(node);
      }
    }
  });

  // Sort children by sortOrder, then by name
  const sortChildren = (nodes: CategoryNode[]): CategoryNode[] => {
    return nodes.map(node => {
      if (node.children && node.children.length > 0) {
        node.children = sortChildren(node.children);
      }
      return node;
    }).sort((a, b) => {
      const orderCmp = a.sortOrder - b.sortOrder;
      if (orderCmp !== 0) return orderCmp;
      return a.name.localeCompare(b.name);
    });
  };

  return sortChildren(roots);
}

/**
 * Get children of a specific parent
 * Returns flat list of direct children, sorted by sortOrder and name
 */
export function getChildren(categories: Category[], parentId: string | null): Category[] {
  return categories
    .filter(c => c.parentId === parentId && c.active)
    .sort((a, b) => {
      const orderCmp = a.sortOrder - b.sortOrder;
      if (orderCmp !== 0) return orderCmp;
      return a.name.localeCompare(b.name);
    });
}

/**
 * Find category by ID
 */
export function findCategoryById(categories: Category[], categoryId: string | null): Category | null {
  if (!categoryId) return null;
  return categories.find(c => c.categoryId === categoryId) || null;
}

/**
 * Get category path (array of names from root to category)
 */
export function getCategoryPath(categories: Category[], categoryId: string | null): string[] {
  if (!categoryId) return [];
  
  const category = findCategoryById(categories, categoryId);
  if (!category) return [];
  
  // Use the stored path if available
  if (category.path && category.path.length > 0) {
    return category.path;
  }
  
  // Otherwise build path from parent chain
  const path: string[] = [category.name];
  let currentParentId = category.parentId;
  
  while (currentParentId) {
    const parent = findCategoryById(categories, currentParentId);
    if (!parent) break;
    path.unshift(parent.name);
    currentParentId = parent.parentId;
  }
  
  return path;
}

/**
 * Get max sortOrder for siblings under a parent
 */
async function getMaxSortOrderForParent(orgId: string, parentId: string | null): Promise<number> {
  const q = query(
    collection(db, 'categories'),
    where('orgId', '==', orgId),
    where('parentId', parentId === null ? '==' : '==', parentId),
    orderBy('sortOrder', 'desc'),
    limit(1)
  );
  
  const snapshot = await getDocs(q);
  if (snapshot.empty) {
    return -1;
  }
  
  const maxSortOrder = snapshot.docs[0].data().sortOrder;
  return maxSortOrder ?? -1;
}

/**
 * Get parent category path
 */
async function getParentPath(parentId: string | null, orgId: string): Promise<string[]> {
  if (parentId === null) {
    return [];
  }
  
  const parentDoc = await getDoc(doc(db, 'categories', parentId));
  if (!parentDoc.exists()) {
    throw new Error(`Parent category ${parentId} not found`);
  }
  
  const parentData = parentDoc.data() as Category;
  if (parentData.orgId !== orgId) {
    throw new Error('Parent category belongs to different organization');
  }
  
  return parentData.path;
}

/**
 * Get parent category depth
 */
async function getParentDepth(parentId: string | null): Promise<number> {
  if (parentId === null) {
    return -1;
  }
  
  const parentDoc = await getDoc(doc(db, 'categories', parentId));
  if (!parentDoc.exists()) {
    throw new Error(`Parent category ${parentId} not found`);
  }
  
  const parentData = parentDoc.data() as Category;
  return parentData.depth;
}

/**
 * Recompute path and depth for a category and all its descendants
 * This is called when a category is moved or renamed
 */
async function recomputePathAndDepth(
  categoryId: string,
  newPath: string[],
  newDepth: number,
  orgId: string,
  batch: ReturnType<typeof writeBatch>
): Promise<void> {
  // Update the category itself
  const categoryRef = doc(db, 'categories', categoryId);
  batch.update(categoryRef, {
    path: newPath,
    depth: newDepth,
    updatedAt: serverTimestamp()
  });

  // Find all children
  const childrenQuery = query(
    collection(db, 'categories'),
    where('orgId', '==', orgId),
    where('parentId', '==', categoryId)
  );
  
  const childrenSnapshot = await getDocs(childrenQuery);
  
  // Recursively update children
  for (const childDoc of childrenSnapshot.docs) {
    const childData = childDoc.data() as Category;
    const childName = childData.name;
    const childNewPath = [...newPath, childName];
    const childNewDepth = newDepth + 1;
    
    await recomputePathAndDepth(
      childDoc.id,
      childNewPath,
      childNewDepth,
      orgId,
      batch
    );
  }
}

/**
 * Create a new category
 * Computes path, depth, and sortOrder automatically
 */
export async function createCategory(input: CreateCategoryInput): Promise<string> {
  const { orgId, parentId, name } = input;
  
  // Get parent info
  const parentPath = await getParentPath(parentId, orgId);
  const parentDepth = await getParentDepth(parentId);
  
  // Compute new category properties
  const path = [...parentPath, name];
  const depth = parentDepth + 1;
  const maxSortOrder = await getMaxSortOrderForParent(orgId, parentId);
  const sortOrder = maxSortOrder + 1;
  
  // Create category document
  const categoryRef = doc(collection(db, 'categories'));
  const categoryData: Omit<Category, 'categoryId'> = {
    orgId,
    parentId,
    name,
    path,
    depth,
    sortOrder,
    active: true,
    createdAt: serverTimestamp() as Timestamp,
    updatedAt: serverTimestamp() as Timestamp
  };
  
  const batch = writeBatch(db);
  batch.set(categoryRef, categoryData);
  
  // Increment version for cache invalidation
  await incrementCategoriesVersion(orgId, batch);
  
  await batch.commit();
  
  return categoryRef.id;
}

/**
 * Rename a category
 * Recomputes path for this category and all descendants
 */
export async function renameCategory(input: RenameCategoryInput): Promise<void> {
  const { categoryId, newName } = input;
  
  // Get current category
  const categoryRef = doc(db, 'categories', categoryId);
  const categoryDoc = await getDoc(categoryRef);
  
  if (!categoryDoc.exists()) {
    throw new Error(`Category ${categoryId} not found`);
  }
  
  const categoryData = categoryDoc.data() as Category;
  const orgId = categoryData.orgId;
  
  // Get parent path
  const parentPath = await getParentPath(categoryData.parentId, orgId);
  const newPath = [...parentPath, newName];
  
  // Update category and all descendants
  const batch = writeBatch(db);
  await recomputePathAndDepth(
    categoryId,
    newPath,
    categoryData.depth,
    orgId,
    batch
  );
  
  // Update name
  batch.update(categoryRef, {
    name: newName,
    updatedAt: serverTimestamp()
  });
  
  // Increment version for cache invalidation (structural change)
  await incrementCategoriesVersion(orgId, batch);
  
  await batch.commit();
}

/**
 * Move a category to a different parent
 * Recomputes path, depth, and sortOrder for moved node and descendants
 */
export async function moveCategory(input: MoveCategoryInput): Promise<void> {
  const { categoryId, newParentId } = input;
  
  // Get current category
  const categoryRef = doc(db, 'categories', categoryId);
  const categoryDoc = await getDoc(categoryRef);
  
  if (!categoryDoc.exists()) {
    throw new Error(`Category ${categoryId} not found`);
  }
  
  const categoryData = categoryDoc.data() as Category;
  const orgId = categoryData.orgId;
  
  // Prevent moving category to itself or its descendants
  if (newParentId === categoryId) {
    throw new Error('Cannot move category to itself');
  }
  
  if (newParentId !== null) {
    // Check if newParentId is a descendant
    const checkDescendant = async (checkId: string): Promise<boolean> => {
      if (checkId === categoryId) return true;
      const checkDoc = await getDoc(doc(db, 'categories', checkId));
      if (!checkDoc.exists()) return false;
      const checkData = checkDoc.data() as Category;
      if (checkData.parentId === null) return false;
      return await checkDescendant(checkData.parentId);
    };
    
    const isDescendant = await checkDescendant(newParentId);
    if (isDescendant) {
      throw new Error('Cannot move category to its own descendant');
    }
  }
  
  // Get new parent info
  const newParentPath = await getParentPath(newParentId, orgId);
  const newParentDepth = await getParentDepth(newParentId);
  
  // Compute new properties
  const newPath = [...newParentPath, categoryData.name];
  const newDepth = newParentDepth + 1;
  const maxSortOrder = await getMaxSortOrderForParent(orgId, newParentId);
  const newSortOrder = maxSortOrder + 1;
  
  // Update category and all descendants
  const batch = writeBatch(db);
  await recomputePathAndDepth(
    categoryId,
    newPath,
    newDepth,
    orgId,
    batch
  );
  
  // Update parentId and sortOrder
  batch.update(categoryRef, {
    parentId: newParentId,
    sortOrder: newSortOrder,
    updatedAt: serverTimestamp()
  });
  
  // Increment version for cache invalidation (structural change)
  await incrementCategoriesVersion(orgId, batch);
  
  await batch.commit();
}

/**
 * Delete a category (soft delete - sets active=false)
 * Optionally checks if category is referenced elsewhere
 */
export async function deleteCategory(
  categoryId: string,
  checkReferences: boolean = true
): Promise<void> {
  const categoryRef = doc(db, 'categories', categoryId);
  const categoryDoc = await getDoc(categoryRef);
  
  if (!categoryDoc.exists()) {
    throw new Error(`Category ${categoryId} not found`);
  }
  
  // TODO: Check references if checkReferences is true
  // This would query documents, tasks, etc. that reference this category
  
  const categoryData = categoryDoc.data() as Category;
  const orgId = categoryData.orgId;
  
  // Soft delete: set active=false
  const batch = writeBatch(db);
  batch.update(categoryRef, {
    active: false,
    updatedAt: serverTimestamp()
  });
  
  // Increment version for cache invalidation
  await incrementCategoriesVersion(orgId, batch);
  
  await batch.commit();
}

/**
 * Reorder categories (drag & drop)
 * Updates sortOrder for siblings when reordering occurs
 */
export async function reorderCategories(
  categoryId: string,
  newSortOrder: number
): Promise<void> {
  const categoryRef = doc(db, 'categories', categoryId);
  const categoryDoc = await getDoc(categoryRef);
  
  if (!categoryDoc.exists()) {
    throw new Error(`Category ${categoryId} not found`);
  }
  
  const categoryData = categoryDoc.data() as Category;
  const orgId = categoryData.orgId;
  const parentId = categoryData.parentId;
  const oldSortOrder = categoryData.sortOrder;
  
  if (oldSortOrder === newSortOrder) {
    return; // No change needed
  }
  
  // Get all siblings
  const siblingsQuery = query(
    collection(db, 'categories'),
    where('orgId', '==', orgId),
    where('parentId', parentId === null ? '==' : '==', parentId),
    orderBy('sortOrder', 'asc')
  );
  
  const siblingsSnapshot = await getDocs(siblingsQuery);
  const siblings = siblingsSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Category & { id: string }));
  
  // Reorder siblings
  const batch = writeBatch(db);
  
  if (newSortOrder > oldSortOrder) {
    // Moving down: shift siblings up
    siblings.forEach(sibling => {
      if (sibling.sortOrder > oldSortOrder && sibling.sortOrder <= newSortOrder) {
        batch.update(doc(db, 'categories', sibling.categoryId), {
          sortOrder: sibling.sortOrder - 1,
          updatedAt: serverTimestamp()
        });
      }
    });
  } else {
    // Moving up: shift siblings down
    siblings.forEach(sibling => {
      if (sibling.sortOrder >= newSortOrder && sibling.sortOrder < oldSortOrder) {
        batch.update(doc(db, 'categories', sibling.categoryId), {
          sortOrder: sibling.sortOrder + 1,
          updatedAt: serverTimestamp()
        });
      }
    });
  }
  
  // Update the moved category
  batch.update(categoryRef, {
    sortOrder: newSortOrder,
    updatedAt: serverTimestamp()
  });
  
  // Increment version for cache invalidation (structural change)
  await incrementCategoriesVersion(orgId, batch);
  
  await batch.commit();
}

