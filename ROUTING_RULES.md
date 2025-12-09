# Document Routing Rules - TradeTrackr

## Overview

TradeTrackr implements a **deterministic routing system** that automatically classifies uploaded documents based on clear, rule-based heuristics. **AI is never used for guessing** – it's only invoked with explicit user consent when deterministic rules are inconclusive.

---

## Routing Order (Priority)

Rules are applied in the following order. The first rule that achieves confidence ≥ 0.9 wins.

### **Rule 1: Upload Context**

If a user uploads from within a project page or provides a `projectId` context, project-expected document types are boosted.

**Examples:**

| Condition | Document Type | Confidence | Reason |
|-----------|--------------|------------|--------|
| Filename contains "tagesbericht" + `projectId` present | `project.site_daily_report` | 0.92 | Daily report in project context |
| Filename contains "arbeitsauftrag" + `projectId` present | `project.task_work_order` | 0.91 | Work order in project context |
| Filename contains "übergabe" + `projectId` present | `project.handover` | 0.93 | Handover in project context |

---

### **Rule 2: Filename Hints (Regex)**

Strong filename patterns trigger automatic routing with high confidence.

**Material Documents:**

| Pattern (Regex) | Document Type | Confidence | Example Filenames |
|-----------------|--------------|------------|-------------------|
| `/lieferschein\|delivery[_-]?note/i` | `material.delivery_note` | 0.95 | Lieferschein_123.pdf, delivery-note-2025.pdf |
| `/wareneingang\|goods[_-]?receipt/i` | `material.goods_receipt` | 0.93 | Wareneingang_ABC.pdf, goods_receipt.pdf |
| `/materialanforderung\|requisition/i` | `material.requisition` | 0.91 | Materialanforderung_001.pdf |
| `/inventar\|inventory/i` | `material.inventory_sheet` | 0.89 | Inventarliste.xlsx, inventory_2025.xlsx |

**Client Documents:**

| Pattern (Regex) | Document Type | Confidence | Example Filenames |
|-----------------|--------------|------------|-------------------|
| `/rechnung\|invoice\|inv[_-]?\d+/i` | `client.invoice` | 0.96 | Rechnung_4711.pdf, Invoice-123.pdf, inv_001.pdf |
| `/angebot\|quote\|offer\|ang[_-]?\d+/i` | `client.offer_quote` | 0.94 | Angebot_2025-001.pdf, Quote_ABC.pdf |
| `/gutschrift\|credit[_-]?note/i` | `client.credit_note` | 0.94 | Gutschrift_456.pdf, credit-note.pdf |
| `/vertrag\|contract/i` | `client.contract` | 0.92 | Vertrag_MusterGmbH.pdf, Contract_2025.pdf |
| `/abnahme\|acceptance/i` | `client.acceptance_report` | 0.93 | Abnahmeprotokoll.pdf, acceptance_report.pdf |

**Personnel Documents:**

| Pattern (Regex) | Document Type | Confidence | Example Filenames |
|-----------------|--------------|------------|-------------------|
| `/stundenzettel\|timesheet\|stunden/i` | `personnel.timesheet` | 0.94 | Stundenzettel_KW12.xlsx, Timesheet_March.pdf |
| `/fahrtenbuch\|travel[_-]?log\|mileage/i` | `personnel.travel_log` | 0.93 | Fahrtenbuch_2025.xlsx, Travel_Log_Jan.pdf |
| `/spesen\|expense\|reisekosten/i` | `personnel.expense_claim` | 0.91 | Spesenabrechnung.pdf, Expense_Claim.pdf |

**Quality Documents:**

| Pattern (Regex) | Document Type | Confidence | Example Filenames |
|-----------------|--------------|------------|-------------------|
| `/inbetriebnahme\|commissioning/i` | `quality.commissioning_report` | 0.92 | Inbetriebnahmeprotokoll.pdf |
| `/protokoll\|messprotokoll\|prüfprotokoll\|vde\|test[_-]?protocol/i` | `quality.measurement_test` | 0.90 | VDE_Messprotokoll.pdf, Test_Protocol.pdf |
| `/wartung\|maintenance/i` | `quality.maintenance_log` | 0.89 | Wartungsprotokoll.pdf, Maintenance_Log.pdf |

**Compliance Documents:**

