/**
 * Document Service
 *
 * Workstream F: Migrated to dataClient (Phase 1)
 *
 * Handles document management operations.
 */

import {
  queryDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  increment,
  QueryFilter,
} from '@/services/dataClient';
import { watchQuery } from '@/services/realtimeClient';
import { getAccessToken } from '@/lib/auth/oidc-client';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

// Firestore Collections
const COLLECTIONS = {
  PROJECT_DOCUMENTS: 'project_documents',
  DOCUMENT_CATEGORIES: 'document_categories',
  DOCUMENT_PERMISSIONS: 'document_permissions',
};

// Interfaces für Firebase
export interface FirebaseDocument {
  documentId: string;
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
  mimeType?: string;
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
  uploadDate: { seconds: number; nanoseconds: number };
  lastModified: { seconds: number; nanoseconds: number };
  version: number;
  commentCount?: number;
  isArchived?: boolean;
  status?: 'draft' | 'review' | 'approved' | 'rejected' | 'archived';

  // Projekt-spezifische Felder
  projectPhase?: string;
  documentType: 'drawing' | 'contract' | 'photo' | 'report' | 'other';
  priority: 'low' | 'medium' | 'high';

  // Suchoptimierung
  searchableText?: string;
  fullTextSearch: string[];
}

export interface DocumentCategory {
  categoryId: string;
  concernID: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  allowedFileTypes: string[];
  maxFileSize: number;
  isActive: boolean;
  createdAt: { seconds: number; nanoseconds: number };
  updatedAt: { seconds: number; nanoseconds: number };
}

export interface DocumentPermission {
  permissionId: string;
  documentId: string;
  concernID: string;
  userId: string;
  permission: 'read' | 'write' | 'delete' | 'admin';
  grantedBy: string;
  grantedAt: { seconds: number; nanoseconds: number };
  expiresAt?: { seconds: number; nanoseconds: number };
}

export interface UploadProgress {
  fileName: string;
  progress: number;
  status: 'uploading' | 'success' | 'error';
  error?: string;
}

export interface DocumentUploadResult {
  status: 'success' | 'error';
  documentId?: string;
  downloadUrl?: string;
  thumbnailUrl?: string;
  error?: string;
}

export interface DocumentCommentInput {
  comment: string;
  x: number;
  y: number;
}

class DocumentService {
  // ===== PROJECT DOCUMENTS =====

  /**
   * Dokument zu einem Projekt hinzufügen
   */
  async addProjectDocument(
    concernID: string,
    projectId: string,
    documentData: Omit<FirebaseDocument, 'documentId' | 'uploadDate' | 'lastModified' | 'version'>
  ): Promise<string> {
    try {
      const cleanDocumentData = this.removeUndefinedValues({
        ...documentData,
        concernID,
        projectId,
        uploadDate: serverTimestamp(),
        lastModified: serverTimestamp(),
        version: 1,
        commentCount: 0,
        isArchived: false,
        status: 'draft',
      });

      const doc = await addDoc(COLLECTIONS.PROJECT_DOCUMENTS, cleanDocumentData);

      console.log('✅ [DocumentService] Document added successfully:', doc.doc_id);
      return doc.doc_id;
    } catch (error) {
      console.error('❌ [DocumentService] Error adding document:', error);
      throw error;
    }
  }

  // ===== COMMENTS (ANNOTATIONS) =====

  async addComment(
    documentId: string,
    userId: string,
    userEmail: string,
    input: { comment: string; x: number; y: number }
  ): Promise<string> {
    try {
      const commentData = {
        documentId,
        userId,
        userEmail,
        comment: input.comment,
        x: input.x,
        y: input.y,
        timestamp: serverTimestamp(),
        isEdited: false,
      };

      const doc = await addDoc(`${COLLECTIONS.PROJECT_DOCUMENTS}_comments`, commentData);

      // Update comment count
      await updateDoc(COLLECTIONS.PROJECT_DOCUMENTS, documentId, {
        commentCount: increment(1),
      });

      return doc.doc_id;
    } catch (e) {
      throw e;
    }
  }

