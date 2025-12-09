# TradeTrackr Field App - Architecture

Vollständige Architektur-Dokumentation der TradeTrackr Field App.

## 🏗️ System Overview

```
┌─────────────────────────────────────────────────────────┐
│                    TradeTrackr Ecosystem                │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────┐              ┌──────────────┐       │
│  │    Portal    │              │  Field App   │       │
│  │  (Web Admin) │              │   (Mobile)   │       │
│  └──────┬───────┘              └──────┬───────┘       │
│         │                             │               │
│         └─────────────┬───────────────┘               │
│                       │                               │
│              ┌────────▼────────┐                      │
│              │  Shared Backend │                      │
│              │    (Firebase)   │                      │
│              └─────────────────┘                      │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## 📐 Architectural Layers

### Layer 1: Configuration & Schema

**Purpose:** Single source of truth for all system-wide constants.

```
src/config/
├── tradeTrackrSchema.ts   # Firestore paths (SHARED with Portal)
├── env.ts                 # Environment validation
└── featureFlags.ts        # Feature toggles
```

**Key Principle:** ONE schema for Portal + Field App

### Layer 2: Core Services

**Purpose:** Business logic and external integrations.

```
src/services/
├── firebase.ts         # Firebase SDK initialization
├── api.ts              # Firestore operations (uses schema)
├── offlineQueue.ts     # Mutation queue for offline
├── aiClient.ts         # AI backend communication
├── logger.ts           # Centralized logging
└── health.ts           # System health checks
```

**Key Principle:** All Firestore paths via `TradeTrackrSchema`

### Layer 3: State Management

**Purpose:** Application state (not data).

```
src/store/
├── authStore.ts        # Authentication & session
└── appStore.ts         # Timer, active project, sync state
```

**Technology:** Zustand (lightweight, no boilerplate)

### Layer 4: Utilities & Guards

**Purpose:** Cross-cutting concerns.

```
src/utils/
├── guards.ts           # Auth/role validation
└── fetch.ts            # Hardened HTTP (timeout/retry)
```

**Key Principle:** Client-side checks, backend enforces

### Layer 5: Navigation

**Purpose:** Screen routing and structure.

```
src/navigation/
├── RootNavigator.tsx       # Auth/App switch
├── auth/
│   └── AuthNavigator.tsx   # Login flow
└── app/
    ├── AppNavigator.tsx        # Bottom tabs
    └── ProjectsNavigator.tsx   # Project stack
```

**Technology:** React Navigation (Stack + Bottom Tabs)

### Layer 6: Screens

**Purpose:** User interface and interactions.

```
src/screens/
├── auth/
│   └── LoginScreen.tsx
└── app/
    ├── DashboardScreen.tsx      # Overview + Timer
    ├── ProjectsScreen.tsx       # List + QR
    ├── ProjectDetailScreen.tsx  # Details + Actions
    ├── TasksScreen.tsx          # Tasks + Status
    ├── TimeTrackingScreen.tsx   # Time entries
    ├── PhotosScreen.tsx         # Camera + Grid
    ├── MyDayReportScreen.tsx    # Summary + Confirm
    ├── AIHelpScreen.tsx         # Chat + Context
    └── DebugScreen.tsx          # DEV diagnostics
```

### Layer 7: Components

**Purpose:** Reusable UI elements.

```
src/components/
├── Layout.tsx          # SafeArea wrapper
├── PrimaryButton.tsx   # Touch-optimized button
├── TextField.tsx       # Labeled input
├── TimerBar.tsx        # Running timer display
├── ProjectCard.tsx     # Project list item
├── TaskItem.tsx        # Task list item
├── ChatBubble.tsx      # AI message bubble
└── Chip.tsx            # Quick action chip
```

## 🔐 Security Architecture

### Multi-Tenant Isolation

**Enforced at 3 levels:**

1. **Client Guards:**
   ```typescript
   validateTenantId(tenantId);  // All API calls
   requireSession(session);     // All operations
   ```

2. **Firestore Rules:**
   ```javascript
   allow read, write: if request.auth.token.tenantId == tenantId;
   ```

3. **Backend Verification:**
   ```typescript
   // In Cloud Functions
   if (decodedToken.tenantId !== body.tenantId) {
     throw new Error('Tenant mismatch');
   }
   ```

### Role-Based Access Control

**Roles:** `field_tech`, `foreman`, `manager`, `admin`

**Implemented in:**
- Custom Claims (Firebase Auth)
- Firestore Rules (hasRole() function)
- Client Guards (isFieldUser(), isAdminUser())

**Field User Permissions:**
- ✅ Read: Assigned projects/tasks only
- ✅ Write: Own time entries, notes, photos
- ✅ Update: Task status (assigned only)
- ❌ Create: Projects, tasks
- ❌ Delete: Any data

**Manager/Admin Permissions:**
- ✅ Full read/write in their tenant

### Token-Based Auth

**Flow:**
1. User logs in → Firebase Auth
2. Backend sets Custom Claims (`tenantId`, `role`)
3. Client stores token in AuthSession
4. All requests include: `Authorization: Bearer {token}`
5. Backend verifies token + claims
6. Firestore Rules check token.tenantId

## 📡 Data Flow

### Read Flow (Projects Example)

```
ProjectsScreen.tsx
    ↓
