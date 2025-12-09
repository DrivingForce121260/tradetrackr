# Keyboard-Shortcuts für TradeTrackr

## Globale Shortcuts

- **Escape**: Schließt das aktuelle Modal/Dialog
- **Tab**: Navigiert zum nächsten fokussierbaren Element
- **Shift + Tab**: Navigiert zum vorherigen fokussierbaren Element
- **Enter**: Aktiviert den fokussierten Button oder sendet ein Formular ab

## Formular-Navigation

- **Tab**: Zum nächsten Feld
- **Shift + Tab**: Zum vorherigen Feld
- **Enter**: Formular absenden (außer bei Textarea)
- **Escape**: Formular abbrechen/schließen

## Modal/Dialog-Navigation

- **Escape**: Modal schließen
- **Tab**: Zwischen fokussierbaren Elementen innerhalb des Modals navigieren
- **Shift + Tab**: Rückwärts navigieren
- Der Fokus bleibt innerhalb des Modals (Focus-Trap)

## Tastatur-Navigation Best Practices

1. **Alle interaktiven Elemente sind per Tab erreichbar**
2. **Focus-Trap in Modals**: Der Fokus bleibt innerhalb des Modals
3. **Escape-Taste**: Schließt Modals und Dialoge
4. **Enter-Taste**: Aktiviert Buttons und sendet Formulare ab
5. **Visuelle Focus-Indikatoren**: Alle fokussierbaren Elemente haben sichtbare Focus-States

## Barrierefreiheit

- Alle interaktiven Elemente haben `tabindex` Attribute
- ARIA-Labels für Screen-Reader
- Keyboard-Navigation vollständig unterstützt
- Focus-Management in Modals







