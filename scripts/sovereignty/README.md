# Sovereignty Scanner

This directory contains tools for enforcing IONOS-only data sovereignty requirements.

## Phase 1 Final Status ✅

**Verification Date:** 2025-12-28

### verify-phase1.sh
```
═══════════════════════════════════════════════════════════════════
  TradeTrackr Phase 1 Sovereignty Verification
═══════════════════════════════════════════════════════════════════

📋 Check 1: Frontend content logging...
   ✅ PASS: No console.log/debug in SmartInbox/EmailReplyComposer/EmailAccountManager
📋 Check 2: Direct AI provider imports in src/**...
   ✅ PASS: No direct AI provider imports in src/**
📋 Check 3: safeLogger implementation...
   ✅ PASS: safeLogger files exist
📋 Check 4: Redaction key coverage...
   ✅ PASS: Redaction includes LLM-specific keys
📋 Check 5: AIClient sovereignty enforcement...
   ✅ PASS: AIClient has IONOS_ONLY enforcement
📋 Check 6: Sovereignty scanner...
   ✅ PASS: Sovereignty scanner passes

═══════════════════════════════════════════════════════════════════
✅ PHASE 1 VERIFICATION COMPLETE - All checks passed
═══════════════════════════════════════════════════════════════════
Exit Code: 0
```

### npm run sovereignty:scan
```
📊 Baseline Comparison:
   Total current violations: 1022
   Baseline violations:      1022
   NEW violations:           0

✅ PASS: Sovereignty check complete
Exit Code: 0
```

### Phase 1 Checklist

| Check | Result |
|-------|--------|
| Logs no longer contain bodies/attachments | ✅ PASS |
| AI calls routed through AIClient | ✅ PASS |
| IONOS_ONLY blocks non-allowed AI providers | ✅ PASS |
| LOG_CONTENT cannot enable logging in IONOS_ONLY | ✅ PASS |
| Redaction covers LLM/MIME keys | ✅ PASS |
| Nothing breaks when SOVEREIGNTY_MODE=OFF | ✅ PASS |

---

## Overview

The scanner checks source files for references to banned cloud providers (Firebase, Google Cloud, OpenAI, etc.) that would violate sovereignty requirements when `SOVEREIGNTY_MODE=IONOS_ONLY` is enabled.

## Quick Start

```bash
# Run scan with baseline comparison (default - WARN mode)
npm run sovereignty:scan

# Run scan in ERROR mode (fails on NEW violations)
npm run sovereignty:scan:error

# Regenerate baseline with current violations
npm run sovereignty:baseline
```

## Files

| File | Description |
|------|-------------|
| `check-banned-strings.js` | Main scanner script |
| `baseline.json` | Baseline violations (auto-generated) |
| `README.md` | This documentation |

## Scan Modes

### WARN Mode (Default)
```bash
SOVEREIGNTY_SCAN_MODE=warn node scripts/sovereignty/check-banned-strings.js
```
- Prints violations but exits 0
- Non-blocking in CI
- Use during migration phase

### ERROR Mode
```bash
SOVEREIGNTY_SCAN_MODE=error node scripts/sovereignty/check-banned-strings.js
```
- Exits 1 if NEW violations found
- Blocking in CI
- Enable after Phase 3/4 migration complete

## Baseline Mode

The baseline prevents "noise" from existing violations while catching regressions.

### How It Works
1. `baseline.json` stores known violations
2. Scanner compares current violations to baseline
3. Only NEW violations (not in baseline) are flagged
4. ERROR mode only fails on NEW violations

### Commands
```bash
# Enable baseline (default)
SOVEREIGNTY_SCAN_BASELINE=on node scripts/sovereignty/check-banned-strings.js

# Disable baseline (legacy behavior - all violations)
SOVEREIGNTY_SCAN_BASELINE=off node scripts/sovereignty/check-banned-strings.js

# Regenerate baseline
node scripts/sovereignty/check-banned-strings.js --write-baseline
```

### When to Update Baseline
- After intentionally adding Firebase/Google code (rare)
- After migrating code away (to show progress)
- **Never** to hide real violations

## Mailbox Connector Exception

Files in `functions/src/emailIntelligence/**` are **explicitly allowed** to reference Google/Microsoft endpoints because they connect to the customer's upstream mailbox.

This is the **only** code path permitted to call external providers.

## Suppression Annotations

In rare cases, a violation may need to be suppressed. This is allowed **only** in:
- `functions/src/emailIntelligence/**`
- `scripts/sovereignty/**`

