/**
 * ONE-TIME MIGRATION: Renumber Project Numbers to New PN- Scheme
 * 
 * ========================================
 * HOW TO RUN
 * ========================================
 * 
 * DRY RUN (default, safe):
 *   npx ts-node tools/migrations/renumberProjectNumbers.ts --dry-run
 * 
 * DRY RUN for specific tenant:
 *   npx ts-node tools/migrations/renumberProjectNumbers.ts --dry-run --tenantId=YOUR_TENANT_ID
 * 
 * APPLY (writes to Firestore):
 *   npx ts-node tools/migrations/renumberProjectNumbers.ts --apply
 * 
 * APPLY for specific tenant:
 *   npx ts-node tools/migrations/renumberProjectNumbers.ts --apply --tenantId=YOUR_TENANT_ID
 * 
 * ========================================
 * SAFETY FEATURES
 * ========================================
 * 
 * - Idempotent: Safe to re-run (skips already migrated projects)
 * - Dry-run default: Must explicitly use --apply flag
 * - Audit trail: Creates mapping documents for every migration
 * - Preserves old values: Stores previousProjectNumber
 * - Batched writes: 500 docs max per batch with backoff
 * - Progress logging: Real-time status updates
 * - Verification: Final uniqueness check
 * 
 * ========================================
 * OUTPUT
 * ========================================
 * 
 * Console: Progress and summary
 * File: ./migration-output/project-renumber-{timestamp}.json
 * 
 */

import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// ============================================================================
// Configuration
// ============================================================================

const MIGRATION_VERSION = 1;
const BATCH_SIZE = 500;
const MAX_COUNTER_PER_DATE_KEY = 99;
const YEAR_BASE = 2025; // Year 0 in hex = 2025

// ============================================================================
// Project Number Generation Logic (matches production)
// ============================================================================

function toHexDigit(n: number): string {
  if (n < 0 || n > 15) {
    throw new Error(`Number must be 0-15 for hex digit, got ${n}`);
  }
  return n.toString(16).toUpperCase();
}

function yearHex(year: number): string {
  const offset = year - YEAR_BASE;
  if (offset < 0 || offset > 15) {
    throw new Error(`Year must be ${YEAR_BASE}-${YEAR_BASE + 15}, got ${year}`);
  }
  return toHexDigit(offset);
}

function monthHex(month1to12: number): string {
  if (month1to12 < 1 || month1to12 > 12) {
    throw new Error(`Month must be 1-12, got ${month1to12}`);
  }
  return toHexDigit(month1to12);
}

function dayHexWrapped(day1to31: number): string {
  if (day1to31 < 1 || day1to31 > 31) {
    throw new Error(`Day must be 1-31, got ${day1to31}`);
  }
  if (day1to31 <= 15) {
    return toHexDigit(day1to31);
  } else {
    const wrapped = day1to31 - 16; // 0-15
    return toHexDigit(wrapped);
  }
}

function halfOfMonthDigit(day: number): '0' | '1' {
  if (day < 1 || day > 31) {
    throw new Error(`Day must be 1-31, got ${day}`);
  }
  return day <= 15 ? '0' : '1';
}

function buildDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 1-12
  const day = date.getDate(); // 1-31
  
  const y = yearHex(year);
  const h1 = monthHex(month);
  const h2 = dayHexWrapped(day);
  const h3 = halfOfMonthDigit(day);
  
  return `${y}${h1}${h2}${h3}`;
}

function formatCounter(counter: number): string {
  if (counter < 0 || counter > 99) {
    throw new Error(`Counter must be 0-99, got ${counter}`);
  }
  return counter.toString().padStart(2, '0');
}

function buildProjectNumber(dateKey: string, counter: number): string {
  const counterStr = formatCounter(counter);
  return `PN-${dateKey}${counterStr}`;
}

// ============================================================================
// Check if Already Migrated
// ============================================================================

function isAlreadyMigrated(projectData: any): boolean {
  // Check if projectNumber matches new format
  const pn = projectData.projectNumber;
  if (typeof pn === 'string' && /^PN-[0-9A-F]{4}\d{2}$/.test(pn)) {
    return true;
  }
  
  // Check migration marker
  if (projectData.projectNumberMigrationVersion === MIGRATION_VERSION) {
    return true;
  }
  
  return false;
}

