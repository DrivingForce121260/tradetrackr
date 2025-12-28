# 🔍 TaskBoard Project Number Debugging

## ✅ Debug Build Ready

I've added detailed console logging to help identify why the Kanban task cards are showing incorrect project numbers.

---

## 🎯 How to Debug

### **Step 1: Open Your Browser**
1. Navigate to your TradeTrackr web portal
2. Open **Developer Tools** (F12 or Right-click → Inspect)
3. Go to the **Console** tab

### **Step 2: Navigate to Kanban**
1. Go to: **Aufgaben → Kanban**
2. Watch the console logs

---

## 📊 What to Look For in Console

### **Log 1: Project Loading**
```
[TaskBoard] Loaded projects: [{
  id: "abc123",
  projectNumber: "PN-0AA012",  // <-- What is this showing?
  projectNumber_type: "string"  // <-- Is it "string" or "number"?
}, ...]
```

**Check:**
- ✅ Are `projectNumber` values in the new `PN-??????` format?
- ✅ Or are they still old numbers like `12345`?
- ✅ Is `projectNumber_type` showing as `"string"` or `"number"`?

### **Log 2: Task to Project Matching**
```
[TaskBoard] Task: "task123" Project found: {
  projectId: "abc123",
  projectNumber: "PN-0AA012",  // <-- Does this match what's displayed?
  projectNumber_type: "string"
}
```

**Check:**
- ✅ Is the correct project being found for each task?
- ✅ Does `projectNumber` here match what you expect?

### **Log 3: Final Display Value**
```
[TaskBoard] Displaying projectNumber: "PN-0AA012" for task: "Install Electrical"
```

**Check:**
- ✅ What value is actually being passed to the card?
- ✅ Does it match what's shown on the UI?

---

## 🐛 Possible Issues & Solutions

### **Issue 1: Projects Still Have Old Numbers**
**Logs show:** `projectNumber: 12345` or `projectNumber: "12345"`

**Solution:** The migration might not have run successfully. Run it from:
- Settings → Migration → Dry Run → Apply

---

### **Issue 2: projectNumber is undefined**
**Logs show:** `projectNumber: undefined`

**Solution:** The `projectNumber` field might not exist in Firestore. Check:
1. Go to Firebase Console → Firestore
2. Look at a `projects` document
3. Check if `projectNumber` field exists

---

### **Issue 3: Wrong Project Matched**
**Logs show:** `No project found for task: task123 projectId: abc123`

**Solution:** The `task.projectId` doesn't match any `project.id`. This means:
- Task references a project that no longer exists
- Task has incorrect `projectId` field

---

### **Issue 4: Correct Project, Wrong Display**
**Logs show correct projectNumber but card shows wrong value**

**Solution:** There might be React state caching. Try:
1. Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
2. Clear browser cache
3. Check if `projectNumber` is being overwritten somewhere

---

## 📝 What to Report Back

Please share:

1. **What the console logs show** for:
   - `[TaskBoard] Loaded projects:`
   - `[TaskBoard] Task:` (for 1-2 example tasks)
   - `[TaskBoard] Displaying projectNumber:`

2. **What the UI actually displays** on the cards

3. **Screenshot if possible** showing:
   - Console logs
   - Task card with incorrect number

---

## 🔧 Quick Fixes to Try

### **Fix 1: Hard Refresh**
```
Ctrl+Shift+R (Windows/Linux)
Cmd+Shift+R (Mac)
```

### **Fix 2: Clear Site Data**
1. F12 → Application tab
2. Clear Storage → Clear site data
3. Refresh page

### **Fix 3: Re-run Migration**
1. Settings → Migration
2. Run Dry Run
3. If it shows projects to migrate, run Apply

---

**Once you check the console logs, let me know what you see and I'll provide the exact fix!** 🔍



