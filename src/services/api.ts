/**
 * API Service - Firestore wrapper
 * 
 * CRITICAL: This service operates on the SAME Firestore schema as the TradeTrackr portal.
 * All paths are defined in src/config/tradeTrackrSchema.ts
 * 
 * Any queries or mutations here MUST mirror the portal's logic to ensure data consistency.
 */

import {
  collection,
  doc,
  query,
  where,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  Timestamp as FirestoreTimestamp,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from './firebase';
import { logError, logWarn } from './logger';
import {
  ConcernId,
  UserId,
  ProjectId,
  TaskId,
  Project,
  Task,
  TimeEntry,
  Photo,
  Note,
  DayReport,
  ProjectReport,
  WorkLine,
  Timestamp,
  AuthSession,
} from '../types';

/**
 * Convert Firebase Timestamp to our Timestamp type
 */
function toTimestamp(date: Date | FirestoreTimestamp): Timestamp {
  if (date instanceof Date) {
    return {
      seconds: Math.floor(date.getTime() / 1000),
      nanoseconds: (date.getTime() % 1000) * 1000000,
    };
  }
  return {
    seconds: date.seconds,
    nanoseconds: date.nanoseconds,
  };
}

/**
 * Convert our Timestamp to Firebase Timestamp
 */
function toFirestoreTimestamp(ts: Timestamp): FirestoreTimestamp {
  return FirestoreTimestamp.fromMillis(ts.seconds * 1000 + ts.nanoseconds / 1000000);
}

/**
 * Get concernID from user document
 * 
 * IMPORTANT: Uses flat structure - users collection at root level with concernID field
 * This matches the old mobile app and the portal's data structure
 */
export async function getUserConcernID(userId: UserId): Promise<ConcernId | null> {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      console.error('User document not found:', userId);
      return null;
    }

    const userData = userSnap.data();
    const concernID = userData.concernID || userData.concern_id || userData.concernId;

    if (!concernID) {
      console.error('User has no concernID:', userId);
      return null;
    }

    return concernID;
  } catch (error: any) {
    console.error('Error getting user concernID:', error);
    return null;
  }
}

/**
 * Get user's first name (vorname) from Firestore
 * 
 * @param userId - User ID
 * @returns First name or null if not found
 */
export async function getUserFirstName(userId: UserId): Promise<string | null> {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      console.error('User document not found:', userId);
      return null;
    }

    const userData = userSnap.data();
    const firstName = userData.vorname || userData.firstName || userData.first_name;

    return firstName || null;
  } catch (error: any) {
    console.error('Error getting user first name:', error);
    return null;
  }
}

/**
 * Get ALL projects for a concern (excluding internal)
 * This is for syncing all available projects to the mobile device
 */
