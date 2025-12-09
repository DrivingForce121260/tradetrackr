# 🚀 Email Intelligence Agent - Deployment Guide

## Vollständige Installations- und Deployment-Anleitung

---

## ✅ Schritt 1: Dependencies installieren

```bash
# Backend Dependencies
cd functions
npm install googleapis node-fetch uuid
npm install --save-dev @types/node-fetch @types/uuid

# Zurück zum Root
cd ..
```

---

## ✅ Schritt 2: Gemini API Key konfigurieren

### Lokale Entwicklung

Die `.env` Datei wurde bereits erstellt. **Ersetzen Sie den Platzhalter:**

```bash
# Bearbeiten Sie: functions/.env
GEMINI_API_KEY=Ihr_Echter_API_Key_Hier
```

**API Key erhalten:**
1. https://aistudio.google.com/app/apikey
2. "Create API Key" klicken
3. Key kopieren und in `.env` einfügen

### Production

```bash
cd functions
firebase functions:config:set gemini.api_key="Ihr_API_Key"
```

---

## ✅ Schritt 3: Gmail OAuth konfigurieren

### 3.1 Google Cloud Console Setup

1. **Öffnen Sie:** https://console.cloud.google.com/
2. **Wählen Sie Ihr Projekt:** reportingapp817
3. **Aktivieren Sie APIs:**
   - Gmail API ✓
   - Google+ API (für Profildaten)

### 3.2 OAuth Credentials erstellen

**Navigieren Sie zu:** APIs & Services > Credentials

**Erstellen Sie OAuth 2.0 Client ID:**
- Application type: **Web application**
- Name: **TradeTrackr Email Agent**
- Authorized JavaScript origins:
  ```
  http://localhost:5173
  https://YOUR_DOMAIN.com
  ```
- Authorized redirect URIs:
  ```
  https://europe-west1-reportingapp817.cloudfunctions.net/gmailOAuthCallback
  ```

**Kopieren Sie:**
- Client ID
- Client Secret

### 3.3 Credentials konfigurieren

```bash
# Lokal (.env)
echo "GMAIL_CLIENT_ID=your_client_id" >> functions/.env
echo "GMAIL_CLIENT_SECRET=your_client_secret" >> functions/.env
echo "GMAIL_REDIRECT_URI=https://europe-west1-reportingapp817.cloudfunctions.net/gmailOAuthCallback" >> functions/.env

# Production
firebase functions:config:set gmail.client_id="your_client_id"
firebase functions:config:set gmail.client_secret="your_client_secret"
firebase functions:config:set gmail.redirect_uri="https://europe-west1-reportingapp817.cloudfunctions.net/gmailOAuthCallback"
```

### 3.4 Pub/Sub Topic erstellen

```bash
gcloud pubsub topics create gmail-notifications --project=reportingapp817
```

---

## ✅ Schritt 4: Microsoft 365 OAuth konfigurieren

### 4.1 Azure AD App Registration

1. **Öffnen Sie:** https://portal.azure.com/
2. **Navigieren Sie zu:** Azure Active Directory > App registrations
3. **Neue Registrierung:**
   - Name: **TradeTrackr Email Agent**
   - Supported account types: **Multitenant**
   - Redirect URI: `https://europe-west1-reportingapp817.cloudfunctions.net/m365OAuthCallback`

### 4.2 API Permissions hinzufügen

**Microsoft Graph - Delegated permissions:**
- `Mail.Read`
- `Mail.ReadWrite`
- `offline_access`

**Grant admin consent** für Ihre Organisation

### 4.3 Client Secret erstellen

1. **Certificates & secrets** > **New client secret**
2. **Kopieren Sie den Wert** (nur einmal sichtbar!)

### 4.4 Credentials konfigurieren

```bash
# Lokal (.env)
echo "M365_CLIENT_ID=your_app_id" >> functions/.env
echo "M365_CLIENT_SECRET=your_secret" >> functions/.env
echo "M365_REDIRECT_URI=https://europe-west1-reportingapp817.cloudfunctions.net/m365OAuthCallback" >> functions/.env

# Production
firebase functions:config:set m365.client_id="your_app_id"
firebase functions:config:set m365.client_secret="your_secret"
firebase functions:config:set m365.redirect_uri="https://europe-west1-reportingapp817.cloudfunctions.net/m365OAuthCallback"
```

---

## ✅ Schritt 5: Firestore Indexes deployen

