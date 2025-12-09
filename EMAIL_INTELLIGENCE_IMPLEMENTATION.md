# 📧 TradeTrackr Email Intelligence Agent - Implementierung

## ✅ Implementierungsstatus: Abgeschlossen

Das Email Intelligence Agent System wurde erfolgreich in TradeTrackr integriert.

---

## 🏗️ Architektur-Übersicht

### Backend (Firebase Cloud Functions)

```
functions/src/emailIntelligence/
├── types.ts                      # TypeScript Typdefinitionen
├── connectors/
│   ├── base.ts                  # Abstract Base Connector
│   ├── gmail.ts                 # Gmail API Connector
│   ├── microsoft365.ts          # Microsoft Graph Connector
│   ├── imap.ts                  # IMAP Connector (Placeholder)
│   └── index.ts                 # Connector Exports
├── llmAnalysis.ts               # Gemini AI Integration
├── processEmail.ts              # Email Processing Pipeline
├── handlers.ts                  # Cloud Function Handlers
└── index.ts                     # Main Exports
```

### Frontend

**Web Portal:**
```
src/
├── types/email.ts               # Frontend TypeScript Types
├── services/emailIntelligenceService.ts
├── hooks/useEmailIntelligence.ts
└── components/
    ├── SmartInbox.tsx           # Email List View
    └── EmailDetailDrawer.tsx    # Email Detail Drawer
```

**Mobile App:**
```
apps/tt-scan/src/screens/
├── SmartInbox.tsx               # Mobile Inbox
└── EmailDetail.tsx              # Mobile Detail View
```

---

## 📊 Firestore Datenmodell

### Collections

#### 1. `emailAccounts/{accountId}`
Verbundene E-Mail-Konten pro Organisation.

```typescript
{
  orgId: string;
  provider: 'gmail' | 'm365' | 'imap';
  emailAddress: string;
  oauthRef: string;              // Referenz zu verschlüsselten Token
  syncState?: {
    historyId?: string;          // Gmail
    deltaToken?: string;         // Microsoft 365
    lastSyncedAt?: Timestamp;
  };
  active: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### 2. `incomingEmails/{emailId}`
Eingehende E-Mails (vollständiger Inhalt).

```typescript
{
  orgId: string;
  accountId: string;
  provider: 'gmail' | 'm365' | 'imap';
  providerMessageId: string;
  threadId: string;
  from: string;
  to: string[];
  cc: string[];
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  receivedAt: Timestamp;
  hasAttachments: boolean;
  category?: EmailCategory;
  categoryConfidence?: number;
  processed: boolean;
  createdAt: Timestamp;
}
```

#### 3. `emailAttachments/{attachmentId}`
E-Mail-Anhänge mit Metadaten.

```typescript
{
  orgId: string;
  emailId: string;
  fileName: string;
  mimeType: string;
  storagePath: string;           // `emails/{orgId}/{emailId}/{fileName}`
  docType?: 'INVOICE' | 'PO' | 'CONTRACT' | 'ID' | 'OTHER';
  metadata?: Record<string, any>;
  linkedDocumentId?: string;
  createdAt: Timestamp;
}
```

#### 4. `emailSummaries/{emailId}`
KI-generierte Zusammenfassungen für Smart Inbox.

```typescript
{
  orgId: string;
  emailId: string;
  category: EmailCategory;
  summaryBullets: string[];
  priority: 'high' | 'normal' | 'low';
  status: 'open' | 'in_progress' | 'done';
  assignedTo?: string | null;
  createdAt: Timestamp;
}
```

---

## 🔐 Sicherheit & Multi-Tenancy

### Firestore Security Rules

```javascript
// Email Accounts - Nur Admin/Office
match /emailAccounts/{accountId} {
  allow read: if isAuthenticated() && (isAdmin() || isOffice()) && 
    sameConcern(resource.data.orgId);
  allow write: if isAuthenticated() && (isAdmin() || isOffice());
}

// Incoming Emails - Alle im gleichen Org
match /incomingEmails/{emailId} {
  allow read: if isAuthenticated() && sameConcern(resource.data.orgId);
  allow write: if false; // Nur Backend
}