export async function getAllProjects(concernID: ConcernId): Promise<Project[]> {
  try {
    console.log('📥 getAllProjects called with concernID:', concernID);
    
    const projectsRef = collection(db, 'projects');
    
    // Query all projects for this concern
    // Note: We need a composite index for concernID + createdAt
    const q = query(
      projectsRef,
      where('concernID', '==', concernID),
      orderBy('createdAt', 'desc')
    );

    console.log('🔍 Executing Firestore query...');
    const snapshot = await getDocs(q);
    console.log(`✅ Query successful. Found ${snapshot.docs.length} documents`);

    const allProjects = snapshot.docs.map((doc) => {
      const data = doc.data();
      const assignedEmployees = data.assignedEmployees || data.assignedUserIds || [];
      console.log('📄 Project:', doc.id, data.name, 'Status:', data.status, 'Assigned:', assignedEmployees.length);
      
      return {
        id: doc.id,
        concernID,
        name: data.name || '',
        projectNumber: data.projectNumber || data.projectNr || '',
        status: data.status || 'active',
        
        // Manager & Assignment
        assignedManager: data.assignedManager || data.manager || '',
        managerId: data.managerId,
        assignedUserIds: data.assignedUserIds || [],
        assignedEmployees: assignedEmployees,
        
        // Customer Information
        customerName: data.customerName || data.customer || '',
        customerPhone: data.customerPhone || data.customerTel || '',
        customerReference: data.customerReference || data.customerRef || '',
        customerId: data.customerId,
        
        // Work Location
        workAddress: data.workAddress || data.address?.street || '',
        workCity: data.workCity || data.address?.city || '',
        workPostalCode: data.workPostalCode || data.workPostcode || data.address?.zip || '',
        workAddressLocation: data.workAddressLocation || '',
        workLocationNotes: data.workLocationNotes || '',
        
        // Contact & Category
        contactTel: data.contactTel || data.contactPhone || '',
        category: data.category || data.kategorie || '',
        
        // Dates
        createdAt: toTimestamp(data.createdAt),
        startDate: data.startDate ? toTimestamp(data.startDate) : undefined,
        endDate: data.endDate ? toTimestamp(data.endDate) : undefined,
        plannedEndDate: data.plannedEndDate ? toTimestamp(data.plannedEndDate) : undefined,
        
        // Legacy fields
        address: data.address,
        clientId: data.clientId,
        siteName: data.siteName,
        description: data.description,
        budget: data.budget,
      } as Project;
    });
    
    // Filter out internal projects
    const filteredProjects = allProjects.filter(project => project.status !== 'internal');
    console.log(`✅ Filtered to ${filteredProjects.length} non-internal projects`);
    
    return filteredProjects;
  } catch (error: any) {
    console.error('❌ getAllProjects error:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    logError('API: Failed to fetch all projects', error, { concernID });
    
    // Provide more specific error message
    if (error.code === 'permission-denied') {
      throw new Error('Keine Berechtigung. Bitte überprüfen Sie die Firestore Rules.');
    } else if (error.message?.includes('index')) {
      throw new Error('Firestore Index fehlt. Bitte erstellen Sie einen Index für concernID + createdAt.');
    } else {
      throw new Error(error.message || 'Projekte konnten nicht synchronisiert werden');
    }
  }
}

/**
 * Get projects assigned to a user
 * 
 * MUST MIRROR TradeTrackr portal logic for project assignments.
 * Uses flat structure - projects collection at root level.
 */
export async function getAssignedProjects(
  concernID: ConcernId,
  userId: UserId
): Promise<Project[]> {
  try {
    const projectsRef = collection(db, 'projects');
    
    // Query projects that belong to the concern AND are assigned to the user
    const q = query(
      projectsRef,
      where('concernID', '==', concernID),
      where('assignedUserIds', 'array-contains', userId),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        concernID,
        name: data.name || '',
        projectNumber: data.projectNumber || data.projectNr || '',
        status: data.status || 'active',
        
        // Manager & Assignment
        assignedManager: data.assignedManager || data.manager || '',
        managerId: data.managerId,
        assignedUserIds: data.assignedUserIds || [],
        
        // Customer Information
        customerName: data.customerName || data.customer || '',
        customerPhone: data.customerPhone || data.customerTel || '',
        customerReference: data.customerReference || data.customerRef || '',
        customerId: data.customerId,
        
        // Work Location
        workAddress: data.workAddress || data.address?.street || '',
        workCity: data.workCity || data.address?.city || '',
        workPostalCode: data.workPostalCode || data.workPostcode || data.address?.zip || '',
        workAddressLocation: data.workAddressLocation || '',
        workLocationNotes: data.workLocationNotes || '',
        
        // Contact & Category
        contactTel: data.contactTel || data.contactPhone || '',
        category: data.category || data.kategorie || '',
        
        // Dates
        createdAt: toTimestamp(data.createdAt),
        startDate: data.startDate ? toTimestamp(data.startDate) : undefined,
        endDate: data.endDate ? toTimestamp(data.endDate) : undefined,
        plannedEndDate: data.plannedEndDate ? toTimestamp(data.plannedEndDate) : undefined,
        
        // Legacy fields
        address: data.address,
        clientId: data.clientId,
        siteName: data.siteName,
        description: data.description,
        budget: data.budget,
      } as Project;
    });
  } catch (error) {
    logError('API: Failed to fetch projects', error, { concernID, userId });
    throw new Error('Projekte konnten nicht geladen werden');
  }
}

/**
 * Get single project by ID
 */
