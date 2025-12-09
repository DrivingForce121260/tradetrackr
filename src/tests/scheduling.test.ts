jest.mock('@/config/firebase', () => ({ db: {} }));
import { SchedulingService } from '@/services/schedulingService';
import { ScheduleSlot } from '@/types/scheduling';

describe('Scheduling - conflicts and timezone', () => {
  const svc = new SchedulingService('concern', 'user');

  it('detects overlaps for shared assignees', () => {
    const slots: ScheduleSlot[] = [
      { id:'a', concernID:'c', projectId:'p', assigneeIds:['u1'], start:'2025-10-01T08:00:00', end:'2025-10-01T10:00:00', createdBy:'u', createdAt:'', updatedAt:'' },
      { id:'b', concernID:'c', projectId:'p', assigneeIds:['u1','u2'], start:'2025-10-01T09:00:00', end:'2025-10-01T11:00:00', createdBy:'u', createdAt:'', updatedAt:'' },
      { id:'c', concernID:'c', projectId:'p', assigneeIds:['u3'], start:'2025-10-01T09:00:00', end:'2025-10-01T11:00:00', createdBy:'u', createdAt:'', updatedAt:'' },
    ] as any;
    const conflicts = svc.findConflicts(slots);
    expect(conflicts.some(c=>c.slotAId==='a'&&c.slotBId==='b'&&c.assigneeId==='u1')).toBe(true);
    expect(conflicts.some(c=>c.assigneeId==='u3')).toBe(false);
  });

  it('generates ICS with local datetime (no Z) to avoid TZ shifts', () => {
    const slots: ScheduleSlot[] = [
      { id:'x', concernID:'c', projectId:'p', assigneeIds:['u1'], start:'2025-10-01T08:30:00', end:'2025-10-01T09:30:00', createdBy:'u', createdAt:'', updatedAt:'' },
    ] as any;
    const ics = svc.generateICS(slots);
    expect(ics).toContain('DTSTART:20251001T083000');
    expect(ics).toContain('DTEND:20251001T093000');
    expect(ics).not.toContain('Z');
  });
});















