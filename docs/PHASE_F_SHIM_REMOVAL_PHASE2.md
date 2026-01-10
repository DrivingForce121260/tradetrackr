# Phase F2: Shim Removal Phase 2

## Overview

Phase F2 completes the migration of core modules away from Firebase shims and introduces stricter guardrails to prevent regression.

**Goal**: Remove remaining high-risk Firebase shim dependency points, then tighten Vite aliases so Firebase imports fail in more of the codebase.

**Status**: ✅ Complete

---

## What Changed

### F2.1: AuthContext Migration

`src/contexts/AuthContext.tsx` now uses:
- `dataClient` for all user queries and updates
- `realtimeClient.watchQuery` for data subscriptions
- No direct Firebase/Firestore imports

The API surface for consumers remains unchanged.

### F2.2: FirestoreService Compatibility Layer

`src/services/firestoreService.ts` has been rewritten as a thin compatibility layer:

```typescript
// Before: Direct Firebase usage
import { collection, doc, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';

// After: Wraps dataClient
import { queryDocs, getDoc, upsertDoc } from './dataClient';
```

**Exported Services** (backwards compatible):
- `FirestoreService` class
- `concernService`, `userService`, `projectService`
- `taskService`, `customerService`, `materialService`
- `categoryService`, `reportService`

All 20+ files that import from `firestoreService` continue to work without modification.

### F2.3: onSnapshot Usage

Remaining `onSnapshot` calls use the firestore-shim which now implements polling internally.

**Files still using onSnapshot via shim** (will be converted in Phase F3):
- `src/components/EmailAccountManager.tsx`
- `src/components/EmailReplyComposer.tsx`
- `src/services/crmService.ts`
- `src/services/emailIntelligenceService.ts`
- `src/services/messagingService.ts`
- `src/hooks/useFirestoreListener.ts`
- `src/hooks/useCategories.ts`
- `src/components/RecentActivityWidget.tsx`
- `src/components/NotificationBell.tsx`

### F2.4: Enhanced realtimeClient

Added performance improvements:
- **Pause-on-hidden**: Backs off to 30s polling when tab is hidden
- **Jitter**: ±10% randomness on intervals to avoid thundering herd
- Configurable via `WatchOptions`

```typescript
watchQuery('tasks', filters, callback, {
  intervalMs: 5000,      // Active tab interval
  hiddenIntervalMs: 30000, // Background tab interval
  noJitter: false,       // Enable jitter (default)
});
```

### F2.5: Session Enforcement

Session blocking is now controlled via environment variable:

```bash
# In /etc/tradetrackr-api/tradetrackr-api.env
SESSION_ENFORCEMENT=on   # Enable strict session blocking
SESSION_ENFORCEMENT=off  # Allow session takeover
```

Default behavior:
- If `SOVEREIGNTY_MODE=strict`: enforcement is ON
- Otherwise: enforcement is OFF

German error message when blocked:
> "Dieses Konto ist bereits auf einem anderen Gerät angemeldet. Bitte melden Sie sich dort zuerst ab."

---

## Guardrail Scripts

### Phase F Guardrail (Migrated Modules)

```bash
npm run sovereignty:phase-f-check
# or
bash scripts/no-firebase-imports-in-migrated-modules.sh
```

Checks that these files contain zero Firebase imports:
- All Phase F1 service files
- `src/contexts/AuthContext.tsx`
- `src/services/firestoreService.ts`

### Phase F2 Guardrail (All Services)

```bash
npm run sovereignty:phase-f2-services
# or
bash scripts/no-firebase-imports-in-src-services.sh
```

Checks all files in `src/services/` with explicit exceptions for files still being migrated.

Both guardrails are run by `npm run release:gate`.

---

## How to Migrate Additional Modules

### Step 1: Replace Imports

```typescript
// Before
import { collection, doc, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '@/config/firebase';

// After
import { queryDocs, getDoc, updateDoc } from '@/services/dataClient';
import { watchQuery } from '@/services/realtimeClient';
```

### Step 2: Replace Operations

| Firebase | dataClient |
|----------|------------|
| `getDocs(query(...))` | `queryDocs(collection, filters)` |
| `getDoc(doc(db, 'col', 'id'))` | `getDoc('col', 'id')` |
| `setDoc(...)` | `upsertDoc(collection, id, data)` |
| `updateDoc(...)` | `updateDoc(collection, id, data)` |
| `deleteDoc(...)` | `deleteDoc(collection, id)` |
| `onSnapshot(...)` | `watchQuery(...)` or `watchDoc(...)` |

### Step 3: Update Guardrails

Add the file to `MIGRATED_MODULES` in:
- `scripts/no-firebase-imports-in-migrated-modules.sh`

Remove from `ALLOWED_FILES` in:
- `scripts/no-firebase-imports-in-src-services.sh`

### Step 4: Verify

```bash
npm run build
npm run sovereignty:phase-f-check
npm run release:gate
```

---

## Do's and Don'ts

### ✅ DO

- Use `dataClient` for all new data operations
- Use `realtimeClient` for subscriptions
- Add migrated files to guardrail lists
- Test with `npm run build` before committing

### ❌ DON'T

- Import from `firebase/*` in new code
- Import from `@/config/firebase` in new code
- Use `httpsCallable` directly (use functions shim if needed)
- Bypass guardrails without documenting why

---

## Rollback Instructions

If issues arise with the migration:

### Rollback AuthContext

```bash
git checkout HEAD~1 -- src/contexts/AuthContext.tsx
```

### Rollback firestoreService

```bash
git checkout HEAD~1 -- src/services/firestoreService.ts
```

### Disable Session Enforcement

```bash
# On VPS
echo "SESSION_ENFORCEMENT=off" >> /etc/tradetrackr-api/tradetrackr-api.env
sudo systemctl restart tradetrackr-api
```

---

## Files Changed in Phase F2

### Created
- `scripts/no-firebase-imports-in-src-services.sh`
- `docs/PHASE_F_SHIM_REMOVAL_PHASE2.md` (this file)

### Modified
- `src/contexts/AuthContext.tsx` - Migrated to dataClient
- `src/services/firestoreService.ts` - Rewritten as compatibility layer
- `src/services/realtimeClient.ts` - Added pause-on-hidden + jitter
- `scripts/no-firebase-imports-in-migrated-modules.sh` - Added F2 modules
- `scripts/release-gate.sh` - Added F2 guardrail check
- `package.json` - Added `sovereignty:phase-f2-services` script
- `services/tradetrackr-api/dist/routes/functions.js` - Session enforcement flag

---

## Next Steps (Phase F3)

1. Convert remaining onSnapshot usages to realtimeClient
2. Remove Vite aliases for firebase imports
3. Delete shim files entirely
4. Remove compatibility layer from firestoreService (direct dataClient usage everywhere)

