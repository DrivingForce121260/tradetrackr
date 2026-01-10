/**
 * Notification Preferences Service
 *
 * Workstream F: Migrated to dataClient (Phase 1)
 *
 * Handles user notification preferences.
 */

import { getDoc, upsertDoc } from '@/services/dataClient';

export interface NotificationPrefs {
  uid: string;
  email: boolean;
  push: boolean;
  inApp: boolean;
}

const COLLECTION = 'notificationPrefs';

export class NotificationPrefsService {
  constructor(private uid: string) {}

  async get(): Promise<NotificationPrefs> {
    const doc = await getDoc<NotificationPrefs>(COLLECTION, this.uid);
    const data = doc?.data || ({} as Partial<NotificationPrefs>);

    return {
      uid: this.uid,
      email: !!data.email,
      push: data.push !== false, // default true
      inApp: data.inApp !== false, // default true
    };
  }

  async set(prefs: Partial<NotificationPrefs>): Promise<void> {
    await upsertDoc(COLLECTION, this.uid, { ...prefs, uid: this.uid }, { merge: true });
  }
}

/**
 * Create a NotificationPrefsService instance
 */
export function createNotificationPrefsService(uid: string): NotificationPrefsService {
  return new NotificationPrefsService(uid);
}
