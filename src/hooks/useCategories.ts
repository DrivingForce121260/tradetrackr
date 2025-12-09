// ============================================================================
// USE CATEGORIES HOOK - Mobile App
// ============================================================================
// Central hook for category data with Firestore subscription, local cache, and versioning
// Uses unified Category model from /categories collection

import { useState, useEffect, useCallback, useRef } from 'react';
import { collection, query, where, orderBy, onSnapshot, getDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Category, CategoryNode } from '../types/category';
import { buildCategoryTree, getCategoryPath } from '../lib/categories/categoryHelpers';
import { ConcernId } from '../types';

interface UseCategoriesReturn {
  categories: Category[];
  categoryTree: CategoryNode[];
  isLoading: boolean;
  error: Error | null;
  isStale: boolean;
  lastSync: number | null;
  refresh: () => Promise<void>;
}

interface CachedCategories {
  categories: Category[];
  timestamp: number;
  version: number;
}

const CACHE_KEY_PREFIX = 'categories:';
const VERSION_KEY_PREFIX = 'categoriesVersion:';
const CACHE_STALE_THRESHOLD = 24 * 60 * 60 * 1000; // 24 hours
const ORG_SETTINGS_COLLECTION = 'orgSettings';

/**
 * Get cache key for orgId
 */
function getCacheKey(orgId: string): string {
  return `${CACHE_KEY_PREFIX}${orgId}`;
}

function getVersionKey(orgId: string): string {
  return `${VERSION_KEY_PREFIX}${orgId}`;
}

/**
 * Load categories from local cache
 */
async function loadFromCache(orgId: string): Promise<Category[] | null> {
  try {
    const cacheKey = getCacheKey(orgId);
    const cached = await AsyncStorage.getItem(cacheKey);
    
    if (!cached) {
      return null;
    }

    const parsed: CachedCategories = JSON.parse(cached);
    
    // Check if cache is stale
    const age = Date.now() - parsed.timestamp;
    if (age > CACHE_STALE_THRESHOLD) {
      console.warn('[useCategories] Cache is stale, ignoring');
      return null;
    }

    return parsed.categories;
  } catch (error) {
    console.error('[useCategories] Failed to load from cache:', error);
    return null;
  }
}

/**
 * Save categories to local cache
 */
async function saveToCache(orgId: string, categories: Category[], version: number): Promise<void> {
  try {
    const cacheKey = getCacheKey(orgId);
    const cached: CachedCategories = {
      categories,
      timestamp: Date.now(),
      version
    };
    
    await AsyncStorage.setItem(cacheKey, JSON.stringify(cached));
    
    // Also save version separately for quick checks
    const versionKey = getVersionKey(orgId);
    await AsyncStorage.setItem(versionKey, JSON.stringify({ version, timestamp: Date.now() }));
  } catch (error) {
    console.error('[useCategories] Failed to save to cache:', error);
  }
}

/**
 * Get categories version from orgSettings
 */
async function getCategoriesVersion(orgId: string): Promise<number | null> {
  try {
    const orgSettingsRef = doc(db, ORG_SETTINGS_COLLECTION, orgId);
    const orgSettingsSnap = await getDoc(orgSettingsRef);
    
    if (!orgSettingsSnap.exists()) {
      return null;
    }

    const data = orgSettingsSnap.data();
    return data.categoriesVersion || null;
  } catch (error) {
    console.error('[useCategories] Failed to get categories version:', error);
    return null;
  }
}

/**
 * Check if cached version matches server version
 */
async function isCacheValid(orgId: string): Promise<boolean> {
  try {
    const versionKey = getVersionKey(orgId);
    const cachedVersionData = await AsyncStorage.getItem(versionKey);
    
    if (!cachedVersionData) {
      return false; // No cached version
    }

    const cachedVersion = JSON.parse(cachedVersionData).version;
    const serverVersion = await getCategoriesVersion(orgId);
    
    if (serverVersion === null) {
      // No versioning on server - use timestamp-based staleness
      return true;
    }

    return cachedVersion === serverVersion;
  } catch (error) {
    console.error('[useCategories] Failed to check cache validity:', error);
    return false;
  }
}