getAssignedProjects(tenantId, userId)
    ↓
Firestore Query via TradeTrackrSchema
    ↓
collection(db, 'tenants/{tenantId}/projects')
    ↓
where('assignedUserIds', 'array-contains', userId)
    ↓
Firestore Rules: isTenantUser() && isAssignedToProject()
    ↓
Return Project[]
```

### Write Flow (Time Entry Example)

```
Timer Stop in Dashboard
    ↓
createTimeEntry(entry)
    ↓
Network Available?
  ├─ Yes → Direct Firestore write
  └─ No  → queueMutation()
             ↓
         AsyncStorage
             ↓
         NetInfo detects connection
             ↓
         flushQueue()
             ↓
         Firestore write
```

### AI Request Flow

```
AIHelpScreen.tsx
    ↓
sendAIMessage({ tenantId, userId, projectId, message })
    ↓
fetchWithTimeout (60s)
    ↓
POST /ai/support with Bearer token
    ↓
Cloud Function: handleAISupport
    ↓
verifyAuth(token) → extract tenantId
    ↓
loadProjectContext() → Firestore
    ↓
callLLM() → OpenAI/Anthropic
    ↓
Return AIMessage
    ↓
Display in Chat
```

## 🔄 Offline Architecture

### Offline Queue

**Components:**
- `QueuedMutation[]` in AsyncStorage
- In-memory cache for performance
- NetInfo listener for reconnection

**Flow:**
```
User Action (offline)
    ↓
queueMutation({ type, payload })
    ↓
Save to AsyncStorage
    ↓
... (app continues offline) ...
    ↓
Network Reconnects
    ↓
NetInfo event → flushQueue()
    ↓
For each mutation:
  ├─ executeMutation() → API
  ├─ Success → Remove from queue
  └─ Failure → Retry (max 3x)
      └─ Still fails → Mark as dead-letter
```

**Supported Mutations:**
- `create_time_entry`
- `update_task`
- `add_note`
- `create_photo`
- `create_report`

## 🎯 Navigation Architecture

### Route Structure

```
Root
├─ Auth (not authenticated)
│  └─ Login
│
└─ App (authenticated)
   ├─ Dashboard (Tab)
   ├─ Projects (Tab) → Stack
   │  ├─ ProjectList
   │  ├─ ProjectDetail
   │  ├─ Tasks
   │  └─ AIHelp
   ├─ TimeTracking (Tab)
   ├─ Photos (Tab)
   ├─ MyDay (Tab)
   └─ Debug (Tab, DEV only)
```

**Max Depth:** 3 levels (per UX requirement)

Example path: `App → Projects → ProjectDetail` (3 taps from home)

## 🧩 Type System

### Core Types (Portal-Compatible)

```typescript
// Basic IDs
TenantId, UserId, ProjectId, TaskId, ...

// Entities
User, Project, Task, TimeEntry, Photo, Note, DayReport, AIMessage

// Auth
AuthSession { userId, tenantId, email, token, expiresAt }
```

**Portal Compatibility:**
- All types include optional fields used by portal
- `Project`: clientId, siteName, description, startDate, endDate
- `Task`: priority, estimatedHours, completedAt

## 🛡️ Error Handling Strategy

### 1. Validation Layer (Immediate)

```typescript
// Guards
requireSession(session);
validateTenantId(tenantId);
```

→ Throws immediately if invalid

### 2. API Layer (Logged)

```typescript
try {
  await firestore.operation();
} catch (error) {
  logError('Context', error, { details });
  throw new Error('User-friendly message');
}
```

→ Logs technical details, throws friendly message

### 3. UI Layer (Displayed)

```typescript
try {
  await apiCall();
} catch (error) {
  Alert.alert('Fehler', error.message);
}
```

→ Shows user-friendly Alert

### 4. Offline Layer (Queued)

```typescript
try {
  await apiCall();
} catch (error) {
  await queueMutation({ type, payload });
  Alert.alert('Gespeichert', 'Wird später synchronisiert');
}
```

→ Graceful degradation

## 📊 Observability Strategy

### Logging Levels

- **DEBUG**: Dev-only, verbose
- **INFO**: Key events (login, sync, etc.)
- **WARN**: Issues but app continues
- **ERROR**: Failures requiring attention

### Log Aggregation (TODO)

**Extension point in `logger.ts`:**

```typescript
function sendToRemote(entry: LogEntry) {
  // Integrate:
  // - Sentry (errors)
  // - Datadog (metrics)
  // - Custom backend
}
```

### Metrics to Track

**Client-Side:**
- Login success/failure rate
- Offline queue size (P95, P99)
- Time to sync after reconnection
- Photo upload success rate
- AI request latency

**Backend:**
- Firestore read/write volumes
- Functions invocations & errors
- Storage upload volumes
- AI endpoint latency & errors

## 🚀 Deployment Architecture

### CI/CD Pipeline (Recommended)

```
1. Code Push
    ↓
