# Session Timeout Implementation - TradeTrackr Web Portal

**Date:** 2025-12-02  
**Status:** ✅ Implemented  
**Scope:** Web Portal Session Timeout (30 minutes inactivity)

---

## 🎯 Overview

Implemented a secure, deterministic session timeout mechanism that automatically logs out users after 30 minutes of inactivity and redirects to the login screen with a timeout message.

---

## 📦 Implementation Details

### 1. SessionTimeout Component

**File:** `src/components/auth/SessionTimeout.tsx`

**Features:**
- 30-minute inactivity timeout (configurable)
- 1-minute warning modal before logout (configurable)
- Activity detection on: mousemove, keydown, click, scroll, touchstart, mousedown, keypress
- Visibility change detection (resets timer when user switches back to tab)
- Optional disabled prop for long-running tasks
- Countdown timer in warning modal
- Firebase signOut integration

**Props:**
```typescript
interface SessionTimeoutProps {
  disabled?: boolean;           // Disable timeout (e.g., for bulk operations)
  timeoutMinutes?: number;      // Default: 30 minutes
  warningSeconds?: number;       // Default: 60 seconds before logout
}
```

**Behavior:**
- Only activates when user is authenticated
- Resets timer on any activity event
- Shows warning modal 1 minute before logout
- User can continue session or logout immediately
- Automatically logs out after timeout
- Redirects to `/?timeout=true`

### 2. Integration in MainApp

**File:** `src/components/MainApp.tsx`

**Integration:**
- SessionTimeout component added to authenticated app layout
- Only renders when `user` is authenticated
- Positioned at root level to work across all pages

```typescript
{user && <SessionTimeout />}
```

### 3. LandingPage Timeout Message

**File:** `src/components/LandingPage.tsx`

**Features:**
- Detects `?timeout=true` URL parameter
- Shows amber alert message: "Ihre Sitzung wurde wegen Inaktivität beendet. Bitte melden Sie sich erneut an."
- Automatically clears URL parameter after displaying

---

## ✅ Acceptance Criteria

- ✅ Session timeout activates only for authenticated users
- ✅ Timer resets on activity events (mousemove, keydown, click, scroll, touchstart, etc.)
- ✅ Logs out after 30 minutes of inactivity
- ✅ Redirects to login with `?timeout=true`
- ✅ Shows 1-minute warning modal before logout
- ✅ Never triggers while user is actively interacting
- ✅ Works in all pages of the TradeTrackr portal
- ✅ Uses Firebase client-side logout (`signOut(auth)`)
- ✅ Compatible with existing AuthProvider

---

## 🔧 Usage Examples

### Standard Usage (30 minutes timeout):
```tsx
<SessionTimeout />
```

### Custom Timeout (60 minutes):
```tsx
<SessionTimeout timeoutMinutes={60} />
```

### Disable for Long-Running Tasks:
```tsx
<SessionTimeout disabled={isBulkUploading} />
```

---

## 🚀 Technical Details

### Activity Events Monitored:
- `mousemove` - Mouse movement
- `keydown` - Keyboard input
- `click` - Mouse clicks
- `scroll` - Page scrolling
- `touchstart` - Touch events (mobile)
- `mousedown` - Mouse button press
- `keypress` - Key press events
- `visibilitychange` - Tab/window focus

### Timer Management:
- Uses `useRef` to store timer references
- Properly cleans up on unmount
- Prevents memory leaks with cleanup functions

### Warning Modal:
- Shows 60 seconds before logout
- Countdown timer updates every second
- User can continue session or logout immediately
- Modal cannot be dismissed by clicking outside (must choose action)

---

## 📝 Notes

- The timeout is client-side only and does not affect Firebase token expiration
- The timeout resets when user switches back to the tab (visibility change)
- The component is lightweight and does not impact performance
- All event listeners use passive mode for better performance

---

## 🔍 Testing Checklist

- [ ] User inactive for 30 minutes → Logged out
- [ ] User active → Timer resets
- [ ] Warning modal appears 1 minute before logout
- [ ] "Continue Session" button resets timer
- [ ] "Logout now" button logs out immediately
- [ ] Timeout message appears on login page after logout
- [ ] Disabled prop prevents timeout during bulk operations
- [ ] Tab switch resets timer
- [ ] Works on all pages (dashboard, projects, reports, etc.)







