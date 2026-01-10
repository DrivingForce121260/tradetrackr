/**
 * Firestore Shim
 * 
 * Workstream B2: Firebase removal
 * 
 * This shim replaces firebase/firestore imports and routes
 * all Firestore operations to /api/v1/db/*
 * 
 * The API backend stores documents in PostgreSQL doc_store table.
 * 
 * API Endpoints (POST only):
 * - POST /api/v1/db/getDoc    { path }
 * - POST /api/v1/db/getDocs   { path, constraints }
 * - POST /api/v1/db/setDoc    { path, data, merge }
 * - POST /api/v1/db/addDoc    { path, data }
 * - POST /api/v1/db/updateDoc { path, data }
 * - POST /api/v1/db/deleteDoc { path }
 * - POST /api/v1/db/batch     { operations }
 */

import { getAccessToken } from '@/lib/auth/oidc-client';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

// ============================================================================
// Types
// ============================================================================

export interface Firestore {
  app: any;
  type: 'firestore';
}

export interface DocumentReference<T = DocumentData> {
  id: string;
  path: string;
  parent: CollectionReference<T>;
  firestore: Firestore;
}

export interface CollectionReference<T = DocumentData> {
  id: string;
  path: string;
  parent: DocumentReference | null;
  firestore: Firestore;
}

export interface DocumentData {
  [field: string]: any;
}

export interface DocumentSnapshot<T = DocumentData> {
  id: string;
  ref: DocumentReference<T>;
  exists(): boolean;
  data(): T | undefined;
  get(field: string): any;
}

export interface QueryDocumentSnapshot<T = DocumentData> extends DocumentSnapshot<T> {
  data(): T;
}

export interface QuerySnapshot<T = DocumentData> {
  docs: QueryDocumentSnapshot<T>[];
  size: number;
  empty: boolean;
  forEach(callback: (doc: QueryDocumentSnapshot<T>) => void): void;
}

export interface Query<T = DocumentData> {
  firestore: Firestore;
  _collectionPath: string;
  _constraints: QueryConstraint[];
}

export interface QueryConstraint {
  type: string;
  field?: string;
  op?: string;
  value?: any;
  limit?: number;
  direction?: 'asc' | 'desc';
}

export interface WriteBatch {
  _operations: BatchOperation[];
  set(ref: DocumentReference, data: any, options?: SetOptions): WriteBatch;
  update(ref: DocumentReference, data: any): WriteBatch;
  delete(ref: DocumentReference): WriteBatch;
  commit(): Promise<void>;
}

interface BatchOperation {
  type: 'set' | 'update' | 'delete';
  path: string;
  data?: any;
  options?: SetOptions;
}

export interface SetOptions {
  merge?: boolean;
  mergeFields?: string[];
}

export interface Unsubscribe {
  (): void;
}

export interface Transaction {
  get<T>(ref: DocumentReference<T>): Promise<DocumentSnapshot<T>>;
  set(ref: DocumentReference, data: any, options?: SetOptions): Transaction;
  update(ref: DocumentReference, data: any): Transaction;
  delete(ref: DocumentReference): Transaction;
  _writes: Array<{ type: string; ref: DocumentReference; data?: any; options?: SetOptions }>;
}

// ============================================================================
// Shim Firestore Instance
// ============================================================================

const shimFirestore: Firestore = {
  app: { name: '[SHIM]' },
  type: 'firestore',
};

// ============================================================================
// API Helpers
// ============================================================================

