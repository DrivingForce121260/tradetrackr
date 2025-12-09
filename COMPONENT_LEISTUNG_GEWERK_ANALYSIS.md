# Analyse: Komponenten, Leistung und Gewerk aus alter Mobile App

## Übersicht

Die alte Flutter-App hatte drei wichtige Features für die Berichtserstellung:
1. **Komponenten-Auswahl** (Components)
2. **Leistung** (Work Done / Leistungsverzeichnis)
3. **Gewerk** (Trade/Craft)

## Analyse der alten Implementierung

### 1. Komponenten (Components)

**Datenquelle:**
- Firestore Collection: `projectComponent`
- SQLite Tabelle: `projectComponent` (lokal synchronisiert)

**Felder:**
- `projectElement`: Name der Komponente (z.B. "Kabel", "Steckdose")
- `quantity`: Anzahl/Menge
- `componentLN`: Laufnummer der Komponente
- `projectNumber`: Projektnummer
- `projectNachtrag`: Nachtragsnummer
- `concernID`: Mandanten-ID

**Funktionalität:**
- Komponenten werden projektbezogen geladen
- Auswahl über dynamische Buttons oder Dropdown
- Komponenten werden in Berichtszeilen gespeichert
- Lokale SQLite-Synchronisation für Offline-Verfügbarkeit

**UI-Beispiel:**
```dart
// Dynamische Buttons für Komponenten
Category2DynamicButtons(
  onButtonPressed: (familyId) {
    // Zeige Komponenten dieser Familie
  }
)
```

### 2. Leistung (Leistungsverzeichnis)

**Datenquelle:**
- Firestore Collection: `leistungsVerzeichnis`
- SQLite Tabelle: `standardLeistung` (Standard-Leistungen)
- Projektbezogene Leistungen aus `leistungsVerzeichnis`

**Felder:**
- `description`: Beschreibung der Leistung
- `LVPos`: Leistungsverzeichnis-Position
- `menge`: Menge
- `unit`: Einheit
- `projectNumber`: Projektnummer (optional)

**Funktionalität:**
- Textfeld für "Geleistete Arbeit"
- Speech-to-Text Integration (Mikrofon-Button)
- Auswahl aus Standard-Leistungen möglich
- Projektbezogene Leistungen können geladen werden
- Wird in Berichtszeilen als `leistung` gespeichert

**UI-Beispiel:**
```dart
TextFormField(
  controller: textFieldLeistungTextController,
  hintText: 'Geleistete Arbeit ...',
  // Mit Mikrofon-Button für Speech-to-Text
)
```

### 3. Gewerk (Trade/Craft)

**Datenquelle:**
- Firestore Collection: `standardGewerk` (Standard-Gewerke)
- Firestore Collection: `GeWort` (projektbezogene Gewerke)
- SQLite Tabelle: `GeWort` (lokal synchronisiert)

**Felder:**
- `gewerk`: Name des Gewerks (z.B. "Elektro", "Sanitär", "Heizung")
- `projectNumber`: Projektnummer (bei projektbezogenen Gewerken)
- `concernID`: Mandanten-ID

**Funktionalität:**
- Button/Dropdown zur Auswahl des Gewerks
- Projektbezogene Filterung
- Standard-Gewerke als Fallback
- Wird in Berichtszeilen als `gewerk` gespeichert

**UI-Beispiel:**
```dart
FFButtonWidget(
  text: 'Gewerk',
  onPressed: () {
    // Zeige Gewerk-Auswahl
    FFAppState().selectGewerkInProject = true;
  }
)
```

## Vorschläge für React Native Implementierung

### Option 1: Einfache Dropdown-Auswahl (Schnellste Implementierung)

**Komponenten:**
- Dropdown mit projektbezogenen Komponenten
- Anzeige: `projectElement` + `quantity` (z.B. "Kabel (5x)")
- Optional: Komponenten-Filter nach Kategorie

**Leistung:**
- Textfeld mit AutoComplete
- Vorschläge aus Standard-Leistungen
- Optional: Speech-to-Text Button

**Gewerk:**
- Dropdown mit projektbezogenen Gewerken
- Fallback auf Standard-Gewerke
- Alphabetisch sortiert

**Vorteile:**
- Schnell implementierbar
- Einfache UI
- Geringer Entwicklungsaufwand

**Nachteile:**
- Weniger flexibel
- Keine erweiterten Features

### Option 2: Erweiterte Auswahl mit Modals (Empfohlen)

**Komponenten:**
- Button öffnet Modal mit:
  - Suchfeld für Komponenten
  - Liste der projektbezogenen Komponenten
  - Anzeige: Name, Menge, Laufnummer
  - Filter nach Kategorie (falls vorhanden)
- Ausgewählte Komponente wird in Arbeitszeile angezeigt

**Leistung:**
- Textfeld mit:
  - AutoComplete aus Standard-Leistungen
  - Speech-to-Text Button (optional)
  - Button zum Öffnen des Leistungsverzeichnisses
