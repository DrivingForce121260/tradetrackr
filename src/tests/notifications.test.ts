import { NotificationsService } from '@/services/notificationsService';

// Mock Firestore
jest.mock('@/config/firebase', () => ({ db: {} }));
jest.mock('firebase/firestore', () => {
  return {
    collection: () => ({}),
    query: () => ({}),
    where: () => ({}),
    orderBy: () => ({}),
    limit: () => ({}),
    getDocs: async () => ({ docs: [{ id: 'n1', data: ()=>({ recipients:['U1'], title:'T', body:'B', readBy:[] }) }]}),
    doc: () => ({}),
    updateDoc: async () => {},
  };
});

describe('NotificationsService', () => {
  test('listRecent returns items', async () => {
    const svc = new NotificationsService('U1');
    const res = await svc.listRecent();
    expect(res.length).toBeGreaterThan(0);
  });

  test('markRead does not throw', async () => {
    const svc = new NotificationsService('U1');
    await expect(svc.markRead('n1')).resolves.not.toThrow();
  });
});

// Pure cutoff logic test (simulate 90-day rule)
function isOlderThan(days: number, createdAt: Date, now = new Date()): boolean {
  return (now.getTime() - createdAt.getTime()) > days * 24 * 3600 * 1000;
}

describe('Notification cleanup logic', () => {
  test('older than 90 days returns true', () => {
    const now = new Date('2025-10-30T10:00:00Z');
    const old = new Date('2025-07-30T10:00:00Z');
    expect(isOlderThan(90, old, now)).toBe(true);
  });
});















