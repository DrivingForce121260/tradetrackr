/**
 * Firestore Service - Compatibility Layer
 * 
 * Phase F2: This file now wraps dataClient to maintain backwards compatibility.
 * All Firebase/Firestore imports have been removed.
 * 
 * @deprecated New code should use dataClient directly.
 * @see /docs/PHASE_F_SHIM_REMOVAL_PHASE2.md
 */

import { 
  getDoc as dcGetDoc,
  queryDocs,
  upsertDoc,
  deleteDoc as dcDeleteDoc,
  addDoc as dcAddDoc,
  updateDoc as dcUpdateDoc,
  batchWrite,
  serverTimestamp,
  QueryFilter,
  Doc,
  BatchOperation,
} from './dataClient';
import { watchQuery } from './realtimeClient';
import { cacheService } from './cacheService';

// ============================================================================
// Type Definitions (exported for backwards compatibility)
// ============================================================================

export interface Concern {
  uid?: string;
  concernName: string;
  concernAddress: string;
  concernTel: string;
  concernEmail: string;
  dateCreated: Date;
  updateTime: Date;
  members: number;
  verificationCode?: string;
  verificationCodeExpiry?: Date;
  verificationCodeActive?: boolean;
  verificationCodeCreated?: Date;
}

export interface User {
  uid?: string;
  concernID: string;
  dateCreated: Date;
  email: string;
  displayName: string;
  photoUrl?: string;
  tel?: string;
  passpin?: number;
  vorname: string;
  mitarbeiterID: number;
  lastLogin?: Date;
  lastSync: Date;
  nachname: string;
  generatedProjects: number;
  rechte: number;
  startDate?: Date;
  dateOfBirth?: Date;
  role: string;
  isActive: boolean;
  isDemoUser?: boolean;
  address?: string;
  privateAddress?: string;
  privateCity?: string;
  privatePostalCode?: string;
  privateCountry?: string;
  verificationCode?: string;
  verificationCodeDate?: Date;
  verificationCodeSent?: boolean;
  verificationCodeSentAt?: string;
  isDeleted?: boolean;
  deletedAt?: Date;
  keycloakSub?: string;
}

export interface Project {
  uid?: string;
  concernID: string;
  dateCreated: Date;
  lastModified: Date;
  projectNumber: number;
  projectAddendum: number;
  projectName: string;
  projectDes: string;
  projectAddr: string;
  projectContact: string;
  projectStatus: string;
  projectCategory: number;
  projectCustomer: string;
  mitarbeiterID: string;
  projectCity: string;
  postCode: string;
  projectTel: string;
  projectEmail: string;
  projectElementLoaded: boolean;
  projectAufmassGen: boolean;
  priority: string;
  startDate?: Date;
  endDate?: Date;
  budget?: number;
  progress?: number;
  type?: 'external' | 'internal';
  internalCategory?: 'personnel' | 'finance' | 'training' | 'admin' | 'compliance' | 'it';
  active?: boolean;
  isSystemProject?: boolean;
}

export interface Task {
  uid?: string;
  concernID: string;
  dateCreated: Date;
  lastModified: Date;
  taskNumber: string;
  title: string;
  description: string;
  projectNumber: string;
  assignedTo: string;
  customer: string;
  workLocation: string;
  dueDate: Date;
  priority: string;
  status: string;
  hours: number;
  actualHours?: number;
  category: string;
  tags?: string[];
}

export interface Customer {
  uid?: string;
  concernID: string;
  dateCreated: Date;
  cusContact: string;
  cusName: string;
  cusAddress: string;
  cusTel: string;
  cusEmail: string;
  status: string;
  industry?: string;
  notes?: string;
}

export interface Material {
  uid?: string;
  concernID: string;
  dateCreated: Date;
  lastModified: Date;
  materialNumber: string;
  name: string;
  description: string;
  category: string;
  unit: string;
  price: number;
  stock: number;
  minStock: number;
  supplier?: string;
  projectNumber?: string;
  isActive: boolean;
}

export interface Category {
  uid?: string;
  concernID: string;
  dateCreated: Date;
  lastModified: Date;
  name: string;
  description: string;
  type: string;
  color: string;
  icon: string;
  isActive: boolean;
}

