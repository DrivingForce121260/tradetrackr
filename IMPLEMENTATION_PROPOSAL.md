# Implementierungsvorschlag: Komponenten, Leistung und Gewerk

## Aktueller Status

✅ **Bereits vorhanden:**
- `WorkLine` Interface hat bereits `component` und `gewerk` Felder
- `workDone` Feld existiert (kann als "Leistung" verwendet werden)

❌ **Fehlt noch:**
- UI für Auswahl von Komponenten, Gewerk und Leistung
- API Services zum Laden der Daten
- Firestore Collections müssen geprüft/erstellt werden

## Empfohlene Implementierung

### Phase 1: Gewerk-Auswahl (Priorität: Hoch)

**Warum zuerst:**
- Einfachste Implementierung
- Gewerk ist Pflichtfeld in Arbeitszeilen
- Verbessert sofort die Datenqualität

**Implementierung:**

1. **API Service erweitern** (`src/services/api.ts`):
```typescript
// Gewerk aus Standard-Gewerken laden
export async function getStandardGewerk(concernID: string): Promise<string[]> {
  const gewerkRef = collection(db, 'standardGewerk');
  const q = query(gewerkRef, where('concernID', '==', concernID));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data().gewerk).filter(Boolean).sort();
}

// Projektbezogene Gewerke laden
export async function getProjectGewerk(
  projectNumber: string,
  concernID: string
): Promise<string[]> {
  const geWortRef = collection(db, 'GeWort');
  const q = query(
    geWortRef,
    where('projectNumber', '==', projectNumber),
    where('concernID', '==', concernID)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data().gewerk).filter(Boolean).sort();
}
```

2. **GewerkPicker Komponente** (`src/components/GewerkPicker.tsx`):
```typescript
interface GewerkPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (gewerk: string) => void;
  projectNumber?: string;
  concernID: string;
  selectedGewerk?: string;
}

// Modal mit:
// - Suchfeld
// - Liste: Projekt-Gewerke zuerst, dann Standard-Gewerke
// - Auswahl-Button
```

3. **Integration in CreateReportScreen**:
```typescript
// In workLineForm State:
const [showGewerkPicker, setShowGewerkPicker] = useState(false);

// Button neben "Gewerk" Feld:
<TouchableOpacity onPress={() => setShowGewerkPicker(true)}>
  <Text>Gewerk auswählen</Text>
</TouchableOpacity>

// GewerkPicker Modal:
<GewerkPicker
  visible={showGewerkPicker}
  onClose={() => setShowGewerkPicker(false)}
  onSelect={(gewerk) => {
    setWorkLineForm({ ...workLineForm, gewerk });
    setShowGewerkPicker(false);
  }}
  projectNumber={selectedProject?.projectNumber}
  concernID={session.concernID}
  selectedGewerk={workLineForm.gewerk}
/>
```

### Phase 2: Komponenten-Auswahl (Priorität: Mittel)

**Implementierung:**

1. **API Service** (`src/services/api.ts`):
```typescript
export interface ProjectComponent {
  id: string;
  projectElement: string;
  quantity: number;
  componentLN?: number;
}

export async function getProjectComponents(
  projectNumber: string,
  concernID: string
): Promise<ProjectComponent[]> {
  const componentsRef = collection(db, 'projectComponent');
  const q = query(
    componentsRef,
    where('projectNumber', '==', projectNumber),
    where('concernID', '==', concernID)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as ProjectComponent));
}
```

2. **ComponentPicker Komponente** (`src/components/ComponentPicker.tsx`):
```typescript
interface ComponentPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (component: ProjectComponent) => void;
  projectNumber: string;
  concernID: string;
  selectedComponent?: string;
}

// Modal mit:
// - Suchfeld
// - Liste: projectElement + quantity (z.B. "Kabel (5x)")
// - Auswahl-Button
```

3. **Integration**:
- Ähnlich wie GewerkPicker
- Optionales Feld (kann leer bleiben)

