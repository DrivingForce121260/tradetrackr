/**
 * TradeTrackr - Time Ops Service
 *
 * Workstream F: Migrated to dataClient (Phase 1)
 *
 * Handles supervisor daily operations
 */

import { queryDocs, QueryFilter } from '@/services/dataClient';
import { getAccessToken } from '@/lib/auth/oidc-client';
import type { Punch } from './timeAdminService';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

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
  // Get all punches and filter for active ones
  const filters: QueryFilter[] = [
    { field: 'concernId', op: '==', value: concernId },
  ];

  const result = await queryDocs<Punch>('punches', filters, {
    limit: 100,
  });

  // Filter for active punches (no endAt)
  const activePunches = result.items
    .filter((doc) => !doc.data.endAt)
    .map((doc) => ({
      punchId: doc.doc_id,
      ...doc.data,
    }));

  // Build worker status list
  const workerStatuses: WorkerStatus[] = [];

  for (const punch of activePunches) {
    // In production, fetch user details from users collection
    const startAt = punch.startAt;
    const sinceDate = startAt
      ? new Date(startAt.seconds * 1000 + (startAt.nanoseconds || 0) / 1000000)
      : undefined;

    const status: WorkerStatus = {
      uid: punch.uid,
      displayName: punch.uid, // Would fetch from users/{uid}
      status: 'on', // Would check break status
      currentPunch: punch,
      projectId: punch.projectId,
      taskId: punch.taskId,
      siteId: punch.siteId,
      since: sinceDate,
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
  const sevenDaysAgoTs = {
    seconds: Math.floor(sevenDaysAgo.getTime() / 1000),
    nanoseconds: 0,
  };

  const filters: QueryFilter[] = [
    { field: 'concernId', op: '==', value: concernId },
    { field: 'startAt', op: '>', value: sevenDaysAgoTs },
  ];

  const result = await queryDocs<Punch>('punches', filters, {
    orderBy: { field: 'startAt', dir: 'desc' },
  });

  const punches = result.items.map((doc) => ({
    punchId: doc.doc_id,
    ...doc.data,
  }));

  // Check for exceptions
  for (const punch of punches) {
    // Missing end (>24h old)
    if (!punch.endAt && punch.startAt) {
      const startMs = punch.startAt.seconds * 1000 + (punch.startAt.nanoseconds || 0) / 1000000;
      const age = Date.now() - startMs;
      const hoursOld = age / (1000 * 60 * 60);

      if (hoursOld > 24) {
        exceptions.push({
          id: `missing_end_${punch.punchId}`,
          type: 'missing_end',
          punchId: punch.punchId,
          uid: punch.uid,
          description: `Schicht seit ${hoursOld.toFixed(1)}h offen`,
          severity: hoursOld > 48 ? 'high' : 'medium',
          createdAt: new Date(startMs),
        });
      }
    }

    // Excessive hours (>12h)
    if (punch.durationSec > 12 * 3600) {
      const startMs = punch.startAt
        ? punch.startAt.seconds * 1000 + (punch.startAt.nanoseconds || 0) / 1000000
        : Date.now();

      exceptions.push({
        id: `excessive_${punch.punchId}`,
        type: 'excessive_hours',
        punchId: punch.punchId,
        uid: punch.uid,
        description: `Schicht über 12h (${(punch.durationSec / 3600).toFixed(1)}h)`,
        severity: 'high',
        createdAt: new Date(startMs),
      });
    }
  }

  return exceptions;
}

// ==================== CALLABLE FUNCTIONS ====================

// These call the API functions endpoint

export async function approveItem(
  targetType: string,
  targetId: string,
  comment: string
): Promise<{ success: boolean }> {
  const token = await getAccessToken();

  const response = await fetch(`${API_BASE}/api/v1/functions/approveItem`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ targetType, targetId, comment }),
  });

  if (!response.ok) {
    throw new Error(`Approve failed: ${response.status}`);
  }

  return response.json();
}

export async function fixPunch(
  punchId: string,
  patch: Partial<Punch>
): Promise<{ success: boolean }> {
  const token = await getAccessToken();

  const response = await fetch(`${API_BASE}/api/v1/functions/fixPunch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ punchId, patch }),
  });

  if (!response.ok) {
    throw new Error(`Fix punch failed: ${response.status}`);
  }

  return response.json();
}

export async function generateReport(reportQuery: unknown): Promise<{ url: string }> {
  const token = await getAccessToken();

  const response = await fetch(`${API_BASE}/api/v1/functions/generateReport`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(reportQuery),
  });

  if (!response.ok) {
    throw new Error(`Generate report failed: ${response.status}`);
  }

  return response.json();
}
