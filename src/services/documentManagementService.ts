// ============================================================================
// DOCUMENT MANAGEMENT SERVICE - Firestore Operations
// ============================================================================

import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '@/config/firebase';
import { DocRecord, DocumentType, DocumentStatus, UploadContext } from '@/types/documents';

export class DocumentManagementService {
  private concernId: string;
  private userId: string;

  constructor(concernId: string, userId: string) {
    this.concernId = concernId;
    this.userId = userId;
    
    if (!concernId || !userId) {
      console.warn('[DocumentManagementService] Initialized with missing concernId or userId', { concernId, userId });
    }
  }

  /**
   * Upload file to Cloud Storage and create Firestore record
   * Now with intelligent project linking
   */
  async uploadDocument(
    file: File,
    context: UploadContext,
    metadata?: {
      hash?: string;
      type?: DocumentType;
      confidence?: number;
      routeDecision?: any;
      textSample?: string | null;  // For content-based routing
    }
  ): Promise<string> {
    
    // Validate concernId
    if (!this.concernId) {
      throw new Error('ConcernID is required for document upload. User may not have concernID set.');
    }
    
    if (!this.userId) {
      throw new Error('UserID is required for document upload.');
    }

      // CRITICAL: Determine project if not explicitly provided
      let finalProjectId = context.projectId;
      let routeDecision = metadata?.routeDecision;

      if (!finalProjectId) {
        // Use project linking service to determine project
        const { determineProjectForDocument } = await import('./projectLinkingService');
        
        const linkResult = await determineProjectForDocument({
          concernId: this.concernId,
          filename: file.name,
          mimeType: file.type,
          docType: metadata?.type,
          textSample: metadata?.textSample,
          explicitProjectId: context.projectId
        });

        finalProjectId = linkResult.projectId;
        routeDecision = {
          ruleId: linkResult.source,
          reason: linkResult.reason || 'Automatically determined',
          confidence: linkResult.confidence,
          candidates: linkResult.candidates
        };

        // If no projectId determined, throw error - all docs must have a project
        if (!finalProjectId) {
          throw new Error('Could not determine project for document. Please select a project manually.');
        }

        console.log('[DocumentManagementService] Auto-assigned project:', finalProjectId, 'via', linkResult.source);
      }

      // Determine category for document (after project is determined)
      let categoryDecision: any = null;
      try {
        const { determineCategoryForDocument } = await import('@/lib/documents/categoryRouting');
        
        const categoryResult = await determineCategoryForDocument({
          orgId: this.concernId,
          projectId: finalProjectId,
          filename: file.name,
          mimeType: file.type,
          docType: metadata?.type || null,
          textSample: metadata?.textSample || null,
          explicitCategoryId: (context as any).categoryId || null
        });

        categoryDecision = categoryResult;
        
        console.log('[DocumentManagementService] Category decision:', {
          categoryId: categoryResult.categoryId,
          confidence: categoryResult.confidence,
          source: categoryResult.source
        });
      } catch (error) {
        console.warn('[DocumentManagementService] Category routing failed:', error);
        // Don't fail upload if category routing fails
      }
    
    const docId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const year = new Date().getFullYear();
    const projectSlug = finalProjectId;
    
    // Storage path: /documents/{yyyy}/{projectId}/{docId}/{originalFilename}
    const storagePath = `documents/${year}/${projectSlug}/${docId}/${file.name}`;
    const storageRef = ref(storage, storagePath);
    
    console.log('[DocumentManagementService] Uploading to:', storagePath);
    console.log('[DocumentManagementService] User:', { userId: this.userId, concernId: this.concernId, projectId: finalProjectId });
    
    try {
      // Upload to Cloud Storage
      await uploadBytes(storageRef, file, {
        contentType: file.type,
        customMetadata: {
          uploadedBy: this.userId,
          concernId: this.concernId,
          projectId: finalProjectId,
          originalFilename: file.name,
          docId: docId
        }
      });
      
      console.log('[DocumentManagementService] Upload successful');
      
      // Get bucket name
      const bucketName = storage.app.options.storageBucket || 'reportingapp817.firebasestorage.app';
      
      // Create Firestore document record - projectId now REQUIRED
      const docRecord: any = {
        docId,
        orgId: this.concernId,
        concernId: this.concernId,
        projectId: finalProjectId,  // NOW MANDATORY
        categoryId: categoryDecision?.categoryId || null,  // NEW: Category assignment
        employeeId: context.employeeId || null,
        clientId: context.clientId || null,
        supplierId: context.supplierId || null,
        type: metadata?.type || null,
        typeConfidence: metadata?.confidence || null,
        status: routeDecision?.confidence && routeDecision.confidence < 0.6 ? 'needs_review' : 'uploaded',
        storagePath: `gs://${bucketName}/${storagePath}`,
        originalFilename: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        createdAt: serverTimestamp(),
        createdBy: this.userId,
        meta: {
          hashSha256: metadata?.hash || null,
          mimeType: file.type,
          textSample: metadata?.textSample?.substring(0, 500) || null
        },
        tags: context.tags || []
      };
      
      // Add route decision
      if (routeDecision) {
        docRecord.routeDecision = routeDecision;
      }

      // Add category decision
      if (categoryDecision) {
        docRecord.categoryDecision = categoryDecision;
        
        // If category confidence >= 0.9, auto-assign
        if (categoryDecision.confidence >= 0.9 && categoryDecision.categoryId) {
          docRecord.categoryId = categoryDecision.categoryId;
        } else if (categoryDecision.confidence < 0.6 && categoryDecision.candidates && categoryDecision.candidates.length > 0) {
          // Low confidence with candidates - mark for review
          if (docRecord.status === 'uploaded') {
            docRecord.status = 'needs_review';
          }
        }
      }
      
      await addDoc(collection(db, 'documents'), docRecord);
      
      // Create lightweight pointer in project subcollection
      await addDoc(collection(db, `projects/${finalProjectId}/documents`), {
        docId,
        type: metadata?.type || null,
        createdAt: serverTimestamp()
      });
      
      return docId;
      
    } catch (error) {
      console.error('[DocumentManagementService] Upload failed:', error);
      // Cleanup storage if Firestore creation failed
      try {
        await deleteObject(storageRef);
      } catch (cleanupError) {
        console.error('[DocumentManagementService] Cleanup failed:', cleanupError);
      }
      throw error;
    }
  }