2. GitHub Actions / GitLab CI
    ↓
3. Tests (Lint, Type-check, Unit)
    ↓
4. Build
   ├─ Functions: npm run build
   └─ App: eas build
    ↓
5. Deploy
   ├─ Firebase: deploy.sh
   └─ App: eas submit
    ↓
6. Verify
   └─ Health checks
```

### Environments

**Development:**
- Firebase Emulators
- Local Functions
- Mock AI responses
- Debug Screen visible

**Staging:**
- Real Firebase (staging project)
- Real Functions (staging)
- Real AI endpoint (limited)
- Debug Screen for admins

**Production:**
- Real Firebase (production)
- Real Functions (production)
- Real AI endpoint (full LLM)
- No debug features

## 🔮 Extensibility

### Adding New Features

1. **Add Feature Flag:**
   ```typescript
   // featureFlags.ts
   newFeature: envFlag('EXPO_PUBLIC_FEATURE_NEW', false)
   ```

2. **Implement Feature:**
   ```typescript
   if (!featureFlags.newFeature) return null;
   ```

3. **Add Tests in Debug Screen**

4. **Document in OPERATIONS.md**

### Adding New Screens

1. Add to navigation types
2. Create screen component
3. Wire into navigator
4. Add guards if needed
5. Integrate logging

### Adding New Backend Endpoints

1. Create handler in `functions/src/`
2. Export in `functions/src/index.ts`
3. Add client function in appropriate service
4. Add to health checks
5. Document in `functions/README.md`

## 📖 Design Principles

### 1. Lean by Design
- No unnecessary abstractions
- No heavy frameworks
- Code is self-documenting

### 2. Offline-First
- All write operations queue-able
- Auto-sync on reconnection
- Graceful degradation

### 3. Security by Default
- Multi-tenant enforced at all layers
- Least-privilege everywhere
- Token verification required

### 4. Fail-Fast
- Invalid config → App won't start (PROD)
- Missing tenantId → Clear error
- Expired session → Force re-login

### 5. Observable
- Centralized logging
- Health checks
- Debug tools
- Extension points for monitoring

### 6. Portal-Compatible
- Shared schema
- Same Firebase instance
- Coordinated deployments
- Compatible types

## 🎓 Key Learnings

### Multi-Tenancy
- ✅ **Always include tenantId** in queries
- ✅ **Verify in 3 places:** Client, Rules, Backend
- ✅ **Custom claims as primary source**

### Offline-First
- ✅ **Queue all writes** when offline
- ✅ **Auto-sync is reliable** with NetInfo
- ✅ **User never sees "failed"** → queued instead

### Mobile UX
- ✅ **Large tap targets** (50px min)
- ✅ **Max 3 taps** to any action
- ✅ **No menu depth > 2**
- ✅ **Readable in daylight** (high contrast)

### Production Readiness
- ✅ **Config validation** prevents runtime surprises
- ✅ **Logging** enables debugging
- ✅ **Health checks** catch issues early
- ✅ **Feature flags** allow controlled rollout

## 🔬 Testing Strategy

### Unit Tests (TODO)

```bash
# Example with Jest
npm install --save-dev jest @types/jest
npm test
```

**Test Coverage:**
- Guards (requireSession, validateTenantId)
- Type converters (toTimestamp, toFirestoreTimestamp)
- Feature flags
- Logger sanitization

### Integration Tests (Emulators)

```bash
firebase emulators:start
# Run app against emulators
# Verify all operations work
```

### E2E Tests (TODO)

```bash
# Example with Maestro
brew install maestro
maestro test flows/login.yaml
```

**Critical Flows:**
- Login → View Projects → Start Timer → Stop Timer
- Take Photo → Upload → View in List
- Create Note → View in Project
- AI Chat → Save as Note

### Manual Testing Checklist

- [ ] Login with valid/invalid credentials
- [ ] View assigned projects
- [ ] Start/stop timer
- [ ] Take photo (with/without GPS)
- [ ] Send AI message
- [ ] Create day report
- [ ] Go offline → perform actions → go online
- [ ] Verify auto-sync

## 📚 Further Reading

- **Deployment:** `DEPLOYMENT_GUIDE.md`
- **Operations:** `OPERATIONS.md`
- **Functions:** `functions/README.md`
- **Main:** `README.md`

---

**Architecture Version:** 1.0  
**Last Updated:** 2024  
**Status:** Stable & Production-Ready ✅