export interface Report {
  id: string;
  reportNumber: string;
  employee: string;
  customer: string;
  projectNumber: string;
  workLocation: string;
  workDate: string;
  totalHours: number;
  workDescription: string;
  status: 'pending' | 'approved' | 'rejected';
  mitarbeiterID: string;
  projectReportNumber: string;
  reportData: string;
  reportDate: string;
  signatureReference: string;
  stadt: string;
  concernID: string;
  activeprojectName: string;
  location: string;
  workLines: WorkLine[];
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkLine {
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
  mitarbeiterName: string;
  activeprojectName: string;
  gewerk: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert timestamp-like objects to Date
 */
const convertTimestamp = (timestamp: any): Date => {
  if (timestamp instanceof Date) {
    return timestamp;
  }
  if (typeof timestamp === 'string') {
    return new Date(timestamp);
  }
  if (timestamp && typeof timestamp === 'object') {
    if ('seconds' in timestamp) {
      return new Date(timestamp.seconds * 1000);
    }
    if ('_seconds' in timestamp) {
      return new Date(timestamp._seconds * 1000);
    }
  }
  return new Date();
};

/**
 * Convert all timestamp fields in an object to Date
 */
function convertTimestamps<T>(data: any): T {
  if (!data || typeof data !== 'object') return data;
  
  const converted = { ...data };
  const timestampFields = ['dateCreated', 'lastModified', 'createdAt', 'updatedAt', 'lastLogin', 
                          'lastSync', 'startDate', 'endDate', 'dueDate', 'dateOfBirth',
                          'verificationCodeExpiry', 'verificationCodeCreated', 'deletedAt'];
  
  for (const field of timestampFields) {
    if (converted[field]) {
      converted[field] = convertTimestamp(converted[field]);
    }
  }
  
  return converted;
}

/**
 * Clean data for storage (convert undefined to null)
 */
function cleanDataForStorage<T>(data: Partial<T>): Partial<T> {
  const cleaned = { ...data };
  
  for (const key of Object.keys(cleaned)) {
    const value = (cleaned as any)[key];
    if (value === undefined) {
      (cleaned as any)[key] = null;
    } else if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      (cleaned as any)[key] = cleanDataForStorage(value);
    }
  }
  
  return cleaned;
}

/**
 * Map Doc<T> result to legacy format with uid
 */
function mapDocToLegacy<T>(doc: Doc<T> | null): (T & { uid: string }) | null {
  if (!doc) return null;
  const data = convertTimestamps<T>(doc.data);
  return { ...data, uid: doc.doc_id };
}

/**
 * Map array of Doc<T> to legacy format
 */
function mapDocsToLegacy<T>(docs: Doc<T>[]): (T & { uid: string })[] {
  return docs.map(doc => {
    const data = convertTimestamps<T>(doc.data);
    return { ...data, uid: doc.doc_id, id: doc.doc_id };
  });
}

// ============================================================================
// FirestoreService Class (Compatibility Layer)
// ============================================================================

/**
 * @deprecated Use dataClient directly for new code
 */
export class FirestoreService {
  
  static async create<T>(collectionName: string, data: T): Promise<string> {
    try {
      const cleanedData = cleanDataForStorage({
        ...data,
        dateCreated: new Date().toISOString(),
        lastModified: new Date().toISOString()
      });
      
      const result = await dcAddDoc(collectionName, cleanedData as any);
      
      // Invalidate cache
      const concernID = (data as any).concernID;
      if (concernID) {
        await cacheService.invalidate(collectionName, concernID);
      }
      
      return result.doc_id;
    } catch (error) {
      console.error(`Fehler beim Erstellen von ${collectionName}:`, error);
      throw error;
    }
  }

  static async createWithId<T>(collectionName: string, docId: string, data: T): Promise<string> {
    try {
      const cleanedData = cleanDataForStorage({
        ...data,
        dateCreated: new Date().toISOString(),
        lastModified: new Date().toISOString()
      });
      
      await upsertDoc(collectionName, docId, cleanedData as any);
      return docId;
    } catch (error) {
      console.error(`Fehler beim Erstellen von ${collectionName} mit ID ${docId}:`, error);
      throw error;
    }
  }

  static async get<T>(collectionName: string, docId: string): Promise<T | null> {
    try {
      const doc = await dcGetDoc<T>(collectionName, docId);
      return mapDocToLegacy(doc);
    } catch (error) {
      console.error(`Fehler beim Abrufen von ${collectionName}:`, error);
      throw error;
    }
  }

