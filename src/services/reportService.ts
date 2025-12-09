import { httpsCallable } from 'firebase/functions';
import { collection, addDoc, doc, getDoc, getDocs, query, where, orderBy, limit, updateDoc } from 'firebase/firestore';
import { db, functions } from '@/config/firebase';
import type { ExecuteReportRequest, ExecuteReportResponse, ReportSchedule, ReportTemplate } from '@/types/reporting';

export async function runReport(input: ExecuteReportRequest): Promise<ExecuteReportResponse> {
  const call = httpsCallable(functions, 'executeReport');
  const res = await call(input as any);
  return (res.data as any) as ExecuteReportResponse;
}

export async function createTemplate(t: ReportTemplate) {
  const ref = await addDoc(collection(db, 'reportTemplates'), {
    ...t,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  return ref.id;
}

export async function updateTemplate(id: string, data: Partial<ReportTemplate>) {
  await updateDoc(doc(db, 'reportTemplates', id), { ...data, updatedAt: Date.now() });
}

export async function listTemplates(concernID: string) {
  const q = query(collection(db, 'reportTemplates'), where('concernID', '==', concernID), orderBy('updatedAt', 'desc'), limit(100));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as ReportTemplate[];
}

export async function getTemplate(id: string) {
  const s = await getDoc(doc(db, 'reportTemplates', id));
  return s.exists() ? ({ id: s.id, ...(s.data() as any) } as ReportTemplate) : null;
}

export async function createSchedule(templateId: string, schedule: ReportSchedule & { createdBy: string; concernID: string }) {
  const ref = await addDoc(collection(db, 'scheduledReports'), {
    templateId,
    ...schedule,
    nextRunAt: schedule.nextRunAt || Date.now(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  return ref.id;
}

export async function exportReportFile(template: ReportTemplate, format: 'csv' | 'pdf' | 'html') {
  const call = httpsCallable(functions, 'exportReport');
  const res = await call({ template, format } as any);
  return (res.data as any) as { url: string; path: string };
}