export async function getProject(
  concernID: ConcernId,
  projectId: ProjectId
): Promise<Project | null> {
  try {
    const projectRef = doc(db, 'projects', projectId);
    const snapshot = await getDoc(projectRef);

    if (!snapshot.exists()) {
      return null;
    }

    const data = snapshot.data();
    return {
      id: snapshot.id,
      concernID,
      name: data.name || '',
      projectNumber: data.projectNumber || data.projectNr || '',
      status: data.status || 'active',
      
      // Manager & Assignment
      assignedManager: data.assignedManager || data.manager || '',
      managerId: data.managerId,
      assignedUserIds: data.assignedUserIds || [],
      
      // Customer Information
      customerName: data.customerName || data.customer || '',
      customerPhone: data.customerPhone || data.customerTel || '',
      customerReference: data.customerReference || data.customerRef || '',
      customerId: data.customerId,
      
      // Work Location
      workAddress: data.workAddress || data.address?.street || '',
      workCity: data.workCity || data.address?.city || '',
      workPostalCode: data.workPostalCode || data.workPostcode || data.address?.zip || '',
      workAddressLocation: data.workAddressLocation || '',
      workLocationNotes: data.workLocationNotes || '',
      
      // Contact & Category
      contactTel: data.contactTel || data.contactPhone || '',
      category: data.category || data.kategorie || '',
      
      // Dates
      createdAt: toTimestamp(data.createdAt),
      startDate: data.startDate ? toTimestamp(data.startDate) : undefined,
      endDate: data.endDate ? toTimestamp(data.endDate) : undefined,
      plannedEndDate: data.plannedEndDate ? toTimestamp(data.plannedEndDate) : undefined,
      
      // Legacy fields
      address: data.address,
      clientId: data.clientId,
      siteName: data.siteName,
      description: data.description,
      budget: data.budget,
    } as Project;
  } catch (error) {
    console.error('Error fetching project:', error);
    return null;
  }
}

/**
 * Get tasks for a project assigned to user
 * 
 * MUST MIRROR portal logic for task visibility and assignments.
 * Uses flat structure - tasks collection at root level.
 */
export async function getProjectTasks(
  concernID: ConcernId,
  projectId: ProjectId,
  userId: UserId
): Promise<Task[]> {
  try {
    const tasksRef = collection(db, 'tasks');
    
    // Query tasks for this concern, project, and assigned to user
    const q = query(
      tasksRef,
      where('concernID', '==', concernID),
      where('projectId', '==', projectId),
      where('assignedUserIds', 'array-contains', userId),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        concernID,
        projectId,
        title: data.title,
        description: data.description,
        status: data.status,
        dueDate: data.dueDate ? toTimestamp(data.dueDate) : undefined,
        assignedUserIds: data.assignedUserIds || [],
        createdAt: toTimestamp(data.createdAt),
      } as Task;
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    throw new Error('Aufgaben konnten nicht geladen werden');
  }
}

/**
 * Get today's time entries for user
 */
export async function getTodayTimeEntries(
  concernID: ConcernId,
  userId: UserId,
  dateUtcMidnight?: Date
): Promise<TimeEntry[]> {
  try {
    const startOfDay = dateUtcMidnight || new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(startOfDay);
    endOfDay.setHours(23, 59, 59, 999);

    const entriesRef = collection(db, 'timeEntries');
    const q = query(
      entriesRef,
      where('concernID', '==', concernID),
      where('userId', '==', userId),
      where('start', '>=', FirestoreTimestamp.fromDate(startOfDay)),
      where('start', '<=', FirestoreTimestamp.fromDate(endOfDay)),
      orderBy('start', 'desc')
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        concernID,
        userId,
        projectId: data.projectId,
        taskId: data.taskId,
        start: toTimestamp(data.start),
        end: data.end ? toTimestamp(data.end) : undefined,
        source: data.source,
        confirmed: data.confirmed || false,
        createdAt: toTimestamp(data.createdAt),
      } as TimeEntry;
    });
  } catch (error) {
    console.error('Error fetching time entries:', error);
    throw new Error('Zeiteinträge konnten nicht geladen werden');
  }
}

/**
 * Create a new time entry
 */
export async function createTimeEntry(entry: Omit<TimeEntry, 'id' | 'createdAt'>): Promise<void> {
  try {
    const entriesRef = collection(db, 'timeEntries');

    await addDoc(entriesRef, {
      concernID: entry.concernID,
      userId: entry.userId,
      projectId: entry.projectId,
      taskId: entry.taskId || null,
      start: toFirestoreTimestamp(entry.start),
      end: entry.end ? toFirestoreTimestamp(entry.end) : null,
      source: entry.source,
      confirmed: entry.confirmed || false,
      createdAt: FirestoreTimestamp.now(),
    });
  } catch (error) {
    console.error('Error creating time entry:', error);
    throw new Error('Zeiteintrag konnte nicht erstellt werden');
  }
}

