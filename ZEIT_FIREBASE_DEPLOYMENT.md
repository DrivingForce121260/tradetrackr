# TradeTrackr Zeit-Tracking - Firebase Deployment Guide

Vollständige Anleitung zum Deployen der Zeiterfassung-Komponenten in Firebase.

## 📋 Übersicht

Die Zeiterfassung besteht aus drei Hauptkomponenten:
1. **Firestore Security Rules** - Datenzugriffskontrolle
2. **Cloud Functions** - Server-seitige Logik
3. **Firestore Indexes** - Performance-Optimierung

---

## 🔐 1. Firestore Security Rules Deployen

### Schritt 1: Regeln überprüfen

Die Zeiterfassung-Regeln befinden sich in `firestore.rules` und umfassen:

- ✅ `punches` - Zeitstempelungen
- ✅ `timesheets` - Stundenzettel
- ✅ `sites` - Standorte mit Geofencing
- ✅ `mileage` - Fahrtenbuch
- ✅ `leave` - Urlaubsanträge
- ✅ `policies` - Richtlinien
- ✅ `approvals` - Genehmigungen
- ✅ `auditLogs` - Prüfprotokolle
- ✅ `time_tasks` - Aufgaben
- ✅ `assignments` - Zuweisungen

### Schritt 2: Rules deployen

```powershell
# Im Projekt-Hauptverzeichnis
cd C:\Users\david\OneDrive\Apps\TradrTrackr\trades-manage-projectCurrent

# Firebase Rules deployen
firebase deploy --only firestore:rules
```

### Schritt 3: Deployment verifizieren

```powershell
firebase firestore:rules get
```

---

## ☁️ 2. Cloud Functions Deployen

### Schritt 1: Dependencies installieren

```powershell
cd functions
npm install
```

### Schritt 2: TypeScript kompilieren

```powershell
npm run build
```

### Schritt 3: Functions deployen

**Option A: Alle Functions deployen**
```powershell
firebase deploy --only functions
```

**Option B: Nur Zeit-Functions deployen**
```powershell
firebase deploy --only functions:onPunchWrite,functions:exportTimesheet,functions:scheduledDailyClose,functions:approveItem
```

### Implementierte Functions:

#### 1. `onPunchWrite` (Trigger)
- **Typ:** Firestore Trigger
- **Trigger:** `punches/{punchId}` onWrite
- **Funktion:** 
  - Berechnet Dauer bei Punch-Ende
  - Validiert Überlappungen
  - Prüft Geofence-Compliance
  - Aktualisiert Timesheet-Summen

#### 2. `exportTimesheet` (Callable)
- **Typ:** HTTPS Callable
- **Parameter:**
  ```typescript
  {
    uid: string;
    periodId: string;
    format: 'csv' | 'pdf' | 'datev';
    concernId: string;
  }
  ```
- **Rückgabe:** 
  ```typescript
  {
    url: string;          // Signed Download-URL
    fileName: string;
    expiresAt: string;    // ISO-Datum
  }
  ```
- **Funktion:** Generiert Stundenzettel-Exporte

#### 3. `scheduledDailyClose` (Scheduled)
- **Typ:** PubSub Scheduled
- **Schedule:** Täglich um 23:59 (Europe/Berlin)
- **Funktion:** Beendet automatisch alle offenen Punches

#### 4. `approveItem` (Callable)
- **Typ:** HTTPS Callable
- **Parameter:**
  ```typescript
  {
    targetType: 'punch' | 'timesheet' | 'leave';
    targetId: string;
    userId?: string;
    periodId?: string;
    status: 'approved' | 'rejected';
    comment: string;
  }
  ```
- **Funktion:** Genehmigt/lehnt Zeiterfassung-Items ab

---

## 📊 3. Firestore Indexes Erstellen

### Automatische Index-Erstellung

Firestore erstellt automatisch Indexes für einfache Abfragen. Für komplexe Abfragen:

### Manuelle Index-Definition

Erstellen Sie `firestore.indexes.json` mit:

```json
{
  "indexes": [
    {
      "collectionGroup": "punches",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "uid", "order": "ASCENDING" },
        { "fieldPath": "concernId", "order": "ASCENDING" },
        { "fieldPath": "startAt", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "punches",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "uid", "order": "ASCENDING" },
        { "fieldPath": "periodId", "order": "ASCENDING" },
        { "fieldPath": "endAt", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "punches",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "concernId", "order": "ASCENDING" },
        { "fieldPath": "endAt", "order": "ASCENDING" }
      ]
    }
  ]
}
```

