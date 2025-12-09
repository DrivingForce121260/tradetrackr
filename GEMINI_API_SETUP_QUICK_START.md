# 🚀 Gemini API Key Quick Start

## ✅ Was wurde gemacht:

1. **Code aktualisiert**: Der Code verwendet jetzt Environment Variables statt der deprecated `functions.config()` API
2. **Backward Compatibility**: Der alte `functions.config()` Befehl funktioniert noch als Fallback
3. **Dateien erstellt**:
   - `functions/GEMINI_API_SETUP.md` - Ausführliche Anleitung
   - `functions/SETUP_API_KEY.txt` - Quick Reference
   - `.gitignore` aktualisiert um .env Dateien zu schützen

## 🎯 Jetzt musst du:

### Option A: Lokales Setup (für Development/Testing)

1. **Erstelle die .env Datei**:
   ```bash
   cd functions
   ```

2. **Erstelle Datei**: `functions/.env`
   ```env
   GEMINI_API_KEY=dein_apikey_hier
   ```

3. **Hole dir einen API Key**:
   - Gehe zu: https://aistudio.google.com/app/apikey
   - Erstelle einen neuen API Key
   - Kopiere den Key und füge ihn in die `.env` Datei ein

### Option B: Firebase Deployment (für Production)

Verwende den Befehl den du vorgeschlagen hast (funktioniert noch):

```bash
cd functions
firebase functions:config:set gemini.api_key="YOUR_API_KEY"
cd ..
firebase deploy --only functions
```

⚠️ **Wichtig**: Ersetze `YOUR_API_KEY` mit deinem echten API Key!

## 📝 Der Code unterstützt jetzt:

```typescript
// Neu: Environment Variables (empfohlen)
const apiKey = process.env.GEMINI_API_KEY

// Alt: functions.config() (funktioniert noch bis März 2026)
const apiKey = functions.config().gemini?.api_key

// Kombiniert: Beides wird unterstützt!
const apiKey = process.env.GEMINI_API_KEY || functions.config().gemini?.api_key
```

## 🔒 Sicherheit

✅ `.env` Dateien sind jetzt in `.gitignore` - sie werden NICHT committet!

## 📚 Weitere Informationen

Siehe `functions/GEMINI_API_SETUP.md` für eine ausführliche Anleitung.

## ❓ Probleme?

**Fehler: "Gemini API key not configured"**
- Stelle sicher, dass du die `.env` Datei erstellt hast
- Stelle sicher, dass der API Key korrekt ist (keine Leerzeichen, korrekter Key)

**Fehler beim Deployment:**
- Stelle sicher, dass der API Key in Firebase gesetzt ist mit `firebase functions:config:set`
- Stelle sicher, dass du deployest: `firebase deploy --only functions`













