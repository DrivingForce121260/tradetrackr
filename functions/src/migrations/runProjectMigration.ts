/**
 * Callable Cloud Function to run project renumbering migration
 * Only admins can call this
 */

import * as functions from 'firebase-functions';

// Import migration logic
async function runMigrationLogic(dryRun: boolean, tenantIdFilter?: string) {
  // We'll import the logic inline to avoid module issues
  const admin = require('firebase-admin');
  const db = admin.firestore();
  
  const MIGRATION_VERSION = 1;
  const BATCH_SIZE = 500;
  const MAX_COUNTER_PER_DATE_KEY = 99;
  const YEAR_BASE = 2025;
  
  // Helper functions
  function toHexDigit(n: number): string {
    if (n < 0 || n > 15) throw new Error(`Number must be 0-15, got ${n}`);
    return n.toString(16).toUpperCase();
  }
  
  function yearHex(year: number): string {
    const offset = year - YEAR_BASE;
    if (offset < 0 || offset > 15) throw new Error(`Year must be ${YEAR_BASE}-${YEAR_BASE + 15}, got ${year}`);
    return toHexDigit(offset);
  }
  
  function monthHex(month1to12: number): string {
    if (month1to12 < 1 || month1to12 > 12) throw new Error(`Month must be 1-12, got ${month1to12}`);
    return toHexDigit(month1to12);
  }
  
  function dayHexWrapped(day1to31: number): string {
    if (day1to31 < 1 || day1to31 > 31) throw new Error(`Day must be 1-31, got ${day1to31}`);
    if (day1to31 <= 15) {
      return toHexDigit(day1to31);
    } else {
      const wrapped = day1to31 - 16;
      return toHexDigit(wrapped);
    }
  }
  
  function halfOfMonthDigit(day: number): '0' | '1' {
    if (day < 1 || day > 31) throw new Error(`Day must be 1-31, got ${day}`);
    return day <= 15 ? '0' : '1';
  }
  
  function buildDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const y = yearHex(year);
    const h1 = monthHex(month);
    const h2 = dayHexWrapped(day);
    const h3 = halfOfMonthDigit(day);
    return `${y}${h1}${h2}${h3}`;
  }
  
  function formatCounter(counter: number): string {
    if (counter < 0 || counter > 99) throw new Error(`Counter must be 0-99, got ${counter}`);
    return counter.toString().padStart(2, '0');
  }
  
  function buildProjectNumber(dateKey: string, counter: number): string {
    return `PN-${dateKey}${formatCounter(counter)}`;
  }
  
  function isAlreadyMigrated(projectData: any): boolean {
    const pn = projectData.projectNumber;
    if (typeof pn === 'string' && /^PN-[0-9A-F]{4}\d{2}$/.test(pn)) {
      return true;
    }
    if (projectData.projectNumberMigrationVersion === MIGRATION_VERSION) {
      return true;
    }
    return false;
  }
  
  function determineDateSource(projectData: any) {
    const createdAt = projectData.createdAt || projectData.dateCreated;
    
    if (createdAt) {
      let date: Date;
      if (createdAt.toDate && typeof createdAt.toDate === 'function') {
        date = createdAt.toDate();
      } else if (createdAt instanceof Date) {
        date = createdAt;
      } else if (typeof createdAt === 'number') {
        date = new Date(createdAt);
      } else if (typeof createdAt === 'string') {
        date = new Date(createdAt);
      } else {
        return { date: new Date(), source: 'fallback' as const, fallbackUsed: true };
      }
      
      if (!isNaN(date.getTime())) {
        return { date, source: 'createdAt' as const, fallbackUsed: false };
      }
    }
    
    return { date: new Date(), source: 'fallback' as const, fallbackUsed: true };
  }
  
  // Step 1: Collect projects
  functions.logger.info('[1/5] Collecting projects...');
  let query = db.collection('projects') as any;
  if (tenantIdFilter) {
    query = query.where('concernID', '==', tenantIdFilter);
  }
  
  const snapshot = await query.get();
  const projects: any[] = [];
  let skipped = 0;
  
  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (isAlreadyMigrated(data)) {
      skipped++;
      continue;
    }
    
    const tenantId = data.concernID || data.orgId;
    if (!tenantId) continue;
    
    const dateSource = determineDateSource(data);
    projects.push({
      projectId: doc.id,
      tenantId,
      oldProjectNumber: data.projectNumber,
      dateSource,
      data
    });
  }
  
  functions.logger.info(`Collected: ${projects.length} to migrate, ${skipped} already migrated`);
  
  if (projects.length === 0) {
    return {
      success: true,
      totalProjects: 0,
      alreadyMigrated: skipped,
      toMigrate: 0,
      mappings: [],
      errors: []
    };
  }
  
  // Step 2: Allocate numbers
  functions.logger.info('[2/5] Allocating project numbers...');
  const groups = new Map<string, any[]>();
  
  for (const project of projects) {
    const dateKey = buildDateKey(project.dateSource.date);
    const groupKey = `${project.tenantId}_${dateKey}`;
    if (!groups.has(groupKey)) {
      groups.set(groupKey, []);
    }
    groups.get(groupKey)!.push(project);
  }
  
  const mappings: any[] = [];
  const errors: any[] = [];
  
  const groupEntries = Array.from(groups.entries());
  for (const [groupKey, groupProjects] of groupEntries) {
    const [tenantId, dateKey] = groupKey.split('_');
    
    groupProjects.sort((a, b) => {
      const timeA = a.dateSource.date.getTime();
      const timeB = b.dateSource.date.getTime();
      if (timeA !== timeB) return timeA - timeB;
      return a.projectId.localeCompare(b.projectId);
    });
    
    if (groupProjects.length > MAX_COUNTER_PER_DATE_KEY + 1) {
      const error = `Group ${groupKey} has ${groupProjects.length} projects, exceeds limit`;
      functions.logger.error(error);
      for (const project of groupProjects) {
        errors.push({ projectId: project.projectId, error });
      }
      continue;
    }
    
    let counter = 0;
    for (const project of groupProjects) {
      const newProjectNumber = buildProjectNumber(dateKey, counter);
      mappings.push({
        projectId: project.projectId,
        tenantId: project.tenantId,
        oldProjectNumber: project.oldProjectNumber?.toString() || null,
        newProjectNumber,
        dateKey,
        counter,
        createdAtUsed: project.dateSource.source === 'createdAt' 
          ? admin.firestore.Timestamp.fromDate(project.dateSource.date)
          : null,
        fallbackUsed: project.dateSource.fallbackUsed
      });
      counter++;
    }
  }
  
  functions.logger.info(`Allocated ${mappings.length} project numbers`);
  
  if (errors.length > 0) {
    return {
      success: false,
      totalProjects: projects.length,
      alreadyMigrated: skipped,
      toMigrate: projects.length,
      mappings,
      errors
    };
  }
  
  if (dryRun) {
    functions.logger.info('[3/5] DRY RUN - No writes performed');
    return {
      success: true,
      dryRun: true,
      totalProjects: projects.length,
      alreadyMigrated: skipped,
      toMigrate: mappings.length,
      mappings,
      errors: []
    };
  }
  
  // Step 3: Apply migration
  functions.logger.info('[3/5] Applying migration...');
  const now = admin.firestore.Timestamp.now();
  
  for (let i = 0; i < mappings.length; i += BATCH_SIZE) {
    const batch = db.batch();
    const batchMappings = mappings.slice(i, i + BATCH_SIZE);
    
    for (const mapping of batchMappings) {
      const projectRef = db.collection('projects').doc(mapping.projectId);
      batch.update(projectRef, {
        projectNumber: mapping.newProjectNumber,
        previousProjectNumber: mapping.oldProjectNumber,
        projectNumberMigratedAt: now,
        projectNumberMigrationVersion: MIGRATION_VERSION
      });
      
      const auditRef = db.collection('projectNumberMigrations').doc(mapping.projectId);
      batch.set(auditRef, { ...mapping, migratedAt: now });
      
      const lookupRef = db.collection('projectNumberLookup').doc(`${mapping.tenantId}_${mapping.newProjectNumber}`);
      batch.set(lookupRef, {
        tenantId: mapping.tenantId,
        projectId: mapping.projectId,
        projectNumber: mapping.newProjectNumber
      });
    }
    
    await batch.commit();
    functions.logger.info(`Batch ${Math.floor(i / BATCH_SIZE) + 1} committed`);
  }
  
  // Step 4: Update denormalized projectNumber in related collections
  functions.logger.info('[4/5] Updating related collections...');
  let docUpdates = 0;
  let reportUpdates = 0;
  let taskUpdates = 0;
  let materialUpdates = 0;
  let aufmassUpdates = 0;
  
  // Collections that store denormalized projectNumber
  const collectionsToUpdate = [
    { name: 'documents', counter: () => docUpdates },
    { name: 'reports', counter: () => reportUpdates },
    { name: 'tasks', counter: () => taskUpdates },
    { name: 'materials', counter: () => materialUpdates },
    { name: 'aufmass', counter: () => aufmassUpdates }
  ];
  
  for (const mapping of mappings) {
    if (!mapping.oldProjectNumber) continue;
    
    // Update each collection
    for (const collectionInfo of collectionsToUpdate) {
      let snapshot;
      
      // Query by projectId + old projectNumber for accuracy
      // Try projectId first (most collections have it)
      try {
        snapshot = await db.collection(collectionInfo.name)
          .where('projectId', '==', mapping.projectId)
          .where('projectNumber', '==', mapping.oldProjectNumber)
          .get();
      } catch (error) {
        // If projectId field doesn't exist, try just projectNumber
        try {
          snapshot = await db.collection(collectionInfo.name)
            .where('projectNumber', '==', mapping.oldProjectNumber)
            .get();
        } catch (e) {
          // Collection might not exist or no index
          functions.logger.warn(`[updateDenormalized] Cannot query ${collectionInfo.name}:`, e);
          continue;
        }
      }
      
      if (snapshot && !snapshot.empty) {
        for (let i = 0; i < snapshot.docs.length; i += BATCH_SIZE) {
          const batch = db.batch();
          const batchDocs = snapshot.docs.slice(i, i + BATCH_SIZE);
          
          for (const doc of batchDocs) {
            batch.update(doc.ref, { projectNumber: mapping.newProjectNumber });
          }
          
          await batch.commit();
          
          // Increment counter
          if (collectionInfo.name === 'documents') docUpdates += batchDocs.length;
          else if (collectionInfo.name === 'reports') reportUpdates += batchDocs.length;
          else if (collectionInfo.name === 'tasks') taskUpdates += batchDocs.length;
          else if (collectionInfo.name === 'materials') materialUpdates += batchDocs.length;
          else if (collectionInfo.name === 'aufmass') aufmassUpdates += batchDocs.length;
        }
      }
    }
  }
  
  functions.logger.info(`Updated related collections:`, {
    documents: docUpdates,
    reports: reportUpdates,
    tasks: taskUpdates,
    materials: materialUpdates,
    aufmass: aufmassUpdates
  });
  
  // Step 5: Verify
  functions.logger.info('[5/5] Verifying...');
  const tenantProjectNumbers = new Map<string, Set<string>>();
  
  for (const mapping of mappings) {
    if (!tenantProjectNumbers.has(mapping.tenantId)) {
      tenantProjectNumbers.set(mapping.tenantId, new Set());
    }
    
    const numbers = tenantProjectNumbers.get(mapping.tenantId)!;
    if (numbers.has(mapping.newProjectNumber)) {
      throw new Error(`Duplicate: ${mapping.newProjectNumber}`);
    }
    numbers.add(mapping.newProjectNumber);
  }
  
  functions.logger.info('Verification passed');
  
  return {
    success: true,
    dryRun: false,
    totalProjects: projects.length,
    alreadyMigrated: skipped,
    toMigrate: mappings.length,
    mappings: mappings.slice(0, 10), // Return first 10 for response size
    errors: [],
    relatedCollectionsUpdated: {
      documents: docUpdates,
      reports: reportUpdates,
      tasks: taskUpdates,
      materials: materialUpdates,
      aufmass: aufmassUpdates
    }
  };
}

