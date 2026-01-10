/**
 * Data Client Service
 *
 * Workstream F: Shim Removal Phase 1
 *
 * A typed API-first client for doc_store operations.
 * Replaces direct Firebase/Firestore usage with TradeTrackr API calls.
 *
 * API Endpoints (from db-bridge.ts):
 * - POST /api/v1/db/getDoc
 * - POST /api/v1/db/getDocs
 * - POST /api/v1/db/setDoc
 * - POST /api/v1/db/addDoc
 * - POST /api/v1/db/updateDoc
 * - POST /api/v1/db/deleteDoc
 * - POST /api/v1/db/batch
 */

import { getAccessToken } from '@/lib/auth/oidc-client';

// ============================================================================
// Types
// ============================================================================

export interface Doc<T = Record<string, unknown>> {
  doc_id: string;
  collection: string;
  data: T;
  created_at?: string;
  updated_at?: string;
}

export type QueryOperator = '==' | '!=' | '>' | '>=' | '<' | '<=' | 'in' | 'array-contains';

export interface QueryFilter {
  field: string;
  op: QueryOperator;
  value: unknown;
}

export interface QueryOptions {
  limit?: number;
  cursor?: string;
  orderBy?: {
    field: string;
    dir: 'asc' | 'desc';
  };
}

export interface QueryResult<T> {
  items: Doc<T>[];
  nextCursor?: string;
}

export interface UpsertOptions {
  merge?: boolean;
}

export interface BatchOperation {
  type: 'set' | 'update' | 'delete';
  path: string;
  data?: Record<string, unknown>;
  options?: { merge?: boolean };
}

// ============================================================================
// Configuration
// ============================================================================

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
const DEFAULT_TIMEOUT_MS = 30000;

// ============================================================================
// Error Handling
// ============================================================================

export class DataClientError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status?: number
  ) {
    super(message);
    this.name = 'DataClientError';
  }
}

/**
 * Map HTTP/network errors to German user-friendly messages
 */
function mapErrorToGerman(error: unknown, status?: number): DataClientError {
  if (error instanceof DataClientError) {
    return error;
  }

  const err = error as Error;
  const message = err?.message || '';

  // Network errors
  if (message.includes('fetch') || message.includes('network') || message.includes('Network')) {
    return new DataClientError('Netzwerkfehler. Bitte überprüfen Sie Ihre Internetverbindung.', 'NETWORK_ERROR');
  }

  // Timeout
  if (message.includes('timeout') || message.includes('aborted')) {
    return new DataClientError('Zeitüberschreitung. Bitte erneut versuchen.', 'TIMEOUT');
  }

  // HTTP status codes
  if (status === 401) {
    return new DataClientError('Authentifizierung fehlgeschlagen. Bitte erneut anmelden.', 'UNAUTHORIZED', 401);
  }
  if (status === 403) {
    return new DataClientError('Zugriff verweigert.', 'FORBIDDEN', 403);
  }
  if (status === 404) {
    return new DataClientError('Dokument nicht gefunden.', 'NOT_FOUND', 404);
  }
  if (status && status >= 500) {
    return new DataClientError('Serverfehler. Bitte später erneut versuchen.', 'SERVER_ERROR', status);
  }

  // Default
  return new DataClientError(
    message || 'Ein unbekannter Fehler ist aufgetreten.',
    'UNKNOWN_ERROR',
    status
  );
}

// ============================================================================
// Internal Helpers
// ============================================================================

interface ApiResponse<T> {
  data?: T;
  error?: string;
}

async function apiRequest<T>(
  endpoint: string,
  body: Record<string, unknown>,
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<T> {
  const token = await getAccessToken();

  if (!token) {
    throw new DataClientError(
      'Keine Authentifizierung. Bitte melden Sie sich erneut an.',
      'NO_AUTH'
    );
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${API_BASE}/api/v1/db${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorMessage: string | undefined;
      try {
        const errorBody = await response.json();
        errorMessage = errorBody.error;
      } catch {
        // Ignore JSON parse errors
      }

      if (errorMessage) {
        throw new DataClientError(errorMessage, 'API_ERROR', response.status);
      }

      throw mapErrorToGerman(new Error(`HTTP ${response.status}`), response.status);
    }

    return response.json();
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof DataClientError) {
      throw error;
    }

    throw mapErrorToGerman(error);
  }
}

