# 🎨 TradeTrackr Design System

**Version:** 1.0.0  
**Letzte Aktualisierung:** 12. November 2025  
**Status:** Production Ready

---

## 📋 Inhaltsverzeichnis

1. [Überblick](#überblick)
2. [Farbpalette](#farbpalette)
3. [Typografie](#typografie)
4. [Spacing-System](#spacing-system)
5. [Komponenten-Bibliothek](#komponenten-bibliothek)
6. [Icons](#icons)
7. [Animationen & Übergänge](#animationen--übergänge)
8. [Responsive Design](#responsive-design)
9. [Accessibility](#accessibility)
10. [Best Practices](#best-practices)

---

## 🎯 Überblick

Das TradeTrackr Design System stellt eine konsistente visuelle Sprache für die gesamte Anwendung bereit. Es basiert auf **Tailwind CSS** und **shadcn/ui** Komponenten und folgt modernen Design-Prinzipien für Web-Anwendungen.

### Design-Prinzipien

- **Konsistenz**: Einheitliche Verwendung von Farben, Typografie und Spacing
- **Zugänglichkeit**: WCAG 2.1 AA-konform
- **Responsivität**: Mobile-First Ansatz
- **Performance**: Optimierte Komponenten und Styles
- **Wartbarkeit**: Klare Struktur und Dokumentation

---

## 🎨 Farbpalette

### Primärfarben

Die TradeTrackr Primärfarbe ist ein kräftiges Cyan-Blau, das Vertrauen und Professionalität vermittelt.

```css
/* Primary Colors */
--primary: #058bc0        /* Hauptfarbe - TradeTrackr Blau */
--primary-dark: #0470a0   /* Dunklere Variante */
--primary-darker: #035c80 /* Noch dunkler für Hover-States */
--primary-light: #06a3d0  /* Hellere Variante */
```

**Verwendung:**
- Hauptaktionen (Buttons, Links)
- Header und Navigation
- Akzente und Highlights
- Fokus-States

**Beispiel:**
```tsx
<Button className="bg-[#058bc0] hover:bg-[#0470a0] text-white">
  Primärer Button
</Button>
```

### Sekundärfarben

```css
/* Secondary Colors */
--secondary: hsl(210, 40%, 96%)     /* Grau-Blau für sekundäre Elemente */
--secondary-foreground: hsl(222.2, 84%, 4.9%)
```

### Status-Farben

```css
/* Success - Grün */
--success: #10B981
--success-bg: #D1FAE5
--success-dark: #059669

/* Warning - Gelb/Orange */
--warning: #F59E0B
--warning-bg: #FEF3C7
--warning-dark: #D97706

/* Error/Danger - Rot */
--danger: #EF4444
--danger-bg: #FEE2E2
--danger-dark: #DC2626

/* Info - Cyan */
--info: #06B6D4
--info-bg: #CFFAFE
--info-dark: #0891B2
```

### Neutrale Farben

```css
/* Grau-Skala */
--gray-50: #F9FAFB
--gray-100: #F3F4F6
--gray-200: #E5E7EB
--gray-300: #D1D5DB
--gray-400: #9CA3AF
--gray-500: #6B7280
--gray-600: #4B5563
--gray-700: #374151
--gray-800: #1F2937
--gray-900: #111827
```

### Gradient-Farben

```css
/* Häufig verwendete Gradient-Kombinationen */
.tradetrackr-gradient-blue {
  background: linear-gradient(135deg, #058bc0 0%, #0066cc 100%);
}

.tradetrackr-gradient-primary {
  background: linear-gradient(to right, #058bc0, #0470a0, #058bc0);
}

.tradetrackr-gradient-header {
  background: linear-gradient(to right, #058bc0, #0470a0, #058bc0);
}
```

---

## 📝 Typografie

### Schriftarten

- **Primary Font**: System Font Stack (San Francisco, Segoe UI, Roboto, etc.)
- **Monospace**: Für Code und technische Inhalte

```css
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, 
             "Helvetica Neue", Arial, sans-serif;
```

### Schriftgrößen

Das System verwendet eine konsistente Typografie-Skala basierend auf Tailwind CSS:

```css
/* Text Sizes */
text-xs:    0.75rem;  /* 12px - Captions, Labels */
text-sm:    0.875rem; /* 14px - Small Text */
text-base:  1rem;     /* 16px - Body Text (Standard) */
text-lg:    1.125rem; /* 18px - Large Body */
text-xl:    1.25rem;  /* 20px - Subheadings */
text-2xl:   1.5rem;   /* 24px - Headings */
text-3xl:   1.875rem; /* 30px - Large Headings */
text-4xl:   2.25rem;  /* 36px - Hero Headings */
```

### Schriftgewichte

```css
font-thin:       100
font-light:      300
font-normal:     400  /* Standard */
font-medium:     500
font-semibold:   600  /* Häufig für Überschriften */
font-bold:       700
font-extrabold:  800  /* Für große Überschriften */
```

### Überschriften-Hierarchie

```tsx
// H1 - Hauptüberschrift (Seiten-Titel)
<h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900">
  Seiten-Titel
</h1>

// H2 - Sektion-Überschriften
<h2 className="text-2xl font-bold text-gray-900">
  Sektion
</h2>

// H3 - Unterüberschriften
<h3 className="text-xl font-semibold text-gray-800">
  Unterüberschrift
</h3>

// H4 - Kleine Überschriften
<h4 className="text-lg font-semibold text-gray-700">
  Kleine Überschrift
</h4>
```

### Text-Varianten

```tsx
// Body Text (Standard)
<p className="text-base text-gray-700">
  Standard-Text für Inhalte
</p>

// Small Text
<p className="text-sm text-gray-600">
  Kleiner Text für Beschreibungen
</p>

// Caption
<p className="text-xs text-gray-500">
  Caption-Text für Metadaten
</p>

// Muted Text
<p className="text-sm text-gray-400">
  Gedämpfter Text für sekundäre Informationen
</p>
```

---

## 📏 Spacing-System

Das Spacing-System basiert auf einem **4px-Grid** und verwendet Tailwind CSS Spacing-Skala:

```css
/* Spacing Scale (4px Basis) */
space-0:   0px
space-1:   0.25rem;  /* 4px */
space-2:   0.5rem;   /* 8px */
space-3:   0.75rem;  /* 12px */
space-4:   1rem;     /* 16px */
space-5:   1.25rem;  /* 20px */
space-6:   1.5rem;   /* 24px */
space-8:   2rem;     /* 32px */
space-10:  2.5rem;   /* 40px */
space-12:  3rem;     /* 48px */
space-16:  4rem;     /* 64px */
space-20:  5rem;     /* 80px */
space-24:  6rem;     /* 96px */
```

### Padding & Margin

```tsx
// Kleine Abstände (Komponenten-intern)
<div className="p-2">     {/* 8px */}
<div className="p-3">     {/* 12px */}
<div className="p-4">     {/* 16px - Standard */}

// Mittlere Abstände (Sektionen)
<div className="p-6">     {/* 24px */}
<div className="p-8">     {/* 32px */}

// Große Abstände (Container)
<div className="p-12">    {/* 48px */}
```

### Gap (Flexbox/Grid)

```tsx
// Kleine Gaps
<div className="flex gap-2">   {/* 8px */}
<div className="flex gap-3">   {/* 12px */}
<div className="flex gap-4">   {/* 16px - Standard */}

// Mittlere Gaps
<div className="flex gap-6">   {/* 24px */}
<div className="flex gap-8">   {/* 32px */}
```

---

## 🧩 Komponenten-Bibliothek

### Buttons

#### Primärer Button
```tsx
<Button className="bg-gradient-to-r from-[#058bc0] to-[#0470a0] 
                   hover:from-[#0470a0] hover:to-[#035c80] 
                   text-white font-semibold shadow-lg hover:shadow-xl 
                   transition-all hover:scale-105">
  Primärer Button
</Button>
```

#### Sekundärer Button
```tsx
<Button variant="outline" 
        className="border-2 border-gray-300 hover:border-[#058bc0] 
                   hover:bg-blue-50 transition-all">
  Sekundärer Button
</Button>
```

#### Destruktiver Button
```tsx
<Button className="bg-red-600 hover:bg-red-700 text-white 
                   font-semibold shadow-lg">
  Löschen
</Button>
```

#### Ghost Button
```tsx
<Button variant="ghost" 
        className="hover:bg-gray-100 text-gray-600">
  Ghost Button
</Button>
```

### Cards

#### Standard Card
```tsx
<Card className="tradetrackr-card border-2 border-gray-200 
                 shadow-lg hover:shadow-xl transition-all">
  <CardHeader>
    <CardTitle>Titel</CardTitle>
  </CardHeader>
  <CardContent>
    Inhalt
  </CardContent>
</Card>
```

#### Card mit Gradient Header
```tsx
<Card className="border-2 border-gray-200 shadow-xl">
  <CardHeader className="bg-gradient-to-r from-[#058bc0] to-[#0470a0] 
                         text-white">
    <CardTitle>Titel</CardTitle>
  </CardHeader>
  <CardContent className="bg-gradient-to-br from-blue-50 to-white">
    Inhalt
  </CardContent>
</Card>
```

### Badges

```tsx
// Success Badge
<Badge className="bg-green-100 text-green-800 border-0">
  Erfolg
</Badge>

// Warning Badge
<Badge className="bg-yellow-100 text-yellow-800 border-0">
  Warnung
</Badge>

// Danger Badge
<Badge className="bg-red-100 text-red-800 border-0">
  Fehler
</Badge>

// Info Badge
<Badge className="bg-blue-100 text-blue-800 border-0">
  Info
</Badge>
```

### Inputs

```tsx
// Standard Input
<Input className="border-2 border-gray-300 focus:border-[#058bc0] 
                  focus:ring-2 focus:ring-[#058bc0]/20" />

// Input mit Icon
<div className="relative">
  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
    <Search className="h-5 w-5" />
  </div>
  <Input className="pl-10 border-2 border-gray-300 
                    focus:border-[#058bc0]" />
</div>
```

### Selects

```tsx
<Select>
  <SelectTrigger className="border-2 border-gray-300 
                            focus:border-[#058bc0]">
    <SelectValue placeholder="Auswählen..." />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">Option 1</SelectItem>
    <SelectItem value="option2">Option 2</SelectItem>
  </SelectContent>
</Select>
```

### Dialogs/Modals

```tsx
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent className="max-w-4xl border-4 border-[#058bc0] 
                             shadow-2xl">
    <DialogHeader className="bg-gradient-to-r from-[#058bc0] 
                              to-[#0470a0] text-white -mx-6 -mt-6 px-6 py-4">
      <DialogTitle>Titel</DialogTitle>
    </DialogHeader>
    <div className="pt-4">
      Inhalt
    </div>
  </DialogContent>
</Dialog>
```

### Tables

```tsx
<Table>
  <TableHeader>
    <TableRow className="bg-gradient-to-r from-[#058bc0] 
                         via-[#0470a0] to-[#058bc0] text-white">
      <TableHead>Spalte 1</TableHead>
      <TableHead>Spalte 2</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow className="hover:bg-blue-50/50">
      <TableCell>Daten 1</TableCell>
      <TableCell>Daten 2</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

---

## 🎯 Icons

### Icon-Bibliothek

Verwendet wird **Lucide React** für alle Icons.

### Icon-Größen

```tsx
// Extra Small
<Icon className="h-3 w-3" />      // 12px

// Small
<Icon className="h-4 w-4" />      // 16px

// Medium (Standard)
<Icon className="h-5 w-5" />      // 20px

// Large
<Icon className="h-6 w-6" />       // 24px

// Extra Large
<Icon className="h-8 w-8" />      // 32px

// 2X Large
<Icon className="h-10 w-10" />    // 40px
```

### Icon-Farben

```tsx
// Primary
<Icon className="h-5 w-5 text-[#058bc0]" />

// Secondary
<Icon className="h-5 w-5 text-gray-600" />

// Success
<Icon className="h-5 w-5 text-green-600" />

// Warning
<Icon className="h-5 w-5 text-yellow-600" />

// Danger
<Icon className="h-5 w-5 text-red-600" />

// Muted
<Icon className="h-5 w-5 text-gray-400" />
```

---

## ✨ Animationen & Übergänge

### Standard-Übergänge

```css
/* Standard Transition */
transition-all duration-300

/* Hover-Effekte */
hover:scale-105          /* Leichtes Vergrößern */
hover:shadow-xl         /* Größerer Schatten */
hover:bg-blue-50        /* Hintergrund-Änderung */
```

### Häufige Animationen

```tsx
// Scale on Hover
<div className="hover:scale-105 transition-transform duration-300">
  Element
</div>

// Shadow on Hover
<div className="shadow-md hover:shadow-xl transition-shadow duration-300">
  Element
</div>

// Gradient Shimmer
<div className="relative overflow-hidden group">
  <div className="absolute inset-0 bg-gradient-to-r from-transparent 
                  via-white/20 to-transparent -translate-x-full 
                  group-hover:translate-x-full transition-transform 
                  duration-1000">
  </div>
  Inhalt
</div>

// Pulse Animation
<div className="animate-pulse">
  Lade-Indikator
</div>
```

---

## 📱 Responsive Design

### Breakpoints

```css
/* Tailwind CSS Breakpoints */
sm:  640px   /* Small devices (phones) */
md:  768px   /* Medium devices (tablets) */
lg:  1024px  /* Large devices (desktops) */
xl:  1280px  /* Extra large devices */
2xl: 1536px  /* 2X Extra large devices */
```

### Mobile-First Ansatz

```tsx
// Mobile-First Klassen
<div className="
  flex flex-col          /* Mobile: Spalten */
  md:flex-row           /* Tablet+: Zeilen */
  gap-2                 /* Mobile: kleiner Gap */
  md:gap-4              /* Tablet+: größerer Gap */
  text-sm               /* Mobile: kleinere Schrift */
  md:text-base          /* Tablet+: normale Schrift */
">
  Responsiver Inhalt
</div>
```

### Responsive Grids

```tsx
// Responsive Grid
<div className="grid 
  grid-cols-1           /* Mobile: 1 Spalte */
  md:grid-cols-2        /* Tablet: 2 Spalten */
  lg:grid-cols-3        /* Desktop: 3 Spalten */
  xl:grid-cols-4        /* XL: 4 Spalten */
  gap-4">
  Grid Items
</div>
```

---

## ♿ Accessibility

### ARIA-Labels

Alle interaktiven Elemente sollten ARIA-Labels haben:

```tsx
<Button aria-label="Aufgabe löschen">
  <Trash2 className="h-5 w-5" />
</Button>
```

### Keyboard-Navigation

- Alle interaktiven Elemente sollten per Tastatur erreichbar sein
- Tab-Reihenfolge sollte logisch sein
- Focus-States sollten sichtbar sein

```tsx
<Button 
  className="focus:ring-2 focus:ring-[#058bc0] focus:ring-offset-2"
  aria-label="Aktion"
>
  Button
</Button>
```

### Farbkontrast

- Text auf Hintergrund sollte mindestens **4.5:1** Kontrast haben
- Große Texte (18px+) sollten mindestens **3:1** Kontrast haben

---

## ✅ Best Practices

### 1. Konsistente Verwendung

- Verwende immer die definierten Farben aus der Palette
- Halte dich an das Spacing-System (4px-Grid)
- Verwende die Standard-Komponenten aus der Bibliothek

### 2. Performance

- Verwende CSS-Klassen statt Inline-Styles
- Nutze Tailwind CSS Purge für optimale Bundle-Größe
- Vermeide unnötige Animationen

### 3. Wartbarkeit

- Dokumentiere Custom-Komponenten
- Verwende semantische Klassennamen
- Halte Komponenten wiederverwendbar

### 4. Responsive Design

- Mobile-First Ansatz
- Teste auf verschiedenen Bildschirmgrößen
- Verwende relative Einheiten (rem, em, %)

### 5. Accessibility

- Immer ARIA-Labels verwenden
- Keyboard-Navigation sicherstellen
- Farbkontrast prüfen

---

## 📚 Weitere Ressourcen

- [Tailwind CSS Dokumentation](https://tailwindcss.com/docs)
- [shadcn/ui Komponenten](https://ui.shadcn.com/)
- [Lucide Icons](https://lucide.dev/)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

---

**Letzte Aktualisierung:** 12. November 2025  
**Version:** 1.0.0  
**Maintainer:** TradeTrackr Development Team







