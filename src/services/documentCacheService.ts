/**
 * Document Cache Service
 * Caches Firestore document queries to reduce database reads
 * Uses memory + IndexedDB for persistent caching
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface DocumentCacheDB extends DBSchema {
  'document-cache': {
    key: string;
    value: {
      key: string;
      data: any[];
      timestamp: number;
      filters: any;
    };
  };
}

class DocumentCacheService {
  private memoryCache: Map<string, { data: any[]; timestamp: number; filters: any }> = new Map();
  private db: IDBPDatabase<DocumentCacheDB> | null = null;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  async init() {
    if (this.db) return;
    
    try {
      this.db = await openDB<DocumentCacheDB>('tradetrackr-documents', 1, {
        upgrade(db) {
          if (!db.objectStoreNames.contains('document-cache')) {
            db.createObjectStore('document-cache');
          }
        },
      });
    } catch (error) {
      console.error('[DocumentCache] Failed to init IndexedDB:', error);
    }
  }

  /**
   * Generate cache key from filters
   */
  private getCacheKey(concernId: string, filters: any): string {
    const filterKeys = [
      concernId,
      filters.projectId || 'all',
      filters.projectType || 'all',
      filters.documentType || 'all',
      filters.dateFrom || 'all',
      filters.dateTo || 'all',
      filters.category || 'all',
      filters.status || 'all'
    ];
    return filterKeys.join(':');
  }

  /**
   * Check if cached data is still valid
   */
  private isValid(timestamp: number): boolean {
    return Date.now() - timestamp < this.CACHE_TTL;
  }

  /**
   * Get cached documents
   */
  async get(concernId: string, filters: any): Promise<any[] | null> {
    const key = this.getCacheKey(concernId, filters);

    // Try memory cache first
    const memCached = this.memoryCache.get(key);
    if (memCached && this.isValid(memCached.timestamp)) {
      console.log('📦 [DocumentCache HIT - Memory]', key);
      return memCached.data;
    }

    // Try IndexedDB
    if (!this.db) await this.init();
    if (this.db) {
      try {
        const cached = await this.db.get('document-cache', key);
        if (cached && this.isValid(cached.timestamp)) {
          console.log('📦 [DocumentCache HIT - IndexedDB]', key);
          // Restore to memory cache
          this.memoryCache.set(key, cached);
          return cached.data;
        }
      } catch (error) {
        console.error('[DocumentCache] IndexedDB read error:', error);
      }
    }

    console.log('❌ [DocumentCache MISS]', key);
    return null;
  }

  /**
   * Store documents in cache
   */
  async set(concernId: string, filters: any, data: any[]): Promise<void> {
    const key = this.getCacheKey(concernId, filters);
    const entry = {
      key,
      data,
      timestamp: Date.now(),
      filters
    };

    // Store in memory
    this.memoryCache.set(key, entry);
    console.log('💾 [DocumentCache SET - Memory]', key, `${data.length} docs`);

    // Store in IndexedDB
    if (!this.db) await this.init();
    if (this.db) {
      try {
        await this.db.put('document-cache', entry, key);
        console.log('💾 [DocumentCache SET - IndexedDB]', key);
      } catch (error) {
        console.error('[DocumentCache] IndexedDB write error:', error);
      }
    }
  }

  /**
   * Invalidate cache for specific filters or all
   */
  async invalidate(concernId?: string, filters?: any): Promise<void> {
    if (concernId && filters) {
      const key = this.getCacheKey(concernId, filters);
      this.memoryCache.delete(key);
      
      if (this.db) {
        try {
          await this.db.delete('document-cache', key);
          console.log('🗑️ [DocumentCache INVALIDATE]', key);
        } catch (error) {
          console.error('[DocumentCache] IndexedDB delete error:', error);
        }
      }
    } else {
      // Clear all cache
      this.memoryCache.clear();
      if (this.db) {
        try {
          await this.db.clear('document-cache');
          console.log('🗑️ [DocumentCache CLEAR ALL]');
        } catch (error) {
          console.error('[DocumentCache] IndexedDB clear error:', error);
        }
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): { memoryCacheSize: number; ttl: number } {
    return {
      memoryCacheSize: this.memoryCache.size,
      ttl: this.CACHE_TTL
    };
  }
}

// Singleton instance
export const documentCacheService = new DocumentCacheService();
export default documentCacheService;








