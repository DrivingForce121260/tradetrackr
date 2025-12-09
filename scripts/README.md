# TradeTrackr Scripts

Utility scripts für administrative Aufgaben.

## Email Duplicate Cleanup

Bereinigt doppelte E-Mails aus der Firestore-Datenbank.

### Voraussetzungen

1. Node.js installiert
2. Admin-Benutzer mit `role: 'admin'` in Firestore
3. Firebase-Konfiguration aktualisiert

### Setup

1. **Firebase-Konfiguration aktualisieren:**
   
   Öffnen Sie `cleanup-email-duplicates.js` und ersetzen Sie:
   - `apiKey`: Ihre Firebase API Key
   - `appId`: Ihre Firebase App ID
   
   Diese Werte finden Sie in der Firebase Console unter:
   **Project Settings → General → Your apps → SDK setup and configuration**

2. **Dependencies installieren:**
   ```bash
   cd scripts
   npm install
   ```

### Ausführung

#### Option 1: Mit Umgebungsvariablen (Empfohlen)

```bash
cd scripts
ADMIN_EMAIL=admin@beispiel.de ADMIN_PASSWORD=IhrPasswort npm run cleanup-duplicates
```

#### Option 2: PowerShell (Windows)

```powershell
cd scripts
$env:ADMIN_EMAIL="admin@beispiel.de"
$env:ADMIN_PASSWORD="IhrPasswort"
npm run cleanup-duplicates
```

#### Option 3: Direkt mit Node

```bash
cd scripts
ADMIN_EMAIL=admin@beispiel.de ADMIN_PASSWORD=IhrPasswort node cleanup-email-duplicates.js
```

### Ausgabe

Das Script zeigt folgende Informationen:

```
🔧 TradeTrackr Email Duplicate Cleanup
=====================================

🔐 Signing in as admin...
✅ Signed in as: admin@beispiel.de

🧹 Starting duplicate cleanup...
This may take a few minutes depending on the number of emails.

✅ Cleanup completed successfully!

Results:
========
  Total emails:         150
  Duplicates found:     75
  Duplicates deleted:   75
  Unique emails kept:   75

🎉 Successfully removed 75 duplicate emails!
```

### Fehlerbehebung

#### "Admin credentials not provided"
Stellen Sie sicher, dass Sie die Umgebungsvariablen `ADMIN_EMAIL` und `ADMIN_PASSWORD` gesetzt haben.

#### "Permission denied"
Der verwendete Benutzer muss die Admin-Rolle haben:
- Prüfen Sie in Firestore: `users/{uid}/role` muss `'admin'` sein

#### "User not found" oder "Wrong password"
Überprüfen Sie Ihre Login-Daten.

#### "Cannot find module 'firebase'"
Führen Sie `npm install` im scripts-Verzeichnis aus.

### Sicherheitshinweise

⚠️ **WICHTIG:**
- Geben Sie niemals Ihre Credentials in den Code ein
- Verwenden Sie immer Umgebungsvariablen
- Führen Sie dieses Script nur in einer sicheren Umgebung aus
- Erstellen Sie ein Backup Ihrer Datenbank vor der Ausführung

### Was macht das Script?

1. Meldet sich als Admin-Benutzer an
2. Ruft die `cleanupDuplicateEmails` Cloud Function auf
3. Die Function:
   - Findet alle E-Mails mit gleicher `accountId` + `providerMessageId`
   - Behält die älteste Version jeder E-Mail
   - Löscht alle Duplikate
   - Löscht zugehörige `emailSummaries` und `emailAttachments`
4. Zeigt die Ergebnisse an

### Erneute Ausführung

Sie können das Script jederzeit erneut ausführen - es findet und entfernt nur tatsächliche Duplikate.








