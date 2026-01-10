/**
 * Personnel Service
 *
 * Workstream F: Migrated to dataClient (Phase 1)
 *
 * Handles personnel management including vacation requests.
 */

import {
  queryDocs,
  getDoc,
  upsertDoc,
  serverTimestamp,
  QueryFilter,
} from '@/services/dataClient';
import { Personnel, VacationRequest, VacationRequestStatus, Qualification } from '@/types/personnel';

const COLLECTION = 'personnel';

export class PersonnelService {
  constructor(private concernID: string) {}

  async list(filter?: { role?: string; department?: string }): Promise<Personnel[]> {
    const filters: QueryFilter[] = [];

    if (filter?.role) {
      filters.push({ field: 'role', op: '==', value: filter.role });
    }
    if (filter?.department) {
      filters.push({ field: 'department', op: '==', value: filter.department });
    }

    const result = await queryDocs<Personnel>(COLLECTION, filters);
    return result.items.map((doc) => ({ id: doc.doc_id, ...doc.data }));
  }

  async get(id: string): Promise<Personnel | null> {
    const doc = await getDoc<Personnel>(COLLECTION, id);
    return doc ? { id: doc.doc_id, ...doc.data } : null;
  }

  async upsert(id: string, data: Partial<Personnel>): Promise<void> {
    await upsertDoc(COLLECTION, id, {
      ...data,
      concernID: this.concernID,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  }

  async requestVacation(
    empId: string,
    req: Omit<VacationRequest, 'id' | 'status' | 'createdAt'>
  ): Promise<string> {
    const emp = await this.get(empId);
    const id =
      (globalThis as unknown as { crypto?: { randomUUID?: () => string } }).crypto?.randomUUID?.() ||
      Math.random().toString(36).slice(2);

    const newReq: VacationRequest = {
      id,
      start: req.start,
      end: req.end,
      reason: req.reason,
      status: 'requested',
      createdAt: new Date(),
    } as VacationRequest;

    const list = [...(emp?.vacationRequests || []), newReq];
    await this.upsert(empId, { vacationRequests: list });
    return id;
  }

  private computeDays(start: Date, end: Date): number {
    const one = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
    const two = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
    return Math.max(0, Math.round((two - one) / (24 * 3600 * 1000)) + 1);
  }

  async decideVacation(
    empId: string,
    reqId: string,
    action: 'approve' | 'reject' | 'cancel',
    approverId: string
  ): Promise<void> {
    const emp = await this.get(empId);
    if (!emp) return;

    const requests = [...(emp.vacationRequests || [])];
    const idx = requests.findIndex((r) => r.id === reqId);
    if (idx < 0) return;

    const req = requests[idx];
    let status: VacationRequestStatus = req.status;

    if (action === 'approve') status = 'approved';
    if (action === 'reject') status = 'rejected';
    if (action === 'cancel') status = 'cancelled';

    requests[idx] = { ...req, status, approvedBy: approverId };

    let balance = emp.vacationBalance || 0;

    if (action === 'approve') {
      const days = this.computeDays(new Date(req.start as unknown as string), new Date(req.end as unknown as string));
      if (balance < days) throw new Error('Insufficient balance');
      balance -= days;
    }

    if (action === 'reject' || action === 'cancel') {
      // If previously approved, restore balance
      if (req.status === 'approved') {
        const days = this.computeDays(new Date(req.start as unknown as string), new Date(req.end as unknown as string));
        balance += days;
      }
    }

    await this.upsert(empId, { vacationRequests: requests, vacationBalance: balance });
  }

  async addQualification(empId: string, q: Qualification): Promise<void> {
    const emp = await this.get(empId);
    const list = [...(emp?.qualifications || []), q];
    await this.upsert(empId, { qualifications: list });
  }
}

/**
 * Create a PersonnelService instance
 */
export function createPersonnelService(concernID: string): PersonnelService {
  return new PersonnelService(concernID);
}
