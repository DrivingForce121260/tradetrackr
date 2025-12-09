# 🔄 Firestore Offline Queue Implementation

**Datum:** 19. Januar 2025  
**Status:** ✅ Implementiert  
**Version:** 1.0

---

## 🎯 Übersicht

Diese Implementierung ermöglicht es, Firestore-Operationen auch im Offline-Modus durchzuführen. Operationen werden in eine Queue gespeichert und automatisch synchronisiert, sobald die Verbindung wiederhergestellt ist.

### Problem gelöst

**Vorher:**
- Firestore-Operationen schlugen fehl, wenn keine Internetverbindung vorhanden war
- Service Worker konnte Firestore-Operationen nicht abfangen (WebSocket-Limitierung)
- Benutzer mussten Operationen manuell wiederholen

**Nachher:**
- Firestore-Operationen werden automatisch in eine Queue gespeichert, wenn offline
- Automatische Synchronisation bei Verbindungswiederherstellung
- Visueller Indikator zeigt Offline-Status und Queue-Länge
- Retry-Mechanismus für fehlgeschlagene Operationen

---

## 🏗️ Architektur

### Komponenten

1. **FirestoreOfflineQueueService** (`src/services/firestoreOfflineQueue.ts`)
   - Wrappt Firestore-Operationen (addDoc, updateDoc, deleteDoc, batch)
   - Speichert Operationen in localStorage, wenn offline
   - Synchronisiert Queue automatisch bei Verbindungswiederherstellung

2. **OfflineStatusIndicator** (`src/components/OfflineStatusIndicator.tsx`)
   - Zeigt Offline-Status im Header
   - Zeigt Queue-Länge an
   - Button zum manuellen Synchronisieren

3. **useFirestoreOfflineQueue Hook** (`src/hooks/useFirestoreOfflineQueue.ts`)
   - React Hook für einfache Verwendung
   - Bietet Zugriff auf Online-Status und Queue-Länge

---

## 📦 Verwendung

### 1. Direkte Verwendung des Services

```typescript
import { firestoreOfflineQueue } from '@/services/firestoreOfflineQueue';
import { collection, doc } from 'firebase/firestore';
import { db } from '@/config/firebase';

// Create operation - wird automatisch gequeued wenn offline
const collectionRef = collection(db, 'projects');
const docRef = await firestoreOfflineQueue.addDoc(collectionRef, {
  name: 'Neues Projekt',
  status: 'active'
});

// Update operation
const docRef = doc(db, 'projects', 'project-id');
await firestoreOfflineQueue.updateDoc(docRef, {
  status: 'completed'
});

// Delete operation
await firestoreOfflineQueue.deleteDoc(docRef);

// Batch operation
await firestoreOfflineQueue.batchOperation([
  { type: 'create', collection: 'tasks', data: { name: 'Task 1' } },
  { type: 'update', collection: 'projects', docId: 'id', data: { updated: true } }
]);
```

### 2. Verwendung mit React Hook

```typescript
import { useFirestoreOfflineQueue } from '@/hooks/useFirestoreOfflineQueue';

function MyComponent() {
  const { isOnline, queueLength, syncQueue, clearQueue } = useFirestoreOfflineQueue();

  return (
    <div>
      {!isOnline && <p>Offline - {queueLength} Operationen in Warteschlange</p>}
      {queueLength > 0 && isOnline && (
        <button onClick={syncQueue}>Synchronisieren</button>
      )}
    </div>
  );
}
```

### 3. Integration in bestehende Services

**Beispiel: WorkOrderService**

```typescript
import { firestoreOfflineQueue } from '@/services/firestoreOfflineQueue';
import { collection, doc } from 'firebase/firestore';
import { db } from '@/config/firebase';

export class WorkOrderService {
  async create(data: WorkOrderFormData): Promise<string> {
    const collectionRef = collection(db, 'workOrders');
    const docRef = await firestoreOfflineQueue.addDoc(collectionRef, {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  }

  async update(id: string, updates: Partial<WorkOrderFormData>): Promise<void> {
    const docRef = doc(db, 'workOrders', id);
    await firestoreOfflineQueue.updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  }

  async remove(id: string): Promise<void> {
    const docRef = doc(db, 'workOrders', id);
    await firestoreOfflineQueue.deleteDoc(docRef);
  }
}
```

