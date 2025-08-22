import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  setDoc,
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  Timestamp,
  writeBatch,
  onSnapshot,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '@/config/firebase';

// Typen für die Datenbankstruktur
export interface Concern {
  uid?: string; // Optional für neue Erstellung
  concernName: string;
  concernAddress: string;
  concernTel: string;
  concernEmail: string;
  dateCreated: Timestamp | Date;
  updateTime: Timestamp | Date;
  members: number;
  // Verifizierungscode-Felder
  verificationCode?: string;
  verificationCodeExpiry?: Timestamp | Date;
  verificationCodeActive?: boolean;
  verificationCodeCreated?: Timestamp | Date;
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
  lastSync: Date;
  nachname: string;
  generatedProjects: number;
  rechte: number;
  startDate?: Date;
  dateOfBirth?: Date;
  role: string;
  isActive: boolean;
  isDemoUser?: boolean;
  // Adressfeld
  address?: string;
  // Private Adressfelder
  privateAddress?: string;
  privateCity?: string;
  privatePostalCode?: string;
  privateCountry?: string;
  // Verifizierungsfelder
  verificationCode?: string;
  verificationCodeDate?: Date;
  verificationCodeSent?: boolean;
  verificationCodeSentAt?: string;
  // Löschfelder
  isDeleted?: boolean;
  deletedAt?: Date;

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
  // Mobile App Felder
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
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
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

// Hilfsfunktion für Datum-Konvertierung
const convertTimestamp = (timestamp: any): Date => {
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate();
  }
  if (timestamp instanceof Date) {
    return timestamp;
  }
  if (typeof timestamp === 'string') {
    return new Date(timestamp);
  }
  return new Date();
};

// Generic CRUD-Operationen
export class FirestoreService {
  
