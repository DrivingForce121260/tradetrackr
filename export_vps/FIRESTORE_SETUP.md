# 🔥 Firestore Messaging-System Setup

## Übersicht

Dieses Dokument erklärt, wie Sie das Firebase Firestore Messaging-System für TradeTrackr einrichten.

## 🚀 Schnellstart

### 1. Firebase-Projekt erstellen

1. Gehen Sie zu [Firebase Console](https://console.firebase.google.com)
2. Klicken Sie auf "Projekt hinzufügen"
3. Geben Sie einen Projektnamen ein (z.B. "tradetrackr-messaging")
4. Aktivieren Sie Google Analytics (optional)
5. Klicken Sie auf "Projekt erstellen"

### 2. Firestore Database aktivieren

1. Klicken Sie im linken Menü auf "Firestore Database"
2. Klicken Sie auf "Datenbank erstellen"
3. Wählen Sie "Testmodus starten" (für Entwicklung)
4. Wählen Sie einen Standort (z.B. "europe-west3")
5. Klicken Sie auf "Fertig"

### 3. Konfiguration kopieren

1. Klicken Sie auf das Zahnrad-Symbol (⚙️) neben "Projektübersicht"
2. Wählen Sie "Projekteinstellungen"
3. Scrollen Sie zu "Ihre Apps"
4. Klicken Sie auf das Web-Symbol (</>)
5. Geben Sie einen App-Namen ein (z.B. "tradetrackr-web")
6. Kopieren Sie die Konfiguration

### 4. Konfiguration in der App aktualisieren

Öffnen Sie `src/config/firebase.ts` und ersetzen Sie die Platzhalter:

```typescript
const firebaseConfig = {
  apiKey: "IHRE_API_KEY",
  authDomain: "ihr-projekt.firebaseapp.com",
  projectId: "ihr-projekt-id",
  storageBucket: "ihr-projekt.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};
```

### 5. Security Rules setzen

1. Gehen Sie zu "Firestore Database" → "Regeln"
2. Ersetzen Sie die Standard-Regeln durch den Inhalt von `firestore.rules`
3. Klicken Sie auf "Veröffentlichen"

### 6. Indexes erstellen

1. Gehen Sie zu "Firestore Database" → "Indexe"
2. Klicken Sie auf "Index hinzufügen"
3. Importieren Sie die `firestore.indexes.json` Datei

## 📱 App einrichten

### 1. Admin-Panel öffnen

Navigieren Sie in der App zu: `/firestore-admin`

### 2. Datenbank initialisieren

1. Geben Sie eine "Concern ID" ein (z.B. "concern123")
2. Geben Sie eine "Admin User ID" ein (z.B. Ihre User-ID)
3. Klicken Sie auf "Datenbank initialisieren"

### 3. Mitarbeiter hinzufügen

1. Geben Sie eine "Mitarbeiter ID" ein (z.B. "emp001")
2. Geben Sie einen "Mitarbeiter Namen" ein (z.B. "Max Mustermann")
3. Klicken Sie auf "Mitarbeiter hinzufügen"

## 🗄️ Datenbankstruktur

### Collections

#### `users`
```typescript
{
  uid: "user123",
  email: "user@example.com",
  displayName: "Max Mustermann",
  photoURL?: "https://...",
  status: "online" | "offline" | "away",
  lastSeen: timestamp,
  concernId: "concern123",
  role: "admin" | "user" | "manager"
}
```

#### `chats`
```typescript
{
  chatId: "chat123",
  type: "direct" | "group" | "controlling",
  name: "Chat Name",
  participants: ["user123", "user456"],
  lastMessage: {
    text: "Letzte Nachricht",
    senderId: "user123",
    timestamp: timestamp,
    messageId: "msg789"
  },
  unreadCount: {
    "user123": 0,
    "user456": 3
  },
  metadata: {
    createdBy: "user123",
    createdAt: timestamp,
    updatedAt: timestamp,
    concernId: "concern123"
  },
  groupInfo?: {
    description: "Gruppenbeschreibung",
    avatar?: "https://...",
    admins: ["user123"]
  },
  controllingInfo?: {
    requiresAction: true,
    priority: "high" | "medium" | "low",
    category: "project" | "quality" | "safety"
  }
}
```

#### `messages`
```typescript
{
  messageId: "msg789",
  chatId: "chat123",
  text: "Nachrichtentext",
  senderId: "user123",
  timestamp: timestamp,
  status: "sent" | "delivered" | "read",
  readBy: ["user456"],
  deliveredTo: ["user456"],
  controllingData?: {
    requiresAction: true,
    actionTaken: false,
    acceptedBy: [],
    priority: "high",
    deadline?: timestamp
  },
  media?: {
    type: "image" | "file" | "voice",
    url: "https://...",
    fileName?: "document.pdf",
    fileSize?: 1024
  }
}
```

#### `chat_participants`
```typescript
{
  chatId: "chat123",
  userId: "user123",
  joinedAt: timestamp,
  role: "admin" | "member",
  isActive: true,
  lastReadAt: timestamp,
  unreadCount: 0
}
```

## 🔒 Security Rules

Die Security Rules stellen sicher, dass:

- Benutzer nur ihre eigenen Daten lesen/schreiben können
- Chat-Teilnehmer nur ihre Chats sehen können
- Nachrichten nur von Chat-Teilnehmern gelesen werden können
- Admins alle Daten lesen können

## 📊 Indexes

Die folgenden Indexes sind für optimale Performance erforderlich:

1. **Chats**: `participants` (Array) + `metadata.concernId` + `metadata.updatedAt`
2. **Messages**: `chatId` + `timestamp` (ASC/DESC)
3. **Chat Participants**: `userId` + `isActive`
4. **Search**: `text` + `chatId`

## 🧪 Entwicklung

### Datenbank zurücksetzen

Verwenden Sie den "Datenbank zurücksetzen" Button im Admin-Panel (nur für Entwicklung!).

### Demo-Daten

Das System erstellt automatisch:
- Standard-Chats (Gesamtteam, Controlling)
- Willkommensnachrichten
- Admin-User

## 🚨 Fehlerbehebung

### Häufige Probleme

1. **"Permission denied"**
   - Überprüfen Sie die Security Rules
   - Stellen Sie sicher, dass der Benutzer authentifiziert ist

2. **"Missing or insufficient permissions"**
   - Überprüfen Sie die Indexes
   - Stellen Sie sicher, dass alle erforderlichen Felder vorhanden sind

3. **"Firebase App not initialized"**
   - Überprüfen Sie die Firebase-Konfiguration
   - Stellen Sie sicher, dass `firebase.ts` korrekt importiert wird

### Debugging

1. Öffnen Sie die Browser-Entwicklertools
2. Gehen Sie zu "Console"
3. Schauen Sie nach Firebase-Fehlermeldungen
4. Verwenden Sie das Admin-Panel zum Überprüfen des Datenbank-Status

## 📚 Weitere Ressourcen

- [Firebase Dokumentation](https://firebase.google.com/docs)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Firestore Indexes](https://firebase.google.com/docs/firestore/query-data/indexing)

## 🆘 Support

Bei Problemen:
1. Überprüfen Sie die Browser-Konsole
2. Überprüfen Sie den Datenbank-Status im Admin-Panel
3. Stellen Sie sicher, dass alle Schritte korrekt ausgeführt wurden
4. Überprüfen Sie die Firebase Console auf Fehler

---

**Viel Erfolg beim Einrichten Ihres Messaging-Systems! 🎉**


