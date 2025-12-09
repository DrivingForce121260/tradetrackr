# TradeTrackr - Firestore Collections Mapping

**Firebase Projekt:** reportingapp817  
**Console:** https://console.firebase.google.com/u/0/project/reportingapp817/firestore/databases/-default-/data/

---

## 📊 Collections-Übersicht

### **BESTEHENDE Collections (werden wiederverwendet):**

| Collection | Verwendung | Schema | Zeit-Tracking Nutzung |
|-----------|------------|--------|----------------------|
| **`projects`** | ✅ Wiederverwendet | Bestehendes Schema | Projekt-Auswahl in Mobile App |
| **`users`** | ✅ Wiederverwendet | Bestehendes Schema | User-Daten für RBAC |
| **`concern`** | ✅ Wiederverwendet | Bestehendes Schema | Concern-Isolation |
| **`tasks`** | ✅ Wiederverwendet | Bestehendes Schema | Aufgaben-Auswahl in Mobile App |

**⚠️ WICHTIG:** Zeit-Tracking nutzt Ihre **BESTEHENDEN** Collections!

---

### **NEUE Collections (für Zeit-Tracking):**

| Collection | Zweck | Mobile App | Web Portal | Cloud Functions |
|-----------|-------|------------|------------|-----------------|
| **`punches`** | Zeitstempelungen (Start/Stop) | ✅ Erstellt | ✅ Anzeigt | ✅ Validiert |
| **`timesheets`** | Stundenzettel-Perioden (nested) | ✅ Erstellt | ✅ Anzeigt | ✅ Berechnet |
| **`sites`** | Standorte mit Geofencing | 🔶 Lädt | ✅ Verwaltet | ✅ Validiert |
| **`mileage`** | Fahrtenbuch | ✅ Erstellt | ✅ Anzeigt | - |
| **`leave`** | Urlaubsanträge | ✅ Erstellt | ✅ Genehmigt | ✅ Validiert |
| **`policies`** | Arbeitszeit-Richtlinien | 🔶 Lädt | ✅ Verwaltet | ✅ Nutzt |
| **`approvals`** | Genehmigungen | 🔶 Lädt | ✅ Verwaltet | ✅ Erstellt |
| **`auditLogs`** | Prüfprotokolle (unveränderlich) | - | ✅ Anzeigt | ✅ Erstellt |
| **`assignments`** | User-zu-Projekt/Site-Zuweisungen | 🔶 Lädt | ✅ Verwaltet | - |

**Legende:**
- ✅ = Vollständig implementiert
- 🔶 = Download-only (Master Data)
- - = Nicht verwendet

---

## 🔄 Collections-Schema

### **1. projects (BESTEHEND - wiederverwendet)**

Ihr bestehendes Schema wird für Zeit-Tracking verwendet:

```typescript
{
  // Bestehendes Projekt-Schema aus Ihrer App
  // concernId wird für Isolation genutzt
  // active wird für Filterung genutzt
}
```

**Mobile App liest:**
```sql
SELECT * FROM tt_projects WHERE active = 1 ORDER BY name ASC
```

---

### **2. tasks (BESTEHEND - wiederverwendet)**

Ihre bestehende tasks collection:

```typescript
{
  // Bestehendes Task-Schema
  // concernId wird für Isolation genutzt
  projectId?: string;  // Verknüpfung zu Projekt
}
```

**Mobile App liest:**
```sql
SELECT * FROM tt_tasks WHERE concernId = ? ORDER BY name ASC
```

---

### **3. punches (NEU)**

```typescript
{
  punchId: string;           // UUID
  uid: string;               // User ID
  periodId: string;          // z.B. "2025-W42"
  projectId: string;         // Referenz zu bestehender projects collection ✅
  taskId?: string;           // Referenz zu bestehender tasks collection ✅
  siteId?: string;           // Referenz zu sites collection
  startAt: Timestamp;
  endAt?: Timestamp;
  durationSec?: number;
  method: 'manual' | 'geofence' | 'qr' | 'nfc';
  locationStart?: {lat: number, lng: number, acc?: number};
  locationEnd?: {lat: number, lng: number, acc?: number};
  breakSec: number;
  notes?: string;
  attachments?: string[];
  supervisorNote?: string;
  audit: {
    createdBy: string;
    createdAt: Timestamp;
    updatedBy?: string;
    updatedAt?: Timestamp;
  };
  concernId: string;         // Multi-Tenant Isolation
  synced?: boolean;          // Nur Mobile App (lokal)
}
```

---

### **4. sites (NEU)**

```typescript
{
  siteId: string;
  name: string;
  geo: {
    lat: number;
    lng: number;
  };
  radiusMeters: number;      // Geofence-Radius
  projectIds: string[];      // Referenz zu bestehender projects collection ✅
  concernId: string;
  qrCode?: string;
  nfcTagId?: string;
}
```

---

### **5. timesheets/{uid}/periods/{periodId} (NEU - nested)**

```typescript
{
  startDate: Timestamp;
  endDate: Timestamp;
  status: 'open' | 'submitted' | 'approved' | 'locked';
  totals: {
    hours: number;
    overtime: number;
    billableHours: number;
  };
  updatedAt: Timestamp;
}
```