### Phase 3: Leistung mit AutoComplete (Priorität: Mittel)

**Implementierung:**

1. **API Service** (`src/services/api.ts`):
```typescript
export interface StandardLeistung {
  id: string;
  leistung: string;
  LVPos?: string;
  unit?: string;
}

export async function getStandardLeistung(
  concernID: string
): Promise<StandardLeistung[]> {
  const leistungRef = collection(db, 'standardLeistung');
  const q = query(leistungRef, where('concernID', '==', concernID));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as StandardLeistung));
}
```

2. **LeistungInput Komponente** (`src/components/LeistungInput.tsx`):
```typescript
interface LeistungInputProps {
  value: string;
  onChangeText: (text: string) => void;
  concernID: string;
  placeholder?: string;
}

// TextField mit:
// - AutoComplete aus Standard-Leistungen
// - Optional: Speech-to-Text Button (später)
// - Button zum Öffnen des Leistungsverzeichnisses (Modal)
```

3. **Integration**:
- Ersetzt aktuelles `workDone` Textfeld
- AutoComplete zeigt Vorschläge beim Tippen

## UI-Layout Vorschlag

```
Arbeitszeilen-Formular:
┌─────────────────────────────────────┐
│ Gewerk *                            │
│ [Gewerk auswählen ▼]                │
├─────────────────────────────────────┤
│ Komponente (optional)               │
│ [Komponente auswählen ▼]            │
├─────────────────────────────────────┤
│ Leistung *                          │
│ [Textfeld mit AutoComplete...]      │
│ [📋 Leistungsverzeichnis]           │
├─────────────────────────────────────┤
│ Menge: [1]                          │
│ Stunden: [1]                         │
│ Zusatztext: [________________]      │
└─────────────────────────────────────┘
```

## Datenstruktur

**WorkLine (bereits vorhanden):**
```typescript
interface WorkLine {
  component: string;      // ✅ Bereits vorhanden
  gewerk: string;         // ✅ Bereits vorhanden
  workDone: string;       // ✅ Bereits vorhanden (wird als "Leistung" verwendet)
  // ... andere Felder
}
```

## Firestore Collections

**Zu prüfen/erstellen:**
1. `standardGewerk` - Standard-Gewerke pro Concern
2. `GeWort` - Projektbezogene Gewerke
3. `projectComponent` - Projekt-Komponenten
4. `standardLeistung` - Standard-Leistungen

**Datenstruktur:**
```typescript
// standardGewerk
{
  gewerk: string;
  concernID: string;
  dateCreated: Timestamp;
}

// GeWort (projektbezogene Gewerke)
{
  projectNumber: string;
  gewerk: string;
  projectNachtrag?: number;
  concernID: string;
}

// projectComponent
{
  projectNumber: string;
  projectElement: string;
  quantity: number;
  componentLN?: number;
  concernID: string;
}

// standardLeistung
{
  leistung: string;
  LVPos?: string;
  unit?: string;
  concernID: string;
}
```

## Implementierungsreihenfolge

1. ✅ **Gewerk** (1-2 Stunden)
   - API Service
   - GewerkPicker Komponente
   - Integration in CreateReportScreen

2. ✅ **Komponenten** (2-3 Stunden)
   - API Service
   - ComponentPicker Komponente
   - Integration in CreateReportScreen

3. ✅ **Leistung** (2-3 Stunden)
   - API Service
   - LeistungInput mit AutoComplete
   - Optional: Leistungsverzeichnis-Modal

**Gesamtaufwand:** ~6-8 Stunden

## Nächste Schritte

1. Firestore Collections prüfen/erstellen
2. API Services implementieren
3. UI Komponenten erstellen
4. Integration in CreateReportScreen
5. Testing mit echten Daten

## Fragen zur Klärung

1. Existieren die Firestore Collections bereits?
2. Sollen Standard-Daten beim ersten Sync geladen werden?
3. Soll Speech-to-Text für Leistung implementiert werden?
4. Sollen Komponenten nach Gewerk gefiltert werden können?






