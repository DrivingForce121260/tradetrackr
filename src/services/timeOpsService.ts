/**
 * TradeTrackr - Time Ops Service
 * Handles supervisor daily operations
 */

import { db } from '../config/firebase';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import type { Punch } from './timeAdminService';

// ==================== TYPES ====================

export interface WorkerStatus {
  uid: string;
  displayName: string;
  status: 'on' | 'break' | 'off';
  currentPunch?: Punch;
  projectId?: string;
  taskId?: string;
  siteId?: string;
  since?: Date;
  lastGPSAccuracy?: number;
  lastLocation?: { lat: number; lng: number };
}

export interface Exception {
  id: string;
  type: 'overlap' | 'missing_end' | 'out_of_geofence' | 'excessive_hours';
  punchId: string;
  uid: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  createdAt: Date;
}

// ==================== LIVE VIEW ====================

export async function getActiveWorkers(concernId: string): Promise<WorkerStatus[]> {
  // Get all active punches
  const punchesQuery = query(
    collection(db, 'punches'),
    where('concernId', '==', concernId),
    where('endAt', '==', null)
  );

  const punchesSnapshot = await getDocs(punchesQuery);
  const activePunches = punchesSnapshot.docs.map((doc) => ({
    punchId: doc.id,
    ...doc.data(),
  })) as Punch[];

  // Build worker status list
  const workerStatuses: WorkerStatus[] = [];

  for (const punch of activePunches) {
    // In production, fetch user details from users collection
    const status: WorkerStatus = {
      uid: punch.uid,
      displayName: punch.uid, // Would fetch from users/{uid}
      status: 'on', // Would check break status
      currentPunch: punch,
      projectId: punch.projectId,
      taskId: punch.taskId,
      siteId: punch.siteId,
      since: punch.startAt.toDate(),
      lastGPSAccuracy: punch.locationStart?.acc,
      lastLocation: punch.locationStart,
    };

    workerStatuses.push(status);
  }

  return workerStatuses;
}

// ==================== EXCEPTIONS ====================

export async function getExceptions(concernId: string): Promise<Exception[]> {
  const exceptions: Exception[] = [];

  // Get all punches from last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const punchesQuery = query(
    collection(db, 'punches'),
    where('concernId', '==', concernId),
    where('startAt', '>', Timestamp.fromDate(sevenDaysAgo)),
    orderBy('startAt', 'desc')
  );

  const snapshot = await getDocs(punchesQuery);
  const punches = snapshot.docs.map((doc) => ({
    punchId: doc.id,
    ...doc.data(),
  })) as Punch[];

  // Check for exceptions
  for (const punch of punches) {
    // Missing end (>24h old)
    if (!punch.endAt) {
      const age = Date.now() - punch.startAt.toDate().getTime();
      const hoursOld = age / (1000 * 60 * 60);
      
      if (hoursOld > 24) {
        exceptions.push({
          id: `missing_end_${punch.punchId}`,
          type: 'missing_end',
          punchId: punch.punchId,
          uid: punch.uid,
          description: `Schicht seit ${hoursOld.toFixed(1)}h offen`,
          severity: hoursOld > 48 ? 'high' : 'medium',
          createdAt: punch.startAt.toDate(),
        });
      }
    }

    // Excessive hours (>12h)
    if (punch.durationSec > 12 * 3600) {
      exceptions.push({
        id: `excessive_${punch.punchId}`,
        type: 'excessive_hours',
        punchId: punch.punchId,
        uid: punch.uid,
        description: `Schicht über 12h (${(punch.durationSec / 3600).toFixed(1)}h)`,
        severity: 'high',
        createdAt: punch.startAt.toDate(),
      });
    }
  }

  return exceptions;
}

// ==================== CALLABLE FUNCTIONS ====================

// These would call Firebase Cloud Functions via httpsCallable
// For MVP, placeholder implementations

export async function approveItem(
  targetType: string,
  targetId: string,
  comment: string
): Promise<{ success: boolean }> {
  // In production: httpsCallable(functions, 'approveItem')({ targetType, targetId, comment })
  console.log('Approve:', targetType, targetId, comment);
  return { success: true };
}

export async function fixPunch(
  punchId: string,
  patch: Partial<Punch>
): Promise<{ success: boolean }> {
  // In production: httpsCallable(functions, 'fixPunch')({ punchId, patch })
  console.log('Fix punch:', punchId, patch);
  return { success: true };
}

export async function generateReport(query: any): Promise<{ url: string }> {
  // In production: httpsCallable(functions, 'generateReport')(query)
  console.log('Generate report:', query);
  return { url: 'https://example.com/report.csv' };
}
