- Modal mit:
  - Suchfeld
  - Liste der Standard-Leistungen
  - Projektbezogene Leistungen (falls vorhanden)
  - Anzeige: LVPos, Beschreibung, Einheit

**Gewerk:**
- Button öffnet Modal mit:
  - Suchfeld
  - Projektbezogene Gewerke (priorisiert)
  - Standard-Gewerke (als Fallback)
  - Alphabetisch sortiert
- Ausgewähltes Gewerk wird in Arbeitszeile angezeigt

**Vorteile:**
- Bessere UX
- Flexibler
- Konsistent mit bestehender UI (Location Picker)

**Nachteile:**
- Mehr Entwicklungsaufwand
- Mehr Code

### Option 3: Integrierte Auswahl in Arbeitszeilen-Formular (Optimal)

**Struktur:**
```
Arbeitszeile Formular:
├── Komponente (Dropdown/Modal)
├── Gewerk (Dropdown/Modal)
├── Leistung (Textfeld + AutoComplete + Speech-to-Text)
├── Menge
├── Stunden
└── Zusatztext
```

**Features:**
- Alle drei Felder in einem Formular
- Abhängigkeiten: Gewerk kann Komponenten filtern
- Auto-Save bei Auswahl
- Validierung: Gewerk ist Pflichtfeld

**Vorteile:**
- Beste UX
- Alles an einem Ort
- Logische Gruppierung

**Nachteile:**
- Höchster Entwicklungsaufwand
- Komplexere Logik

## Empfohlene Implementierung (Option 2)

### Schritt 1: Datenstruktur erweitern

**Firestore Collections:**
- `projectComponents` (bereits vorhanden?)
- `standardGewerk` (bereits vorhanden?)
- `standardLeistung` (bereits vorhanden?)

**TypeScript Types:**
```typescript
interface ProjectComponent {
  id: string;
  projectNumber: string;
  projectElement: string;
  quantity: number;
  componentLN?: number;
  concernID: string;
}

interface StandardGewerk {
  id: string;
  gewerk: string;
  concernID: string;
}

interface StandardLeistung {
  id: string;
  leistung: string;
  LVPos?: string;
  unit?: string;
  concernID: string;
}
```

### Schritt 2: API Services erstellen

```typescript
// src/services/api.ts

export async function getProjectComponents(
  projectNumber: string,
  concernID: string
): Promise<ProjectComponent[]> {
  // Firestore Query
}

export async function getStandardGewerk(
  concernID: string
): Promise<StandardGewerk[]> {
  // Firestore Query
}

export async function getProjectGewerk(
  projectNumber: string,
  concernID: string
): Promise<StandardGewerk[]> {
  // Firestore Query (GeWort Collection)
}

export async function getStandardLeistung(
  concernID: string
): Promise<StandardLeistung[]> {
  // Firestore Query
}
```

### Schritt 3: UI Komponenten erstellen

**ComponentPicker.tsx:**
- Modal mit Suchfeld
- Liste der projektbezogenen Komponenten
- Auswahl und Rückgabe

**GewerkPicker.tsx:**
- Modal mit Suchfeld
- Projektbezogene Gewerke (priorisiert)
- Standard-Gewerke (Fallback)
- Auswahl und Rückgabe

**LeistungInput.tsx:**
- Textfeld mit AutoComplete
- Vorschläge aus Standard-Leistungen
- Optional: Speech-to-Text Button
- Button zum Öffnen des Leistungsverzeichnisses

### Schritt 4: Integration in CreateReportScreen

**Arbeitszeilen-Formular erweitern:**
```typescript
const [workLineForm, setWorkLineForm] = useState({
  component: '',      // NEU
  gewerk: '',          // NEU
  workDone: '',        // Umbenannt von "workDone" zu "leistung"
  quantity: '1',
  hours: '1',
  text: '',
  zusatz: '',
});
```

**UI-Reihenfolge:**
1. Gewerk (Pflichtfeld)
2. Komponente (Optional)
3. Leistung (Pflichtfeld)
4. Menge
5. Stunden
6. Zusatztext

## Implementierungsreihenfolge

1. **Phase 1: Gewerk** (Einfachste)
   - API Service für Gewerk
   - GewerkPicker Komponente
   - Integration in Arbeitszeilen-Formular

2. **Phase 2: Komponenten**
   - API Service für Komponenten
   - ComponentPicker Komponente
   - Integration in Arbeitszeilen-Formular

3. **Phase 3: Leistung**
   - API Service für Leistung
   - LeistungInput mit AutoComplete
   - Optional: Speech-to-Text Integration
   - Integration in Arbeitszeilen-Formular

## Offline-Support

- Lokale SQLite-Synchronisation (wie in alter App)
- Caching der Standard-Daten (Gewerk, Leistung)
- Projektbezogene Daten beim Projekt-Sync laden

## Migration von alter App

- Firestore Collections bleiben gleich
- Datenstruktur kompatibel halten
- Bestehende Daten können weiterverwendet werden