// Email Summaries - Update für Status/Zuweisung erlaubt
match /emailSummaries/{emailId} {
  allow read: if isAuthenticated() && sameConcern(resource.data.orgId);
  allow update: if isAuthenticated() && sameConcern(resource.data.orgId) && 
    !request.resource.data.diff(resource.data).affectedKeys()
      .hasAny(['orgId', 'emailId', 'category', 'summaryBullets', 'priority']);
}
```

### Storage Security Rules

```javascript
match /emails/{orgId}/{emailId}/{fileName} {
  allow read: if isOrgUser(orgId);
  allow write: if isOrgService();
}
```

---

## 🔌 Email-Konnektoren

### 1. Gmail Connector (`GmailConnector`)

**Features:**
- OAuth2 Authentifizierung
- Gmail API Integration
- History API für inkrementelle Synchronisation
- Pub/Sub Webhook-Support

**Implementierung:**
```typescript
const connector = new GmailConnector(accountId, orgId, accessToken);
const messages = await connector.fetchNewMessages({ historyId });
```

### 2. Microsoft 365 Connector (`Microsoft365Connector`)

**Features:**
- Microsoft Graph API
- Delta Query für Änderungen
- Change Notifications (Webhooks)
- Automatische Paginierung

**Implementierung:**
```typescript
const connector = new Microsoft365Connector(accountId, orgId, accessToken);
const messages = await connector.fetchNewMessages({ deltaToken });
```

### 3. IMAP Connector (`ImapConnector`)

**Status:** Basis-Implementierung (Placeholder)
**TODO:** Vollständige IMAP-Integration mit node-imap

---

## 🤖 LLM-Integration (Gemini AI)

### Funktionen

**Email-Analyse:**
- Kategorisierung (8 Kategorien)
- Prioritätseinstufung
- Dokumenttyp-Erkennung
- Zusammenfassung (3 Bullet Points)

### Prompt Engineering

```typescript
const prompt = `
Analyze this email and provide structured JSON:

SUBJECT: ${subject}
BODY: ${bodyText}
ATTACHMENTS: ${attachmentList}

OUTPUT:
{
  "category": "INVOICE" | "ORDER" | "SHIPPING" | ...,
  "confidence": 0.0-1.0,
  "document_types": ["INVOICE", ...],
  "summary_bullets": ["..."],
  "priority": "high" | "normal" | "low"
}
`;
```

### Fehlerbehandlung

- **Retry-Logik:** Bei JSON-Parsing-Fehlern
- **Fallback:** Standardwerte bei LLM-Ausfall
- **Validation:** Strikte Schema-Validierung

---

## ⚡ Cloud Functions

### 1. `gmailWebhook` (Pub/Sub)
- **Trigger:** Gmail Pub/Sub Topic
- **Region:** europe-west1
- **Funktion:** Verarbeitet Gmail Push-Benachrichtigungen

### 2. `m365Webhook` (HTTPS)
- **Trigger:** HTTP POST
- **Region:** europe-west1
- **Funktion:** Microsoft Graph Change Notifications

### 3. `imapPollJob` (Scheduled)
- **Trigger:** Cron (alle 15 Minuten)
- **Region:** europe-west1
- **Funktion:** Polling für IMAP-Konten

### 4. `syncEmailAccount` (Callable)
- **Trigger:** Client-Aufruf
- **Region:** europe-west1
- **Funktion:** Manuelle Synchronisation

---

## 🎨 UI-Komponenten

### Web Portal

#### SmartInbox Component
**Features:**
- Filtert nach Kategorie, Status, Priorität
- Live-Updates via Firestore Subscriptions
- Status-Änderungen direkt aus der Liste
- Detail-Drawer für vollständige Ansicht

**Verwendung:**
```tsx
import SmartInbox from '@/components/SmartInbox';

