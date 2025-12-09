// ============================================================================
// HOOK FOR FIRESTORE OFFLINE QUEUE
// ============================================================================

import { useState, useEffect } from 'react';
import { firestoreOfflineQueue } from '@/services/firestoreOfflineQueue';

export interface UseFirestoreOfflineQueueReturn {
  isOnline: boolean;
  queueLength: number;
  syncQueue: () => Promise<{ successful: number; failed: number }>;
  clearQueue: () => void;
}

/**
 * Hook for accessing Firestore offline queue status and controls
 */
export function useFirestoreOfflineQueue(): UseFirestoreOfflineQueueReturn {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queueLength, setQueueLength] = useState(0);

  useEffect(() => {
    // Subscribe to queue length changes
    const unsubscribe = firestoreOfflineQueue.subscribe((length) => {
      setQueueLength(length);
    });

    // Listen to online/offline events
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial values
    setIsOnline(navigator.onLine);
    setQueueLength(firestoreOfflineQueue.getQueueLength());

    return () => {
      unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const syncQueue = async () => {
    return await firestoreOfflineQueue.syncQueue();
  };

  const clearQueue = () => {
    firestoreOfflineQueue.clearQueue();
  };

  return {
    isOnline,
    queueLength,
    syncQueue,
    clearQueue
  };
}






