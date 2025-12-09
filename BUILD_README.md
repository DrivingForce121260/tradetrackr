# 📱 TradeTrackr Field App - Build Quick Start

Schnelleinstieg für Android-Builds via Expo EAS.

## ⚡ Quick Commands

```bash
# 1. EAS CLI installieren (einmalig)
npm install -g eas-cli

# 2. Bei Expo anmelden
eas login

# 3. Secrets konfigurieren (einmalig)
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_API_KEY --value "your_key"
# ... weitere Secrets (siehe BUILD_GUIDE.md)

# 4. Development Build (APK, direkt installierbar)
eas build --platform android --profile development

# 5. Production Build (AAB, für Play Store)
eas build --platform android --profile production

# 6. Zu Play Store submitten
eas submit --platform android --profile production
```

## 📦 Build Profiles

| Profile | Output | Zweck | Debug Screen |
|---------|--------|-------|-------------|
| **development** | APK | Internes Testing | ✅ Verfügbar |
| **preview** | APK | Staging/UAT | ⚠️ Optional |
| **production** | AAB | Play Store | ❌ Deaktiviert |

## ⚙️ Configuration

### Environment Variables (erforderlich)

Entweder via `.env` Datei oder EAS Secrets:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=...
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
EXPO_PUBLIC_FIREBASE_APP_ID=...
EXPO_PUBLIC_AI_ENDPOINT=https://...
```

### EAS Secrets (empfohlen für Production)

```bash
# Alle erforderlichen Secrets setzen
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_API_KEY --value "AIza..."
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN --value "project.firebaseapp.com"
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_PROJECT_ID --value "project-id"
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET --value "project.appspot.com"
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID --value "123456"
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_APP_ID --value "1:123456:web:abc"
eas secret:create --scope project --name EXPO_PUBLIC_AI_ENDPOINT --value "https://..."

# Secrets überprüfen
eas secret:list
```

## ✅ Pre-Build Checklist

- [ ] TypeScript kompiliert: `npm run type-check`
- [ ] Alle Dependencies installiert: `npm install`
- [ ] EAS CLI installiert: `eas --version`
- [ ] Bei Expo angemeldet: `eas whoami`
- [ ] Environment Variables gesetzt (`.env` oder EAS Secrets)
- [ ] `app.json` konfiguriert (Package Name, Version)
- [ ] Code committed (für Build-Nachvollziehbarkeit)

## 🔒 Production Build Sicherheit

**Automatisch in Production Builds:**
- ✅ Debug-Screen ist **immer deaktiviert** (via `eas.json`)
- ✅ `EXPO_PUBLIC_ENV=production` gesetzt
- ✅ `EXPO_PUBLIC_FEATURE_DEBUG_SCREEN=false` forced
- ✅ Production Config wird validiert (fail-fast)
- ✅ Verbose Logging ist suppressed
- ✅ Mock AI Responses sind deaktiviert

**Guards in Code:**
- ✅ `featureFlags.debugScreen` forced zu `false` wenn `EXPO_PUBLIC_ENV=production`
- ✅ `DebugScreen.tsx` zeigt Error wenn production
- ✅ `env.ts` validiert alle required vars in production
- ✅ `logger.ts` suppressed verbose output in production

## 📊 Build Monitoring

```bash
# Build-Status live verfolgen
eas build:list

# Spezifischen Build inspizieren
eas build:view [BUILD_ID]

# Build-Logs anzeigen
eas build:view [BUILD_ID] --logs
```

## 🐛 Troubleshooting

### Build schlägt fehl

```bash
# Cache löschen und neu bauen
eas build --platform android --profile production --clear-cache

# Logs prüfen
eas build:view [BUILD_ID] --logs
```

### "Missing environment variable"

```bash
# Prüfen welche Secrets gesetzt sind
eas secret:list

# Fehlende Secrets hinzufügen
eas secret:create --scope project --name MISSING_VAR --value "value"
```

### App startet nicht nach Installation

1. Check: Alle EXPO_PUBLIC_* Variablen korrekt?
2. Check: Firebase Config identisch mit Portal?
3. Run: Development Build mit Debug-Screen
4. Check: Health Check im Debug-Screen

## 📚 Weitere Dokumentation

- **Vollständige Build-Anleitung:** `BUILD_GUIDE.md`
- **Deployment-Prozess:** `DEPLOYMENT_GUIDE.md`
- **Production Checklist:** `CHECKLIST.md`

---

**Quick Start:** `eas build --platform android --profile production`

**Status:** Production-Ready ✅








