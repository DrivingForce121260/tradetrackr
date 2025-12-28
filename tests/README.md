# TradeTrackr Firestore Security Rules Tests

This directory contains tests for Firestore Security Rules using the Firebase Emulator.

## Prerequisites

1. **Java Runtime**: The Firebase Emulator requires Java 11 or higher
   ```bash
   # Ubuntu/Debian
   sudo apt install openjdk-11-jre-headless
   
   # macOS
   brew install openjdk@11
   
   # Verify
   java -version
   ```

2. **Firebase CLI**: Must be installed globally
   ```bash
   npm install -g firebase-tools
   ```

## Running Tests

### Option 1: npm scripts (Recommended)

```bash
# Run all rules tests once
npm run test:rules

# Run tests in watch mode
npm run test:rules:watch

# Start emulators manually (for debugging)
npm run emulators
```

### Option 2: Manual

```bash
# Terminal 1: Start emulators
firebase emulators:start --only firestore --project demo-tradetrackr

# Terminal 2: Run tests
npx vitest run tests/firestore
```

## Test Structure

### `tests/firestore/offers.rules.test.ts`

Tests the security rules for the offers collection and history subcollection:

| Test | Description |
|------|-------------|
| T1-T3 | Read access (same/cross-tenant/unauthenticated) |
| T4-T6 | Create access (draft only, correct concernID) |
| T7-T10 | Update access for draft offers |
| T11-T12 | Update access for finalized offers (blocked) |
| T13 | Delete access (blocked) |
| T14-T15 | History read access |
| T16-T21 | History create access (type restrictions) |
| T22 | History create after finalization (blocked) |
| T23-T24 | History update/delete (immutable) |

## Key Concepts

### Authenticated Contexts

Tests create users with custom claims to simulate real authentication:

```typescript
const ctx = testEnv.authenticatedContext('userA', { concernID: 'CONCERN_A' });
const db = ctx.firestore();
```

### Rules-Disabled Seeding

For test setup, we use `withSecurityRulesDisabled` to seed data:

```typescript
await testEnv.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  await setDoc(doc(db, 'offers', 'offer1'), { ... });
});
```

### Assertions

```typescript
// Should succeed
await assertSucceeds(getDoc(doc(db, 'offers', 'offer1')));

// Should fail
await assertFails(updateDoc(doc(db, 'offers', 'offer1'), { state: 'sent' }));
```

## Debugging

1. **Emulator UI**: http://localhost:4000 (when running `npm run emulators`)
2. **Firestore Data**: Check the Firestore tab to see seeded data
3. **Test Logs**: Vitest output shows which assertions failed

## Legacy Admin SDK Tests

The old test script `scripts/test-offer-finalization.ts` uses Admin SDK which bypasses security rules. It's marked as deprecated and should not be used for rule validation.



