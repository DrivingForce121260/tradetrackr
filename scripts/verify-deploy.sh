#!/usr/bin/env bash
#
# TradeTrackr Deployment Verification Script
# Checks production endpoints after deployment.
#
# Usage:
#   ./scripts/verify-deploy.sh
#
# Exit codes:
#   0 = all checks passed
#   1 = one or more checks failed
#
set -uo pipefail
IFS=$'\n\t'

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

  response=$(curl -sS -w "\n%{http_code}" --max-time 10 "$url" 2>/dev/null) || {
    echo "❌ $name: connection failed"
    FAIL=$((FAIL + 1))
    return
  }

  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')

  if [[ "$http_code" != "$expected_code" ]]; then
    echo "❌ $name: expected $expected_code, got $http_code"
    FAIL=$((FAIL + 1))
    return
  fi

  if [[ -n "$body_check" ]]; then
    if ! echo "$body" | grep -q "$body_check"; then
      echo "❌ $name: body missing '$body_check'"
      FAIL=$((FAIL + 1))
      return
    fi
  fi

  echo "✅ $name: $http_code"
  PASS=$((PASS + 1))
}

echo "🔍 Verifying TradeTrackr deployment..."
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