---

## 🔄 Synchronisation

### Automatische Synchronisation

Die Synchronisation erfolgt automatisch:
1. **Beim App-Start** - Wenn online und Queue vorhanden
2. **Bei Verbindungswiederherstellung** - Online-Event wird abgefangen
3. **Periodisch** - Alle 5 Sekunden wird geprüft, ob Verbindung wiederhergestellt wurde

### Manuelle Synchronisation

```typescript
import { firestoreOfflineQueue } from '@/services/firestoreOfflineQueue';

const result = await firestoreOfflineQueue.syncQueue();
console.log(`Synchronisiert: ${result.successful}, Fehlgeschlagen: ${result.failed}`);
```

---

## 🎨 UI-Komponenten

### OfflineStatusIndicator

Der `OfflineStatusIndicator` wird automatisch im `AppHeader` angezeigt:

- **Offline**: Zeigt "Offline" Badge und Queue-Länge
- **Online mit Queue**: Zeigt Queue-Länge und Sync-Button
- **Nach Sync**: Zeigt "Synchronisiert" Badge kurz an
- **Versteckt**: Wenn online und keine Queue vorhanden

---

## ⚙️ Konfiguration

### Max Retries

Standard: 3 Versuche pro Operation

```typescript
// In firestoreOfflineQueue.ts
const MAX_RETRIES = 3;
```

### Queue Storage

Die Queue wird in `localStorage` gespeichert:

```typescript
const QUEUE_STORAGE_KEY = 'tradetrackr-firestore-offline-queue';
```

---

## 🧪 Testing

### Offline-Modus testen

1. **Chrome DevTools:**
   - F12 → Network Tab
   - "Offline" Checkbox aktivieren
   - Firestore-Operation durchführen
   - Prüfen, ob Operation in Queue gespeichert wird

2. **Queue prüfen:**
   ```javascript
   // In Browser Console
   const queue = JSON.parse(localStorage.getItem('tradetrackr-firestore-offline-queue'));
   console.log('Queue:', queue);
   ```

3. **Synchronisation testen:**
   - Offline-Modus aktivieren
   - Operation durchführen
   - Online-Modus wiederherstellen
   - Prüfen, ob Operation automatisch synchronisiert wird

---

## 📊 Queue-Struktur

```typescript
interface QueuedFirestoreOperation {
  id: string;                    // Eindeutige ID
  type: 'create' | 'update' | 'delete' | 'batch';
  collection: string;              // Collection-Name
  docId?: string;                  // Dokument-ID (für update/delete)
  data?: any;                      // Daten (für create/update)
  timestamp: number;               // Zeitstempel
  retries: number;                 // Anzahl Versuche
  batchOperations?: Array<...>;    // Für Batch-Operationen
}
```

---

## 🔐 Sicherheit

- ✅ Queue wird nur lokal gespeichert (localStorage)
- ✅ Operationen werden mit gleichen Firestore-Regeln ausgeführt
- ✅ Keine sensiblen Daten werden in der Queue gespeichert
- ✅ Retry-Limit verhindert endlose Wiederholungen

---

## 🚀 Nächste Schritte

### Optional: Erweiterungen

1. **Background Sync API** - Synchronisation auch wenn App geschlossen
2. **Queue-Priorisierung** - Wichtige Operationen zuerst synchronisieren
3. **Konfliktlösung** - Bessere Behandlung von Konflikten bei Sync
4. **Queue-Visualisierung** - UI zum Anzeigen/Verwalten der Queue

---

## 📚 Referenzen

- [Firebase Offline Persistence](https://firebase.google.com/docs/firestore/manage-data/enable-offline)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Background Sync API](https://developer.mozilla.org/en-US/docs/Web/API/Background_Sync_API)

---

## ✅ Implementierungs-Checkliste

- [x] FirestoreOfflineQueueService erstellt
- [x] Wrapper für addDoc, updateDoc, deleteDoc, batch
- [x] Queue-Speicherung in localStorage
- [x] Automatische Synchronisation
- [x] Retry-Mechanismus
- [x] OfflineStatusIndicator Komponente
- [x] Integration in AppHeader
- [x] useFirestoreOfflineQueue Hook
- [x] Auto-Sync beim App-Start
- [x] Dokumentation

---

**Status:** ✅ Vollständig implementiert und getestet






