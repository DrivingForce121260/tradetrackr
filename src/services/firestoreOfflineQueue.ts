// ============================================================================
// FIRESTORE OFFLINE QUEUE SERVICE
// ============================================================================
// Wraps Firestore operations to queue them when offline and sync when online

import { 
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
  Firestore,
  DocumentReference,
  CollectionReference
} from 'firebase/firestore';
import { db } from '@/config/firebase';

export type FirestoreOperationType = 'create' | 'update' | 'delete' | 'batch';

export interface QueuedFirestoreOperation {
  id: string;
  type: FirestoreOperationType;
  collection: string;
  docId?: string;
  data?: any;
  timestamp: number;
  retries: number;
  // For batch operations
  batchOperations?: Array<{
    type: 'create' | 'update' | 'delete';
    collection: string;
    docId?: string;
    data?: any;
  }>;
}

const QUEUE_STORAGE_KEY = 'tradetrackr-firestore-offline-queue';
const MAX_RETRIES = 3;

class FirestoreOfflineQueueService {
  private queue: QueuedFirestoreOperation[] = [];
  private isOnline: boolean = navigator.onLine;
  private syncInProgress: boolean = false;
  private listeners: Set<(queueLength: number) => void> = new Set();

  constructor() {
    this.loadQueue();
    this.setupOnlineListeners();
  }

