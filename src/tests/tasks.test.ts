import { isOverdue, isOverduePlus1h, isWithinNext24h } from '@/services/taskUtils';

// Mock TaskService with in-memory store
jest.mock('@/services/taskService', () => {
  class MockTaskService {
    concernID: string; uid: string; store: any[] = [];
    constructor(concernID: string, uid: string) { this.concernID = concernID; this.uid = uid; }
    async list() { return this.store; }
    async create(task: any) { const t = { ...task, id: String(Math.random()), status: task.status || 'todo' }; this.store.push(t); return t; }
    async update(id: string, partial: any) { const i = this.store.findIndex(t=>t.id===id); if (i>=0) this.store[i] = { ...this.store[i], ...partial }; return this.store[i]; }
    async remove(id: string) { this.store = this.store.filter(t=>t.id!==id); }
  }
  return { TaskService: MockTaskService };
});

describe('Task CRUD via mocked TaskService', () => {
  test('create, update status, delete', async () => {
    const { TaskService } = await import('@/services/taskService');
    const svc = new (TaskService as any)('C1', 'U1');

    // create
    const created = await svc.create({ title: 'A', description: 'x', priority: 'medium' });
    expect(created.id).toBeTruthy();
    expect((await svc.list()).length).toBe(1);

    // update
    await svc.update(created.id, { status: 'done' });
    const afterUpdate = (await svc.list())[0];
    expect(afterUpdate.status).toBe('done');

    // delete
    await svc.remove(created.id);
    expect((await svc.list()).length).toBe(0);
  });
});

describe('Reminder timing utils', () => {
  test('within next 24h returns true, +1h overdue returns true', () => {
    const now = new Date('2025-10-30T10:00:00+01:00');
    const dueSoon = new Date(now.getTime() + 23 * 3600 * 1000);
    const duePast = new Date(now.getTime() - 2 * 3600 * 1000);

    expect(isWithinNext24h(now, dueSoon, 'todo')).toBe(true);
    expect(isOverdue(now, duePast, 'in_progress')).toBe(true);
    expect(isOverduePlus1h(now, duePast, 'in_progress')).toBe(true);
  });

  test('done/archived are not considered', () => {
    const now = new Date();
    const duePast = new Date(now.getTime() - 3 * 3600 * 1000);
    expect(isOverdue(now, duePast, 'done')).toBe(false);
    expect(isOverduePlus1h(now, duePast, 'archived')).toBe(false);
  });
});















