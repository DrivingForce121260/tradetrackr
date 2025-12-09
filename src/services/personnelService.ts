import { db } from '@/config/firebase';
import { doc, collection, getDoc, getDocs, query, where, updateDoc, setDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { Personnel, VacationRequest, VacationRequestStatus, Qualification } from '@/types/personnel';

export class PersonnelService {
  constructor(private concernID: string) {}

  private col() {
    return collection(db as any, 'personnel');
  }

  async list(filter?: { role?: string; department?: string }) : Promise<Personnel[]> {
    let q: any = this.col();
    const qs: any[] = [];
    if (filter?.role) qs.push(where('role','==',filter.role));
    if (filter?.department) qs.push(where('department','==',filter.department));
    if (qs.length) q = query(this.col(), ...qs);
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
  }

  async get(id: string): Promise<Personnel | null> {
    const ref = doc(this.col(), id);
    const snap = await getDoc(ref);
    return snap.exists() ? ({ id: snap.id, ...(snap.data() as any) }) : null;
  }

  async upsert(id: string, data: Partial<Personnel>): Promise<void> {
    const ref = doc(this.col(), id);
    await setDoc(ref, { ...data, concernID: this.concernID, updatedAt: serverTimestamp() }, { merge: true });
  }

  async requestVacation(empId: string, req: Omit<VacationRequest,'id'|'status'|'createdAt'>): Promise<string> {
    const pid = empId;
    const emp = await this.get(pid);
    const id = (globalThis as any).crypto?.randomUUID ? (globalThis as any).crypto.randomUUID() : Math.random().toString(36).slice(2);
    const newReq: VacationRequest = { id, start: req.start, end: req.end, reason: req.reason, status: 'requested', createdAt: new Date() } as any;
    const list = [ ...(emp?.vacationRequests||[]), newReq ];
    await this.upsert(pid, { vacationRequests: list });
    return id;
  }

  private computeDays(start: Date, end: Date): number {
    const one = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
    const two = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
    return Math.max(0, Math.round((two - one) / (24*3600*1000)) + 1);
  }

  async decideVacation(empId: string, reqId: string, action: 'approve'|'reject'|'cancel', approverId: string): Promise<void> {
    const emp = await this.get(empId);
    if (!emp) return;
    const requests = [...(emp.vacationRequests||[])];
    const idx = requests.findIndex(r=>r.id===reqId);
    if (idx<0) return;
    const req = requests[idx];
    let status: VacationRequestStatus = req.status;
    if (action==='approve') status = 'approved';
    if (action==='reject') status = 'rejected';
    if (action==='cancel') status = 'cancelled';
    requests[idx] = { ...req, status, approvedBy: approverId };

    let balance = emp.vacationBalance || 0;
    if (action==='approve') {
      const days = this.computeDays(new Date(req.start as any), new Date(req.end as any));
      if (balance < days) throw new Error('Insufficient balance');
      balance -= days;
    }
    if (action==='reject' || action==='cancel') {
      // if previously approved, restore
      if (req.status==='approved') {
        const days = this.computeDays(new Date(req.start as any), new Date(req.end as any));
        balance += days;
      }
    }
    await this.upsert(empId, { vacationRequests: requests, vacationBalance: balance });
  }

  async addQualification(empId: string, q: Qualification): Promise<void> {
    const emp = await this.get(empId);
    const list = [ ...(emp?.qualifications||[]), q ];
    await this.upsert(empId, { qualifications: list });
  }
}


