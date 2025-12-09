// ============================================================================
// WORK ORDER TYPES & INTERFACES
// ============================================================================

export type WorkOrderStatus = 'draft' | 'assigned' | 'in-progress' | 'completed';

export interface WorkOrderChecklistItem {
	id: string;
	title: string;
	done: boolean;
	order: number;
}

export interface WorkOrderMaterialRef {
	materialId: string;
	quantity?: number;
	unit?: string;
}

export interface WorkOrderSignatureRef {
	imagePath: string; // storage path
	signedBy?: string;
	signedAt?: string; // ISO
}

export interface WorkOrder {
	id: string;
	projectId: string;
	orderNumber: string;
	title: string;
	description?: string;
	checklist: WorkOrderChecklistItem[];
	materials: WorkOrderMaterialRef[];
	assignedUsers: string[];
	safetyNotes?: string;
	safetyDocUrl?: string;
	dueDate?: string; // ISO
	status: WorkOrderStatus;
	signatures: WorkOrderSignatureRef[];
	createdAt: string; // ISO
	updatedAt: string; // ISO
	completedAt?: string; // ISO
}

export interface WorkOrderFormData {
	projectId: string;
	title: string;
	description?: string;
	checklist: WorkOrderChecklistItem[];
	materials: WorkOrderMaterialRef[];
	assignedUsers: string[];
	safetyNotes?: string;
	safetyDocUrl?: string;
	dueDate?: string; // ISO
	status: WorkOrderStatus;
}












