// ============================================================================
// WORK ORDER SERVICE - FIRESTORE OPERATIONS
// ============================================================================

import { 
	collection,
	doc,
	getDoc,
	getDocs,
	addDoc,
	updateDoc,
	deleteDoc,
	query,
	where,
	orderBy,
	limit,
	serverTimestamp,
	Timestamp
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { WorkOrder, WorkOrderFormData, WorkOrderStatus } from '@/types/workorder';

const COLLECTION = 'workOrders';

export class WorkOrderService {
	private currentUser: any;

	constructor(currentUser: any) {
		this.currentUser = currentUser;
	}

	async listByProject(projectId: string, status?: WorkOrderStatus): Promise<WorkOrder[]> {
		let q = query(collection(db, COLLECTION), where('projectId', '==', projectId));
		if (status) {
			q = query(q, where('status', '==', status));
		}
		q = query(q, orderBy('dueDate', 'asc'), limit(200));
		const snap = await getDocs(q);
		return snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
	}

	async get(id: string): Promise<WorkOrder | null> {
		const ref = await getDoc(doc(db, COLLECTION, id));
		if (!ref.exists()) return null;
		return { id: ref.id, ...ref.data() } as any;
	}

	async create(data: WorkOrderFormData): Promise<string> {
		const payload = {
			...data,
			orderNumber: '', // assigned server-side via counter function if available
			createdAt: serverTimestamp(),
			updatedAt: serverTimestamp(),
		};
		const ref = await addDoc(collection(db, COLLECTION), payload as any);
		return ref.id;
	}

	async update(id: string, updates: Partial<WorkOrderFormData & { status: WorkOrderStatus }>): Promise<void> {
		await updateDoc(doc(db, COLLECTION, id), {
			...updates,
			updatedAt: serverTimestamp(),
		});
	}

	async remove(id: string): Promise<void> {
		await deleteDoc(doc(db, COLLECTION, id));
	}
}

export default WorkOrderService;












