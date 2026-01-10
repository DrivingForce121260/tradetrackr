/**
 * Scheduling Service
 *
 * Workstream F: Migrated to dataClient (Phase 1)
 *
 * Handles schedule slot CRUD for project/resource scheduling.
 */

import {
  queryDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  QueryFilter,
} from '@/services/dataClient';
import { Conflict, CreateScheduleSlotInput, ScheduleSlot } from '@/types/scheduling';

const PRIMARY_COLLECTION = 'scheduleSlots';
const LEGACY_COLLECTION = 'schedules';

export class SchedulingService {
  constructor(private concernID: string, private currentUserUid: string) {}

  async list(projectId?: string): Promise<ScheduleSlot[]> {
    const baseFilters: QueryFilter[] = [
      { field: 'concernID', op: '==', value: this.concernID },
    ];

    if (projectId) {
      baseFilters.push({ field: 'projectId', op: '==', value: projectId });
    }

    // Fetch from both primary and legacy collections
    const [primary, legacy] = await Promise.all([
      queryDocs<ScheduleSlot>(PRIMARY_COLLECTION, baseFilters),
      queryDocs<ScheduleSlot>(LEGACY_COLLECTION, baseFilters),
    ]);

    // Parse results
    const parse = (items: typeof primary.items) =>
      items.map((doc) => ({ id: doc.doc_id, ...doc.data }));

    const merged = [...parse(primary.items), ...parse(legacy.items)];

    // Deduplicate by ID (primary takes precedence)
    const byId = new Map<string, ScheduleSlot>();
    for (const s of merged) {
      byId.set(s.id, s);
    }

    return Array.from(byId.values());
  }

  async create(input: CreateScheduleSlotInput): Promise<string> {
    const doc = await addDoc(PRIMARY_COLLECTION, {
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

    // Audit log
    try {
      await addDoc('auditLogs', {
        action: 'schedule_create',
        targetPath: `${PRIMARY_COLLECTION}/${doc.doc_id}`,
        at: serverTimestamp(),
        actorUid: this.currentUserUid,
        concernID: this.concernID,
      });
    } catch {
      // Audit log failures are non-critical
    }

    return doc.doc_id;
  }

  async update(id: string, updates: Partial<ScheduleSlot>): Promise<void> {
    // Try primary collection first, then legacy
    try {
      await updateDoc(PRIMARY_COLLECTION, id, {
        ...updates,
        updatedAt: serverTimestamp(),
      });
    } catch {
      await updateDoc(LEGACY_COLLECTION, id, {
        ...updates,
        updatedAt: serverTimestamp(),
      });
    }

    // Audit log
    try {
      await addDoc('auditLogs', {
        action: 'schedule_update',
        targetPath: `${PRIMARY_COLLECTION}/${id}`,
        at: serverTimestamp(),
        actorUid: this.currentUserUid,
        updates,
      });
    } catch {
      // Audit log failures are non-critical
    }
  }

  async remove(id: string): Promise<void> {
    // Try primary collection first, then legacy
    try {
      await deleteDoc(PRIMARY_COLLECTION, id);
    } catch {
      await deleteDoc(LEGACY_COLLECTION, id);
    }

    // Audit log
    try {
      await addDoc('auditLogs', {
        action: 'schedule_delete',
        targetPath: `${PRIMARY_COLLECTION}/${id}`,
        at: serverTimestamp(),
        actorUid: this.currentUserUid,
      });
    } catch {
      // Audit log failures are non-critical
    }
  }

  findConflicts(slots: ScheduleSlot[]): Conflict[] {
    const conflicts: Conflict[] = [];
    const toDate = (s: string) => new Date(s).getTime();

    for (let i = 0; i < slots.length; i++) {
      for (let j = i + 1; j < slots.length; j++) {
        const a = slots[i];
        const b = slots[j];
        const overlap = toDate(a.start) < toDate(b.end) && toDate(b.start) < toDate(a.end);
        if (!overlap) continue;

        const shared = new Set(a.assigneeIds.filter((id) => b.assigneeIds.includes(id)));
        shared.forEach((assigneeId) =>
          conflicts.push({ slotAId: a.id, slotBId: b.id, assigneeId })
        );
      }
    }

    return conflicts;
  }

  generateICS(slots: ScheduleSlot[]): string {
    const escape = (s: string) =>
      s
        .replace(/\\/g, '\\\\')
        .replace(/\n/g, '\\n')
        .replace(/,/g, '\\,')
        .replace(/;/g, '\\;');

    const dtLocal = (iso: string) => {
      const d = new Date(iso);
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
    };

    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//TradeTrackr//Scheduling//EN',
    ];

    slots.forEach((s) => {
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

  async bulkAssign(input: {
    projectId: string;
    assigneeIds: string[];
    start: string;
    end: string;
    color?: string;
    note?: string;
  }): Promise<string[]> {
    const ids: string[] = [];
    for (const a of input.assigneeIds) {
      const id = await this.create({
        projectId: input.projectId,
        assigneeIds: [a],
        start: input.start,
        end: input.end,
        color: input.color,
        note: input.note,
      });
      ids.push(id);
    }
    return ids;
  }
}

/**
 * Create a SchedulingService instance
 */
export function createSchedulingService(concernID: string, currentUserUid: string): SchedulingService {
  return new SchedulingService(concernID, currentUserUid);
}
