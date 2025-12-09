# Icon Utilities - Optimiert

Eine umfassende Sammlung von optimierten Icon-Utility-Funktionen für das TradeTrackr-Projekt.

## 🚀 Features

### Zentrale Konfiguration
- **Einheitliche Größen**: Konsistente Icon-Größen von `xs` bis `2xl`
- **Standardisierte Farben**: Vordefinierte Farbschemata für alle Anwendungsfälle
- **Button-Varianten**: Verschiedene Button-Stile (primary, secondary, danger, success, outline, ghost)
- **Responsive Design**: Automatische Größenanpassung basierend auf Bildschirmgröße

### Optimierte Komponenten
- **BaseIcon**: Basis-Icon-Komponente mit Memoization für bessere Performance
- **IconButton**: Vollständig konfigurierbare Icon-Buttons mit verschiedenen Varianten
- **StatusIcon**: Vordefinierte Status-Icons mit deutschen Labels
- **CommonIcons**: Schnellzugriff auf häufig verwendete Icons

### Utility-Funktionen
- **Größen-Management**: Automatische Größenanpassung und Skalierung
- **Farb-Management**: Theme-basierte Farbanpassung und Varianten
- **Animation**: Vordefinierte Animationen und Übergänge
- **Accessibility**: ARIA-Attribute und Barrierefreiheit
- **Performance**: Debouncing und Memoization für optimale Performance

## 📚 Verwendung

### Grundlegende Icon-Verwendung

```tsx
import { BaseIcon, Plus, ICON_SIZES, ICON_COLORS } from '@/lib/icons';

// Einfaches Icon
<BaseIcon icon={Plus} size="lg" color="primary" />

// Direkte Verwendung
<Plus className={ICON_SIZES.lg + ' ' + ICON_COLORS.primary} />
```

### Icon-Buttons

```tsx
import { IconButton, Plus, Edit, Trash2 } from '@/lib/icons';

// Primärer Button
<IconButton 
  icon={Plus} 
  onClick={handleAdd} 
  variant="primary" 
  size="md"
/>

// Gefährlicher Button
<IconButton 
  icon={Trash2} 
  onClick={handleDelete} 
  variant="danger" 
  size="sm"
/>

// Mit Text
<IconButton 
  icon={Edit} 
  onClick={handleEdit} 
  variant="secondary"
>
  Bearbeiten
</IconButton>
```

### Status-Icons

```tsx
import { StatusIcon } from '@/lib/icons';

// Einfacher Status
<StatusIcon status="success" />

// Mit Label
<StatusIcon status="error" showLabel size="lg" />

// Alle verfügbaren Status
<StatusIcon status="pending" />
<StatusIcon status="completed" />
<StatusIcon status="warning" />
<StatusIcon status="info" />
```

### Utility-Funktionen

```tsx
import { 
  getIconSizeClasses, 
  getIconColorVariant, 
  getResponsiveIconSize 
} from '@/lib/icons';

// Größen-Klassen abrufen
const sizeClasses = getIconSizeClasses('lg'); // 'w-6 h-6'

// Farb-Varianten
const hoverColor = getIconColorVariant('primary', 'hover'); // 'primary'

// Responsive Größen
const responsiveSize = getResponsiveIconSize('md', 'lg'); // 'lg'
```

## 🎨 Konfiguration

### Icon-Größen

```tsx
export const ICON_SIZES = {
  xs: 'w-3 h-3',    // 12px
  sm: 'w-4 h-4',    // 16px
  md: 'w-5 h-5',    // 20px
  lg: 'w-6 h-6',    // 24px
  xl: 'w-8 h-8',    // 32px
  '2xl': 'w-10 h-10', // 40px
} as const;
```

### Icon-Farben

```tsx
export const ICON_COLORS = {
  primary: 'text-blue-600',
  secondary: 'text-gray-600',
  success: 'text-green-600',
  warning: 'text-yellow-600',
  danger: 'text-red-600',
  info: 'text-blue-500',
  muted: 'text-gray-400',
  white: 'text-white',
  black: 'text-black',
} as const;
```

### Button-Varianten

```tsx
export const BUTTON_VARIANTS = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
  secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-500',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
  success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500',
  outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-500',
  ghost: 'text-gray-600 hover:bg-gray-100 focus:ring-gray-500',
} as const;
```

## 🔧 Anpassung

### Neue Icon-Größen hinzufügen

```tsx
// In ICON_SIZES hinzufügen
export const ICON_SIZES = {
  // ... bestehende Größen
  '3xl': 'w-12 h-12', // 48px
} as const;

// Type aktualisieren
export type IconSize = keyof typeof ICON_SIZES;
```

### Neue Farben hinzufügen

```tsx
// In ICON_COLORS hinzufügen
export const ICON_COLORS = {
  // ... bestehende Farben
  purple: 'text-purple-600',
} as const;

// Type aktualisieren
export type IconColor = keyof typeof ICON_COLORS;
```

### Neue Button-Varianten

```tsx
// In BUTTON_VARIANTS hinzufügen
export const BUTTON_VARIANTS = {
  // ... bestehende Varianten
  gradient: 'bg-gradient-to-r from-blue-500 to-purple-500 text-white',
} as const;

// Type aktualisieren
export type ButtonVariant = keyof typeof BUTTON_VARIANTS;
```

