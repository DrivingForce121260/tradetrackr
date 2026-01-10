#!/usr/bin/env bash
#
# Phase F2 Guardrail: Verify src/services/ files don't use Firebase imports
#
# Workstream F: Shim Removal Phase 2
#
# All service files should now use dataClient. This script enforces
# that rule by failing if any file in src/services/ imports Firebase.
#
# Exceptions:
# - Files that are explicitly allowed while migration is in progress
#
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Explicitly allowed files (still being migrated or need firebase shim)
# REMOVE IN PHASE F3 - these should eventually be empty
ALLOWED_FILES=(
  # Services that still use onSnapshot via shim (Phase F3 will convert these)
  "src/services/crmService.ts"
  "src/services/emailIntelligenceService.ts"
  "src/services/messagingService.ts"
  # Legacy shim files (will be removed when shims are removed)
  "src/services/firebase.ts"
  # Cache service (doesn't use Firebase)
  "src/services/cacheService.ts"
  # === PHASE F3 CANDIDATES ===
  # These services still use Firebase imports via Vite alias/shim
  # They function correctly but should be migrated to dataClient in Phase F3
  "src/services/automationService.ts"
  "src/services/offerCostingService.ts"
  "src/services/requestPdfService.ts"
  "src/services/materialOCRService.ts"
  "src/services/categoryAnalyticsService.ts"
  "src/services/api.ts"
  "src/services/invoicingService.ts"
  "src/services/offerHistoryService.ts"
  "src/services/categoryCache.ts"
  "src/services/projectLinkingService.ts"
  "src/services/procurementService.ts"
  "src/services/invoicingNumbering.ts"
  "src/services/calendarService.ts"
  "src/services/firestoreOfflineQueue.ts"
  "src/services/sessionService.ts"
  "src/services/emailService.ts"
  "src/services/datevService.ts"
  "src/services/renderService.ts"
  "src/services/documentManagementService.ts"
)

# Forbidden patterns
FORBIDDEN_PATTERNS=(
  "from 'firebase/"
  "from \"firebase/"
  "from '@firebase/"
  "from \"@firebase/"
  "firebase/firestore"
  "firebase/storage"
  "firebase/functions"
  "firebase/app"
  "@/config/firebase"
)

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Phase F2 Guardrail: Services Firebase Import Check"
echo "  $(date -Iseconds)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

VIOLATIONS=0
CHECKED=0
SKIPPED=0

# Find all .ts and .tsx files in src/services
while IFS= read -r -d '' FILE; do
  # Get relative path from repo root
  REL_PATH="${FILE#$REPO_ROOT/}"
  
  # Check if file is in allowed list
  IS_ALLOWED=0
  for allowed in "${ALLOWED_FILES[@]}"; do
    if [[ "$REL_PATH" == "$allowed" ]]; then
      IS_ALLOWED=1
      break
    fi
  done
  
  if [[ $IS_ALLOWED -eq 1 ]]; then
    echo -e "${YELLOW}⊘ SKIP${NC}  $REL_PATH (allowed exception)"
    SKIPPED=$((SKIPPED + 1))
    continue
  fi
  
  CHECKED=$((CHECKED + 1))
  FILE_VIOLATIONS=0
  
  for pattern in "${FORBIDDEN_PATTERNS[@]}"; do
    if grep -q "$pattern" "$FILE" 2>/dev/null; then
      if [[ $FILE_VIOLATIONS -eq 0 ]]; then
        echo -e "${RED}✗ FAIL${NC}  $REL_PATH"
      fi
      echo "         → Found: $pattern"
      FILE_VIOLATIONS=$((FILE_VIOLATIONS + 1))
      VIOLATIONS=$((VIOLATIONS + 1))
    fi
  done
  
  if [[ $FILE_VIOLATIONS -eq 0 ]]; then
    echo -e "${GREEN}✓ PASS${NC}  $REL_PATH"
  fi
done < <(find "$REPO_ROOT/src/services" -type f \( -name "*.ts" -o -name "*.tsx" \) -print0 2>/dev/null)

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  Files checked:  $CHECKED"
echo "  Files skipped:  $SKIPPED (allowed exceptions)"
echo "  Violations:     $VIOLATIONS"
echo ""

if [[ $VIOLATIONS -gt 0 ]]; then
  echo -e "${RED}✗ FAILED${NC} - Services contain Firebase imports"
  echo ""
  echo "  All new service code should use dataClient instead of Firebase."
  echo ""
  echo "  To fix:"
  echo "    - Replace firebase/* imports with @/services/dataClient"
  echo "    - Use dataClient functions (getDoc, queryDocs, etc.)"
  echo "    - For realtime, use @/services/realtimeClient"
  echo ""
  echo "  If this file genuinely needs to be an exception, add it to"
  echo "  ALLOWED_FILES in this script with a comment explaining why."
  echo ""
  exit 1
else
  echo -e "${GREEN}✓ PASSED${NC} - All checked services are Firebase-free"
  exit 0
fi

