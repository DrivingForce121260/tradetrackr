# TradeTrackr Apps

Übersicht aller TradeTrackr-Anwendungen in diesem Monorepo.

## Apps

### 1. TradeTrackr Scan (`apps/tt-scan/`)

**Typ**: Mobile App (React Native + Expo)
**Plattformen**: iOS, Android
**Status**: ✅ Fertig

Mobile Scanner-App zum Erfassen und Hochladen von Dokumenten.

**Hauptfunktionen**:
- Login mit TradeTrackr-Credentials
- Multi-Page-Dokumentenerfassung mit Kamera
- PDF-Generierung aus Scans
- Direct Upload zu Firebase Storage und Firestore
- Automatisches Routing (optional)

**Quick Start**:
```bash
cd apps/tt-scan
npm install
npm start
```

**Dokumentation**:
- [README.md](tt-scan/README.md) - Vollständige Dokumentation
- [QUICKSTART.md](tt-scan/QUICKSTART.md) - 5-Minuten-Guide
- [SETUP.md](tt-scan/SETUP.md) - Setup-Anleitung
- [DEPLOYMENT.md](tt-scan/DEPLOYMENT.md) - Deployment-Guide
- [PROJECT_OVERVIEW.md](tt-scan/PROJECT_OVERVIEW.md) - Projekt-Übersicht

---

### 2. TradeTrackr Portal (Geplant)

**Typ**: Web-App (React/Next.js)
**Status**: 🔲 Geplant

Hauptverwaltung für Dokumente, Projekte, Kunden.

---

### 3. TradeTrackr Admin (Geplant)

**Typ**: Web-App (React/Next.js)
**Status**: 🔲 Geplant

Admin-Panel für Systemverwaltung.

---

## Architektur

```
TradeTrackr Ecosystem
├── Mobile App (tt-scan)
│   └── Scanner/Uploader
├── Web Portal
│   └── Dokumentenverwaltung
├── Admin Panel
│   └── System-Administration
└── Backend (Firebase)
    ├── Authentication
    ├── Storage
    ├── Firestore
    └── Cloud Functions
```

## Shared Backend

Alle Apps nutzen dieselbe Firebase-Infrastruktur:

- **Firebase Auth**: Zentrale Benutzerverwaltung
- **Firebase Storage**: Dokumentenspeicher
- **Firebase Firestore**: Metadaten-Datenbank
- **Firebase Functions**: Backend-Logik (OCR, Routing, etc.)

## Development

### Monorepo-Struktur

```
trades-manage-projectCurrent/
├── apps/
│   ├── tt-scan/           # Mobile Scanner App
│   ├── portal/            # (geplant) Web Portal
│   └── admin/             # (geplant) Admin Panel
├── packages/              # Shared packages
│   ├── types/             # Shared TypeScript types
│   ├── utils/             # Shared utilities
│   └── firebase/          # Shared Firebase config
└── functions/             # Firebase Cloud Functions
```

### Setup

1. **Repository klonen**
   ```bash
   git clone [repository-url]
   cd trades-manage-projectCurrent
   ```

2. **App auswählen**
   ```bash
   cd apps/tt-scan
   ```

3. **Installation**
   ```bash
   npm install
   ```

4. **Starten**
   ```bash
   npm start
   ```

## Technologie-Stack

### Mobile (tt-scan)
- React Native + Expo 50
- TypeScript
- Firebase SDK
- React Navigation
- expo-camera, expo-image-manipulator
- pdf-lib

### Web (geplant)
- Next.js 14
- TypeScript
- Firebase SDK
- TailwindCSS
- ShadcN UI

### Backend
- Firebase Auth
- Firebase Storage
- Firebase Firestore
- Firebase Functions (Node.js)
- Cloud Vision API (OCR)

## Firebase-Konfiguration

Jede App benötigt Firebase-Konfiguration. Die Werte sind in der Firebase Console zu finden:

1. Firebase Console öffnen
2. Projekt auswählen
3. Einstellungen → Ihre Apps
4. Web-App-Konfiguration kopieren

## Deployment

### Mobile App (tt-scan)
```bash
cd apps/tt-scan
eas build --platform all
eas submit --platform all
```

### Web Apps (geplant)
```bash
cd apps/portal
npm run build
firebase deploy
```

### Cloud Functions
```bash
cd functions
firebase deploy --only functions
```

## Status

| App | Status | Version | Plattformen |
|-----|--------|---------|-------------|
| tt-scan | ✅ Fertig | 1.0.0 | iOS, Android |
| portal | 🔲 Geplant | - | Web |
| admin | 🔲 Geplant | - | Web |

## Roadmap

### Phase 1 (Aktuell) ✅
- [x] Mobile Scanner App
- [x] Login/Auth
- [x] Multi-Page-Scanning
- [x] PDF-Generierung
- [x] Firebase-Upload

### Phase 2 (Geplant)
- [ ] Web Portal
- [ ] Dokumentenverwaltung
- [ ] Projekt-/Kundenverwaltung
- [ ] OCR-Integration
- [ ] Automatisches Routing

### Phase 3 (Geplant)
- [ ] Admin Panel
- [ ] User Management
- [ ] Analytics Dashboard
- [ ] Reporting

## Contribution

Siehe [CONTRIBUTING.md](tt-scan/CONTRIBUTING.md) für Details.

## Lizenz

© 2024 TradeTrackr. Alle Rechte vorbehalten.











