#!/usr/bin/env bash
#
# TradeTrackr CI Gate: Banned Strings Check
# 
# Fails if source code contains references to banned cloud providers
# that would violate IONOS_ONLY data sovereignty requirements.
#
# EXCEPTION: functions/src/emailIntelligence/** is allowed (mailbox connector)
#
# Usage:
#   ./scripts/ci/check-banned-strings.sh           # Default: warn mode
#   SOVEREIGNTY_SCAN_MODE=error ./scripts/ci/...   # Fail on violations
#
# @see /docs/sovereignty/definition.md
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Mode: warn (default) or error
MODE="${SOVEREIGNTY_SCAN_MODE:-warn}"

# Directories to scan
SCAN_DIRS=(
  "src"
  "services/ai-gateway/src"
  # Note: functions/src is partially excluded below
)

# Files/paths to exclude entirely
EXCLUDE_PATTERNS=(
  "node_modules"
  "dist"
  "build"
  ".git"
  "coverage"
  "*.md"
  "*.json"
  "*.lock"
  "package-lock.json"
  "pnpm-lock.yaml"
  "yarn.lock"
)

# Exception path (allowed to reference banned domains)
EXCEPTION_PATH="functions/src/emailIntelligence"

# Banned patterns (domain/service indicators)
BANNED_PATTERNS=(
  "firebaseio\\.com"
  "firestore\\.googleapis\\.com"
  "firebasestorage\\.googleapis\\.com"
  "crashlytics"
  "google-analytics"
  "googletagmanager"
  "gtag"
  "ga4"
  "generativelanguage\\.googleapis\\.com"
  "aiplatform\\.googleapis\\.com"
  "api\\.openai\\.com"
  "api\\.anthropic\\.com"
  "openai\\.azure\\.com"
)

echo "🛡️  TradeTrackr Sovereignty CI Gate"
echo "   Mode: $MODE"
echo "   Exception: $EXCEPTION_PATH/**"
echo ""

VIOLATION_COUNT=0
VIOLATIONS=()

# Check if ripgrep is available
if command -v rg &> /dev/null; then
  GREP_CMD="rg"
else
  GREP_CMD="grep -rIn"
fi

cd "$REPO_ROOT"

for pattern in "${BANNED_PATTERNS[@]}"; do
  # Build exclude arguments for ripgrep/grep
  if [[ "$GREP_CMD" == "rg" ]]; then
    EXCLUDE_ARGS=""
    for exc in "${EXCLUDE_PATTERNS[@]}"; do
      EXCLUDE_ARGS="$EXCLUDE_ARGS --glob !$exc"
    done
    
    # Scan each directory
    for dir in "${SCAN_DIRS[@]}"; do
      if [[ -d "$dir" ]]; then
        results=$($GREP_CMD -n "$pattern" "$dir" $EXCLUDE_ARGS 2>/dev/null || true)
        while IFS= read -r line; do
          if [[ -n "$line" ]]; then
            # Check if it's in the exception path
            if [[ ! "$line" =~ $EXCEPTION_PATH ]]; then
              VIOLATIONS+=("$line")
              ((VIOLATION_COUNT++))
            fi
          fi
        done <<< "$results"
      fi
    done
  else
    # Fallback to grep
    for dir in "${SCAN_DIRS[@]}"; do
      if [[ -d "$dir" ]]; then
        results=$(grep -rIn "$pattern" "$dir" --include="*.ts" --include="*.tsx" --include="*.js" 2>/dev/null || true)
        while IFS= read -r line; do
          if [[ -n "$line" ]]; then
            if [[ ! "$line" =~ $EXCEPTION_PATH ]]; then
              VIOLATIONS+=("$line")
              ((VIOLATION_COUNT++))
            fi
          fi
        done <<< "$results"
      fi
    done
  fi
done

# Also check for direct AI SDK imports in frontend (should use AIClient)
AI_SDK_PATTERNS=(
  "from ['\"]@google/generative-ai"
  "from ['\"]openai['\"]"
  "from ['\"]anthropic['\"]"
  "require\\(['\"]@google/generative-ai"
  "require\\(['\"]openai['\"]"
  "require\\(['\"]anthropic['\"]"
)

for pattern in "${AI_SDK_PATTERNS[@]}"; do
  if [[ -d "src" ]]; then
    if [[ "$GREP_CMD" == "rg" ]]; then
      results=$(rg -n "$pattern" src --glob "!node_modules" 2>/dev/null || true)
    else
      results=$(grep -rIn "$pattern" src --include="*.ts" --include="*.tsx" 2>/dev/null || true)
    fi
    while IFS= read -r line; do
      if [[ -n "$line" ]]; then
        VIOLATIONS+=("[AI_SDK_DIRECT] $line")
        ((VIOLATION_COUNT++))
      fi
    done <<< "$results"
  fi
done

echo "───────────────────────────────────────"

if [[ $VIOLATION_COUNT -eq 0 ]]; then
  echo "✅ No banned provider references found"
  exit 0
fi

echo "⚠️  Found $VIOLATION_COUNT violation(s):"
echo ""

for v in "${VIOLATIONS[@]}"; do
  echo "  • $v"
done

echo ""
echo "───────────────────────────────────────"

if [[ "$MODE" == "error" ]]; then
  echo "❌ FAILED: Banned provider references found in source code."
  echo ""
  echo "How to fix:"
  echo "  1. Remove direct references to banned cloud providers"
  echo "  2. Use the AI Gateway for all AI/LLM calls"
  echo "  3. For legitimate mailbox connector code, move to: $EXCEPTION_PATH/"
  echo ""
  echo "Documentation: /docs/sovereignty/definition.md"
  exit 1
else
  echo "⚠️  WARNING: Violations found but mode is 'warn' (non-blocking)"
  echo ""
  echo "To enable blocking mode, set: SOVEREIGNTY_SCAN_MODE=error"
  exit 0
fi

