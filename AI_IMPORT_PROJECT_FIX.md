# ✅ AI Import Project Number Fix

## 🐛 Problem Identified

**Root Cause:** The AI Import path was **NOT** passing the `projectId` parameter when creating categories!

From your console logs:
```
[AI Import] Calling analysis function with: {
  filePath: '...',
  userId: '...',
  projectId: 'DE689E0F2D'  ← This is concernID, not projectNumber!
}
```

The AI Import has **3 different code paths**, and NONE of them were passing the project selection:

1. **CSV Reconstruction Path** (line ~1500)
2. **Type 1 Conversion Path** (line ~1566)
3. **Normal Type 2 Commit Path** (line ~1616) - calls Cloud Function

---

## ✅ Solution Applied

### Path 1: CSV Reconstruction (Type 2)

**Location:** `handleAICommit` - CSV with attributes reconstruction

**Before:**
```tsx
const result = await createType2Category({
  title: aiCategoryName.trim(),
  characteristic1: char1,
  characteristic2: char2,
  characteristic3: char3,
  items: items,
  concernId: user?.concernID || 'default-concern'
  // ❌ Missing projectId!
});
```

**After:**
```tsx
// Determine projectId based on user selection
const projectId = isProjectSpecific && selectedProjectId ? selectedProjectId : 'FFFFF';
console.log('[handleAICommit - Reconstruction] Project selection:', { isProjectSpecific, selectedProjectId, projectId });

const result = await createType2Category({
  title: aiCategoryName.trim(),
  characteristic1: char1,
  characteristic2: char2,
  characteristic3: char3,
  items: items,
  concernId: user?.concernID || 'default-concern',
  projectId: projectId  // ✅ Added!
});
```

---

### Path 2: Type 1 Conversion

**Location:** `handleAICommit` - Convert simple list to Type 1

**Before:**
```tsx
const result = await createType1Category({
  title: aiCategoryName.trim(),
  content: content,
  concernId: user?.concernID || 'default-concern'
  // ❌ Missing projectId!
});
```

**After:**
```tsx
// Determine projectId based on user selection
const projectId = isProjectSpecific && selectedProjectId ? selectedProjectId : 'FFFFF';
console.log('[handleAICommit - Type1 Conversion] Project selection:', { isProjectSpecific, selectedProjectId, projectId });

const result = await createType1Category({
  title: aiCategoryName.trim(),
  content: content,
  concernId: user?.concernID || 'default-concern',
  projectId: projectId  // ✅ Added!
});
```

---

### Path 3: Normal Type 2 Commit (Cloud Function)

**Location:** `handleAICommit` - Normal commit via Cloud Function

**Before:**
```tsx
const result = await aiCategory2Commit({
  jobId: aiJobId,
  applyMode: aiUpdateExisting ? 'upsert' : 'insertOnly',
  concernID: user?.concernID,
  categoryName: aiCategoryName.trim(),
  // ❌ Missing projectNumber!
});
```

**After:**
```tsx
// Determine projectId based on user selection
const projectId = isProjectSpecific && selectedProjectId ? selectedProjectId : 'FFFFF';
console.log('[handleAICommit - Normal Commit] Project selection:', { isProjectSpecific, selectedProjectId, projectId });

const result = await aiCategory2Commit({
  jobId: aiJobId,
  applyMode: aiUpdateExisting ? 'upsert' : 'insertOnly',
  concernID: user?.concernID,
  categoryName: aiCategoryName.trim(),
  projectNumber: projectId,  // ✅ Added!
} as any);
```

**Note:** This also requires updating the Cloud Function `aiCategory2Commit` to accept and use the `projectNumber` parameter.

---

## 📊 Data Flow - AI Import

### Before Fix

```
User selects project → isProjectSpecific = true, selectedProjectId = "12345"
    ↓
AI Import uploads file
    ↓
AI analyzes file
    ↓
User clicks "Übernehmen"
    ↓
handleAICommit() called
    ↓
createType2Category({
  title: "DataSet1",
  // ... other params
  // ❌ NO projectId passed!
})
    ↓
categoryCreationHelpers.ts
    ↓
projectNumber: projectId || 'FFFFF'  // projectId is undefined
    ↓
Firestore: { projectNumber: "FFFFF" }  ❌ Default value
```

### After Fix

