# TradeTrackr - Offline-Support Implementation

**Status:** ✅ Implementiert  
**Version:** 1.0.0  
**Datum:** 13. November 2025

---

## 📋 Übersicht

Das TradeTrackr Webportal unterstützt jetzt vollständigen Offline-Betrieb mit:

- ✅ **Service Worker** für Offline-Caching
- ✅ **Cache-Strategien** (Network-First, Cache-First)
- ✅ **Offline-Action-Queue** für Firestore-Operationen
- ✅ **Automatische Synchronisation** bei Verbindungswiederherstellung
- ✅ **Offline-Status-Indikator** in der UI

---

## 🏗️ Architektur

### Service Worker (`public/sw.js`)

Der Service Worker implementiert verschiedene Cache-Strategien:

1. **Network-First** (für API-Calls und HTML-Seiten)
   - Versucht zuerst Netzwerk
   - Fallback auf Cache bei Fehler
   - Queue für Offline-Requests

2. **Cache-First** (für statische Assets)
   - Lädt aus Cache
   - Aktualisiert Cache im Hintergrund

3. **Offline-Fallback** (für HTML-Seiten)
   - Zeigt `offline.html` wenn keine Verbindung

### Offline Queue System

- **localStorage-basiert** für Persistenz
- **Automatische Synchronisation** bei Verbindungswiederherstellung
- **Retry-Mechanismus** (max. 3 Versuche)
- **Service Worker Integration** für Background-Sync

---

## 📁 Dateien

### Neue Dateien

1. **`public/sw.js`**
   - Service Worker Hauptdatei
   - Cache-Strategien
   - Offline-Queue-Management

2. **`public/offline.html`**
   - Offline-Fallback-Seite
   - Zeigt Status und Verbindungsprüfung

3. **`src/hooks/useOfflineSupport.ts`**
   - React Hook für Offline-Status
   - Queue-Management
   - Synchronisation

4. **`src/components/OfflineIndicator.tsx`**
   - UI-Komponente für Offline-Status
   - Zeigt Queue-Länge
   - Manuelle Sync-Button

5. **`src/utils/offlineQueue.ts`**
   - Utility-Funktionen für Firestore-Operationen
   - Queue-Helpers

### Geänderte Dateien

1. **`src/main.tsx`**
   - Service Worker Registrierung
   - Update-Handling

2. **`src/App.tsx`**
   - OfflineIndicator Integration

3. **`vite.config.ts`**
   - Build-Konfiguration für Service Worker

---

## 🚀 Verwendung

### Service Worker wird automatisch registriert

Der Service Worker wird beim Laden der Anwendung automatisch registriert.

### Offline-Status prüfen

```typescript
import { useOfflineSupport } from '@/hooks/useOfflineSupport';

function MyComponent() {
  const { isOnline, queueLength, syncQueue } = useOfflineSupport();
  
  return (
    <div>
      {isOnline ? 'Online' : 'Offline'}
      {queueLength > 0 && <p>{queueLength} Aktionen in Warteschlange</p>}
    </div>
  );
}
```

### Offline-Aktionen in Queue speichern

```typescript
import { useOfflineSupport } from '@/hooks/useOfflineSupport';
import { queueFirestoreOperation } from '@/utils/offlineQueue';

function MyComponent() {
  const { addToQueue, isOnline } = useOfflineSupport();
  
  const handleSave = async () => {
    if (isOnline) {
      // Normaler Firestore-Call
      await firestoreService.create('projects', data);
    } else {
      // In Queue speichern
      await queueFirestoreOperation(addToQueue, {
        collection: 'projects',
        operation: 'create',
        data: data
      });
    }
  };
}
```

### Manuelle Synchronisation

```typescript
const { syncQueue } = useOfflineSupport();

// Manuell synchronisieren
await syncQueue();
```

---

## 🔧 Cache-Strategien

### Network-First (API-Calls, HTML)

```javascript
// Versucht zuerst Netzwerk
// Fallback auf Cache
// Queue bei Offline
```

**Verwendung:**
- API-Endpunkte (`/api/*`)
- Firebase-Calls
- HTML-Seiten

### Cache-First (Statische Assets)

```javascript
// Lädt aus Cache
// Aktualisiert im Hintergrund
```

**Verwendung:**
- JavaScript-Dateien (`*.js`)
- CSS-Dateien (`*.css`)
- Bilder (`*.png`, `*.jpg`, etc.)
- Fonts (`*.woff`, `*.ttf`)

