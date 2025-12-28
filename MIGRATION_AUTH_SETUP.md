# Running the Project Number Migration

## Authentication Required

The migration script needs Firebase Admin SDK credentials to access Firestore. You have two options:

### Option 1: Use Service Account Key (Recommended for Local Execution)

1. **Download Service Account Key:**
   - Go to [Firebase Console](https://console.firebase.google.com/project/reportingapp817/settings/serviceaccounts/adminsdk)
   - Click "Generate New Private Key"
   - Save as `service-account-key.json` in the `functions/` directory

2. **Set Environment Variable:**
   ```bash
   export GOOGLE_APPLICATION_CREDENTIALS="/home/david/dev/tradetrackr/functions/service-account-key.json"
   ```

3. **Run Migration:**
   ```bash
   npm run migrate:projects:dry-run
   ```

### Option 2: Deploy as Cloud Function (Recommended for Production)

The migration script can also be deployed as a Cloud Function with proper authentication.

**Create:** `functions/src/migrations/runProjectMigration.ts`

```typescript
import * as functions from 'firebase-functions';
import { main as runMigration } from './renumberProjectNumbers';

/**
 * Callable Cloud Function to run project renumbering migration
 * Only admins can call this
 */
export const runProjectNumberMigration = functions
  .region('europe-west1')
  .runWith({
    timeoutSeconds: 540, // 9 minutes
    memory: '2GB'
  })
  .https.onCall(async (data, context) => {
    // Check authentication
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Must be authenticated');
    }

    // Check admin role
    const isAdmin = context.auth.token.role === 'admin' 
                 || (context.auth.token.roles && 'admin' in context.auth.token.roles);
    
    if (!isAdmin) {
      throw new functions.https.HttpsError('permission-denied', 'Only admins can run migrations');
    }

    const { apply, tenantId } = data;

    functions.logger.info('Starting project migration', {
      userId: context.auth.uid,
      dryRun: !apply,
      tenantId: tenantId || 'all'
    });

    try {
      // Run migration (would need to refactor main() to return result instead of process.exit)
      const result = await runMigration();
      
      return {
        success: true,
        ...result
      };
    } catch (error: any) {
      functions.logger.error('Migration failed', error);
      throw new functions.https.HttpsError('internal', error.message);
    }
  });
```

Then deploy:
```bash
firebase deploy --only functions:runProjectNumberMigration
```

Call from frontend or Firebase console.

---

## Quick Setup for Local Execution

**Steps:**

1. Get service account key from Firebase Console
2. Save it securely (add to .gitignore!)
3. Set `GOOGLE_APPLICATION_CREDENTIALS` environment variable
4. Run migration

**Example:**

```bash
# In functions directory
cd functions

# Set credentials
export GOOGLE_APPLICATION_CREDENTIALS="$(pwd)/service-account-key.json"

# Run dry-run
npx ts-node src/migrations/renumberProjectNumbers.ts --dry-run

# Review output
cat ../migration-output/project-renumber-*.json

# Apply if all looks good
npx ts-node src/migrations/renumberProjectNumbers.ts --apply
```

---

## Security Note

**NEVER commit service account keys to git!**

Add to `.gitignore`:
```
functions/service-account-key.json
functions/*-service-account-*.json
```

The migration script is ready, but requires proper Firebase authentication to execute.



