# 🚀 Email Intelligence Agent - Setup-Anleitung

## Schnellstart

Diese Anleitung führt Sie durch die Einrichtung des Email Intelligence Agent Systems.

---

## Schritt 1: Dependencies installieren

```bash
# Backend Dependencies
cd functions
npm install

# Zurück zum Root
cd ..
```

**Neue Dependencies:**
- `googleapis` - Gmail API Client
- `node-fetch` - HTTP Client für Microsoft Graph
- `uuid` - Eindeutige IDs generieren

---

## Schritt 2: Gemini API Key konfigurieren

### Option A: Lokale Entwicklung

Erstellen Sie eine `.env` Datei in `functions/`:

```bash
cd functions
echo "GEMINI_API_KEY=your_api_key_here" > .env
```

**API Key erhalten:**
1. Besuchen Sie: https://aistudio.google.com/app/apikey
2. Erstellen Sie einen neuen API Key
3. Kopieren Sie den Key in die `.env` Datei

### Option B: Production Deployment

```bash
cd functions
firebase functions:config:set gemini.api_key="your_api_key_here"
```

---

## Schritt 3: Gmail API Setup (Optional)

### 3.1 Google Cloud Console

1. **Gehen Sie zu:** https://console.cloud.google.com/
2. **Projekt auswählen:** Ihr Firebase-Projekt
3. **APIs aktivieren:**
   - Suchen Sie nach "Gmail API"
   - Klicken Sie auf "Aktivieren"

### 3.2 OAuth 2.0 Credentials

1. **Navigieren Sie zu:** APIs & Services > Credentials
2. **Erstellen Sie OAuth 2.0 Client ID:**
   - Application Type: Web application
   - Authorized redirect URIs: Ihre Web-Portal URL

### 3.3 Pub/Sub Topic erstellen

```bash
gcloud pubsub topics create gmail-notifications
```

### 3.4 Pub/Sub Subscription (nach Function-Deployment)

```bash
gcloud pubsub subscriptions create gmail-webhook \
  --topic=gmail-notifications \
  --push-endpoint=https://YOUR_REGION-YOUR_PROJECT.cloudfunctions.net/gmailWebhook
```

---

## Schritt 4: Microsoft 365 Setup (Optional)

### 4.1 Azure AD App Registration

1. **Gehen Sie zu:** https://portal.azure.com/
2. **Navigieren Sie zu:** Azure Active Directory > App registrations
3. **Neue Registrierung:**
   - Name: TradeTrackr Email Agent
   - Supported account types: Accounts in this organizational directory only

### 4.2 API Permissions

Fügen Sie folgende Microsoft Graph Permissions hinzu:
- `Mail.Read`
- `Mail.ReadWrite` (für Status-Updates)
- Type: Delegated permissions

### 4.3 Client Secret erstellen

1. **Certificates & secrets** > **New client secret**
2. Kopieren Sie den Secret-Wert (wird nur einmal angezeigt!)

### 4.4 Webhook Subscription (nach Function-Deployment)

```http
POST https://graph.microsoft.com/v1.0/subscriptions
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "changeType": "created",
  "notificationUrl": "https://YOUR_REGION-YOUR_PROJECT.cloudfunctions.net/m365Webhook",
  "resource": "/me/messages",
  "expirationDateTime": "2024-12-31T23:59:00.0000000Z",
  "clientState": "secretClientValue"
}
```

---

## Schritt 5: Firestore Indexes deployen

```bash
firebase deploy --only firestore:indexes
```

**Warnung:** Index-Erstellung kann 5-10 Minuten dauern!

---

## Schritt 6: Security Rules deployen

```bash
# Firestore Rules
firebase deploy --only firestore:rules

# Storage Rules
firebase deploy --only storage:rules
```

---

## Schritt 7: Cloud Functions deployen

```bash
firebase deploy --only functions
```

**Deployed Functions:**
- `gmailWebhook` (Pub/Sub)
- `m365Webhook` (HTTPS)
- `imapPollJob` (Scheduled)
- `syncEmailAccount` (Callable)

**Region:** europe-west1

---

## Schritt 8: Email-Konto verbinden

### Via Firebase Console (Temporär)

Erstellen Sie manuell einen Eintrag in `emailAccounts`:

```javascript
{
  orgId: "YOUR_ORG_ID",
  provider: "gmail",
  emailAddress: "email@example.com",
  oauthRef: "encrypted_token_reference",
  syncState: {},
  active: true,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp()
}
```

### Via Admin UI (TODO - Phase 2)

Ein Admin-UI zum Verbinden von E-Mail-Konten wird in Phase 2 implementiert.

---

## Schritt 9: Ersten Sync ausführen

### Via Cloud Function

