# 🧹 E-Mail Duplikate bereinigen

## Schnellanleitung

### Schritt 1: Dependencies installieren (einmalig)

```powershell
cd scripts
npm install
```

### Schritt 2: Admin-Zugangsdaten setzen

#### Option A: PowerShell
```powershell
cd scripts
$env:ADMIN_EMAIL="ihre-admin@email.de"
$env:ADMIN_PASSWORD="IhrPasswort"
npm run cleanup-duplicates
```

#### Option B: Batch-Datei (Windows)
```cmd
cd scripts
set ADMIN_EMAIL=ihre-admin@email.de
set ADMIN_PASSWORD=IhrPasswort
run-cleanup.bat
```

### Schritt 3: Ergebnisse überprüfen

Das Script zeigt:
- Anzahl der gefundenen E-Mails
- Anzahl der gefundenen Duplikate
- Anzahl der gelöschten Duplikate

## ✅ Was wurde heute deployed?

### 1. Firestore-Indexes ✅
- Neuer Index für die Duplikatsprüfung erstellt

### 2. Cloud Functions ✅
- **71 Functions erfolgreich deployed**
- `imapPollJob` - Mit Duplikatsprüfung aktualisiert
- `syncEmailAccount` - Mit Duplikatsprüfung aktualisiert
- `cleanupDuplicateEmails` - **NEU** - Bereinigt bestehende Duplikate

### 3. Duplikatsprüfung aktiviert ✅
Jede neue E-Mail wird jetzt vor dem Speichern geprüft:
- Prüfung auf `accountId` + `providerMessageId`
- Bereits vorhandene E-Mails werden übersprungen
- Log-Eintrag: "Email already exists, skipping"

## 🔍 Monitoring

### Logs überprüfen
```powershell
firebase functions:log --only imapPollJob
```

Sie sollten Einträge wie diese sehen:
```
Email already exists (providerMessageId: 12345), skipping
```

### Function Status überprüfen
```powershell
firebase functions:list
```

## 📊 Erwartete Ergebnisse

Nach dem Cleanup sollten Sie sehen:
- Keine Duplikate mehr in der `emails` Collection
- Jede eindeutige E-Mail nur einmal vorhanden
- Zugehörige `emailSummaries` und `emailAttachments` bereinigt

## ❓ Häufige Probleme

### "Permission denied"
**Lösung:** Ihr Benutzer muss Admin-Rechte haben
- Prüfen Sie in Firestore: `users/{uid}/role` = `'admin'`

### "Cannot find module"
**Lösung:** Dependencies installieren
```powershell
cd scripts
npm install
```

### "User not found"
**Lösung:** Überprüfen Sie die E-Mail-Adresse

### "Wrong password"
**Lösung:** Überprüfen Sie das Passwort

## 🔒 Sicherheit

⚠️ **WICHTIG:**
- Verwenden Sie niemals Produktions-Credentials in Code-Dateien
- Nutzen Sie immer Umgebungsvariablen
- Das Script läuft nur für Admin-Benutzer
- Erstellen Sie bei Bedarf vorher ein Backup

## 📝 Nächste Schritte

1. **Cleanup ausführen** (siehe Schnellanleitung oben)
2. **Logs überprüfen** um zu sehen, dass keine neuen Duplikate erstellt werden
3. **Optional:** Häufigkeit der IMAP-Abfrage anpassen (aktuell: alle 15 Minuten)

## 💡 Support

Bei Fragen oder Problemen:
1. Prüfen Sie die Firebase Functions Logs
2. Prüfen Sie die Firestore-Indexes (müssen "Enabled" sein)
3. Schauen Sie in `EMAIL_DUPLICATE_FIX.md` für Details








