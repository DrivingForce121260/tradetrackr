# TradeTrackr Deployment Guide

Vollständiger Leitfaden für das Deployment des TradeTrackr-Ökosystems (Portal + Field App).

## 🎯 Überblick

Das TradeTrackr-System besteht aus:
- **Portal** (Web-Admin) - bestehende Anwendung
- **Field App** (Mobile) - diese App
- **Shared Backend** - Firebase (Firestore, Auth, Storage, Functions)

**WICHTIG:** Portal und Field App teilen sich **die gleiche Firebase-Instanz**.

## 📋 Voraussetzungen

### 1. Tools installieren

```bash
# Node.js & npm (v18+)
node --version
npm --version

# Firebase CLI
npm install -g firebase-tools

# Expo CLI (für Field App)
npm install -g expo-cli
```

### 2. Firebase-Projekt vorbereiten

- ✅ Firebase-Projekt erstellt (oder bestehendes Portal-Projekt verwenden)
- ✅ Firestore aktiviert
- ✅ Authentication aktiviert (Email/Password)
- ✅ Storage aktiviert
- ✅ Billing aktiviert (für Cloud Functions)

### 3. Zugänge

- ✅ Firebase Console Zugang
- ✅ Admin-Rechte für das Projekt
- ✅ LLM API Key (OpenAI oder Anthropic)

## 🚀 Deployment-Schritte

### Schritt 1: Repository klonen & Dependencies

```bash
# Repository klonen
git clone <repository-url>
cd trades-manage-projectCurrent

# Field App Dependencies
npm install

# Functions Dependencies
cd functions
npm install
cd ..
```

### Schritt 2: Firebase initialisieren

```bash
# Bei Firebase anmelden
firebase login

# Projekt auswählen/verbinden
firebase use <project-id>

# Oder interaktiv
firebase use
```

### Schritt 3: Environment Variables (Field App)

Erstellen Sie `.env` im Root:

```env
# Firebase Configuration (GLEICH wie Portal!)
EXPO_PUBLIC_FIREBASE_API_KEY=AIza...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
EXPO_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123

# AI Backend (wird nach Functions-Deploy gesetzt)
EXPO_PUBLIC_AI_ENDPOINT=https://us-central1-your-project.cloudfunctions.net/ai
```

### Schritt 4: Backend deployen

#### Option A: Automated Deploy Script

```bash
# Macht alles automatisch
chmod +x deploy.sh
./deploy.sh
```

#### Option B: Manual Deploy

```bash
# 1. Firestore Rules
firebase deploy --only firestore:rules

# 2. Firestore Indexes
firebase deploy --only firestore:indexes

# 3. Storage Rules
firebase deploy --only storage

# 4. Cloud Functions
cd functions
npm run build
cd ..
firebase deploy --only functions
```

### Schritt 5: Custom Claims konfigurieren

Die Cloud Function `onUserCreated` setzt automatisch Claims, aber Sie müssen die Logik anpassen:

**In `functions/src/index.ts`:**

```typescript
export const onUserCreated = functions.auth.user().onCreate(async (user) => {
  // TODO: Implementieren Sie Ihre Tenant-Zuordnungslogik
  // Beispiel:
  const tenantId = await resolveTenantForEmail(user.email);
  const role = await determineUserRole(user.email);
  
  await admin.auth().setCustomUserClaims(user.uid, {
    tenantId,
    role,
  });
});
```

**Für existierende User:**

```bash
# Über Firebase Console oder Admin SDK
node
> const admin = require('firebase-admin');
> admin.initializeApp();
> admin.auth().setCustomUserClaims('USER_UID', {
    tenantId: 'tenant-123',
    role: 'field_tech'
  });
```

### Schritt 6: LLM Provider konfigurieren

#### OpenAI

```bash
firebase functions:config:set openai.api_key="sk-..."
firebase deploy --only functions
```

Dann in `functions/src/aiSupport.ts` die `callLLM` Funktion implementieren (siehe Kommentare).

#### Anthropic

```bash
firebase functions:config:set anthropic.api_key="sk-ant-..."
firebase deploy --only functions
```

### Schritt 7: Tenant-Dokumente erstellen

Erstellen Sie Tenant-Dokumente in Firestore:

```javascript
// In Firebase Console oder via Admin SDK
{
  companyCode: "FIRMA123",
  name: "Musterfirma GmbH",
  address: {...},
  createdAt: serverTimestamp()
}
```

**Pfad:** `tenants/tenant-123`

### Schritt 8: Test-User erstellen

