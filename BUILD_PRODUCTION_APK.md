# Production APK Build - Schnellstart

## Voraussetzungen

1. **EAS CLI installiert:**
   ```bash
   npm install -g eas-cli
   ```

2. **Bei Expo anmelden:**
   ```bash
   eas login
   ```

3. **Environment Variables konfiguriert:**
   - Entweder `.env` Datei im Root erstellen
   - Oder EAS Secrets setzen (empfohlen für Production)

## Build starten

### Option 1: Production APK (empfohlen)
```bash
eas build --platform android --profile production-apk
```

### Option 2: Production APK (für Store)
```bash
eas build --platform android --profile production
```

### Option 3: Preview APK (für Testing)
```bash
eas build --platform android --profile preview
```

## Environment Variables setzen (EAS Secrets)

Falls Sie noch keine Secrets gesetzt haben:

```bash
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_API_KEY --value "YOUR_KEY"
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN --value "YOUR_DOMAIN"
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_PROJECT_ID --value "YOUR_PROJECT_ID"
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET --value "YOUR_BUCKET"
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID --value "YOUR_SENDER_ID"
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_APP_ID --value "YOUR_APP_ID"
```

## Build-Status prüfen

```bash
eas build:list
```

## Build herunterladen

Nach erfolgreichem Build erhalten Sie:
- E-Mail-Benachrichtigung von EAS
- Download-Link in der E-Mail
- Oder: `eas build:list` zeigt den Download-Link

## Troubleshooting

### "Not logged in"
```bash
eas login
```

### "Missing environment variable"
Setzen Sie die fehlenden Secrets (siehe oben) oder erstellen Sie eine `.env` Datei.

### Build schlägt fehl
Prüfen Sie die Build-Logs:
```bash
eas build:view [BUILD_ID]
```