  async listComments(
    documentId: string
  ): Promise<
    Array<{
      id: string;
      userId: string;
      userEmail: string;
      comment: string;
      x: number;
      y: number;
      timestamp: { seconds: number; nanoseconds: number };
      isEdited: boolean;
    }>
  > {
    const filters: QueryFilter[] = [{ field: 'documentId', op: '==', value: documentId }];

    const result = await queryDocs(
      `${COLLECTIONS.PROJECT_DOCUMENTS}_comments`,
      filters,
      { orderBy: { field: 'timestamp', dir: 'asc' } }
    );

    return result.items.map((doc) => ({
      id: doc.doc_id,
      ...(doc.data as unknown as {
        userId: string;
        userEmail: string;
        comment: string;
        x: number;
        y: number;
        timestamp: { seconds: number; nanoseconds: number };
        isEdited: boolean;
      }),
    }));
  }

  async updateComment(documentId: string, commentId: string, text: string): Promise<void> {
    await updateDoc(`${COLLECTIONS.PROJECT_DOCUMENTS}_comments`, commentId, {
      comment: text,
      isEdited: true,
      editedAt: serverTimestamp(),
    });
  }

  async deleteComment(documentId: string, commentId: string): Promise<void> {
    await deleteDoc(`${COLLECTIONS.PROJECT_DOCUMENTS}_comments`, commentId);
    await updateDoc(COLLECTIONS.PROJECT_DOCUMENTS, documentId, {
      commentCount: increment(-1),
    });
  }

  /**
   * Hilfsfunktion: undefined Werte aus einem Objekt entfernen
   */
  private removeUndefinedValues(obj: Record<string, unknown>): Record<string, unknown> {
    const cleaned: Record<string, unknown> = {};
    Object.keys(obj).forEach((key) => {
      if (obj[key] !== undefined) {
        cleaned[key] = obj[key];
      }
    });
    return cleaned;
  }

  /**
   * Dokumente eines Projekts abrufen
   */
  async getProjectDocuments(
    concernID: string,
    projectId: string,
    category?: string,
    searchTerm?: string
  ): Promise<FirebaseDocument[]> {
    try {
      const filters: QueryFilter[] = [
        { field: 'concernID', op: '==', value: concernID },
        { field: 'projectId', op: '==', value: projectId },
      ];

      if (category) {
        filters.push({ field: 'category', op: '==', value: category });
      }

      const result = await queryDocs<FirebaseDocument>(COLLECTIONS.PROJECT_DOCUMENTS, filters, {
        orderBy: { field: 'uploadDate', dir: 'desc' },
      });

      const documents = result.items.map((doc) => ({
        ...doc.data,
        documentId: doc.doc_id,
      }));

      // Client-seitige Suche
      if (searchTerm) {
        const terms = searchTerm.toLowerCase().split(/\s+/).filter(Boolean);
        const filtered = documents.filter((doc) => {
          const haystack = [
            doc.displayName?.toLowerCase() || '',
            doc.description?.toLowerCase() || '',
            ...(doc.tags || []).map((t) => t.toLowerCase()),
            ...(doc.fullTextSearch || []).map((t) => t.toLowerCase()),
            doc.searchableText?.toLowerCase() || '',
          ].join(' ');
          return terms.every((t) => haystack.includes(t));
        });
        return filtered;
      }

      console.log(
        '✅ [DocumentService] Retrieved',
        documents.length,
        'documents for project:',
        projectId
      );
      return documents;
    } catch (error) {
      console.error('❌ [DocumentService] Error getting project documents:', error);
      throw error;
    }
  }

  /**
   * Alle Dokumente eines Concerns abrufen (für Admin-Übersicht)
   */
  async getAllDocuments(concernID: string): Promise<FirebaseDocument[]> {
    try {
      const filters: QueryFilter[] = [{ field: 'concernID', op: '==', value: concernID }];

      const result = await queryDocs<FirebaseDocument>(COLLECTIONS.PROJECT_DOCUMENTS, filters, {
        orderBy: { field: 'uploadDate', dir: 'desc' },
      });

      const documents = result.items.map((doc) => ({
        ...doc.data,
        documentId: doc.doc_id,
      }));

      console.log(
        '✅ [DocumentService] Retrieved',
        documents.length,
        'documents for concern:',
        concernID
      );
      return documents;
    } catch (error) {
      console.error('❌ [DocumentService] Error getting all documents:', error);
      throw error;
    }
  }

