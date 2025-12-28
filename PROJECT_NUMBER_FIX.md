# ✅ Project Number Storage Fix

## 🐛 Problem

Categories were being stored with the wrong project identifier:
- **Expected:** Store actual `projectNumber` (e.g., 12345) when a project is selected
- **Expected:** Store `'FFFFF'` when NO project is selected (general category)
- **Actual:** Was storing project `id` (Firestore document ID) instead of `projectNumber`
- **Actual:** Was storing `'Fs'` for general categories instead of `'FFFFF'`

---

## ✅ Solution

### 1. **Project Dropdown - Store projectNumber**

**Changed from storing project ID to storing projectNumber:**

#### Type 1 Form:
```tsx
// BEFORE: Stored project.id
<option key={project.id} value={project.id}>
  {project.projectName} ({project.id})
</option>

// AFTER: Stores project.projectNumber
<option key={project.id} value={String(project.projectNumber || project.id)}>
  {project.projectName} {project.projectNumber ? `(${project.projectNumber})` : `(${project.id})`}
</option>
```

#### Type 2 Form:
Same change applied to the Type 2 project selection dropdown.

**OnChange Handler:**
```tsx
// BEFORE: Found project by id
const project = allProjects.find(p => p.id === e.target.value);

// AFTER: Finds project by projectNumber
const project = allProjects.find(p => String(p.projectNumber) === e.target.value);
```

---

### 2. **Category Creation - Use projectNumber or 'FFFFF'**

#### Type 1 Creation:
```tsx
// BEFORE:
const projectId = isProjectSpecific && selectedProjectId ? selectedProjectId : 'Fs';

// AFTER:
const projectId = isProjectSpecific && selectedProjectId ? selectedProjectId : 'FFFFF';
```

**Result:**
- If project selected → `projectId = "12345"` (the actual project number)
- If no project → `projectId = "FFFFF"` (general category marker)

#### Type 2 Creation:
Same logic applied to Type 2 category creation.

---

### 3. **Helper Functions - Default to 'FFFFF'**

#### `createType1Category`:
```tsx
// BEFORE:
projectId: projectId || 'Fs'

// AFTER:
projectId: projectId || 'FFFFF'
```

#### `createType2Category`:
```tsx
// BEFORE:
projectId: projectId || 'Fs'

// AFTER:
projectId: projectId || 'FFFFF'
```

---

### 4. **Project Filter - Use 'FFFFF' and projectNumber**

#### Filter Logic:
```tsx
// BEFORE:
cat.projectId === 'Fs'

// AFTER:
cat.projectId === 'FFFFF'
```

#### Filter Dropdown:
```tsx
// BEFORE:
<SelectItem value="Fs">📋 Nur allgemeine Kategorien</SelectItem>
{allProjects.map(project => (
  <SelectItem key={project.id} value={project.id}>
    {project.projectName}
  </SelectItem>
))}

// AFTER:
<SelectItem value="FFFFF">📋 Nur allgemeine Kategorien</SelectItem>
{allProjects.map(project => (
  <SelectItem key={project.id} value={String(project.projectNumber || project.id)}>
    {project.projectName} {project.projectNumber ? `(${project.projectNumber})` : ''}
  </SelectItem>
))}
```

---

### 5. **Category Display - Show projectNumber**

#### Project Badge on Cards:
```tsx
// BEFORE:
{category.projectId && category.projectId !== 'Fs' && (
  <div>
    <span>🏗️ Projekt:</span>
    <span>{getProjectName(category.projectId)}</span>
  </div>
)}

// AFTER:
{category.projectId && category.projectId !== 'FFFFF' && (
  <div>
    <span>🏗️ Projekt:</span>
    <span>{category.projectId}</span>
  </div>
)}
```

**Result:**
- Shows the actual project number (e.g., "12345") instead of project name
- Only shows for project-specific categories (not for 'FFFFF')

---

## 📊 Data Flow

### Creating a Project-Specific Category

```
User selects project "Neubau Bürogebäude (12345)"
         ↓
selectedProjectId = "12345" (projectNumber)
         ↓
Category created with projectId: "12345"
         ↓
Stored in Firestore:
{
  familyId: "Elektroinstallation",
  projectId: "12345",  ← Project number
  concernId: "IvLgYIT0...",
  ...
}
         ↓
Displayed on card:
🏗️ Projekt: 12345
```

### Creating a General Category

```
User selects "Nein, allgemein"
         ↓
isProjectSpecific = false
selectedProjectId = ""
         ↓
projectId = "FFFFF"
         ↓
Category created with projectId: "FFFFF"
         ↓
Stored in Firestore:
{
  familyId: "Allgemeine Werkzeuge",
  projectId: "FFFFF",  ← General category marker
  concernId: "IvLgYIT0...",
  ...
}
         ↓
No project badge shown on card
```

---

## 🔍 Filtering Logic

### Filter by Specific Project

```
User selects "Neubau Bürogebäude (12345)" in filter
         ↓
projectFilter = "12345"
         ↓
Shows categories where:
- projectId === "12345" (project-specific)
- projectId === "FFFFF" (general categories)
- !projectId (legacy categories without projectId)
```

### Filter by General Categories Only