| Pattern (Regex) | Document Type | Confidence | Example Filenames |
|-----------------|--------------|------------|-------------------|
| `/zertifikat\|certificate\|cert/i` | `compliance.certificate` | 0.91 | Zertifikat_ISO9001.pdf, Certificate.pdf |
| `/versicherung\|insurance/i` | `compliance.insurance` | 0.92 | Versicherungspolice.pdf, Insurance_Proof.pdf |
| `/tüv\|uvv\|prüfung\|inspection/i` | `compliance.vehicle_equipment_inspection` | 0.90 | TÜV_Fahrzeug.pdf, UVV_Inspection.pdf |
| `/schulung\|training/i` | `compliance.training_record` | 0.89 | Schulungsnachweis.pdf, Training_Certificate.pdf |

**Project Documents:**

| Pattern (Regex) | Document Type | Confidence | Example Filenames |
|-----------------|--------------|------------|-------------------|
| `/tagesbericht\|daily[_-]?report/i` | `project.site_daily_report` | 0.93 | Tagesbericht_20250104.pdf, Daily_Report.pdf |
| `/änderung\|change[_-]?order/i` | `project.change_order` | 0.91 | Änderungsauftrag_001.pdf, Change_Order.pdf |
| `/gefährdung\|risk[_-]?assessment/i` | `project.risk_assessment` | 0.90 | Gefährdungsbeurteilung.pdf |

---

### **Rule 3: MIME Type Defaults**

For files where filename provides no hints, MIME type can suggest a default.

| MIME Type | Document Type | Confidence | Reason |
|-----------|--------------|------------|--------|
| `image/*` | `quality.photo_doc` | 0.65 | Images default to photo documentation *unless* user confirms "scanned/photographed document" |

**Note:** For images, the system asks:  
> "Is this an image file or a scanned/photographed document?"
- **Image file** → Stored as `quality.photo_doc` (confidence 0.90)
- **Scanned/Photographed** → Triggers OCR, then re-routes or offers AI analysis

---

### **Rule 4: Template Anchors in Text**

If OCR or PDF text extraction is available, look for template keywords.

| Keywords | Document Type | Confidence | Example Text |
|----------|--------------|------------|--------------|
| "Rechnungsnummer", "Invoice Number", "Rech.-Nr" | `client.invoice` | 0.97 | PDF contains "Rechnungsnummer: 2025-001" |
| "Lieferschein-Nr", "Delivery Note No" | `material.delivery_note` | 0.96 | PDF contains "Lieferschein-Nr: LS-123" |
| "Angebotsnummer", "Quote No" | `client.offer_quote` | 0.95 | PDF contains "Angebotsnummer: ANG-456" |
| "VDE 0100", "VDE 0105", "Messprotokoll" | `quality.measurement_test` | 0.94 | PDF contains "VDE 0100 Prüfprotokoll" |
| "Abnahmeprotokoll", "Acceptance Protocol" | `client.acceptance_report` | 0.93 | PDF contains "Abnahmeprotokoll" |
| "Inbetriebnahmeprotokoll" | `quality.commissioning_report` | 0.92 | PDF contains "Inbetriebnahmeprotokoll" |
| "Stundennachweis", "Arbeitszeitnachweis", "Timesheet" | `personnel.timesheet` | 0.91 | PDF contains "Stundennachweis" |

---

### **Rule 5: Context Links**

If the user provides entity IDs in the upload context, infer document category.

| Context | Document Type | Confidence | Reason |
|---------|--------------|------------|--------|
| `clientId` only (no project) | `client.offer_quote` | 0.70 | Likely a client document |
| `employeeId` only (no project) | `personnel.timesheet` | 0.68 | Likely a personnel document |
| `supplierId` provided | `material.delivery_note` | 0.72 | Likely a material/supplier document |

---

## Confidence Thresholds

| Confidence Range | Action | User Experience |
|-----------------|--------|-----------------|
| **≥ 0.90** | **Auto-route and store** | Document is automatically classified and stored. No user action needed. |
| **0.60 - 0.89** | **Needs review** | System suggests a type but requires user confirmation before storing. |
| **< 0.60** | **Manual selection or AI** | User must either select type manually OR request AI analysis. |

---

## AI Fallback (Only with User Consent)

When heuristics return `null` or `confidence < 0.60`, the system offers AI analysis.