  static async getAll<T>(collectionName: string, concernID?: string, skipCache: boolean = false): Promise<T[]> {
    try {
      // Check cache first
      if (!skipCache) {
        const cached = await cacheService.get<T[]>(collectionName, concernID);
        if (cached && Array.isArray(cached) && cached.length > 0) {
          return cached;
        }
      }

      const filters: QueryFilter[] = concernID 
        ? [{ field: 'concernID', op: '==', value: concernID }]
        : [];
      
      const result = await queryDocs<T>(collectionName, filters);
      const documents = mapDocsToLegacy(result.items);
      
      // Cache the result
      await cacheService.set(collectionName, documents, concernID);
      
      return documents;
    } catch (error) {
      console.error(`Fehler beim Abrufen aller ${collectionName}:`, error);
      throw error;
    }
  }

  static async update<T>(collectionName: string, docId: string, data: Partial<T>, concernID?: string): Promise<void> {
    try {
      const cleanedData = cleanDataForStorage({
        ...data,
        lastModified: new Date().toISOString()
      });
      
      await dcUpdateDoc(collectionName, docId, cleanedData as any);
      
      // Invalidate cache
      const cid = concernID || (data as any)?.concernID;
      await cacheService.invalidate(collectionName, cid, docId);
      await cacheService.invalidate(collectionName, cid);
    } catch (error) {
      console.error(`Fehler beim Aktualisieren von ${collectionName}:`, error);
      throw error;
    }
  }

  static async delete(collectionName: string, docId: string, concernID?: string): Promise<void> {
    try {
      await dcDeleteDoc(collectionName, docId);
      
      // Invalidate cache
      await cacheService.invalidate(collectionName, concernID, docId);
      await cacheService.invalidate(collectionName, concernID);
    } catch (error) {
      console.error(`Fehler beim Löschen von ${collectionName}:`, error);
      throw error;
    }
  }

  static async query<T>(
    collectionName: string, 
    conditions: Array<{ field: string; operator: any; value: any }>,
    orderByField?: string,
    limitCount?: number
  ): Promise<T[]> {
    try {
      const filters: QueryFilter[] = conditions.map(c => ({
        field: c.field,
        op: c.operator as any,
        value: c.value
      }));
      
      const result = await queryDocs<T>(collectionName, filters, {
        orderBy: orderByField ? { field: orderByField, dir: 'asc' } : undefined,
        limit: limitCount
      });
      
      return mapDocsToLegacy(result.items);
    } catch (error) {
      console.error(`Fehler bei der Abfrage von ${collectionName}:`, error);
      throw error;
    }
  }

  static cleanDataForFirestore<T>(data: Partial<T>): Partial<T> {
    return cleanDataForStorage(data);
  }

  /**
   * Subscribe to collection changes using realtimeClient
   */
  static subscribeToCollection<T>(
    collectionName: string,
    concernID: string,
    callback: (documents: T[]) => void
  ): () => void {
    const filters: QueryFilter[] = [{ field: 'concernID', op: '==', value: concernID }];
    
    return watchQuery<T>(collectionName, filters, (docs, error) => {
      if (error) {
        console.error(`Subscription error for ${collectionName}:`, error);
        return;
      }
      const documents = mapDocsToLegacy(docs);
      callback(documents);
    }, { intervalMs: 10000 }); // 10 second polling
  }