  /**
   * Setup online/offline event listeners
   */
  private setupOnlineListeners(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.syncQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });

    // Check online status periodically (in case events don't fire)
    setInterval(() => {
      const wasOnline = this.isOnline;
      this.isOnline = navigator.onLine;
      
      if (!wasOnline && this.isOnline) {
        this.syncQueue();
      }
    }, 5000);
  }

  /**
   * Load queue from localStorage
   */
  private loadQueue(): void {
    try {
      const stored = localStorage.getItem(QUEUE_STORAGE_KEY);
      this.queue = stored ? JSON.parse(stored) : [];
      this.notifyListeners();
    } catch (error) {
      console.error('[FirestoreOfflineQueue] Failed to load queue:', error);
      this.queue = [];
    }
  }

  /**
   * Save queue to localStorage
   */
  private saveQueue(): void {
    try {
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(this.queue));
      this.notifyListeners();
    } catch (error) {
      console.error('[FirestoreOfflineQueue] Failed to save queue:', error);
    }
  }

  /**
   * Notify listeners about queue changes
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.queue.length));
  }

  /**
   * Subscribe to queue length changes
   */
  subscribe(listener: (queueLength: number) => void): () => void {
    this.listeners.add(listener);
    listener(this.queue.length); // Initial call
    
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Get current queue length
   */
  getQueueLength(): number {
    return this.queue.length;
  }

  /**
   * Check if currently online
   */
  getIsOnline(): boolean {
    return this.isOnline;
  }

  /**
   * Wrapper for addDoc - queues if offline
   */
  async addDoc<T>(
    collectionRef: CollectionReference<T>,
    data: any
  ): Promise<DocumentReference<T>> {
    if (this.isOnline) {
      try {
        // Try to execute immediately
        return await addDoc(collectionRef, {
          ...data,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      } catch (error: any) {
        // If error suggests offline, queue it
        if (this.isOfflineError(error)) {
          return this.queueAddDoc(collectionRef, data);
        }
        throw error;
      }
    } else {
      return this.queueAddDoc(collectionRef, data);
    }
  }

  /**
   * Queue an addDoc operation
   */
  private queueAddDoc<T>(
    collectionRef: CollectionReference<T>,
    data: any
  ): Promise<DocumentReference<T>> {
    const operation: QueuedFirestoreOperation = {
      id: `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'create',
      collection: collectionRef.id,
      data: {
        ...data,
        // Remove serverTimestamp() calls as they can't be serialized
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      timestamp: Date.now(),
      retries: 0
    };

    this.queue.push(operation);
    this.saveQueue();

    console.log('[FirestoreOfflineQueue] Queued create operation:', operation.collection);

    // Return a mock DocumentReference
    return Promise.resolve({
      id: operation.id,
      path: `${collectionRef.path}/${operation.id}`,
      parent: collectionRef,
      firestore: db as Firestore
    } as DocumentReference<T>);
  }

  /**
   * Wrapper for updateDoc - queues if offline
   */
  async updateDoc(
    docRef: DocumentReference,
    data: any
  ): Promise<void> {
    if (this.isOnline) {
      try {
        return await updateDoc(docRef, {
          ...data,
          updatedAt: serverTimestamp()
        });
      } catch (error: any) {
        if (this.isOfflineError(error)) {
          return this.queueUpdateDoc(docRef, data);
        }
        throw error;
      }
    } else {
      return this.queueUpdateDoc(docRef, data);
    }
  }

  /**
   * Queue an updateDoc operation
   */
  private queueUpdateDoc(
    docRef: DocumentReference,
    data: any
  ): Promise<void> {
    const operation: QueuedFirestoreOperation = {
      id: `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'update',
      collection: docRef.parent.id,
      docId: docRef.id,
      data: {
        ...data,
        updatedAt: new Date().toISOString()
      },
      timestamp: Date.now(),
      retries: 0
    };

    this.queue.push(operation);
    this.saveQueue();

    console.log('[FirestoreOfflineQueue] Queued update operation:', operation.collection, operation.docId);

    return Promise.resolve();
  }

  /**
   * Wrapper for deleteDoc - queues if offline
   */
  async deleteDoc(docRef: DocumentReference): Promise<void> {
    if (this.isOnline) {
      try {
        return await deleteDoc(docRef);
      } catch (error: any) {
        if (this.isOfflineError(error)) {
          return this.queueDeleteDoc(docRef);
        }
        throw error;
      }
    } else {
      return this.queueDeleteDoc(docRef);
    }
  }

  /**
   * Queue a deleteDoc operation
   */
  private queueDeleteDoc(docRef: DocumentReference): Promise<void> {
    const operation: QueuedFirestoreOperation = {
      id: `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'delete',
      collection: docRef.parent.id,
      docId: docRef.id,
      timestamp: Date.now(),
      retries: 0
    };

    this.queue.push(operation);
    this.saveQueue();

    console.log('[FirestoreOfflineQueue] Queued delete operation:', operation.collection, operation.docId);

    return Promise.resolve();
  }

  /**
   * Wrapper for batch operations - queues if offline
   */
  async batchOperation(
    operations: Array<{
      type: 'create' | 'update' | 'delete';
      collection: string;
      docId?: string;
      data?: any;
    }>
  ): Promise<void> {
    if (this.isOnline) {
      try {
        const batch = writeBatch(db);
        
        operations.forEach(op => {
          if (op.type === 'create') {
            const docRef = doc(collection(db, op.collection));
            batch.set(docRef, {
              ...op.data,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            });
          } else if (op.type === 'update' && op.docId) {
            const docRef = doc(db, op.collection, op.docId);
            batch.update(docRef, {
              ...op.data,
              updatedAt: serverTimestamp()
            });
          } else if (op.type === 'delete' && op.docId) {
            const docRef = doc(db, op.collection, op.docId);
            batch.delete(docRef);
          }
        });
        
        return await batch.commit();
      } catch (error: any) {
        if (this.isOfflineError(error)) {
          return this.queueBatchOperation(operations);
        }
        throw error;
      }
    } else {
      return this.queueBatchOperation(operations);
    }
  }

  /**
   * Queue a batch operation
   */
  private queueBatchOperation(
    operations: Array<{
      type: 'create' | 'update' | 'delete';
      collection: string;
      docId?: string;
      data?: any;
    }>
  ): Promise<void> {
    const operation: QueuedFirestoreOperation = {
      id: `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'batch',
      collection: 'batch',
      batchOperations: operations.map(op => ({
        ...op,
        data: op.data ? {
          ...op.data,
          updatedAt: new Date().toISOString()
        } : undefined
      })),
      timestamp: Date.now(),
      retries: 0
    };

    this.queue.push(operation);
    this.saveQueue();

    console.log('[FirestoreOfflineQueue] Queued batch operation:', operations.length, 'operations');

    return Promise.resolve();
  }

  /**
   * Check if error indicates offline status
   */
  private isOfflineError(error: any): boolean {
    if (!navigator.onLine) {
      return true;
    }

    // Firebase error codes that indicate offline
    const offlineErrorCodes = [
      'unavailable',
      'deadline-exceeded',
      'failed-precondition',
      'unauthenticated'
    ];

    return offlineErrorCodes.some(code => 
      error?.code?.includes(code) || 
      error?.message?.toLowerCase().includes('offline') ||
      error?.message?.toLowerCase().includes('network')
    );
  }

  /**
   * Sync queue when online
   */
  async syncQueue(): Promise<{ successful: number; failed: number }> {
    if (!this.isOnline || this.syncInProgress || this.queue.length === 0) {
      return { successful: 0, failed: 0 };
    }

    this.syncInProgress = true;
    const successful: string[] = [];
    const failed: QueuedFirestoreOperation[] = [];

    console.log('[FirestoreOfflineQueue] Starting sync of', this.queue.length, 'operations');

    // Process queue
    for (const operation of [...this.queue]) {
      if (operation.retries >= MAX_RETRIES) {
        failed.push(operation);
        continue;
      }

      try {
        await this.executeOperation(operation);
        successful.push(operation.id);
      } catch (error) {
        console.error('[FirestoreOfflineQueue] Failed to execute operation:', operation.id, error);
        operation.retries++;
        failed.push(operation);
      }
    }

    // Remove successful operations
    this.queue = this.queue.filter(op => !successful.includes(op.id));
    
    // Update failed operations with new retry count
    this.queue = this.queue.map(op => {
      const failedOp = failed.find(f => f.id === op.id);
      return failedOp || op;
    });

    this.saveQueue();
    this.syncInProgress = false;

    console.log('[FirestoreOfflineQueue] Sync complete:', {
      successful: successful.length,
      failed: failed.length,
      remaining: this.queue.length
    });

    return {
      successful: successful.length,
      failed: failed.length
    };
  }

  /**
   * Execute a queued operation
   */
  private async executeOperation(operation: QueuedFirestoreOperation): Promise<void> {
    switch (operation.type) {
      case 'create':
        await this.executeCreate(operation);
        break;
      case 'update':
        await this.executeUpdate(operation);
        break;
      case 'delete':
        await this.executeDelete(operation);
        break;
      case 'batch':
        await this.executeBatch(operation);
        break;
    }
  }

  /**
   * Execute create operation
   */
  private async executeCreate(operation: QueuedFirestoreOperation): Promise<void> {
    if (!operation.data) {
      throw new Error('No data provided for create operation');
    }

    const collectionRef = collection(db, operation.collection);
    const { createdAt, updatedAt, ...data } = operation.data;
    
    await addDoc(collectionRef, {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  }

  /**
   * Execute update operation
   */
  private async executeUpdate(operation: QueuedFirestoreOperation): Promise<void> {
    if (!operation.docId || !operation.data) {
      throw new Error('Missing docId or data for update operation');
    }

    const docRef = doc(db, operation.collection, operation.docId);
    const { updatedAt, ...data } = operation.data;
    
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
  }

  /**
   * Execute delete operation
   */
  private async executeDelete(operation: QueuedFirestoreOperation): Promise<void> {
    if (!operation.docId) {
      throw new Error('Missing docId for delete operation');
    }

    const docRef = doc(db, operation.collection, operation.docId);
    await deleteDoc(docRef);
  }

  /**
   * Execute batch operation
   */
  private async executeBatch(operation: QueuedFirestoreOperation): Promise<void> {
    if (!operation.batchOperations || operation.batchOperations.length === 0) {
      throw new Error('No batch operations provided');
    }

    const batch = writeBatch(db);

    for (const op of operation.batchOperations) {
      if (op.type === 'create') {
        const docRef = doc(collection(db, op.collection));
        const { createdAt, updatedAt, ...data } = op.data || {};
        batch.set(docRef, {
          ...data,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      } else if (op.type === 'update' && op.docId) {
        const docRef = doc(db, op.collection, op.docId);
        const { updatedAt, ...data } = op.data || {};
        batch.update(docRef, {
          ...data,
          updatedAt: serverTimestamp()
        });
      } else if (op.type === 'delete' && op.docId) {
        const docRef = doc(db, op.collection, op.docId);
        batch.delete(docRef);
      }
    }

    await batch.commit();
  }

  /**
   * Clear queue
   */
  clearQueue(): void {
    this.queue = [];
    this.saveQueue();
  }

  /**
   * Get queue for debugging
   */
  getQueue(): QueuedFirestoreOperation[] {
    return [...this.queue];
  }
}

// Singleton instance
export const firestoreOfflineQueue = new FirestoreOfflineQueueService();






