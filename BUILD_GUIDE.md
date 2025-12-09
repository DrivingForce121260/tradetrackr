# TradeTrackr Field App - Android Build Guide

Kompletter Leitfaden für Android-Builds via Expo EAS.

## 📋 Voraussetzungen

### 1. EAS CLI installieren

```bash
npm install -g eas-cli
```

### 2. Bei Expo anmelden

```bash
eas login
```

### 3. Projekt initialisieren (falls noch nicht geschehen)

```bash
eas build:configure
```

Dies erstellt/aktualisiert `eas.json` im Projekt-Root.

### 4. Environment Variables konfigurieren

**Option A: `.env` Datei (lokal)**

Erstellen Sie `.env` im Root mit allen erforderlichen Variablen:

```env
EXPO_PUBLIC_ENV=production
EXPO_PUBLIC_FIREBASE_API_KEY=your_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_domain
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_bucket
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
EXPO_PUBLIC_AI_ENDPOINT=https://your-backend.com/api
```

**Option B: EAS Secrets (empfohlen für CI/CD)**

```bash
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_API_KEY --value your_key
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN --value your_domain
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_PROJECT_ID --value your_project
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET --value your_bucket
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID --value your_sender_id
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_APP_ID --value your_app_id
eas secret:create --scope project --name EXPO_PUBLIC_AI_ENDPOINT --value https://your-backend.com/api
```

Secrets anzeigen:
```bash
eas secret:list
```

## 🏗️ Build Profiles

### Development Profile

**Zweck:** Internes Testing, schnelle Iteration  
**Output:** APK (direkt installierbar)  
**Features:** Debug-Screen verfügbar, verbose logging

```bash
eas build --platform android --profile development
```

**Details:**
- buildType: `apk`
- distribution: `internal`
- EXPO_PUBLIC_ENV: `development`
- Debug-Features: **Aktiv**

### Preview Profile

**Zweck:** Staging/UAT, Beta-Testing  
**Output:** APK (direkt installierbar)  
**Features:** Produktionsähnlich, aber mit Preview-Config

```bash
eas build --platform android --profile preview
```

**Details:**
- buildType: `apk`
- distribution: `internal`
- EXPO_PUBLIC_ENV: `preview`
- Debug-Features: **Teilweise**

### Production Profile

**Zweck:** Play Store Submission  
**Output:** AAB (App Bundle)  
**Features:** Produktionsreif, optimiert, debug disabled

```bash
eas build --platform android --profile production
```

**Details:**
- buildType: `app-bundle`
- distribution: `store`
- EXPO_PUBLIC_ENV: `production`
- Debug-Features: **Deaktiviert**
- EXPO_PUBLIC_FEATURE_DEBUG_SCREEN: `false` (forced)

## 📦 Build Workflow

### Standard Build

```bash
# 1. Sicherstellen dass Code committed ist
git status

# 2. Build starten
eas build --platform android --profile production

# 3. Build-Status überwachen
# EAS zeigt Link zu Build-Status

# 4. Build herunterladen (nach Completion)
# Download-Link wird von EAS bereitgestellt
```

### Lokaler Build (für Testing)

```bash
# Lokal bauen (benötigt Android SDK)
eas build --platform android --profile development --local
```

### Build-Status prüfen

```bash
# Liste aller Builds
eas build:list

# Spezifischen Build ansehen
eas build:view [BUILD_ID]
```

## 🚀 Submission Workflow

### 1. Production Build erstellen

```bash
eas build --platform android --profile production
```

### 2. Google Play Console vorbereiten

- [ ] Google Play Console Account vorhanden
- [ ] App erstellt in Play Console
- [ ] Service Account Key generiert (`play-service-account.json`)
- [ ] Service Account Key im Root abgelegt

### 3. Zu Play Store submitten

```bash
eas submit --platform android --profile production
```

**Oder manuell:**
1. AAB von EAS herunterladen
2. In Play Console hochladen
3. Internal Testing Track oder Production

## ⚙️ Build-Konfiguration

### `eas.json` Struktur

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "android": { "buildType": "apk" },
      "env": { "EXPO_PUBLIC_ENV": "development" }
    },
    "production": {
      "distribution": "store",
      "android": { "buildType": "app-bundle" },
      "env": {
        "EXPO_PUBLIC_ENV": "production",
        "EXPO_PUBLIC_FEATURE_DEBUG_SCREEN": "false"
      }
    }
  }
}
```

### Environment Variables per Profile

**Development:**
- `EXPO_PUBLIC_ENV=development`
- Debug-Screen: ✅ Verfügbar
- Logging: Verbose
- AI Endpoint: Mock-Fallback erlaubt

**Preview:**
- `EXPO_PUBLIC_ENV=preview`
- Debug-Screen: ⚠️ Optional
- Logging: Moderat
- AI Endpoint: Staging-Backend

**Production:**
- `EXPO_PUBLIC_ENV=production`
- Debug-Screen: ❌ Deaktiviert (forced)
- Logging: Minimal (nur remote)
- AI Endpoint: Production-Backend erforderlich

## 🔍 Verifikation vor Build

### Pre-Build Checklist

```bash
# 1. TypeScript kompiliert
npm run type-check