```typescript
import { httpsCallable } from 'firebase/functions';
import { functions } from './config/firebase';

const syncEmailAccount = httpsCallable(functions, 'syncEmailAccount');

const result = await syncEmailAccount({ 
  accountId: 'YOUR_ACCOUNT_ID' 
});

console.log('Synced messages:', result.data.messageCount);
```

### Via Firebase Console

Navigieren Sie zu: **Functions** > **syncEmailAccount** > **Testing**

Payload:
```json
{
  "accountId": "YOUR_ACCOUNT_ID"
}
```

---

## Schritt 10: UI testen

### Web Portal

Fügen Sie die Smart Inbox zu Ihrer Navigation hinzu:

```tsx
import SmartInbox from '@/components/SmartInbox';

// In Ihrer App-Komponente oder Router
<Route path="/smart-inbox" element={<SmartInbox />} />
```

**URL:** `http://localhost:5173/smart-inbox` (Vite Dev Server)

### Mobile App

```typescript
// In einem Screen mit Navigation
navigation.navigate('SmartInbox');
```

---

## ✅ Verifizierung

### 1. Firestore Collections prüfen

Öffnen Sie Firebase Console > Firestore Database:

- ✅ `emailAccounts` Collection existiert
- ✅ `incomingEmails` Collection existiert
- ✅ `emailAttachments` Collection existiert
- ✅ `emailSummaries` Collection existiert

### 2. Cloud Functions prüfen

```bash
firebase functions:log
```

Suchen Sie nach:
- `Email Intelligence Agent` Logs
- `Fetched X new messages`
- `LLM analysis result`

### 3. Storage prüfen

Navigieren Sie zu: **Storage** > **emails/**

Dort sollten Ordner nach `{orgId}/{emailId}/` strukturiert sein.

---

## 🐛 Troubleshooting

### Problem: "Gemini API key not configured"

**Lösung:**
```bash
cd functions
# Prüfen Sie die .env Datei
cat .env

# Oder setzen Sie die Config
firebase functions:config:set gemini.api_key="YOUR_KEY"
```

### Problem: "OAuth token expired"

**Lösung:** Token-Refresh implementieren (siehe TODO)

**Temporär:** Neues Token generieren und in `emailAccounts` aktualisieren

### Problem: Firestore Index fehlt

**Symptom:** Query-Fehler in der Console

**Lösung:**
```bash
firebase deploy --only firestore:indexes
# Warten Sie 5-10 Minuten
```

### Problem: Keine E-Mails werden abgerufen

**Checklist:**
1. ✅ Email-Konto in `emailAccounts` vorhanden?
2. ✅ `active: true` gesetzt?
3. ✅ OAuth-Token gültig?
4. ✅ Cloud Functions deployed?
5. ✅ API-Berechtigungen korrekt?

**Logs prüfen:**
```bash
firebase functions:log --only gmailWebhook
firebase functions:log --only m365Webhook
firebase functions:log --only imapPollJob
```

---

## 📊 Monitoring

### Cloud Functions Logs

```bash
# Alle Logs
firebase functions:log

# Nur Email Intelligence
firebase functions:log | grep "Email Intelligence"

# Live-Logs
firebase functions:log --follow
```

### Firestore Usage

1. **Firebase Console** > **Firestore Database**
2. **Usage** Tab
3. Prüfen Sie:
   - Document Reads
   - Document Writes
   - Index Usage

---

## 🔒 Sicherheit

### OAuth Token Speicherung

**WICHTIG:** Implementieren Sie sichere Token-Speicherung!

**Optionen:**
1. **Google Secret Manager** (Empfohlen)
2. **Verschlüsselte Firestore-Felder**
3. **Externe Key Management Services**

**TODO:** Dies ist aktuell ein Placeholder (`PLACEHOLDER_TOKEN` in `handlers.ts`)

### Firestore Rules

Prüfen Sie regelmäßig die Security Rules:

```bash
firebase deploy --only firestore:rules --dry-run
```

---

## 📚 Nächste Schritte

1. **Testen Sie die Smart Inbox** im Web Portal
2. **Testen Sie die Mobile App** auf einem Gerät/Emulator
3. **Verbinden Sie ein echtes E-Mail-Konto**
4. **Überwachen Sie die Logs** für Fehler
5. **Implementieren Sie OAuth Token Refresh** (Phase 2)

---

## 🆘 Support

Bei Problemen:

1. **Logs prüfen:** `firebase functions:log`
2. **Firestore-Daten prüfen:** Firebase Console
3. **Dependencies prüfen:** `npm list` in `functions/`
4. **Siehe:** `EMAIL_INTELLIGENCE_IMPLEMENTATION.md` für Details

---

**Version:** 1.0.0  
**Letzte Aktualisierung:** 7. November 2025









