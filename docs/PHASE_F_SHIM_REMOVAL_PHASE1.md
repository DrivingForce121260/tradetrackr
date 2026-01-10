# Phase F: Shim Removal - Phase 1

This document describes the first phase of Firebase shim removal for TradeTrackr.

## Overview

Phase 1 introduces a typed, API-first data client (`dataClient`) and migrates a subset of high-traffic modules to use it directly, instead of Firebase imports. The existing shims remain in place for non-migrated modules.

## What Changed

### New Files

| File | Purpose |
|------|---------|
| `src/services/dataClient.ts` | Typed API wrapper for doc_store operations |
| `src/services/realtimeClient.ts` | Polling-based watch abstraction (replaces onSnapshot) |
| `scripts/no-firebase-imports-in-migrated-modules.sh` | Guardrail script |

### Migrated Modules

The following modules have been migrated to use `dataClient`:

1. `src/services/taskService.ts`
2. `src/services/supplierService.ts`
3. `src/services/reportService.ts`
4. `src/services/schedulingService.ts`
5. `src/services/personnelService.ts`
6. `src/services/materialsService.ts`
7. `src/services/brandingService.ts`
8. `src/services/notificationsService.ts`
9. `src/services/notificationPrefsService.ts`
10. `src/services/templateService.ts`
11. `src/services/timeAdminService.ts`
12. `src/services/timeOpsService.ts`
13. `src/services/workOrderService.ts`
14. `src/services/documentService.ts`

## API Endpoints Used

The dataClient communicates with the PostgreSQL database via the db-bridge API:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/db/getDoc` | POST | Get single document |
| `/api/v1/db/getDocs` | POST | Query documents |
| `/api/v1/db/setDoc` | POST | Create/overwrite document |
| `/api/v1/db/addDoc` | POST | Add document (auto-ID) |
| `/api/v1/db/updateDoc` | POST | Update document fields |
| `/api/v1/db/deleteDoc` | POST | Delete document |
| `/api/v1/db/batch` | POST | Batch write operations |

## How to Migrate a New Module

### Step 1: Replace Imports

**Before:**
```typescript
import { collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query, where, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
```

**After:**
```typescript
import {
  queryDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  QueryFilter,
} from '@/services/dataClient';
```

### Step 2: Replace Query Patterns

**Before:**
```typescript
const q = query(
  collection(db, 'tasks'),
  where('concernID', '==', this.concernID),
  where('status', '==', 'pending'),
  orderBy('createdAt', 'desc')
);
const snap = await getDocs(q);
const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
```

**After:**
```typescript
const filters: QueryFilter[] = [
  { field: 'concernID', op: '==', value: this.concernID },
  { field: 'status', op: '==', value: 'pending' },
];

const result = await queryDocs<Task>('tasks', filters, {
  orderBy: { field: 'createdAt', dir: 'desc' },
});

const items = result.items.map((doc) => ({ id: doc.doc_id, ...doc.data }));
```

### Step 3: Replace Document Operations

**getDoc:**
```typescript
// Before
const ref = doc(db, 'tasks', id);
const snap = await getDoc(ref);
if (!snap.exists()) return null;
return { id: snap.id, ...snap.data() };

// After
const doc = await getDoc<Task>('tasks', id);
if (!doc) return null;
return { id: doc.doc_id, ...doc.data };
```

**addDoc:**
```typescript
// Before
const ref = await addDoc(collection(db, 'tasks'), data);
return ref.id;

// After
const doc = await addDoc('tasks', data);
return doc.doc_id;
```

**updateDoc:**
```typescript
// Before
await updateDoc(doc(db, 'tasks', id), { status: 'done', updatedAt: serverTimestamp() });

// After
await updateDoc('tasks', id, { status: 'done', updatedAt: serverTimestamp() });
```

**deleteDoc:**
```typescript
// Before
await deleteDoc(doc(db, 'tasks', id));

// After
await deleteDoc('tasks', id);
```

### Step 4: Replace onSnapshot with realtimeClient

**Before:**
```typescript
import { onSnapshot, query, where, collection } from 'firebase/firestore';

const unsubscribe = onSnapshot(
  query(collection(db, 'tasks'), where('status', '==', 'pending')),
  (snapshot) => {
    const tasks = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    setTasks(tasks);
  }
);
```

**After:**
```typescript
import { watchQuery } from '@/services/realtimeClient';

const unsubscribe = watchQuery<Task>(
  'tasks',
  [{ field: 'status', op: '==', value: 'pending' }],
  (docs) => {
    const tasks = docs.map((doc) => ({ id: doc.doc_id, ...doc.data }));
    setTasks(tasks);
  },
  { intervalMs: 5000 }
);
```

### Step 5: Add Module to Guardrail

Edit `scripts/no-firebase-imports-in-migrated-modules.sh` and add your module to `MIGRATED_MODULES`.

## Do's and Don'ts

### ✅ DO

- Use `dataClient` for all new code
- Use `realtimeClient.watchQuery` instead of `onSnapshot`
- Import from `@/services/dataClient` or `@/services/realtimeClient`
- Keep German error messages for user-facing errors
- Use typed generics: `getDoc<Task>()`, `queryDocs<Project>()`
- Run `npm run release:gate` before committing

### ❌ DON'T

- Don't add new Firebase imports to migrated modules
- Don't use `firebase/firestore` directly in new code
- Don't use `httpsCallable` - use fetch to `/api/v1/functions/*`
- Don't import from `@/config/firebase` in migrated modules

## Rollback Instructions

If a migration causes issues in production:

1. **Identify the problematic module** from error logs

2. **Revert to shim-based version:**
   ```bash
   git checkout HEAD~1 -- src/services/problematicService.ts
   ```

3. **Remove from guardrail:**
   Edit `scripts/no-firebase-imports-in-migrated-modules.sh` and remove the module from `MIGRATED_MODULES`

4. **Deploy hotfix:**
   ```bash
   npm run deploy:web
   ```

5. **Create ticket** to investigate and fix the migration

## Verification Commands

```bash
# Run the guardrail check
bash scripts/no-firebase-imports-in-migrated-modules.sh

# Run full release gate (includes guardrail)
npm run release:gate

# Build to verify no import errors
npm run build
```

## Next Steps (Phase 2)

Phase 2 will migrate additional modules:
- Components with direct Firebase imports
- Hooks using Firebase
- Remove legacy shims once all modules are migrated

## Related Documentation

- [WORKSTREAM_E_RELEASE_GATE.md](./WORKSTREAM_E_RELEASE_GATE.md) - Release gate configuration
- [SHIM_REMOVAL_PLAN.md](./SHIM_REMOVAL_PLAN.md) - Overall shim removal strategy

