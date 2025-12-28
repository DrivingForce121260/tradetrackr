# Type-2 Deterministic Import Pipeline

## Overview

TradeTrackr's Type-2 import system prioritizes **deterministic analysis** over AI. AI is used only as a last-resort fallback when deterministic methods fail.

This ensures:
- ✅ Reliability even when AI providers are unavailable
- ✅ Faster processing for simple CSV/XLS files
- ✅ Predictable behavior and error messages
- ✅ Cost efficiency (no AI quota consumption for simple imports)

---

## Type-2 Input Definition

A file qualifies as **Type-2 input** if:

1. **Exactly 3 logical columns**
2. Each row represents one material entry
3. Columns represent:
   - **Article identifier** (string, e.g., "ART001", "SKU-123")
   - **Name/Description** (string, e.g., "Hammer", "Screwdriver Set")
   - **Quantity** (numeric, e.g., "5", "3.5", "10 pcs")

### Important Notes

- **Column order may vary** (system auto-detects)
- **Column headers are generic** (not fixed names)
- **Separators may be comma or semicolon** (auto-detected)
- **Decimal separators may be comma or dot** (auto-corrected)

---

## Processing Pipeline

### Step 1: Initial File Analysis (NO AI)

```
1. Auto-detect delimiter (comma, semicolon, tab, pipe)
2. Trim whitespace from all cells
3. Ignore empty rows
4. Detect header row (if present)
5. Validate consistent column count
6. Identify numeric column candidates
```

### Step 2: Column Role Detection (NO AI)

Uses heuristics to infer column roles:

#### Quantity Column Detection
- Mostly numeric values
- Accepts decimals with `.` or `,`
- May contain trivial units (`m`, `pcs`, `stk`)

#### Article Column Detection
- Shorter strings (typically ≤ 20 chars)
- Often contains numbers or codes
- Common patterns: `ART001`, `SKU-123`, `P-456`

#### Name/Description Column Detection
- Longest average text length
- Natural language content
- Contains spaces and letters

### Step 3: Automatic Rearrangement (NO AI)

If structure is valid but unordered:
- Internally map columns to `article / name / quantity`
- Normalize quantities:
  - Strip trivial units (`m`, `pcs`, `stk`, `stück`)
  - Convert comma to dot (e.g., `5,5` → `5.5`)
  - Convert to number
- Proceed silently

---

## Outcome Handling

### ✅ CASE A: Valid Structure

**Condition:** File matches Type-2 criteria exactly

**Action:** Proceed with import WITHOUT AI

**UI Message (German):**
```
Datei erfolgreich analysiert.
Struktur erkannt (Typ-2 Import).
Import wird ohne KI durchgeführt.
```

---

### ⚠️ CASE B: Auto-Corrected

**Condition:** File has minor issues that were auto-fixed

**Action:** Proceed with import, show corrections

**UI Message (German):**
```
Hinweis:
Die Datei enthielt kleinere Strukturabweichungen.
Diese wurden automatisch korrigiert.
Import erfolgreich abgeschlossen.
```

**Example Corrections:**
- `Zeile 2: Menge "5,5" → 5.5`
- `Zeile 3: Menge "10 pcs" → 10`
- `Zeile 5: Menge "3 m" → 3`

---

### ❌ CASE C: Invalid Structure (NO AI)

**Condition:** File does not match Type-2 criteria

**Action:** Abort import

**UI Message (German):**
```
Import abgebrochen.
Die Datei entspricht nicht dem erwarteten Typ-2-Format
(3 Spalten: Artikel / Bezeichnung / Menge).
Bitte prüfen Sie die Datei oder passen Sie sie an.
```

**Common Issues:**
- Wrong number of columns (not 3)
- Empty file or only header
- Inconsistent column count across rows
- No numeric column detected

---

### 🤖 CASE D: AI Escalation (LAST RESORT)

**Condition:**
- Deterministic analysis failed
- File is still plausibly tabular (4-5 columns)
- AI quota is available

**Action:** Escalate to AI analysis

**UI Message (German):**
```
Die Struktur der Datei konnte nicht eindeutig erkannt werden.
Die KI wird nun zur Analyse verwendet.
```

**If AI Fails:**
```
KI-Analyse nicht verfügbar.
Der Import wurde aus Sicherheitsgründen nicht durchgeführt.
```

---

## Implementation Files

### Backend (Cloud Functions)

```
functions/src/categoryImport/
├── type2Analyzer.ts          # Deterministic analyzer
├── type2Analyzer.test.ts     # Unit tests
└── (parent) categoryImport.ts # Main import handler
```

### Frontend (React)

```
src/components/Categories.tsx  # UI and import flow
src/types/categoryImport.ts    # TypeScript types
```

---

## Example CSV Files

### ✅ Valid Type-2 CSV

```csv
Article,Name,Quantity
ART001,Hammer,5
ART002,Screwdriver Set,3
ART003,Drill Machine,2
```

### ✅ Valid with Auto-Correction

```csv
Article,Name,Quantity
ART001,Hammer,5.5
ART002,Cable,10 m
ART003,Screws,100 pcs
```

### ✅ Valid without Header

```csv
ART001,Hammer,5
ART002,Screwdriver Set,3
ART003,Drill Machine,2
```

### ✅ Valid with Different Order

```csv
Quantity,Article,Name
5,ART001,Hammer
3,ART002,Screwdriver Set
```

### ❌ Invalid (2 columns)

```csv
Article,Name
ART001,Hammer
ART002,Screwdriver
```

### ❌ Invalid (4 columns)

```csv
Article,Name,Quantity,Extra
ART001,Hammer,5,X
ART002,Screwdriver,3,Y
```

---

## Testing

### Run Unit Tests

```bash
cd functions
npm test -- type2Analyzer.test.ts
```

### Manual Testing

1. Create a test CSV file with 3 columns
2. Upload via "AI-Import" button in Categories page
3. Verify message indicates "ohne KI durchgeführt"
4. Check that no AI quota was consumed

---

## Constraints

1. **Do not block valid imports** because AI quota is exceeded
2. **Do not call AI** for simple CSV validation
3. **Do not assume fixed column headers** (headers are user-defined)
4. **AI must never be the default path** (deterministic first)

---

## Future Enhancements

- [ ] Support for Excel files with multiple sheets
- [ ] Support for tab-delimited files
- [ ] Support for custom quantity units
- [ ] Support for optional 4th column (notes/comments)
- [ ] Batch import of multiple files

---

## Troubleshooting

### Issue: Import fails with "3 Spalten erwartet"

**Solution:** Check that your file has exactly 3 columns. Remove any extra columns or add missing ones.

### Issue: Quantities are not recognized

**Solution:** Ensure quantity column contains numeric values. Supported formats:
- `5`
- `5.5` or `5,5`
- `5 pcs`, `10 m`, `100 stk`

### Issue: AI is always used

**Solution:** Check Cloud Function logs. If deterministic analysis is failing, file a bug report with sample CSV.

---

## Support

For issues or questions, contact the TradeTrackr development team.