/**
 * Update task status
 */
export async function updateTaskStatus(
  concernID: ConcernId,
  projectId: ProjectId,
  taskId: TaskId,
  status: 'open' | 'in_progress' | 'done'
): Promise<void> {
  try {
    const taskRef = doc(db, 'tasks', taskId);

    await updateDoc(taskRef, {
      status,
      updatedAt: FirestoreTimestamp.now(),
    });
  } catch (error) {
    console.error('Error updating task status:', error);
    throw new Error('Aufgabenstatus konnte nicht aktualisiert werden');
  }
}

/**
 * Add a note
 */
export async function addNote(note: Omit<Note, 'id' | 'createdAt'>): Promise<void> {
  try {
    const notesRef = collection(db, 'notes');

    await addDoc(notesRef, {
      concernID: note.concernID,
      userId: note.userId,
      projectId: note.projectId,
      taskId: note.taskId || null,
      text: note.text,
      source: note.source,
      createdAt: FirestoreTimestamp.now(),
    });
  } catch (error) {
    console.error('Error adding note:', error);
    throw new Error('Notiz konnte nicht hinzugefügt werden');
  }
}

/**
 * List photos for a project
 */
export async function listProjectPhotos(
  concernID: ConcernId,
  projectId: ProjectId
): Promise<Photo[]> {
  try {
    const photosRef = collection(db, 'photos');
    const q = query(
      photosRef,
      where('concernID', '==', concernID),
      where('projectId', '==', projectId),
      orderBy('takenAt', 'desc')
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        concernID,
        userId: data.userId,
        projectId,
        taskId: data.taskId,
        storagePath: data.storagePath,
        takenAt: toTimestamp(data.takenAt),
        gps: data.gps,
        createdAt: toTimestamp(data.createdAt),
      } as Photo;
    });
  } catch (error) {
    console.error('Error fetching photos:', error);
    throw new Error('Fotos konnten nicht geladen werden');
  }
}

/**
 * Create a photo record
 */
export async function createPhoto(photo: Omit<Photo, 'id' | 'createdAt'>): Promise<string> {
  try {
    const photosRef = collection(db, 'photos');

    const docRef = await addDoc(photosRef, {
      concernID: photo.concernID,
      userId: photo.userId,
      projectId: photo.projectId,
      taskId: photo.taskId || null,
      storagePath: photo.storagePath,
      takenAt: toFirestoreTimestamp(photo.takenAt),
      gps: photo.gps || null,
      createdAt: FirestoreTimestamp.now(),
    });

    return docRef.id;
  } catch (error) {
    console.error('Error creating photo record:', error);
    throw new Error('Foto-Eintrag konnte nicht erstellt werden');
  }
}

/**
 * Create a day report
 */
export async function createDayReport(report: Omit<DayReport, 'id' | 'createdAt'>): Promise<void> {
  try {
    const reportsRef = collection(db, 'reports');

    await addDoc(reportsRef, {
      concernID: report.concernID,
      userId: report.userId,
      date: report.date,
      totalHours: report.totalHours,
      projectBreakdown: report.projectBreakdown,
      tasksCompleted: report.tasksCompleted,
      photosCount: report.photosCount,
      confirmedAt: report.confirmedAt ? toFirestoreTimestamp(report.confirmedAt) : null,
      createdAt: FirestoreTimestamp.now(),
    });
  } catch (error) {
    console.error('Error creating day report:', error);
    throw new Error('Tagesbericht konnte nicht erstellt werden');
  }
}

/**
 * Count completed tasks for user today
 * NOTE: Simplified implementation - in production may need optimization
 */
export async function countCompletedTasksToday(
  concernID: ConcernId,
  userId: UserId
): Promise<number> {
  // This is a placeholder - actual implementation depends on how
  // the portal tracks completed tasks
  return 0;
}

/**
 * Count photos taken today
 * NOTE: Simplified implementation - in production may need optimization
 */
export async function countPhotosTakenToday(
  concernID: ConcernId,
  userId: UserId
): Promise<number> {
  // This is a placeholder - actual implementation depends on how
  // the portal tracks photo counts
  return 0;
}

/**
 * Create a project report (ProjectReport)
 * Saves to ProjectReports collection (same as web portal)
 */
