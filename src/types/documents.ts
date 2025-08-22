// ============================================================================
// DOCUMENT MANAGEMENT INTERFACES AND TYPES
// ============================================================================

import { Timestamp } from 'firebase/firestore';

// Basis-Dokument-Interface
export interface Document {
  id: string;
  concernID: string;
  projectId: string;
  
  // Metadaten
  fileName: string;
  displayName: string;
  description?: string;
  category: string;
  tags: string[];
  
  // Datei-Informationen
  fileType: string;
  fileExtension: string;
  fileSize: number;
  originalFileName: string;
  
  // Storage-Referenzen
  storagePath: string;
  downloadUrl: string;
  thumbnailUrl?: string;
  
  // Zugriffskontrolle
  accessLevel: 'public' | 'restricted' | 'admin';
  allowedRoles: string[];
  isPublic: boolean;
  
  // Audit-Trail
  uploadedBy: string;
  uploadedByEmail: string;
  uploadDate: Date;
  lastModified: Date;
  version: number;
  
  // Projekt-spezifische Felder
  projectPhase?: string;
  documentType: 'drawing' | 'contract' | 'photo' | 'report' | 'other';
  priority: 'low' | 'medium' | 'high';
  
  // Suchoptimierung
  searchableText?: string;
  fullTextSearch: string[];
}

// Dokument-Kategorie
export interface DocumentCategory {
  id: string;
  concernID: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  allowedFileTypes: string[];
  maxFileSize: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Dokument-Berechtigung
export interface DocumentPermission {
  id: string;
  documentId: string;
  concernID: string;
  userId: string;
  permission: 'read' | 'write' | 'delete' | 'admin';
  grantedBy: string;
  grantedAt: Date;
  expiresAt?: Date;
}

// Upload-Fortschritt
export interface UploadProgress {
  fileName: string;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  error?: string;
}

// Upload-Ergebnis
export interface DocumentUploadResult {
  status: 'success' | 'error';
  documentId?: string;
  downloadUrl?: string;
  thumbnailUrl?: string;
  error?: string;
}

// Dokument-Formular-Daten
export interface DocumentFormData {
  displayName: string;
  description: string;
  category: string;
  tags: string[];
  accessLevel: 'public' | 'restricted' | 'admin';
  allowedRoles: string[];
  isPublic: boolean;
  projectPhase?: string;
  documentType: 'drawing' | 'contract' | 'photo' | 'report' | 'other';
  priority: 'low' | 'medium' | 'high';
}

// Dokument-Filter
export interface DocumentFilter {
  category?: string;
  documentType?: string;
  priority?: string;
  projectPhase?: string;
  searchTerm?: string;
  dateFrom?: Date;
  dateTo?: Date;
  uploadedBy?: string;
}

// Dokument-Sortierung
export type DocumentSortField = 'displayName' | 'uploadDate' | 'lastModified' | 'fileSize' | 'priority';
export type DocumentSortOrder = 'asc' | 'desc';

// Dokument-View-Modus
export type DocumentViewMode = 'grid' | 'list' | 'table';

// Datei-Upload-Status
export type FileUploadStatus = 'idle' | 'uploading' | 'success' | 'error';

// Datei-Upload-Item
export interface FileUploadItem {
  id: string;
  file: File;
  status: FileUploadStatus;
  progress: number;
  error?: string;
  result?: DocumentUploadResult;
}

// Dokument-Aktionen
export interface DocumentAction {
  id: string;
  label: string;
  icon: string;
  action: () => void;
  disabled?: boolean;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
}

// Dokument-Statistiken
export interface DocumentStats {
  totalDocuments: number;
  totalSize: number;
  documentsByCategory: Record<string, number>;
  documentsByType: Record<string, number>;
  recentUploads: number;
  storageUsed: number;
  storageLimit: number;
}

// Dokument-Version
export interface DocumentVersion {
  version: number;
  documentId: string;
  fileName: string;
  fileSize: number;
  uploadDate: Date;
  uploadedBy: string;
  changeDescription?: string;
  storagePath: string;
  downloadUrl: string;
}

// Dokument-Kommentar
export interface DocumentComment {
  id: string;
  documentId: string;
  userId: string;
  userEmail: string;
  userName: string;
  comment: string;
  timestamp: Date;
  isEdited: boolean;
  editedAt?: Date;
}

// Dokument-Freigabe
export interface DocumentShare {
  id: string;
  documentId: string;
  sharedWith: string;
  sharedBy: string;
  permission: 'read' | 'write' | 'delete';
  sharedAt: Date;
  expiresAt?: Date;
  isActive: boolean;
}

// Dokument-Benachrichtigung
export interface DocumentNotification {
  id: string;
  documentId: string;
  userId: string;
  type: 'upload' | 'update' | 'delete' | 'share' | 'comment';
  message: string;
  timestamp: Date;
  isRead: boolean;
  relatedData?: any;
}

// Dokument-Export-Optionen
export interface DocumentExportOptions {
  format: 'pdf' | 'zip' | 'csv';
  includeMetadata: boolean;
  includeThumbnails: boolean;
  dateRange?: {
    from: Date;
    to: Date;
  };
  categories?: string[];
  documentTypes?: string[];
}

// Dokument-Import-Optionen
export interface DocumentImportOptions {
  overwriteExisting: boolean;
  createCategories: boolean;
  assignDefaultPermissions: boolean;
  defaultAccessLevel: 'public' | 'restricted' | 'admin';
  defaultCategory?: string;
}

// Dokument-Backup
export interface DocumentBackup {
  id: string;
  concernID: string;
  projectId: string;
  backupDate: Date;
  backupType: 'manual' | 'scheduled' | 'automatic';
  backupSize: number;
  documentCount: number;
  storagePath: string;
  downloadUrl: string;
  status: 'completed' | 'failed' | 'in_progress';
  error?: string;
}

// Dokument-Audit-Log
export interface DocumentAuditLog {
  id: string;
  documentId: string;
  userId: string;
  userEmail: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'download' | 'share' | 'permission_change';
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  details?: any;
  previousValue?: any;
  newValue?: any;
}

// Dokument-Workflow-Status
export type DocumentWorkflowStatus = 'draft' | 'review' | 'approved' | 'rejected' | 'archived';

// Dokument-Workflow-Schritt
export interface DocumentWorkflowStep {
  step: number;
  name: string;
  status: 'pending' | 'completed' | 'skipped';
  assignedTo?: string;
  assignedAt?: Date;
  completedAt?: Date;
  comments?: string;
  required: boolean;
}

// Dokument-Workflow
export interface DocumentWorkflow {
  id: string;
  documentId: string;
  workflowType: 'approval' | 'review' | 'signature' | 'custom';
  status: DocumentWorkflowStatus;
  currentStep: number;
  steps: DocumentWorkflowStep[];
  startedAt: Date;
  completedAt?: Date;
  startedBy: string;
  completedBy?: string;
  metadata?: any;
}

// Dokument-Template
export interface DocumentTemplate {
  id: string;
  concernID: string;
  name: string;
  description: string;
  category: string;
  templateType: 'form' | 'contract' | 'report' | 'drawing';
  fileUrl?: string;
  metadata: Record<string, any>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  usageCount: number;
}

// Dokument-Bibliothek
export interface DocumentLibrary {
  id: string;
  concernID: string;
  name: string;
  description: string;
  category: string;
  documents: string[]; // Array von document IDs
  isPublic: boolean;
  allowedRoles: string[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  documentCount: number;
}