/**
 * Hook for fetching and subscribing to categories
 */
export function useCategories(orgId: string | null): UseCategoriesReturn {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastSync, setLastSync] = useState<number | null>(null);
  const [isStale, setIsStale] = useState(false);
  
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const orgIdRef = useRef<string | null>(orgId);

  // Build category tree from flat list
  const categoryTree = buildCategoryTree(categories);

  // Load from cache first (offline-first)
  useEffect(() => {
    if (!orgId) {
      setIsLoading(false);
      return;
    }

    let mounted = true;

    const initialize = async () => {
      try {
        // Check cache validity
        const cacheValid = await isCacheValid(orgId);
        
        if (cacheValid) {
          // Load from cache immediately
          const cachedCategories = await loadFromCache(orgId);
          if (cachedCategories && mounted) {
            setCategories(cachedCategories);
            setIsLoading(false);
            setError(null);
            
            // Check staleness
            const cacheKey = getCacheKey(orgId);
            const cached = await AsyncStorage.getItem(cacheKey);
            if (cached) {
              const parsed: CachedCategories = JSON.parse(cached);
              const age = Date.now() - parsed.timestamp;
              setIsStale(age > CACHE_STALE_THRESHOLD);
              setLastSync(parsed.timestamp);
            }
          }
        } else {
          // Cache invalid - clear it
          const cacheKey = getCacheKey(orgId);
          await AsyncStorage.removeItem(cacheKey);
        }

        // Set up Firestore subscription
        const categoriesRef = collection(db, 'categories');
        const q = query(
          categoriesRef,
          where('orgId', '==', orgId),
          orderBy('depth', 'asc'),
          orderBy('sortOrder', 'asc')
        );

        const unsubscribe = onSnapshot(
          q,
          async (snapshot) => {
            if (!mounted) return;

            try {
              const fetchedCategories: Category[] = snapshot.docs.map(doc => ({
                categoryId: doc.id,
                ...doc.data()
              } as Category));

              setCategories(fetchedCategories);
              setIsLoading(false);
              setError(null);
              setIsStale(false);
              setLastSync(Date.now());

              // Save to cache
              const version = await getCategoriesVersion(orgId);
              await saveToCache(orgId, fetchedCategories, version || 0);
            } catch (err) {
              console.error('[useCategories] Error processing snapshot:', err);
              if (mounted) {
                setError(err as Error);
              }
            }
          },
          (err) => {
            console.error('[useCategories] Firestore subscription error:', err);
            if (mounted) {
              setError(err as Error);
              setIsLoading(false);
              
              // On network error, keep using cached data if available
              if (err.code === 'unavailable' || err.code === 'failed-precondition') {
                loadFromCache(orgId).then(cached => {
                  if (cached && mounted) {
                    setCategories(cached);
                    setIsStale(true);
                  }
                });
              }
            }
          }
        );

        unsubscribeRef.current = unsubscribe;
        orgIdRef.current = orgId;
      } catch (err) {
        console.error('[useCategories] Initialization error:', err);
        if (mounted) {
          setError(err as Error);
          setIsLoading(false);
          
          // Try to load from cache on error
          const cachedCategories = await loadFromCache(orgId);
          if (cachedCategories) {
            setCategories(cachedCategories);
            setIsStale(true);
          }
        }
      }
    };

    initialize();

    return () => {
      mounted = false;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [orgId]);

  // Manual refresh function
  const refresh = useCallback(async () => {
    if (!orgId) return;

    try {
      setIsLoading(true);
      setError(null);

      // Clear cache to force refresh
      const cacheKey = getCacheKey(orgId);
      await AsyncStorage.removeItem(cacheKey);

      // Force re-subscription by updating orgId ref
      // The effect will handle the rest
      orgIdRef.current = null;
      setTimeout(() => {
        orgIdRef.current = orgId;
      }, 100);
    } catch (err) {
      console.error('[useCategories] Refresh error:', err);
      setError(err as Error);
    }
  }, [orgId]);

  return {
    categories,
    categoryTree,
    isLoading,
    error,
    isStale,
    lastSync,
    refresh
  };
}