/**
 * Build a document path from collection and docId
 */
function buildPath(collection: string, docId?: string): string {
  if (docId) {
    return `${collection}/${docId}`;
  }
  return collection;
}

/**
 * Convert API constraint format to our filter format
 */
function filtersToConstraints(filters?: QueryFilter[]): Array<{ type: 'where'; field: string; operator: string; value: unknown }> {
  if (!filters || filters.length === 0) {
    return [];
  }

  return filters.map((f) => ({
    type: 'where' as const,
    field: f.field,
    operator: f.op,
    value: f.value,
  }));
}

/**
 * Convert timestamp objects to ISO strings for API consumption
 */
function serializeTimestamps(data: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined) {
      result[key] = value;
    } else if (typeof value === 'object' && !Array.isArray(value)) {
      const obj = value as Record<string, unknown>;
      // Check for Firestore-like timestamp
      if ('seconds' in obj && 'nanoseconds' in obj) {
        const seconds = obj.seconds as number;
        const nanoseconds = obj.nanoseconds as number;
        result[key] = new Date(seconds * 1000 + nanoseconds / 1000000).toISOString();
      } else if (value instanceof Date) {
        result[key] = value.toISOString();
      } else {
        // Recursively serialize nested objects
        result[key] = serializeTimestamps(obj);
      }
    } else if (Array.isArray(value)) {
      result[key] = value.map((item) =>
        typeof item === 'object' && item !== null
          ? serializeTimestamps(item as Record<string, unknown>)
          : item
      );
    } else {
      result[key] = value;
    }
  }

  return result;
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Get a single document by collection and ID
 *
 * @param collection - Collection name (e.g., 'tasks', 'suppliers')
 * @param docId - Document ID
 * @returns Document with data, or null if not found
 */
export async function getDoc<T = Record<string, unknown>>(
  collection: string,
  docId: string
): Promise<Doc<T> | null> {
  const path = buildPath(collection, docId);

  const response = await apiRequest<{ exists: boolean; data?: T }>('/getDoc', { path });

  if (!response.exists || !response.data) {
    return null;
  }

  return {
    doc_id: docId,
    collection,
    data: response.data,
  };
}

/**
 * Create or update a document
 *
 * @param collection - Collection name
 * @param docId - Document ID
 * @param data - Document data
 * @param opts - Options (merge: true to merge with existing data)
 * @returns The updated document
 */
export async function upsertDoc<T = Record<string, unknown>>(
  collection: string,
  docId: string,
  data: Partial<T>,
  opts?: UpsertOptions
): Promise<Doc<T>> {
  const path = buildPath(collection, docId);
  const serializedData = serializeTimestamps(data as Record<string, unknown>);

  await apiRequest<{ success: boolean }>('/setDoc', {
    path,
    data: serializedData,
    merge: opts?.merge ?? false,
  });

  // Fetch the updated document
  const updated = await getDoc<T>(collection, docId);

  if (!updated) {
    // This shouldn't happen, but return a minimal doc
    return {
      doc_id: docId,
      collection,
      data: data as T,
    };
  }

  return updated;
}

/**
 * Add a new document with auto-generated ID
 *
 * @param collection - Collection name
 * @param data - Document data
 * @returns The created document with its generated ID
 */
export async function addDoc<T = Record<string, unknown>>(
  collection: string,
  data: T
): Promise<Doc<T>> {
  const serializedData = serializeTimestamps(data as Record<string, unknown>);

  const response = await apiRequest<{ success: boolean; id: string; path: string }>(
    '/addDoc',
    {
      path: collection,
      data: serializedData,
    }
  );

  return {
    doc_id: response.id,
    collection,
    data,
  };
}

/**
 * Update specific fields in an existing document
 *
 * @param collection - Collection name
 * @param docId - Document ID
 * @param data - Fields to update
 */
