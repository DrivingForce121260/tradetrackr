# Lokaler Production APK Build - Anleitung

## Voraussetzungen

1. **Android SDK installiert**
   - Android Studio installieren
   - Oder nur Android SDK Command Line Tools
   - `ANDROID_HOME` Umgebungsvariable setzen (optional)

2. **Java JDK installiert**
   - JDK 17 oder höher
   - `JAVA_HOME` Umgebungsvariable setzen

3. **Node.js und npm installiert**
   - Node.js 18+ empfohlen

4. **Environment Variables**
   - `.env` Datei im Root erstellen mit allen Firebase-Variablen

## Schnellstart

### Option 1: PowerShell Script (empfohlen)
```powershell
.\build-local-apk.ps1
```

### Option 2: NPM Script
```bash
npm run build:android:local
```

### Option 3: Direkt mit Gradle
```bash
cd android
.\gradlew.bat assembleRelease
```

## Environment Variables (.env)

Erstellen Sie eine `.env` Datei im Projekt-Root:

```env
EXPO_PUBLIC_ENV=production
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_domain
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_bucket
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
EXPO_PUBLIC_FEATURE_DEBUG_SCREEN=false
```

## Build-Typen

### Release APK (Production)
- Signiert mit Release-Keystore
- Optimiert und minifiziert
- Für Production-Installation

```bash
cd android
.\gradlew.bat assembleRelease
```

### Debug APK (Testing)
- Signiert mit Debug-Keystore
- Nicht optimiert
- Für Development/Testing

```bash
cd android
.\gradlew.bat assembleDebug
```

## APK Speicherort

Nach erfolgreichem Build finden Sie die APK unter:

**Release:**
- `android/app/build/outputs/apk/release/app-release.apk`
- Kopiert nach: `TradeTrackr-Mobile-v1.0-Release-[timestamp].apk`

**Debug:**
- `android/app/build/outputs/apk/debug/app-debug.apk`
- Kopiert nach: `TradeTrackr-Mobile-v1.0-Debug-[timestamp].apk`

## Troubleshooting

### "Gradle Wrapper nicht gefunden"
```bash
npx expo prebuild --platform android
```

### "Android SDK nicht gefunden"
- Installieren Sie Android Studio
- Oder setzen Sie `ANDROID_HOME` Umgebungsvariable

### "Java nicht gefunden"
- Installieren Sie JDK 17+
- Setzen Sie `JAVA_HOME` Umgebungsvariable

### "Build fehlgeschlagen"
- Prüfen Sie die Gradle-Logs
- Stellen Sie sicher, dass alle Dependencies installiert sind: `npm install`
- Clean Build: `cd android && .\gradlew.bat clean`

### "Keystore nicht gefunden"
Das Script erstellt automatisch einen Release-Keystore, falls keiner vorhanden ist.

## Signing-Konfiguration

Die App verwendet bereits einen Release-Keystore:
- **Pfad:** `android/app/release.keystore`
- **Alias:** `tradetrackr-release`
- **Passwort:** `tradetrackr2024`

⚠️ **WICHTIG:** Bewahren Sie den Keystore sicher auf! Ohne ihn können Sie keine Updates der App veröffentlichen.

## Installation auf Gerät

1. APK auf Android-Gerät kopieren
2. Auf Gerät: Einstellungen → Sicherheit → "Unbekannte Quellen" aktivieren
3. APK öffnen und installieren






