#!/usr/bin/env bash
#
# TradeTrackr Endpoint Verification Script
# Checks production endpoints after deployment.
#
# Usage:
#   ./scripts/verify-endpoints.sh
#
# Exit codes:
#   0 = all checks passed
#   1 = one or more checks failed
#
set -euo pipefail

PASS=0
FAIL=0

check() {
  local name="$1"
  local url="$2"
  local expected_code="$3"
  local body_check="${4:-}"

  local response
  local http_code
  local body

  response=$(curl -sS -w "\n%{http_code}" "$url" 2>/dev/null) || {
    echo "❌ $name: connection failed"
    ((FAIL++))
    return
  }

  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')

  if [[ "$http_code" != "$expected_code" ]]; then
    echo "❌ $name: expected $expected_code, got $http_code"
    ((FAIL++))
    return
  fi

  if [[ -n "$body_check" ]]; then
    if ! echo "$body" | grep -q "$body_check"; then
      echo "❌ $name: body missing '$body_check'"
      ((FAIL++))
      return
    fi
  fi

  echo "✅ $name: $http_code"
  ((PASS++))
}

echo "🔍 Verifying TradeTrackr endpoints..."
echo ""

# Check main site (expect 401 due to basic auth)
check "tradetrackr.de" "https://tradetrackr.de/" "401"

# Check AI Gateway healthz (expect 200 with ok:true)
check "ai-staging.tradetrackr.de/healthz" "https://ai-staging.tradetrackr.de/healthz" "200" '"ok":true'

echo ""
echo "───────────────────────────────────────"
echo "Results: $PASS passed, $FAIL failed"
echo "───────────────────────────────────────"

if [[ "$FAIL" -gt 0 ]]; then
  exit 1
fi

echo "✅ All endpoints healthy"
exit 0