  /**
   * Get document by ID
   */
  async getDocument(docId: string): Promise<DocRecord | null> {
    try {
      const q = query(
        collection(db, 'documents'),
        where('docId', '==', docId),
        where('concernId', '==', this.concernId),
        limit(1)
      );
      
      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;
      
      return snapshot.docs[0].data() as DocRecord;
    } catch (error) {
      console.error('[DocumentManagementService] Get document failed:', error);
      return null;
    }
  }

  /**
   * Update document status and metadata
   */
  async updateDocument(
    docId: string,
    updates: Partial<Pick<DocRecord, 'status' | 'type' | 'typeConfidence' | 'notes' | 'tags' | 'routeDecision' | 'aiDecision' | 'meta'>>
  ): Promise<void> {
    try {
      const q = query(
        collection(db, 'documents'),
        where('docId', '==', docId),
        where('concernId', '==', this.concernId),
        limit(1)
      );
      
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        throw new Error('Document not found');
      }
      
      const docRef = snapshot.docs[0].ref;
      await updateDoc(docRef, updates as any);
      
    } catch (error) {
      console.error('[DocumentManagementService] Update document failed:', error);
      throw error;
    }
  }

  /**
   * List recent documents
   */
  async listRecentDocuments(limitCount: number = 100): Promise<DocRecord[]> {
    console.log('[DocumentManagementService] listRecentDocuments called with:', { 
      concernId: this.concernId, 
      userId: this.userId,
      limitCount 
    });
    
    try {
      // Try optimized query with index
      const q = query(
        collection(db, 'documents'),
        where('concernId', '==', this.concernId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
      
      console.log('[DocumentManagementService] Executing query on documents collection');
      const snapshot = await getDocs(q);
      console.log('[DocumentManagementService] Query returned', snapshot.docs.length, 'documents');
      
      const docs = snapshot.docs.map(doc => {
        const data = doc.data() as DocRecord;
        console.log('[DocumentManagementService] Document:', {
          id: doc.id,
          docId: data.docId,
          concernId: data.concernId,
          filename: data.originalFilename,
          status: data.status
        });
        return data;
      });
      
      return docs;
    } catch (error: any) {
      console.error('[DocumentManagementService] List documents failed:', error);
      
      // WORKAROUND: If index is not ready yet, use simpler query without orderBy
      if (error?.message?.includes('index')) {
        console.warn('[DocumentManagementService] Index not ready yet, using fallback query without orderBy...');
        
        try {
          // Simple query without orderBy (doesn't need composite index)
          const fallbackQuery = query(
            collection(db, 'documents'),
            where('concernId', '==', this.concernId),
            limit(limitCount)
          );
          
          const snapshot = await getDocs(fallbackQuery);
          console.log('[DocumentManagementService] Fallback query returned', snapshot.docs.length, 'documents');
          
          const docs = snapshot.docs.map(doc => doc.data() as DocRecord);
          
          // Sort client-side by createdAt
          docs.sort((a, b) => {
            const aTime = a.createdAt?.toMillis?.() || 0;
            const bTime = b.createdAt?.toMillis?.() || 0;
            return bTime - aTime;
          });
          
          console.log('[DocumentManagementService] Sorted', docs.length, 'documents client-side');
          return docs;
          
        } catch (fallbackError) {
          console.error('[DocumentManagementService] Fallback query also failed:', fallbackError);
          return [];
        }
      }
      
      return [];
    }
  }

  /**
   * Filter documents by status
   */
  async listDocumentsByStatus(status: DocumentStatus[], limitCount: number = 100): Promise<DocRecord[]> {
    try {
      const q = query(
        collection(db, 'documents'),
        where('concernId', '==', this.concernId),
        where('status', 'in', status),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => doc.data() as DocRecord);
    } catch (error) {
      console.error('[DocumentManagementService] Filter by status failed:', error);
      return [];
    }
  }

  /**
   * Filter documents by type
   */
  async listDocumentsByType(docType: DocumentType, limitCount: number = 100): Promise<DocRecord[]> {
    try {
      const q = query(
        collection(db, 'documents'),
        where('concernId', '==', this.concernId),
        where('type', '==', docType),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => doc.data() as DocRecord);
    } catch (error) {
      console.error('[DocumentManagementService] Filter by type failed:', error);
      return [];
    }
  }

  /**
   * Filter documents by project
   */
  async listDocumentsByProject(projectId: string, limitCount: number = 100): Promise<DocRecord[]> {
    try {
      const q = query(
        collection(db, 'documents'),
        where('concernId', '==', this.concernId),
        where('projectId', '==', projectId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => doc.data() as DocRecord);
    } catch (error) {
      console.error('[DocumentManagementService] Filter by project failed:', error);
      return [];
    }
  }

  /**
   * Check for duplicate by SHA-256 hash
   */
  async checkDuplicateByHash(hash: string): Promise<{ exists: boolean; docId?: string; filename?: string }> {
    try {
      const q = query(
        collection(db, 'documents'),
        where('concernId', '==', this.concernId),
        where('meta.hashSha256', '==', hash),
        limit(1)
      );
      
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        return { exists: false };
      }
      
      const doc = snapshot.docs[0].data() as DocRecord;
      return {
        exists: true,
        docId: doc.docId,
        filename: doc.originalFilename
      };
    } catch (error) {
      console.error('[DocumentManagementService] Duplicate check failed:', error);
      return { exists: false };
    }
  }

  /**
   * Get download URL for document
   */
  async getDownloadUrl(storagePath: string): Promise<string> {
    try {
      // Remove gs:// prefix and bucket name
      const path = storagePath.replace(/^gs:\/\/[^\/]+\//, '');
      const storageRef = ref(storage, path);
      return await getDownloadURL(storageRef);
    } catch (error) {
      console.error('[DocumentManagementService] Get download URL failed:', error);
      throw error;
    }
  }

  /**
   * Delete document (both Firestore and Storage)
   */
  async deleteDocument(docId: string): Promise<void> {
    try {
      // Get document first
      const docRecord = await this.getDocument(docId);
      if (!docRecord) {
        throw new Error('Document not found');
      }
      
      // Delete from Storage
      const path = docRecord.storagePath.replace(/^gs:\/\/[^\/]+\//, '');
      const storageRef = ref(storage, path);
      await deleteObject(storageRef);
      
      // Delete from Firestore
      const q = query(
        collection(db, 'documents'),
        where('docId', '==', docId),
        where('concernId', '==', this.concernId),
        limit(1)
      );
      
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        await updateDoc(snapshot.docs[0].ref, { status: 'rejected' });
      }
      
    } catch (error) {
      console.error('[DocumentManagementService] Delete document failed:', error);
      throw error;
    }
  }
}