export async function updateDoc<T = Record<string, unknown>>(
  collection: string,
  docId: string,
  data: Partial<T>
): Promise<void> {
  const path = buildPath(collection, docId);
  const serializedData = serializeTimestamps(data as Record<string, unknown>);

  await apiRequest<{ success: boolean }>('/updateDoc', {
    path,
    data: serializedData,
  });
}

/**
 * Delete a document
 *
 * @param collection - Collection name
 * @param docId - Document ID
 */
export async function deleteDoc(collection: string, docId: string): Promise<void> {
  const path = buildPath(collection, docId);

  await apiRequest<{ success: boolean }>('/deleteDoc', { path });
}

/**
 * Query documents with filters
 *
 * @param collection - Collection name
 * @param filters - Optional query filters
 * @param opts - Query options (limit, orderBy, cursor)
 * @returns Query result with items and optional cursor
 */
export async function queryDocs<T = Record<string, unknown>>(
  collection: string,
  filters?: QueryFilter[],
  opts?: QueryOptions
): Promise<QueryResult<T>> {
  const constraints: Array<{ type: string; field?: string; operator?: string; value?: unknown; direction?: string }> = 
    filtersToConstraints(filters);

  // Add orderBy constraint
  if (opts?.orderBy) {
    constraints.push({
      type: 'orderBy',
      field: opts.orderBy.field,
      direction: opts.orderBy.dir,
    });
  }

  // Add limit constraint
  if (opts?.limit) {
    constraints.push({
      type: 'limit',
      value: opts.limit,
    });
  }

  const response = await apiRequest<{ docs: Array<{ id: string; data: T }> }>(
    '/getDocs',
    {
      path: collection,
      constraints,
    }
  );

  const items: Doc<T>[] = (response.docs || []).map((doc) => ({
    doc_id: doc.id,
    collection,
    data: doc.data,
  }));

  return {
    items,
    // Note: cursor pagination not yet implemented in db-bridge
    nextCursor: undefined,
  };
}

/**
 * List all documents in a collection (convenience wrapper around queryDocs)
 *
 * @param collection - Collection name
 * @param opts - Query options (limit, orderBy, cursor)
 * @returns Query result with items
 */
export async function listDocs<T = Record<string, unknown>>(
  collection: string,
  opts?: QueryOptions
): Promise<QueryResult<T>> {
  return queryDocs<T>(collection, undefined, opts);
}

/**
 * Execute a batch of write operations atomically
 *
 * @param operations - Array of batch operations
 */
export async function batchWrite(operations: BatchOperation[]): Promise<void> {
  await apiRequest<{ success: boolean; count: number }>('/batch', { operations });
}

// ============================================================================
// Field Value Helpers (matching Firestore API)
// ============================================================================

/**
 * Returns a marker that will be replaced with the server timestamp
 */
export function serverTimestamp(): { __fieldValue: 'serverTimestamp' } {
  return { __fieldValue: 'serverTimestamp' };
}

/**
 * Returns a marker for incrementing a numeric field
 */
export function increment(value: number): { __fieldValue: 'increment'; __value: number } {
  return { __fieldValue: 'increment', __value: value };
}

/**
 * Returns a marker for adding elements to an array field
 */
export function arrayUnion<T>(...elements: T[]): { __fieldValue: 'arrayUnion'; __value: T[] } {
  return { __fieldValue: 'arrayUnion', __value: elements };
}

/**
 * Returns a marker for removing elements from an array field
 */
export function arrayRemove<T>(...elements: T[]): { __fieldValue: 'arrayRemove'; __value: T[] } {
  return { __fieldValue: 'arrayRemove', __value: elements };
}

/**
 * Returns a marker for deleting a field
 */
export function deleteField(): { __fieldValue: 'delete' } {
  return { __fieldValue: 'delete' };
}

// ============================================================================
// Exports
// ============================================================================

export const dataClient = {
  getDoc,
  upsertDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  queryDocs,
  listDocs,
  batchWrite,
  serverTimestamp,
  increment,
  arrayUnion,
  arrayRemove,
  deleteField,
};

export default dataClient;

