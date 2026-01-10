/**
 * TradeTrackr - Time Admin Service
 *
 * Workstream F: Migrated to dataClient (Phase 1)
 *
 * Handles all time tracking admin operations
 */

import {
  queryDocs,
  getDoc,
  addDoc,
  upsertDoc,
  updateDoc,
  deleteDoc,
  QueryFilter,
} from '@/services/dataClient';

// ==================== TYPES ====================

export interface Punch {
  punchId: string;
  uid: string;
  periodId: string;
  projectId: string;
  taskId?: string;
  siteId?: string;
  startAt: { seconds: number; nanoseconds: number };
  endAt?: { seconds: number; nanoseconds: number };
  durationSec: number;
  method: 'manual' | 'geofence' | 'qr' | 'nfc';
  locationStart?: { lat: number; lng: number; acc?: number };
  locationEnd?: { lat: number; lng: number; acc?: number };
  breakSec: number;
  notes?: string;
  attachments?: string[];
  supervisorNote?: string;
  audit: {
    createdBy: string;
    createdAt: { seconds: number; nanoseconds: number };
    updatedBy?: string;
    updatedAt?: { seconds: number; nanoseconds: number };
  };
  concernId: string;
}

export interface Timesheet {
  periodId: string;
  uid: string;
  startDate: { seconds: number; nanoseconds: number };
  endDate: { seconds: number; nanoseconds: number };
  status: 'open' | 'submitted' | 'approved' | 'locked';
  totals: {
    hours: number;
    overtime: number;
    billableHours: number;
  };
  submittedBy?: string;
  submittedAt?: { seconds: number; nanoseconds: number };
  approvedBy?: string;
  approvedAt?: { seconds: number; nanoseconds: number };
  rejectedBy?: string;
  rejectedAt?: { seconds: number; nanoseconds: number };
  rejectionReason?: string;
  concernId: string;
}

export interface Site {
  siteId: string;
  name: string;
  geo: { lat: number; lng: number };
  radiusMeters: number;
  projectIds: string[];
  concernId: string;
  qrCode?: string;
  nfcTagId?: string;
  active: boolean;
}

export interface Leave {
  leaveId: string;
  uid: string;
  type: 'vacation' | 'sick' | 'unpaid' | 'other';
  startDate: { seconds: number; nanoseconds: number };
  endDate: { seconds: number; nanoseconds: number };
  days: number;
  reason?: string;
  status: 'requested' | 'approved' | 'rejected' | 'cancelled';
  approvedBy?: string;
  approvedAt?: { seconds: number; nanoseconds: number };
  rejectedBy?: string;
  rejectedAt?: { seconds: number; nanoseconds: number };
  rejectionReason?: string;
  requestedAt: { seconds: number; nanoseconds: number };
  concernId: string;
}

// ==================== PUNCHES ====================

export async function getAllPunches(concernId: string): Promise<Punch[]> {
  const filters: QueryFilter[] = [
    { field: 'concernId', op: '==', value: concernId },
  ];

  const result = await queryDocs<Punch>('punches', filters, {
    orderBy: { field: 'startAt', dir: 'desc' },
    limit: 100,
  });

  return result.items.map((doc) => ({
    punchId: doc.doc_id,
    ...doc.data,
  }));
}

export async function getActivePunches(concernId: string): Promise<Punch[]> {
  // Fetch punches and filter for those without endAt
  const filters: QueryFilter[] = [
    { field: 'concernId', op: '==', value: concernId },
  ];

  const result = await queryDocs<Punch>('punches', filters, {
    limit: 100,
  });

  // Filter for active punches (no endAt)
  return result.items
    .filter((doc) => !doc.data.endAt)
    .map((doc) => ({
      punchId: doc.doc_id,
      ...doc.data,
    }));
}

export async function getPunchesByUser(uid: string, concernId: string): Promise<Punch[]> {
  const filters: QueryFilter[] = [
    { field: 'uid', op: '==', value: uid },
    { field: 'concernId', op: '==', value: concernId },
  ];

  const result = await queryDocs<Punch>('punches', filters, {
    orderBy: { field: 'startAt', dir: 'desc' },
    limit: 50,
  });

  return result.items.map((doc) => ({
    punchId: doc.doc_id,
    ...doc.data,
  }));
}

// ==================== TIMESHEETS ====================

