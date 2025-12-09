/**
 * Centralized Caching Service for TradeTrackr
 * Reduces Firestore reads by caching data in memory and IndexedDB
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  concernID?: string;
}

interface CacheConfig {
  ttl: number; // Time to live in milliseconds
  persistToIndexedDB?: boolean;
}

const DEFAULT_CONFIGS: Record<string, CacheConfig> = {
  // Short TTL for frequently changing data
  notifications: { ttl: 30000, persistToIndexedDB: false }, // 30 seconds
  tasks: { ttl: 60000, persistToIndexedDB: true }, // 1 minute
  
  // Medium TTL for moderately changing data
  projects: { ttl: 300000, persistToIndexedDB: true }, // 5 minutes
  reports: { ttl: 300000, persistToIndexedDB: true }, // 5 minutes
  personnel: { ttl: 300000, persistToIndexedDB: true }, // 5 minutes
  
  // Long TTL for rarely changing data
  materials: { ttl: 600000, persistToIndexedDB: true }, // 10 minutes
  categories: { ttl: 600000, persistToIndexedDB: true }, // 10 minutes
  clients: { ttl: 600000, persistToIndexedDB: true }, // 10 minutes
  users: { ttl: 600000, persistToIndexedDB: true }, // 10 minutes
  
  // Very long TTL for static data
  lookupOptions: { ttl: 3600000, persistToIndexedDB: true }, // 1 hour
  systemConfig: { ttl: 3600000, persistToIndexedDB: true }, // 1 hour
};

export class CacheService {
  private memoryCache: Map<string, CacheEntry<any>> = new Map();
  private dbName = 'TradeTrackrCache';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;

  constructor() {
    this.initIndexedDB();
  }

  private async initIndexedDB(): Promise<void> {
    if (typeof window === 'undefined' || !window.indexedDB) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains('cache')) {
          const store = db.createObjectStore('cache', { keyPath: 'key' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('concernID', 'concernID', { unique: false });
        }
      };
    });
  }

  private getCacheKey(type: string, concernID?: string, id?: string): string {
    const parts = [type];
    if (concernID) parts.push(concernID);
    if (id) parts.push(id);
    return parts.join(':');
  }

  private getConfig(type: string): CacheConfig {
    return DEFAULT_CONFIGS[type] || { ttl: 300000, persistToIndexedDB: true };
  }

  private isExpired(timestamp: number, ttl: number): boolean {
    return Date.now() - timestamp > ttl;
  }

  /**
   * Get data from cache (memory first, then IndexedDB)
   */
  async get<T>(type: string, concernID?: string, id?: string): Promise<T | null> {
    const key = this.getCacheKey(type, concernID, id);
    const config = this.getConfig(type);

    // Check memory cache first
    const memEntry = this.memoryCache.get(key);
    if (memEntry && !this.isExpired(memEntry.timestamp, config.ttl)) {
      console.log(`🎯 [Cache HIT - Memory] ${key}`);
      return memEntry.data as T;
    }

    // Check IndexedDB if enabled
    if (config.persistToIndexedDB && this.db) {
      try {
        const dbEntry = await this.getFromIndexedDB(key);
        if (dbEntry && !this.isExpired(dbEntry.timestamp, config.ttl)) {
          console.log(`🎯 [Cache HIT - IndexedDB] ${key}`);
          // Restore to memory cache
          this.memoryCache.set(key, dbEntry);
          return dbEntry.data as T;
        }
      } catch (error) {
        console.warn(`Cache IndexedDB read error for ${key}:`, error);
      }
    }

    console.log(`❌ [Cache MISS] ${key}`);
    return null;
  }

  /**
   * Set data in cache (memory and optionally IndexedDB)
   */
  async set<T>(type: string, data: T, concernID?: string, id?: string): Promise<void> {
    const key = this.getCacheKey(type, concernID, id);
    const config = this.getConfig(type);
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      concernID,
    };

    // Always set in memory
    this.memoryCache.set(key, entry);
    console.log(`💾 [Cache SET - Memory] ${key}`);

    // Optionally persist to IndexedDB
    if (config.persistToIndexedDB && this.db) {
      try {
        await this.setInIndexedDB(key, entry);
        console.log(`💾 [Cache SET - IndexedDB] ${key}`);
      } catch (error) {
        console.warn(`Cache IndexedDB write error for ${key}:`, error);
      }
    }
  }

  /**
   * Invalidate cache for a specific type/concernID/id
   */
  async invalidate(type: string, concernID?: string, id?: string): Promise<void> {
    const key = this.getCacheKey(type, concernID, id);
    
    // Remove from memory
    this.memoryCache.delete(key);
    console.log(`🗑️ [Cache INVALIDATE] ${key}`);

    // Remove from IndexedDB
    if (this.db) {
      try {
        await this.deleteFromIndexedDB(key);
      } catch (error) {
        console.warn(`Cache IndexedDB delete error for ${key}:`, error);
      }
    }
  }

  /**
   * Invalidate all cache entries for a concern
   */
  async invalidateConcern(concernID: string): Promise<void> {
    // Clear memory cache
    const keysToDelete: string[] = [];
    this.memoryCache.forEach((entry, key) => {
      if (entry.concernID === concernID) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => this.memoryCache.delete(key));

    // Clear IndexedDB
    if (this.db) {
      try {
        const transaction = this.db.transaction(['cache'], 'readwrite');
        const store = transaction.objectStore('cache');
        const index = store.index('concernID');
        const request = index.openCursor(IDBKeyRange.only(concernID));

        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor) {
            cursor.delete();
            cursor.continue();
          }
        };
      } catch (error) {
        console.warn('Cache IndexedDB clear error:', error);
      }
    }

    console.log(`🗑️ [Cache INVALIDATE CONCERN] ${concernID} (${keysToDelete.length} entries)`);
  }

  /**
   * Clear all cache
   */
  async clearAll(): Promise<void> {
    this.memoryCache.clear();
    
    if (this.db) {
      try {
        const transaction = this.db.transaction(['cache'], 'readwrite');
        const store = transaction.objectStore('cache');
        store.clear();
      } catch (error) {
        console.warn('Cache IndexedDB clear error:', error);
      }
    }

    console.log('🗑️ [Cache CLEAR ALL]');
  }

  /**
   * Get cache statistics
   */
  getStats(): { memoryEntries: number; ttlConfig: typeof DEFAULT_CONFIGS } {
    return {
      memoryEntries: this.memoryCache.size,
      ttlConfig: DEFAULT_CONFIGS,
    };
  }

  // IndexedDB helpers
  private getFromIndexedDB(key: string): Promise<CacheEntry<any> | null> {
    if (!this.db) return Promise.resolve(null);

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cache'], 'readonly');
      const store = transaction.objectStore('cache');
      const request = store.get(key);

      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? { data: result.data, timestamp: result.timestamp, concernID: result.concernID } : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  private setInIndexedDB(key: string, entry: CacheEntry<any>): Promise<void> {
    if (!this.db) return Promise.resolve();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      const request = store.put({ key, ...entry });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private deleteFromIndexedDB(key: string): Promise<void> {
    if (!this.db) return Promise.resolve();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

// Singleton instance
export const cacheService = new CacheService();