<SmartInbox />
```

#### EmailDetailDrawer Component
**Features:**
- Vollständige E-Mail-Ansicht
- Anhang-Liste mit Download
- Status-Änderung
- Zuweisung an Benutzer

---

### Mobile App (React Native)

#### SmartInbox Screen
**Features:**
- Native iOS/Android-Design
- Horizontale Filter-Chips
- Pull-to-Refresh
- Touch-optimierte Karten

**Navigation:**
```typescript
navigation.navigate('SmartInbox');
```

#### EmailDetail Screen
**Features:**
- Vollbildansicht
- Attachment-Vorschau
- Status-Buttons
- Zurück-Navigation

---

## 📈 Performance-Optimierung

### Firestore Indexes

Erstellt für optimale Query-Performance:

```json
{
  "collectionGroup": "emailSummaries",
  "fields": [
    { "fieldPath": "orgId", "order": "ASCENDING" },
    { "fieldPath": "category", "order": "ASCENDING" },
    { "fieldPath": "priority", "order": "ASCENDING" },
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

### Batch-Verarbeitung

E-Mails werden in Batches von 5 parallel verarbeitet:

```typescript
const batchSize = 5;
for (let i = 0; i < emails.length; i += batchSize) {
  const batch = emails.slice(i, i + batchSize);
  await Promise.all(batch.map(email => processEmail(email)));
}
```

---

## 🚀 Deployment

### Voraussetzungen

1. **Dependencies installieren:**
```bash
cd functions
npm install
```

2. **Gemini API Key konfigurieren:**
```bash
# Lokal (.env Datei)
echo "GEMINI_API_KEY=your_key_here" > functions/.env

# Production (Firebase Config)
firebase functions:config:set gemini.api_key="your_key_here"
```

3. **Firestore Indexes deployen:**
```bash
firebase deploy --only firestore:indexes
```

4. **Security Rules deployen:**
```bash
firebase deploy --only firestore:rules
firebase deploy --only storage:rules
```

5. **Cloud Functions deployen:**
```bash
firebase deploy --only functions
```

---

## 🔧 Konfiguration

### Gmail Setup

1. **Google Cloud Console:**
   - Gmail API aktivieren
   - OAuth 2.0 Credentials erstellen
   - Pub/Sub Topic erstellen: `gmail-notifications`

2. **Webhook registrieren:**
```bash
gcloud pubsub subscriptions create gmail-webhook \
  --topic=gmail-notifications \
  --push-endpoint=https://your-project.cloudfunctions.net/gmailWebhook
```

### Microsoft 365 Setup

1. **Azure AD Portal:**
   - App Registration erstellen
   - Microsoft Graph Permissions: `Mail.Read`, `Mail.ReadWrite`
   - Webhook-URL konfigurieren

2. **Subscription erstellen:**
```http
POST https://graph.microsoft.com/v1.0/subscriptions
{
  "changeType": "created",
  "notificationUrl": "https://your-project.cloudfunctions.net/m365Webhook",
  "resource": "/me/messages",
  "expirationDateTime": "2024-12-31T23:59:00Z"
}
```

---

## 📝 API-Verwendung

### Frontend: Email-Daten abrufen

```typescript
import { useEmailSummaries } from '@/hooks/useEmailIntelligence';

function MyComponent() {
  const { summaries, loading } = useEmailSummaries(orgId, {
    category: 'INVOICE',
    status: 'open',
  });

  return (
    <div>
      {summaries.map(summary => (
        <EmailCard key={summary.id} summary={summary} />
      ))}
    </div>
  );
}
```

### Backend: Manueller Sync

```typescript
import { httpsCallable } from 'firebase/functions';

const syncEmailAccount = httpsCallable(functions, 'syncEmailAccount');
const result = await syncEmailAccount({ accountId: 'abc123' });
console.log('Synced:', result.data.messageCount, 'messages');
```

---

## 🧪 Testing

### Unit Tests (TODO)

```bash
cd functions
npm test
```

### Integration Tests (TODO)

```bash
firebase emulators:start
npm run test:integration
```

---

## 📊 Kategorien & Labels

### Email-Kategorien

| Kategorie | Beschreibung | Farbe |
|-----------|-------------|-------|
| `INVOICE` | Rechnungen, Zahlungsaufforderungen | Rot |
| `ORDER` | Bestellungen, Aufträge | Blau |
| `SHIPPING` | Lieferbenachrichtigungen | Grün |
| `CLAIM` | Reklamationen, Gewährleistung | Orange |
| `COMPLAINT` | Beschwerden | Lila |
| `KYC` | Ausweisdokumente, Compliance | Gelb |
| `GENERAL` | Allgemeine Korrespondenz | Grau |
| `SPAM` | Werbung, Unwichtig | Dunkelrot |

### Dokument-Typen

- `INVOICE` - Rechnungsdokumente
- `PO` - Purchase Orders
- `CONTRACT` - Verträge, Vereinbarungen
- `ID` - Ausweisdokumente
- `OTHER` - Sonstige

---

## 🐛 Bekannte Einschränkungen

1. **IMAP Connector:** Nur Basis-Implementierung
2. **Token Refresh:** OAuth-Token-Refresh muss noch implementiert werden
3. **Attachment Download:** Frontend-Download-Funktionalität fehlt noch
4. **Org-ID Mapping:** Mobile App muss noch an User-Profile angebunden werden

---

## 🔜 Nächste Schritte

### Phase 2 (Optional):

1. **OAuth Token Management:**
   - Automatischer Token-Refresh
   - Google Secret Manager Integration

2. **Erweiterte Features:**
   - E-Mail-Antworten aus der App
   - Attachment-Vorschau
   - Suche in E-Mails

3. **Integrationen:**
   - Automatisches Anlegen von Dokumenten
   - Verknüpfung mit Projekten
   - Workflow-Automatisierung

4. **Monitoring:**
   - Error Tracking
   - Performance Metrics
   - Usage Analytics

---

## 📞 Support & Dokumentation

### Weitere Dokumentation:
- `GEMINI_API_SETUP_QUICK_START.md` - Gemini API Setup
- `FIRESTORE_COLLECTIONS_MAPPING.md` - Collections-Übersicht
- `FIRESTORE_SETUP.md` - Firestore-Konfiguration

### API-Referenzen:
- [Gmail API](https://developers.google.com/gmail/api)
- [Microsoft Graph API](https://docs.microsoft.com/en-us/graph/api/overview)
- [Gemini API](https://ai.google.dev/docs)

---

## ✅ Checkliste für Go-Live

- [x] TypeScript-Typen definiert
- [x] Cloud Functions implementiert
- [x] Email-Konnektoren (Gmail, M365)
- [x] LLM-Integration (Gemini)
- [x] Firestore Security Rules
- [x] Storage Rules
- [x] Firestore Indexes
- [x] Web Portal UI
- [x] Mobile App UI
- [ ] Dependencies installieren (`npm install` in functions/)
- [ ] Gemini API Key konfigurieren
- [ ] Gmail OAuth Setup
- [ ] M365 OAuth Setup
- [ ] Firestore Indexes deployen
- [ ] Security Rules deployen
- [ ] Cloud Functions deployen
- [ ] Integration testen

---

**Implementiert am:** 7. November 2025  
**Implementiert von:** TradeTrackr Email Intelligence Agent Builder (AI Assistant)  
**Version:** 1.0.0









