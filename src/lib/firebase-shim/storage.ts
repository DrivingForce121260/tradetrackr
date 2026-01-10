/**
 * Firebase Storage Shim
 * 
 * Workstream B2: Firebase removal
 * 
 * This shim replaces firebase/storage imports and routes
 * storage operations to /api/v1/storage/*
 */

import { getAccessToken } from '@/lib/auth/oidc-client';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export interface StorageReference {
  bucket: string;
  fullPath: string;
  name: string;
  parent: StorageReference | null;
  root: StorageReference;
  storage: FirebaseStorage;
}

export interface FirebaseStorage {
  app: any;
  maxUploadRetryTime: number;
  maxOperationRetryTime: number;
}

export interface UploadResult {
  metadata: UploadMetadata;
  ref: StorageReference;
}

export interface UploadMetadata {
  bucket: string;
  fullPath: string;
  name: string;
  size: number;
  contentType: string;
  timeCreated: string;
  updated: string;
}

// Shim storage instance
const shimStorage: FirebaseStorage = {
  app: { name: '[SHIM]' },
  maxUploadRetryTime: 600000,
  maxOperationRetryTime: 120000,
};

/**
 * Get a Storage instance (no-op, returns shim)
 */
export function getStorage(_app?: any, _bucketUrl?: string): FirebaseStorage {
  return shimStorage;
}

/**
 * Create a reference to a storage location
 */
export function ref(storage: FirebaseStorage, path?: string): StorageReference {
  const fullPath = path || '';
  const name = fullPath.split('/').pop() || '';
  
  const reference: StorageReference = {
    bucket: 'tradetrackr-files',
    fullPath,
    name,
    parent: null,
    root: null as any,
    storage,
  };
  
  reference.root = reference;
  return reference;
}

export interface UploadTask {
  snapshot: UploadTaskSnapshot;
  on(
    event: 'state_changed',
    next?: (snapshot: UploadTaskSnapshot) => void,
    error?: (error: Error) => void,
    complete?: () => void
  ): () => void;
  then<T>(
    onFulfilled?: (snapshot: UploadTaskSnapshot) => T | PromiseLike<T>,
    onRejected?: (error: Error) => T | PromiseLike<T>
  ): Promise<T>;
  catch<T>(onRejected?: (error: Error) => T | PromiseLike<T>): Promise<T>;
  cancel(): boolean;
  pause(): boolean;
  resume(): boolean;
}

export interface UploadTaskSnapshot {
  bytesTransferred: number;
  totalBytes: number;
  state: 'running' | 'paused' | 'success' | 'canceled' | 'error';
  metadata: UploadMetadata;
  ref: StorageReference;
  task: UploadTask;
}

/**
 * Upload bytes to storage with resumable upload (simplified - wraps uploadBytes)
 */
export function uploadBytesResumable(
  reference: StorageReference,
  data: Blob | Uint8Array | ArrayBuffer,
  metadata?: any
): UploadTask {
  let resolvePromise: (snapshot: UploadTaskSnapshot) => void;
  let rejectPromise: (error: Error) => void;
  
  const promise = new Promise<UploadTaskSnapshot>((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });

  const snapshot: UploadTaskSnapshot = {
    bytesTransferred: 0,
    totalBytes: data instanceof Blob ? data.size : (data as ArrayBuffer).byteLength,
    state: 'running',
    metadata: {} as UploadMetadata,
    ref: reference,
    task: null as any,
  };

  const task: UploadTask = {
    snapshot,
    on(event, next, error, complete) {
      if (event === 'state_changed') {
        // Call progress immediately
        if (next) next(snapshot);
        
        // Execute upload
        uploadBytes(reference, data, metadata)
          .then((result) => {
            snapshot.bytesTransferred = snapshot.totalBytes;
            snapshot.state = 'success';
            snapshot.metadata = result.metadata;
            if (next) next(snapshot);
            if (complete) complete();
            resolvePromise(snapshot);
          })
          .catch((err) => {
            snapshot.state = 'error';
            if (error) error(err);
            rejectPromise(err);
          });
      }
      return () => {};
    },
    then(onFulfilled, onRejected) {
      return promise.then(onFulfilled, onRejected);
    },
    catch(onRejected) {
      return promise.catch(onRejected);
    },
    cancel() {
      snapshot.state = 'canceled';
      return true;
    },
    pause() {
      snapshot.state = 'paused';
      return true;
    },
    resume() {
      snapshot.state = 'running';
      return true;
    },
  };

  snapshot.task = task;
  
  // Auto-start if no listeners attached
  setTimeout(() => {
    if (snapshot.state === 'running' && snapshot.bytesTransferred === 0) {
      uploadBytes(reference, data, metadata)
        .then((result) => {
          snapshot.bytesTransferred = snapshot.totalBytes;
          snapshot.state = 'success';
          snapshot.metadata = result.metadata;
          resolvePromise(snapshot);
        })
        .catch((err) => {
          snapshot.state = 'error';
          rejectPromise(err);
        });
    }
  }, 0);

  return task;
}

