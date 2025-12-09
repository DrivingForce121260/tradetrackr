# E-Mail Polling Schedule

## ⏰ Neue Zeitsteuerung (aktiv seit Deployment)

### Tagsüber (07:00 - 18:00 Uhr)
- **Frequenz:** Alle **10 Minuten**
- **Beispiel:** 07:00, 07:10, 07:20, 07:30, ... 17:50, 18:00

### Nachts (18:00 - 07:00 Uhr)
- **Frequenz:** Alle **2 Stunden**
- **Beispiel:** 18:00, 20:00, 22:00, 00:00, 02:00, 04:00, 06:00

## 📊 Technische Details

### Cloud Scheduler
```typescript
.pubsub.schedule('every 10 minutes')
.timeZone('Europe/Berlin')
```

### Intelligente Ausführungslogik
Der Job wird alle 10 Minuten getriggert, aber:

**Nachts (18:00-07:00):**
- Prüft, ob aktuelle Stunde gerade ist (0, 2, 4, 6, 18, 20, 22)
- Prüft, ob wir innerhalb der ersten 10 Minuten der Stunde sind
- Überspringt Ausführung, wenn Bedingungen nicht erfüllt sind

**Tagsüber (07:00-18:00):**
- Wird bei jeder Ausführung durchgeführt (alle 10 Min)

## 📋 Ausführungsbeispiele

### Tagsüber
```
07:00 ✅ Executed
07:10 ✅ Executed
07:20 ✅ Executed
07:30 ✅ Executed
...
17:50 ✅ Executed
18:00 ✅ Executed (Last daytime run)
```

### Nachts
```
18:00 ✅ Executed (Even hour, within first 10 min)
18:10 ⏭️  Skipped (Even hour, but after 10 min mark)
18:20 ⏭️  Skipped
19:00 ⏭️  Skipped (Odd hour)
19:10 ⏭️  Skipped
20:00 ✅ Executed (Even hour, within first 10 min)
20:10 ⏭️  Skipped
22:00 ✅ Executed
00:00 ✅ Executed
02:00 ✅ Executed
04:00 ✅ Executed
06:00 ✅ Executed
07:00 ✅ Executed (First daytime run)
```

## 🔍 Monitoring

### Logs überprüfen
```powershell
firebase functions:log --only imapPollJob
```

### Erwartete Log-Einträge

**Bei Ausführung:**
```
IMAP polling job started (hour: 14:20)
Found X active IMAP accounts
Fetched Y messages for email@example.com
```

**Bei Überspringung (nachts):**
```
IMAP polling job skipped (night time, hour: 19:30)
```

## 📈 Vorteile der neuen Zeitsteuerung

1. **Ressourcenschonung nachts**
   - Weniger API-Calls außerhalb der Geschäftszeiten
   - Geringere Kosten

2. **Schnelle Reaktion tagsüber**
   - Neue E-Mails werden innerhalb von 10 Minuten erkannt
   - Optimal für Geschäftskommunikation

3. **Zeitzonenberücksichtigung**
   - Verwendet `Europe/Berlin` Zeitzone
   - Automatische Anpassung für Sommer-/Winterzeit

## 🔧 Anpassungen vornehmen

Wenn Sie die Zeitsteuerung ändern möchten:

### Schedule-Frequenz ändern
In `functions/src/emailIntelligence/handlers.ts`, Zeile 155:
```typescript
.pubsub.schedule('every 10 minutes')  // Hier ändern
```

### Tageszeiten anpassen
In `functions/src/emailIntelligence/handlers.ts`, Zeile 165:
```typescript
const isNightTime = hour >= 18 || hour < 7;  // 18:00-07:00 = Nacht
```

### Nacht-Intervall anpassen
In `functions/src/emailIntelligence/handlers.ts`, Zeile 169:
```typescript
const isEvenHour = hour % 2 === 0;  // % 2 = jede 2. Stunde
                                     // % 3 = jede 3. Stunde
                                     // etc.
```

Nach Änderungen:
```powershell
cd functions
npm run build
cd ..
firebase deploy --only functions:imapPollJob
```

## 🎯 Aktuelle Konfiguration

- ✅ **Initial Sync:** Letzte 7 Tage
- ✅ **Duplikatsprüfung:** Aktiv
- ✅ **Tagsüber:** Alle 10 Minuten (07:00-18:00)
- ✅ **Nachts:** Alle 2 Stunden (18:00-07:00)
- ✅ **Zeitzone:** Europe/Berlin








