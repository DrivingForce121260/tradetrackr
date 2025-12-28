# Synthetic Test Fixtures

Diese Fixtures enthalten **synthetische Testdaten** für die Entwicklung und Tests.

## ⚠️ WICHTIGE REGELN

### Keine echten Kundendaten!

**Niemals** echte Kundendaten in dieses Repository einchecken:

- ❌ Keine echten E-Mail-Adressen
- ❌ Keine echten Telefonnummern
- ❌ Keine echten Namen von Kunden
- ❌ Keine echten Rechnungs- oder Angebotsdaten
- ❌ Keine echten IBAN/Bankdaten

### Verwendungszweck

Diese Fixtures sind für:

- ✅ Unit Tests
- ✅ Integration Tests
- ✅ UI-Entwicklung und Mockups
- ✅ Dokumentation und Demos
- ✅ LLM/AI Prompt-Entwicklung (lokal)

### Cursor/LLM Kontext

Wenn du diese Dateien in Cursor oder einem anderen LLM-Tool verwendest:

1. **Kopiere nur synthetische Daten** - niemals echte Kundendaten
2. **Prüfe vor dem Einfügen** - enthält der Text echte PII?
3. **Verwende `_synthetic: true`** Marker zur Kenntlichmachung

## 📁 Struktur

```
fixtures/synthetic/
├── emails/
│   ├── de_email_01.json    # Anfrage Elektroinstallation
│   └── de_email_02.json    # Lieferantenrechnung
├── offers/
│   └── offer_01.json       # Angebot Elektroinstallation
├── invoices/
│   └── invoice_01.json     # Rechnung Wartungsarbeiten
├── ocr/
│   └── ocr_doc_01.txt      # OCR-Text Lieferschein
└── README.md
```

## 🔧 Verwendung in Tests

### SmartInbox Entwicklung

```typescript
import emailFixture from '@fixtures/synthetic/emails/de_email_01.json';

// Im Test oder Storybook
const mockEmail = emailFixture;
```

### OCR-Entwicklung

```typescript
import { readFileSync } from 'fs';

const ocrText = readFileSync('fixtures/synthetic/ocr/ocr_doc_01.txt', 'utf-8');
```

## 🔒 Sovereignty-Hinweis

Der **Gmail/IMAP Connector** (`functions/src/emailIntelligence/`) ist das **einzige** Modul, das mit externen E-Mail-Providern (Google, Microsoft) kommunizieren darf.

Alle anderen Module müssen interne Daten oder diese synthetischen Fixtures verwenden.

Siehe: `/docs/sovereignty/definition.md`

## ✏️ Neue Fixtures hinzufügen

1. Erstelle eine neue Datei im passenden Unterordner
2. Verwende **nur fiktive Daten**
3. Füge `_synthetic: true` zum JSON hinzu
4. Füge `_description` mit Erklärung hinzu
5. Verwende `.example.local` für E-Mail-Domains
6. Verwende `12345` oder ähnliche Muster-PLZ

