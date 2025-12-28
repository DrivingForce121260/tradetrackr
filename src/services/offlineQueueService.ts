import { logEvent } from '@/telemetry/telemetry';

export interface QueuedItem {
  id: string;
  action: 'sendMessage' | 'createDirectChat' | 'updateChatLastMessage' | 'sendControllingMessage' | 'uploadFile';
  payload: any;
  timestamp: number;
  status: 'queued' | 'sent' | 'failed';
}

class OfflineQueueService {
  private storageKey: string = 'tradetrackr_offline_queue_v1';

  private loadQueue(): QueuedItem[] {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private saveQueue(queue: QueuedItem[]): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(queue));
    } catch {
      // Ignore storage errors
    }
  }

  public getQueue(): QueuedItem[] {
    return this.loadQueue();
  }

  public enqueue(item: QueuedItem): void {
    const queue = this.loadQueue();
    queue.push(item);
    // Telemetry for enqueue
    try { logEvent({ name: 'offline_queue_enqueued', properties: { item } }); } catch {}
    this.saveQueue(queue);
  }

  public clearQueue(): void {
    this.saveQueue([]);
  }

  // Process the queue sequentially. The processor should return true when the item was handled successfully.
  public async processQueue(processor: (item: QueuedItem) => Promise<boolean>): Promise<void> {
    const queue = this.loadQueue();
    if (queue.length === 0) return;

    const remaining: QueuedItem[] = [];
    for (const item of queue) {
      try {
        const success = await processor(item);
        if (!success) remaining.push(item);
      } catch {
        remaining.push(item);
      }
    }

    if (remaining.length > 0) {
      this.saveQueue(remaining);
    } else {
      this.clearQueue();
    }
    // Telemetry for flush outcome
    try { logEvent({ name: 'offline_queue_flushed', properties: { remaining: remaining.length } }); } catch {}
  }
}

const offlineQueueService = new OfflineQueueService();
export default offlineQueueService;


