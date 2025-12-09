// ============================================================================
// AUTOMATION SERVICE - FIRESTORE OPERATIONS
// ============================================================================

import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db, functions } from '@/config/firebase';
import { httpsCallable } from 'firebase/functions';
import {
  AutomationQueueItem,
  AutomationKey,
  AutomationEvent,
} from '@/types/automation';

const COLLECTIONS = {
  QUEUE: 'automationQueue',
  KEYS: 'automationKeys',
};

export class AutomationService {
  private currentUser: any;

  constructor(currentUser: any) {
    this.currentUser = currentUser;
  }

  // ============================================================================
  // QUEUE ITEMS
  // ============================================================================

  async getQueueItems(filters?: {
    status?: string;
    source?: string;
    limit?: number;
  }): Promise<AutomationQueueItem[]> {
    try {
      let q = query(collection(db, COLLECTIONS.QUEUE));

      if (filters?.status) {
        q = query(q, where('status', '==', filters.status));
      }
      if (filters?.source) {
        q = query(q, where('payload.source', '==', filters.source));
      }

      q = query(q, orderBy('createdAt', 'desc'), limit(filters?.limit || 50));

      const snapshot = await getDocs(q);
      const items: AutomationQueueItem[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        items.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          processedAt: data.processedAt?.toDate(),
        } as AutomationQueueItem);
      });
      return items;
    } catch (error) {
      console.error('Error fetching automation queue items:', error);
      throw error;
    }
  }

  async getQueueItem(id: string): Promise<AutomationQueueItem | null> {
    try {
      const docSnap = await getDoc(doc(db, COLLECTIONS.QUEUE, id));
      if (!docSnap.exists()) return null;
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
        processedAt: data.processedAt?.toDate(),
      } as AutomationQueueItem;
    } catch (error) {
      console.error('Error fetching automation queue item:', error);
      throw error;
    }
  }

  async retryQueueItem(id: string): Promise<void> {
    try {
      const item = await this.getQueueItem(id);
      if (!item) throw new Error('Queue item not found');

      // Reset status to pending
      await updateDoc(doc(db, COLLECTIONS.QUEUE, id), {
        status: 'pending',
        error: null,
        processedAt: null,
      });
    } catch (error) {
      console.error('Error retrying queue item:', error);
      throw error;
    }
  }

  async assignQueueItem(id: string, userId: string): Promise<void> {
    try {
      await updateDoc(doc(db, COLLECTIONS.QUEUE, id), {
        assignedUserId: userId,
      });
    } catch (error) {
      console.error('Error assigning queue item:', error);
      throw error;
    }
  }

  // ============================================================================
  // AUTOMATION KEYS
  // ============================================================================

  async getKeys(): Promise<AutomationKey[]> {
    try {
      const snapshot = await getDocs(collection(db, COLLECTIONS.KEYS));
      const keys: AutomationKey[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        keys.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          lastUsed: data.lastUsed?.toDate(),
        } as AutomationKey);
      });
      return keys.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    } catch (error) {
      console.error('Error fetching automation keys:', error);
      throw error;
    }
  }

  async createKey(serviceName: string): Promise<{ id: string; secret: string }> {
    try {
      // Generate secret
      const secret = this.generateSecret();

      const keyData = {
        serviceName,
        secret,
        active: true,
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, COLLECTIONS.KEYS), keyData);
      return { id: docRef.id, secret };
    } catch (error) {
      console.error('Error creating automation key:', error);
      throw error;
    }
  }

  async updateKey(id: string, updates: { active?: boolean; serviceName?: string }): Promise<void> {
    try {
      await updateDoc(doc(db, COLLECTIONS.KEYS, id), updates);
    } catch (error) {
      console.error('Error updating automation key:', error);
      throw error;
    }
  }

  async deleteKey(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, COLLECTIONS.KEYS, id));
    } catch (error) {
      console.error('Error deleting automation key:', error);
      throw error;
    }
  }

  // ============================================================================
  // UTILITIES
  // ============================================================================

  private generateSecret(): string {
    // Generate a random 32-character secret
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}

