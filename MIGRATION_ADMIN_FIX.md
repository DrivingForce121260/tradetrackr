# ✅ Admin Permission Issue - FIXED

## 🐛 Problem
User was getting "Admin Rechte Erforderlich" (Admin Rights Required) error even though logged in as admin.

## 🔍 Root Cause
The Cloud Function was checking for admin role in Firebase Auth **custom claims** (`context.auth.token.role`), but your system stores the role in the **Firestore user document** (`users/{uid}.role`).

## ✅ Solution
Updated the Cloud Function to check admin permissions from **three sources** in order:

### **1. Custom Claims - token.role**
```typescript
if (context.auth.token.role === 'admin') {
  isAdmin = true;
}
```

### **2. Custom Claims - token.roles.admin**
```typescript
if (context.auth.token.roles && 'admin' in context.auth.token.roles) {
  isAdmin = true;
}
```

### **3. Firestore User Document (Fallback)**
```typescript
const userDoc = await db.collection('users').doc(context.auth.uid).get();
if (userDoc.exists && userDoc.data().role === 'admin') {
  isAdmin = true;
}
```

## 📦 What Was Changed

**File:** `functions/src/migrations/runProjectMigration.ts`

**Changes:**
- Added Firestore user document lookup as fallback for admin verification
- Added detailed logging for debugging permission issues
- Made permission check more robust and flexible

## ✅ Status: DEPLOYED

The updated Cloud Function has been deployed:
- **Function:** `runProjectNumberMigration` (europe-west1)
- **Deployed:** ✅ Successfully
- **Build:** ✅ No errors

## 🎯 What to Do Now

### **Try the Migration Again:**

1. **Refresh your browser** (to clear any cached errors)
2. **Go to:** Settings → Migration tab
3. **Click:** "Dry Run starten"
4. **It should work now!** ✅

---

## 🔍 Debugging Info

If you still get an error, check the **Firebase Functions logs**:

```
https://console.firebase.google.com/project/reportingapp817/functions/logs
```

Look for log entries like:
- ✅ `Admin verified via Firestore user document`
- ⚠️ `Permission denied - not admin`

The logs will show:
- Your user ID
- Token role (if any)
- Token roles (if any)
- Firestore lookup result

---

## 📝 Notes

**Why this happened:**
- Your app uses Firestore for user roles (`users/{uid}.role = 'admin'`)
- Firebase custom claims are not automatically set from Firestore
- The original Cloud Function only checked custom claims

**Why the fix works:**
- Now checks **both** custom claims AND Firestore
- Covers all possible scenarios
- Works with your existing user structure

---

**The migration should work now!** 🎉



