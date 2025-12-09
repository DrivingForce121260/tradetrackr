# 🗄️ E-Mail Archivierung - Benutzerhandbuch

## ✨ Neue Features

### 1. 📧 Absender & Betreff in der Liste
Jede E-Mail in der Smart Inbox zeigt jetzt:
- **Absender** (z.B. `info@beispiel.de`)
- **Betreff** (z.B. "Rechnung 2025-001")
- **Datum** (rechts oben)
- **AI-Zusammenfassung** (darunter)

### 2. 🗄️ E-Mails archivieren
- **Archivieren-Button**: Entfernt E-Mail aus der Inbox (bleibt auf Server)
- **E-Mail bleibt erhalten**: Keine Daten werden gelöscht
- **Wiederherstellung möglich**: Jederzeit wieder in Inbox holen

### 3. 📥 Archiv-Ansicht
- **Toggle-Button**: "🗄️ Archiv anzeigen" / "📥 Inbox anzeigen"
- **Archivierte E-Mails**: Werden separat angezeigt
- **Wiederherstellen-Button**: In archivierter Ansicht verfügbar

## 🎯 Wie es funktioniert

### E-Mail archivieren (aus Inbox entfernen)

1. Öffnen Sie die **Smart Inbox**
2. Finden Sie die E-Mail, die Sie archivieren möchten
3. Klicken Sie auf **"🗄️ Archivieren"**
4. E-Mail verschwindet aus der Inbox
5. Toast-Benachrichtigung: "🗄️ E-Mail archiviert"

### Archivierte E-Mails ansehen

1. Klicken Sie auf **"🗄️ Archiv anzeigen"** (in der Filter-Leiste)
2. Alle archivierten E-Mails werden angezeigt
3. Button wechselt zu **"📥 Inbox anzeigen"**

### E-Mail wiederherstellen

1. In der **Archiv-Ansicht**
2. Finden Sie die E-Mail
3. Klicken Sie auf **"📥 Wiederherstellen"**
4. E-Mail erscheint wieder in der Inbox
5. Toast-Benachrichtigung: "📥 E-Mail wiederhergestellt"

## 🔧 Technische Details

### Datenbank-Felder
```typescript
{
  archived: boolean,      // true = archiviert, false = in Inbox
  archivedAt: Date,      // Zeitpunkt der Archivierung
  archivedBy: string,    // User UID der archiviert hat
}
```

### Firestore Rules
- ✅ Benutzer können eigene E-Mails archivieren/wiederherstellen
- ✅ Nur gleiche Organisation (orgId check)
- ✅ Keine Löschrechte nötig

### Firestore Index
- `orgId + archived + createdAt` (descending)
- Ermöglicht schnelle Filterung

## 📋 Aktionen verfügbar

### In der Inbox-Ansicht:
- 📋 **In Bearbeitung** - Status auf "in_progress"
- ✅ **Erledigt** - Status auf "done"
- 🗄️ **Archivieren** - Aus Inbox entfernen

### In der Archiv-Ansicht:
- 📥 **Wiederherstellen** - Zurück in Inbox

## 💡 Anwendungsfälle

### E-Mails ordnen
```
Neue E-Mail → Bearbeiten → Erledigen → Archivieren
```

### Später nachschauen
Archivierte E-Mails bleiben durchsuchbar und können jederzeit wiederhergestellt werden.

### Inbox aufräumen
Alte oder unwichtige E-Mails archivieren, ohne sie zu löschen.

## ⚙️ Einstellungen & Zeitplan

### E-Mail-Synchronisation

| Zeitraum | Frequenz |
|----------|----------|
| **Mo-Fr 07:00-18:00** | Alle 10 Minuten |
| **Mo-Fr 18:00-07:00** | Alle 2 Stunden |
| **Sa-So (ganztags)** | Alle 2 Stunden |

### IMAP-Validierung
- ✅ **Automatische Validierung**: Credentials werden vor dem Speichern getestet
- ❌ **Fehler bei falschen Zugangsdaten**: Konto wird NICHT gespeichert
- ✅ **Klare Fehlermeldungen**: "Verbindung fehlgeschlagen: [Grund]"

## 🔄 Hard Refresh erforderlich!

Nach allen Änderungen bitte Browser neu laden:
```
Ctrl + Shift + R
```

## 🎉 Neue UI-Features

### E-Mail-Liste
```
┌─────────────────────────────────────────────────┐
│ 📧 sender@example.com              08.11 14:35  │
│    Betreff: Rechnung 2025-001                   │
├─────────────────────────────────────────────────┤
│ 🔴 💰 Rechnung  🟡 Offen                       │
│                                                 │
│ • Rechnung über 1.500€ erhalten                │
│ • Zahlungsfrist: 14 Tage                       │
│                                                 │
│ [📋 In Bearbeitung] [✅ Erledigt] [🗄️ Archivieren] │
└─────────────────────────────────────────────────┘
```

### Archiv-Ansicht
```
┌─────────────────────────────────────────────────┐
│ 📧 old@example.com                 06.11 10:15  │
│    Betreff: Alte E-Mail                        │
├─────────────────────────────────────────────────┤
│ 📝 Allgemein  🟢 Erledigt                      │
│                                                 │
│ • Informations-E-Mail                          │
│                                                 │
│ [📥 Wiederherstellen]                           │
└─────────────────────────────────────────────────┘
```

Alles ist jetzt **live**! 🚀








