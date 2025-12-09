import { useState, useEffect, useCallback } from 'react';

export interface OfflineQueueItem {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body: any;
  timestamp: number;
  retries: number;
}

export interface UseOfflineSupportReturn {
  isOnline: boolean;
  queueLength: number;
  syncQueue: () => Promise<void>;
  clearQueue: () => Promise<void>;
  addToQueue: (item: Omit<OfflineQueueItem, 'id' | 'timestamp' | 'retries'>) => Promise<void>;
}

const MAX_RETRIES = 3;
const QUEUE_STORAGE_KEY = 'tradetrackr-offline-queue';

/**
 * Hook for managing offline support and action queue
 */
export function useOfflineSupport(): UseOfflineSupportReturn {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queueLength, setQueueLength] = useState(0);

  // Check online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncQueue();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check queue length on mount
    updateQueueLength();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Update queue length periodically
  useEffect(() => {
    const interval = setInterval(updateQueueLength, 5000);
    return () => clearInterval(interval);
  }, []);

  // Get queue from localStorage
  const getQueue = useCallback((): OfflineQueueItem[] => {
    try {
      const stored = localStorage.getItem(QUEUE_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to get queue:', error);
      return [];
    }
  }, []);

  // Save queue to localStorage
  const saveQueue = useCallback((queue: OfflineQueueItem[]) => {
    try {
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
      setQueueLength(queue.length);
    } catch (error) {
      console.error('Failed to save queue:', error);
    }
  }, []);

  // Update queue length
  const updateQueueLength = useCallback(() => {
    const queue = getQueue();
    setQueueLength(queue.length);
  }, [getQueue]);

  // Add item to queue
  const addToQueue = useCallback(async (item: Omit<OfflineQueueItem, 'id' | 'timestamp' | 'retries'>) => {
    const queue = getQueue();
    const queueItem: OfflineQueueItem = {
      ...item,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      retries: 0
    };

    queue.push(queueItem);
    saveQueue(queue);

    // Try to sync immediately if online
    if (navigator.onLine) {
      await syncQueue();
    }
  }, [getQueue, saveQueue]);

  // Sync queue
  const syncQueue = useCallback(async () => {
    if (!navigator.onLine) {
      return;
    }

    const queue = getQueue();
    if (queue.length === 0) {
      return;
    }

    const successful: string[] = [];
    const failed: OfflineQueueItem[] = [];

    for (const item of queue) {
      // Skip if max retries reached
      if (item.retries >= MAX_RETRIES) {
        failed.push(item);
        continue;
      }

      try {
        const response = await fetch(item.url, {
          method: item.method,
          headers: item.headers,
          body: item.body ? JSON.stringify(item.body) : undefined
        });

        if (response.ok) {
          successful.push(item.id);
        } else {
          // Increment retries
          item.retries++;
          failed.push(item);
        }
      } catch (error) {
        console.error('Failed to sync queue item:', item.url, error);
        // Increment retries
        item.retries++;
        failed.push(item);
      }
    }

    // Remove successful items
    const remainingQueue = queue.filter(
      (item) => !successful.includes(item.id)
    );

    // Update failed items with new retry count
    const updatedQueue = remainingQueue.map((item) => {
      const failedItem = failed.find((f) => f.id === item.id);
      return failedItem || item;
    });

    saveQueue(updatedQueue);

    // Notify service worker if available
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SYNC_OFFLINE_QUEUE'
      });
    }

    return Promise.resolve();
  }, [getQueue, saveQueue]);

  // Clear queue
  const clearQueue = useCallback(async () => {
    saveQueue([]);
  }, [saveQueue]);

  return {
    isOnline,
    queueLength,
    syncQueue,
    clearQueue,
    addToQueue
  };
}







