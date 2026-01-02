#!/usr/bin/env bash
#
# Egress Allowlist Verification Script
# 
# Tests that:
# - IONOS AI endpoint is reachable
# - Blocked endpoints are NOT reachable (timeout or blocked)
#
# Run on production VPS after applying firewall rules.
#
set -euo pipefail

PASS=0
FAIL=0
TIMEOUT=5

echo "═══════════════════════════════════════════════════════════"
echo "  TradeTrackr Egress Allowlist Verification"
echo "  Date: $(date -Iseconds)"
echo "═══════════════════════════════════════════════════════════"
echo ""

# ============================================================================
# SHOULD SUCCEED: IONOS AI Endpoint
# ============================================================================

echo "▸ Testing IONOS AI endpoint (should succeed)..."
if curl --connect-timeout $TIMEOUT -sSf "https://openai.inference.de-txl.ionos.com/v1/models" -H "Authorization: Bearer test" >/dev/null 2>&1; then
  echo "  ✅ PASS: IONOS AI reachable"
  ((PASS++))
else
  # May get 401 but connection works
  HTTP_CODE=$(curl --connect-timeout $TIMEOUT -o /dev/null -s -w "%{http_code}" "https://openai.inference.de-txl.ionos.com/v1/models" 2>/dev/null || echo "000")
  if [[ "$HTTP_CODE" == "401" || "$HTTP_CODE" == "403" || "$HTTP_CODE" == "404" ]]; then
    echo "  ✅ PASS: IONOS AI reachable (HTTP $HTTP_CODE)"
    ((PASS++))
  else
    echo "  ❌ FAIL: IONOS AI not reachable (HTTP $HTTP_CODE)"
    ((FAIL++))
  fi
fi

# ============================================================================
# SHOULD SUCCEED: Own infrastructure
# ============================================================================

echo ""
echo "▸ Testing ai.tradetrackr.de (should succeed)..."
HTTP_CODE=$(curl --connect-timeout $TIMEOUT -o /dev/null -s -w "%{http_code}" "https://ai.tradetrackr.de/healthz" 2>/dev/null || echo "000")
if [[ "$HTTP_CODE" == "200" ]]; then
  echo "  ✅ PASS: AI Gateway reachable (HTTP 200)"
  ((PASS++))
else
  echo "  ❌ FAIL: AI Gateway not reachable (HTTP $HTTP_CODE)"
  ((FAIL++))
fi

# ============================================================================
# SHOULD FAIL: Blocked endpoints
# ============================================================================

echo ""
echo "▸ Testing blocked endpoints (should timeout/fail)..."

test_blocked() {
  local name="$1"
  local url="$2"
  
  HTTP_CODE=$(curl --connect-timeout $TIMEOUT -o /dev/null -s -w "%{http_code}" "$url" 2>/dev/null || echo "000")
  
  if [[ "$HTTP_CODE" == "000" ]]; then
    echo "  ✅ PASS: $name blocked (connection refused/timeout)"
    ((PASS++))
  else
    echo "  ❌ FAIL: $name reachable (HTTP $HTTP_CODE) - SHOULD BE BLOCKED"
    ((FAIL++))
  fi
}

# Direct OpenAI (not IONOS)
test_blocked "api.openai.com" "https://api.openai.com/v1/models"

# Anthropic
test_blocked "api.anthropic.com" "https://api.anthropic.com/v1/messages"

# Firebase/Google
test_blocked "googleapis.com" "https://www.googleapis.com/"
test_blocked "firebaseio.com" "https://test.firebaseio.com/"

# ============================================================================
# Summary
# ============================================================================

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  Results: $PASS passed, $FAIL failed"
echo "═══════════════════════════════════════════════════════════"

if [[ "$FAIL" -gt 0 ]]; then
  echo ""
  echo "⚠️  Some tests failed. Review above and check:"
  echo "  - Is UFW/iptables configured correctly?"
  echo "  - Is the app-level safeFetch working?"
  echo "  - See: runbooks/egress-allowlist.md"
  exit 1
fi

echo ""
echo "✅ All egress tests passed"
exit 0

