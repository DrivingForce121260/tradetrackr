# Template Costing Guide

Dieses Dokument erklärt, wie Kosten- und Margen-Informationen in PDF-Templates für Angebote verwendet werden können.

## Verfügbare Daten

Wenn ein Angebot (`offer`) an ein Template übergeben wird, sind folgende Kostenfelder verfügbar:

### Basis-Felder
- `{{offer.calcSummary.materialsCost}}` - Materialkosten (Rohwert)
- `{{offer.calcSummary.laborCost}}` - Arbeitskosten (Rohwert)
- `{{offer.calcSummary.overheadPct}}` - Gemeinkostensatz in Prozent
- `{{offer.calcSummary.overheadValue}}` - Gemeinkosten (Rohwert)
- `{{offer.calcSummary.costTotal}}` - Gesamtkosten (Rohwert)
- `{{offer.calcSummary.sellTotal}}` - Verkaufspreis (Rohwert)
- `{{offer.calcSummary.marginValue}}` - Marge in Euro (Rohwert)
- `{{offer.calcSummary.marginPct}}` - Marge in Prozent (Rohwert)
- `{{offer.calcSummary.snapshotDate}}` - Datum des Snapshots (falls gesperrt)
- `{{offer.calcSummary.snapshotLocked}}` - Boolean, ob Kosten gesperrt sind

### Helper-Funktionen

Für formatierte Ausgabe stehen folgende Helper-Funktionen zur Verfügung:

- `{{formatCurrency(offer.calcSummary.materialsCost)}}` - Formatiert als Währung mit 2 Dezimalstellen (z.B. "250.00")
- `{{formatPercent(offer.calcSummary.marginPct)}}` - Formatiert als Prozent mit 2 Dezimalstellen (z.B. "21.43")
- `{{formatPercent(offer.calcSummary.marginPct, 1)}}` - Formatiert als Prozent mit 1 Dezimalstelle (z.B. "21.4")

### Bedingte Anzeige

Um Kosten-Informationen nur anzuzeigen, wenn sie verfügbar sind:

```html
{{#if offer.calcSummary}}
<div style="margin-top:16px; padding:12px; border:1px solid #ddd; border-radius:6px;">
  <div style="font-weight:700; margin-bottom:6px;">Kosten / Marge</div>
  <div>Materialkosten: {{formatCurrency(offer.calcSummary.materialsCost)}} €</div>
  <div>Arbeitskosten: {{formatCurrency(offer.calcSummary.laborCost)}} €</div>
  <div>Gemeinkosten ({{offer.calcSummary.overheadPct}}%): {{formatCurrency(offer.calcSummary.overheadValue)}} €</div>
  <div><strong>Gesamtkosten: {{formatCurrency(offer.calcSummary.costTotal)}} €</strong></div>
  <div>Verkaufspreis: {{formatCurrency(offer.calcSummary.sellTotal)}} €</div>
  <div><strong>Marge: {{formatCurrency(offer.calcSummary.marginValue)}} € ({{formatPercent(offer.calcSummary.marginPct)}}%)</strong></div>
</div>
{{/if}}
```

## Beispiel-Template-Snippet

Hier ist ein vollständiges Beispiel für eine Kostenübersicht in einem Offer-Template:

```html
{{#if offer.calcSummary}}
<div style="page-break-inside:avoid; margin-top:24px; padding:16px; background-color:#f5f5f5; border:1px solid #ddd; border-radius:8px;">
  <h3 style="margin:0 0 12px 0; color:#333; font-size:16px; font-weight:bold;">Kostenanalyse</h3>
  
  <table style="width:100%; border-collapse:collapse; margin-bottom:12px;">
    <tr>
      <td style="padding:6px; border-bottom:1px solid #ddd;">Materialkosten:</td>
      <td style="padding:6px; border-bottom:1px solid #ddd; text-align:right;">{{formatCurrency(offer.calcSummary.materialsCost)}} €</td>
    </tr>
    <tr>
      <td style="padding:6px; border-bottom:1px solid #ddd;">Arbeitskosten:</td>
      <td style="padding:6px; border-bottom:1px solid #ddd; text-align:right;">{{formatCurrency(offer.calcSummary.laborCost)}} €</td>
    </tr>
    <tr>
      <td style="padding:6px; border-bottom:1px solid #ddd;">Gemeinkosten ({{offer.calcSummary.overheadPct}}%):</td>
      <td style="padding:6px; border-bottom:1px solid #ddd; text-align:right;">{{formatCurrency(offer.calcSummary.overheadValue)}} €</td>
    </tr>
    <tr style="font-weight:bold;">
      <td style="padding:8px 6px; border-top:2px solid #333;">Gesamtkosten:</td>
      <td style="padding:8px 6px; border-top:2px solid #333; text-align:right;">{{formatCurrency(offer.calcSummary.costTotal)}} €</td>
    </tr>
  </table>
  
  <table style="width:100%; border-collapse:collapse;">
    <tr>
      <td style="padding:6px;">Verkaufspreis:</td>
      <td style="padding:6px; text-align:right;">{{formatCurrency(offer.calcSummary.sellTotal)}} €</td>
    </tr>
    <tr style="background-color:#e8f5e9; font-weight:bold;">
      <td style="padding:8px 6px; border-top:2px solid #4caf50;">Marge:</td>
      <td style="padding:8px 6px; border-top:2px solid #4caf50; text-align:right; color:#2e7d32;">
        {{formatCurrency(offer.calcSummary.marginValue)}} € ({{formatPercent(offer.calcSummary.marginPct)}}%)
      </td>
    </tr>
  </table>
  
  {{#if offer.calcSummary.snapshotLocked}}
  <div style="margin-top:8px; padding:8px; background-color:#fff3cd; border:1px solid #ffc107; border-radius:4px; font-size:12px; color:#856404;">
    ⚠️ Kosten wurden am {{offer.calcSummary.snapshotDate}} gesperrt und sind eingefroren.
  </div>
  {{/if}}
</div>
{{/if}}
```

## Hinweise

- Kosten-Informationen sind nur verfügbar, wenn im Angebot eine Kalkulation durchgeführt wurde
- Verwenden Sie `{{#if offer.calcSummary}}` um sicherzustellen, dass Kosten nur angezeigt werden, wenn sie existieren
- Verwenden Sie die Helper-Funktionen `formatCurrency()` und `formatPercent()` für konsistente Formatierung
- Die Marge wird automatisch berechnet: `marginValue = sellTotal - costTotal` und `marginPct = (marginValue / sellTotal) * 100`













