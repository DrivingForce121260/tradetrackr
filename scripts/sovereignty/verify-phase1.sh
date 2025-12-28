#!/bin/bash
#
# Phase 1 Exit Verification Script
# Verifies that Phase 1 sovereignty guardrails are correctly implemented.
#
# Usage: ./scripts/sovereignty/verify-phase1.sh
#

set -e

echo "═══════════════════════════════════════════════════════════════════"
echo "  TradeTrackr Phase 1 Sovereignty Verification"
echo "═══════════════════════════════════════════════════════════════════"
echo ""

REPO_ROOT=$(cd "$(dirname "$0")/../.." && pwd)
cd "$REPO_ROOT"

ERRORS=0

# ============================================================================
# Check 1: No console.log with content in critical frontend components
# ============================================================================
echo "📋 Check 1: Frontend content logging..."

FRONTEND_CONTENT_LOGS=$(grep -rn "console\.\(log\|debug\)" \
  src/components/SmartInbox.tsx \
  src/components/EmailReplyComposer.tsx \
  src/components/EmailAccountManager.tsx \
  2>/dev/null | grep -v "// " | wc -l || echo "0")

if [ "$FRONTEND_CONTENT_LOGS" -gt 0 ]; then
  echo "   ❌ FAIL: Found $FRONTEND_CONTENT_LOGS console.log/debug calls in critical components"
  ERRORS=$((ERRORS + 1))
else
  echo "   ✅ PASS: No console.log/debug in SmartInbox/EmailReplyComposer/EmailAccountManager"
fi

# ============================================================================
# Check 2: No direct AI provider imports in src/** (except allowed locations)
# ============================================================================
echo "📋 Check 2: Direct AI provider imports in src/**..."

# Find imports, exclude comments (lines starting with * or //) and allowed locations
DIRECT_AI_IMPORTS=$(grep -rn "from ['\"]@google/generative-ai['\"]\\|from ['\"]openai['\"]\\|from ['\"]anthropic['\"]" \
  src/ \
  --include="*.ts" --include="*.tsx" \
  2>/dev/null | grep -v "src/services/ai/" | grep -v "src/config/providerPolicy" | grep -v "^\s*\*\\|^\s*//" | grep -v ":.*\*.*import" | wc -l || echo "0")

if [ "$DIRECT_AI_IMPORTS" -gt 0 ]; then
  echo "   ❌ FAIL: Found $DIRECT_AI_IMPORTS direct AI provider imports outside allowed locations"
  grep -rn "from ['\"]@google/generative-ai['\"]\\|from ['\"]openai['\"]\\|from ['\"]anthropic['\"]" \
    src/ --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "src/services/ai/" | grep -v "src/config/providerPolicy" | grep -v "^\s*\*\\|^\s*//" | grep -v ":.*\*.*import"
  ERRORS=$((ERRORS + 1))
else
  echo "   ✅ PASS: No direct AI provider imports in src/**"
fi

# ============================================================================
# Check 3: safeLogger files exist
# ============================================================================
echo "📋 Check 3: safeLogger implementation..."

if [ -f "src/utils/safeLogger.ts" ] && [ -f "functions/src/utils/safeLogger.ts" ]; then
  echo "   ✅ PASS: safeLogger files exist"
else
  echo "   ❌ FAIL: safeLogger files missing"
  ERRORS=$((ERRORS + 1))
fi

# ============================================================================
# Check 4: Redaction includes expanded key list
# ============================================================================
echo "📋 Check 4: Redaction key coverage..."

REDACTION_KEYS=$(grep -c "'prompt'\\|'completion'\\|'messages'\\|'toolCalls'" src/security/redaction.ts || echo "0")

if [ "$REDACTION_KEYS" -ge 4 ]; then
  echo "   ✅ PASS: Redaction includes LLM-specific keys"
else
  echo "   ❌ FAIL: Redaction missing LLM-specific keys"
  ERRORS=$((ERRORS + 1))
fi

# ============================================================================
# Check 5: AIClient exists with IONOS_ONLY enforcement
# ============================================================================
echo "📋 Check 5: AIClient sovereignty enforcement..."

IONOS_ENFORCEMENT=$(grep -c "IONOS_ONLY\\|Souveränitätsmodus" src/services/ai/aiClient.ts || echo "0")

if [ "$IONOS_ENFORCEMENT" -ge 2 ]; then
  echo "   ✅ PASS: AIClient has IONOS_ONLY enforcement"
else
  echo "   ❌ FAIL: AIClient missing IONOS_ONLY enforcement"
  ERRORS=$((ERRORS + 1))
fi

# ============================================================================
# Check 6: Sovereignty scanner passes
# ============================================================================
echo "📋 Check 6: Sovereignty scanner..."

if node scripts/sovereignty/check-banned-strings.js 2>&1 | grep -q "PASS"; then
  echo "   ✅ PASS: Sovereignty scanner passes"
else
  echo "   ❌ FAIL: Sovereignty scanner detected issues"
  ERRORS=$((ERRORS + 1))
fi

# ============================================================================
# Summary
# ============================================================================
echo ""
echo "═══════════════════════════════════════════════════════════════════"
if [ "$ERRORS" -eq 0 ]; then
  echo "✅ PHASE 1 VERIFICATION COMPLETE - All checks passed"
else
  echo "❌ PHASE 1 VERIFICATION FAILED - $ERRORS check(s) failed"
fi
echo "═══════════════════════════════════════════════════════════════════"

exit $ERRORS