  // Dokument erstellen
  static async create<T>(collectionName: string, data: T): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, collectionName), {
        ...data,
        dateCreated: Timestamp.now(),
        lastModified: Timestamp.now()
      });
      return docRef.id;
    } catch (error) {
      console.error(`Fehler beim Erstellen von ${collectionName}:`, error);
      throw error;
    }
  }

  // Dokument mit benutzerdefinierter ID erstellen
  static async createWithId<T>(collectionName: string, docId: string, data: T): Promise<string> {
    try {
      const docRef = doc(db, collectionName, docId);
      await setDoc(docRef, {
        ...data,
        dateCreated: Timestamp.now(),
        lastModified: Timestamp.now()
      });
      return docId;
    } catch (error) {
      console.error(`Fehler beim Erstellen von ${collectionName} mit ID ${docId}:`, error);
      throw error;
    }
  }

  // Dokument abrufen
  static async get<T>(collectionName: string, docId: string): Promise<T | null> {
    try {
      const docRef = doc(db, collectionName, docId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        // Timestamps zu Dates konvertieren
        const convertedData = FirestoreService.convertTimestamps<T>(data);
        return {
          ...convertedData,
          uid: docSnap.id
        };
      }
      return null;
    } catch (error) {
      console.error(`Fehler beim Abrufen von ${collectionName}:`, error);
      throw error;
    }
  }

  // Alle Dokumente einer Collection abrufen
  static async getAll<T>(collectionName: string, concernID?: string): Promise<T[]> {
    try {
      let q: any = collection(db, collectionName);
      
      if (concernID) {
        q = query(q, where('concernID', '==', concernID));
      }
      
      const querySnapshot = await getDocs(q);
      const documents: T[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Timestamps zu Dates konvertieren
        const convertedData = FirestoreService.convertTimestamps<T>(data);
        documents.push({
          ...convertedData,
          uid: doc.id
        });
      });
      
      return documents;
    } catch (error) {
      console.error(`Fehler beim Abrufen aller ${collectionName}:`, error);
      throw error;
    }
  }

  // Dokument aktualisieren
  static async update<T>(collectionName: string, docId: string, data: Partial<T>): Promise<void> {
    try {
      const docRef = doc(db, collectionName, docId);
      
      // WICHTIG: Bereinige Daten vor dem Senden an Firestore
      // Konvertiere undefined-Werte zu null und bereinige verschachtelte Objekte
      const cleanedData = this.cleanDataForFirestore(data);
      
      await updateDoc(docRef, {
        ...cleanedData,
        lastModified: Timestamp.now()
      });
    } catch (error) {
      console.error(`Fehler beim Aktualisieren von ${collectionName}:`, error);
      throw error;
    }
  }

  // Dokument löschen
  static async delete(collectionName: string, docId: string): Promise<void> {
    try {
      const docRef = doc(db, collectionName, docId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error(`Fehler beim Löschen von ${collectionName}:`, error);
      throw error;
    }
  }

  // Dokumente nach Bedingungen abfragen
  static async query<T>(
    collectionName: string, 
    conditions: Array<{ field: string; operator: any; value: any }>,
    orderByField?: string,
    limitCount?: number
  ): Promise<T[]> {
    try {
      let q: any = collection(db, collectionName);
      
      // Bedingungen hinzufügen
      conditions.forEach(condition => {
        q = query(q, where(condition.field, condition.operator, condition.value));
      });
      
      // Sortierung hinzufügen
      if (orderByField) {
        q = query(q, orderBy(orderByField));
      }
      
      // Limit hinzufügen
      if (limitCount) {
        q = query(q, limit(limitCount));
      }
      
      const querySnapshot = await getDocs(q);
      const documents: T[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Timestamps zu Dates konvertieren
        const convertedData = FirestoreService.convertTimestamps<T>(data);
        documents.push({
          ...convertedData,
          uid: doc.id
        });
      });
      
      return documents;
    } catch (error) {
      console.error(`Fehler bei der Abfrage von ${collectionName}:`, error);
      throw error;
    }
  }

  // Hilfsfunktion zum Konvertieren von Firestore-Timestamps zu JavaScript-Dates
  private static convertTimestamps<T>(data: any): T {
    const converted = { ...data };
    
    // Alle Felder durchgehen und Timestamps konvertieren
    Object.keys(converted).forEach(key => {
      const value = converted[key];
      if (value && typeof value === 'object' && 'toDate' in value) {
        // Firestore Timestamp zu JavaScript Date konvertieren
        converted[key] = value.toDate();
      } else if (value && typeof value === 'object' && 'seconds' in value && 'nanoseconds' in value) {
        // Fallback für Timestamp-Objekte ohne toDate() Methode
        converted[key] = new Date(value.seconds * 1000 + value.nanoseconds / 1000000);
      }
    });
    
    return converted;
  }

  // Hilfsfunktion zum Bereinigen von Daten vor dem Senden an Firestore
  static cleanDataForFirestore<T>(data: Partial<T>): Partial<T> {
    const cleaned = { ...data };
    
    // Alle Felder durchgehen und undefined/leere Werte bereinigen
    Object.keys(cleaned).forEach(key => {
      const value = (cleaned as any)[key];
      
      if (value === undefined) {
        // undefined zu null konvertieren
        (cleaned as any)[key] = null;
      } else if (value === '') {
        // Leere Strings zu null konvertieren (optional, da einige Felder leere Strings erlauben könnten)
        // (cleaned as any)[key] = null;
      } else if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        // Rekursiv verschachtelte Objekte bereinigen
        (cleaned as any)[key] = this.cleanDataForFirestore(value);
      }
    });
    
    return cleaned;
  }

  // Echtzeit-Updates abonnieren
  static subscribeToCollection<T>(
    collectionName: string,
    concernID: string,
    callback: (documents: T[]) => void
  ) {
    const q = query(
      collection(db, collectionName),
      where('concernID', '==', concernID)
    );
    
    return onSnapshot(q, (querySnapshot) => {
      const documents: T[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Timestamps zu Dates konvertieren
        const convertedData = FirestoreService.convertTimestamps<T>(data);
        documents.push({
          ...convertedData,
          uid: doc.id
        });
      });
      callback(documents);
    });
  }

  // Batch-Operationen
  static async batchOperation(operations: Array<{ type: 'create' | 'update' | 'delete', collection: string, data?: any, docId?: string }>): Promise<void> {
    try {
      const batch = writeBatch(db);
      
      operations.forEach(op => {
        if (op.type === 'create') {
          const docRef = doc(collection(db, op.collection));
          batch.set(docRef, {
            ...op.data,
            dateCreated: Timestamp.now(),
            lastModified: Timestamp.now()
          });
        } else if (op.type === 'update' && op.docId) {
          const docRef = doc(db, op.collection, op.docId);
          batch.update(docRef, {
            ...op.data,
            lastModified: Timestamp.now()
          });
        } else if (op.type === 'delete' && op.docId) {
          const docRef = doc(db, op.collection, op.docId);
          batch.delete(docRef);
        }
      });
      
      await batch.commit();
    } catch (error) {
      console.error('Fehler bei der Batch-Operation:', error);
      throw error;
    }
  }
}