export async function createProjectReport(
  report: Omit<ProjectReport, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  try {
    const reportsRef = collection(db, 'ProjectReports');
    
    const newReport = {
      ...report,
      status: report.status || 'pending',
      createdAt: FirestoreTimestamp.now(),
      updatedAt: FirestoreTimestamp.now(),
    };
    
    const docRef = await addDoc(reportsRef, newReport);
    return docRef.id; // Return Firestore document ID
  } catch (error) {
    console.error('Error creating project report:', error);
    throw new Error('Bericht konnte nicht erstellt werden');
  }
}

/**
 * Get all project reports for a concern
 */
export async function getProjectReports(concernID: ConcernId): Promise<ProjectReport[]> {
  try {
    const reportsRef = collection(db, 'ProjectReports');
    const q = query(
      reportsRef,
      where('concernID', '==', concernID),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const reports: ProjectReport[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      reports.push({
        id: doc.id,
        ...data,
      } as ProjectReport);
    });
    
    return reports;
  } catch (error) {
    console.error('Error fetching project reports:', error);
    throw new Error('Berichte konnten nicht geladen werden');
  }
}

/**
 * Get project reports by employee
 */
export async function getProjectReportsByEmployee(
  concernID: ConcernId,
  employeeId: UserId
): Promise<ProjectReport[]> {
  try {
    const reportsRef = collection(db, 'ProjectReports');
    const q = query(
      reportsRef,
      where('concernID', '==', concernID),
      where('mitarbeiterID', '==', employeeId),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const reports: ProjectReport[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      reports.push({
        id: doc.id,
        ...data,
      } as ProjectReport);
    });
    
    return reports;
  } catch (error) {
    console.error('Error fetching project reports by employee:', error);
    throw new Error('Berichte konnten nicht geladen werden');
  }
}

/**
 * Update an existing project report
 */
export async function updateProjectReport(
  reportId: string,
  updates: Partial<ProjectReport>
): Promise<void> {
  try {
    const reportRef = doc(db, 'ProjectReports', reportId);
    
    await updateDoc(reportRef, {
      ...updates,
      updatedAt: FirestoreTimestamp.now(),
    });
  } catch (error) {
    console.error('Error updating project report:', error);
    throw new Error('Bericht konnte nicht aktualisiert werden');
  }
}

// ============================================================================
// GEWERK (TRADE/CRAFT) FUNCTIONS
// ============================================================================

/**
 * Default standard Gewerk list (fallback when Firestore has no data)
 */
const DEFAULT_STANDARD_GEWERKE = [
  'Außenbereich',
  'Baustelleneinrichtung',
  'Baustrom',
  'Beleuchtung',
  'Bohr- und Stemmarbeiten',
  'Brandmeldeanlage',
  'Brandschutz',
  'Datennetz',
  'Demontage',
  'Dokumentation',
  'Erdungs- und Blitzschutzanlage',
  'Fernmelde- und Info.',
  'Hausanschlussraum',
  'Installationsgeräte',
  'Kabel & Leitungen',
  'Kommunikationsnetze',
  'Lichtsteuerung',
  'Niederspannungsanlagen',
  'Notbeleuchtung',
  'Photovoltaikanlage',
  'Potentialausgleich',
  'Regiearbeiten',
  'Sicherheitsbeleuchtung',
  'Sonstige Arbeit',
  'Sprechanlage',
  'Starkstromanlagen',
  'Verlegesysteme',
  'Verteilung',
  'Wallboxen',
].sort();

/**
 * Get standard Gewerk (trade/craft) for a concern
 * Returns alphabetically sorted list of Gewerk names
 * Falls back to default list if Firestore has no data
 */
export async function getStandardGewerk(concernID: ConcernId): Promise<string[]> {
  try {
    const gewerkRef = collection(db, 'standardGewerk');
    const q = query(
      gewerkRef,
      where('concernID', '==', concernID),
      orderBy('gewerk', 'asc')
    );
    const snapshot = await getDocs(q);
    const gewerke = snapshot.docs
      .map(doc => doc.data().gewerk)
      .filter((gewerk): gewerk is string => Boolean(gewerk))
      .sort();
    
    // If no Gewerke found in Firestore, use default list
    if (gewerke.length === 0) {
      return DEFAULT_STANDARD_GEWERKE;
    }
    
    return gewerke;
  } catch (error) {
    console.error('Error getting standard Gewerk:', error);
    // If collection doesn't exist or query fails, return default list
    return DEFAULT_STANDARD_GEWERKE;
  }
}

