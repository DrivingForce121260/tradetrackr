# Automatisches APK Build-System

Dieses System baut automatisch ein Production APK nach jeder Änderungssession.

## 🚀 Schnellstart

### Manueller Build nach Änderungen
```powershell
.\build-after-changes.ps1
```

oder

```bash
npm run build:android:auto
```

### Watch-Modus (automatischer Build bei Dateiänderungen)
```powershell
.\auto-build-apk.ps1 -Watch
```

oder

```bash
npm run build:android:watch
```

## 📋 Verfügbare Scripts

### 1. `auto-build-apk.ps1`
Haupt-Build-Script mit folgenden Optionen:

**Optionen:**
- `-Watch`: Überwacht `src/` Verzeichnis und baut automatisch bei Änderungen
- `-Clean`: Bereinigt vorherige Builds vor dem neuen Build

**Beispiele:**
```powershell
# Einmaliger Build
.\auto-build-apk.ps1

# Build mit Clean
.\auto-build-apk.ps1 -Clean

# Watch-Modus (läuft kontinuierlich)
.\auto-build-apk.ps1 -Watch
```

### 2. `build-after-changes.ps1`
Einfaches Wrapper-Script für manuelle Builds nach Änderungen.

```powershell
.\build-after-changes.ps1
```

### 3. NPM Scripts
```bash
# Automatischer Build
npm run build:android:auto

# Watch-Modus
npm run build:android:watch

# Manueller Release Build
npm run build:android:release
```

## 🔄 Automatische Builds

### Git Hook (post-commit)
Ein Git Hook wurde erstellt, der automatisch ein APK baut, wenn Mobile App-Dateien geändert wurden:

**Aktivierung:**
Der Hook ist bereits unter `.git/hooks/post-commit` erstellt. Er wird automatisch ausgeführt, wenn:
- Dateien in `src/` geändert wurden
- Dateien in `android/` geändert wurden
- `package.json` geändert wurde

**Manuelle Aktivierung (falls nötig):**
```bash
chmod +x .git/hooks/post-commit
```

### Cursor Integration
Um automatische Builds nach jeder Änderungssession zu aktivieren, können Sie:

1. **Manuell nach jeder Session:**
   ```powershell
   .\build-after-changes.ps1
   ```

2. **Watch-Modus aktivieren:**
   ```powershell
   .\auto-build-apk.ps1 -Watch
   ```
   Dies überwacht kontinuierlich Änderungen und baut automatisch.

3. **In Cursor Settings:**
   Sie können ein Custom Command hinzufügen, das nach jeder Session ausgeführt wird.

## 📁 APK Speicherort

Nach erfolgreichem Build finden Sie die APK im Projekt-Root:

```
TradeTrackr-Mobile-v1.0-Release-[TIMESTAMP].apk
```

Beispiel: `TradeTrackr-Mobile-v1.0-Release-20251113-121307.apk`

## ⚙️ Konfiguration

### Environment Variables
Das Script setzt automatisch:
- `EXPO_PUBLIC_ENV=production`
- `EXPO_PUBLIC_FEATURE_DEBUG_SCREEN=false`

### Build-Optionen
- **Signiert:** Ja (Release-Keystore)
- **Build-Typ:** Production Release
- **Optimiert:** Ja

## 🐛 Troubleshooting

### Build schlägt fehl
1. Prüfen Sie, ob Android SDK installiert ist
2. Prüfen Sie, ob alle Dependencies installiert sind: `npm install`
3. Prüfen Sie die Gradle-Logs in `android/`

### APK nicht gefunden
- Prüfen Sie `android/app/build/outputs/apk/release/`
- Das Script kopiert die APK automatisch ins Root-Verzeichnis

### Watch-Modus funktioniert nicht
- Stellen Sie sicher, dass PowerShell die Berechtigung hat, FileSystemWatcher zu verwenden
- Prüfen Sie, ob das `src/` Verzeichnis existiert

## 📝 Best Practices

1. **Nach jeder größeren Änderung:** Führen Sie `.\build-after-changes.ps1` aus
2. **Während aktiver Entwicklung:** Verwenden Sie den Watch-Modus
3. **Vor Deployment:** Führen Sie einen Clean Build aus: `.\auto-build-apk.ps1 -Clean`

## 🔗 Verwandte Dokumentation

- `BUILD_LOCAL_APK.md` - Detaillierte Build-Anleitung
- `BUILD_PRODUCTION_APK.md` - EAS Build-Anleitung (nicht mehr verwendet)






