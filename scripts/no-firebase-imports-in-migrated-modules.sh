#!/usr/bin/env bash
#
# Phase F Guardrail: Verify migrated modules don't use Firebase imports
#
# Workstream F: Shim Removal Phase 1
#
# This script ensures that modules migrated to dataClient do not
# contain any direct Firebase imports.
#
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# List of migrated modules (Phase 1 + Phase 2)
# These files MUST NOT contain firebase imports
MIGRATED_MODULES=(
  # Phase F1 - Services
  "src/services/taskService.ts"
  "src/services/supplierService.ts"
  "src/services/reportService.ts"
  "src/services/schedulingService.ts"
  "src/services/personnelService.ts"
  "src/services/materialsService.ts"
  "src/services/brandingService.ts"
  "src/services/notificationsService.ts"
  "src/services/notificationPrefsService.ts"
  "src/services/templateService.ts"
  "src/services/timeAdminService.ts"
  "src/services/timeOpsService.ts"
  "src/services/workOrderService.ts"
  "src/services/documentService.ts"
  "src/services/dataClient.ts"
  "src/services/realtimeClient.ts"
  # Phase F2 - Core modules
  "src/contexts/AuthContext.tsx"
  "src/services/firestoreService.ts"
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
  "httpsCallable"
  "@/config/firebase"
)

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Phase F Guardrail: Firebase Import Check"
echo "  $(date -Iseconds)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

VIOLATIONS=0
CHECKED=0

for module in "${MIGRATED_MODULES[@]}"; do
  FILE="$REPO_ROOT/$module"
  
  if [[ ! -f "$FILE" ]]; then
    echo -e "${YELLOW}⚠ SKIP${NC}  $module (file not found)"
    continue
  fi
  
  CHECKED=$((CHECKED + 1))
  MODULE_VIOLATIONS=0
  
  for pattern in "${FORBIDDEN_PATTERNS[@]}"; do
    if grep -q "$pattern" "$FILE" 2>/dev/null; then
      if [[ $MODULE_VIOLATIONS -eq 0 ]]; then
        echo -e "${RED}✗ FAIL${NC}  $module"
      fi
      echo "         → Found: $pattern"
      MODULE_VIOLATIONS=$((MODULE_VIOLATIONS + 1))
      VIOLATIONS=$((VIOLATIONS + 1))
    fi
  done
  
  if [[ $MODULE_VIOLATIONS -eq 0 ]]; then
    echo -e "${GREEN}✓ PASS${NC}  $module"
  fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  Modules checked:  $CHECKED"
echo "  Violations found: $VIOLATIONS"
echo ""

if [[ $VIOLATIONS -gt 0 ]]; then
  echo -e "${RED}✗ FAILED${NC} - Migrated modules contain Firebase imports"
  echo ""
  echo "  These modules have been migrated to dataClient and should"
  echo "  not contain any direct Firebase/Firestore imports."
  echo ""
  echo "  To fix:"
  echo "    - Replace firebase/* imports with @/services/dataClient"
  echo "    - Use dataClient functions (getDoc, queryDocs, etc.)"
  echo "    - For realtime, use @/services/realtimeClient"
  echo ""
  exit 1
else
  echo -e "${GREEN}✓ PASSED${NC} - All migrated modules are Firebase-free"
  exit 0
fi