  static async batchOperation(operations: Array<{ type: 'create' | 'update' | 'delete', collection: string, data?: any, docId?: string }>): Promise<void> {
    try {
      const batchOps: BatchOperation[] = operations.map(op => {
        if (op.type === 'create') {
          // For create, we need to generate an ID or use addDoc
          const docId = op.docId || crypto.randomUUID();
          return {
            type: 'set' as const,
            path: `${op.collection}/${docId}`,
            data: {
              ...op.data,
              dateCreated: new Date().toISOString(),
              lastModified: new Date().toISOString()
            }
          };
        } else if (op.type === 'update' && op.docId) {
          return {
            type: 'update' as const,
            path: `${op.collection}/${op.docId}`,
            data: {
              ...op.data,
              lastModified: new Date().toISOString()
            }
          };
        } else if (op.type === 'delete' && op.docId) {
          return {
            type: 'delete' as const,
            path: `${op.collection}/${op.docId}`
          };
        }
        throw new Error(`Invalid batch operation: ${JSON.stringify(op)}`);
      });
      
      await batchWrite(batchOps);
    } catch (error) {
      console.error('Fehler bei der Batch-Operation:', error);
      throw error;
    }
  }
}

// ============================================================================
// Specialized Service Methods (Compatibility Layer)
// ============================================================================

export const concernService = {
  async create(data: Omit<Concern, 'uid'>): Promise<string> {
    return FirestoreService.create<Concern>('concern', data);
  },
  
  async createWithId(concernID: string, data: Omit<Concern, 'uid'>): Promise<string> {
    return FirestoreService.createWithId<Concern>('concern', concernID, data);
  },
  
  async get(id: string): Promise<Concern | null> {
    return FirestoreService.get<Concern>('concern', id);
  },
  
  async getAll(): Promise<Concern[]> {
    return FirestoreService.getAll<Concern>('concern');
  },
  
  async update(id: string, data: Partial<Concern>): Promise<void> {
    return FirestoreService.update<Concern>('concern', id, data);
  },
  
  async delete(id: string): Promise<void> {
    return FirestoreService.delete('concern', id);
  },

  async findByVerificationCode(code: string): Promise<Concern | null> {
    try {
      const concerns = await FirestoreService.query<Concern>('concern', [
        { field: 'verificationCode', operator: '==', value: code },
        { field: 'verificationCodeActive', operator: '==', value: true }
      ]);
      
      if (concerns.length === 0) return null;
      
      const concern = concerns[0];
      
      if (concern.verificationCodeExpiry) {
        const expiryDate = convertTimestamp(concern.verificationCodeExpiry);
        if (expiryDate < new Date()) {
          console.log('⚠️ Verifizierungscode ist abgelaufen');
          return null;
        }
      }
      
      return concern;
    } catch (error) {
      console.error('❌ Fehler beim Suchen nach Verifizierungscode:', error);
      return null;
    }
  },

  async generateVerificationCode(concernID: string): Promise<string> {
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    const expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() + 24);
    
    await this.update(concernID, {
      verificationCode: code,
      verificationCodeExpiry: expiryDate,
      verificationCodeActive: true,
      verificationCodeCreated: new Date()
    });
    
    return code;
  },

  async deactivateVerificationCode(concernID: string): Promise<void> {
    await this.update(concernID, { verificationCodeActive: false });
  }
};

export const userService = {
  async create(data: Omit<User, 'uid'>): Promise<string> {
    return FirestoreService.create<User>('users', data);
  },
  
  async createWithId(userId: string, data: Omit<User, 'uid'>): Promise<string> {
    return FirestoreService.createWithId<User>('users', userId, data);
  },
  
  async get(id: string): Promise<User | null> {
    return FirestoreService.get<User>('users', id);
  },
  
  async getAll(concernID: string): Promise<User[]> {
    return FirestoreService.getAll<User>('users', concernID);
  },
  
  async update(id: string, data: Partial<User>): Promise<void> {
    return FirestoreService.update<User>('users', id, data);
  },
  
  async delete(id: string): Promise<void> {
    return FirestoreService.delete('users', id);
  },

  async getByEmail(email: string): Promise<User | null> {
    try {
      const users = await FirestoreService.query<User>('users', [
        { field: 'email', operator: '==', value: email }
      ]);
      return users.length > 0 ? users[0] : null;
    } catch (error) {
      console.error('❌ Fehler beim Suchen nach E-Mail:', error);
      return null;
    }
  },

  async findUserByVerificationCode(code: string): Promise<User | null> {
    try {
      const users = await FirestoreService.query<User>('users', [
        { field: 'verificationCode', operator: '==', value: code }
      ]);
      
      if (users.length === 0) return null;
      
      const user = users[0];
      
      // Check if code is still valid (within 24 hours)
      if (user.verificationCodeDate) {
        const codeDate = convertTimestamp(user.verificationCodeDate);
        const hoursSinceCode = (Date.now() - codeDate.getTime()) / (1000 * 60 * 60);
        if (hoursSinceCode > 24) {
          console.log('⚠️ Verifizierungscode ist abgelaufen');
          return null;
        }
      }
      
      return user;
    } catch (error) {
      console.error('❌ Fehler beim Suchen nach Verifizierungscode:', error);
      return null;
    }
  }
};