/**
 * Upload bytes to storage
 */
export async function uploadBytes(
  reference: StorageReference,
  data: Blob | Uint8Array | ArrayBuffer,
  _metadata?: any
): Promise<UploadResult> {
  const token = await getAccessToken();
  
  // Convert data to base64
  let base64Data: string;
  if (data instanceof Blob) {
    base64Data = await blobToBase64(data);
  } else if (data instanceof ArrayBuffer) {
    base64Data = arrayBufferToBase64(data);
  } else {
    base64Data = arrayBufferToBase64(data.buffer);
  }
  
  const response = await fetch(`${API_BASE}/api/v1/storage/upload`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      path: reference.fullPath,
      data: base64Data,
      contentType: _metadata?.contentType || 'application/octet-stream',
    }),
  });

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.status}`);
  }

  const result = await response.json();
  
  return {
    metadata: {
      bucket: reference.bucket,
      fullPath: reference.fullPath,
      name: reference.name,
      size: result.size || 0,
      contentType: result.contentType || 'application/octet-stream',
      timeCreated: result.timeCreated || new Date().toISOString(),
      updated: result.updated || new Date().toISOString(),
    },
    ref: reference,
  };
}

/**
 * Upload a string to storage
 */
export async function uploadString(
  reference: StorageReference,
  value: string,
  format?: 'raw' | 'base64' | 'base64url' | 'data_url',
  _metadata?: any
): Promise<UploadResult> {
  let data: Uint8Array;
  
  if (format === 'base64' || format === 'base64url') {
    data = Uint8Array.from(atob(value), c => c.charCodeAt(0));
  } else if (format === 'data_url') {
    const base64 = value.split(',')[1];
    data = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
  } else {
    data = new TextEncoder().encode(value);
  }
  
  return uploadBytes(reference, data, _metadata);
}

/**
 * Get download URL for a file
 */
export async function getDownloadURL(reference: StorageReference): Promise<string> {
  const token = await getAccessToken();
  
  const response = await fetch(`${API_BASE}/api/v1/storage/url?path=${encodeURIComponent(reference.fullPath)}`, {
    headers: {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get download URL: ${response.status}`);
  }

  const result = await response.json();
  return result.url;
}

/**
 * Delete a file
 */
export async function deleteObject(reference: StorageReference): Promise<void> {
  const token = await getAccessToken();
  
  const response = await fetch(`${API_BASE}/api/v1/storage/delete`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ path: reference.fullPath }),
  });

  if (!response.ok) {
    throw new Error(`Delete failed: ${response.status}`);
  }
}

/**
 * Get metadata for a file
 */
export async function getMetadata(reference: StorageReference): Promise<UploadMetadata> {
  const token = await getAccessToken();
  
  const response = await fetch(`${API_BASE}/api/v1/storage/metadata?path=${encodeURIComponent(reference.fullPath)}`, {
    headers: {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get metadata: ${response.status}`);
  }

  return response.json();
}

/**
 * List files in a directory
 */
export async function listAll(reference: StorageReference): Promise<{ items: StorageReference[]; prefixes: StorageReference[] }> {
  const token = await getAccessToken();
  
  const response = await fetch(`${API_BASE}/api/v1/storage/list?path=${encodeURIComponent(reference.fullPath)}`, {
    headers: {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to list files: ${response.status}`);
  }

  const result = await response.json();
  
  return {
    items: (result.items || []).map((path: string) => ref(shimStorage, path)),
    prefixes: (result.prefixes || []).map((path: string) => ref(shimStorage, path)),
  };
}

/**
 * Connect to storage emulator (no-op in shim)
 */
export function connectStorageEmulator(
  _storage: FirebaseStorage,
  _host: string,
  _port: number
): void {
  console.debug('[Firebase Shim] connectStorageEmulator called - ignored');
}

// Helper functions
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export default shimStorage;

