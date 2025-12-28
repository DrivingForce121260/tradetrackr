# TradeTrackr Audit - Content Export Templates

This document provides templates and example commands to export audit documentation from Markdown to PDF and to Confluence-ready formats.

## 1) PDF Export Template (Markdown -> PDF)
- Tool: Pandoc (example)
- Command:
```bash
pandoc docs/TradeTrackr_Audit_Doc.md -f markdown -t pdf -o docs/TradeTrackr_Audit_v1.pdf
```
- Notes:
  - Ensure consistent fonts and margins
  - Include a table of contents if needed

## 2) Confluence Export Template
- Tool: Pandoc (or a converter that outputs Confluence wiki markup)
- Command (example):
```bash
pandoc docs/TradeTrackr_Audit_Doc.md -t confluence-wiki -o docs/TradeTrackr_Audit_v1.confluence.txt
```
- Notes:
  - Use descriptive anchors and headings to map to Confluence sections
  - Alternatively generate HTML and paste into Confluence

## 3) Automated Export Script (Skeleton)
- A small script can generate PDF and Confluence exports on demand
- Suggested inputs: version tag, output directory
- Example skeleton (pseudo-patch):
```
#!/bin/sh
echo "Exporting TradeTrackr audit to PDF and Confluence..."
pandoc docs/TradeTrackr_Audit_Doc.md -f markdown -t pdf -o docs/TradeTrackr_Audit_v$(date +%Y%m%d).pdf
pandoc docs/TradeTrackr_Audit_Doc.md -t confluence-wiki -o docs/TradeTrackr_Audit_v$(date +%Y%m%d).confluence.txt
```

## 4) Export Automation (Enhanced)
- Added a simple, repeatable export pattern and a shell script snippet to automate the process
- Outputs:
- `docs/TradeTrackr_Audit_Master_<DATE>.pdf` (PDF)
- `docs/TradeTrackr_Audit_Master_<DATE>.confluence.txt` (Confluence wiki text)
- Script skeleton (bash):
```
#!/bin/bash
set -euo pipefail
BASE_DOC="docs/TradeTrackr_Audit_Master.md"
DATE=$(date +%F)
OUT_DIR="docs"
pandoc "$BASE_DOC" -f markdown -t pdf -o "$OUT_DIR/TradeTrackr_Audit_Master_${DATE}.pdf"
pandoc "$BASE_DOC" -t confluence-wiki -o "$OUT_DIR/TradeTrackr_Audit_Master_${DATE}.confluence.txt"
```


