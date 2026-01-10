/**
 * Task Service
 *
 * Workstream F: Migrated to dataClient (Phase 1)
 *
 * Handles CRUD operations for tasks.
 * All operations are scoped to the current concern (multi-tenant).
 */

import {
  dataClient,
  queryDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  QueryFilter,
} from '@/services/dataClient';
import { TaskItem, TaskChecklistItem, TaskComment, TaskPriority, TaskStatus } from '@/types/tasks';

const TASKS = 'tasks';

export class TaskService {
  constructor(private concernID: string, private currentUserUid: string) {}

  async list(filters?: { projectId?: string; assigneeId?: string; status?: TaskStatus; priority?: TaskPriority }): Promise<TaskItem[]> {
    const queryFilters: QueryFilter[] = [
      { field: 'concernID', op: '==', value: this.concernID },
    ];

    if (filters?.projectId) {
      queryFilters.push({ field: 'projectId', op: '==', value: filters.projectId });
    }
    if (filters?.assigneeId) {
      queryFilters.push({ field: 'assigneeIds', op: 'array-contains', value: filters.assigneeId });
    }
    if (filters?.status) {
      queryFilters.push({ field: 'status', op: '==', value: filters.status });
    }
    if (filters?.priority) {
      queryFilters.push({ field: 'priority', op: '==', value: filters.priority });
    }

    const result = await queryDocs<TaskItem>(TASKS, queryFilters);
    return result.items.map((doc) => ({ id: doc.doc_id, ...doc.data }));
  }

  async create(input: Omit<TaskItem, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'concernID'>): Promise<string> {
    const doc = await addDoc<Omit<TaskItem, 'id'>>(TASKS, {
      ...input,
      concernID: this.concernID,
      createdBy: this.currentUserUid,
      createdAt: serverTimestamp() as unknown as string,
      updatedAt: serverTimestamp() as unknown as string,
    });
    return doc.doc_id;
  }

  async update(id: string, updates: Partial<TaskItem>): Promise<void> {
    await updateDoc(TASKS, id, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  }

  async remove(id: string): Promise<void> {
    await deleteDoc(TASKS, id);
  }

  async addComment(taskId: string, text: string): Promise<void> {
    const doc = await getDoc<TaskItem>(TASKS, taskId);
    if (!doc) return;

    const comments: TaskComment[] = doc.data.comments || [];
    comments.push({
      id: crypto.randomUUID?.() || Math.random().toString(36).slice(2),
      userId: this.currentUserUid,
      text,
      createdAt: new Date().toISOString(),
    });

    await updateDoc(TASKS, taskId, {
      comments,
      updatedAt: serverTimestamp(),
    });
  }

  async toggleChecklist(taskId: string, idx: number, checked: boolean): Promise<void> {
    const doc = await getDoc<TaskItem>(TASKS, taskId);
    if (!doc) return;

    const list: TaskChecklistItem[] = doc.data.checklist || [];
    if (list[idx]) {
      list[idx].checked = checked;
    }

    await updateDoc(TASKS, taskId, {
      checklist: list,
      updatedAt: serverTimestamp(),
    });
  }
}

/**
 * Create a TaskService instance
 * Convenience function for components
 */
export function createTaskService(concernID: string, currentUserUid: string): TaskService {
  return new TaskService(concernID, currentUserUid);
}