```
User selects "📋 Nur allgemeine Kategorien"
         ↓
projectFilter = "FFFFF"
         ↓
Shows categories where:
- projectId === "FFFFF" (general categories)
- !projectId (legacy categories without projectId)
```

---

## 📁 Files Changed

### 1. `src/components/Categories.tsx`

**Changes:**
- ✅ Project dropdown: Store `projectNumber` instead of `id`
- ✅ Project dropdown: Find project by `projectNumber` in onChange
- ✅ Category creation: Use `'FFFFF'` instead of `'Fs'` for general categories
- ✅ Filter logic: Use `'FFFFF'` instead of `'Fs'`
- ✅ Filter dropdown: Use `projectNumber` for options, `'FFFFF'` for general
- ✅ Category display: Show `projectId` (which is now projectNumber) directly

**Lines Modified:**
- Type 1 dropdown: ~2620-2638
- Type 2 dropdown: ~3176-3194
- Type 1 creation: ~1129
- Type 2 creation: ~1593
- Filter logic: ~2292, ~4580
- Filter dropdown: ~4541-4544
- Display badge: ~4723-4727

### 2. `src/utils/categoryCreationHelpers.ts`

**Changes:**
- ✅ `createType1Category`: Default to `'FFFFF'` instead of `'Fs'`
- ✅ `createType2Category`: Default to `'FFFFF'` instead of `'Fs'`

**Lines Modified:**
- Line 57: Type 1 default
- Line 116: Type 2 default

---

## 🎯 Expected Behavior

### Scenario 1: Create Project-Specific Category

**Steps:**
1. Click "Neue Kategorie"
2. Select Type 1 or Type 2
3. Select "Ja, projektspezifisch"
4. Choose project "Neubau Bürogebäude (12345)"
5. Fill in category details
6. Click "Kategorie erstellen"

**Expected Result:**
```
Firestore lookupFamilies document:
{
  projectId: "12345"  ← Project number stored
}

Category card displays:
🏗️ Projekt: 12345
```

### Scenario 2: Create General Category

**Steps:**
1. Click "Neue Kategorie"
2. Select Type 1 or Type 2
3. Select "Nein, allgemein"
4. Fill in category details
5. Click "Kategorie erstellen"

**Expected Result:**
```
Firestore lookupFamilies document:
{
  projectId: "FFFFF"  ← General category marker
}

Category card:
No project badge shown
```

### Scenario 3: Filter by Project

**Steps:**
1. Open Categories page
2. In "Filter & Suche", select project "Neubau Bürogebäude (12345)"

**Expected Result:**
- Shows categories with `projectId: "12345"`
- Shows categories with `projectId: "FFFFF"` (general)
- Hides categories with other project numbers

### Scenario 4: Filter by General Only

**Steps:**
1. Open Categories page
2. In "Filter & Suche", select "📋 Nur allgemeine Kategorien"

**Expected Result:**
- Shows only categories with `projectId: "FFFFF"`
- Shows legacy categories without `projectId`
- Hides all project-specific categories

---

## 🔄 Migration Notes

### Existing Categories with 'Fs'

**Issue:**
- Old categories may have `projectId: "Fs"` in Firestore
- These won't be recognized as general categories

**Solution Options:**

1. **Manual Migration (Recommended):**
   ```js
   // Run in Firestore console or migration script
   db.collection('lookupFamilies')
     .where('projectId', '==', 'Fs')
     .get()
     .then(snapshot => {
       snapshot.forEach(doc => {
         doc.ref.update({ projectId: 'FFFFF' });
       });
     });
   ```

2. **Backward Compatibility (Temporary):**
   - Add `cat.projectId === 'Fs'` to filter logic alongside `'FFFFF'`
   - Keep for transition period
   - Remove after migration complete

---

## ✅ Testing Checklist

### Create Categories
- [ ] Create Type 1 with project → Check Firestore has `projectId: "12345"`
- [ ] Create Type 1 without project → Check Firestore has `projectId: "FFFFF"`
- [ ] Create Type 2 with project → Check Firestore has `projectId: "12345"`
- [ ] Create Type 2 without project → Check Firestore has `projectId: "FFFFF"`

### Display Categories
- [ ] Project-specific category shows badge with project number
- [ ] General category (FFFFF) shows no badge
- [ ] Badge displays actual number (e.g., "12345"), not name

### Filter Categories
- [ ] Filter by specific project → Shows project + general categories
- [ ] Filter "Nur allgemeine" → Shows only FFFFF categories
- [ ] Filter "Alle Projekte" → Shows all categories
- [ ] All filters work together (search + status + project)

### Project Dropdown
- [ ] Dropdown shows project names with numbers in parentheses
- [ ] Selecting project stores projectNumber, not id
- [ ] Confirmation message shows correct project name

---

## 🎉 Result

**Before:**
```
❌ Stored: projectId: "abc123xyz" (Firestore document ID)
❌ Stored: projectId: "Fs" (for general)
❌ Displayed: "Neubau Bürogebäude" (project name)
```

**After:**
```
✅ Stored: projectId: "12345" (actual project number)
✅ Stored: projectId: "FFFFF" (for general)
✅ Displayed: "12345" (project number)
```

---

**Status:** ✅ **Fixed and Ready to Test**

All project-related storage and display now uses `projectNumber` instead of Firestore document IDs, and general categories are marked with `'FFFFF'` instead of `'Fs'`.