```bash
firebase deploy --only firestore:indexes
```

**⏱️ Wartezeit:** 5-10 Minuten

**Verifizierung:**
```bash
firebase firestore:indexes
```

---

## ✅ Schritt 6: Security Rules deployen

```bash
# Firestore Rules
firebase deploy --only firestore:rules

# Storage Rules
firebase deploy --only storage:rules
```

---

## ✅ Schritt 7: Cloud Functions deployen

```bash
cd functions
npm run build
cd ..
firebase deploy --only functions
```

**Deployed Functions:**
- ✅ `gmailOAuthInit` (Callable)
- ✅ `gmailOAuthCallback` (HTTPS)
- ✅ `gmailWebhook` (Pub/Sub)
- ✅ `m365OAuthInit` (Callable)
- ✅ `m365OAuthCallback` (HTTPS)
- ✅ `m365Webhook` (HTTPS)
- ✅ `imapPollJob` (Scheduled)
- ✅ `syncEmailAccount` (Callable)
- ✅ `seedTestEmailData` (Callable)
- ✅ `deleteTestEmailData` (Callable)

**Deployment-Zeit:** 3-5 Minuten

---

## ✅ Schritt 8: Gmail Pub/Sub Subscription (nach Function-Deployment)

```bash
gcloud pubsub subscriptions create gmail-webhook-sub \
  --topic=gmail-notifications \
  --push-endpoint=https://europe-west1-reportingapp817.cloudfunctions.net/gmailWebhook \
  --project=reportingapp817
```

---

## ✅ Schritt 9: Testen Sie mit Test-Daten

### In der Smart Inbox UI:

1. **Klicken Sie auf:** "Test-Daten" (lila Button)
2. **Klicken Sie auf:** "10 Test-E-Mails erstellen"
3. **Warten Sie 2 Sekunden**
4. **Test-E-Mails erscheinen sofort!**

### Via Firebase Console:

Alternativ manuell in Firestore:
1. Collection: `emailSummaries`
2. Document ID: `test_email_1`
3. Felder wie in `EMAIL_INTELLIGENCE_IMPLEMENTATION.md` beschrieben

---

## ✅ Schritt 10: E-Mail-Konto verbinden

### In der Smart Inbox UI:

1. **Klicken Sie auf:** "E-Mail-Konto verbinden" (grüner Button)
2. **Wählen Sie Provider:** Gmail oder Microsoft 365
3. **Geben Sie E-Mail ein:** z.B. `ihre@email.de`
4. **Klicken Sie "Verbinden"**
5. **Sie werden zu Google/Microsoft weitergeleitet**
6. **Autorisieren Sie den Zugriff**
7. **Sie werden zurück zur Smart Inbox geleitet**

### Nach erfolgreicher Verbindung:

Die Smart Inbox zeigt:
- ✅ **Verbundene Konten** im "Email Account Manager"
- ✅ **Synchronisations-Status**
- ✅ **Sync-Button** (manuelles Abrufen)
- ✅ **Trennen-Button** (Konto entfernen)

---

## 🧪 Testing-Szenarien

### Test 1: Test-Daten (ohne echte E-Mails)

```
1. Smart Inbox öffnen
2. "Test-Daten" Button klicken
3. "10 Test-E-Mails erstellen"
4. → Sofort 10 Demo-E-Mails sichtbar
5. Filter testen (Kategorie, Status, Priorität)
6. E-Mail anklicken → Detail-Drawer öffnet sich
7. Status ändern → Funktioniert sofort
```

### Test 2: Gmail-Konto verbinden

```
1. Gmail OAuth in Google Cloud einrichten
2. Functions deployen
3. "E-Mail-Konto verbinden" klicken
4. Gmail auswählen
5. E-Mail eingeben
6. → Redirect zu Google
7. Autorisieren
8. → Zurück zur App
9. Konto erscheint in "Verbundene E-Mail-Konten"
10. "Sync"-Button klicken
11. → E-Mails werden abgerufen
```

### Test 3: Vollständiger Workflow

```
1. E-Mail-Konto verbunden
2. E-Mails synchronisiert
3. E-Mail in Liste sehen
4. E-Mail anklicken
5. Vollständige Details sehen
6. Anhänge sehen
7. Status ändern: "In Bearbeitung"
8. Mir zuweisen
9. Als "Erledigt" markieren
```

---

## 📊 Verifizierung

