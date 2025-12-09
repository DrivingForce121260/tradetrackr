# Gemini API Setup Anleitung

Diese Anleitung erklärt, wie der Gemini API Key für die AI Category Import Funktion konfiguriert wird.

## ⚠️ Wichtiger Hinweis

Die alte `functions.config()` API ist deprecated und wird im März 2026 eingestellt. Wir verwenden jetzt Environment Variables.

## Methode 1: Environment Variables (Empfohlen)

### Schritt 1: .env Datei erstellen

Erstelle eine `.env` Datei im `functions` Ordner:

```bash
cd functions
```

Erstelle die Datei `.env` mit folgendem Inhalt:

```env
GEMINI_API_KEY=dein_apikey_hier
```

**Wichtig:** Ersetze `dein_apikey_hier` mit deinem tatsächlichen Gemini API Key!

### Schritt 2: Gemini API Key erhalten

1. Gehe zu [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Erstelle einen neuen API Key
3. Kopiere den Key und füge ihn in die `.env` Datei ein

### Schritt 3: Firebase Functions deployen

Wenn du Firebase Functions deployest, musst du die Environment Variable auch in Firebase setzen:

```bash
# Deine Functions im functions Ordner bauen
cd functions
npm run build

# Zurück zum Hauptverzeichnis
cd ..

# Environment Variable in Firebase setzen
firebase functions:config:set gemini.api_key="YOUR_API_KEY"
```

**Oder** verwende das neue Environment Variables System (empfohlen für neuere Projekte):

```bash
# Setze die Environment Variable direkt für das Deployment
firebase functions:secrets:set GEMINI_API_KEY
```

Dann musst du den Functions Code aktualisieren, um auf den Secret zuzugreifen:

```typescript
// In deiner function definition
export const aiCategory2Import = functions
  .runWith({ secrets: ['GEMINI_API_KEY'] })
  .https.onCall(async (data, context) => {
    // ...
  });
```

## Methode 2: Temporär (für lokales Testing)

Für lokales Testing mit dem Emulator kannst du den API Key direkt im Code setzen (NICHT für Production!):

```typescript
const apiKey = process.env.GEMINI_API_KEY || 'dein_apikey_hier';
```

## Methode 3: Legacy (funktioniert noch bis März 2026)

Falls du die alte Methode verwenden möchtest:

```bash
firebase functions:config:set gemini.api_key="YOUR_API_KEY"
```

Der Code unterstützt diese Methode noch als Fallback.

## Sicherheit

⚠️ **NIE** committen:
- `.env` Dateien
- API Keys in Git
- API Keys im Quellcode

Die `.env` Datei sollte in `.gitignore` sein!

## Testing

Nach dem Setup kannst du die Funktion testen:

1. Starte den Firebase Emulator: `npm run serve` (im functions Ordner)
2. Oder deploye die Functions: `firebase deploy --only functions`

## Troubleshooting

**Fehler: "Gemini API key not configured"**
- Stelle sicher, dass die `.env` Datei existiert und den richtigen Key enthält
- Stelle sicher, dass du im `functions` Ordner bist
- Für Deployment: Stelle sicher, dass die Environment Variable in Firebase gesetzt ist

**Fehler: "Permission denied" oder "API key invalid"**
- Überprüfe, dass der API Key korrekt ist
- Stelle sicher, dass der API Key in Google AI Studio aktiviert ist














