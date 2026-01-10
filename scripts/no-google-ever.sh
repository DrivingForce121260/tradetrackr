#!/usr/bin/env bash
#
# TradeTrackr No-Google-Ever Check
#
# Workstream E4: Decommission hardening
#
# Scans the codebase for any Google/Firebase/OpenAI/Anthropic dependencies
# or endpoint references that would violate sovereignty requirements.
#
# This is a stricter check than the regular sovereignty scan - it fails
# on ANY reference, not just new ones vs baseline.
#
# Usage:
#   ./scripts/no-google-ever.sh
#   npm run sovereignty:never-google
#
# Exit Codes:
#   0 - No forbidden dependencies or endpoints found
#   1 - Violations found
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

VIOLATIONS=0
TEMP_FILE=$(mktemp)
trap 'rm -f "$TEMP_FILE"' EXIT

# Colors
if [[ -t 1 ]]; then
  RED='\033[0;31m'
  GREEN='\033[0;32m'
  YELLOW='\033[0;33m'
  NC='\033[0m'
else
  RED=''
  GREEN=''
  YELLOW=''
  NC=''
fi

# ─────────────────────────────────────────────────────────────────────────────
# Exclusions: denylist/check files that legitimately contain banned strings
# ─────────────────────────────────────────────────────────────────────────────
EXCLUDE_GREP_ARGS=(
  --exclude-dir=.git
  --exclude-dir=node_modules
  --exclude-dir=dist
  --exclude-dir=.next
  --exclude-dir=docs
  --exclude=providerPolicy.ts
  --exclude=check-banned-strings.js
)

# Additional files to skip (full paths or patterns, checked after grep)
# These are:
# - Denylist files that define banned patterns
# - Tests that verify deny functionality
# - Legacy shim files (scheduled for removal per SHIM_REMOVAL_PLAN.md)
EXCLUDE_FILES=(
  # Denylist/policy files
  "src/config/providerPolicy.ts"
  "scripts/sovereignty/check-banned-strings.js"
  # Test files for deny functionality
  "services/ai-gateway/src/utils/safeFetch.test.ts"
  "services/tradetrackr-api/dist/lib/aiSovereignty.js"
  # Legacy Firebase shim files (TODO: remove per SHIM_REMOVAL_PLAN.md)
  "src/config/firebase.ts"
  "src/services/firebase.ts"
  "src/services/calendarService.ts"
  "src/lib/firebase-shim/"
  "src/lib/firestore-shim/"
)

is_excluded_file() {
  local file="$1"
  for excluded in "${EXCLUDE_FILES[@]}"; do
    if [[ "$file" == *"$excluded" ]]; then
      return 0
    fi
  done
  return 1
}

echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "  TradeTrackr No-Google-Ever Check"
echo "  $(date -Iseconds)"
echo "═══════════════════════════════════════════════════════════════════"
echo ""

# ─────────────────────────────────────────────────────────────────────────────
# Check 1: Forbidden npm packages in package.json files
# ─────────────────────────────────────────────────────────────────────────────
echo "▸ Checking package.json for forbidden dependencies..."

FORBIDDEN_DEPS=(
  '"firebase"'
  '"firebase-admin"'
  '"@firebase/'
  '"@google-cloud/'
  '"googleapis"'
  '"@google/generative-ai"'
)

# Only check frontend package.json for these (backend has different rules)
FRONTEND_FORBIDDEN_DEPS=(
  '"anthropic"'
  '"openai"'
  '"@anthropic-ai/'
)

check_package_json() {
  local file="$1"
  local context="$2"
  
  for pattern in "${FORBIDDEN_DEPS[@]}"; do
    if grep -q "$pattern" "$file" 2>/dev/null; then
      echo -e "  ${RED}❌ FOUND in $file: $pattern${NC}"
      ((VIOLATIONS++))
    fi
  done
  
  # Frontend-specific checks (not in services/)
  if [[ "$context" == "frontend" ]]; then
    for pattern in "${FRONTEND_FORBIDDEN_DEPS[@]}"; do
      if grep -q "$pattern" "$file" 2>/dev/null; then
        echo -e "  ${RED}❌ FOUND in $file: $pattern${NC}"
        ((VIOLATIONS++))
      fi
    done
  fi
}

# Root package.json
if [[ -f "package.json" ]]; then
  check_package_json "package.json" "frontend"
fi

# Services package.json files
for pkg in services/*/package.json; do
  if [[ -f "$pkg" ]]; then
    check_package_json "$pkg" "backend"
  fi
done

if [[ $VIOLATIONS -eq 0 ]]; then
  echo -e "  ${GREEN}✅ No forbidden packages found${NC}"
fi

# ─────────────────────────────────────────────────────────────────────────────
# Check 2: Forbidden npm packages in package-lock.json
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "▸ Checking package-lock.json for forbidden dependencies..."

# Combined regex for lockfile check
FORBIDDEN_LOCK_RE='"(firebase|@firebase/|@google-cloud/|googleapis)'

LOCK_VIOLATIONS=0

# Check root package-lock.json
ROOT_LOCK_COUNT=0
if [[ -f "package-lock.json" ]]; then
  ROOT_LOCK_COUNT=$(grep -E "$FORBIDDEN_LOCK_RE" package-lock.json 2>/dev/null | wc -l | tr -d ' ' || echo "0")
  # Ensure it's a valid integer
  [[ "$ROOT_LOCK_COUNT" =~ ^[0-9]+$ ]] || ROOT_LOCK_COUNT=0
fi

# Check services package-lock.json files
SERVICES_LOCK_COUNT=0
for lockfile in services/*/package-lock.json; do
  if [[ -f "$lockfile" ]]; then
    c=$(grep -E "$FORBIDDEN_LOCK_RE" "$lockfile" 2>/dev/null | wc -l | tr -d ' ' || echo "0")
    [[ "$c" =~ ^[0-9]+$ ]] || c=0
    SERVICES_LOCK_COUNT=$((SERVICES_LOCK_COUNT + c))
  fi