## 🚀 Performance-Optimierungen

### Memoization
Alle Icon-Komponenten verwenden `React.memo` für bessere Performance:

```tsx
export const BaseIcon = memo<{...}>(({ ... }) => (
  // Component implementation
));
```

### Debouncing
Utility-Funktionen für das Debouncing von Icon-Updates:

```tsx
const debouncedUpdate = debounceIconUpdate(updateIcon, 150);
```

### Responsive Design
Automatische Größenanpassung basierend auf Breakpoints:

```tsx
const iconSize = getResponsiveIconSize('md', 'lg'); // Passt sich automatisch an
```

## ♿ Accessibility

### ARIA-Attribute
Automatische Generierung von ARIA-Attributen:

```tsx
const ariaProps = getIconAriaAttributes('Plus', 'Hinzufügen', false);
// { 'aria-label': 'Hinzufügen Plus', role: 'button', tabIndex: 0 }
```

### Barrierefreie Labels
Deutsche Labels für bessere Benutzerfreundlichkeit:

```tsx
<StatusIcon status="success" showLabel /> // Zeigt "Erfolgreich" an
```

## 🌍 Internationalisierung

Alle Labels und Texte sind auf Deutsch verfügbar:

- **Status-Labels**: Erfolgreich, Fehler, Warnung, Information, Ausstehend, Abgeschlossen
- **Button-Texte**: Zurück, Bearbeiten, Löschen, Speichern
- **Accessibility**: Automatische deutsche Beschreibungen

## 📱 Responsive Design

### Automatische Größenanpassung
Icons passen sich automatisch an verschiedene Bildschirmgrößen an:

```tsx
// Kleine Bildschirme
const smallSize = getResponsiveIconSize('lg', 'sm'); // 'md'

// Große Bildschirme
const largeSize = getResponsiveIconSize('md', 'xl'); // 'xl'
```

### Breakpoint-basierte Anpassung
- **sm**: Mobile Geräte
- **md**: Tablets
- **lg**: Desktop
- **xl**: Große Bildschirme

## 🔄 Migration

### Von der alten API
Die neue API ist vollständig abwärtskompatibel:

```tsx
// Alte Verwendung (funktioniert weiterhin)
import { Plus, Edit, Trash2 } from '@/lib/icons';

// Neue Verwendung (empfohlen)
import { IconButton, BaseIcon } from '@/lib/icons';
```

### Schrittweise Migration
1. **Phase 1**: Neue Komponenten parallel verwenden
2. **Phase 2**: Bestehende Icons schrittweise ersetzen
3. **Phase 3**: Alte API entfernen (optional)

## 📝 Beispiele

### Dashboard-Komponente

```tsx
import { IconButton, StatusIcon, MetricCard } from '@/lib/icons';

const Dashboard = () => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
    <MetricCard 
      icon="trend" 
      title="Umsatz" 
      value="€12,450" 
      change={{ value: 12, isPositive: true }}
    />
    
    <div className="flex gap-2">
      <IconButton icon={Plus} onClick={addItem} variant="primary" />
      <IconButton icon={Edit} onClick={editItem} variant="secondary" />
      <IconButton icon={Trash2} onClick={deleteItem} variant="danger" />
    </div>
    
    <StatusIcon status="success" showLabel size="lg" />
  </div>
);
```

### Formular-Komponente

```tsx
import { IconButton, BaseIcon } from '@/lib/icons';

const Form = () => (
  <form className="space-y-4">
    <div className="flex items-center gap-2">
      <BaseIcon icon={User} size="sm" color="primary" />
      <input type="text" placeholder="Benutzername" />
    </div>
    
    <div className="flex justify-end gap-2">
      <IconButton 
        icon={X} 
        onClick={cancel} 
        variant="outline" 
        size="sm"
      >
        Abbrechen
      </IconButton>
      <IconButton 
        icon={Save} 
        onClick={save} 
        variant="primary" 
        size="sm"
      >
        Speichern
      </IconButton>
    </div>
  </form>
);
```

## 🐛 Fehlerbehebung

### Häufige Probleme

1. **TypeScript-Fehler**: Stellen Sie sicher, dass alle Types korrekt importiert werden
2. **Styling-Probleme**: Überprüfen Sie, ob Tailwind CSS korrekt konfiguriert ist
3. **Performance-Probleme**: Verwenden Sie `memo` für komplexe Icon-Komponenten

### Debugging

```tsx
// Icon-Properties validieren
import { isValidIconSize, isValidIconColor } from '@/lib/icons';

console.log(isValidIconSize('invalid')); // false
console.log(isValidIconColor('primary')); // true
```

## 🤝 Beitragen

### Entwicklung
1. Fork des Repositories
2. Feature-Branch erstellen
3. Änderungen implementieren
4. Tests hinzufügen
5. Pull Request erstellen

### Richtlinien
- Alle neuen Features müssen dokumentiert werden
- Tests für neue Funktionalitäten erforderlich
- Deutsche Labels für alle Benutzeroberflächen
- TypeScript-Types für alle neuen Funktionen

## 📄 Lizenz

Dieses Projekt ist unter der MIT-Lizenz lizenziert.

---

**Entwickelt für TradeTrackr** - Das moderne Handelsmanagement-System
