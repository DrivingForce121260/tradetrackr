import { PersonnelService } from '@/services/personnelService';

// Mock Firestore deps used in service via config/firebase if needed by jest config
jest.mock('@/config/firebase', () => ({ db: {} }));

// Provide a minimal in-memory mock for service methods used (override inside test)

describe('Vacation approval logic', () => {
  test('approve reduces balance; reject restores if previously approved', async () => {
    const svc = new PersonnelService('C1') as any;
    const store: any = {
      id: 'E1', concernID: 'C1', vacationBalance: 10, vacationRequests: []
    };
    svc.get = async () => store;
    svc.upsert = async (_id: string, data: any) => { Object.assign(store, data); };

    const reqId = await svc.requestVacation('E1', { start: new Date('2025-08-01'), end: new Date('2025-08-05'), reason: 'Sommer' });
    expect(store.vacationRequests.length).toBe(1);
    expect(store.vacationRequests[0].status).toBe('requested');

    await svc.decideVacation('E1', reqId, 'approve', 'U2');
    expect(store.vacationBalance).toBe(5); // 5 Tage abgezogen (inklusive Grenzen)
    expect(store.vacationRequests[0].status).toBe('approved');

    await svc.decideVacation('E1', reqId, 'reject', 'U2');
    expect(store.vacationBalance).toBe(10); // wiederhergestellt
    expect(store.vacationRequests[0].status).toBe('rejected');
  });

  test('cannot approve if insufficient balance', async () => {
    const svc = new PersonnelService('C1') as any;
    const store: any = { id: 'E2', concernID: 'C1', vacationBalance: 1, vacationRequests: [] };
    svc.get = async () => store;
    svc.upsert = async (_id: string, data: any) => { Object.assign(store, data); };
    const reqId = await svc.requestVacation('E2', { start: new Date('2025-08-01'), end: new Date('2025-08-03'), reason: '' });
    await expect(svc.decideVacation('E2', reqId, 'approve', 'U2')).rejects.toThrow('Insufficient balance');
  });
});


