# Wünsch-dir-was Feature Request System - Implementation Guide

## ✅ Implementation Complete

Das vollständige "Wünsch-dir-was" Feature Request System wurde erfolgreich implementiert.

## 📁 Erstellte Dateien

### Frontend (React/TypeScript)

1. **`src/types/featureRequests.ts`**
   - TypeScript-Typen für Feature Requests
   - `FeatureRequest`, `FeatureRequestStatus`, `FeatureRequestType`
   - `AISummarizeInput`, `AISummarizeOutput`

2. **`src/lib/featureRequests.ts`**
   - Firestore Service für Feature Requests
   - `saveFeatureRequest()` Funktion
   - `extractTitle()` Helper

3. **`src/components/WuenschDirWasButton.tsx`**
   - Wiederverwendbare Button-Komponente
   - Öffnet das Modal beim Klick
   - Akzeptiert `module` und `entityId` Props

4. **`src/components/WuenschDirWasModal.tsx`**
   - Vollständiges Modal mit allen Flows:
     - **Select Mode**: Auswahl zwischen direktem Text oder KI-geführtem Dialog
     - **Free Text Mode**: Direkte Texteingabe mit optionalen Feldern
     - **AI Guided Mode**: Schritt-für-Schritt Dialog mit 10 Fragen
     - **Confirm Mode**: Überprüfung und Bearbeitung der KI-generierten Zusammenfassung

### Backend (Firebase Cloud Functions)

5. **`functions/src/featureRequests/types.ts`**
   - Shared Types für Cloud Functions

6. **`functions/src/featureRequests/summarizeFeatureRequest.ts`**
   - AI-Zusammenfassungs-Logik mit Gemini API
   - Fallback-Mechanismus wenn AI nicht verfügbar
   - JSON-Parsing und Validierung

7. **`functions/src/featureRequests/index.ts`**
   - Cloud Function Export: `summarizeFeatureRequest`
   - Authentifizierung und Validierung

8. **`functions/src/index.ts`** (aktualisiert)
   - Export der neuen Feature Request Function

### Security

9. **`firestore.rules`** (aktualisiert)
   - Security Rules für `featureRequests` Collection
   - Users können eigene Requests erstellen und lesen
   - ConcernId-basierte Zugriffskontrolle

## 🚀 Integration

### 1. Button in Layout/Page einbinden

```tsx
import { WuenschDirWasButton } from '@/components/WuenschDirWasButton';

// In deinem Layout oder Page Component:
<WuenschDirWasButton
  module="projects"
  entityId={currentProjectId}
/>
```

### 2. Beispiel: In AppLayout.tsx

```tsx
// src/components/AppLayout.tsx
import { WuenschDirWasButton } from './WuenschDirWasButton';

export const AppLayout = () => {
  const location = useLocation();
  const module = location.pathname.split('/')[1]; // z.B. "projects"
  
  return (
    <div>
      {/* ... existing layout ... */}
      <div className="fixed bottom-4 right-4 z-50">
        <WuenschDirWasButton module={module} />
      </div>
    </div>
  );
};
```

### 3. Beispiel: In ProjectDetail Page

```tsx
// src/screens/app/ProjectDetail.tsx
import { WuenschDirWasButton } from '@/components/WuenschDirWasButton';

export const ProjectDetail = ({ projectId }: { projectId: string }) => {
  return (
    <div>
      {/* ... project content ... */}
      <WuenschDirWasButton
        module="projects"
        entityId={projectId}
      />
    </div>
  );
};
```

## 🔧 Deployment

### 1. Frontend Build

```bash
npm run build
# oder
npm run dev
```

### 2. Firebase Functions Deploy

```bash
cd functions
npm install  # Falls neue Dependencies
npm run build
cd ..
firebase deploy --only functions:summarizeFeatureRequest
```

### 3. Firestore Rules Deploy

```bash
firebase deploy --only firestore:rules
```

## 📊 Firestore Collection Struktur

### Collection: `featureRequests`

