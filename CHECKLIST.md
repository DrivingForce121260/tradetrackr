# TradeTrackr Field App - Production Checklist

Vollständige Checkliste vor dem Production-Deployment.

## 📋 Pre-Deployment Checklist

### 1️⃣ Environment Configuration

- [ ] `.env` Datei im Root erstellt
- [ ] `EXPO_PUBLIC_FIREBASE_API_KEY` gesetzt
- [ ] `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` gesetzt
- [ ] `EXPO_PUBLIC_FIREBASE_PROJECT_ID` gesetzt
- [ ] `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` gesetzt
- [ ] `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` gesetzt
- [ ] `EXPO_PUBLIC_FIREBASE_APP_ID` gesetzt
- [ ] `EXPO_PUBLIC_AI_ENDPOINT` gesetzt (optional in DEV)
- [ ] Alle Werte mit Portal-Config verglichen ✅

### 2️⃣ Firebase Project Setup

- [ ] Firebase-Projekt erstellt (oder existierendes verwendet)
- [ ] Firestore aktiviert
- [ ] Authentication aktiviert (Email/Password)
- [ ] Storage aktiviert
- [ ] Billing aktiviert (für Functions)
- [ ] Firebase CLI installiert (`npm install -g firebase-tools`)
- [ ] Bei Firebase angemeldet (`firebase login`)
- [ ] Projekt ausgewählt (`firebase use <project-id>`)

### 3️⃣ Firestore Setup

- [ ] Tenant-Dokumente erstellt:
  ```
  tenants/{tenantId}
    ├─ companyCode: "FIRMA123"
    ├─ name: "Musterfirma GmbH"
    └─ createdAt: timestamp
  ```
- [ ] Test-Projekte angelegt (optional)
- [ ] Firestore Rules deployed: `firebase deploy --only firestore:rules`
- [ ] Firestore Indexes deployed: `firebase deploy --only firestore:indexes`
- [ ] Security Rules getestet (via Emulator oder Console)

### 4️⃣ Authentication Setup

- [ ] Test-User in Firebase Authentication angelegt
- [ ] Custom Claims für Test-User gesetzt:
  ```javascript
  admin.auth().setCustomUserClaims(uid, {
    tenantId: 'tenant-123',
    role: 'field_tech'
  });
  ```
- [ ] Custom Claims verifiziert (via Token Inspector)
- [ ] `onUserCreated` Function angepasst (Tenant-Zuordnungslogik)

### 5️⃣ Storage Setup

- [ ] Storage Rules deployed: `firebase deploy --only storage`
- [ ] Test-Upload durchgeführt
- [ ] Pfad-Struktur verifiziert: `tenants/{tenantId}/projects/{projectId}/photos/`
- [ ] Content-Type Validation getestet
- [ ] File-Size Limits getestet

### 6️⃣ Cloud Functions Setup

- [ ] Functions Dependencies installiert: `cd functions && npm install`
- [ ] Functions gebaut: `npm run build`
- [ ] LLM API Key konfiguriert:
  - [ ] OpenAI: `firebase functions:config:set openai.api_key="sk-..."`
  - [ ] ODER Anthropic: `firebase functions:config:set anthropic.api_key="sk-ant-..."`
- [ ] `callLLM()` in `aiSupport.ts` implementiert
- [ ] Functions deployed: `firebase deploy --only functions`
- [ ] Health endpoint getestet: `curl https://.../health`
- [ ] AI endpoint getestet (siehe functions/README.md)

### 7️⃣ App Dependencies

- [ ] Node Modules installiert: `npm install`
- [ ] TypeScript compiles: `npm run type-check`
- [ ] Keine Linter-Errors: `npm run lint` (wenn konfiguriert)
- [ ] App startet in DEV: `npm start`
- [ ] iOS Build funktioniert: `npm run ios` (optional)
- [ ] Android Build funktioniert: `npm run android` (optional)

### 8️⃣ Functional Testing

**Login:**
- [ ] Login mit gültigen Credentials funktioniert
- [ ] Login mit ungültigen Credentials zeigt Fehler
- [ ] TenantId wird korrekt aufgelöst
- [ ] Session wird gespeichert
- [ ] Logout funktioniert

**Projects:**
- [ ] Assigned Projekte werden geladen
- [ ] Projekt-Details werden angezeigt
- [ ] QR-Scanner öffnet (wenn enabled)
- [ ] QR-Code wird korrekt geparst

**Time Tracking:**
- [ ] Timer startet
- [ ] Timer pausiert
- [ ] Timer stoppt und speichert
- [ ] Zeiteinträge werden angezeigt
- [ ] Offline-Modus: Timer-Daten werden gequeued

**Tasks:**
- [ ] Tasks werden geladen
- [ ] Status-Update funktioniert
- [ ] Notiz hinzufügen funktioniert

**Photos:**
- [ ] Kamera öffnet
- [ ] Foto wird aufgenommen
- [ ] Upload zu Storage funktioniert
- [ ] Foto wird in Liste angezeigt
- [ ] GPS-Koordinaten werden erfasst (wenn verfügbar)

**Day Report:**
- [ ] Tagesübersicht wird angezeigt
- [ ] Stunden-Zusammenfassung korrekt
- [ ] Projekt-Aufschlüsselung korrekt
- [ ] Bestätigung funktioniert

**AI Assistant:**
- [ ] Chat öffnet
- [ ] Nachricht senden funktioniert
- [ ] Antwort wird empfangen
- [ ] Quick Prompts funktionieren
- [ ] Als Notiz speichern funktioniert

