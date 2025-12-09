/**
 * Core type definitions for TradeTrackr Field App (Lean Edition)
 * 
 * IMPORTANT: These types are compatible with the TradeTrackr portal schema.
 * The Field App operates on the SAME Firestore collections as the portal.
 * Any changes here should be coordinated with the portal team.
 */

// Basic ID types
export type ConcernId = string;
export type UserId = string;
export type ProjectId = string;
export type TaskId = string;
export type TimeEntryId = string;
export type PhotoId = string;
export type NoteId = string;
export type DayReportId = string;
export type AIMessageId = string;

// Firestore Timestamp
export interface Timestamp {
  seconds: number;
  nanoseconds: number;
}

// User
export interface User {
  id: UserId;
  concernID: ConcernId;
  email: string;
  name: string;
  role: 'field_tech' | 'manager' | 'admin';
  createdAt: Timestamp;
}

// Project
// Compatible with TradeTrackr portal schema
export interface Project {
  id: ProjectId;
  concernID: ConcernId;
  name: string;
  projectNumber?: string;
  status: 'active' | 'completed' | 'paused' | 'internal';
  
  // Manager & Assignment
  assignedManager?: string;
  managerId?: UserId;
  assignedUserIds: UserId[];
  
  // Customer Information
  customerName?: string;
  customerPhone?: string;
  customerReference?: string;
  customerId?: string;
  
  // Work Location
  workAddress?: string;
  workCity?: string;
  workPostalCode?: string;
  workAddressLocation?: string; // GPS coordinates or location description
  workLocationNotes?: string;
  
  // Contact & Category
  contactTel?: string;
  category?: string;
  
  // Dates
  createdAt: Timestamp;
  startDate?: Timestamp;
  endDate?: Timestamp;
  plannedEndDate?: Timestamp;
  
  // Legacy/Portal-compatibility fields
  address?: {
    street?: string;
    city?: string;
    zip?: string;
  };
  clientId?: string;
  siteName?: string;
  description?: string;
  budget?: number;
}

// Task
// Compatible with TradeTrackr portal schema
export interface Task {
  id: TaskId;
  concernID: ConcernId;
  projectId: ProjectId;
  title: string;
  description?: string;
  status: 'open' | 'in_progress' | 'done';
  dueDate?: Timestamp;
  assignedUserIds: UserId[];
  createdAt: Timestamp;
  
  // Portal-compatibility fields
  priority?: 'low' | 'medium' | 'high';
  estimatedHours?: number;
  completedAt?: Timestamp;
}

// TimeEntry
export interface TimeEntry {
  id: TimeEntryId;
  concernID: ConcernId;
  userId: UserId;
  projectId: ProjectId;
  taskId?: TaskId;
  start: Timestamp;
  end?: Timestamp;
  source: 'timer' | 'manual';
  confirmed: boolean;
  createdAt: Timestamp;
}

// Photo
export interface Photo {
  id: PhotoId;
  concernID: ConcernId;
  userId: UserId;
  projectId: ProjectId;
  taskId?: TaskId;
  storagePath: string;
  takenAt: Timestamp;
  gps?: {
    latitude: number;
    longitude: number;
  };
  createdAt: Timestamp;
}

// Note
export interface Note {
  id: NoteId;
  concernID: ConcernId;
  userId: UserId;
  projectId: ProjectId;
  taskId?: TaskId;
  text: string;
  source: 'manual' | 'ai_suggestion';
  createdAt: Timestamp;
}

// DayReport
export interface DayReport {
  id: DayReportId;
  concernID: ConcernId;
  userId: UserId;
  date: string; // YYYY-MM-DD
  totalHours: number;
  projectBreakdown: {
    projectId: ProjectId;
    hours: number;
  }[];
  tasksCompleted: number;
  photosCount: number;
  confirmedAt?: Timestamp;
  createdAt: Timestamp;
}

// WorkLine - Arbeitszeile für Reports
export interface WorkLine {
  id?: string;
  linenumber: number;
  reportID: string;
  component: string;
  workDone: string;
  quantity: number;
  hours: number;
  dateCreated: string;
  text: string;
  zusatz: string;
  activeProject: string;
  location: string;
  UIDAB: string;
  mitarbeiterID: string;
  mitarbeiterName?: string;
  activeprojectName: string;
  gewerk: string;
}

// ProjectReport - Vollständiger Bericht (kompatibel mit Webportal)
export interface ProjectReport {
  id?: string;
  reportNumber: string;
  employee: string;
  customer: string;
  projectNumber: string;
  workLocation: string;
  workDate: string; // YYYY-MM-DD
  totalHours: number;
  workDescription: string;
  status: 'pending' | 'approved' | 'rejected';
  
  // Mobile App Felder
  mitarbeiterID: string;
  projectReportNumber: string;
  reportData?: string; // CSV-Format der Arbeitszeilen (optional)
  reportDate: string; // YYYY-MM-DD
  signatureReference?: string;
  stadt?: string;
  concernID: ConcernId;
  
  // Arbeitszeilen als strukturierte Daten
  workLines: WorkLine[];
  
  // Projektinfo
  activeprojectName: string;
  location: string;
  
  // Firestore compatibility fields
  createdAt?: Timestamp | any;
  updatedAt?: Timestamp | any;
}

// AIMessage
export interface AIMessage {
  id: AIMessageId;
  concernID: ConcernId;
  userId: UserId;
  role: 'user' | 'assistant' | 'system';
  content: string;
  context?: {
    projectId?: ProjectId;
    taskId?: TaskId;
  };
  attachments?: {
    photoId?: PhotoId;
    url?: string;
    type?: string;
  }[];
  createdAt: Timestamp;
}

// AuthSession
export interface AuthSession {
  userId: UserId;
  concernID: ConcernId;
  email: string;
  token: string;
  expiresAt: number; // ms timestamp
}

// Firestore Collections
// DEPRECATED: Use TradeTrackrSchema from src/config/tradeTrackrSchema.ts instead
// This is kept for backwards compatibility only
export const COLLECTIONS = {
  tenants: 'tenants',
  users: 'users',
  projects: 'projects',
  tasks: 'tasks',
  timeEntries: 'timeEntries',
  photos: 'photos',
  notes: 'notes',
  reports: 'reports',
  aiMessages: 'aiMessages',
} as const;