---

### **6. assignments (NEU)**

```typescript
{
  assignmentId: string;
  uid: string;               // User ID
  projectId: string;         // Referenz zu bestehender projects collection ✅
  taskIds: string[];         // Referenz zu bestehender tasks collection ✅
  siteIds: string[];         // Referenz zu sites collection
  active: boolean;
}
```

**Zweck:** Definiert welche Projekte/Tasks/Sites ein User sehen/nutzen darf

---

## ✅ KORREKTE VERWENDUNG:

### **In Mobile App (zeit_sync_service.dart):**

```dart
// ✅ KORREKT - Nutzt BESTEHENDE projects collection
final snapshot = await _firestore
    .collection('projects')  // ← IHRE bestehende Collection
    .where('concernId', isEqualTo: concernId)
    .where('active', isEqualTo: true)
    .get();

// ✅ KORREKT - Nutzt BESTEHENDE tasks collection  
final snapshot = await _firestore
    .collection('tasks')  // ← IHRE bestehende Collection
    .get();

// ✅ NEU - Erstellt NEUE punches collection
final docRef = _firestore
    .collection('punches')  // ← NEU für Zeit-Tracking
    .doc(entry.docId);
```

---

## 🎯 WAS PASSIERT BEIM SYNC:

### **Schritt 1: User drückt "Daten synchronisieren"**

1. **Lädt BESTEHENDE Projekte:**
   ```
   Firestore: projects (concernId = "DE689E0F2D", active = true)
   → SQLite: tt_projects
   → UI: Projekt-Picker Dialog
   ```

2. **Lädt BESTEHENDE Tasks:**
   ```
   Firestore: tasks
   → SQLite: tt_tasks  
   → UI: Task-Auswahl (zukünftig)
   ```

3. **Lädt NEUE Sites:**
   ```
   Firestore: sites (concernId = "DE689E0F2D")
   → SQLite: tt_sites
   → UI: Standort-Auswahl mit Geofence
   ```

4. **Lädt NEUE Assignments:**
   ```
   Firestore: assignments (uid = "USER_ID")
   → SQLite: tt_assignments
   → Logic: Filtert welche Projects/Tasks User sehen darf
   ```

---

## 🔧 KONFIGURATION - Was Sie tun müssen:

### **Option A: Bestehende Projects nutzen (EMPFOHLEN)**

Ihre bestehenden Projekte in der `projects` collection werden **automatisch** im Zeit-System verfügbar, wenn:

1. ✅ Sie haben `concernId` Feld
2. ✅ Sie haben `active` Feld
3. ✅ Sie haben `name` Feld

**KEINE ÄNDERUNGEN NÖTIG!** Die App lädt sie beim Sync.

---

### **Option B: Neue Zeit-spezifische Projects**

Falls Sie **separate** Projekte für Zeit-Tracking wollen:

1. Erstellen Sie Projekte in der bestehenden `projects` collection
2. Fügen Sie zusätzliches Feld hinzu (optional):
   ```json
   {
     "timeTrackingEnabled": true
   }
   ```
3. Passen Sie Sync-Query an (falls nötig)

---

## 📋 COLLECTIONS-ZUSAMMENFASSUNG:

### **Ihre BESTEHENDEN Collections:**
```
✅ projects       → Wird genutzt für Projekt-Auswahl
✅ tasks          → Wird genutzt für Task-Auswahl  
✅ users          → Wird genutzt für RBAC
✅ concern        → Wird genutzt für Multi-Tenant
✅ customers      → Nicht genutzt von Zeit-System
✅ materials      → Nicht genutzt von Zeit-System
✅ categories     → Nicht genutzt von Zeit-System
... (alle anderen bestehenden Collections bleiben unverändert)
```

### **NEUE Collections für Zeit-Tracking:**
```
🆕 punches        → Zeitstempelungen
🆕 timesheets     → Stundenzettel (nested unter users)
🆕 sites          → Standorte mit Geofencing
🆕 mileage        → Fahrtenbuch
🆕 leave          → Urlaubsanträge
🆕 policies       → Zeit-Richtlinien
🆕 approvals      → Genehmigungen
🆕 auditLogs      → Prüfprotokolle
🆕 assignments    → User-Zuweisungen
```

---

## 🎯 NÄCHSTER SCHRITT:

### **Testen Sie jetzt:**

1. **Öffnen Sie Firebase Console:**
   https://console.firebase.google.com/u/0/project/reportingapp817/firestore/databases/-default-/data/

2. **Überprüfen Sie bestehende `projects` Collection:**
   - Haben Ihre Projekte ein `concernId` Feld?
   - Haben Sie ein `active` Feld?

3. **Falls JA:** Die Mobile App wird sie **automatisch** beim Sync laden!

4. **Falls NEIN:** Sagen Sie mir, welches Schema Ihre Projects haben, und ich passe die Sync-Logik an.

---

**Welches Schema haben Ihre bestehenden Projekte in der `projects` collection?**