### Format (Required)
```javascript
// sovereignty:allow reason="Connects to customer Gmail" ticket="TT-1234"
```

### Rules
- Must include `reason="..."` explaining why
- Must include `ticket="TT-###"` referencing a tracking ticket
- Only valid on the exact line where it appears
- Old format (`// sovereignty:allowed`) is now an error

### Invalid Suppression
```javascript
// ❌ Old format - will cause error
// sovereignty:allowed

// ❌ Missing ticket
// sovereignty:allow reason="Customer mailbox"

// ❌ Outside allowed paths - will cause error
// (in src/components/SomeFile.tsx)
// sovereignty:allow reason="..." ticket="TT-123"
```

## Banned Patterns

### Hard Banned (Error)
- `firebaseio.com`, `firebaseapp.com`
- `firestore.googleapis.com`, `firebasestorage.googleapis.com`
- `cloudfunctions.net`, `run.app`, `appspot.com`
- `crashlytics`, `google-analytics`, `googletagmanager.com`
- `generativelanguage.googleapis.com`, `aiplatform.googleapis.com`
- `api.openai.com`, `api.anthropic.com`, `openai.azure.com`

### Contextual (Warning)
- `googleapis.com` (generic)
- `firebase` (may appear in docs)
- `openai.com`, `anthropic.com` (may appear in comments)

## CI Integration

The scanner runs on every PR and push to main via GitHub Actions:

```yaml
# .github/workflows/sovereignty-gate.yml
- name: Run Sovereignty Scanner
  env:
    SOVEREIGNTY_SCAN_MODE: warn  # Flip to 'error' after Phase 3/4
    SOVEREIGNTY_SCAN_BASELINE: on
  run: npm run sovereignty:scan
```

## Runtime Gate

In addition to CI scanning, there's a runtime gate that blocks server startup if `SOVEREIGNTY_MODE=IONOS_ONLY` is set but forbidden env vars are present.

See: `/src/config/sovereigntyGate.ts`

## Local Development

### Verify Runtime Gate

The runtime gate uses TypeScript. To test it locally:

```bash
# Using ts-node (if installed)
npx ts-node -e "import { checkSovereigntyMode } from './src/config/sovereigntyGate'; console.log(checkSovereigntyMode())"

# Alternative: Run the dev server and check console output
npm run dev
# Look for: [Sovereignty] Mode: OFF (standard mode, all providers allowed)
```

**Note**: The gate is integrated into server startup and will log its status automatically.

### Test IONOS_ONLY Mode (Would Fail with Firebase Configured)
```bash
# Linux/macOS
SOVEREIGNTY_MODE=IONOS_ONLY npx ts-node -e "import { checkSovereigntyMode } from './src/config/sovereigntyGate'; console.log(checkSovereigntyMode())"

# Windows PowerShell
$env:SOVEREIGNTY_MODE="IONOS_ONLY"; npx ts-node -e "import { checkSovereigntyMode } from './src/config/sovereigntyGate'; console.log(checkSovereigntyMode())"
```

### Check a Single File
The scanner scans the entire repo. To check if a file is in the exception path:

```javascript
const { isMailboxConnectorPath } = require('./src/config/providerPolicy');
console.log(isMailboxConnectorPath('functions/src/emailIntelligence/gmail.ts')); // true
console.log(isMailboxConnectorPath('src/config/firebase.ts')); // false
```

## Example Violations

### Would Be Caught (Outside Exception Path)
```
📄 src/config/firebase.ts:
   🟡 L12: [firebase]
      import { initializeApp } from 'firebase/app';
```

### Would Be Allowed (Inside Exception Path)
```
📧 Mailbox Connector (ALLOWED - 2 references):
  ✓ functions/src/emailIntelligence/connectors/gmail.ts (2 references)
```

## Phase 1 Verification

Run the Phase 1 exit verification script to check all guardrails are in place:

```bash
./scripts/sovereignty/verify-phase1.sh
```

This checks:
1. No content logging in critical frontend components
2. No direct AI provider imports in src/** (except comments)
3. safeLogger implementation exists
4. Redaction includes LLM-specific keys
5. AIClient has IONOS_ONLY enforcement
6. Sovereignty scanner passes

## See Also

- `/docs/sovereignty/definition.md` - Full sovereignty specification
- `/src/config/providerPolicy.ts` - Central policy configuration
- `/src/config/sovereigntyGate.ts` - Runtime assertion gate
- `/src/services/ai/` - AI client abstraction (Phase 1)
- `/src/security/redaction.ts` - Content redaction utilities
- `/src/utils/safeLogger.ts` - Safe logging wrapper

