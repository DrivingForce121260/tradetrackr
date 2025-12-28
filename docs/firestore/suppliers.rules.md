# Firestore Security Rules: Suppliers Collection

## Overview

The `suppliers` collection stores vendor/supplier data for TradeTrackr. Each supplier document is scoped to a `concernID` (multi-tenant isolation).

## Security Rules Block

Add the following block to `firestore.rules`, after the `customers` collection rules (around line 150) or near other tenant-scoped collections:

```javascript
// ====================================
// SUPPLIERS COLLECTION (Multi-Tenancy Enforced)
// ====================================

match /suppliers/{supplierId} {
  /**
   * Helper to get user's concernID from auth token
   * Supports both tenantId (new) and concernID (legacy) token claims
   */
  function getUserConcernId() {
    return request.auth.token.get('concernID', 
           request.auth.token.get('tenantId', null));
  }
  
  /**
   * Check if user belongs to the supplier's concern
   */
  function isConcernUser() {
    return isAuthenticated() 
           && resource.data.concernID == getUserConcernId();
  }
  
  // Read: Must belong to same concern
  allow read: if isConcernUser();
  
  // Create: Must belong to same concern, name is required
  allow create: if isAuthenticated()
                  && request.resource.data.concernID == getUserConcernId()
                  && request.resource.data.name is string
                  && request.resource.data.name.size() > 0;
  
  // Update: Only allowed if:
  // 1. User belongs to supplier's concern
  // 2. concernID cannot be changed
  // 3. Archived suppliers cannot be modified (except to unarchive by changing status)
  allow update: if isConcernUser()
                  && request.resource.data.concernID == resource.data.concernID
                  && (resource.data.status != 'archived' 
                      || request.resource.data.status != 'archived');
  
  // Delete: Not allowed (soft-delete only via status='archived')
  allow delete: if false;
}
```

## Placement in firestore.rules

Insert the block after line ~150 (after the `customers` collection):

```javascript
// Customers at root level
match /customers/{customerId} {
  allow read, write: if isAuthenticated();
}

// INSERT SUPPLIERS RULES HERE ↓

// ====================================
// SUPPLIERS COLLECTION (Multi-Tenancy Enforced)
// ====================================
// ... (the block above)
```

## Key Security Constraints

1. **Multi-tenant isolation**: Every read/write checks `concernID` against the user's token
2. **No deletion**: Suppliers can only be archived (soft delete)
3. **Archived protection**: Archived suppliers cannot be modified (rule prevents updates when status is 'archived')
4. **Name required**: Creation requires a non-empty name string

## Deployment

### Prerequisites
- Firebase CLI installed: `npm install -g firebase-tools`
- Logged in: `firebase login`
- Project selected: `firebase use <project-id>`

### Deploy Security Rules

```bash
# From project root
firebase deploy --only firestore:rules

# Or with specific project
firebase deploy --only firestore:rules --project tradetrackr-prod
```

### Verify Deployment

1. Go to Firebase Console → Firestore → Rules
2. Confirm the suppliers block is present
3. Use the Rules Playground to test:
   - Read supplier with matching concernID → ✅ should allow
   - Read supplier with different concernID → ❌ should deny
   - Create supplier with name → ✅ should allow
   - Create supplier without name → ❌ should deny
   - Update archived supplier → ❌ should deny (unless changing status away from 'archived')

## Troubleshooting

### "Missing or insufficient permissions" error

1. Check user's auth token has `concernID` or `tenantId` claim
2. Verify the supplier document has matching `concernID`
3. Check Firebase Console → Authentication → Users → click user → Custom Claims

### Rules not taking effect

1. Wait 1-2 minutes after deployment
2. Clear browser cache / hard refresh
3. Check deployment logs: `firebase deploy --only firestore:rules --debug`