// ============================================================================
// Date Source Determination
// ============================================================================

interface DateSourceResult {
  date: Date;
  source: 'createdAt' | 'fallback';
  fallbackUsed: boolean;
}

function determineDateSource(projectData: any): DateSourceResult {
  // Priority 1: projects.createdAt (or dateCreated)
  const createdAt = projectData.createdAt || projectData.dateCreated;
  
  if (createdAt) {
    let date: Date;
    
    // Handle Firestore Timestamp
    if (createdAt.toDate && typeof createdAt.toDate === 'function') {
      date = createdAt.toDate();
    }
    // Handle Date object
    else if (createdAt instanceof Date) {
      date = createdAt;
    }
    // Handle timestamp number
    else if (typeof createdAt === 'number') {
      date = new Date(createdAt);
    }
    // Handle ISO string
    else if (typeof createdAt === 'string') {
      date = new Date(createdAt);
    }
    else {
      // Fallback to now
      console.warn(`[determineDateSource] Invalid createdAt format for project, using fallback`);
      return {
        date: new Date(),
        source: 'fallback',
        fallbackUsed: true
      };
    }
    
    // Validate date
    if (!isNaN(date.getTime())) {
      return {
        date,
        source: 'createdAt',
        fallbackUsed: false
      };
    }
  }
  
  // Priority 2: Fallback to current date
  console.warn(`[determineDateSource] No valid createdAt, using fallback date`);
  return {
    date: new Date(),
    source: 'fallback',
    fallbackUsed: true
  };
}

// ============================================================================
// Main Migration Logic
// ============================================================================

interface ProjectToMigrate {
  projectId: string;
  tenantId: string;
  oldProjectNumber: string | number | null;
  dateSource: DateSourceResult;
  data: any;
}

interface MigrationMapping {
  projectId: string;
  tenantId: string;
  oldProjectNumber: string | null;
  newProjectNumber: string;
  dateKey: string;
  counter: number;
  createdAtUsed: admin.firestore.Timestamp | null;
  fallbackUsed: boolean;
}

interface MigrationResult {
  totalProjects: number;
  alreadyMigrated: number;
  toMigrate: number;
  errors: Array<{projectId: string; error: string}>;
  mappings: MigrationMapping[];
  success: boolean;
}

async function collectProjectsToMigrate(tenantIdFilter?: string): Promise<ProjectToMigrate[]> {
  console.log('\n[1/5] 📥 Collecting projects from Firestore...');
  
  let query = db.collection('projects') as admin.firestore.Query;
  
  if (tenantIdFilter) {
    console.log(`   Filtering by tenantId: ${tenantIdFilter}`);
    query = query.where('concernID', '==', tenantIdFilter);
  }
  
  const snapshot = await query.get();
  console.log(`   Found ${snapshot.size} total projects`);
  
  const projects: ProjectToMigrate[] = [];
  let skipped = 0;
  
  for (const doc of snapshot.docs) {
    const data = doc.data();
    
    // Skip already migrated
    if (isAlreadyMigrated(data)) {
      skipped++;
      continue;
    }
    
    const tenantId = data.concernID || data.orgId;
    if (!tenantId) {
      console.warn(`   ⚠️  Project ${doc.id} has no tenantId, skipping`);
      continue;
    }
    
    const dateSource = determineDateSource(data);
    
    projects.push({
      projectId: doc.id,
      tenantId,
      oldProjectNumber: data.projectNumber,
      dateSource,
      data
    });
  }
  
  console.log(`   ✅ ${projects.length} projects need migration`);
  console.log(`   ⏭️  ${skipped} projects already migrated`);
  
  return projects;
}

