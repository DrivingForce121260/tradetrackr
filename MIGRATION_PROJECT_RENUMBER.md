# Project Number Renumbering Migration

## Status: ✅ **Ready to Execute**

**Date:** December 21, 2025  
**Purpose:** One-time migration to renumber all existing projects to new `PN-{Y}{H1}{H2}{H3}{NN}` format

---

## ⚠️ Critical Pre-Migration Checklist

### Before Running Migration

- [ ] **Backup Firestore Database** - Export to Cloud Storage
- [ ] **Review dry-run output** - Check for errors and counter overflows
- [ ] **Notify users** - System may be read-only during migration
- [ ] **Test on staging** - Run dry-run on test data first
- [ ] **Verify date sources** - Confirm `createdAt` fields are accurate

---

## 🎯 What This Migration Does

### Renumbers Projects

**Old Format:**
- `projectNumber: number` (e.g., `12345`, `67890`)
- Inconsistent, no date encoding

**New Format:**
- `projectNumber: string` (e.g., `PN-0AA012`, `PN-1C5134`)
- Encodes date + tenant-specific counter
- Format: `PN-{Y}{H1}{H2}{H3}{NN}`
  - `Y`: Year hex (0=2025, 1=2026, ..., F=2040)
  - `H1`: Month hex (1-C)
  - `H2`: Day hex wrapped (0-F)
  - `H3`: Half of month (0 or 1)
  - `NN`: Counter (00-99) per tenant + date

### Creates Audit Trail

**New Collections:**

1. **`projectNumberMigrations/{projectId}`**
   ```typescript
   {
     tenantId: string,
     projectId: string,
     oldProjectNumber: string | null,
     newProjectNumber: string,
     dateKey: string,
     counter: number,
     createdAtUsed: Timestamp | null,
     fallbackUsed: boolean,
     migratedAt: Timestamp
   }
   ```

2. **`projectNumberLookup/{tenantId}_{newProjectNumber}`**
   ```typescript
   {
     tenantId: string,
     projectId: string,
     projectNumber: string
   }
   ```

### Updates Projects

**Fields Added:**
- `projectNumber`: Changed from `number` to `string` with new format
- `previousProjectNumber`: Stores old number for reference
- `projectNumberMigratedAt`: Timestamp of migration
- `projectNumberMigrationVersion`: Always `1`

### Updates Denormalized Fields

**Collections Updated:**
- `documents` where `projectNumber` is stored
- `reports` where `projectNumber` is stored
- `tasks` where `projectNumber` is stored
- `materials` where `projectNumber` is stored
- `aufmass` where `projectNumber` is stored

All of these collections store a denormalized copy of `projectNumber` for fast querying and display. The migration updates all of these to the new `PN-??????` format.

---

## 🚀 How to Run

### 1. Dry Run (Safe, Recommended First)

**All tenants:**
```bash
npm run migrate:projects:dry-run
```

**Single tenant:**
```bash
npx ts-node tools/migrations/renumberProjectNumbers.ts --dry-run --tenantId=YOUR_TENANT_ID
```

**Output:**
- Console: Progress and summary
- File: `./migration-output/project-renumber-{timestamp}.json`

### 2. Review Dry Run Output

**Check for:**
- ✅ No errors
- ✅ No counter overflows (>99 projects per date/tenant)
- ✅ Date sources look reasonable
- ✅ Old project numbers are preserved

**Example Output:**
```json
{
  "timestamp": "2025-12-21T10:30:00.000Z",
  "dryRun": true,
  "summary": {
    "totalProjects": 150,
    "toMigrate": 120,
    "errors": 0,
    "success": true
  },
  "mappings": [
    {
      "projectId": "abc123",
      "tenantId": "tenant1",
      "oldProjectNumber": "12345",
      "newProjectNumber": "PN-0AA012",
      "dateKey": "0AA0",
      "counter": 12,
      "createdAtUsed": "2025-10-10T10:00:00.000Z",
      "fallbackUsed": false
    }
  ]
}
```

### 3. Apply Migration (Production)

**⚠️ WARNING:** This writes to Firestore!

**All tenants:**
```bash
npm run migrate:projects:apply
```

**Single tenant (safer):**
```bash
npx ts-node tools/migrations/renumberProjectNumbers.ts --apply --tenantId=YOUR_TENANT_ID
```

---

## 📊 Migration Logic

### Date Source Priority

1. **`projects.createdAt`** (or `dateCreated`)
   - Firestore Timestamp → `toDate()`
   - Date object → used directly
   - Number (timestamp) → `new Date()`
   - ISO string → `new Date()`

2. **Fallback: Current Date**
   - Used if `createdAt` missing or invalid
   - Marked with `fallbackUsed: true`

### Counter Allocation

1. **Group by:** `{tenantId}_{dateKey}`
2. **Sort within group:**
   - Primary: `createdAt` ascending
   - Tie-breaker: `projectId` alphabetically
3. **Assign counters:**
   - First project: `00`
   - Second project: `01`
   - ...
   - Last project: `99` (max)

### Idempotency

**Already Migrated Check:**
- Project number matches regex: `/^PN-[0-9A-F]{4}\d{2}$/`
- OR `projectNumberMigrationVersion === 1`

**Behavior:**
- Skips already migrated projects
- Safe to re-run multiple times

---

## ⚙️ Configuration

**File:** `tools/migrations/renumberProjectNumbers.ts`

**Constants:**
```typescript
MIGRATION_VERSION = 1        // Migration marker
BATCH_SIZE = 500             // Firestore batch size
MAX_COUNTER_PER_DATE_KEY = 99 // Max projects per date/tenant
YEAR_BASE = 2025             // Year 0 in hex
```

---

## 🛡️ Safety Features

