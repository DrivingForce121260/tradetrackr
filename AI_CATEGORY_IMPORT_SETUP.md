# AI Category 2 Import Setup

Diese Dokumentation beschreibt das Setup und die Konfiguration des AI-gestützten Import-Flows für Kategorie Typ 2.

## Übersicht

Der AI-Import Flow ermöglicht es Benutzern, Kategorie Typ 2 Daten automatisch aus verschiedenen Dateiformaten (PDF, CSV, XLSX, JSON, TXT) zu importieren. Das System verwendet Google Gemini 1.5 Flash zur Analyse der Dateien.

## Umgebungsvariablen

Die Cloud Functions benötigen folgende Umgebungsvariable:

### Gemini API Key

```bash
firebase functions:config:set gemini.api_key="YOUR_GEMINI_API_KEY"
```

Oder über `.env` (für lokale Entwicklung):
```
GEMINI_API_KEY=your_api_key_here
```

**Wichtig:** Erstellen Sie einen API-Key in der [Google AI Studio](https://aistudio.google.com/apikey).

## Installation

### 1. Dependencies installieren

```bash
cd functions
npm install
```

### 2. Functions deployen

```bash
firebase deploy --only functions:aiCategory2Import,functions:aiCategory2Commit
```

### 3. Firestore & Storage Rules deployen

```bash
firebase deploy --only firestore:rules,storage:rules
```

## Konfiguration

### Limits (in `functions/src/categoryImport.ts` anpassbar)

- `MAX_FILE_SIZE`: 15 MB (Standard)
- `MAX_FAMILIES`: 5 Familien pro Import
- `MAX_OPTIONS`: 200 Optionen pro Import
- `JOB_EXPIRY_HOURS`: 24 Stunden (Gültigkeit von Import-Jobs)

### Erlaubte Dateiformate

- PDF (`.pdf`)
- CSV (`.csv`)
- Excel (`.xlsx`, `.xls`)
- JSON (`.json`)
- Text (`.txt`)

## Verwendung

1. Öffnen Sie die Kategorien-Verwaltung
2. Klicken Sie auf **+ Neue Kategorie**
3. Wählen Sie **Kategorie Typ 2**
4. Klicken Sie auf **AI-Import**
5. Wählen Sie eine Datei aus
6. Warten Sie auf die Analyse
7. Überprüfen Sie die Vorschau
8. Klicken Sie auf **Übernehmen** zum Speichern

## Security

### Firestore Rules

- `categories`: Nur Editor/Admin können erstellen/bearbeiten
- `lookupOptions`: Nur Editor/Admin können erstellen/bearbeiten
- `imports`: Nur der Besitzer kann lesen/schreiben

### Storage Rules

- `kategorien/{uid}/**`: Nur der Benutzer kann seine eigenen Dateien hochladen/lesen

## Troubleshooting

### "Gemini API key not configured"

Stellen Sie sicher, dass der API-Key korrekt gesetzt wurde:
```bash
firebase functions:config:get
```

### "Permission denied"

Überprüfen Sie:
1. Firestore Rules sind deployed
2. Storage Rules sind deployed
3. Benutzer hat die Rolle "editor" oder "admin"

### "File size exceeds limit"

Reduzieren Sie die Dateigröße oder erhöhen Sie `MAX_FILE_SIZE` in der Function.

## Testing

### Lokale Entwicklung

```bash
cd functions
npm run serve
```

### Emulator starten

```bash
firebase emulators:start
```

## API Reference

### `aiCategory2Import`

**Parameter:**
```typescript
{
  filePath: string;      // Storage-Pfad zur Datei
  userId: string;        // UID des Benutzers
  projectId?: string;    // Optional: Project ID
}
```

**Rückgabe:**
```typescript
{
  jobId: string;
  preview: AICategory2Payload;
  stats: {
    familiesCount: number;
    optionsCount: number;
    warningsCount: number;
  };
}
```

### `aiCategory2Commit`

**Parameter:**
```typescript
{
  jobId: string;
  applyMode: 'upsert' | 'insertOnly';
  linkToCategoryId?: string;
}
```

**Rückgabe:**
```typescript
{
  committedCounts: {
    categoryCreated: boolean;
    optionsCreated: number;
    optionsUpdated: number;
  };
}
```

## Support

Bei Fragen oder Problemen:
1. Überprüfen Sie die Firebase Function Logs: `firebase functions:log`
2. Überprüfen Sie die Browser-Konsole für Client-Fehler
3. Überprüfen Sie die Firestore/Storage Rules
