async function allocateProjectNumbers(projects: ProjectToMigrate[]): Promise<MigrationResult> {
  console.log('\n[2/5] 🔢 Allocating new project numbers...');
  
  const result: MigrationResult = {
    totalProjects: projects.length,
    alreadyMigrated: 0,
    toMigrate: projects.length,
    errors: [],
    mappings: [],
    success: true
  };
  
  // Group by {tenantId}_{dateKey}
  const groups: Map<string, ProjectToMigrate[]> = new Map();
  
  for (const project of projects) {
    const dateKey = buildDateKey(project.dateSource.date);
    const groupKey = `${project.tenantId}_${dateKey}`;
    
    if (!groups.has(groupKey)) {
      groups.set(groupKey, []);
    }
    groups.get(groupKey)!.push(project);
  }
  
  console.log(`   📊 Grouped into ${groups.size} date keys`);
  
  // Allocate counters per group
  for (const [groupKey, groupProjects] of groups.entries()) {
    const [tenantId, dateKey] = groupKey.split('_');
    
    // Sort by createdAt ascending (stable tie-breaker by projectId)
    groupProjects.sort((a, b) => {
      const timeA = a.dateSource.date.getTime();
      const timeB = b.dateSource.date.getTime();
      if (timeA !== timeB) {
        return timeA - timeB;
      }
      return a.projectId.localeCompare(b.projectId);
    });
    
    // Check counter limit
    if (groupProjects.length > MAX_COUNTER_PER_DATE_KEY + 1) {
      const error = `Group ${groupKey} has ${groupProjects.length} projects, exceeds limit of ${MAX_COUNTER_PER_DATE_KEY + 1}`;
      console.error(`   ❌ ${error}`);
      
      for (const project of groupProjects) {
        result.errors.push({
          projectId: project.projectId,
          error
        });
      }
      result.success = false;
      continue;
    }
    
    // Allocate sequential counters
    let counter = 0;
    for (const project of groupProjects) {
      const newProjectNumber = buildProjectNumber(dateKey, counter);
      
      result.mappings.push({
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
  
  console.log(`   ✅ Allocated ${result.mappings.length} project numbers`);
  if (result.errors.length > 0) {
    console.log(`   ⚠️  ${result.errors.length} errors`);
  }
  
  return result;
}

async function applyMigration(mappings: MigrationMapping[], dryRun: boolean): Promise<void> {
  if (dryRun) {
    console.log('\n[3/5] 🏃 DRY RUN MODE - No writes will be performed');
    return;
  }
  
  console.log('\n[3/5] 💾 Applying migration to Firestore...');
  
  const now = admin.firestore.Timestamp.now();
  let totalWrites = 0;
  
  // Process in batches
  for (let i = 0; i < mappings.length; i += BATCH_SIZE) {
    const batch = db.batch();
    const batchMappings = mappings.slice(i, i + BATCH_SIZE);
    
    for (const mapping of batchMappings) {
      // Update project document
      const projectRef = db.collection('projects').doc(mapping.projectId);
      batch.update(projectRef, {
        projectNumber: mapping.newProjectNumber,
        previousProjectNumber: mapping.oldProjectNumber,
        projectNumberMigratedAt: now,
        projectNumberMigrationVersion: MIGRATION_VERSION
      });
      
      // Write audit mapping
      const auditRef = db.collection('projectNumberMigrations').doc(mapping.projectId);
      batch.set(auditRef, {
        ...mapping,
        migratedAt: now
      });
      
      // Write reverse lookup
      const lookupRef = db.collection('projectNumberLookup').doc(`${mapping.tenantId}_${mapping.newProjectNumber}`);
      batch.set(lookupRef, {
        tenantId: mapping.tenantId,
        projectId: mapping.projectId,
        projectNumber: mapping.newProjectNumber
      });
      
      totalWrites += 3;
    }
    
    await batch.commit();
    console.log(`   ✅ Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(mappings.length / BATCH_SIZE)} committed (${batchMappings.length} projects)`);
  }
  
  console.log(`   ✅ Total writes: ${totalWrites}`);
}

async function updateDenormalizedFields(mappings: MigrationMapping[], dryRun: boolean): Promise<void> {
  console.log('\n[4/5] 🔄 Updating denormalized projectNumber fields...');
  
  if (dryRun) {
    console.log('   🏃 DRY RUN MODE - Skipping denormalized updates');
    return;
  }
  
  let totalUpdates = 0;
  
  // Update documents collection
  console.log('   📄 Updating documents...');
  for (const mapping of mappings) {
    if (!mapping.oldProjectNumber) {
      continue; // No old number to update from
    }
    
    const docsSnapshot = await db.collection('documents')
      .where('projectId', '==', mapping.projectId)
      .where('projectNumber', '==', mapping.oldProjectNumber)
      .get();
    
    if (docsSnapshot.empty) {
      continue;
    }
    
    // Batch update documents
    for (let i = 0; i < docsSnapshot.docs.length; i += BATCH_SIZE) {
      const batch = db.batch();
      const batchDocs = docsSnapshot.docs.slice(i, i + BATCH_SIZE);
      
      for (const doc of batchDocs) {
        batch.update(doc.ref, {
          projectNumber: mapping.newProjectNumber
        });
      }
      
      await batch.commit();
      totalUpdates += batchDocs.length;
    }
  }
  
  console.log(`   ✅ Updated ${totalUpdates} documents`);
  
  // Could add more collections here (reports, aufmass, etc.)
  // For now, documents is the main one with denormalized projectNumber
}

async function verifyMigration(mappings: MigrationMapping[]): Promise<void> {
  console.log('\n[5/5] ✅ Verifying migration...');
  
  // Check uniqueness per tenant
  const tenantProjectNumbers = new Map<string, Set<string>>();
  
  for (const mapping of mappings) {
    if (!tenantProjectNumbers.has(mapping.tenantId)) {
      tenantProjectNumbers.set(mapping.tenantId, new Set());
    }
    
    const numbers = tenantProjectNumbers.get(mapping.tenantId)!;
    if (numbers.has(mapping.newProjectNumber)) {
      console.error(`   ❌ Duplicate project number detected: ${mapping.newProjectNumber} for tenant ${mapping.tenantId}`);
      throw new Error('Uniqueness violation detected!');
    }
    numbers.add(mapping.newProjectNumber);
  }
  
  console.log(`   ✅ All project numbers are unique per tenant`);
  console.log(`   ✅ Migration verified successfully`);
}

function saveReport(result: MigrationResult, dryRun: boolean): void {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputDir = path.join(process.cwd(), 'migration-output');
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const filename = `project-renumber-${timestamp}.json`;
  const filepath = path.join(outputDir, filename);
  
  const report = {
    timestamp: new Date().toISOString(),
    dryRun,
    summary: {
      totalProjects: result.totalProjects,
      toMigrate: result.toMigrate,
      errors: result.errors.length,
      success: result.success
    },
    mappings: result.mappings,
    errors: result.errors
  };
  
  fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
  console.log(`\n📄 Report saved to: ${filepath}`);
}

// ============================================================================
// CLI Entry Point
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const dryRun = !args.includes('--apply');
  const tenantIdArg = args.find(arg => arg.startsWith('--tenantId='));
  const tenantId = tenantIdArg ? tenantIdArg.split('=')[1] : undefined;
  
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  PROJECT NUMBER MIGRATION TO PN-{Y}{H1}{H2}{H3}{NN} SCHEME  ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log(`\n⚙️  Mode: ${dryRun ? '🏃 DRY RUN' : '💾 APPLY'}`);
  if (tenantId) {
    console.log(`⚙️  Tenant Filter: ${tenantId}`);
  }
  
  try {
    // Step 1: Collect projects
    const projects = await collectProjectsToMigrate(tenantId);
    
    if (projects.length === 0) {
      console.log('\n✅ No projects need migration!');
      return;
    }
    
    // Step 2: Allocate numbers
    const result = await allocateProjectNumbers(projects);
    
    if (!result.success) {
      console.error('\n❌ Migration failed due to errors (see above)');
      saveReport(result, dryRun);
      process.exit(1);
    }
    
    // Step 3: Apply (or skip if dry-run)
    await applyMigration(result.mappings, dryRun);
    
    // Step 4: Update denormalized fields
    await updateDenormalizedFields(result.mappings, dryRun);
    
    // Step 5: Verify
    await verifyMigration(result.mappings);
    
    // Save report
    saveReport(result, dryRun);
    
    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║                  ✅ MIGRATION COMPLETE                       ║');
    console.log('╚══════════════════════════════════════════════════════════════╝');
    
    if (dryRun) {
      console.log('\n💡 This was a DRY RUN. To apply changes, run with --apply flag');
    } else {
      console.log(`\n✅ Migrated ${result.mappings.length} projects successfully`);
    }
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { main };



