# ⏱️ TradeTrackr Web Portal - Zeit-Administration

**Version:** 1.0  
**Status:** ✅ MVP Ready  
**Datum:** 21. Oktober 2025

---

## 🎯 Übersicht

Das **Time Admin Modul** erweitert das TradeTrackr Web-Portal um vollständige Verwaltungsfunktionen für die Mobile Zeit-Erfassung.

---

## 📁 Struktur

```
src/components/timeAdmin/
├── TimeAdminDashboard.tsx      ✅ KPIs, Aktive Schichten, Quick Actions
├── SitesGeofenceAdmin.tsx      ✅ Baustellen + Geofence-Editor
├── ApprovalsAdmin.tsx          ✅ Genehmigungen-Queue
├── TimesheetsAdmin.tsx         ✅ Perioden-Verwaltung
├── ExportsAdmin.tsx            ✅ CSV/PDF/DATEV-Export
└── index.ts                    ✅ Export

src/services/
└── timeAdminService.ts         ✅ API Wrapper für Firestore
```

---

## 🚀 Features

### 1. Dashboard
- KPI-Cards: Aktive Schichten, Genehmigungen, Urlaubsanträge, Wochen-Stunden
- Live-Liste aktiver Punches
- Quick-Actions zu allen Modulen

### 2. Baustellen-Verwaltung  
- CRUD für Sites
- Geofence-Radius-Editor
- GPS-Koordinaten-Editor
- QR-Code-Support
- Map-Integration (vorbereitet)

### 3. Genehmigungen
- Unified Queue
- Approve/Reject Workflow
- Kommentar-Funktion
- Bulk-Operations (vorbereitet)

### 4. Stundenzettel
- Perioden-Liste
- Status-Management
- Lock/Unlock Funktion

### 5. Exporte
- CSV Export
- PDF Export  
- DATEV Export (DE-Format)
- Cloud Function Integration

---

## 🔧 Installation

### 1. Dependencies

Bereits im Projekt vorhanden:
```json
{
  "@tanstack/react-query": "^5.56.2",
  "firebase": "^12.1.0",
  "react-hook-form": "^7.53.0",
  "zod": "^3.23.8",
  "date-fns": "^3.6.0"
}
```

### 2. Firebase Konfiguration

Bereits konfiguriert in `src/config/firebase.ts`.

---

## 🗺️ Routing

Integration in Ihre Haupt-App (z.B. `App.tsx` oder Router):

```typescript
import {
  TimeAdminDashboard,
  SitesGeofenceAdmin,
  ApprovalsAdmin,
  TimesheetsAdmin,
  ExportsAdmin,
} from './components/timeAdmin';

// Routes hinzufügen:
{
  path: '/time-admin',
  element: <TimeAdminDashboard concernId={userConcernId} />,
},
{
  path: '/time-admin/sites',
  element: <SitesGeofenceAdmin concernId={userConcernId} />,
},
{
  path: '/time-admin/approvals',
  element: <ApprovalsAdmin concernId={userConcernId} />,
},
{
  path: '/time-admin/timesheets',
  element: <TimesheetsAdmin concernId={userConcernId} />,
},
{
  path: '/time-admin/exports',
  element: <ExportsAdmin concernId={userConcernId} />,
},
```

---

## 🔐 Security & RBAC

### Firestore Rules

Bereits implementiert in `firebase/firestore_zeit_rules.txt`.

### Role-Based Access

```typescript
// Nur Admin/Supervisor haben Zugriff
const userRole = currentUser.role;
const hasAccess = userRole === 'admin' || userRole === 'supervisor';

if (!hasAccess) {
  // Redirect oder 403 Error
}
```

---

## 📊 Usage

### Im Web-Portal:

1. **Login** als Admin/Supervisor
2. **Navigation** → "Zeit | Admin"
3. **Dashboard** öffnet sich mit KPIs
4. **Module nutzen:**
   - Baustellen anlegen/bearbeiten
   - Genehmigungen bearbeiten
   - Stundenzettel ansehen
   - Exporte erstellen

---

## 🔗 Integration mit Mobile App

```
┌─────────────────────────────────┐
│   Mobile App (Flutter)           │
│   - Punches erstellen            │
│   - Timesheets generieren        │
└──────────────┬──────────────────┘
               │
               ↓ Firestore Sync
┌──────────────┴──────────────────┐
│   Cloud Firestore                │
│   - punches/                     │
│   - timesheets/{uid}/periods/   │
│   - sites/, leave/              │
└──────────────┬──────────────────┘
               │
               ↓ Real-time Listeners
┌──────────────┴──────────────────┐
│   Web Portal (React)             │
│   - Dashboard (KPIs)             │
│   - Genehmigungen                │
│   - Exporte                      │
└──────────────────────────────────┘
```

---

## 🚀 Deployment

### Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
```

### Firebase Hosting
```bash
firebase deploy --only hosting
```

---

## ✅ MVP Status

**Implementiert:**
- ✅ TimeAdminDashboard mit KPIs
- ✅ SitesGeofenceAdmin mit Editor
- ✅ ApprovalsAdmin (Basis)
- ✅ TimesheetsAdmin (Basis)
- ✅ ExportsAdmin (Basis)
- ✅ timeAdminService

**Bereit für Erweiterung:**
- UsersAdmin (CRUD Users & Rollen)
- ProjectsTasksAdmin (CRUD Projekte & Aufgaben)
- PoliciesAdmin (Arbeitsregeln-Editor)
- AuditLogsAdmin (Audit-Trail-Viewer)
- Map-Integration (Google Maps/MapLibre)

---

## 📞 Support

Siehe Haupt-Projekt-Dokumentation.

**Status:** ✅ MVP READY  
**Version:** 1.0  
**Datum:** 21. Oktober 2025
















