/**
 * Work Order Service
 *
 * Workstream F: Migrated to dataClient (Phase 1)
 *
 * Handles work order CRUD operations.
 */

import {
  queryDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  QueryFilter,
} from '@/services/dataClient';
import type { WorkOrder, WorkOrderFormData, WorkOrderStatus } from '@/types/workorder';

const COLLECTION = 'workOrders';

export class WorkOrderService {
  private currentUser: { uid?: string; concernID?: string };

  constructor(currentUser: { uid?: string; concernID?: string }) {
    this.currentUser = currentUser;
  }

  async listByProject(projectId: string, status?: WorkOrderStatus): Promise<WorkOrder[]> {
    const filters: QueryFilter[] = [
      { field: 'projectId', op: '==', value: projectId },
    ];

    if (status) {
      filters.push({ field: 'status', op: '==', value: status });
    }

    const result = await queryDocs<WorkOrder>(COLLECTION, filters, {
      orderBy: { field: 'dueDate', dir: 'asc' },
      limit: 200,
    });

    return result.items.map((doc) => ({ id: doc.doc_id, ...doc.data }));
  }

  async get(id: string): Promise<WorkOrder | null> {
    const doc = await getDoc<WorkOrder>(COLLECTION, id);
    if (!doc) return null;
    return { id: doc.doc_id, ...doc.data };
  }

  async create(data: WorkOrderFormData): Promise<string> {
    const payload = {
      ...data,
      orderNumber: '', // assigned server-side via counter function if available
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const doc = await addDoc(COLLECTION, payload);
    return doc.doc_id;
  }

  async update(
    id: string,
    updates: Partial<WorkOrderFormData & { status: WorkOrderStatus }>
  ): Promise<void> {
    await updateDoc(COLLECTION, id, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  }

  async remove(id: string): Promise<void> {
    await deleteDoc(COLLECTION, id);
  }
}

export default WorkOrderService;

/**
 * Create a WorkOrderService instance
 */
export function createWorkOrderService(currentUser: { uid?: string; concernID?: string }): WorkOrderService {
  return new WorkOrderService(currentUser);
}