export const projectService = {
  async create(data: Omit<Project, 'uid'>): Promise<string> {
    return FirestoreService.create<Project>('projects', data);
  },
  
  async createWithId(projectId: string, data: Omit<Project, 'uid'>): Promise<string> {
    return FirestoreService.createWithId<Project>('projects', projectId, data);
  },
  
  async get(id: string): Promise<Project | null> {
    return FirestoreService.get<Project>('projects', id);
  },
  
  async getAll(concernID: string): Promise<Project[]> {
    return FirestoreService.getAll<Project>('projects', concernID);
  },
  
  async update(id: string, data: Partial<Project>): Promise<void> {
    return FirestoreService.update<Project>('projects', id, data);
  },
  
  async delete(id: string): Promise<void> {
    return FirestoreService.delete('projects', id);
  },

  async getByProjectNumber(concernID: string, projectNumber: number): Promise<Project | null> {
    try {
      const projects = await FirestoreService.query<Project>('projects', [
        { field: 'concernID', operator: '==', value: concernID },
        { field: 'projectNumber', operator: '==', value: projectNumber }
      ]);
      return projects.length > 0 ? projects[0] : null;
    } catch (error) {
      console.error('❌ Fehler beim Suchen nach Projektnummer:', error);
      return null;
    }
  }
};

export const taskService = {
  async create(data: Omit<Task, 'uid'>): Promise<string> {
    return FirestoreService.create<Task>('tasks', data);
  },
  
  async get(id: string): Promise<Task | null> {
    return FirestoreService.get<Task>('tasks', id);
  },
  
  async getAll(concernID: string): Promise<Task[]> {
    return FirestoreService.getAll<Task>('tasks', concernID);
  },
  
  async update(id: string, data: Partial<Task>): Promise<void> {
    return FirestoreService.update<Task>('tasks', id, data);
  },
  
  async delete(id: string): Promise<void> {
    return FirestoreService.delete('tasks', id);
  }
};

export const customerService = {
  async create(data: Omit<Customer, 'uid'>): Promise<string> {
    return FirestoreService.create<Customer>('customers', data);
  },
  
  async get(id: string): Promise<Customer | null> {
    return FirestoreService.get<Customer>('customers', id);
  },
  
  async getAll(concernID: string): Promise<Customer[]> {
    return FirestoreService.getAll<Customer>('customers', concernID);
  },
  
  async update(id: string, data: Partial<Customer>): Promise<void> {
    return FirestoreService.update<Customer>('customers', id, data);
  },
  
  async delete(id: string): Promise<void> {
    return FirestoreService.delete('customers', id);
  }
};

export const materialService = {
  async create(data: Omit<Material, 'uid'>): Promise<string> {
    return FirestoreService.create<Material>('materials', data);
  },
  
  async get(id: string): Promise<Material | null> {
    return FirestoreService.get<Material>('materials', id);
  },
  
  async getAll(concernID: string): Promise<Material[]> {
    return FirestoreService.getAll<Material>('materials', concernID);
  },
  
  async update(id: string, data: Partial<Material>): Promise<void> {
    return FirestoreService.update<Material>('materials', id, data);
  },
  
  async delete(id: string): Promise<void> {
    return FirestoreService.delete('materials', id);
  }
};

export const categoryService = {
  async create(data: Omit<Category, 'uid'>): Promise<string> {
    return FirestoreService.create<Category>('categories', data);
  },
  
  async get(id: string): Promise<Category | null> {
    return FirestoreService.get<Category>('categories', id);
  },
  
  async getAll(concernID: string): Promise<Category[]> {
    return FirestoreService.getAll<Category>('categories', concernID);
  },
  
  async update(id: string, data: Partial<Category>): Promise<void> {
    return FirestoreService.update<Category>('categories', id, data);
  },
  
  async delete(id: string): Promise<void> {
    return FirestoreService.delete('categories', id);
  }
};

export const reportService = {
  async create(data: Omit<Report, 'id'>): Promise<string> {
    return FirestoreService.create<Report>('ProjectReports', data);
  },
  
  async get(id: string): Promise<Report | null> {
    return FirestoreService.get<Report>('ProjectReports', id);
  },
  
  async getReportsByConcern(concernID: string): Promise<Report[]> {
    return FirestoreService.getAll<Report>('ProjectReports', concernID);
  },
  
  async update(id: string, data: Partial<Report>): Promise<void> {
    return FirestoreService.update<Report>('ProjectReports', id, data);
  },
  
  async delete(id: string): Promise<void> {
    return FirestoreService.delete('ProjectReports', id);
  },

  async getByProjectNumber(concernID: string, projectNumber: string): Promise<Report[]> {
    try {
      return FirestoreService.query<Report>('ProjectReports', [
        { field: 'concernID', operator: '==', value: concernID },
        { field: 'projectNumber', operator: '==', value: projectNumber }
      ]);
    } catch (error) {
      console.error('❌ Fehler beim Abrufen der Berichte:', error);
      return [];
    }
  }
};