```bash
# Via Firebase Console: Authentication → Users → Add user

# Oder via CLI
firebase auth:import users.json
```

**users.json:**
```json
[
  {
    "localId": "user-123",
    "email": "monteur@firma.de",
    "passwordHash": "...",
    "customAttributes": "{\"tenantId\":\"tenant-123\",\"role\":\"field_tech\"}"
  }
]
```

### Schritt 9: Field App bauen

#### Development Testing

```bash
# Local development
npm start

# Scan QR mit Expo Go
```

#### Production Builds (EAS)

**Android:**

```bash
# Voraussetzung: EAS CLI installiert
npm install -g eas-cli
eas login

# Development APK (intern, direkt installierbar)
eas build --platform android --profile development

# Production AAB (Play Store ready)
eas build --platform android --profile production
```

**iOS:**

```bash
# Development (TestFlight)
eas build --platform ios --profile development

# Production (App Store)
eas build --platform ios --profile production
```

**WICHTIG:** 
- Für Production: Alle `EXPO_PUBLIC_*` Variablen müssen gesetzt sein
- Via `.env` Datei oder EAS Secrets (`eas secret:create`)
- Debug-Screen ist automatisch deaktiviert in Production Builds

**Vollständige Build-Anleitung:** Siehe `BUILD_GUIDE.md`

## ✅ Verifikation

### Backend

```bash
# Firestore Rules aktiv?
firebase firestore:rules get

# Functions deployed?
firebase functions:list

# Functions Logs
firebase functions:log
```

### Field App

1. ✅ Login funktioniert
2. ✅ Projekte werden geladen
3. ✅ Zeiterfassung speichert
4. ✅ Fotos werden hochgeladen
5. ✅ KI-Assistent antwortet
6. ✅ Offline-Modus funktioniert

## 🔒 Security Checklist

- [ ] Firestore Rules deployed und getestet
- [ ] Storage Rules deployed und getestet
- [ ] Custom Claims für alle User gesetzt
- [ ] LLM API Keys als Environment Variables (nicht im Code!)
- [ ] Firebase Security Monitoring aktiviert
- [ ] Budget Alerts konfiguriert
- [ ] Backup-Strategie definiert

## 📊 Monitoring

### Firebase Console

- **Authentication:** Neue User, Failed Logins
- **Firestore:** Read/Write Counts, Errors
- **Storage:** Upload Volume, Bandwidth
- **Functions:** Invocations, Errors, Execution Time

### Alerts konfigurieren

```bash
# Budget Alert
gcloud billing budgets create \
  --billing-account=BILLING_ACCOUNT_ID \
  --display-name="TradeTrackr Budget" \
  --budget-amount=100EUR
```

## 🐛 Troubleshooting

### "Permission denied" bei Firestore

- ✅ Check: Firestore Rules deployed?
- ✅ Check: Custom Claims gesetzt?
- ✅ Check: TenantId in Token vorhanden?

```bash
# Rules testen
firebase emulators:start --only firestore
```

### Functions Timeout

- ✅ Check: Firestore Indexes deployed?
- ✅ Check: LLM API Key korrekt?
- ✅ Increase timeout in `functions/src/index.ts`:

```typescript
export const ai = functions
  .runWith({ timeoutSeconds: 120 })
  .https.onRequest(aiSupportApp);
```

### Field App kann sich nicht verbinden

- ✅ Check: `.env` Datei vorhanden und korrekt?
- ✅ Check: Firebase Config identisch mit Portal?
- ✅ Check: `EXPO_PUBLIC_AI_ENDPOINT` auf Functions URL gesetzt?

## 🔄 Updates & Maintenance

### Security Rules Update

```bash
# Edit firestore.rules oder storage.rules
firebase deploy --only firestore:rules
firebase deploy --only storage
```

### Functions Update

```bash
cd functions
npm run build
cd ..
firebase deploy --only functions
```

### Field App Update

```bash
# Code ändern
npm start  # Test

# Production Build
eas build --platform all
eas submit --platform all
```

## 📚 Weiterführende Dokumentation

- **Field App:** `README.md`
- **Cloud Functions:** `functions/README.md`
- **Schema:** `src/config/tradeTrackrSchema.ts`
- **Security Rules:** `firestore.rules`, `storage.rules`

## 🆘 Support

Bei Problemen:

1. Firebase Console Logs prüfen
2. Functions Logs: `firebase functions:log`
3. Field App Logs: Console.log in Dev Tools
4. Dokumentation: Firebase Docs, Expo Docs

---

**Version:** 1.0.0  
**Stand:** 2024  
**Status:** Production-Ready ✅

