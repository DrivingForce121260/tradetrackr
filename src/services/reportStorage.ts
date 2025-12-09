/**
 * Report Storage Service
 * Stores reports locally in AsyncStorage for offline access and editing
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { ProjectReport, WorkLine } from '../types';

const REPORTS_STORAGE_KEY = '@local_reports';
const MAX_EDIT_HOURS = 36;

export interface LocalReport extends ProjectReport {
  localId: string;
  createdAt: number; // Unix timestamp in milliseconds
  lastModified: number;
  synced: boolean; // Whether it has been synced to Firestore
  firestoreId?: string; // Firestore document ID after sync
  canEdit: boolean; // Whether report can still be edited (within 36 hours)
}

/**
 * Get all local reports
 */
export async function getAllLocalReports(concernID: string): Promise<LocalReport[]> {
  try {
    const stored = await AsyncStorage.getItem(REPORTS_STORAGE_KEY);
    if (!stored) return [];

    const allReports: LocalReport[] = JSON.parse(stored);
    
    // Filter by concernID and calculate canEdit
    const now = Date.now();
    return allReports
      .filter(report => report.concernID === concernID)
      .map(report => ({
        ...report,
        canEdit: (now - report.createdAt) <= MAX_EDIT_HOURS * 60 * 60 * 1000,
      }))
      .sort((a, b) => b.createdAt - a.createdAt); // Newest first
  } catch (error) {
    console.error('Failed to load local reports:', error);
    return [];
  }
}

/**
 * Get a single local report by ID
 */
export async function getLocalReport(localId: string): Promise<LocalReport | null> {
  try {
    const reports = await getAllLocalReports('');
    return reports.find(r => r.localId === localId) || null;
  } catch (error) {
    console.error('Failed to get local report:', error);
    return null;
  }
}

/**
 * Save a report locally
 */
export async function saveLocalReport(
  report: Omit<ProjectReport, 'id' | 'createdAt' | 'updatedAt'>,
  firestoreId?: string
): Promise<LocalReport> {
  try {
    const stored = await AsyncStorage.getItem(REPORTS_STORAGE_KEY);
    const allReports: LocalReport[] = stored ? JSON.parse(stored) : [];

    const now = Date.now();
    const localReport: LocalReport = {
      ...report,
      localId: `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: now,
      lastModified: now,
      synced: !!firestoreId,
      firestoreId,
      canEdit: true,
    };

    allReports.push(localReport);
    await AsyncStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(allReports));

    return localReport;
  } catch (error) {
    console.error('Failed to save local report:', error);
    throw error;
  }
}

/**
 * Update a local report
 */
export async function updateLocalReport(
  localId: string,
  updates: Partial<ProjectReport>
): Promise<LocalReport | null> {
  try {
    const stored = await AsyncStorage.getItem(REPORTS_STORAGE_KEY);
    if (!stored) return null;

    const allReports: LocalReport[] = JSON.parse(stored);
    const index = allReports.findIndex(r => r.localId === localId);
    
    if (index === -1) return null;

    const now = Date.now();
    const report = allReports[index];
    
    // Check if report can still be edited
    const canEdit = (now - report.createdAt) <= MAX_EDIT_HOURS * 60 * 60 * 1000;
    if (!canEdit) {
      throw new Error('Report kann nicht mehr bearbeitet werden (36 Stunden abgelaufen)');
    }

    const updatedReport: LocalReport = {
      ...report,
      ...updates,
      lastModified: now,
      canEdit: true,
    };

    allReports[index] = updatedReport;
    await AsyncStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(allReports));

    return updatedReport;
  } catch (error) {
    console.error('Failed to update local report:', error);
    throw error;
  }
}

/**
 * Mark a report as synced
 */
export async function markReportSynced(localId: string, firestoreId: string): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(REPORTS_STORAGE_KEY);
    if (!stored) return;

    const allReports: LocalReport[] = JSON.parse(stored);
    const index = allReports.findIndex(r => r.localId === localId);
    
    if (index !== -1) {
      allReports[index].synced = true;
      allReports[index].firestoreId = firestoreId;
      await AsyncStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(allReports));
    }
  } catch (error) {
    console.error('Failed to mark report as synced:', error);
  }
}

/**
 * Delete a local report
 */
export async function deleteLocalReport(localId: string): Promise<boolean> {
  try {
    const stored = await AsyncStorage.getItem(REPORTS_STORAGE_KEY);
    if (!stored) return false;

    const allReports: LocalReport[] = JSON.parse(stored);
    const filtered = allReports.filter(r => r.localId !== localId);
    
    await AsyncStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(filtered));
    return true;
  } catch (error) {
    console.error('Failed to delete local report:', error);
    return false;
  }
}

/**
 * Check if a report can be edited (within 36 hours)
 */
export function canEditReport(report: LocalReport): boolean {
  const now = Date.now();
  return (now - report.createdAt) <= MAX_EDIT_HOURS * 60 * 60 * 1000;
}

/**
 * Get remaining edit time in hours
 */
export function getRemainingEditHours(report: LocalReport): number {
  const now = Date.now();
  const elapsed = now - report.createdAt;
  const remaining = MAX_EDIT_HOURS * 60 * 60 * 1000 - elapsed;
  return Math.max(0, Math.floor(remaining / (60 * 60 * 1000)));
}