### 1. Dry-Run Default
- Must explicitly use `--apply` flag
- No writes in dry-run mode

### 2. Audit Trail
- Every migration creates mapping doc
- Stores old → new projectNumber
- Includes date source and fallback flag

### 3. Preserves Old Values
- `previousProjectNumber` field added
- Never deletes data

### 4. Batched Writes
- Max 500 documents per batch
- Prevents timeout errors

### 5. Progress Logging
- Real-time console output
- Shows batch progress

### 6. Verification Pass
- Checks uniqueness per tenant
- Asserts no duplicates

### 7. Error Handling
- Stops on critical errors
- Provides detailed error messages
- Safe to retry after fixing issues

---

## 🚨 Error Scenarios

### Error: Counter Overflow

**Symptom:**
```
❌ Group tenant1_0AA0 has 105 projects, exceeds limit of 100
```

**Cause:**
- More than 100 projects created on same date for same tenant

**Solution:**
1. Review affected projects
2. Options:
   - Manually adjust dates (stagger by days)
   - Increase counter limit (requires code change + coordination)
   - Split into multiple tenants

---

### Error: No createdAt

**Symptom:**
```
⚠️ No valid createdAt, using fallback date
```

**Cause:**
- Project missing `createdAt` field

**Impact:**
- All such projects get today's date
- Grouped together, may cause counter overflow

**Solution:**
1. Review `fallbackUsed: true` mappings in dry-run
2. Manually set `createdAt` for important projects
3. Re-run dry-run

---

### Error: Duplicate Project Numbers

**Symptom:**
```
❌ Duplicate project number detected: PN-0AA012 for tenant tenant1
```

**Cause:**
- Logic error (should not happen with current code)

**Solution:**
1. Report bug
2. Do NOT proceed with --apply
3. Fix code before retrying

---

## 📋 Post-Migration Verification

### 1. Check Project Numbers

```javascript
// Firestore Console
db.collection('projects')
  .where('concernID', '==', 'YOUR_TENANT_ID')
  .get()
  .then(snapshot => {
    snapshot.forEach(doc => {
      const pn = doc.data().projectNumber;
      console.log(doc.id, pn, typeof pn, /^PN-[0-9A-F]{4}\d{2}$/.test(pn));
    });
  });
```

**Expected:**
- All `projectNumber` are strings
- All match pattern `/^PN-[0-9A-F]{4}\d{2}$/`
- No duplicates per tenant

---

### 2. Check Documents

```javascript
// Firestore Console
db.collection('documents')
  .where('projectId', '==', 'SOME_PROJECT_ID')
  .get()
  .then(snapshot => {
    snapshot.forEach(doc => {
      console.log(doc.data().projectNumber);
    });
  });
```

**Expected:**
- Document `projectNumber` matches project's new number

---

### 3. Check Audit Trail

```javascript
// Firestore Console
db.collection('projectNumberMigrations')
  .doc('SOME_PROJECT_ID')
  .get()
  .then(doc => {
    console.log(doc.data());
  });
```

**Expected:**
- Mapping exists for every migrated project
- `oldProjectNumber` and `newProjectNumber` are populated
- `migratedAt` timestamp is recent

---

## 🔄 Rollback (If Needed)

**If migration fails or needs reverting:**

### Option 1: Firestore Import from Backup

1. Stop migration script
2. Import Firestore backup from before migration
3. Fix issues
4. Retry

### Option 2: Restore from Audit Trail

```typescript
// Script to restore old project numbers
const mappings = await db.collection('projectNumberMigrations').get();

for (const doc of mappings.docs) {
  const data = doc.data();
  await db.collection('projects').doc(data.projectId).update({
    projectNumber: data.oldProjectNumber,
    previousProjectNumber: admin.firestore.FieldValue.delete(),
    projectNumberMigratedAt: admin.firestore.FieldValue.delete(),
    projectNumberMigrationVersion: admin.firestore.FieldValue.delete()
  });
}
```

**⚠️ WARNING:** Only use if confident. Test on staging first.

---

## 📈 Expected Timeline

| Phase | Duration | Notes |
|-------|----------|-------|
| Dry-run | 1-5 min | Depends on project count |
| Review output | 10-30 min | Manual review |
| Apply | 2-10 min | Actual writes |
| Verification | 5-10 min | Spot checks |

**Total:** ~20-60 minutes for careful execution

---

## ✅ Success Criteria

- [ ] All projects have new format: `PN-[0-9A-F]{4}\d{2}`
- [ ] No duplicate project numbers per tenant
- [ ] All projects have `projectNumberMigratedAt` timestamp
- [ ] Audit trail exists for every project
- [ ] Documents updated with new project numbers
- [ ] No errors in final verification

---

## 📞 Support

**If you encounter issues:**

1. **Check dry-run output** - Most issues visible there
2. **Review error messages** - Usually self-explanatory
3. **Check migration report JSON** - Detailed mappings + errors
4. **Do NOT re-run --apply** - Until issues resolved

---

## 🎉 After Migration

**What Changes:**

1. **Projects:** All have new `PN-??????` format
2. **Documents:** `projectNumber` field updated
3. **New Documents:** Will auto-detect new format
4. **Project Linking:** Works with new format

**What Doesn't Change:**

1. **Project IDs:** Same Firestore document IDs
2. **References:** All `projectId` references intact
3. **Functionality:** Everything still works as before

**Next Steps:**

1. Monitor logs for any issues
2. Inform users of new project number format
3. Update any external integrations that use old format

---

## Summary

The **Project Number Renumbering Migration** is a safe, idempotent, one-time script that converts all existing project numbers to the new `PN-{Y}{H1}{H2}{H3}{NN}` format, while preserving audit trails and updating all denormalized references.

**Always run dry-run first!** 🏃