# 2. Environment Variables gesetzt
cat .env  # oder
eas secret:list

# 3. Firebase Config korrekt
# Prüfen in src/config/env.ts

# 4. App.json korrekt
cat app.json

# 5. Keine uncommitted Changes
git status
```

### Post-Build Checklist

- [ ] Build erfolgreich auf EAS
- [ ] APK/AAB heruntergeladen
- [ ] Auf Test-Gerät installiert
- [ ] Login funktioniert
- [ ] Projekte werden geladen
- [ ] Timer funktioniert
- [ ] Fotos können aufgenommen werden
- [ ] Offline-Modus funktioniert
- [ ] **Debug-Screen NICHT sichtbar** (production)

## 🐛 Troubleshooting

### "Missing environment variable"

**Problem:** Build schlägt fehl wegen fehlender Env-Vars

**Lösung:**
```bash
# Secrets setzen
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_API_KEY --value "..."

# Oder .env Datei erstellen
cp .env.example .env
# .env bearbeiten
```

### "Build failed: Gradle error"

**Problem:** Android-Build schlägt fehl

**Lösung:**
1. Check `android/build.gradle` für Syntax-Fehler
2. Clear cache: `eas build --platform android --profile production --clear-cache`
3. Check EAS Build Logs für Details

### "App crashes on startup"

**Problem:** Production-App startet nicht

**Lösung:**
1. Check: Sind alle EXPO_PUBLIC_* Variablen gesetzt?
2. Run: Health Check in Development Build
3. Check: Firebase Config korrekt?
4. Verify: `validateProductionConfig()` passed?

### "Debug screen visible in production"

**Problem:** Debug-Screen sollte nicht sichtbar sein

**Lösung:**
1. Check: `EXPO_PUBLIC_ENV=production` gesetzt?
2. Check: `EXPO_PUBLIC_FEATURE_DEBUG_SCREEN=false` gesetzt?
3. Rebuild mit korrekter Config
4. Verify: `env.isProduction === true`

## 📱 Installation von Builds

### Development APK (direkt installierbar)

```bash
# Nach Build-Completion
# 1. Download APK von EAS Dashboard
# 2. Auf Gerät via ADB installieren:
adb install app-development.apk

# Oder via QR-Code von EAS scannen
```

### Production AAB (Play Store)

```bash
# Automatisch via EAS Submit
eas submit --platform android --profile production

# Oder manuell in Play Console hochladen
```

## 🔐 Security Notes

### Production Builds

- ✅ Debug-Screen ist IMMER deaktiviert
- ✅ Verbose Logging ist suppressed
- ✅ Mock AI Responses sind deaktiviert
- ✅ Firebase Config wird validiert
- ✅ Fail-fast bei fehlender Config

### Secrets Management

**NIEMALS:**
- Firebase Keys in Git committen
- API Keys in Code hardcoden
- Service Account Keys in Repository

**IMMER:**
- Secrets via EAS Secrets (`eas secret:create`)
- `.env` in `.gitignore`
- Service Account JSON außerhalb von Git

## 🚀 Automated Build (CI/CD)

### GitHub Actions Example

```yaml
name: EAS Build

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install -g eas-cli
      - run: eas build --platform android --profile production --non-interactive
        env:
          EXPO_TOKEN: ${{ secrets.EXPO_TOKEN }}
```

## 📊 Build Artifacts

### APK (Development/Preview)

- **Größe:** ~50-80 MB
- **Installierbar:** Direkt auf Geräten
- **Use Case:** Internal Testing, Beta

### AAB (Production)

- **Größe:** ~30-50 MB
- **Installierbar:** Nur via Play Store
- **Use Case:** Production Release
- **Vorteil:** Optimiert für verschiedene Geräte-Konfigurationen

## 📈 Build History & Monitoring

```bash
# Alle Builds anzeigen
eas build:list --platform android

# Builds für spezifisches Profil
eas build:list --platform android --profile production

# Build-Details
eas build:view [BUILD_ID]

# Build-Logs
eas build:view [BUILD_ID] --logs
```

## ✅ Quick Commands Reference

| Befehl | Zweck |
|--------|-------|
| `eas build --platform android --profile development` | Development APK (intern) |
| `eas build --platform android --profile preview` | Preview APK (staging) |
| `eas build --platform android --profile production` | Production AAB (Play Store) |
| `eas submit --platform android --profile production` | Zu Play Store submitten |
| `eas build:list` | Build-Historie anzeigen |
| `eas secret:list` | Secrets anzeigen |
| `eas secret:create` | Secret hinzufügen |

---

**Version:** 1.0.0  
**Platform:** Android (iOS analog)  
**Build System:** Expo EAS  
**Status:** Production-Ready ✅