  /**
   * Einzelnes Dokument abrufen
   */
  async getDocument(documentId: string): Promise<FirebaseDocument | null> {
    try {
      const doc = await getDoc<FirebaseDocument>(COLLECTIONS.PROJECT_DOCUMENTS, documentId);

      if (doc) {
        console.log('✅ [DocumentService] Document retrieved:', documentId);
        return {
          ...doc.data,
          documentId: doc.doc_id,
        };
      } else {
        console.log('⚠️ [DocumentService] Document not found:', documentId);
        return null;
      }
    } catch (error) {
      console.error('❌ [DocumentService] Error getting document:', error);
      throw error;
    }
  }

  /**
   * Dokument aktualisieren
   */
  async updateDocument(documentId: string, updateData: Partial<FirebaseDocument>): Promise<void> {
    try {
      await updateDoc(COLLECTIONS.PROJECT_DOCUMENTS, documentId, {
        ...updateData,
        lastModified: serverTimestamp(),
      });

      console.log('✅ [DocumentService] Document updated successfully:', documentId);
    } catch (error) {
      console.error('❌ [DocumentService] Error updating document:', error);
      throw error;
    }
  }

  /**
   * Setzt den Workflow-Status eines Dokuments
   */
  async updateDocumentStatus(
    documentId: string,
    status: 'draft' | 'review' | 'approved' | 'rejected' | 'archived'
  ): Promise<void> {
    return this.updateDocument(documentId, { status });
  }

  /**
   * Erstellt neues Dokument oder legt eine neue Version an
   */
  async createOrVersionDocument(
    concernID: string,
    projectId: string,
    documentData: Omit<FirebaseDocument, 'documentId' | 'uploadDate' | 'lastModified' | 'version'>
  ): Promise<string> {
    // Prüfe auf Duplikate nach originalFileName
    const filters: QueryFilter[] = [
      { field: 'concernID', op: '==', value: concernID },
      { field: 'projectId', op: '==', value: projectId },
      { field: 'originalFileName', op: '==', value: documentData.originalFileName },
    ];

    const existing = await queryDocs<FirebaseDocument>(COLLECTIONS.PROJECT_DOCUMENTS, filters);

    if (existing.items.length === 0) {
      return this.addProjectDocument(concernID, projectId, documentData);
    }

    // Nimm das Dokument mit der höchsten Version
    let latestDoc: { id: string; version: number } | null = null;
    for (const doc of existing.items) {
      const v = doc.data.version || 1;
      if (!latestDoc || v > latestDoc.version) {
        latestDoc = { id: doc.doc_id, version: v };
      }
    }

    const nextVersion = (latestDoc?.version || 1) + 1;
    const newId = await this.addProjectDocument(concernID, projectId, {
      ...documentData,
      version: nextVersion,
    } as Omit<FirebaseDocument, 'documentId' | 'uploadDate' | 'lastModified' | 'version'>);
    return newId;
  }

