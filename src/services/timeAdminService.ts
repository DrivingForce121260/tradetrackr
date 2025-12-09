/**
 * TradeTrackr - Time Admin Service
 * Handles all time tracking admin operations
 */

import { db } from '../config/firebase';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  QueryConstraint,
} from 'firebase/firestore';

// ==================== TYPES ====================

export interface Punch {
  punchId: string;
  uid: string;
  periodId: string;
  projectId: string;
  taskId?: string;
  siteId?: string;
  startAt: Timestamp;
  endAt?: Timestamp;
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
    createdAt: Timestamp;
    updatedBy?: string;
    updatedAt?: Timestamp;
  };
  concernId: string;
}

export interface Timesheet {
  periodId: string;
  uid: string;
  startDate: Timestamp;
  endDate: Timestamp;
  status: 'open' | 'submitted' | 'approved' | 'locked';
  totals: {
    hours: number;
    overtime: number;
    billableHours: number;
  };
  submittedBy?: string;
  submittedAt?: Timestamp;
  approvedBy?: string;
  approvedAt?: Timestamp;
  rejectedBy?: string;
  rejectedAt?: Timestamp;
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
  startDate: Timestamp;
  endDate: Timestamp;
  days: number;
  reason?: string;
  status: 'requested' | 'approved' | 'rejected' | 'cancelled';
  approvedBy?: string;
  approvedAt?: Timestamp;
  rejectedBy?: string;
  rejectedAt?: Timestamp;
  rejectionReason?: string;
  requestedAt: Timestamp;
  concernId: string;
}

// ==================== PUNCHES ====================

export async function getAllPunches(concernId: string): Promise<Punch[]> {
  const q = query(
    collection(db, 'punches'),
    where('concernId', '==', concernId),
    orderBy('startAt', 'desc'),
    limit(100)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    punchId: doc.id,
    ...doc.data(),
  })) as Punch[];
}

export async function getActivePunches(concernId: string): Promise<Punch[]> {
  const q = query(
    collection(db, 'punches'),
    where('concernId', '==', concernId),
    where('endAt', '==', null)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    punchId: doc.id,
    ...doc.data(),
  })) as Punch[];
}

export async function getPunchesByUser(
  uid: string,
  concernId: string
): Promise<Punch[]> {
  const q = query(
    collection(db, 'punches'),
    where('uid', '==', uid),
    where('concernId', '==', concernId),
    orderBy('startAt', 'desc'),
    limit(50)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    punchId: doc.id,
    ...doc.data(),
  })) as Punch[];
}

// ==================== TIMESHEETS ====================

export async function getTimesheetsByUser(uid: string): Promise<Timesheet[]> {
  const periodsRef = collection(db, 'timesheets', uid, 'periods');
  const snapshot = await getDocs(query(periodsRef, orderBy('startDate', 'desc')));

  return snapshot.docs.map((doc) => ({
    periodId: doc.id,
    ...doc.data(),
  })) as Timesheet[];
}

export async function getTimesheet(
  uid: string,
  periodId: string
): Promise<Timesheet | null> {
  const docRef = doc(db, 'timesheets', uid, 'periods', periodId);
  const snapshot = await getDoc(docRef);

  if (!snapshot.exists()) return null;

  return {
    periodId: snapshot.id,
    ...snapshot.data(),
  } as Timesheet;
}

export async function getPendingTimesheets(
  concernId: string
): Promise<Timesheet[]> {
  // Note: This requires a collection group query
  // For now, we'll need to query by users and aggregate
  // In production, use a cloud function or collection group
  return [];
}

// ==================== SITES ====================

export async function getAllSites(concernId: string): Promise<Site[]> {
  const q = query(
    collection(db, 'sites'),
    where('concernId', '==', concernId),
    orderBy('name', 'asc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    siteId: doc.id,
    ...doc.data(),
  })) as Site[];
}

export async function getSite(siteId: string): Promise<Site | null> {
  const docRef = doc(db, 'sites', siteId);
  const snapshot = await getDoc(docRef);

  if (!snapshot.exists()) return null;

  return {
    siteId: snapshot.id,
    ...snapshot.data(),
  } as Site;
}

export async function createSite(site: Omit<Site, 'siteId'>): Promise<string> {
  const docRef = doc(collection(db, 'sites'));
  await setDoc(docRef, site);
  return docRef.id;
}

export async function updateSite(siteId: string, data: Partial<Site>): Promise<void> {
  const docRef = doc(db, 'sites', siteId);
  await updateDoc(docRef, data as any);
}

export async function deleteSite(siteId: string): Promise<void> {
  const docRef = doc(db, 'sites', siteId);
  await deleteDoc(docRef);
}

// ==================== LEAVE ====================

export async function getAllLeaveRequests(concernId: string): Promise<Leave[]> {
  const q = query(
    collection(db, 'leave'),
    where('concernId', '==', concernId),
    orderBy('requestedAt', 'desc'),
    limit(100)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    leaveId: doc.id,
    ...doc.data(),
  })) as Leave[];
}

export async function getPendingLeave(concernId: string): Promise<Leave[]> {
  const q = query(
    collection(db, 'leave'),
    where('concernId', '==', concernId),
    where('status', '==', 'requested'),
    orderBy('requestedAt', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    leaveId: doc.id,
    ...doc.data(),
  })) as Leave[];
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

export async function getDashboardStats(
  concernId: string
): Promise<DashboardStats> {
  // Get active punches
  const activePunches = await getActivePunches(concernId);

  // For MVP, return basic stats
  // In production, use aggregation queries or cloud functions
  return {
    activePunches: activePunches.length,
    pendingTimesheets: 0, // Would need collection group query
    pendingLeave: 0, // Would need query
    totalHoursToday: 0,
    totalHoursWeek: 0,
    activeUsers: 0,
  };
}
