/**
 * Get project-specific Gewerk from GeWort collection
 * Returns alphabetically sorted list of Gewerk names for a project
 */
export async function getProjectGewerk(
  projectNumber: string,
  concernID: ConcernId
): Promise<string[]> {
  try {
    const geWortRef = collection(db, 'GeWort');
    const q = query(
      geWortRef,
      where('projectNumber', '==', projectNumber),
      where('concernID', '==', concernID),
      orderBy('gewerk', 'asc')
    );
    const snapshot = await getDocs(q);
    const gewerke = snapshot.docs
      .map(doc => doc.data().gewerk)
      .filter((gewerk): gewerk is string => Boolean(gewerk))
      .sort();
    
    return gewerke;
  } catch (error) {
    console.error('Error getting project Gewerk:', error);
    // If collection doesn't exist or query fails, return empty array
    return [];
  }
}

/**
 * Get all available Gewerk for a project
 * Combines project-specific and standard Gewerk, removing duplicates
 * Project-specific Gewerk are prioritized (shown first)
 */
export async function getAllGewerk(
  projectNumber: string | null,
  concernID: ConcernId
): Promise<string[]> {
  try {
    const projectGewerke = projectNumber
      ? await getProjectGewerk(projectNumber, concernID)
      : [];
    const standardGewerke = await getStandardGewerk(concernID);
    
    // Combine: project-specific first, then standard (remove duplicates)
    const allGewerke = [...projectGewerke];
    standardGewerke.forEach(gewerk => {
      if (!allGewerke.includes(gewerk)) {
        allGewerke.push(gewerk);
      }
    });
    
    return allGewerke;
  } catch (error) {
    console.error('Error getting all Gewerk:', error);
    return [];
  }
}

// ============================================================================
// PROJECT COMPONENT FUNCTIONS
// ============================================================================

/**
 * Project Component Interface
 */
export interface ProjectComponent {
  id: string;
  projectNumber: string;
  projectElement: string;
  quantity: number;
  componentLN?: number;
  projectNachtrag?: number;
  concernID: string;
}

/**
 * Get project components for a specific project
 * Optionally filter by Gewerk if components have a gewerk field
 */
export async function getProjectComponents(
  projectNumber: string,
  concernID: ConcernId,
  gewerk?: string
): Promise<ProjectComponent[]> {
  try {
    const componentsRef = collection(db, 'projectComponent');
    let q = query(
      componentsRef,
      where('projectNumber', '==', projectNumber),
      where('concernID', '==', concernID),
      orderBy('projectElement', 'asc')
    );
    
    const snapshot = await getDocs(q);
    let components = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as ProjectComponent));
    
    // Filter by Gewerk if provided and components have gewerk field
    if (gewerk) {
      components = components.filter(comp => {
        const compGewerk = (comp as any).gewerk;
        return compGewerk && compGewerk.toLowerCase() === gewerk.toLowerCase();
      });
    }
    
    return components;
  } catch (error) {
    console.error('Error getting project components:', error);
    // If collection doesn't exist or query fails, return empty array
    return [];
  }
}

/**
 * Get distinct project elements (component names) for a project
 * Useful for quick selection without quantity details
 */
export async function getProjectComponentNames(
  projectNumber: string,
  concernID: ConcernId,
  gewerk?: string
): Promise<string[]> {
  try {
    const components = await getProjectComponents(projectNumber, concernID, gewerk);
    const names = components.map(comp => comp.projectElement);
    // Remove duplicates and sort
    return [...new Set(names)].sort();
  } catch (error) {
    console.error('Error getting project component names:', error);
    return [];
  }
}

// ============================================================================
// STANDARD LEISTUNG (WORK PERFORMANCE) FUNCTIONS
// ============================================================================

/**
 * Standard Leistung Interface
 */
export interface StandardLeistung {
  id: string;
  leistung: string;
  LVPos?: string;
  unit?: string;
  concernID: string;
}

/**
 * Default standard Leistung list (fallback when Firestore has no data)
 */
const DEFAULT_STANDARD_LEISTUNGEN: string[] = [
  'Montage',
  'Installation',
  'Demontage',
  'Reparatur',
  'Wartung',
  'Inbetriebnahme',
  'Prüfung',
  'Messung',
  'Einstellung',
  'Anpassung',
  'Austausch',
  'Ersatz',
  'Reinigung',
  'Dokumentation',
  'Beratung',
];