export async function getTimesheetsByUser(uid: string): Promise<Timesheet[]> {
  // Timesheets are stored in the timesheets collection with uid field
  const filters: QueryFilter[] = [
    { field: 'uid', op: '==', value: uid },
  ];

  const result = await queryDocs<Timesheet>('timesheets', filters, {
    orderBy: { field: 'startDate', dir: 'desc' },
  });

  return result.items.map((doc) => ({
    periodId: doc.doc_id,
    ...doc.data,
  }));
}

export async function getTimesheet(uid: string, periodId: string): Promise<Timesheet | null> {
  const doc = await getDoc<Timesheet>('timesheets', periodId);

  if (!doc || doc.data.uid !== uid) return null;

  return {
    periodId: doc.doc_id,
    ...doc.data,
  };
}

export async function getPendingTimesheets(concernId: string): Promise<Timesheet[]> {
  const filters: QueryFilter[] = [
    { field: 'concernId', op: '==', value: concernId },
    { field: 'status', op: '==', value: 'submitted' },
  ];

  const result = await queryDocs<Timesheet>('timesheets', filters, {
    orderBy: { field: 'startDate', dir: 'desc' },
  });

  return result.items.map((doc) => ({
    periodId: doc.doc_id,
    ...doc.data,
  }));
}

// ==================== SITES ====================

export async function getAllSites(concernId: string): Promise<Site[]> {
  const filters: QueryFilter[] = [
    { field: 'concernId', op: '==', value: concernId },
  ];

  const result = await queryDocs<Site>('sites', filters, {
    orderBy: { field: 'name', dir: 'asc' },
  });

  return result.items.map((doc) => ({
    siteId: doc.doc_id,
    ...doc.data,
  }));
}

export async function getSite(siteId: string): Promise<Site | null> {
  const doc = await getDoc<Site>('sites', siteId);

  if (!doc) return null;

  return {
    siteId: doc.doc_id,
    ...doc.data,
  };
}

export async function createSite(site: Omit<Site, 'siteId'>): Promise<string> {
  const doc = await addDoc('sites', site);
  return doc.doc_id;
}

export async function updateSite(siteId: string, data: Partial<Site>): Promise<void> {
  await updateDoc('sites', siteId, data);
}

export async function deleteSite(siteId: string): Promise<void> {
  await deleteDoc('sites', siteId);
}

// ==================== LEAVE ====================

export async function getAllLeaveRequests(concernId: string): Promise<Leave[]> {
  const filters: QueryFilter[] = [
    { field: 'concernId', op: '==', value: concernId },
  ];

  const result = await queryDocs<Leave>('leave', filters, {
    orderBy: { field: 'requestedAt', dir: 'desc' },
    limit: 100,
  });

  return result.items.map((doc) => ({
    leaveId: doc.doc_id,
    ...doc.data,
  }));
}

export async function getPendingLeave(concernId: string): Promise<Leave[]> {
  const filters: QueryFilter[] = [
    { field: 'concernId', op: '==', value: concernId },
    { field: 'status', op: '==', value: 'requested' },
  ];

  const result = await queryDocs<Leave>('leave', filters, {
    orderBy: { field: 'requestedAt', dir: 'desc' },
  });

  return result.items.map((doc) => ({
    leaveId: doc.doc_id,
    ...doc.data,
  }));
}

// ==================== STATISTICS ====================

export interface DashboardStats {
  activePunches: number;
  pendingTimesheets: number;
  pendingLeave: number;
  totalHoursToday: number;
  totalHoursWeek: number;
  activeUsers: number;
}

export async function getDashboardStats(concernId: string): Promise<DashboardStats> {
  // Get active punches
  const activePunches = await getActivePunches(concernId);

  // Get pending timesheets
  const pendingTimesheets = await getPendingTimesheets(concernId);

  // Get pending leave
  const pendingLeave = await getPendingLeave(concernId);

  // For MVP, return basic stats
  // In production, use aggregation queries or cloud functions
  return {
    activePunches: activePunches.length,
    pendingTimesheets: pendingTimesheets.length,
    pendingLeave: pendingLeave.length,
    totalHoursToday: 0, // Would require date filtering
    totalHoursWeek: 0, // Would require date filtering
    activeUsers: new Set(activePunches.map((p) => p.uid)).size,
  };
}
