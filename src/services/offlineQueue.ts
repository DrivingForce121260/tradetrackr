/**
 * Offline Queue Service
 * Queues mutations for later sync when offline
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import * as api from './api';
import { logInfo, logWarn, logError } from './logger';

export interface QueuedMutation {
  id: string;
  type: 'create_time_entry' | 'update_task' | 'add_note' | 'create_photo' | 'create_report' | 'create_project_report';
  payload: any;
  timestamp: number;
  retries: number;
}

const QUEUE_KEY = '@offline_mutation_queue';
const MAX_RETRIES = 3;

// In-memory cache
let queueCache: QueuedMutation[] | null = null;

/**
 * Load queue from AsyncStorage
 */
async function loadQueue(): Promise<QueuedMutation[]> {
  if (queueCache !== null) {
    return queueCache;
  }

  try {
    const stored = await AsyncStorage.getItem(QUEUE_KEY);
    if (stored) {
      queueCache = JSON.parse(stored);
      return queueCache!;
    }
  } catch (error) {
    logError('Offline Queue: Failed to load queue', error);
  }

  queueCache = [];
  return queueCache;
}

/**
 * Save queue to AsyncStorage
 */
async function saveQueue(queue: QueuedMutation[]): Promise<void> {
  try {
    queueCache = queue;
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (error) {
    logError('Offline Queue: Failed to save queue', error);
  }
}

/**
 * Add a mutation to the queue
 */
export async function queueMutation(
  mutation: Omit<QueuedMutation, 'id' | 'timestamp' | 'retries'>
): Promise<void> {
  const queue = await loadQueue();

  const fullMutation: QueuedMutation = {
    id: `mutation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
    retries: 0,
    ...mutation,
  };

  queue.push(fullMutation);
  await saveQueue(queue);

  logInfo('Offline Queue: Mutation queued', { type: fullMutation.type, id: fullMutation.id });
}

/**
 * Execute a single mutation
 */
async function executeMutation(mutation: QueuedMutation): Promise<void> {
  switch (mutation.type) {
    case 'create_time_entry':
      await api.createTimeEntry(mutation.payload);
      break;

    case 'update_task':
      const { tenantId, projectId, taskId, status } = mutation.payload;
      await api.updateTaskStatus(tenantId, projectId, taskId, status);
      break;

    case 'add_note':
      await api.addNote(mutation.payload);
      break;

    case 'create_photo':
      await api.createPhoto(mutation.payload);
      break;

    case 'create_report':
      await api.createDayReport(mutation.payload);
      break;

    case 'create_project_report':
      await api.createProjectReport(mutation.payload);
      break;

    default:
      logWarn('Offline Queue: Unknown mutation type', { type: (mutation as any).type });
  }
}

/**
 * Flush the queue - attempt to send all pending mutations
 */
export async function flushQueue(): Promise<{ success: number; failed: number }> {
  // Check network connectivity
  const netInfo = await NetInfo.fetch();
  if (!netInfo.isConnected) {
    logInfo('Offline Queue: No network, skipping flush');
    return { success: 0, failed: 0 };
  }

  const queue = await loadQueue();

  if (queue.length === 0) {
    return { success: 0, failed: 0 };
  }

  logInfo('Offline Queue: Starting flush', { count: queue.length });

  let success = 0;
  let failed = 0;
  const remaining: QueuedMutation[] = [];

  for (const mutation of queue) {
    try {
      await executeMutation(mutation);
      success++;
      logInfo('Offline Queue: Mutation flushed', { type: mutation.type, id: mutation.id });
    } catch (error) {
      logError('Offline Queue: Failed to flush mutation', error, { type: mutation.type, id: mutation.id });

      if (mutation.retries < MAX_RETRIES) {
        remaining.push({
          ...mutation,
          retries: mutation.retries + 1,
        });
      } else {
        failed++;
        logWarn('Offline Queue: Mutation exceeded max retries', { type: mutation.type, id: mutation.id });
      }
    }
  }

  await saveQueue(remaining);

  if (success > 0 || failed > 0) {
    logInfo('Offline Queue: Flush complete', { success, failed, remaining: remaining.length });
  }

  return { success, failed };
}

/**
 * Get pending mutation count
 */
export async function getPendingCount(): Promise<number> {
  const queue = await loadQueue();
  return queue.length;
}

/**
 * Clear the queue (use with caution)
 */
export async function clearQueue(): Promise<void> {
  queueCache = [];
  await AsyncStorage.removeItem(QUEUE_KEY);
  logInfo('Offline Queue: Queue cleared');
}

/**
 * Initialize auto-sync on network reconnection
 */
export function initializeAutoSync(): () => void {
  const unsubscribe = NetInfo.addEventListener((state) => {
    if (state.isConnected) {
      logInfo('Offline Queue: Network reconnected, flushing queue');
      flushQueue().catch((error) => {
        logError('Offline Queue: Auto-flush failed', error);
      });
    }
  });

  // Initial flush attempt
  flushQueue().catch((error) => {
    logError('Offline Queue: Initial flush failed', error);
  });

  return unsubscribe;
}
