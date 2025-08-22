import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc,
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot, 
  serverTimestamp, 
  Timestamp,
  writeBatch,
  arrayUnion,
  arrayRemove,
  increment
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  uploadBytesResumable, 
  getDownloadURL, 
  deleteObject,
  listAll
} from 'firebase/storage';
import { db, storage } from '@/config/firebase';

// Firestore Collections
const COLLECTIONS = {
  PROJECT_DOCUMENTS: 'project_documents',
  DOCUMENT_CATEGORIES: 'document_categories',
  DOCUMENT_PERMISSIONS: 'document_permissions'
};

// Storage Paths
const STORAGE_PATHS = {
  PROJECT_DOCUMENTS: 'concerns/{concernID}/projects/{projectId}/documents',
  THUMBNAILS: 'concerns/{concernID}/projects/{projectId}/documents/{documentId}/thumbnails',
  VERSIONS: 'concerns/{concernID}/projects/{projectId}/documents/{documentId}/versions'
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
  uploadDate: Timestamp;
  lastModified: Timestamp;
  version: number;
  
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
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface DocumentPermission {
  permissionId: string;
  documentId: string;
  concernID: string;
  userId: string;
  permission: 'read' | 'write' | 'delete' | 'admin';
  grantedBy: string;
  grantedAt: Timestamp;
  expiresAt?: Timestamp;
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
      // undefined Werte entfernen, da Firestore diese nicht akzeptiert
      const cleanDocumentData = this.removeUndefinedValues({
        ...documentData,
        concernID,
        projectId,
        uploadDate: serverTimestamp(),
        lastModified: serverTimestamp(),
        version: 1
      });

      const docRef = await addDoc(collection(db, COLLECTIONS.PROJECT_DOCUMENTS), cleanDocumentData);
      
      console.log('✅ [DocumentService] Document added successfully:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('❌ [DocumentService] Error adding document:', error);
      throw error;
    }
  }

  /**
   * Hilfsfunktion: undefined Werte aus einem Objekt entfernen
   */
  private removeUndefinedValues(obj: any): any {
    const cleaned: any = {};
    Object.keys(obj).forEach(key => {
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
      let q = query(
        collection(db, COLLECTIONS.PROJECT_DOCUMENTS),
        where('concernID', '==', concernID),
        where('projectId', '==', projectId),
        orderBy('uploadDate', 'desc')
      );

      if (category) {
        q = query(q, where('category', '==', category));
      }

      const querySnapshot = await getDocs(q);
      const documents: FirebaseDocument[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data() as FirebaseDocument;
        documents.push({
          ...data,
          documentId: doc.id
        });
      });

      // Client-seitige Suche für bessere Performance
      if (searchTerm) {
        const filtered = documents.filter(doc => 
          doc.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          doc.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          doc.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())) ||
          doc.fullTextSearch.some(text => text.toLowerCase().includes(searchTerm.toLowerCase()))
        );
        return filtered;
      }

      console.log('✅ [DocumentService] Retrieved', documents.length, 'documents for project:', projectId);
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
      const q = query(
        collection(db, COLLECTIONS.PROJECT_DOCUMENTS),
        where('concernID', '==', concernID),
        orderBy('uploadDate', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const documents: FirebaseDocument[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data() as FirebaseDocument;
        documents.push({
          ...data,
          documentId: doc.id
        });
      });

      console.log('✅ [DocumentService] Retrieved', documents.length, 'documents for concern:', concernID);
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
      const docRef = doc(db, COLLECTIONS.PROJECT_DOCUMENTS, documentId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data() as FirebaseDocument;
        console.log('✅ [DocumentService] Document retrieved:', documentId);
        return {
          ...data,
          documentId: docSnap.id
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
  async updateDocument(
    documentId: string,
    updateData: Partial<FirebaseDocument>
  ): Promise<void> {
    try {
      const docRef = doc(db, COLLECTIONS.PROJECT_DOCUMENTS, documentId);
      await updateDoc(docRef, {
        ...updateData,
        lastModified: serverTimestamp()
      });
      
      console.log('✅ [DocumentService] Document updated successfully:', documentId);
    } catch (error) {
      console.error('❌ [DocumentService] Error updating document:', error);
      throw error;
    }
  }

  /**
   * Dokument löschen
   */
  async deleteDocument(documentId: string, storagePath: string): Promise<void> {
    try {
      // Dokument aus Firestore löschen
      const docRef = doc(db, COLLECTIONS.PROJECT_DOCUMENTS, documentId);
      await deleteDoc(docRef);

      // Datei aus Storage löschen
      const storageRef = ref(storage, storagePath);
      await deleteObject(storageRef);

      // Thumbnails löschen falls vorhanden
      try {
        const thumbnailRef = ref(storage, storagePath.replace('/original/', '/thumbnails/'));
        await deleteObject(thumbnailRef);
      } catch (thumbnailError) {
        // Thumbnail existiert möglicherweise nicht
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
      const q = query(
        collection(db, COLLECTIONS.DOCUMENT_CATEGORIES),
        where('concernID', '==', concernID),
        where('isActive', '==', true),
        orderBy('name')
      );

      const querySnapshot = await getDocs(q);
      const categories: DocumentCategory[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data() as DocumentCategory;
        categories.push({
          ...data,
          categoryId: doc.id
        });
      });

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
  async createDocumentCategory(categoryData: Omit<DocumentCategory, 'categoryId' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, COLLECTIONS.DOCUMENT_CATEGORIES), {
        ...categoryData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      console.log('✅ [DocumentService] Document category created successfully:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('❌ [DocumentService] Error creating document category:', error);
      throw error;
    }
  }

  // ===== FILE UPLOAD =====
  
  /**
   * Datei zu Firebase Storage hochladen
   */
  async uploadFile(
    file: File,
    concernID: string,
    projectId: string,
    onProgress?: (progress: number) => void
  ): Promise<{ storagePath: string; downloadUrl: string }> {
    try {
      const fileName = `${Date.now()}_${file.name}`;
      const storagePath = `concerns/${concernID}/projects/${projectId}/documents/${fileName}`;
      const storageRef = ref(storage, storagePath);

      // Upload starten
      const uploadTask = uploadBytesResumable(storageRef, file);

      // Progress-Tracking
      uploadTask.on('state_changed', 
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          if (onProgress) onProgress(progress);
        },
        (error) => {
          console.error('❌ [DocumentService] Upload error:', error);
          throw error;
        },
        async () => {
          // Upload erfolgreich
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          console.log('✅ [DocumentService] File uploaded successfully:', storagePath);
          
          return { storagePath, downloadUrl };
        }
      );

      // Warten auf Upload-Abschluss
      await uploadTask;
      const downloadUrl = await getDownloadURL(storageRef);
      
      return { storagePath, downloadUrl };
    } catch (error) {
      console.error('❌ [DocumentService] Error uploading file:', error);
      throw error;
    }
  }

  /**
   * Thumbnail für ein Dokument generieren (für Bilder und PDFs)
   */
  async generateThumbnail(
    file: File,
    concernID: string,
    projectId: string,
    documentId: string
  ): Promise<string | null> {
    try {
      // Nur für Bilder und PDFs
      if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
        return null;
      }

      // Hier würde die Thumbnail-Generierung implementiert
      // Für den Moment geben wir null zurück
      console.log('ℹ️ [DocumentService] Thumbnail generation not yet implemented');
      return null;
    } catch (error) {
      console.error('❌ [DocumentService] Error generating thumbnail:', error);
      return null;
    }
  }

  // ===== REAL-TIME UPDATES =====
  
  /**
   * Real-time Listener für Projekt-Dokumente
   */
  subscribeToProjectDocuments(
    concernID: string,
    projectId: string,
    callback: (documents: FirebaseDocument[]) => void
  ): () => void {
    const q = query(
      collection(db, COLLECTIONS.PROJECT_DOCUMENTS),
      where('concernID', '==', concernID),
      where('projectId', '==', projectId),
      orderBy('uploadDate', 'desc')
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const documents: FirebaseDocument[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data() as FirebaseDocument;
        documents.push({
          ...data,
          documentId: doc.id
        });
      });
      
      callback(documents);
    });

    return unsubscribe;
  }

  // ===== UTILITY FUNCTIONS =====
  
  /**
   * Dateigröße in lesbarem Format formatieren
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Dateityp aus MIME-Type extrahieren
   */
  getFileTypeFromMime(mimeType: string): string {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.includes('pdf')) return 'pdf';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'document';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'spreadsheet';
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'presentation';
    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z')) return 'archive';
    return 'other';
  }

  /**
   * Icon für Dateityp bestimmen
   */
  getFileIcon(fileType: string): string {
    switch (fileType) {
      case 'image': return '🖼️';
      case 'video': return '🎥';
      case 'audio': return '🎵';
      case 'pdf': return '📄';
      case 'document': return '📝';
      case 'spreadsheet': return '📊';
      case 'presentation': return '📽️';
      case 'archive': return '📦';
      default: return '📎';
    }
  }
}

export const documentService = new DocumentService();
export default documentService;
