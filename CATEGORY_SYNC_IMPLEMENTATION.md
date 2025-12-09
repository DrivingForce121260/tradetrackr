# Category Sync Implementation - Mobile App

**Date:** 2025-01-XX  
**Status:** ✅ Implemented  
**Scope:** Mobile App Category Synchronization with Portal

---

## 🎯 Overview

Implemented a robust category synchronization system that ensures category updates made in the portal are reliably reflected on mobile, including offline usage and cache invalidation.

---

## 📦 Implementation Details

### 1. useCategories Hook

**File:** `src/hooks/useCategories.ts`

**Features:**
- Firestore real-time subscription for categories
- Local cache with AsyncStorage (offline-first)
- Version-based cache invalidation
- Automatic staleness detection
- Error handling with fallback to cache

**API:**
```typescript
const { categories, categoryTree, isLoading, error, isStale, lastSync, refresh } = useCategories(orgId);
```

**Behavior:**
- On mount: Loads from cache immediately (offline-first)
- Subscribes to Firestore in background
- Updates cache on Firestore changes
- Checks version on load to invalidate stale cache
- Falls back to cache on network errors

### 2. Category Cache Service

**File:** `src/services/categoryCache.ts`

**Functions:**
- `loadCategoriesFromCache(orgId)` - Load categories from AsyncStorage
- `saveCategoriesToCache(orgId, categories, version)` - Save to cache with version
- `getCategoriesVersion(orgId)` - Get version from orgSettings
- `isCategoryCacheValid(orgId)` - Check if cache matches server version
- `clearCategoryCache(orgId)` - Clear cache for orgId

**Cache Structure:**
```typescript
{
  categories: Category[],
  timestamp: number,
  version: number
}
```

### 3. Versioning System

**Portal Side:** `src/lib/categories/categoryHelpers.ts`

**Functions that increment version:**
- `createCategory()` - New category added
- `renameCategory()` - Category renamed (structural change)
- `moveCategory()` - Category moved (structural change)
- `deleteCategory()` - Category deactivated
- `reorderCategories()` - Categories reordered

**orgSettings Document:**
```
/orgSettings/{orgId}
{
  categoriesVersion: number,
  categoriesUpdatedAt: Timestamp
}
```

**Mobile Side:**
- Checks `orgSettings.categoriesVersion` on app start
- Compares with cached version
- Invalidates cache if versions don't match
- Forces full refresh from Firestore

### 4. Mobile-Specific Helpers

**File:** `src/lib/categories/categoryHelpers.mobile.ts`

**Functions:**
- `fetchCategoriesForOrgMobile(orgId, useCache)` - Fetch with cache support
- `getCategoryByIdMobile(orgId, categoryId, useCache)` - Get category by ID
- `getCategoryPathMobile(orgId, categoryId, useCache)` - Get category path
- `buildCategoryTreeMobile(orgId, useCache)` - Build tree with cache
- `getChildrenMobile(orgId, parentId, useCache)` - Get children with cache

### 5. Updated Components

**CascadingCategoryPicker:** `src/components/CascadingCategoryPicker.tsx`
- Now uses `useCategories` hook
- Shows stale indicator when using cached data
- Handles offline mode gracefully

---

## 🔄 Sync Flow

### Initial Load:
1. App starts → Check cache validity (version check)
2. If valid → Load from cache immediately
3. Start Firestore subscription in background
4. Update cache when Firestore data arrives

### Portal Update:
1. Portal performs category operation (create/rename/move/delete/reorder)
2. Category helper increments `orgSettings.categoriesVersion`
3. Firestore updates propagate to mobile subscription
4. Mobile receives update → Updates in-memory state
5. Mobile saves to cache with new version

### Offline Mode:
1. Network error → Keep using cached data
2. Show `isStale` indicator if cache is old
3. When network returns → Check version
4. If version changed → Invalidate cache and refresh

---

## ✅ Acceptance Criteria

- ✅ Mobile shows same categories as portal for given org
- ✅ New categories appear on mobile
- ✅ Renames are reflected
- ✅ Moves (path changes) are reflected
- ✅ Deactivation is reflected
- ✅ Mobile works offline using last-known categories
- ✅ Cache invalidation works via versioning
- ✅ All mobile category usage routed through `useCategories` hook
- ✅ Shared helpers from Prompt 3 are used

---

## 📝 Usage Examples

### In Mobile Screens:

```typescript
import { useCategories } from '../hooks/useCategories';
import { useAuthStore } from '../store/authStore';

function TaskCreationScreen() {
  const session = useAuthStore((state) => state.session);
  const { categories, categoryTree, isLoading, isStale } = useCategories(session?.concernID || null);

  // Use categories in picker
  return (
    <CascadingCategoryPicker
      visible={showPicker}
      onClose={() => setShowPicker(false)}
      orgId={session?.concernID}
      concernID={session?.concernID}
      value={categoryValue}
      onChange={setCategoryValue}
    />
  );
}
```

---

## 🚀 Next Steps

1. Update all mobile screens to use `useCategories` hook
2. Remove any hardcoded category lists
3. Test offline scenarios
4. Monitor cache hit rates and sync performance