/**
 * Callable function for admins to run migration
 */
export const runProjectNumberMigration = functions
  .region('europe-west1')
  .runWith({
    timeoutSeconds: 540,
    memory: '2GB'
  })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
    }
    
    const admin = require('firebase-admin');
    const db = admin.firestore();
    
    // Check admin permission - try multiple sources
    let isAdmin = false;
    
    // 1. Check custom claims (token.role)
    if (context.auth.token.role === 'admin') {
      isAdmin = true;
    }
    
    // 2. Check custom claims (token.roles.admin)
    if (context.auth.token.roles && 'admin' in context.auth.token.roles) {
      isAdmin = true;
    }
    
    // 3. Check Firestore user document (fallback)
    if (!isAdmin) {
      try {
        const userDoc = await db.collection('users').doc(context.auth.uid).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          if (userData.role === 'admin') {
            isAdmin = true;
            functions.logger.info('Admin verified via Firestore user document', {
              userId: context.auth.uid,
              role: userData.role
            });
          }
        }
      } catch (error) {
        functions.logger.warn('Could not check Firestore user document', error);
      }
    }
    
    if (!isAdmin) {
      functions.logger.warn('Permission denied - not admin', {
        userId: context.auth.uid,
        tokenRole: context.auth.token.role,
        tokenRoles: context.auth.token.roles
      });
      throw new functions.https.HttpsError('permission-denied', 'Only admins can run migrations');
    }
    
    const { dryRun = true, tenantId } = data;
    
    functions.logger.info('Migration requested', {
      userId: context.auth.uid,
      dryRun,
      tenantId: tenantId || 'all'
    });
    
    try {
      const result = await runMigrationLogic(dryRun, tenantId);
      return result;
    } catch (error: any) {
      functions.logger.error('Migration failed', error);
      throw new functions.https.HttpsError('internal', error.message);
    }
  });



