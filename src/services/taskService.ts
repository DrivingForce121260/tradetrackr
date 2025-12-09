import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, orderBy, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { TaskItem, TaskChecklistItem, TaskComment, TaskPriority, TaskStatus } from '@/types/tasks';

const TASKS = 'tasks';

export class TaskService {
  constructor(private concernID: string, private currentUserUid: string) {}

  async list(filters?: { projectId?: string; assigneeId?: string; status?: TaskStatus; priority?: TaskPriority }): Promise<TaskItem[]> {
    let qRef = query(collection(db, TASKS), where('concernID', '==', this.concernID));
    if (filters?.projectId) qRef = query(qRef, where('projectId', '==', filters.projectId));
    if (filters?.assigneeId) qRef = query(qRef, where('assigneeIds', 'array-contains', filters.assigneeId));
    if (filters?.status) qRef = query(qRef, where('status', '==', filters.status));
    if (filters?.priority) qRef = query(qRef, where('priority', '==', filters.priority));
    const snap = await getDocs(qRef);
    return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })) as TaskItem[];
  }

  async create(input: Omit<TaskItem, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'concernID'>): Promise<string> {
    const ref = await addDoc(collection(db, TASKS), {
      ...input,
      concernID: this.concernID,
      createdBy: this.currentUserUid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return ref.id;
  }

  async update(id: string, updates: Partial<TaskItem>): Promise<void> {
    await updateDoc(doc(db, TASKS, id), { ...updates, updatedAt: serverTimestamp() });
  }

  async remove(id: string): Promise<void> {
    await deleteDoc(doc(db, TASKS, id));
  }

  async addComment(taskId: string, text: string): Promise<void> {
    const taskRef = doc(db, TASKS, taskId);
    const snap = await getDoc(taskRef);
    if (!snap.exists()) return;
    const data = snap.data() as any;
    const comments: any[] = data.comments || [];
    comments.push({ id: crypto.randomUUID?.() || Math.random().toString(36).slice(2), userId: this.currentUserUid, text, createdAt: new Date().toISOString() });
    await updateDoc(taskRef, { comments, updatedAt: serverTimestamp() });
  }

  async toggleChecklist(taskId: string, idx: number, checked: boolean): Promise<void> {
    const taskRef = doc(db, TASKS, taskId);
    const snap = await getDoc(taskRef);
    if (!snap.exists()) return;
    const data = snap.data() as any;
    const list: TaskChecklistItem[] = data.checklist || [];
    if (list[idx]) list[idx].checked = checked;
    await updateDoc(taskRef, { checklist: list, updatedAt: serverTimestamp() });
  }
}















