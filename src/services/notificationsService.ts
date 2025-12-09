import { db } from '@/config/firebase';
import { collection, doc, getDocs, limit, orderBy, query, updateDoc, where } from 'firebase/firestore';

export interface NotificationItem {
  id: string;
  type: string;
  entity: string;
  entityId: string;
  recipients: string[];
  title: string;
  body: string;
  meta?: any;
  readBy?: string[];
  deletedBy?: string[];
  status?: string;
  createdAt?: any;
  updatedAt?: any;
}

export class NotificationsService {
  constructor(private uid: string) {}

  private col() { return collection(db as any, 'notifications'); }

  async listUnread(): Promise<NotificationItem[]> {
    const q = query(this.col(), where('recipients','array-contains', this.uid), where('readBy','not-in', [[this.uid]] as any), orderBy('createdAt','desc'), limit(50));
    const snap = await getDocs(q);
    return snap.docs.map(d=>({ id: d.id, ...(d.data() as any) }));
  }

  async listRecent(): Promise<NotificationItem[]> {
    const q = query(this.col(), where('recipients','array-contains', this.uid), orderBy('createdAt','desc'), limit(50));
    const snap = await getDocs(q);
    return snap.docs.map(d=>({ id: d.id, ...(d.data() as any) }));
  }

  async markAllRead(ids: string[]): Promise<void> {
    await Promise.all(ids.map(id => updateDoc(doc(this.col(), id), {
      readBy: (window as any).arrayUnion ? (window as any).arrayUnion(this.uid) : [this.uid]
    } as any)));
  }

  async markRead(id: string): Promise<void> {
    await updateDoc(doc(this.col(), id), { readBy: (window as any).arrayUnion ? (window as any).arrayUnion(this.uid) : [this.uid] } as any);
  }

  async delete(id: string): Promise<void> {
    await updateDoc(doc(this.col(), id), { deletedBy: (window as any).arrayUnion ? (window as any).arrayUnion(this.uid) : [this.uid] } as any);
  }
}















