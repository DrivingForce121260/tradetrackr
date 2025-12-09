import { db } from '@/config/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export interface NotificationPrefs {
  uid: string;
  email: boolean;
  push: boolean;
  inApp: boolean;
}

export class NotificationPrefsService {
  constructor(private uid: string) {}
  private ref() { return doc(db as any, 'notificationPrefs', this.uid); }

  async get(): Promise<NotificationPrefs> {
    const snap = await getDoc(this.ref());
    const data = snap.exists() ? (snap.data() as any) : {};
    return {
      uid: this.uid,
      email: !!data.email,
      push: data.push !== false, // default true
      inApp: data.inApp !== false, // default true
    };
  }

  async set(prefs: Partial<NotificationPrefs>): Promise<void> {
    await setDoc(this.ref(), { ...prefs, uid: this.uid }, { merge: true });
  }
}