async function apiCall(endpoint: string, body: any): Promise<any> {
  const token = await getAccessToken();
  
  const response = await fetch(`${API_BASE}/api/v1/db${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message || error.error || `API call failed: ${response.status}`);
  }

  return response.json();
}

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Get Firestore instance
 */
export function getFirestore(_app?: any): Firestore {
  return shimFirestore;
}

/**
 * Initialize Firestore (no-op in shim)
 */
export function initializeFirestore(_app: any, _settings?: any): Firestore {
  return shimFirestore;
}

/**
 * Persistent local cache configuration (no-op in shim)
 */
export function persistentLocalCache(_settings?: any): any {
  return { kind: 'persistentLocalCache' };
}

/**
 * Persistent multiple tab manager (no-op in shim)
 */
export function persistentMultipleTabManager(): any {
  return { kind: 'persistentMultipleTabManager' };
}

/**
 * Memory local cache (no-op in shim)
 */
export function memoryLocalCache(): any {
  return { kind: 'memoryLocalCache' };
}

/**
 * Get a collection reference
 */
export function collection(firestore: Firestore, path: string, ...pathSegments: string[]): CollectionReference {
  const fullPath = [path, ...pathSegments].join('/');
  return {
    id: fullPath.split('/').pop() || fullPath,
    path: fullPath,
    parent: null,
    firestore,
  };
}

/**
 * Get a collection group reference (queries across all collections with the same ID)
 */
export function collectionGroup(firestore: Firestore, collectionId: string): Query {
  return {
    firestore,
    _collectionPath: collectionId,
    _constraints: [{ type: 'collectionGroup', value: collectionId }],
  };
}

/**
 * Get a document reference
 */
export function doc(firestore: Firestore | CollectionReference, path?: string, ...pathSegments: string[]): DocumentReference {
  let fullPath: string;
  let fs: Firestore;

  if ('type' in firestore && firestore.type === 'firestore') {
    // Called as doc(firestore, 'collection/docId')
    fs = firestore;
    fullPath = path ? [path, ...pathSegments].join('/') : '';
  } else {
    // Called as doc(collectionRef, 'docId')
    const collRef = firestore as CollectionReference;
    fs = collRef.firestore;
    fullPath = path ? `${collRef.path}/${[path, ...pathSegments].join('/')}` : collRef.path;
  }

  const parts = fullPath.split('/');
  return {
    id: parts[parts.length - 1],
    path: fullPath,
    parent: {
      id: parts[parts.length - 2] || '',
      path: parts.slice(0, -1).join('/'),
      parent: null,
      firestore: fs,
    },
    firestore: fs,
  };
}

// ============================================================================
// Read Operations
// ============================================================================

/**
 * Get a single document
 */
export async function getDoc<T = DocumentData>(reference: DocumentReference<T>): Promise<DocumentSnapshot<T>> {
  try {
    const result = await apiCall('/getDoc', { path: reference.path });
    
    return {
      id: reference.id,
      ref: reference,
      exists: () => result.exists !== false && result.data !== undefined,
      data: () => result.data,
      get: (field: string) => result.data?.[field],
    };
  } catch (error) {
    // Return non-existent document on error
    console.debug('[Firestore Shim] getDoc error:', error);
    return {
      id: reference.id,
      ref: reference,
      exists: () => false,
      data: () => undefined,
      get: () => undefined,
    };
  }
}

/**
 * Get multiple documents (query)
 */
export async function getDocs<T = DocumentData>(queryOrRef: Query<T> | CollectionReference<T>): Promise<QuerySnapshot<T>> {
  const collPath = '_collectionPath' in queryOrRef ? queryOrRef._collectionPath : queryOrRef.path;
  const constraints = '_constraints' in queryOrRef ? queryOrRef._constraints : [];
  
  // Convert constraints to API format
  const apiConstraints: Array<{
    type: string;
    field?: string;
    operator?: string;
    value?: any;
    direction?: string;
  }> = [];
  
  for (const constraint of constraints) {
    if (constraint.type === 'where' && constraint.field && constraint.op !== undefined) {
      apiConstraints.push({
        type: 'where',
        field: constraint.field,
        operator: constraint.op,
        value: constraint.value,
      });
    } else if (constraint.type === 'orderBy' && constraint.field) {
      apiConstraints.push({
        type: 'orderBy',
        field: constraint.field,
        direction: constraint.direction || 'asc',
      });
    } else if (constraint.type === 'limit' && constraint.limit) {
      apiConstraints.push({
        type: 'limit',
        value: constraint.limit,
      });
    }
  }
  
  try {
    const result = await apiCall('/getDocs', {
      path: collPath,
      constraints: apiConstraints,
    });
    
    const items = result.docs || result.items || [];
    
    const docs: QueryDocumentSnapshot<T>[] = items.map((item: any) => ({
      id: item.id,
      ref: doc(shimFirestore, `${collPath}/${item.id}`) as DocumentReference<T>,
      exists: () => true,
      data: () => item.data || item,
      get: (field: string) => (item.data || item)[field],
    }));
    
    return {
      docs,
      size: docs.length,
      empty: docs.length === 0,
      forEach: (callback) => docs.forEach(callback),
    };
  } catch (error) {
    console.error('[Firestore Shim] getDocs error:', error);
    return {
      docs: [],
      size: 0,
      empty: true,
      forEach: () => {},
    };
  }
}

// ============================================================================
// Write Operations
// ============================================================================

/**
 * Set a document (create or overwrite)
 */
export async function setDoc<T = DocumentData>(
  reference: DocumentReference<T>,
  data: T,
  options?: SetOptions
): Promise<void> {
  await apiCall('/setDoc', {
    path: reference.path,
    data: serializeData(data),
    merge: options?.merge ?? false,
  });
}

/**
 * Add a document (auto-generate ID)
 */
export async function addDoc<T = DocumentData>(
  reference: CollectionReference<T>,
  data: T
): Promise<DocumentReference<T>> {
  const result = await apiCall('/addDoc', {
    path: reference.path,
    data: serializeData(data),
  });
  
  return doc(shimFirestore, `${reference.path}/${result.id}`) as DocumentReference<T>;
}

/**
 * Update a document (partial update)
 */
export async function updateDoc<T = DocumentData>(
  reference: DocumentReference<T>,
  data: Partial<T>
): Promise<void> {
  await apiCall('/updateDoc', {
    path: reference.path,
    data: serializeData(data),
  });
}

/**
 * Delete a document
 */
export async function deleteDoc(reference: DocumentReference): Promise<void> {
  await apiCall('/deleteDoc', { path: reference.path });
}

// ============================================================================
// Batch Operations
// ============================================================================

/**
 * Create a write batch
 */
export function writeBatch(_firestore: Firestore): WriteBatch {
  const batch: WriteBatch = {
    _operations: [],
    set(ref, data, options) {
      this._operations.push({ 
        type: 'set', 
        path: ref.path, 
        data: serializeData(data), 
        options 
      });
      return this;
    },
    update(ref, data) {
      this._operations.push({ 
        type: 'update', 
        path: ref.path, 
        data: serializeData(data) 
      });
      return this;
    },
    delete(ref) {
      this._operations.push({ type: 'delete', path: ref.path });
      return this;
    },
    async commit() {
      await apiCall('/batch', { operations: this._operations });
    },
  };
  return batch;
}

/**
 * Run a transaction
 */
export async function runTransaction<T>(
  _firestore: Firestore,
  updateFunction: (transaction: Transaction) => Promise<T>
): Promise<T> {
  // Create a simple transaction object
  // Note: This is a simplified implementation - real transactions would need server support
  const transaction: Transaction = {
    get: async (ref: DocumentReference) => {
      return getDoc(ref);
    },
    set: (ref: DocumentReference, data: any, options?: SetOptions) => {
      transaction._writes.push({ type: 'set', ref, data, options });
      return transaction;
    },
    update: (ref: DocumentReference, data: any) => {
      transaction._writes.push({ type: 'update', ref, data });
      return transaction;
    },
    delete: (ref: DocumentReference) => {
      transaction._writes.push({ type: 'delete', ref });
      return transaction;
    },
    _writes: [],
  };

  const result = await updateFunction(transaction);

  // Commit all writes
  for (const write of transaction._writes) {
    if (write.type === 'set') {
      await setDoc(write.ref, write.data, write.options);
    } else if (write.type === 'update') {
      await updateDoc(write.ref, write.data);
    } else if (write.type === 'delete') {
      await deleteDoc(write.ref);
    }
  }

  return result;
}

// ============================================================================
// Query Builders
// ============================================================================

/**
 * Create a query
 */
export function query<T = DocumentData>(
  reference: CollectionReference<T> | Query<T>,
  ...queryConstraints: QueryConstraint[]
): Query<T> {
  const existingConstraints = '_constraints' in reference ? reference._constraints : [];
  const collPath = '_collectionPath' in reference ? reference._collectionPath : reference.path;
  
  return {
    firestore: shimFirestore,
    _collectionPath: collPath,
    _constraints: [...existingConstraints, ...queryConstraints],
  };
}

/**
 * Where clause
 */
export function where(field: string, op: string, value: any): QueryConstraint {
  return { type: 'where', field, op, value };
}

/**
 * Order by clause
 */
export function orderBy(field: string, direction: 'asc' | 'desc' = 'asc'): QueryConstraint {
  return { type: 'orderBy', field, direction };
}

/**
 * Limit clause
 */
export function limit(count: number): QueryConstraint {
  return { type: 'limit', limit: count };
}

/**
 * Start at clause (simplified - not fully supported)
 */
export function startAt(...fieldValues: any[]): QueryConstraint {
  return { type: 'startAt', value: fieldValues };
}

/**
 * Start after clause (simplified - not fully supported)
 */
export function startAfter(...fieldValues: any[]): QueryConstraint {
  return { type: 'startAfter', value: fieldValues };
}

/**
 * End at clause (simplified - not fully supported)
 */
export function endAt(...fieldValues: any[]): QueryConstraint {
  return { type: 'endAt', value: fieldValues };
}

/**
 * End before clause (simplified - not fully supported)
 */
export function endBefore(...fieldValues: any[]): QueryConstraint {
  return { type: 'endBefore', value: fieldValues };
}

// ============================================================================
// Real-time Updates (Polling-based)
// ============================================================================

const POLL_INTERVAL_MS = 5000;

/**
 * Subscribe to document changes (polling-based)
 */
export function onSnapshot<T = DocumentData>(
  reference: DocumentReference<T> | Query<T> | CollectionReference<T>,
  observerOrNext: ((snapshot: DocumentSnapshot<T> | QuerySnapshot<T>) => void) | { next: (snapshot: any) => void; error?: (error: Error) => void },
  onError?: (error: Error) => void,
  onCompletion?: () => void
): Unsubscribe {
  const callback = typeof observerOrNext === 'function' 
    ? observerOrNext 
    : observerOrNext.next;
  const errorHandler = typeof observerOrNext === 'function'
    ? onError
    : observerOrNext.error;

  let lastHash: string | null = null;
  let isActive = true;

  const poll = async () => {
    if (!isActive) return;

    try {
      if ('id' in reference && !('_collectionPath' in reference) && reference.path.includes('/')) {
        // Document reference
        const docRef = reference as DocumentReference<T>;
        const snapshot = await getDoc(docRef);
        const hash = JSON.stringify(snapshot.data());
        
        if (hash !== lastHash) {
          lastHash = hash;
          callback(snapshot as any);
        }
      } else {
        // Query or collection reference
        const queryRef = reference as Query<T> | CollectionReference<T>;
        const snapshot = await getDocs(queryRef);
        const hash = JSON.stringify(snapshot.docs.map(d => d.data()));
        
        if (hash !== lastHash) {
          lastHash = hash;
          callback(snapshot as any);
        }
      }
    } catch (error) {
      if (errorHandler) {
        errorHandler(error as Error);
      }
    }
  };

  // Initial fetch
  poll();

  // Start polling
  const intervalId = setInterval(poll, POLL_INTERVAL_MS);

  // Return unsubscribe function
  return () => {
    isActive = false;
    clearInterval(intervalId);
    if (onCompletion) onCompletion();
  };
}

// ============================================================================
// Field Values
// ============================================================================

export class Timestamp {
  constructor(public seconds: number, public nanoseconds: number) {}
  
  toDate(): Date {
    return new Date(this.seconds * 1000 + this.nanoseconds / 1000000);
  }
  
  toMillis(): number {
    return this.seconds * 1000 + this.nanoseconds / 1000000;
  }
  
  static now(): Timestamp {
    const now = Date.now();
    return new Timestamp(Math.floor(now / 1000), (now % 1000) * 1000000);
  }
  
  static fromDate(date: Date): Timestamp {
    const ms = date.getTime();
    return new Timestamp(Math.floor(ms / 1000), (ms % 1000) * 1000000);
  }
  
  static fromMillis(ms: number): Timestamp {
    return new Timestamp(Math.floor(ms / 1000), (ms % 1000) * 1000000);
  }
}

/**
 * Server timestamp marker
 */
export function serverTimestamp(): { _methodName: string } {
  return { _methodName: 'serverTimestamp' };
}

/**
 * FieldValue class for special operations
 */
export class FieldValue {
  static serverTimestamp() {
    return { _methodName: 'serverTimestamp' };
  }
  
  static increment(n: number) {
    return { _methodName: 'increment', _value: n };
  }
  
  static arrayUnion(...elements: any[]) {
    return { _methodName: 'arrayUnion', _value: elements };
  }
  
  static arrayRemove(...elements: any[]) {
    return { _methodName: 'arrayRemove', _value: elements };
  }
  
  static delete() {
    return { _methodName: 'delete' };
  }
}

/**
 * Increment a numeric field
 */
export function increment(n: number): { _methodName: string; _value: number } {
  return { _methodName: 'increment', _value: n };
}

/**
 * Add elements to an array field
 */
export function arrayUnion(...elements: any[]): { _methodName: string; _value: any[] } {
  return { _methodName: 'arrayUnion', _value: elements };
}

/**
 * Remove elements from an array field
 */
export function arrayRemove(...elements: any[]): { _methodName: string; _value: any[] } {
  return { _methodName: 'arrayRemove', _value: elements };
}

/**
 * Delete a field
 */
export function deleteField(): { _methodName: string } {
  return { _methodName: 'delete' };
}

// ============================================================================
// Helper: Serialize data for API
// ============================================================================

function serializeData(data: any): any {
  if (data === null || data === undefined) {
    return data;
  }
  
  if (data instanceof Date) {
    return { _type: 'timestamp', seconds: Math.floor(data.getTime() / 1000), nanoseconds: 0 };
  }
  
  if (data instanceof Timestamp) {
    return { _type: 'timestamp', seconds: data.seconds, nanoseconds: data.nanoseconds };
  }
  
  if (data._methodName === 'serverTimestamp') {
    return { __fieldValue: 'serverTimestamp' };
  }
  
  if (data._methodName === 'increment') {
    return { __fieldValue: 'increment', __value: data._value };
  }
  
  if (data._methodName === 'arrayUnion') {
    return { __fieldValue: 'arrayUnion', __value: data._value };
  }
  
  if (data._methodName === 'arrayRemove') {
    return { __fieldValue: 'arrayRemove', __value: data._value };
  }
  
  if (data._methodName === 'delete') {
    return { __fieldValue: 'delete' };
  }
  
  if (Array.isArray(data)) {
    return data.map(serializeData);
  }
  
  if (typeof data === 'object') {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      result[key] = serializeData(value);
    }
    return result;
  }
  
  return data;
}

// ============================================================================
// Exports for compatibility
// ============================================================================

export { shimFirestore as db };
export default shimFirestore;
