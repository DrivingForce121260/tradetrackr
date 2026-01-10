/**
 * Report Service
 *
 * Workstream F: Migrated to dataClient (Phase 1)
 *
 * Handles report template CRUD and execution.
 */

import {
  queryDocs,
  getDoc,
  addDoc,
  updateDoc,
  QueryFilter,
} from '@/services/dataClient';
import { getAccessToken } from '@/lib/auth/oidc-client';
import type {
  ExecuteReportRequest,
  ExecuteReportResponse,
  ReportSchedule,
  ReportTemplate,
} from '@/types/reporting';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

/**
 * Execute a report via the API functions endpoint
 */
export async function runReport(input: ExecuteReportRequest): Promise<ExecuteReportResponse> {
  const token = await getAccessToken();

  const response = await fetch(`${API_BASE}/api/v1/functions/executeReport`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(`Report execution failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Create a new report template
 */
export async function createTemplate(t: ReportTemplate): Promise<string> {
  const doc = await addDoc('reportTemplates', {
    ...t,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  return doc.doc_id;
}

/**
 * Update an existing report template
 */
export async function updateTemplate(id: string, data: Partial<ReportTemplate>): Promise<void> {
  await updateDoc('reportTemplates', id, {
    ...data,
    updatedAt: Date.now(),
  });
}

/**
 * List all report templates for a concern
 */
export async function listTemplates(concernID: string): Promise<ReportTemplate[]> {
  const filters: QueryFilter[] = [
    { field: 'concernID', op: '==', value: concernID },
  ];

  const result = await queryDocs<ReportTemplate>('reportTemplates', filters, {
    orderBy: { field: 'updatedAt', dir: 'desc' },
    limit: 100,
  });

  return result.items.map((doc) => ({
    id: doc.doc_id,
    ...doc.data,
  }));
}

/**
 * Get a single report template by ID
 */
export async function getTemplate(id: string): Promise<ReportTemplate | null> {
  const doc = await getDoc<ReportTemplate>('reportTemplates', id);
  if (!doc) return null;

  return {
    id: doc.doc_id,
    ...doc.data,
  };
}

/**
 * Create a scheduled report
 */
export async function createSchedule(
  templateId: string,
  schedule: ReportSchedule & { createdBy: string; concernID: string }
): Promise<string> {
  const doc = await addDoc('scheduledReports', {
    templateId,
    ...schedule,
    nextRunAt: schedule.nextRunAt || Date.now(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  return doc.doc_id;
}

/**
 * Export a report to file format via the API
 */
export async function exportReportFile(
  template: ReportTemplate,
  format: 'csv' | 'pdf' | 'html'
): Promise<{ url: string; path: string }> {
  const token = await getAccessToken();

  const response = await fetch(`${API_BASE}/api/v1/functions/exportReport`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ template, format }),
  });

  if (!response.ok) {
    throw new Error(`Report export failed: ${response.status}`);
  }

  return response.json();
}
