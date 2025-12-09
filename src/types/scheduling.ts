export interface ScheduleSlot {
	id: string;
	concernID: string;
	projectId: string;
	assigneeIds: string[];
	start: string; // ISO
	end: string; // ISO
	color?: string;
	note?: string;
	status?: 'planned' | 'confirmed' | 'completed';
	createdBy: string;
	createdAt: string;
	updatedAt: string;
}

export interface CreateScheduleSlotInput {
	projectId: string;
	assigneeIds: string[];
	start: string;
	end: string;
	color?: string;
	note?: string;
}

export interface Conflict {
	slotAId: string;
	slotBId: string;
	assigneeId: string;
}