```typescript
{
  id: "auto-generated",
  concernId: "DE1234567890",
  userId: "user123",
  userEmail: "user@example.com",
  userName: "Max Mustermann",
  platform: "web",
  route: "/projects/123",
  module: "projects",
  entityId: "project123",
  requestType: "free_text" | "ai_guided",
  title: "Kurzer Titel",
  description: "Vollständige Beschreibung...",
  category: "Zeiterfassung",
  impactSelfRating: "high",
  usageFrequency: "daily",
  painPointToday: "...",
  aiDialogSteps: [
    { question: "...", answer: "..." }
  ],
  aiGeneratedSummary: "{...}",
  language: "de",
  status: "new",
  internalNotes: "...",
  linkedTaskId: "...",
  version: 1,
  createdAt: Timestamp,
  createdBy: "user123",
  updatedAt: Timestamp,
  updatedBy: "user123"
}
```

## 🎯 Features

### ✅ Implementiert

- [x] Wiederverwendbarer Button-Komponente
- [x] Modal mit zwei Pfaden (direkt / KI-geführt)
- [x] Free-Text Eingabe mit optionalen Feldern
- [x] KI-geführter Dialog mit 10 Fragen
- [x] AI-Zusammenfassung mit Gemini API
- [x] Fallback wenn AI nicht verfügbar
- [x] Firestore Service mit Type-Safety
- [x] Security Rules für Feature Requests
- [x] Context-Aware (route, module, entityId)
- [x] Vollständige TypeScript-Typisierung

### 🔄 Optional Erweiterungen

- [ ] Admin-Dashboard zum Verwalten von Feature Requests
- [ ] E-Mail-Benachrichtigungen bei Status-Änderungen
- [ ] Voting-System für Feature Requests
- [ ] Kommentar-System
- [ ] Integration mit Task-Management
- [ ] Analytics Dashboard

## 🧪 Testing

### Manuelles Testen

1. **Button öffnen**: Klicke auf "Wünsch-dir-was" Button
2. **Free-Text Path**: 
   - Wähle "Direkt beschreiben"
   - Gib Text ein
   - Optional: Kategorie und Wichtigkeit
   - Sende ab
3. **AI-Guided Path**:
   - Wähle "Mit KI konkretisieren"
   - Beantworte die Fragen (mindestens 5)
   - Warte auf Zusammenfassung
   - Überprüfe und bearbeite
   - Bestätige und sende ab

### Firestore Check

```bash
# In Firebase Console:
# Firestore > featureRequests Collection
# Überprüfe, ob neue Requests erstellt wurden
```

### Logs Check

```bash
firebase functions:log --only summarizeFeatureRequest
```

## 📝 Wichtige Hinweise

1. **Gemini API Key**: Muss in Firebase Functions konfiguriert sein:
   ```bash
   firebase functions:config:set gemini.api_key="YOUR_KEY"
   ```

2. **ConcernId**: Wird automatisch aus dem User-Context geladen

3. **Route**: Wird automatisch aus `useLocation()` geladen

4. **Security**: Users können nur ihre eigenen Requests erstellen und lesen

5. **Status**: Neue Requests haben automatisch Status "new"

## 🐛 Troubleshooting

### Problem: Button wird nicht angezeigt
- **Lösung**: Stelle sicher, dass User authentifiziert ist (`useAuth()`)

### Problem: AI-Zusammenfassung schlägt fehl
- **Lösung**: Überprüfe Gemini API Key in Functions Config
- **Fallback**: System verwendet automatisch Fallback-Zusammenfassung

### Problem: Firestore Permission Denied
- **Lösung**: Überprüfe Security Rules wurden deployed
- **Lösung**: Stelle sicher, dass `concernId` und `userId` korrekt gesetzt sind

## 📚 Weitere Dokumentation

- [Firebase Functions Docs](https://firebase.google.com/docs/functions)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Gemini API Docs](https://ai.google.dev/docs)

---

**Erstellt**: 2025-11-11  
**Status**: ✅ Production Ready  
**Version**: 1.0.0