### Indexes deployen

```powershell
firebase deploy --only firestore:indexes
```

---

## 🧪 4. Testing

### Functions lokal testen

```powershell
cd functions
npm run serve
```

Dies startet den Firebase Emulator auf:
- Functions: `http://localhost:5001`
- Firestore: `http://localhost:8080`

### Functions manuell testen

**ExportTimesheet testen:**
```javascript
// In Firebase Console > Functions
const functions = require('firebase-functions-test')();
const myFunctions = require('./lib/index');

const wrapped = functions.wrap(myFunctions.exportTimesheet);
wrapped({
  uid: 'TEST_USER_ID',
  periodId: 'TEST_PERIOD_ID',
  format: 'csv',
  concernId: 'TEST_CONCERN_ID'
}, {
  auth: { uid: 'TEST_USER_ID' }
});
```

---

## 📱 5. Mobile App Integration

### SQLite zu Firestore Sync

Die Mobile App synchronisiert automatisch:

1. **Offline Queue** (`tt_sync_outbox`)
2. **Bidirektional** - SQLite ↔ Firestore
3. **Konfliktlösung** - Server wins

### Cloud Function Aufrufe

```dart
// In Flutter
import 'package:cloud_functions/cloud_functions.dart';

final functions = FirebaseFunctions.instance;

// Export aufrufen
final result = await functions
    .httpsCallable('exportTimesheet')
    .call({
      'uid': currentUserUid,
      'periodId': periodId,
      'format': 'csv',
      'concernId': concernId,
    });

final downloadUrl = result.data['url'];
```

---

## 🌐 6. Web Portal Integration

### Service Layer

Die Services (`timeAdminService.ts`, `timeOpsService.ts`) rufen die Functions auf:

```typescript
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();

export const exportTimesheetAPI = async (params: ExportParams) => {
  const exportTimesheet = httpsCallable(functions, 'exportTimesheet');
  const result = await exportTimesheet(params);
  return result.data;
};
```

---

## 🔍 7. Monitoring

### Logs ansehen

```powershell
# Alle Function Logs
firebase functions:log

# Spezifische Function
firebase functions:log --only onPunchWrite

# Live-Logs
firebase functions:log --tail
```

### Firebase Console

1. Öffnen Sie [Firebase Console](https://console.firebase.google.com/)
2. Wählen Sie Ihr Projekt
3. Gehen Sie zu **Functions** > **Logs**

---

## ⚠️ 8. Troubleshooting

### Häufige Fehler

**1. "Permission Denied" Fehler**
```powershell
# Firestore Rules erneut deployen
firebase deploy --only firestore:rules
```

**2. Function Timeout**
```typescript
// In functions/src/index.ts
// Timeout erhöhen (max 540s)
exports.myFunction = functions
  .runWith({ timeoutSeconds: 300 })
  .https.onCall(...)
```

**3. "Index not ready" Fehler**
```powershell
# Indexes deployen
firebase deploy --only firestore:indexes
# Warten Sie 5-10 Minuten
```

### Debug-Modus

```typescript
// In Cloud Function
console.log('DEBUG:', JSON.stringify(data, null, 2));
console.error('ERROR:', error);
```

---

## 🚀 9. Produktions-Deployment Checklist

- [ ] **Firestore Rules** getestet und deployed
- [ ] **Cloud Functions** kompiliert ohne Fehler
- [ ] **All Functions** deployed und aktiv
- [ ] **Indexes** erstellt und aktiv
- [ ] **Security** - concernId-Isolation funktioniert
- [ ] **Monitoring** - Logs werden korrekt geschrieben
- [ ] **Mobile App** - Offline-Sync funktioniert
- [ ] **Web Portal** - Admin/Ops-Dashboards funktionieren
- [ ] **Performance** - Keine Timeouts in Production
- [ ] **Backup** - Firestore Backup aktiviert

---

## 📞 Support

Bei Problemen:
1. Überprüfen Sie die Firebase Console Logs
2. Testen Sie mit Firebase Emulator
3. Verifizieren Sie Firestore Rules mit Test-Suite
4. Kontaktieren Sie das Entwicklerteam

---

**Letzte Aktualisierung:** 21.10.2025  
**Version:** 1.0.0















