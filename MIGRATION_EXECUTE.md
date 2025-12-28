# How to Execute the Project Number Migration

The migration Cloud Function has been deployed successfully. Here are your options to execute it:

---

## ✅ Option 1: Firebase Console (Easiest)

1. **Go to Firebase Console:**
   https://console.firebase.google.com/project/reportingapp817/functions/logs

2. **Navigate to Functions:**
   - Click "Functions" in left sidebar
   - Find `runProjectNumberMigration` in the list

3. **Test the function:**
   - Click on the function name
   - Go to "Testing" tab
   - Enter request data:

**Dry Run:**
```json
{
  "dryRun": true
}
```

**Apply (actual migration):**
```json
{
  "dryRun": false
}
```

**Single tenant:**
```json
{
  "dryRun": true,
  "tenantId": "YOUR_TENANT_ID"
}
```

4. **Click "Run Function"**

5. **View Results** in the output panel

---

## ✅ Option 2: From Your Web App (Recommended)

Add a button in your admin UI that calls the function.

**Example code for ProjectManagement or Settings page:**

```typescript
import { httpsCallable } from 'firebase/functions';
import { functionsEU } from '@/config/firebase';

const runMigration = async (dryRun: boolean) => {
  try {
    const migrateFunction = httpsCallable(functionsEU, 'runProjectNumberMigration');
    const result = await migrateFunction({ dryRun });
    
    const data = result.data as any;
    
    console.log('Migration result:', data);
    
    toast({
      title: dryRun ? '✅ Dry Run Complete' : '✅ Migration Complete',
      description: `Migrated ${data.toMigrate} projects`
    });
    
    return data;
  } catch (error: any) {
    console.error('Migration error:', error);
    
    toast({
      title: '❌ Migration Failed',
      description: error.message,
      variant: 'destructive'
    });
    
    throw error;
  }
};

// In your JSX:
<Button onClick={() => runMigration(true)}>
  Run Dry Run
</Button>

<Button onClick={() => runMigration(false)}>
  Apply Migration
</Button>
```

---

## ✅ Option 3: curl Command

If you have an ID token, you can call it via curl:

```bash
# Get your ID token from browser dev tools:
# 1. Open web app logged in as admin
# 2. Open dev tools console
# 3. Run: firebase.auth().currentUser.getIdToken()

curl -X POST \
  https://europe-west1-reportingapp817.cloudfunctions.net/runProjectNumberMigration \
  -H "Authorization: Bearer YOUR_ID_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"data":{"dryRun":true}}'
```

---

## 🎯 Recommended Approach

**I recommend Option 1 (Firebase Console) for first execution:**

1. Go to Firebase Console
2. Navigate to Functions
3. Find `runProjectNumberMigration`
4. Test tab → Enter: `{"dryRun": true}`
5. Click "Run Function"
6. Review results
7. If all looks good, run again with: `{"dryRun": false}`

---

## 📊 Expected Response

**Success:**
```json
{
  "success": true,
  "dryRun": false,
  "totalProjects": 150,
  "alreadyMigrated": 30,
  "toMigrate": 120,
  "mappings": [...], // First 10 mappings
  "errors": [],
  "relatedCollectionsUpdated": {
    "documents": 45,
    "reports": 89,
    "tasks": 23,
    "materials": 12,
    "aufmass": 15
  }
}
```

**With Errors:**
```json
{
  "success": false,
  "errors": [
    {
      "projectId": "abc123",
      "error": "Group tenant1_0AA0 has 105 projects, exceeds limit"
    }
  ]
}
```

---

## 🔍 View Function Logs

**During and after execution:**

1. Go to: https://console.firebase.google.com/project/reportingapp817/functions/logs
2. Filter by: `runProjectNumberMigration`
3. Watch real-time progress

**Example logs:**
```
[1/5] Collecting projects...
Collected: 120 to migrate, 30 already migrated
[2/5] Allocating project numbers...
Allocated 120 project numbers
[3/5] Applying migration...
Batch 1 committed
[4/5] Updating related collections...
Updated related collections: { documents: 45, reports: 89, tasks: 23, materials: 12, aufmass: 15 }
[5/5] Verifying...
Verification passed
```

---

## ⏱️ Execution Time

- **Dry Run:** ~10-30 seconds
- **Apply:** ~1-3 minutes (depends on project count)

Function has 9 minute timeout, so even large datasets should complete.

---

## 🎉 Ready to Execute

The Cloud Function is deployed and ready. Choose your preferred method above and execute the migration!

**Start with dry-run first to review the changes before applying.**



