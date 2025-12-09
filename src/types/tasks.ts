export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'blocked' | 'archived';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

export interface TaskChecklistItem {
	label: string;
	checked: boolean;
}

export interface TaskComment {
	id: string;
	userId: string;
	text: string; // may contain @mentions
	createdAt: string; // ISO
}

export interface TaskItem {
	id: string;
	concernID: string;
	projectId: string;
	title: string;
	description?: string;
	assigneeIds: string[];
	dueAt?: string; // ISO
	status: TaskStatus;
	priority: TaskPriority;
	checklist: TaskChecklistItem[];
	attachments: string[]; // storage paths
	watchers: string[];
	createdAt: string;
	updatedAt: string;
	createdBy: string;
}















