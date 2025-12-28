# Category Type 2 Debug Instructions

## ✅ Diagnostic Function Deployed

The diagnostic function `debugCategoryType2` is now deployed and ready to use.

---

## 🔍 How to Run Diagnostics

### Option 1: Using Browser Console

1. Open TradeTrackr in your browser
2. Open Developer Console (F12)
3. Go to the Console tab
4. Run this code:

```javascript
// Import the functions module
const { getFunctions, httpsCallable } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-functions.js');
const functions = getFunctions();

// Call diagnostic for Cables
const debugFn = httpsCallable(functions, 'debugCategoryType2');
const cablesResult = await debugFn({ categoryName: 'Cables' });
console.log('=== CABLES DIAGNOSTIC ===');
console.log(JSON.stringify(cablesResult.data, null, 2));

// Call diagnostic for Parts
const partsResult = await debugFn({ categoryName: 'Parts' });
console.log('=== PARTS DIAGNOSTIC ===');
console.log(JSON.stringify(partsResult.data, null, 2));
```

### Option 2: Using the Diagnostic Component

I've created a React component at `src/components/CategoryType2Diagnostic.tsx`.

To use it:

1. Add it to your Categories page temporarily:

```typescript
// In Categories.tsx, add import at top:
import CategoryType2Diagnostic from './CategoryType2Diagnostic';

// Add component somewhere in the render (e.g., at the top):
<CategoryType2Diagnostic />
```

2. Refresh the page
3. Enter "Cables" → Click "Diagnose starten"
4. Copy the results
5. Enter "Parts" → Click "Diagnose starten"
6. Copy the results
7. Compare the two

---

## 📊 What to Look For

### Family Data Comparison

Compare these fields:
```json
{
  "familyId": "...",      // Should be consistent
  "familyName": "...",    // Should match category name
  "level0": "...",        // Characteristic 1 name
  "level1": "...",        // Characteristic 2 name
  "level2": "...",        // Characteristic 3 name
  "concernId": "..."      // Should match
}
```

**Questions:**
- Do both have level0, level1, level2 defined?
- Are the values meaningful or placeholder?

### Options Statistics Comparison

```json
{
  "total": 150,           // Total number of options
  "byLevel": {
    "1": 50,              // Should be roughly equal
    "2": 50,              // Should be roughly equal
    "3": 50               // Should be roughly equal
  },
  "byOrder": {
    "1": 3,               // Each order should have 3 options (one per level)
    "2": 3,
    "3": 3
  },
  "missingValues": 0,     // Should be 0
  "duplicateOrderLevel": [] // Should be empty
}
```

**Red Flags:**
- ❌ Unbalanced level counts (e.g., L1=50, L2=10, L3=5)
- ❌ Missing values > 0
- ❌ Duplicate order+level combinations
- ❌ Orders not having 3 options each

### Issues Array

Will list specific problems found:
```json
{
  "issues": [
    "Missing level definitions (level0, level1, level2) in family document",
    "Unbalanced level counts: L1=50, L2=10, L3=5",
    "Found 5 duplicate order+level combinations"
  ]
}
```

### Recommendations Array

Will suggest fixes:
```json
{
  "recommendations": [
    "Add level0, level1, level2 fields to lookupFamilies document",
    "Each order should have options at all 3 levels",
    "Each order+level combination should be unique"
  ]
}
```

---

## 🎯 Next Steps After Running Diagnostics

1. **Copy the full output** for both Cables and Parts
2. **Compare side-by-side** to identify differences
3. **Share the results** so I can:
   - Identify the exact root cause
   - Create a targeted fix (code or data migration)
   - Ensure Cables remains unchanged

---

## 📝 Quick Comparison Checklist

Run diagnostics for both categories and fill this in:

### Cables (Correct)
- [ ] Total options: _____
- [ ] Level 1 count: _____
- [ ] Level 2 count: _____
- [ ] Level 3 count: _____
- [ ] Missing values: _____
- [ ] Duplicates: _____
- [ ] Issues found: _____

### Parts (Incorrect)
- [ ] Total options: _____
- [ ] Level 1 count: _____
- [ ] Level 2 count: _____
- [ ] Level 3 count: _____
- [ ] Missing values: _____
- [ ] Duplicates: _____
- [ ] Issues found: _____

### Key Differences
- [ ] What's different in family data?
- [ ] What's different in options stats?
- [ ] What issues are unique to Parts?

---

## 🚀 Status

- ✅ Diagnostic function deployed
- ✅ React component created
- ⏳ Awaiting diagnostic results from user

Once you provide the diagnostic output, I can implement the precise fix needed.