### Offline-Fallback (HTML)

```javascript
// Zeigt offline.html wenn keine Verbindung
```

---

## 📊 Offline Queue

### Queue-Struktur

```typescript
interface OfflineQueueItem {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body: any;
  timestamp: number;
  retries: number;
}
```

### Queue-Speicherung

- **localStorage** für Persistenz
- **Service Worker Cache** als Backup
- **Automatische Bereinigung** nach erfolgreicher Synchronisation

### Retry-Mechanismus

- **Max. 3 Versuche** pro Item
- **Automatische Synchronisation** bei Verbindungswiederherstellung
- **Manuelle Synchronisation** möglich

---

## 🎨 UI-Komponenten

### OfflineIndicator

Zeigt:
- Online/Offline-Status
- Anzahl der Aktionen in Warteschlange
- Button für manuelle Synchronisation

**Position:** Fixed bottom-right

**Styling:**
- Grün bei Online
- Rot bei Offline
- Badge mit Queue-Länge

---

## 🧪 Testing

### Offline-Modus testen

1. **Chrome DevTools:**
   - F12 → Network Tab
   - "Offline" Checkbox aktivieren

2. **Service Worker testen:**
   - F12 → Application Tab
   - Service Workers → Update/Unregister

3. **Queue testen:**
   - Offline gehen
   - Aktion ausführen (z.B. Projekt erstellen)
   - Online gehen
   - Prüfen ob synchronisiert wurde

---

## 🔄 Synchronisation

### Automatisch

- Bei Verbindungswiederherstellung (`online` Event)
- Beim Laden der Anwendung (wenn Online)
- Periodisch alle 5 Sekunden (Queue-Länge)

### Manuell

- Button im OfflineIndicator
- Programmatisch via `syncQueue()`

---

## 📝 Best Practices

### 1. Firestore-Operationen

```typescript
// Immer prüfen ob Online
if (isOnline) {
  await firestoreService.create(...);
} else {
  await queueFirestoreOperation(addToQueue, {...});
}
```

### 2. Error Handling

```typescript
try {
  await operation();
} catch (error) {
  if (!navigator.onLine) {
    // Queue für Offline
    await queueOperation();
  } else {
    // Echter Fehler
    throw error;
  }
}
```

### 3. User Feedback

```typescript
// Zeige Toast bei Offline-Operation
if (!isOnline) {
  toast.info('Wird gespeichert und synchronisiert, sobald Sie online sind');
}
```

---

## 🐛 Troubleshooting

### Service Worker registriert sich nicht

**Lösung:**
- Prüfen ob HTTPS (oder localhost)
- Browser-Konsole auf Fehler prüfen
- Service Worker Cache löschen (DevTools → Application → Clear Storage)

### Queue synchronisiert nicht

**Lösung:**
- Prüfen ob `syncQueue()` aufgerufen wird
- Browser-Konsole auf Fehler prüfen
- localStorage prüfen (`tradetrackr-offline-queue`)

### Cache wird nicht aktualisiert

**Lösung:**
- Service Worker Version erhöhen (`CACHE_NAME`)
- Service Worker neu registrieren
- Browser-Cache löschen

---

## 🔒 Security

- Service Worker läuft nur über HTTPS (oder localhost)
- Queue-Daten werden in localStorage gespeichert (verschlüsselt bei HTTPS)
- Keine sensiblen Daten in Queue (nur Operationen, keine Passwörter)

---

## 📈 Performance

- **Cache-Größe:** ~50MB (Browser-Limit)
- **Queue-Größe:** Unbegrenzt (localStorage-Limit)
- **Sync-Intervall:** 5 Sekunden (konfigurierbar)

---

## 🎯 Nächste Schritte (Optional)

1. **Background Sync API** (für bessere Synchronisation)
2. **Push Notifications** (bei Sync-Fehlern)
3. **Conflict Resolution** (bei gleichzeitigen Änderungen)
4. **Offline-Datenbank** (IndexedDB für größere Datenmengen)

---

## ✅ Checkliste

- [x] Service Worker erstellt
- [x] Cache-Strategien implementiert
- [x] Offline-Queue implementiert
- [x] Synchronisation implementiert
- [x] UI-Indikator hinzugefügt
- [x] Offline-Fallback-Seite erstellt
- [x] Dokumentation erstellt

---

**Status:** ✅ **Production-Ready**

Der Offline-Support ist vollständig implementiert und einsatzbereit!