**Offline Mode:**
- [ ] App funktioniert ohne Netzwerk
- [ ] Offline-Queue speichert Mutationen
- [ ] Auto-Sync bei Reconnect funktioniert
- [ ] Pending Count korrekt
- [ ] Keine Datenverluste

### 9️⃣ Debug & Diagnostics

- [ ] Debug Screen sichtbar (in DEV)
- [ ] Health Check läuft durch
- [ ] Firestore Read Test erfolgreich
- [ ] AI Endpoint Test erfolgreich
- [ ] Queue Flush Test erfolgreich
- [ ] Feature Flags korrekt angezeigt
- [ ] Environment Info korrekt

### 🔟 Security Verification

- [ ] Firestore Rules verhindern Cross-Tenant Access
- [ ] Storage Rules verhindern unauthorized uploads
- [ ] Custom Claims werden korrekt verwendet
- [ ] Token-Verification in Functions funktioniert
- [ ] Keine LLM Keys im Client-Code
- [ ] Sensitive Data wird sanitized (Logger)
- [ ] Session Expiry wird geprüft

## 🚀 Production Deployment Checklist

### Pre-Deploy

- [ ] Alle obigen Punkte ✅
- [ ] Code reviewed
- [ ] Breaking Changes kommuniziert (mit Portal-Team)
- [ ] Backup der aktuellen Production erstellt
- [ ] Rollback-Plan definiert

### Deploy

- [ ] `deploy.sh` ausführen ODER manuelle Schritte:
  - [ ] `firebase deploy --only firestore:rules`
  - [ ] `firebase deploy --only firestore:indexes`
  - [ ] `firebase deploy --only storage`
  - [ ] `cd functions && npm run deploy`
- [ ] Deployment-Logs prüfen
- [ ] Functions Status: `firebase functions:list`
- [ ] Health Endpoint aufrufen

### Post-Deploy

- [ ] Smoke Test durchgeführt
- [ ] Alle Critical Paths getestet
- [ ] Logs überwacht (erste 30 Min)
- [ ] Error Rate normal
- [ ] Performance normal

### App Distribution

**Android:**
- [ ] EAS CLI installiert: `npm install -g eas-cli`
- [ ] Bei Expo angemeldet: `eas login`
- [ ] EAS Secrets konfiguriert (alle EXPO_PUBLIC_* Variablen)
- [ ] Development APK: `eas build --platform android --profile development`
- [ ] Development APK getestet (intern)
- [ ] Production AAB: `eas build --platform android --profile production`
- [ ] Production Build verifiziert (Debug-Screen NICHT sichtbar)
- [ ] Google Play Console: App erstellt
- [ ] Service Account Key: `play-service-account.json` vorhanden
- [ ] Zu Play Store submitten: `eas submit --platform android --profile production`
- [ ] Internal Testing Track
- [ ] Beta-Tester eingeladen
- [ ] Production Release

**iOS:**
- [ ] Apple Developer Account vorhanden
- [ ] iOS Development Build: `eas build --platform ios --profile development`
- [ ] iOS Production Build: `eas build --platform ios --profile production`
- [ ] TestFlight Upload
- [ ] Beta-Tester eingeladen
- [ ] App Store Submission

## 📊 Monitoring Setup

### Firebase Console

- [ ] Alerts konfiguriert:
  - [ ] Firestore Errors > Threshold
  - [ ] Functions Errors > Threshold
  - [ ] Auth Failed Logins > Threshold
  - [ ] Budget Alert konfiguriert

### Logging Backend (TODO)

- [ ] Sentry/Datadog/Custom Backend integriert
- [ ] `sendToRemote()` in logger.ts implementiert
- [ ] Error Tracking aktiv
- [ ] Dashboards konfiguriert

### Metrics Dashboard (TODO)

- [ ] Daily Active Users
- [ ] Session Duration (P50, P95)
- [ ] API Success Rate
- [ ] Offline Queue Size
- [ ] Photo Upload Success Rate
- [ ] AI Request Latency

## 🔍 Verification Commands

```bash
# Environment
node -e "console.log(process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID)"

# Firebase
firebase projects:list
firebase use

# Firestore Rules
firebase firestore:rules get

# Functions
firebase functions:list
firebase functions:log --limit 50

# Health Check
curl https://REGION-PROJECT.cloudfunctions.net/health

# Code Quality
npm run type-check
npm run lint

# EAS Build
eas build:list
eas secret:list

# App Development
npm start
```

## 📱 Build Commands (EAS)

```bash
# Android Development APK
eas build --platform android --profile development

# Android Production AAB
eas build --platform android --profile production

# iOS Development
eas build --platform ios --profile development

# iOS Production
eas build --platform ios --profile production

# Submit to Stores
eas submit --platform android --profile production
eas submit --platform ios --profile production
```

## ✅ Sign-Off

### Development Team
- [ ] Code review complete
- [ ] All tests passed
- [ ] Documentation complete
- [ ] Handover to operations

### QA Team
- [ ] Functional testing complete
- [ ] Security testing complete
- [ ] Performance testing complete
- [ ] Sign-off given

### Operations Team
- [ ] Deployment verified
- [ ] Monitoring active
- [ ] Runbook reviewed
- [ ] On-call setup

### Product Owner
- [ ] Features verified
- [ ] UX approved
- [ ] Go-live approved

---

## 🎉 Ready for Production

Wenn alle Checkboxen ✅ sind, ist die App bereit für Production!

**Version:** 1.0.0  
**Date:** _____________  
**Approved by:** _____________