```
User selects project → isProjectSpecific = true, selectedProjectId = "12345"
    ↓
AI Import uploads file
    ↓
AI analyzes file
    ↓
User clicks "Übernehmen"
    ↓
handleAICommit() called
    ↓
const projectId = isProjectSpecific && selectedProjectId ? selectedProjectId : 'FFFFF';
// projectId = "12345" ✅
    ↓
createType2Category({
  title: "DataSet1",
  // ... other params
  projectId: "12345"  // ✅ Passed!
})
    ↓
categoryCreationHelpers.ts
    ↓
projectNumber: projectId || 'FFFFF'  // projectId = "12345"
    ↓
Firestore: { projectNumber: "12345" }  ✅ Correct value!
```

---

## 🔧 Files Modified

### `src/components/Categories.tsx`

**Changes:**

1. **Line ~1498-1507:** CSV Reconstruction path - Added projectId
2. **Line ~1566-1570:** Type 1 Conversion path - Added projectId
3. **Line ~1604-1621:** Normal Commit path - Added projectNumber to Cloud Function call

**Total Lines Added:** ~15 lines (3 locations × ~5 lines each)

---

## 🧪 Testing Instructions

### Test 1: AI Import with Project

**Steps:**
1. Open Categories page
2. Click "Neue Kategorie"
3. Select Type 2
4. Select "Ja, projektspezifisch"
5. Choose a project (e.g., project number 12345)
6. Click "AI-Import"
7. Upload a CSV/Excel file
8. Wait for analysis
9. Click "Übernehmen"

**Expected Console Logs:**
```
[handleAICommit - Reconstruction] Project selection: {
  isProjectSpecific: true,
  selectedProjectId: "12345",
  projectId: "12345"
}
```

**Expected Firestore:**
```javascript
// lookupFamilies document
{
  familyName: "YourCategoryName",
  projectNumber: "12345",  // ✅ Should be the project number
  concernId: "...",
  level0: "...",
  level1: "...",
  level2: "..."
}
```

**Expected Display:**
```
Category card shows:
🏗️ Projekt: 12345
```

---

### Test 2: AI Import without Project

**Steps:**
1. Open Categories page
2. Click "Neue Kategorie"
3. Select Type 2
4. Select "Nein, allgemein"
5. Click "AI-Import"
6. Upload a CSV/Excel file
7. Wait for analysis
8. Click "Übernehmen"

**Expected Console Logs:**
```
[handleAICommit - Reconstruction] Project selection: {
  isProjectSpecific: false,
  selectedProjectId: "",
  projectId: "FFFFF"
}
```

**Expected Firestore:**
```javascript
// lookupFamilies document
{
  familyName: "YourCategoryName",
  projectNumber: "FFFFF",  // ✅ General category marker
  concernId: "...",
  level0: "...",
  level1: "...",
  level2: "..."
}
```

**Expected Display:**
```
Category card shows:
(no project badge)
```

---

## ⚠️ Known Issue: Cloud Function Path

**Path 3 (Normal Type 2 Commit)** calls a Cloud Function `aiCategory2Commit`.

**Current Status:**
- ✅ Frontend now sends `projectNumber` parameter
- ❌ Cloud Function needs to be updated to:
  1. Accept `projectNumber` parameter
  2. Store it in Firestore `lookupFamilies` document

**Cloud Function Location:** `functions/src/categoryImport.ts`

**Required Change:**
```typescript
// In aiCategory2Commit function
export const aiCategory2Commit = onCall(async (request) => {
  const { jobId, applyMode, concernID, categoryName, projectNumber } = request.data;
  
  // When creating lookupFamilies document:
  const familyData = {
    concernId: concernID,
    familyId: categoryName,
    familyName: categoryName,
    projectNumber: projectNumber || 'FFFFF',  // ✅ Add this
    // ... other fields
  };
});
```

**Note:** This Cloud Function update is needed for the "normal commit" path to work correctly. The other two paths (CSV reconstruction and Type 1 conversion) are already fixed.

---

## 📋 Summary

### What Was Fixed

1. ✅ **CSV Reconstruction Path** - Now passes projectId
2. ✅ **Type 1 Conversion Path** - Now passes projectId
3. ⚠️ **Normal Commit Path** - Frontend sends projectNumber, but Cloud Function needs update

### What Works Now

- ✅ AI Import with CSV files (reconstruction path)
- ✅ AI Import with simple lists (Type 1 conversion)
- ⚠️ AI Import with normal Type 2 (needs Cloud Function update)

### Next Step

**Update Cloud Function** `aiCategory2Commit` in `functions/src/categoryImport.ts` to:
1. Accept `projectNumber` parameter from request
2. Store it in `lookupFamilies` document

---

**Status:** ✅ **Frontend Fixed - Cloud Function Update Pending**

The AI Import will now correctly pass the project number, but the Cloud Function needs to be updated to store it.