/**
 * Get standard Leistung (work performance) for a concern
 * Returns alphabetically sorted list of Leistung names
 * Falls back to default list if Firestore has no data
 */
export async function getStandardLeistung(concernID: ConcernId): Promise<StandardLeistung[]> {
  try {
    const leistungRef = collection(db, 'standardLeistung');
    const q = query(
      leistungRef,
      where('concernID', '==', concernID),
      orderBy('leistung', 'asc')
    );
    const snapshot = await getDocs(q);
    const leistungen = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as StandardLeistung));
    
    // If no Leistungen found in Firestore, create from default list
    if (leistungen.length === 0) {
      return DEFAULT_STANDARD_LEISTUNGEN.map((leistung, index) => ({
        id: `default-${index}`,
        leistung,
        concernID,
      }));
    }
    
    return leistungen;
  } catch (error) {
    console.error('Error getting standard Leistung:', error);
    // If collection doesn't exist or query fails, return default list
    return DEFAULT_STANDARD_LEISTUNGEN.map((leistung, index) => ({
      id: `default-${index}`,
      leistung,
      concernID,
    }));
  }
}

/**
 * Get standard Leistung names as simple string array
 * Useful for AutoComplete
 */
export async function getStandardLeistungNames(concernID: ConcernId): Promise<string[]> {
  try {
    const leistungen = await getStandardLeistung(concernID);
    return leistungen.map(l => l.leistung).filter(Boolean).sort();
  } catch (error) {
    console.error('Error getting standard Leistung names:', error);
    return DEFAULT_STANDARD_LEISTUNGEN;
  }
}

// ============================================================================
// LOOKUP FAMILIES & OPTIONS (CASCADING PICKER SYSTEM)
// ============================================================================

/**
 * Lookup Family Interface
 * Represents a cascading dropdown structure with multiple levels
 */
export interface LookupFamily {
  id: string;
  familyId: string;
  name: string;
  levels: string[]; // e.g., ["cableType", "cableCores", "cableDiameter"]
  version: number;
  concernID?: string;
  updatedAt?: Timestamp | any;
}

/**
 * Lookup Option Interface
 * Represents a single selectable option in a cascading dropdown
 */
export interface LookupOption {
  id: string;
  familyId: string;
  level: number; // 1-based level (1, 2, 3, ...)
  key: string; // Level key (e.g., "cableType", "cableCores")
  value: string; // Display value (e.g., "NYM", "3", "1,5mm²")
  order: number;
  valueNumber?: number; // For numeric sorting
  parents: Record<string, string>; // parent_cableType: "NYM", parent_cableCores: "3", etc.
  concernID?: string;
}

/**
 * Get a lookup family by familyId
 * Searches by document ID first, then by familyId field
 */
export async function getLookupFamily(familyId: string, concernID?: ConcernId): Promise<LookupFamily | null> {
  try {
    // First try by document ID
    const docRef = doc(db, 'lookupFamilies', familyId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      // Build levels array from levels field or level0/level1/level2
      let levels: string[] = [];
      if (data.levels && Array.isArray(data.levels)) {
        levels = data.levels;
      } else {
        if (data.level0) levels.push(data.level0);
        if (data.level1) levels.push(data.level1);
        if (data.level2) levels.push(data.level2);
      }
      
      return {
        id: docSnap.id,
        familyId: data.familyId || familyId,
        name: data.familyName || data.name || '',
        levels,
        version: data.version || 1,
        concernID: data.concernID || data.concernId,
        updatedAt: data.updatedAt,
      };
    }

    // Fallback: Search by familyId field
    const q = query(
      collection(db, 'lookupFamilies'),
      where('familyId', '==', familyId),
      limit(1)
    );
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return null;
    }
    
    const docData = snapshot.docs[0].data();
    let levels: string[] = [];
    if (docData.levels && Array.isArray(docData.levels)) {
      levels = docData.levels;
    } else {
      if (docData.level0) levels.push(docData.level0);
      if (docData.level1) levels.push(docData.level1);
      if (docData.level2) levels.push(docData.level2);
    }
    
    return {
      id: snapshot.docs[0].id,
      familyId: docData.familyId || familyId,
      name: docData.familyName || docData.name || '',
      levels,
      version: docData.version || 1,
      concernID: docData.concernID || docData.concernId,
      updatedAt: docData.updatedAt,
    };
  } catch (error) {
    console.error('Error getting lookup family:', error);
    return null;
  }
}