  /**
   * Dokument löschen
   */
  async deleteDocument(documentId: string, storagePath: string): Promise<void> {
    try {
      // Dokument aus DB löschen
      await deleteDoc(COLLECTIONS.PROJECT_DOCUMENTS, documentId);

      // Datei aus Storage löschen via API
      const token = await getAccessToken();
      await fetch(`${API_BASE}/api/v1/storage/delete`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ path: storagePath }),
      });

      // Try to delete thumbnail
      try {
        await fetch(`${API_BASE}/api/v1/storage/delete`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ path: storagePath.replace('/original/', '/thumbnails/') }),
        });
      } catch (thumbnailError) {
        console.log('ℹ️ [DocumentService] No thumbnail to delete');
      }

      console.log('✅ [DocumentService] Document deleted successfully:', documentId);
    } catch (error) {
      console.error('❌ [DocumentService] Error deleting document:', error);
      throw error;
    }
  }

  // ===== DOCUMENT CATEGORIES =====

  /**
   * Kategorien für einen Concern abrufen
   */
  async getDocumentCategories(concernID: string): Promise<DocumentCategory[]> {
    try {
      const filters: QueryFilter[] = [
        { field: 'concernID', op: '==', value: concernID },
        { field: 'isActive', op: '==', value: true },
      ];

      const result = await queryDocs<DocumentCategory>(COLLECTIONS.DOCUMENT_CATEGORIES, filters, {
        orderBy: { field: 'name', dir: 'asc' },
      });

      const categories = result.items.map((doc) => ({
        ...doc.data,
        categoryId: doc.doc_id,
      }));

      console.log('✅ [DocumentService] Retrieved', categories.length, 'document categories');
      return categories;
    } catch (error) {
      console.error('❌ [DocumentService] Error getting document categories:', error);
      throw error;
    }
  }

  /**
   * Neue Kategorie erstellen
   */
  async createDocumentCategory(
    categoryData: Omit<DocumentCategory, 'categoryId' | 'createdAt' | 'updatedAt'>
  ): Promise<string> {
    try {
      const doc = await addDoc(COLLECTIONS.DOCUMENT_CATEGORIES, {
        ...categoryData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      console.log('✅ [DocumentService] Document category created successfully:', doc.doc_id);
      return doc.doc_id;
    } catch (error) {
      console.error('❌ [DocumentService] Error creating document category:', error);
      throw error;
    }
  }

  // ===== FILE UPLOAD =====

  /**
   * Datei zu Storage hochladen
   */
  async uploadFile(
    file: File,
    concernID: string,
    projectId: string,
    onProgress?: (progress: number) => void,
    userId?: string
  ): Promise<{ storagePath: string; downloadUrl: string }> {
    try {
      const fileName = `${Date.now()}_${file.name}`;
      const storagePath = `concerns/${concernID}/projects/${projectId}/documents/${fileName}`;

      const token = await getAccessToken();

      // Convert file to base64
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      if (onProgress) onProgress(50);

      const response = await fetch(`${API_BASE}/api/v1/storage/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          path: storagePath,
          data: base64Data,
          contentType: file.type,
          metadata: {
            uploadedBy: userId || '',
            concernID,
            projectId,
            originalFileName: file.name,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
      }

      if (onProgress) onProgress(90);

      // Get download URL
      const urlResponse = await fetch(
        `${API_BASE}/api/v1/storage/url?path=${encodeURIComponent(storagePath)}`,
        {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );

      if (!urlResponse.ok) {
        throw new Error(`Failed to get download URL: ${urlResponse.status}`);
      }

      const urlResult = await urlResponse.json();
      const downloadUrl = urlResult.url;

      if (onProgress) onProgress(100);

      console.log('✅ [DocumentService] File uploaded successfully:', storagePath);
      return { storagePath, downloadUrl };
    } catch (error) {
      console.error('❌ [DocumentService] Error uploading file:', error);
      throw error;
    }
  }

  /**
   * Thumbnail für ein Dokument generieren
   */
  async generateThumbnail(
    file: File,
    concernID: string,
    projectId: string,
    documentId: string
  ): Promise<string | null> {
    try {
      if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
        return null;
      }
      console.log('ℹ️ [DocumentService] Thumbnail generation not yet implemented');
      return null;
    } catch (error) {
      console.error('❌ [DocumentService] Error generating thumbnail:', error);
      return null;
    }
  }

  // ===== REAL-TIME UPDATES =====

  /**
   * Real-time Listener für Projekt-Dokumente (polling-based)
   */
  subscribeToProjectDocuments(
    concernID: string,
    projectId: string,
    callback: (documents: FirebaseDocument[]) => void
  ): () => void {
    const filters: QueryFilter[] = [
      { field: 'concernID', op: '==', value: concernID },
      { field: 'projectId', op: '==', value: projectId },
    ];

    return watchQuery<FirebaseDocument>(
      COLLECTIONS.PROJECT_DOCUMENTS,
      filters,
      (docs) => {
        const documents = docs.map((doc) => ({
          ...doc.data,
          documentId: doc.doc_id,
        }));
        callback(documents);
      },
      {
        intervalMs: 5000,
        orderBy: { field: 'uploadDate', dir: 'desc' },
      }
    );
  }

  // ===== UTILITY FUNCTIONS =====

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getFileTypeFromMime(mimeType: string): string {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.includes('pdf')) return 'pdf';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'document';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'spreadsheet';
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'presentation';
    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z'))
      return 'archive';
    return 'other';
  }

  getFileIcon(fileType: string): string {
    switch (fileType) {
      case 'image':
        return '🖼️';
      case 'video':
        return '🎥';
      case 'audio':
        return '🎵';
      case 'pdf':
        return '📄';
      case 'document':
        return '📝';
      case 'spreadsheet':
        return '📊';
      case 'presentation':
        return '📽️';
      case 'archive':
        return '📦';
      default:
        return '📎';
    }
  }
}

export const documentService = new DocumentService();
export default documentService;
