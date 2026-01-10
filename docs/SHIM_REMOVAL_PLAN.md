# Workstream E4: Shim Removal Plan

Planning document for removing Firebase compatibility shims and completing the sovereignty migration.

## Current State

TradeTrackr uses Vite aliases to redirect Firebase imports to local shim implementations:

```typescript
// vite.config.ts
resolve: {
  alias: {
    "firebase/firestore": "./src/lib/firestore-shim/index.ts",
    "firebase/functions": "./src/lib/firebase-shim/functions.ts",
    "firebase/storage": "./src/lib/firebase-shim/storage.ts",
    "firebase/app": "./src/lib/firebase-shim/app.ts",
  },
},
```

These shims route operations to the TradeTrackr API:

| Firebase Import | Shim | Routes To |
|-----------------|------|-----------|
| `firebase/firestore` | `firestore-shim` | `/api/v1/db/*` |
| `firebase/functions` | `firebase-shim/functions` | `/api/v1/functions/*` |
| `firebase/storage` | `firebase-shim/storage` | `/api/v1/storage/*` |
| `firebase/app` | `firebase-shim/app` | No-op |

## Migration Rules

### Rule 1: All New Code Uses API Clients Directly

New code MUST NOT use Firebase imports. Use the API clients:

```typescript
// ❌ DON'T: Use Firebase imports (even with shims)
import { doc, getDoc } from 'firebase/firestore';

// ✅ DO: Use the data client directly
import { dataClient } from '@/services/dataClient';
const project = await dataClient.getDoc('projects', projectId);
```

### Rule 2: Existing Code Migrates Incrementally

When modifying existing files that use Firebase imports:

1. If the change is small, migrate the affected code to use API clients
2. If the change is large, keep shims but create a migration ticket

### Rule 3: No Firebase Dependencies

The npm package `firebase` MUST NOT be in package.json or package-lock.json.

```bash
# Verify
npm run sovereignty:never-google
```

## Phased Removal Plan

### Phase 1: Audit (Current) ✅

- [x] Identify all files using Firebase imports
- [x] Document shim behavior
- [x] Add no-google-ever CI check

### Phase 2: Create API Clients

Create dedicated API clients that don't rely on shims:

| Client | Purpose | Status |
|--------|---------|--------|
| `dataClient` | Firestore-like document operations | 🔄 In Progress |
| `storageClient` | File upload/download | ✅ Done |
| `sovereignAiClient` | AI operations via IONOS | ✅ Done |
| `authClient` | Keycloak authentication | ✅ Done |

### Phase 3: Migrate High-Traffic Paths

Priority migration order:

1. **Authentication** - Login, session, token refresh
2. **Project CRUD** - Most frequently used
3. **Document management** - High volume
4. **Task operations** - Core functionality
5. **Remaining features** - Lower priority

### Phase 4: Remove Shims

Once all code uses API clients:

1. Remove Vite aliases from `vite.config.ts`
2. Delete shim files:
   - `src/lib/firestore-shim/`
   - `src/lib/firebase-shim/`
3. Run full test suite
4. Deploy and verify

## Success Metrics

| Metric | Target | Current |
|--------|--------|---------|
| Files using Firebase imports | 0 | ~50 |
| Firebase in package-lock.json | No | Yes |
| CI sovereignty:never-google | Pass | Pass (with shims) |
| All API calls via clients | Yes | Partial |

## File Inventory

### Files Using Firebase Imports

```bash
# Find all files still using Firebase
grep -r "from 'firebase" src/ --include="*.ts" --include="*.tsx" -l
```

Current count: ~50 files

### Shim Files to Remove

```
src/lib/firestore-shim/
├── index.ts          # Main Firestore shim
└── types.ts          # Type definitions

src/lib/firebase-shim/
├── index.ts          # Re-exports
├── app.ts            # App initialization (no-op)
├── functions.ts      # Cloud Functions shim
└── storage.ts        # Storage shim
```

## Migration Checklist

When migrating a file:

- [ ] Replace Firebase imports with API client imports
- [ ] Update function calls to use client methods
- [ ] Test the functionality
- [ ] Update TypeScript types if needed
- [ ] Remove any Firebase-specific error handling

## Example Migration

Before:
```typescript
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';

async function getProject(id: string) {
  const docRef = doc(db, 'projects', id);
  const snap = await getDoc(docRef);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

async function updateProject(id: string, data: Partial<Project>) {
  const docRef = doc(db, 'projects', id);
  await updateDoc(docRef, data);
}
```

After:
```typescript
import { dataClient } from '@/services/dataClient';

async function getProject(id: string) {
  return dataClient.getDoc<Project>('projects', id);
}

async function updateProject(id: string, data: Partial<Project>) {
  return dataClient.updateDoc('projects', id, data);
}
```

## Timeline

| Phase | Target Date | Status |
|-------|-------------|--------|
| Phase 1: Audit | Q1 2026 | ✅ Complete |
| Phase 2: Create Clients | Q1 2026 | 🔄 In Progress |
| Phase 3: Migrate | Q2 2026 | 📅 Planned |
| Phase 4: Remove Shims | Q3 2026 | 📅 Planned |

## References

- `docs/WORKSTREAM_B2_FIREBASE_REMOVAL.md` - Original migration doc
- `src/lib/firestore-shim/index.ts` - Firestore shim implementation
- `services/tradetrackr-api/` - Backend API implementation

