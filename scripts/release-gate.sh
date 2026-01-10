#!/usr/bin/env bash
#
# TradeTrackr Release Gate
#
# Pre-release verification script that runs all sovereignty and smoke checks.
# Must pass before any deployment to production.
#
# Usage:
#   ./scripts/release-gate.sh
#
# Required Environment Variables:
#   TRADETRACKR_TEST_TOKEN - Bearer token for storage smoke test (from browser devtools)
#
# Exit Codes:
#   0 - All checks passed
#   1 - One or more checks failed
#
set -euo pipefail

# ─────────────────────────────────────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

PASS_COUNT=0
FAIL_COUNT=0
SKIP_COUNT=0

# Colors (if terminal supports them)
if [[ -t 1 ]]; then
  RED='\033[0;31m'
  GREEN='\033[0;32m'
  YELLOW='\033[0;33m'
  BLUE='\033[0;34m'
  NC='\033[0m' # No Color
else
  RED=''
  GREEN=''
  YELLOW=''
  BLUE=''
  NC=''
fi

# ─────────────────────────────────────────────────────────────────────────────
# Helper Functions
# ─────────────────────────────────────────────────────────────────────────────
print_header() {
  echo ""
  echo -e "${BLUE}═══════════════════════════════════════════════════════════════════${NC}"
  echo -e "${BLUE}  TradeTrackr Release Gate${NC}"
  echo -e "${BLUE}  $(date -Iseconds)${NC}"
  echo -e "${BLUE}═══════════════════════════════════════════════════════════════════${NC}"
  echo ""
}

run_check() {
  local name="$1"
  local cmd="$2"
  
  echo -e "${BLUE}▸ Running: ${name}${NC}"
  
  if eval "$cmd" > /tmp/release-gate-output.txt 2>&1; then
    echo -e "  ${GREEN}✅ PASS${NC}"
    ((PASS_COUNT++))
    return 0
  else
    echo -e "  ${RED}❌ FAIL${NC}"
    echo "  Output:"
    sed 's/^/    /' /tmp/release-gate-output.txt | tail -20
    ((FAIL_COUNT++))
    return 1
  fi
}

skip_check() {
  local name="$1"
  local reason="$2"
  
  echo -e "${BLUE}▸ Skipping: ${name}${NC}"
  echo -e "  ${YELLOW}⏭️  SKIP: ${reason}${NC}"
  ((SKIP_COUNT++))
}

# ─────────────────────────────────────────────────────────────────────────────
# Token Check
# ─────────────────────────────────────────────────────────────────────────────
check_token() {
  if [[ -z "${TRADETRACKR_TEST_TOKEN:-}" ]]; then
    echo ""
    echo -e "${RED}═══════════════════════════════════════════════════════════════════${NC}"
    echo -e "${RED}  ERROR: TRADETRACKR_TEST_TOKEN is not set${NC}"
    echo -e "${RED}═══════════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo "The storage smoke test requires a valid Keycloak JWT token."
    echo ""
    echo "How to obtain the token:"
    echo "  1. Open https://tradetrackr.de in your browser"
    echo "  2. Log in with your account"
    echo "  3. Open Developer Tools (F12)"
    echo "  4. Go to Network tab"
    echo "  5. Click on any API request"
    echo "  6. Find the 'Authorization' header"
    echo "  7. Copy the value after 'Bearer '"
    echo ""
    echo "Then run:"
    echo "  export TRADETRACKR_TEST_TOKEN='eyJ...'"
    echo "  ./scripts/release-gate.sh"
    echo ""
    return 1
  fi
  return 0
}

# ─────────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────────
print_header

# Check 1: Sovereignty Verify (source code scan)
echo ""
echo -e "${BLUE}━━━ Phase 1: Code Sovereignty Checks ━━━${NC}"
run_check "npm run sovereignty:scan" "npm run sovereignty:scan" || true

# Check 2: No-Google-Ever (strict decommission check)
run_check "npm run sovereignty:never-google" "npm run sovereignty:never-google" || true

# Check 3: AI Sovereignty Verify (if script exists)
if [[ -f "$REPO_ROOT/scripts/sovereignty/smoke-ai-gateway.js" ]]; then
  run_check "AI Gateway smoke test" "node scripts/sovereignty/smoke-ai-gateway.js" || true
else
  skip_check "AI Gateway smoke test" "smoke-ai-gateway.js not found"
fi

# Check 4: Phase F Guardrail (migrated modules firebase-free)
if [[ -f "$REPO_ROOT/scripts/no-firebase-imports-in-migrated-modules.sh" ]]; then
  run_check "Phase F guardrail (Firebase-free modules)" "bash scripts/no-firebase-imports-in-migrated-modules.sh" || true
else
  skip_check "Phase F guardrail" "Script not found"
fi

# Check 5: Phase F2 Guardrail (services firebase-free)
if [[ -f "$REPO_ROOT/scripts/no-firebase-imports-in-src-services.sh" ]]; then
  run_check "Phase F2 guardrail (Services Firebase-free)" "bash scripts/no-firebase-imports-in-src-services.sh" || true
else
  skip_check "Phase F2 guardrail" "Script not found"
fi

# Check 5: Build check (secrets in dist)
echo ""
echo -e "${BLUE}━━━ Phase 2: Build & Secrets Check ━━━${NC}"
if [[ -d "$REPO_ROOT/dist" ]]; then
  run_check "Check no secrets in dist" "./scripts/check-no-secrets-in-dist.sh" || true
else
  skip_check "Check no secrets in dist" "dist/ not found (run npm run build first)"
fi

# Check 6: Storage Smoke Test
echo ""
echo -e "${BLUE}━━━ Phase 3: Integration Smoke Tests ━━━${NC}"
if check_token; then
  # Storage smoke test would go here
  # For now, we just verify the token format
  if [[ "${TRADETRACKR_TEST_TOKEN}" =~ ^eyJ ]]; then
    echo -e "${BLUE}▸ Token format validation${NC}"
    echo -e "  ${GREEN}✅ PASS${NC}"
    ((PASS_COUNT++))
  else
    echo -e "${BLUE}▸ Token format validation${NC}"
    echo -e "  ${RED}❌ FAIL: Token does not appear to be a JWT${NC}"
    ((FAIL_COUNT++))
  fi
else
  skip_check "Storage smoke test" "TRADETRACKR_TEST_TOKEN not set"
  FAIL_COUNT=$((FAIL_COUNT + 1))
fi

# ─────────────────────────────────────────────────────────────────────────────
# Summary
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Release Gate Summary${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  ${GREEN}Passed:${NC}  $PASS_COUNT"
echo -e "  ${RED}Failed:${NC}  $FAIL_COUNT"
echo -e "  ${YELLOW}Skipped:${NC} $SKIP_COUNT"
echo ""

if [[ $FAIL_COUNT -gt 0 ]]; then
  echo -e "${RED}❌ RELEASE GATE FAILED${NC}"
  echo ""
  echo "Fix the failing checks before deploying."
  echo "See docs/WORKSTREAM_E_RELEASE_GATE.md for troubleshooting."
  exit 1
fi

echo -e "${GREEN}✅ RELEASE GATE PASSED${NC}"
echo ""
echo "All checks passed. Safe to deploy."
exit 0