### AI Confirmation Modal

**Title:** "Dokument-Typ automatisch ermitteln?"  
**Text:** "Die vollständige Analyse kann bis zu 1 Minute dauern. Die KI rät nicht. Fortfahren?"  
**Buttons:** `Abbrechen`, `Analyse starten`

### AI Confidence Threshold

- **≥ 0.85**: Auto-store with AI decision
- **< 0.85**: Needs manual review

**AI will NEVER guess.** If confidence is below 0.85, manual selection is required.

---

## Image File Handling

For `image/*` MIME types, the system asks:

**Modal:** "Handelt es sich um ein gescanntes/fotografiertes Dokument?"

**Options:**
- **Reines Bild** → Stored as `quality.photo_doc` (confidence 0.90)
- **Gescannt/Fotografiert** → OCR runs first, then:
  - If OCR text is sufficient → Apply Rule 4 (template anchors)
  - If still inconclusive → Offer AI analysis

---

## Deduplication

Before upload, the system computes a **SHA-256 hash** of the file.

If a matching hash is found:
- **Modal:** "Duplikat gefunden. Trotzdem speichern?"
- **Options:** `Abbrechen`, `Trotzdem speichern`

---

## Examples

### Example 1: Auto-Routed Invoice

**Input:**
- Filename: `Rechnung_4711_Muster_GmbH.pdf`
- Context: `clientId` = "client_123"

**Routing:**
1. Check Rule 2 (Filename): `/rechnung|invoice/i` → Match!
2. Type: `client.invoice`
3. Confidence: 0.96
4. **Action:** Auto-stored (no user interaction)

---

### Example 2: Scanned Delivery Note with OCR

**Input:**
- Filename: `scan0001.jpg`
- User choice: "Gescannt/Fotografiert"

**Routing:**
1. OCR extracts text: "Lieferschein-Nr: LS-2025-001, Datum: 04.11.2025..."
2. Check Rule 4 (Template anchors): "Lieferschein-Nr" → Match!
3. Type: `material.delivery_note`
4. Confidence: 0.96
5. **Action:** Auto-stored

---

### Example 3: Image Photo (No Document)

**Input:**
- Filename: `IMG_1234.jpg`
- User choice: "Reines Bild"

**Routing:**
1. Check Rule 3 (MIME): `image/jpeg` → Default to `quality.photo_doc`
2. Confidence: 0.90
3. **Action:** Auto-stored

---

### Example 4: Ambiguous File → AI Analysis

**Input:**
- Filename: `document.pdf`
- No project context
- PDF text extraction fails

**Routing:**
1. All heuristics return `confidence < 0.60`
2. **Modal shown:** "Dokument-Typ automatisch ermitteln?"
3. User clicks "Analyse starten"
4. AI analyzes → Returns `client.invoice`, confidence 0.87
5. **Action:** Auto-stored (≥ 0.85)

---

### Example 5: Low AI Confidence → Manual Selection

**Input:**
- Filename: `file.pdf`
- AI analysis returns confidence 0.75

**Routing:**
1. AI confidence < 0.85 → Status: `needs_review`
2. User sees: "Dokumenttyp manuell auswählen"
3. User selects `personnel.timesheet` from dropdown
4. **Action:** Stored with manual selection

---

## Best Practices for Users

To ensure automatic routing works optimally:

1. **Use descriptive filenames:**  
   ✅ `Rechnung_2025-001_Muster_GmbH.pdf`  
   ❌ `document.pdf`

2. **Upload from context:**  
   Upload invoices while viewing the client, daily reports while viewing the project.

3. **Trust the system:**  
   High-confidence auto-routing is accurate. Only intervene when explicitly asked.

4. **For scanned documents:**  
   Always indicate "Gescannt/Fotografiert" when uploading photos of invoices, delivery notes, etc.

---

## Implementation Notes

- All routing logic is in `src/lib/documents/routeByHeuristics.ts`
- AI classification interface is in `src/lib/documents/classifyText.ts` (pluggable)
- OCR is in `src/lib/documents/extractText.ts` (pluggable)
- Cloud Functions: `functions/src/documents/routeDocument.ts` and `functions/src/documents/analyzeDocument.ts`

---

## Status: ✅ Production Ready

Last updated: November 4, 2025