/**
 * Get all lookup families for a concern
 */
export async function getAllLookupFamilies(concernID: ConcernId): Promise<LookupFamily[]> {
  try {
    const q = query(
      collection(db, 'lookupFamilies'),
      where('concernID', '==', concernID),
      orderBy('name', 'asc')
    );
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      let levels: string[] = [];
      if (data.levels && Array.isArray(data.levels)) {
        levels = data.levels;
      } else {
        if (data.level0) levels.push(data.level0);
        if (data.level1) levels.push(data.level1);
        if (data.level2) levels.push(data.level2);
      }
      
      return {
        id: doc.id,
        familyId: data.familyId || doc.id,
        name: data.familyName || data.name || '',
        levels,
        version: data.version || 1,
        concernID: data.concernID || data.concernId,
        updatedAt: data.updatedAt,
      };
    });
  } catch (error) {
    console.error('Error getting lookup families:', error);
    return [];
  }
}

/**
 * Get lookup options for a specific level with parent filtering
 * 
 * @param familyId - The lookup family ID
 * @param levelIndex - 0-based level index (0 = first level)
 * @param levels - Array of level keys from the family
 * @param selection - Current selection map {levelKey: value}
 * @param concernID - Optional concern ID for filtering
 */
export async function getLookupOptions(
  familyId: string,
  levelIndex: number,
  levels: string[],
  selection: Record<string, string>,
  concernID?: ConcernId
): Promise<LookupOption[]> {
  try {
    if (levelIndex >= levels.length) {
      return [];
    }

    const currentLevelKey = levels[levelIndex];
    const currentLevel = levelIndex + 1; // Firestore uses 1-based levels

    // Build query
    let q = query(
      collection(db, 'lookupOptions'),
      where('familyId', '==', familyId),
      where('level', '==', currentLevel),
      where('key', '==', currentLevelKey),
      orderBy('valueNumber', 'asc')
    );

    // Add concernID filter if provided
    if (concernID) {
      q = query(q, where('concernID', '==', concernID));
    }

    const snapshot = await getDocs(q);
    
    // Convert to LookupOption objects
    let options: LookupOption[] = snapshot.docs.map(doc => {
      const data = doc.data();
      
      // Extract parent_* fields
      const parents: Record<string, string> = {};
      Object.keys(data).forEach(key => {
        if (key.startsWith('parent_')) {
          const parentKey = key.substring(7); // Remove "parent_" prefix
          parents[parentKey] = data[key];
        }
      });
      
      return {
        id: doc.id,
        familyId: data.familyId || '',
        level: data.level || currentLevel,
        key: data.key || currentLevelKey,
        value: data.value || '',
        order: data.order || 0,
        valueNumber: data.valueNumber,
        parents,
        concernID: data.concernID || data.concernId,
      };
    });

    // Client-side parent filtering
    if (levelIndex > 0) {
      options = options.filter(option => {
        // Check if all parent selections match
        for (let i = 0; i < levelIndex; i++) {
          const requiredKey = levels[i];
          const requiredValue = selection[requiredKey];
          
          if (!requiredValue) {
            return false;
          }
          
          // Check if option has matching parent value
          const parentValue = option.parents[requiredKey];
          if (parentValue !== requiredValue) {
            return false;
          }
        }
        return true;
      });
    }

    // Sort: valueNumber → order → value
    options.sort((a, b) => {
      if (a.valueNumber != null && b.valueNumber != null) {
        const numCmp = a.valueNumber - b.valueNumber;
        if (numCmp !== 0) return numCmp;
      } else if (a.valueNumber != null) {
        return -1;
      } else if (b.valueNumber != null) {
        return 1;
      }
      
      const orderCmp = a.order - b.order;
      if (orderCmp !== 0) return orderCmp;
      
      return a.value.localeCompare(b.value);
    });

    // Deduplicate by value (case-insensitive)
    const seen = new Set<string>();
    const deduplicated: LookupOption[] = [];
    for (const option of options) {
      const normalized = option.value.trim().toLowerCase();
      if (normalized && !seen.has(normalized)) {
        seen.add(normalized);
        deduplicated.push(option);
      }
    }

    return deduplicated;
  } catch (error) {
    console.error('Error getting lookup options:', error);
    return [];
  }
}
