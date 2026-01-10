/**
 * Realtime Client Service
 *
 * Workstream F: Shim Removal Phase 1 & 2
 *
 * Polling-based watch abstraction to replace Firestore onSnapshot.
 * Polls the API at configurable intervals and calls callback on changes.
 * 
 * Phase F2 Enhancements:
 * - Pause-on-hidden: backs off to slower polling when tab is hidden
 * - Jitter: adds ±10% randomness to avoid thundering herd
 */

import { getDoc, queryDocs, QueryFilter, QueryOptions, Doc } from './dataClient';

// ============================================================================
// Types
// ============================================================================

export interface WatchOptions {
  /** Polling interval in milliseconds (default: 5000) */
  intervalMs?: number;
  /** Polling interval when tab is hidden (default: 30000) */
  hiddenIntervalMs?: number;
  /** Enable debug logging */
  debug?: boolean;
  /** Disable jitter (default: false, jitter is enabled) */
  noJitter?: boolean;
}

export type WatchCallback<T> = (data: T | null, error?: Error) => void;
export type WatchQueryCallback<T> = (data: Doc<T>[], error?: Error) => void;
export type UnsubscribeFn = () => void;

// ============================================================================
// Configuration
// ============================================================================

const DEFAULT_INTERVAL_MS = 5000;
const DEFAULT_HIDDEN_INTERVAL_MS = 30000;
const JITTER_FACTOR = 0.1; // ±10%

// ============================================================================
// Helpers
// ============================================================================

/**
 * Simple hash function for change detection
 * Uses a stable JSON stringify approach
 */
function stableHash(obj: unknown): string {
  const str = JSON.stringify(obj, (_, value) => {
    // Sort object keys for stability
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const sorted: Record<string, unknown> = {};
      for (const key of Object.keys(value).sort()) {
        sorted[key] = value[key];
      }
      return sorted;
    }
    return value;
  });
  
  // Simple hash (djb2)
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
  }
  return hash.toString(36);
}

/**
 * Add jitter to an interval to avoid thundering herd
 * Returns interval ± JITTER_FACTOR (e.g., 5000ms → 4500-5500ms)
 */
function addJitter(intervalMs: number): number {
  const jitter = intervalMs * JITTER_FACTOR;
  const offset = (Math.random() * 2 - 1) * jitter;
  return Math.round(intervalMs + offset);
}

/**
 * Check if document is hidden (tab in background)
 */
function isDocumentHidden(): boolean {
  if (typeof document === 'undefined') return false;
  return document.visibilityState === 'hidden';
}

// ============================================================================
// Watch Functions
// ============================================================================

/**
 * Watch a single document for changes
 *
 * @param collection - Collection name
 * @param docId - Document ID
 * @param callback - Called when document changes (or on error)
 * @param opts - Watch options
 * @returns Unsubscribe function
 *
 * @example
 * ```ts
 * const unsubscribe = watchDoc<Task>('tasks', taskId, (task, error) => {
 *   if (error) {
 *     console.error('Watch error:', error);
 *     return;
 *   }
 *   setTask(task);
 * });
 *
 * // Later: stop watching
 * unsubscribe();
 * ```
 */
export function watchDoc<T = Record<string, unknown>>(
  collection: string,
  docId: string,
  callback: WatchCallback<Doc<T>>,
  opts?: WatchOptions
): UnsubscribeFn {
  const baseIntervalMs = opts?.intervalMs ?? DEFAULT_INTERVAL_MS;
  const hiddenIntervalMs = opts?.hiddenIntervalMs ?? DEFAULT_HIDDEN_INTERVAL_MS;
  const debug = opts?.debug ?? false;
  const noJitter = opts?.noJitter ?? false;

  let lastHash: string | null = null;
  let isActive = true;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const log = (...args: unknown[]) => {
    if (debug) {
      console.debug('[realtimeClient.watchDoc]', ...args);
    }
  };

  const getInterval = (): number => {
    const base = isDocumentHidden() ? hiddenIntervalMs : baseIntervalMs;
    return noJitter ? base : addJitter(base);
  };

  const poll = async () => {
    if (!isActive) return;

    try {
      const doc = await getDoc<T>(collection, docId);
      const hash = stableHash(doc);

      if (hash !== lastHash) {
        log(`Change detected for ${collection}/${docId}`);
        lastHash = hash;
        callback(doc);
      }
    } catch (error) {
      log(`Error polling ${collection}/${docId}:`, error);
      callback(null, error as Error);
    }

    // Schedule next poll with dynamic interval
    if (isActive) {
      timeoutId = setTimeout(poll, getInterval());
    }
  };

  // Handle visibility changes - reschedule with new interval
  const handleVisibilityChange = () => {
    if (!isActive) return;
    
    // Clear current timeout and reschedule
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(poll, getInterval());
    }
    
    log(`Visibility changed to ${document.visibilityState}, interval now ${isDocumentHidden() ? hiddenIntervalMs : baseIntervalMs}ms`);
  };

  // Listen for visibility changes
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', handleVisibilityChange);
  }

  // Initial fetch
  poll();
  log(`Started watching ${collection}/${docId} (interval: ${baseIntervalMs}ms, hidden: ${hiddenIntervalMs}ms)`);

  // Return unsubscribe function
  return () => {
    isActive = false;
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    }
    log(`Stopped watching ${collection}/${docId}`);
  };
}

