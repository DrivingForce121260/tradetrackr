# TradeTrackr Operations Guide

Operational hardening und Observability für das TradeTrackr-System.

## 📊 Observability

### Logging

**Zentralisiertes Logging** über `src/services/logger.ts`:

```typescript
import { logInfo, logWarn, logError, logDebug } from './services/logger';

// Usage
logInfo('Context: Action', { details });
logWarn('Context: Warning', { data });
logError('Context: Error', error, { extra });
```

**Logging-Strategie:**
- **DEV**: Alle Logs → Console
- **PROD**: Nur Warnings & Errors → Console + Remote (TODO: Sentry)

**Integriert in:**
- ✅ `authStore.ts` - Login/Logout Events
- ✅ `api.ts` - Firestore Errors
- ✅ `offlineQueue.ts` - Queue Operations
- ✅ `aiClient.ts` - AI Request Lifecycle

**Remote Logging Extension Point:**

In `src/services/logger.ts` siehe `sendToRemote()` Funktion:

```typescript
// TODO: Integrate Sentry
import * as Sentry from '@sentry/react-native';

function sendToRemote(entry: LogEntry) {
  if (entry.level === LogLevel.ERROR) {
    Sentry.captureException(new Error(entry.error.message));
  }
}
```

### Health Checks

**Client-Side:** `src/services/health.ts`

```typescript
import { checkClientHealth, getHealthSummary } from './services/health';

const result = await checkClientHealth();
console.log(getHealthSummary(result));
```

**Checks:**
- ✅ Environment Configuration
- ✅ Firebase Initialization
- ✅ Session Validity
- ✅ AI Endpoint Configuration
- ✅ Network Connectivity

**Backend:** `GET /health`

```bash
curl https://us-central1-YOUR_PROJECT.cloudfunctions.net/health
```

Response:
```json
{
  "status": "ok",
  "env": "production",
  "timestamp": 1234567890,
  "services": {
    "firestore": "available",
    "auth": "available",
    "storage": "available"
  }
}
```

### Debug Screen

**Zugriff:** Nur in DEV oder via Feature Flag

**Features:**
- Environment Info (tenantId, userId, Firebase Project)
- Feature Flags Status
- System Health Check
- Manual Tests:
  - ✅ Firestore Read Test
  - ✅ AI Endpoint Test
  - ✅ Queue Flush Test

**Navigation:** Bottom Tab "Debug" (nur wenn `featureFlags.debugScreen = true`)

## 🚦 Feature Flags

**Konfiguration:** `src/config/featureFlags.ts`

```typescript
export const featureFlags = {
  aiHelp: true,           // AI Assistant
  offlineQueue: true,     // Offline Mutation Queue
  qrScanner: true,        // QR Code Scanner
  photoCapture: true,     // Camera/Photo Upload
  debugScreen: __DEV__,   // Debug Screen
};
```

**Environment Override:**

```env
EXPO_PUBLIC_FEATURE_AI_HELP=false
EXPO_PUBLIC_FEATURE_QR_SCANNER=false
```

**Usage in Screens:**

```typescript
import { featureFlags } from '../config/featureFlags';

if (!featureFlags.aiHelp) {
  return <Text>KI-Funktion deaktiviert</Text>;
}
```

**Integriert in:**
- ✅ `AIHelpScreen.tsx` - Zeigt Disabled-Message
- ✅ `ProjectsScreen.tsx` - Versteckt QR-Button
- ✅ `PhotosScreen.tsx` - Versteckt Kamera-Button
- ✅ `AppNavigator.tsx` - Versteckt Debug-Tab

## 🔧 Hardening

### Timeouts & Retries

**Fetch Utilities:** `src/utils/fetch.ts`

```typescript
import { fetchWithTimeout, fetchWithRetry } from '../utils/fetch';

// Timeout only
const response = await fetchWithTimeout(url, options, 30000);

// Timeout + Retry
const response = await fetchWithRetry(url, options, 2, 30000);
```

**Features:**
- ✅ AbortController-based timeout
- ✅ Exponential backoff (max 5s)
- ✅ Conditional retry (skip 4xx errors)
- ✅ Logging via logger.ts

**Integriert in:**
- ✅ `aiClient.ts` - 60s timeout für AI requests

### Error Handling

**Best Practices implementiert:**

1. **User-Friendly Messages:**
   - Keine Stack Traces in UI
   - Kurze, verständliche Fehlermeldungen
   - "Bitte erneut versuchen" statt technische Details

2. **Graceful Degradation:**
   - AI Endpoint offline → Mock Response (DEV)
   - Firestore offline → Offline Queue
   - Photo Upload fails → Queue für später

3. **Fail-Fast:**
   - Fehlende Firebase Config → App startet nicht (PROD)
   - Ungültige Session → Klare Fehlermeldung
   - Missing TenantId → Sofortiger Error

### Guards & Validation

**Session Validation:**

```typescript
import { requireSession, assertTenant } from '../utils/guards';

// At API entry points
requireSession(session);  // Throws if invalid
```

**Field Access:**

