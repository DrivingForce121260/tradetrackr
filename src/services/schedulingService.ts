import { addDoc, collection, deleteDoc, doc, getDocs, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { Conflict, CreateScheduleSlotInput, ScheduleSlot } from '@/types/scheduling';

const PRIMARY_COLLECTION = 'scheduleSlots';
const LEGACY_COLLECTION = 'schedules';

export class SchedulingService {
	constructor(private concernID: string, private currentUserUid: string) {}

  async list(projectId?: string): Promise<ScheduleSlot[]> {
    const makeQ = (col: string) => projectId
      ? query(collection(db, col), where('concernID', '==', this.concernID), where('projectId', '==', projectId))
      : query(collection(db, col), where('concernID', '==', this.concernID));
    const [s1, s2] = await Promise.all([getDocs(makeQ(PRIMARY_COLLECTION)), getDocs(makeQ(LEGACY_COLLECTION))]);
    const parse = (snap:any) => snap.docs.map((d:any)=>({ id: d.id, ...(d.data() as any)})) as ScheduleSlot[];
    const merged = [...parse(s1), ...parse(s2)];
    const byId = new Map<string, ScheduleSlot>();
    for (const s of merged) byId.set(s.id, s);
    return Array.from(byId.values());
  }

	async create(input: CreateScheduleSlotInput): Promise<string> {
    const ref = await addDoc(collection(db, PRIMARY_COLLECTION), {
			concernID: this.concernID,
			projectId: input.projectId,
			assigneeIds: input.assigneeIds,
			start: input.start,
			end: input.end,
			color: input.color,
			note: input.note,
      status: 'planned',
			createdBy: this.currentUserUid,
			createdAt: serverTimestamp(),
			updatedAt: serverTimestamp(),
		});
    // Audit
    try { await addDoc(collection(db, 'auditLogs'), { action:'schedule_create', targetPath:`${PRIMARY_COLLECTION}/${ref.id}`, at: serverTimestamp(), actorUid:this.currentUserUid, concernID:this.concernID }); } catch {}
		return ref.id;
	}

	async update(id: string, updates: Partial<ScheduleSlot>): Promise<void> {
    // Try primary then legacy
    try {
      await updateDoc(doc(db, PRIMARY_COLLECTION, id), { ...updates, updatedAt: serverTimestamp() });
    } catch {
      await updateDoc(doc(db, LEGACY_COLLECTION, id), { ...updates, updatedAt: serverTimestamp() });
    }
    try { await addDoc(collection(db, 'auditLogs'), { action:'schedule_update', targetPath:`${PRIMARY_COLLECTION}/${id}`, at: serverTimestamp(), actorUid:this.currentUserUid, updates }); } catch {}
	}

	async remove(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, PRIMARY_COLLECTION, id));
    } catch {
      await deleteDoc(doc(db, LEGACY_COLLECTION, id));
    }
    try { await addDoc(collection(db, 'auditLogs'), { action:'schedule_delete', targetPath:`${PRIMARY_COLLECTION}/${id}`, at: serverTimestamp(), actorUid:this.currentUserUid }); } catch {}
	}

	findConflicts(slots: ScheduleSlot[]): Conflict[] {
		const conflicts: Conflict[] = [];
		const toDate = (s: string) => new Date(s).getTime();
		for (let i = 0; i < slots.length; i++) {
			for (let j = i + 1; j < slots.length; j++) {
				const a = slots[i], b = slots[j];
				const overlap = toDate(a.start) < toDate(b.end) && toDate(b.start) < toDate(a.end);
				if (!overlap) continue;
				const shared = new Set(a.assigneeIds.filter(id => b.assigneeIds.includes(id)));
				shared.forEach(assigneeId => conflicts.push({ slotAId: a.id, slotBId: b.id, assigneeId }));
			}
		}
		return conflicts;
	}

	generateICS(slots: ScheduleSlot[]): string {
    const escape = (s: string) => s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\,').replace(/;/g, '\;');
    const dtLocal = (iso: string) => {
      const d = new Date(iso);
      const pad = (n:number)=>String(n).padStart(2,'0');
      return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
    };
		const lines = [
			'BEGIN:VCALENDAR',
			'VERSION:2.0',
			'PRODID:-//TradeTrackr//Scheduling//EN',
		];
		slots.forEach(s => {
			lines.push('BEGIN:VEVENT');
			lines.push(`UID:${s.id}@tradetrackr`);
      lines.push(`DTSTART:${dtLocal(s.start)}`);
      lines.push(`DTEND:${dtLocal(s.end)}`);
			lines.push(`SUMMARY:${escape('Project ' + s.projectId)}`);
			if (s.note) lines.push(`DESCRIPTION:${escape(s.note)}`);
			lines.push('END:VEVENT');
		});
		lines.push('END:VCALENDAR');
		return lines.join('\r\n');
	}

	// Placeholder for notifications (see feature #6)
	async notifyAssigneesOfChange(_slotId: string, _assigneeIds: string[]): Promise<void> {
		// Intentionally no-op; integrate FCM later
	}
  async bulkAssign(input: { projectId: string; assigneeIds: string[]; start: string; end: string; color?: string; note?: string }): Promise<string[]> {
    const ids: string[] = [];
    for (const a of input.assigneeIds) {
      const id = await this.create({ projectId: input.projectId, assigneeIds: [a], start: input.start, end: input.end, color: input.color, note: input.note });
      ids.push(id);
    }
    return ids;
  }
}


