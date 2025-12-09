// ============================================================================
// CATEGORY CACHE SERVICE - Mobile App
// ============================================================================
// Service for managing category cache with versioning support
// Used by useCategories hook and category helpers

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Category } from '../types/category';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';

const CACHE_KEY_PREFIX = 'categories:';
const VERSION_KEY_PREFIX = 'categoriesVersion:';
const ORG_SETTINGS_COLLECTION = 'orgSettings';

interface CachedCategories {
  categories: Category[];
  timestamp: number;
  version: number;
}

/**
 * Get cache key for orgId
 */
export function getCategoryCacheKey(orgId: string): string {
  return `${CACHE_KEY_PREFIX}${orgId}`;
}

export function getCategoryVersionKey(orgId: string): string {
  return `${VERSION_KEY_PREFIX}${orgId}`;
}

/**
 * Load categories from cache
 */
export async function loadCategoriesFromCache(orgId: string): Promise<Category[] | null> {
  try {
    const cacheKey = getCategoryCacheKey(orgId);
    const cached = await AsyncStorage.getItem(cacheKey);
    
    if (!cached) {
      return null;
    }

    const parsed: CachedCategories = JSON.parse(cached);
    return parsed.categories;
  } catch (error) {
    console.error('[categoryCache] Failed to load from cache:', error);
    return null;
  }
}

/**
 * Save categories to cache
 */
export async function saveCategoriesToCache(
  orgId: string, 
  categories: Category[], 
  version: number
): Promise<void> {
  try {
    const cacheKey = getCategoryCacheKey(orgId);
    const cached: CachedCategories = {
      categories,
      timestamp: Date.now(),
      version
    };
    
    await AsyncStorage.setItem(cacheKey, JSON.stringify(cached));
    
    // Also save version separately
    const versionKey = getCategoryVersionKey(orgId);
    await AsyncStorage.setItem(versionKey, JSON.stringify({ version, timestamp: Date.now() }));
  } catch (error) {
    console.error('[categoryCache] Failed to save to cache:', error);
  }
}

/**
 * Get categories version from orgSettings
 */
export async function getCategoriesVersion(orgId: string): Promise<number | null> {
  try {
    const orgSettingsRef = doc(db, ORG_SETTINGS_COLLECTION, orgId);
    const orgSettingsSnap = await getDoc(orgSettingsRef);
    
    if (!orgSettingsSnap.exists()) {
      return null;
    }

    const data = orgSettingsSnap.data();
    return data.categoriesVersion || null;
  } catch (error) {
    console.error('[categoryCache] Failed to get categories version:', error);
    return null;
  }
}

/**
 * Check if cache is valid (version matches)
 */
export async function isCategoryCacheValid(orgId: string): Promise<boolean> {
  try {
    const versionKey = getCategoryVersionKey(orgId);
    const cachedVersionData = await AsyncStorage.getItem(versionKey);
    
    if (!cachedVersionData) {
      return false;
    }

    const cachedVersion = JSON.parse(cachedVersionData).version;
    const serverVersion = await getCategoriesVersion(orgId);
    
    if (serverVersion === null) {
      // No versioning on server - assume valid
      return true;
    }

    return cachedVersion === serverVersion;
  } catch (error) {
    console.error('[categoryCache] Failed to check cache validity:', error);
    return false;
  }
}

/**
 * Clear category cache for orgId
 */
export async function clearCategoryCache(orgId: string): Promise<void> {
  try {
    const cacheKey = getCategoryCacheKey(orgId);
    const versionKey = getCategoryVersionKey(orgId);
    
    await AsyncStorage.removeItem(cacheKey);
    await AsyncStorage.removeItem(versionKey);
  } catch (error) {
    console.error('[categoryCache] Failed to clear cache:', error);
  }
}