/**
 * Watch a query for changes
 *
 * @param collection - Collection name
 * @param filters - Query filters
 * @param callback - Called when query results change (or on error)
 * @param opts - Watch options (plus query options like limit, orderBy)
 * @returns Unsubscribe function
 *
 * @example
 * ```ts
 * const unsubscribe = watchQuery<Task>(
 *   'tasks',
 *   [{ field: 'status', op: '==', value: 'pending' }],
 *   (tasks, error) => {
 *     if (error) {
 *       console.error('Watch error:', error);
 *       return;
 *     }
 *     setPendingTasks(tasks);
 *   },
 *   { intervalMs: 10000, limit: 50 }
 * );
 *
 * // Later: stop watching
 * unsubscribe();
 * ```
 */
export function watchQuery<T = Record<string, unknown>>(
  collection: string,
  filters: QueryFilter[],
  callback: WatchQueryCallback<T>,
  opts?: WatchOptions & QueryOptions
): UnsubscribeFn {
  const baseIntervalMs = opts?.intervalMs ?? DEFAULT_INTERVAL_MS;
  const hiddenIntervalMs = opts?.hiddenIntervalMs ?? DEFAULT_HIDDEN_INTERVAL_MS;
  const debug = opts?.debug ?? false;
  const noJitter = opts?.noJitter ?? false;
  const queryOpts: QueryOptions = {
    limit: opts?.limit,
    orderBy: opts?.orderBy,
    cursor: opts?.cursor,
  };

  let lastHash: string | null = null;
  let isActive = true;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const log = (...args: unknown[]) => {
    if (debug) {
      console.debug('[realtimeClient.watchQuery]', ...args);
    }
  };

  const getInterval = (): number => {
    const base = isDocumentHidden() ? hiddenIntervalMs : baseIntervalMs;
    return noJitter ? base : addJitter(base);
  };

  const poll = async () => {
    if (!isActive) return;

    try {
      const result = await queryDocs<T>(collection, filters, queryOpts);
      const hash = stableHash(result.items);

      if (hash !== lastHash) {
        log(`Change detected for query on ${collection}`);
        lastHash = hash;
        callback(result.items);
      }
    } catch (error) {
      log(`Error polling query on ${collection}:`, error);
      callback([], error as Error);
    }

    // Schedule next poll with dynamic interval
    if (isActive) {
      timeoutId = setTimeout(poll, getInterval());
    }
  };

  // Handle visibility changes - reschedule with new interval
  const handleVisibilityChange = () => {
    if (!isActive) return;
    
    // Clear current timeout and reschedule
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(poll, getInterval());
    }
    
    log(`Visibility changed to ${document.visibilityState}, interval now ${isDocumentHidden() ? hiddenIntervalMs : baseIntervalMs}ms`);
  };

  // Listen for visibility changes
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', handleVisibilityChange);
  }

  // Initial fetch
  poll();
  log(`Started watching query on ${collection} (interval: ${baseIntervalMs}ms, hidden: ${hiddenIntervalMs}ms)`);

  // Return unsubscribe function
  return () => {
    isActive = false;
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    }
    log(`Stopped watching query on ${collection}`);
  };
}

/**
 * Watch a collection (all documents) for changes
 * Convenience wrapper around watchQuery with no filters.
 *
 * @param collection - Collection name
 * @param callback - Called when collection changes
 * @param opts - Watch options
 * @returns Unsubscribe function
 */
export function watchCollection<T = Record<string, unknown>>(
  collection: string,
  callback: WatchQueryCallback<T>,
  opts?: WatchOptions & QueryOptions
): UnsubscribeFn {
  return watchQuery<T>(collection, [], callback, opts);
}

// ============================================================================
// Exports
// ============================================================================

export const realtimeClient = {
  watchDoc,
  watchQuery,
  watchCollection,
};

export default realtimeClient;