### Prüfen Sie Firestore Collections:

**Firebase Console:** https://console.firebase.google.com/u/0/project/reportingapp817/firestore

✅ Collections vorhanden:
- `emailAccounts`
- `incomingEmails`
- `emailAttachments`
- `emailSummaries`
- `_oauth_tokens` (versteckt)

### Prüfen Sie Cloud Functions:

```bash
firebase functions:list
```

Sollte zeigen:
```
✓ gmailOAuthInit (us-central1)
✓ gmailOAuthCallback (us-central1)
✓ m365OAuthInit (us-central1)
✓ m365OAuthCallback (us-central1)
✓ syncEmailAccount (us-central1)
✓ seedTestEmailData (us-central1)
...
```

### Prüfen Sie Logs:

```bash
# Live-Logs
firebase functions:log --follow

# Filter nach Email Intelligence
firebase functions:log | grep "Email"
```

---

## 🐛 Troubleshooting

### Problem: Functions deployen nicht

**Lösung:**
```bash
cd functions
npm run build
# Prüfen Sie Fehler
# Dann:
cd ..
firebase deploy --only functions
```

### Problem: OAuth Redirect funktioniert nicht

**Prüfen Sie:**
1. ✅ Redirect URI in Google Cloud Console korrekt?
2. ✅ Gleiche URI in `.env` / Firebase Config?
3. ✅ HTTPS (nicht HTTP) für Redirect URI?

### Problem: "OAuth not configured" Fehler

**Lösung:**
```bash
# Prüfen Sie Config
firebase functions:config:get

# Sollte zeigen:
{
  "gmail": {
    "client_id": "...",
    "client_secret": "...",
    "redirect_uri": "..."
  }
}

# Falls leer, nochmal setzen
firebase functions:config:set gmail.client_id="..."
```

### Problem: Keine E-Mails nach Sync

**Checklist:**
1. ✅ OAuth Token gültig? (prüfen Sie `_oauth_tokens` in Firestore)
2. ✅ Account `active: true`?
3. ✅ Gmail API aktiviert?
4. ✅ Berechtigungen korrekt?

**Logs prüfen:**
```bash
firebase functions:log --only syncEmailAccount
```

---

## 🔒 Sicherheit - Wichtig!

### OAuth Tokens

**AKTUELL:** Tokens werden in Firestore `_oauth_tokens` Collection gespeichert

**EMPFOHLEN für Production:**
Migrieren Sie zu **Google Secret Manager:**

```bash
# Secret Manager API aktivieren
gcloud services enable secretmanager.googleapis.com

# Secrets erstellen (pro Account)
gcloud secrets create email-token-{accountId} \
  --replication-policy="automatic" \
  --project=reportingapp817
```

**TODO:** Code-Update für Secret Manager in `oauth.ts` und `handlers.ts`

---

## 📈 Monitoring

### Wichtige Metriken:

1. **Function Invocations:**
   - `gmailWebhook` - Pro eingehende E-Mail
   - `syncEmailAccount` - Pro manuellem Sync
   - `seedTestEmailData` - Pro Test-Daten-Erstellung

2. **Firestore Reads/Writes:**
   - `emailSummaries` - Smart Inbox Queries
   - `incomingEmails` - Detail-Views
   - `emailAccounts` - Account-Liste

3. **Storage Usage:**
   - `emails/{orgId}/` - Attachment-Speicher

### Dashboard ansehen:

**Firebase Console:** https://console.firebase.google.com/u/0/project/reportingapp817/usage

---

## 🎉 Go-Live Checklist

- [x] Dependencies installiert
- [x] Gemini API Key konfiguriert
- [ ] Gmail OAuth konfiguriert (optional)
- [ ] M365 OAuth konfiguriert (optional)
- [x] Firestore Indexes deployed
- [x] Security Rules deployed
- [ ] Cloud Functions deployed
- [x] Test-Daten funktionieren
- [x] UI vollständig
- [x] Mobile App UI erstellt

---

## 📞 Support

**Bei Problemen:**

1. **Logs prüfen:** `firebase functions:log`
2. **Console prüfen:** Browser DevTools (F12)
3. **Firestore prüfen:** Firebase Console
4. **Dokumentation:** `EMAIL_INTELLIGENCE_IMPLEMENTATION.md`

---

**Version:** 1.0.0
**Deployment-Region:** europe-west1
**Firebase-Projekt:** reportingapp817