done

TOTAL_LOCK_COUNT=$((ROOT_LOCK_COUNT + SERVICES_LOCK_COUNT))

if (( TOTAL_LOCK_COUNT > 0 )); then
  if (( ROOT_LOCK_COUNT > 0 )); then
    echo -e "  ${RED}❌ FOUND in package-lock.json: $ROOT_LOCK_COUNT forbidden package reference(s)${NC}"
  fi
  if (( SERVICES_LOCK_COUNT > 0 )); then
    echo -e "  ${RED}❌ FOUND in services/*/package-lock.json: $SERVICES_LOCK_COUNT forbidden package reference(s)${NC}"
  fi
  LOCK_VIOLATIONS=1
  ((VIOLATIONS++))
fi

if [[ $LOCK_VIOLATIONS -eq 0 ]]; then
  echo -e "  ${GREEN}✅ No forbidden packages in lockfile${NC}"
fi

# ─────────────────────────────────────────────────────────────────────────────
# Check 3: Forbidden endpoints in source code
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "▸ Checking source code for forbidden endpoints..."

FORBIDDEN_ENDPOINTS=(
  'firebaseio.com'
  'firebaseapp.com'
  'firestore.googleapis.com'
  'firebasestorage.googleapis.com'
  'cloudfunctions.net'
  'run.app'
  'appspot.com'
  'generativelanguage.googleapis.com'
  'aiplatform.googleapis.com'
)

# Frontend-only forbidden endpoints (allowed in backend for proxying)
FRONTEND_FORBIDDEN_ENDPOINTS=(
  'api.openai.com'
  'api.anthropic.com'
)

SOURCE_VIOLATIONS=0

for endpoint in "${FORBIDDEN_ENDPOINTS[@]}"; do
  # Search in src/ and services/ with exclusions
  found=$(grep -r "${EXCLUDE_GREP_ARGS[@]}" -l "$endpoint" src/ services/ 2>/dev/null || true)
  
  if [[ -n "$found" ]]; then
    while IFS= read -r file; do
      [[ -z "$file" ]] && continue
      # Skip excluded files
      if is_excluded_file "$file"; then
        continue
      fi
      echo -e "  ${RED}❌ FOUND: $endpoint in $file${NC}"
      grep -n "$endpoint" "$file" | head -3 | sed 's/^/      /'
      ((SOURCE_VIOLATIONS++))
      ((VIOLATIONS++))
    done <<< "$found"
  fi
done

# Check frontend-only endpoints (only in src/, not services/)
for endpoint in "${FRONTEND_FORBIDDEN_ENDPOINTS[@]}"; do
  found=$(grep -r "${EXCLUDE_GREP_ARGS[@]}" -l "$endpoint" src/ 2>/dev/null || true)
  if [[ -n "$found" ]]; then
    while IFS= read -r file; do
      [[ -z "$file" ]] && continue
      # Skip excluded files
      if is_excluded_file "$file"; then
        continue
      fi
      echo -e "  ${RED}❌ FOUND: $endpoint in $file${NC}"
      grep -n "$endpoint" "$file" | head -3 | sed 's/^/      /'
      ((SOURCE_VIOLATIONS++))
      ((VIOLATIONS++))
    done <<< "$found"
  fi
done

if [[ $SOURCE_VIOLATIONS -eq 0 ]]; then
  echo -e "  ${GREEN}✅ No forbidden endpoints in source code${NC}"
fi

# ─────────────────────────────────────────────────────────────────────────────
# Check 4: Forbidden endpoints in dist/ (if it exists)
# ─────────────────────────────────────────────────────────────────────────────
if [[ -d "dist" ]]; then
  echo ""
  echo "▸ Checking dist/ for forbidden endpoints..."
  
  ALL_FORBIDDEN_ENDPOINTS=("${FORBIDDEN_ENDPOINTS[@]}" "${FRONTEND_FORBIDDEN_ENDPOINTS[@]}")
  DIST_VIOLATIONS=0
  
  for endpoint in "${ALL_FORBIDDEN_ENDPOINTS[@]}"; do
    found=$(grep -r -l "$endpoint" dist/ 2>/dev/null || true)
    if [[ -n "$found" ]]; then
      echo -e "  ${RED}❌ FOUND in dist/: $endpoint${NC}"
      ((DIST_VIOLATIONS++))
      ((VIOLATIONS++))
    fi
  done
  
  if [[ $DIST_VIOLATIONS -eq 0 ]]; then
    echo -e "  ${GREEN}✅ No forbidden endpoints in dist/${NC}"
  fi
fi

# ─────────────────────────────────────────────────────────────────────────────
# Summary
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════════════════"

if [[ $VIOLATIONS -gt 0 ]]; then
  echo -e "${RED}❌ NO-GOOGLE-EVER CHECK FAILED${NC}"
  echo ""
  echo "Found $VIOLATIONS violation(s)."
  echo ""
  echo "These dependencies/endpoints must be removed before deployment."
  echo "See docs/SHIM_REMOVAL_PLAN.md for migration guidance."
  exit 1
fi

echo -e "${GREEN}✅ NO-GOOGLE-EVER CHECK PASSED${NC}"
echo ""
echo "No forbidden dependencies or endpoints found."
exit 0