```typescript
import { assertFieldAccess } from '../utils/guards';

// In AppNavigator
assertFieldAccess(session);  // Warns but allows (backend enforces)
```

## 🔍 Monitoring & Debugging

### DEV Mode

**Automatisch aktiviert:**
- Health Check on startup
- Verbose logging
- Debug Screen verfügbar
- Feature Flags Logging
- Network error fallbacks

### Production Mode

**Aktiviert:**
- Remote Logging (wenn konfiguriert)
- Health Warnings nur
- Keine Mock Responses
- Strict Validation
- Fail-Fast auf Config-Fehler

### Debugging Workflow

1. **Lokales Problem:**
   ```bash
   npm start
   # Check Console für Logs
   # Navigate to Debug Tab
   # Run manual tests
   ```

2. **Production Issue:**
   ```bash
   # Check Firebase Console
   # Functions Logs: firebase functions:log
   # Firestore Monitoring
   # Storage Metrics
   ```

3. **Network Issues:**
   ```bash
   # Enable Airplane Mode
   # Perform actions
   # Check Offline Queue in Debug Screen
   # Re-enable Network
   # Verify Auto-Sync
   ```

## 🧪 Testing

### Manual Tests (Debug Screen)

1. **Firestore Read Test:**
   - Lädt assigned projects
   - Verifiziert Firestore-Verbindung
   - Prüft Security Rules

2. **AI Endpoint Test:**
   - Sendet Test-Nachricht
   - Verifiziert Backend-Verbindung
   - Prüft Token-Authentifizierung

3. **Queue Flush Test:**
   - Zeigt pending mutations
   - Führt Flush aus
   - Zeigt Erfolg/Fehler-Raten

### Automated Tests

**TODO:** E2E Tests mit Detox oder Maestro

```bash
# Example mit Detox
npm install --save-dev detox
detox test
```

### Integration Tests (Emulators)

```bash
# Start Firebase Emulators
firebase emulators:start

# In .env.local
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=localhost:9099
EXPO_PUBLIC_FIREBASE_FIRESTORE_HOST=localhost:8080

# Run app against emulators
npm start
```

## 📈 Performance

### Optimizations Implemented

1. **Firestore Indexes:** `firestore.indexes.json`
   - Alle Queries indexed
   - Composite indexes für array-contains + orderBy

2. **In-Memory Caching:**
   - Offline Queue cached
   - Firebase nur init once

3. **Lazy Loading:**
   - Components nur bei Bedarf
   - Navigation lazy

### Performance Monitoring

```bash
# TODO: Add Firebase Performance Monitoring
npm install @react-native-firebase/perf

# In App.tsx
import perf from '@react-native-firebase/perf';
const trace = await perf().startTrace('app_startup');
// ... code ...
await trace.stop();
```

## 🔐 Security Checklist

- [x] Firestore Rules enforced multi-tenancy
- [x] Storage Rules content validation
- [x] Custom Claims für tenantId
- [x] Token verification in Functions
- [x] No LLM keys in client
- [x] Session validation
- [x] TenantId validation in all queries
- [x] Sanitization in logger

## 📝 Operational Runbook

### App startet nicht

1. Check: `.env` Datei vorhanden?
2. Check: Alle EXPO_PUBLIC_FIREBASE_* gesetzt?
3. Check: `npm install` ausgeführt?
4. Run: Health Check in Debug Screen

### Keine Projekte sichtbar

1. Check: User eingeloggt?
2. Check: Custom Claims gesetzt? (`tenantId` in Token)
3. Check: `assignedUserIds` enthält User?
4. Check: Firestore Rules erlauben Zugriff?
5. Run: Firestore Read Test in Debug Screen

### AI antwortet nicht

1. Check: `EXPO_PUBLIC_AI_ENDPOINT` gesetzt?
2. Check: Backend Functions deployed?
3. Check: LLM API Key konfiguriert?
4. Run: AI Endpoint Test in Debug Screen
5. Check: Functions Logs: `firebase functions:log`

### Offline Queue läuft voll

1. Check: Network-Verbindung vorhanden?
2. Check: Firestore Rules erlauben Schreibzugriff?
3. Run: Queue Flush in Debug Screen
4. Check: Mutation payloads valide?
5. Clear Queue if corrupted (mit Vorsicht!)

## 🚨 Alerts & Monitoring

### Empfohlene Alerts

**Firebase Console Alerts:**
- Firestore Write Errors > 100/hour
- Functions Errors > 50/hour
- Auth Failed Logins > 20/hour
- Storage Upload Errors > 30/hour

**Budget Alerts:**
- Firestore Reads > 1M/day
- Functions Invocations > 100k/day
- Storage Bandwidth > 10GB/day

### Metrics to Track

- Daily Active Users
- Average Session Duration
- Photos Uploaded per Day
- Time Entries Created per Day
- Day Reports Confirmed per Day
- AI Requests per Day
- Offline Queue Size (P95)
- Error Rate by Type

---

**Last Updated:** 2024  
**Version:** 1.0.0  
**Status:** Production-Ready ✅