// Spezifische Service-Methoden für jede Entität
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

  // Neue Funktionen für Verifizierungscodes
  async findByVerificationCode(code: string): Promise<Concern | null> {
    try {
      const concerns = await FirestoreService.query<Concern>('concern', [
        { field: 'verificationCode', operator: '==', value: code },
        { field: 'verificationCodeActive', operator: '==', value: true }
      ]);
      
      if (concerns.length === 0) return null;
      
      const concern = concerns[0];
      
      // Prüfe, ob der Code abgelaufen ist
      if (concern.verificationCodeExpiry) {
        const expiryDate = concern.verificationCodeExpiry instanceof Timestamp 
          ? concern.verificationCodeExpiry.toDate() 
          : new Date(concern.verificationCodeExpiry);
        
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
    try {
      // Generiere einen 8-stelligen alphanumerischen Code
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      
      // Setze Ablaufdatum auf 24 Stunden
      const expiryDate = new Date();
      expiryDate.setHours(expiryDate.getHours() + 24);
      
      // Aktualisiere die Concern mit dem neuen Code
      await this.update(concernID, {
        verificationCode: code,
        verificationCodeExpiry: expiryDate,
        verificationCodeActive: true,
        verificationCodeCreated: new Date()
      });
      
      console.log('✅ Verifizierungscode generiert:', code);
      return code;
    } catch (error) {
      console.error('❌ Fehler beim Generieren des Verifizierungscodes:', error);
      throw error;
    }
  },

  async deactivateVerificationCode(concernID: string): Promise<void> {
    try {
      await this.update(concernID, {
        verificationCodeActive: false
      });
      console.log('✅ Verifizierungscode deaktiviert für Concern:', concernID);
    } catch (error) {
      console.error('❌ Fehler beim Deaktivieren des Verifizierungscodes:', error);
      throw error;
    }
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
    // Instead of deleting the user document, mark them as deleted
    // This prevents them from logging in while preserving data integrity
    await FirestoreService.update('users', id, {
      isDeleted: true,
      deletedAt: new Date(),
      isActive: false
    });
  },
  
  async getByEmail(email: string, concernID: string): Promise<User | null> {
    const users = await FirestoreService.query<User>('users', [
      { field: 'email', operator: '==', value: email },
      { field: 'concernEmail', operator: '==', value: email },
      { field: 'concernID', operator: '==', value: concernID }
    ]);
    return users.length > 0 ? users[0] : null;
  },

  // Neue Funktionen für Verifizierungscodes
  async createWithVerificationCode(
    userData: Omit<User, 'uid'>, 
    verificationCode: string
  ): Promise<string> {
    try {
      // Finde den Benutzer mit diesem Verifizierungscode in der users Collection
      const existingUser = await this.findUserByVerificationCode(verificationCode);
      
      if (!existingUser) {
        throw new Error('Ungültiger oder abgelaufener Verifizierungscode');
      }
      
      console.log('✅ Benutzer mit Verifizierungscode gefunden:', existingUser.email);
      console.log('🔍 Bestehender Benutzer Details:', { 
        uid: existingUser.uid, 
        concernID: existingUser.concernID, 
        email: existingUser.email 
      });
      
      // WICHTIG: Überprüfe, ob bereits ein Firebase Auth Account mit dieser E-Mail existiert
      // Verwende eine bessere Methode als Dummy-Passwort-Anmeldung
      try {
        const { getAuth, fetchSignInMethodsForEmail } = await import('firebase/auth');
        const { auth } = await import('@/config/firebase');
        
        console.log('🔍 Überprüfe, ob Firebase Auth Account bereits existiert...');
        
        // Überprüfe, ob bereits Anmeldemethoden für diese E-Mail existieren
        const signInMethods = await fetchSignInMethodsForEmail(auth, existingUser.email);
        
        if (signInMethods.length > 0) {
          // Benutzer existiert bereits in Firebase Auth
          console.log('⚠️ Benutzer existiert bereits in Firebase Auth mit Methoden:', signInMethods);
          
          // Versuche, den Benutzer zu finden, indem wir uns mit dem neuen Passwort anmelden
          try {
            const password = (userData as any).password;
            if (!password) {
              throw new Error('Passwort ist erforderlich');
            }
            
            console.log('🔐 Versuche Anmeldung mit neuem Passwort...');
            const { signInWithEmailAndPassword } = await import('firebase/auth');
            const userCredential = await signInWithEmailAndPassword(auth, existingUser.email, password);
            
            console.log('✅ Anmeldung mit neuem Passwort erfolgreich');
            
            // Aktualisiere den bestehenden Firestore-Benutzer
            await this.update(existingUser.uid!, {
              verificationCode: null,
              verificationCodeDate: null,
              verificationCodeSent: false,
              // Aktualisiere auch andere Felder, falls sie sich geändert haben
              vorname: userData.vorname || existingUser.vorname,
              nachname: userData.nachname || existingUser.nachname,
              tel: userData.tel || existingUser.tel,
              role: userData.role || existingUser.role,
              rechte: userData.rechte || existingUser.rechte
            });
            
            console.log('✅ Firestore-Benutzer aktualisiert');
            return userCredential.user.uid;
            
          } catch (signInError: any) {
            console.log('🔍 Anmeldung mit neuem Passwort fehlgeschlagen:', signInError.code, signInError.message);
            
            if (signInError.code === 'auth/wrong-password') {
              throw new Error('Ein Benutzer mit dieser E-Mail existiert bereits, aber das Passwort ist falsch. Bitte verwenden Sie das ursprüngliche Passwort oder setzen Sie es zurück.');
            } else if (signInError.code === 'auth/user-disabled') {
              throw new Error('Dieser Benutzer-Account wurde deaktiviert. Bitte kontaktieren Sie den Administrator.');
            } else if (signInError.code === 'auth/too-many-requests') {
              throw new Error('Zu viele fehlgeschlagene Anmeldeversuche. Bitte warten Sie einen Moment und versuchen Sie es erneut.');
            } else {
              throw new Error(`Anmeldung fehlgeschlagen: ${signInError.message} (Code: ${signInError.code})`);
            }
          }
          
        } else {
          // Benutzer existiert NICHT in Firebase Auth - erstelle neuen Account
          console.log('ℹ️ Benutzer existiert nicht in Firebase Auth - erstelle neuen Account');
          
          const password = (userData as any).password;
          if (!password) {
            throw new Error('Passwort ist erforderlich');
          }
          
          console.log('🔐 Erstelle Firebase Auth Benutzer für E-Mail:', existingUser.email);
          
          const { createUserWithEmailAndPassword } = await import('firebase/auth');
          const firebaseUserCredential = await createUserWithEmailAndPassword(
            auth,
            existingUser.email,
            password
          );
          
          console.log('✅ Neuer Firebase Auth Benutzer erstellt:', firebaseUserCredential.user.uid);
          
          // Aktualisiere den bestehenden Firestore-Benutzer mit der neuen Firebase UID
          await this.update(existingUser.uid!, {
            uid: firebaseUserCredential.user.uid,
            verificationCode: null,
            verificationCodeDate: null,
            verificationCodeSent: false,
            // Aktualisiere auch andere Felder, falls sie sich geändert haben
            vorname: userData.vorname || existingUser.vorname,
            nachname: userData.nachname || existingUser.nachname,
            tel: userData.tel || existingUser.tel,
            role: userData.role || existingUser.role,
            rechte: userData.rechte || existingUser.rechte
          });
          
          console.log('✅ Firestore-Benutzer mit neuer Firebase UID aktualisiert');
          
          // WICHTIG: Stelle sicher, dass der Benutzer die korrekte ConcernID behält
          // und nicht versehentlich überschrieben wird
          console.log('🔒 Benutzer behält ursprüngliche ConcernID:', existingUser.concernID);
          
          // WICHTIG: Aktualisiere den bestehenden Firestore-Benutzer mit der neuen Firebase UID
          // Das stellt sicher, dass der Benutzer beim nächsten Login gefunden wird
          console.log('🔒 Aktualisiere bestehenden Firestore-Benutzer mit Firebase UID...');
          
          await this.update(existingUser.uid!, {
            uid: firebaseUserCredential.user.uid,
            verificationCode: null,
            verificationCodeDate: null,
            verificationCodeSent: false,
            // Aktualisiere auch andere Felder
            vorname: userData.vorname || existingUser.vorname,
            nachname: userData.nachname || existingUser.nachname,
            tel: userData.tel || existingUser.tel,
            role: userData.role || existingUser.role,
            rechte: userData.rechte || existingUser.rechte
          });
          
          console.log('✅ Firestore-Benutzer erfolgreich mit Firebase UID aktualisiert');
          
          return firebaseUserCredential.user.uid;
        }
        
      } catch (createUserError: any) {
        console.log('🔍 Firebase Auth Fehler analysiert:', createUserError.code, createUserError.message);
        
        // Detaillierte Fehleranalyse
        if (createUserError.code === 'auth/email-already-in-use') {
          throw new Error('Diese E-Mail-Adresse wird bereits verwendet. Bitte melden Sie sich an oder verwenden Sie eine andere E-Mail.');
        } else if (createUserError.code === 'auth/invalid-email') {
          throw new Error('Ungültige E-Mail-Adresse. Bitte überprüfen Sie das Format.');
        } else if (createUserError.code === 'auth/weak-password') {
          throw new Error('Das Passwort ist zu schwach. Es muss mindestens 6 Zeichen lang sein.');
        } else if (createUserError.code === 'auth/operation-not-allowed') {
          throw new Error('E-Mail/Passwort-Registrierung ist nicht aktiviert. Bitte kontaktieren Sie den Administrator.');
        } else if (createUserError.code === 'auth/network-request-failed') {
          throw new Error('Netzwerkfehler. Bitte überprüfen Sie Ihre Internetverbindung.');
        } else {
          throw new Error(`Firebase Auth Fehler: ${createUserError.message} (Code: ${createUserError.code})`);
        }
      }
      
    } catch (error) {
      console.error('❌ Fehler beim Verarbeiten des Verifizierungscodes:', error);
      throw error;
    }
  },

  // Neue Funktion: Benutzer nach Verifizierungscode in der users Collection suchen
  async findUserByVerificationCode(verificationCode: string): Promise<User | null> {
    try {
      console.log('🔍 Suche nach Benutzer mit Verifizierungscode:', verificationCode);
      
      const usersRef = collection(db, 'users');
      const q = query(
        usersRef,
        where('verificationCode', '==', verificationCode)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const user = querySnapshot.docs[0].data() as User;
        user.uid = querySnapshot.docs[0].id;
        console.log('✅ Benutzer mit Verifizierungscode gefunden:', user);
        return user;
      }
      
      console.log('ℹ️ Kein Benutzer mit diesem Verifizierungscode gefunden');
      return null;
    } catch (error) {
      console.error('❌ Fehler beim Suchen nach Benutzer:', error);
      return null;
    }
  },

  // Neue Funktion: Bereinige doppelte Benutzer-Einträge
  async cleanupDuplicateUsers(email: string): Promise<void> {
    try {
      console.log('🧹 Bereinige doppelte Benutzer-Einträge für E-Mail:', email);
      
      // Suche nach allen Benutzern mit derselben E-Mail
      const usersRef = collection(db, 'users');
      const q = query(
        usersRef,
        where('email', '==', email)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        console.log('ℹ️ Keine Benutzer mit dieser E-Mail gefunden');
        return;
      }
      
      const users = querySnapshot.docs.map(doc => ({
        ...doc.data() as User,
        uid: doc.id
      }));
      
      console.log(`🔍 ${users.length} Benutzer mit E-Mail ${email} gefunden`);
      
      if (users.length <= 1) {
        console.log('ℹ️ Keine Duplikate gefunden');
        return;
      }
      
      // Sortiere Benutzer nach Priorität:
      // 1. Benutzer mit Verifizierungscode (höchste Priorität)
      // 2. Benutzer mit Firebase UID
      // 3. Benutzer ohne UID (niedrigste Priorität)
      users.sort((a, b) => {
        const aPriority = userService.getUserPriority(a);
        const bPriority = userService.getUserPriority(b);
        return bPriority - aPriority; // Höhere Priorität zuerst
      });
      
      console.log('📊 Benutzer nach Priorität sortiert:', users.map(u => ({ 
        uid: u.uid, 
        concernID: u.concernID, 
        priority: userService.getUserPriority(u),
        hasVerificationCode: !!u.verificationCode,
        hasFirebaseUID: !!u.uid && u.uid !== u.concernID
      })));
      
      // Behalte den Benutzer mit der höchsten Priorität
      const keepUser = users[0];
      const deleteUsers = users.slice(1);
      
      console.log('✅ Behalte Benutzer:', { 
        uid: keepUser.uid, 
        concernID: keepUser.concernID, 
        priority: userService.getUserPriority(keepUser) 
      });
      
      // Lösche alle anderen Benutzer
      for (const deleteUser of deleteUsers) {
        console.log('🗑️ Lösche doppelten Benutzer:', { 
          uid: deleteUser.uid, 
          concernID: deleteUser.concernID 
        });
        
        try {
          await this.delete(deleteUser.uid!);
          console.log('✅ Benutzer gelöscht:', deleteUser.uid);
        } catch (deleteError) {
          console.error('❌ Fehler beim Löschen des Benutzers:', deleteError);
        }
      }
      
      console.log('✅ Bereinigung doppelter Benutzer abgeschlossen');
      
    } catch (error) {
      console.error('❌ Fehler bei der Bereinigung doppelter Benutzer:', error);
    }
  },

  // Neue Funktion: Bereinige doppelte Benutzer-Einträge mit intelligenter ConcernID-Auswahl
  async cleanupDuplicateUsersWithConcernID(email: string, preferredConcernID?: string): Promise<void> {
    try {
      console.log('🧹 Bereinige doppelte Benutzer-Einträge für E-Mail:', email, 'mit bevorzugter ConcernID:', preferredConcernID);
      
      // Suche nach allen Benutzern mit derselben E-Mail
      const usersRef = collection(db, 'users');
      const q = query(
        usersRef,
        where('email', '==', email)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        console.log('ℹ️ Keine Benutzer mit dieser E-Mail gefunden');
        return;
      }
      
      const users = querySnapshot.docs.map(doc => ({
        ...doc.data() as User,
        uid: doc.id
      }));
      
      console.log(`🔍 ${users.length} Benutzer mit E-Mail ${email} gefunden`);
      
      if (users.length <= 1) {
        console.log('ℹ️ Keine Duplikate gefunden');
        return;
      }
      
      // Wenn eine bevorzugte ConcernID angegeben ist, verwende diese
      if (preferredConcernID) {
        console.log('🎯 Verwende bevorzugte ConcernID:', preferredConcernID);
        
        // Finde den Benutzer mit der bevorzugten ConcernID
        const preferredUser = users.find(u => u.concernID === preferredConcernID);
        
        if (preferredUser) {
          console.log('✅ Benutzer mit bevorzugter ConcernID gefunden:', preferredUser.uid);
          
          // Lösche alle anderen Benutzer
          for (const user of users) {
            if (user.uid !== preferredUser.uid) {
              console.log('🗑️ Lösche Benutzer mit anderer ConcernID:', { 
                uid: user.uid, 
                concernID: user.concernID 
              });
              
              try {
                await this.delete(user.uid!);
                console.log('✅ Benutzer gelöscht:', user.uid);
              } catch (deleteError) {
                console.error('❌ Fehler beim Löschen des Benutzers:', deleteError);
              }
            }
          }
          
          console.log('✅ Bereinigung mit bevorzugter ConcernID abgeschlossen');
          return;
        } else {
          console.log('⚠️ Kein Benutzer mit bevorzugter ConcernID gefunden, verwende Standard-Priorität');
        }
      }
      
      // Fallback: Verwende die Standard-Prioritätslogik
      await this.cleanupDuplicateUsers(email);
      
    } catch (error) {
      console.error('❌ Fehler bei der Bereinigung mit ConcernID:', error);
    }
  },

  // Neue Funktion: Bereinige ALLE bestehenden doppelten Benutzer-Einträge in der gesamten Datenbank
  async cleanupAllDuplicateUsers(): Promise<void> {
    try {
      console.log('🧹 Starte globale Bereinigung aller doppelten Benutzer-Einträge...');
      
      // Hole alle Benutzer aus der Datenbank
      const usersRef = collection(db, 'users');
      const querySnapshot = await getDocs(usersRef);
      
      if (querySnapshot.empty) {
        console.log('ℹ️ Keine Benutzer in der Datenbank gefunden');
        return;
      }
      
      const allUsers = querySnapshot.docs.map(doc => ({
        ...doc.data() as User,
        uid: doc.id
      }));
      
      console.log(`🔍 ${allUsers.length} Benutzer insgesamt in der Datenbank gefunden`);
      
      // Gruppiere Benutzer nach E-Mail
      const usersByEmail = new Map<string, any[]>();
      
      allUsers.forEach(user => {
        if (user.email) {
          if (!usersByEmail.has(user.email)) {
            usersByEmail.set(user.email, []);
          }
          usersByEmail.get(user.email)!.push(user);
        }
      });
      
      // Finde E-Mails mit mehreren Benutzern
      const duplicateEmails = Array.from(usersByEmail.entries())
        .filter(([email, users]) => users.length > 1);
      
      console.log(`🔍 ${duplicateEmails.length} E-Mails mit doppelten Benutzern gefunden`);
      
      if (duplicateEmails.length === 0) {
        console.log('✅ Keine doppelten Benutzer gefunden');
        return;
      }
      
      // Bereinige jede E-Mail mit Duplikaten
      for (const [email, users] of duplicateEmails) {
        console.log(`🧹 Bereinige E-Mail: ${email} (${users.length} Benutzer)`);
        await this.cleanupDuplicateUsers(email);
      }
      
      console.log('✅ Globale Bereinigung aller doppelten Benutzer abgeschlossen');
      
    } catch (error) {
      console.error('❌ Fehler bei der globalen Bereinigung:', error);
    }
  },

  // Hilfsfunktion: Bestimme Priorität eines Benutzers
  getUserPriority(user: User): number {
    let priority = 0;
    
    // Höchste Priorität: Benutzer mit Verifizierungscode
    if (user.verificationCode) {
      priority += 100;
    }
    
    // Hohe Priorität: Benutzer mit Firebase UID
    if (user.uid && user.uid !== user.concernID) {
      priority += 50;
    }
    
    // Mittlere Priorität: Benutzer mit ConcernID
    if (user.concernID && user.concernID !== 'DE0000000000') {
      priority += 25;
    }
    
    // Niedrige Priorität: Aktive Benutzer
    if (user.isActive) {
      priority += 10;
    }
    
    return priority;
  },


};

export const projectService = {
  async create(data: Omit<Project, 'uid'>): Promise<string> {
    return FirestoreService.create<Project>('projects', data);
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
  
  async getByEmployee(mitarbeiterID: string, concernID: string): Promise<Project[]> {
    return FirestoreService.query<Project>('projects', [
      { field: 'mitarbeiterID', operator: '==', value: mitarbeiterID },
      { field: 'concernID', operator: '==', value: concernID }
    ]);
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
  },
  
  async getByProject(projectNumber: string, concernID: string): Promise<Task[]> {
    return FirestoreService.query<Task>('tasks', [
      { field: 'projectNumber', operator: '==', value: projectNumber },
      { field: 'concernID', operator: '==', value: concernID }
    ]);
  },
  
  async getByEmployee(assignedTo: string, concernID: string): Promise<Task[]> {
    return FirestoreService.query<Task>('tasks', [
      { field: 'assignedTo', operator: '==', value: assignedTo },
      { field: 'concernID', operator: '==', value: concernID }
    ]);
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
  },
  
  async getByCategory(category: string, concernID: string): Promise<Material[]> {
    return FirestoreService.query<Material>('materials', [
      { field: 'category', operator: '==', value: category },
      { field: 'concernID', operator: '==', value: concernID }
    ]);
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
  },
  
  async getByType(type: string, concernID: string): Promise<Category[]> {
    return FirestoreService.query<Category>('categories', [
      { field: 'type', operator: '==', value: type },
      { field: 'concernID', operator: '==', value: concernID }
    ]);
  }
};

// Report Service
export const reportService = {
  // Debug function to see all reports in the collection
  async debugAllReports(): Promise<void> {
    try {
      console.log('🔍 DEBUG: Fetching ALL reports from ProjectReports collection...');
      
      const reportsRef = collection(db, 'ProjectReports');
      const querySnapshot = await getDocs(reportsRef);
      
      console.log('📊 Total documents in ProjectReports:', querySnapshot.size);
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        console.log('📄 Document:', {
          id: doc.id,
          concernID: data.concernID,
          reportNumber: data.reportNumber,
          employee: data.employee,
          projectNumber: data.projectNumber,
          status: data.status,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          // Show first few fields to avoid console spam
          ...Object.fromEntries(
            Object.entries(data).slice(0, 10)
          )
        });
      });
      
      // Also check what fields exist in the first document
      if (querySnapshot.size > 0) {
        const firstDoc = querySnapshot.docs[0];
        const firstData = firstDoc.data();
        console.log('🔍 First document fields:', Object.keys(firstData));
        console.log('🔍 First document full data:', firstData);
      }
      
    } catch (error) {
      console.error('❌ Debug function error:', error);
    }
  },

  // Get all reports for a specific concern
  async getReportsByConcern(concernID: string): Promise<Report[]> {
    try {
      console.log('🔍 Fetching reports for concern:', concernID);
      
      const reportsRef = collection(db, 'ProjectReports');
      
      // Only get reports with the specific concernID
      const q = query(
        reportsRef,
        where('concernID', '==', concernID)
      );
      
      console.log('📋 Query for concernID:', concernID);
      
      const querySnapshot = await getDocs(q);
      console.log('📊 Query snapshot size for concernID:', querySnapshot.size);
      
      const reports: Report[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        console.log('📄 Document with concernID:', { id: doc.id, concernID: data.concernID, ...data });
        
        reports.push({
          id: doc.id,
          ...data
        } as Report);
      });
      
      console.log('✅ Total reports found with concernID:', reports.length);
      return reports;
    } catch (error) {
      console.error('❌ Error fetching reports by concern:', error);
      
      // Try a simpler query without any filters to debug
      try {
        console.log('🔄 Trying simple query without filters...');
        const reportsRef = collection(db, 'ProjectReports');
        const simpleQuery = query(reportsRef);
        const simpleSnapshot = await getDocs(simpleQuery);
        
        console.log('📊 Simple query found:', simpleSnapshot.size, 'total documents');
        
        simpleSnapshot.forEach((doc) => {
          const data = doc.data();
          console.log('📄 All document data:', { id: doc.id, concernID: data.concernID, ...data });
        });
      } catch (debugError) {
        console.error('❌ Debug query also failed:', debugError);
      }
      
      throw error;
    }
  },

  // Get reports by employee within a concern
  async getReportsByEmployee(concernID: string, employeeId: string): Promise<Report[]> {
    try {
      const reportsRef = collection(db, 'ProjectReports');
      const q = query(
        reportsRef,
        where('concernID', '==', concernID),
        where('mitarbeiterID', '==', employeeId),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const reports: Report[] = [];
      
      querySnapshot.forEach((doc) => {
        reports.push({
          id: doc.id,
          ...doc.data()
        } as Report);
      });
      
      return reports;
    } catch (error) {
      console.error('Error fetching reports by employee:', error);
      throw error;
    }
  },

  // Get reports by project within a concern
  async getReportsByProject(concernID: string, projectNumber: string): Promise<Report[]> {
    try {
      const reportsRef = collection(db, 'ProjectReports');
      const q = query(
        reportsRef,
        where('concernID', '==', concernID),
        where('projectNumber', '==', projectNumber),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const reports: Report[] = [];
      
      querySnapshot.forEach((doc) => {
        reports.push({
          id: doc.id,
          ...doc.data()
        } as Report);
      });
      
      return reports;
    } catch (error) {
      console.error('Error fetching reports by project:', error);
      throw error;
    }
  },

  // Create a new report
  async createReport(reportData: Omit<Report, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      const reportsRef = collection(db, 'ProjectReports');
      const newReport = {
        ...reportData,
        status: reportData.status || 'pending', // Default status
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      const docRef = await addDoc(reportsRef, newReport);
      return docRef.id;
    } catch (error) {
      console.error('Error creating report:', error);
      throw error;
    }
  },

  // Update an existing report
  async updateReport(reportId: string, updateData: Partial<Report>): Promise<void> {
    try {
      const reportRef = doc(db, 'ProjectReports', reportId);
      await updateDoc(reportRef, {
        ...updateData,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating report:', error);
      throw error;
    }
  },

  // Initialize status for all existing reports in a concern
  async initializeReportStatuses(concernID: string): Promise<void> {
    try {
      console.log('🔧 Initializing report statuses for concern:', concernID);
      
      const reportsRef = collection(db, 'ProjectReports');
      const q = query(reportsRef, where('concernID', '==', concernID));
      const querySnapshot = await getDocs(q);
      
      const batch = writeBatch(db);
      let updateCount = 0;
      
      querySnapshot.forEach((doc) => {
        const reportData = doc.data();
        if (!reportData.status) {
          batch.update(doc.ref, {
            status: 'pending',
            updatedAt: serverTimestamp()
          });
          updateCount++;
        }
      });
      
      if (updateCount > 0) {
        await batch.commit();
        console.log(`✅ Updated ${updateCount} reports with status 'pending'`);
      } else {
        console.log('ℹ️ All reports already have status field');
      }
    } catch (error) {
      console.error('❌ Error initializing report statuses:', error);
      throw error;
    }
  },

  // Delete a report
  async deleteReport(reportId: string): Promise<void> {
    try {
      const reportRef = doc(db, 'ProjectReports', reportId);
      await deleteDoc(reportRef);
    } catch (error) {
      console.error('Error deleting report:', error);
      throw error;
    }
  },

  // Get a single report by ID
  async getReportById(reportId: string): Promise<Report | null> {
    try {
      const reportRef = doc(db, 'ProjectReports', reportId);
      const reportSnap = await getDoc(reportRef);
      
      if (reportSnap.exists()) {
        return {
          id: reportSnap.id,
          ...reportSnap.data()
        } as Report;
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching report by ID:', error);
      throw error;
    }
  },

  // Real-time listener for reports by concern
  subscribeToReportsByConcern(concernID: string, callback: (reports: Report[]) => void) {
    try {
      const reportsRef = collection(db, 'ProjectReports');
      const q = query(
        reportsRef,
        where('concernID', '==', concernID),
        orderBy('createdAt', 'desc')
      );
      
      return onSnapshot(q, (querySnapshot) => {
        const reports: Report[] = [];
        querySnapshot.forEach((doc) => {
          reports.push({
            id: doc.id,
            ...doc.data()
          } as Report);
        });
        
        callback(reports);
      }, (error) => {
        console.error('Error in reports subscription:', error);
      });
    } catch (error) {
      console.error('Error setting up reports subscription:', error);
      throw error;
    }
  },

  // Real-time listener for reports by employee within concern
  subscribeToReportsByEmployee(concernID: string, employeeId: string, callback: (reports: Report[]) => void) {
    try {
      const reportsRef = collection(db, 'ProjectReports');
      const q = query(
        reportsRef,
        where('concernID', '==', concernID),
        where('mitarbeiterID', '==', employeeId),
        orderBy('createdAt', 'desc')
      );
      
      return onSnapshot(q, (querySnapshot) => {
        const reports: Report[] = [];
        querySnapshot.forEach((doc) => {
          reports.push({
            id: doc.id,
            ...doc.data()
          } as Report);
        });
        
        callback(reports);
      }, (error) => {
        console.error('Error in employee reports subscription:', error);
      });
    } catch (error) {
      console.error('Error setting up employee reports subscription:', error);
      throw error;
    }
  },

  // Real-time listener for reports by project within concern
  subscribeToReportsByProject(concernID: string, projectNumber: string, callback: (reports: Report[]) => void) {
    try {
      const reportsRef = collection(db, 'ProjectReports');
      const q = query(
        reportsRef,
        where('concernID', '==', concernID),
        where('projectNumber', '==', projectNumber),
        orderBy('createdAt', 'desc')
      );
      
      return onSnapshot(q, (querySnapshot) => {
        const reports: Report[] = [];
        querySnapshot.forEach((doc) => {
          reports.push({
            id: doc.id,
            ...doc.data()
          } as Report);
        });
        
        callback(reports);
      }, (error) => {
        console.error('Error in project reports subscription:', error);
      });
    } catch (error) {
      console.error('Error setting up project reports subscription:', error);
      throw error;
    }
  },

  // Initialize reports collection (sample report removed)
  async initializeReportsCollection(concernID: string): Promise<void> {
    try {
      console.log('🔧 Initializing ProjectReports collection for concern:', concernID);
      
      // Check if collection exists by trying to get a document
      const reportsRef = collection(db, 'ProjectReports');
      const q = query(reportsRef, where('concernID', '==', concernID), limit(1));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        console.log('📝 Collection is empty - no sample report created');
        // Sample report removed - collection will be initialized when first real report is created
      } else {
        console.log('✅ ProjectReports collection already exists');
      }
    } catch (error) {
      console.error('❌ Error initializing ProjectReports collection:', error);
      // Don't throw error - this is just initialization
    }
  },

  // Remove existing sample reports from the database
  async removeSampleReports(concernID: string): Promise<void> {
    try {
      console.log('🧹 Removing sample reports for concern:', concernID);
      
      const reportsRef = collection(db, 'ProjectReports');
      const q = query(
        reportsRef, 
        where('concernID', '==', concernID),
        where('projectNumber', '==', 'SAMPLE-PRJ')
      );
      
      const querySnapshot = await getDocs(q);
      let deleteCount = 0;
      
      if (!querySnapshot.empty) {
        const batch = writeBatch(db);
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.projectNumber === 'SAMPLE-PRJ' || data.reportNumber === 'SAMPLE-001') {
            batch.delete(doc.ref);
            deleteCount++;
            console.log('🗑️ Deleting sample report:', doc.id);
          }
        });
        
        if (deleteCount > 0) {
          await batch.commit();
          console.log(`✅ Deleted ${deleteCount} sample reports`);
        } else {
          console.log('ℹ️ No sample reports found to delete');
        }
      } else {
        console.log('ℹ️ No sample reports found');
      }
    } catch (error) {
      console.error('❌ Error removing sample reports:', error);
      throw error;
    }
  }
};
