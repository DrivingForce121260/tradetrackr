/**
 * Notifications Service
 *
 * Workstream F: Migrated to dataClient (Phase 1)
 *
 * Handles user notifications.
 */

import {
  queryDocs,
  updateDoc,
  arrayUnion,
  QueryFilter,
} from '@/services/dataClient';

export interface NotificationItem {
  id: string;
  type: string;
  entity: string;
  entityId: string;
  recipients: string[];
  title: string;
  body: string;
  meta?: unknown;
  readBy?: string[];
  deletedBy?: string[];
  status?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

const COLLECTION = 'notifications';

export class NotificationsService {
  constructor(private uid: string) {}

  async listUnread(): Promise<NotificationItem[]> {
    // Note: The "not-in" operator for readBy is complex in our API
    // We fetch recent and filter client-side
    const filters: QueryFilter[] = [
      { field: 'recipients', op: 'array-contains', value: this.uid },
    ];

    const result = await queryDocs<NotificationItem>(COLLECTION, filters, {
      orderBy: { field: 'createdAt', dir: 'desc' },
      limit: 50,
    });

    // Filter out already-read notifications client-side
    return result.items
      .map((doc) => ({ id: doc.doc_id, ...doc.data }))
      .filter((n) => !n.readBy?.includes(this.uid));
  }

  async listRecent(): Promise<NotificationItem[]> {
    const filters: QueryFilter[] = [
      { field: 'recipients', op: 'array-contains', value: this.uid },
    ];

    const result = await queryDocs<NotificationItem>(COLLECTION, filters, {
      orderBy: { field: 'createdAt', dir: 'desc' },
      limit: 50,
    });

    return result.items.map((doc) => ({ id: doc.doc_id, ...doc.data }));
  }

  async markAllRead(ids: string[]): Promise<void> {
    await Promise.all(
      ids.map((id) =>
        updateDoc(COLLECTION, id, {
          readBy: arrayUnion(this.uid),
        })
      )
    );
  }

  async markRead(id: string): Promise<void> {
    await updateDoc(COLLECTION, id, {
      readBy: arrayUnion(this.uid),
    });
  }

  async delete(id: string): Promise<void> {
    await updateDoc(COLLECTION, id, {
      deletedBy: arrayUnion(this.uid),
    });
  }
}

/**
 * Create a NotificationsService instance
 */
export function createNotificationsService(uid: string): NotificationsService {
  return new NotificationsService(uid);
}
