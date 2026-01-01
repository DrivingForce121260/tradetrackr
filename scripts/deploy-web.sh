#!/usr/bin/env bash
#
# TradeTrackr Web Portal Deployment Script
# Builds and deploys the web portal to production VPS.
#
# Usage:
#   ./scripts/deploy-web.sh           # full deploy
#   ./scripts/deploy-web.sh --dry-run # preview only (no activation)
#
set -euo pipefail

# ─────────────────────────────────────────────────────────────────────────────
# Error handling: print failing command and line number
# ─────────────────────────────────────────────────────────────────────────────
trap 'echo "❌ ERROR at line $LINENO: $BASH_COMMAND" >&2' ERR

# ─────────────────────────────────────────────────────────────────────────────
# Ensure we run from repo root
# ─────────────────────────────────────────────────────────────────────────────
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || { SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"; echo "$(cd "$SCRIPT_DIR/.." && pwd)"; })"
cd "$REPO_ROOT"

# ─────────────────────────────────────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────────────────────────────────────
PROD_HOST="myvps@85.214.6.74"
STAGING_DIR="/home/myvps/dist_new/"
ACTIVATE_SCRIPT="/usr/local/bin/tradetrackr-activate-web.sh"

# ─────────────────────────────────────────────────────────────────────────────
# Parse arguments
# ─────────────────────────────────────────────────────────────────────────────
DRY_RUN=false
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=true
  echo "🔍 DRY-RUN mode: no changes will be made on prod"
fi

# ─────────────────────────────────────────────────────────────────────────────
# Preflight: verify SSH connectivity
# ─────────────────────────────────────────────────────────────────────────────
echo "🔗 Checking SSH connectivity..."
if ! ssh -o BatchMode=yes -o StrictHostKeyChecking=accept-new -o ConnectTimeout=5 "${PROD_HOST}" "echo ok" >/dev/null 2>&1; then
  echo "❌ SSH connectivity check failed. Ensure key-based auth is configured."
  exit 1
fi
echo "✅ SSH connectivity OK"

# ─────────────────────────────────────────────────────────────────────────────
# Step 1: Build
# ─────────────────────────────────────────────────────────────────────────────
echo "📦 Building web portal..."
npm run build --silent

if [[ ! -d "./dist" ]]; then
  echo "❌ Build failed: ./dist not found"
  exit 1
fi

# ─────────────────────────────────────────────────────────────────────────────
# Step 2: Write build stamp
# ─────────────────────────────────────────────────────────────────────────────
COMMIT="$(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')"
BUILT_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "{\"commit\":\"${COMMIT}\",\"builtAt\":\"${BUILT_AT}\"}" > ./dist/build-info.json
echo "✅ Build complete (commit: ${COMMIT})"

# ─────────────────────────────────────────────────────────────────────────────
# Step 3: Rsync to staging
# ─────────────────────────────────────────────────────────────────────────────
echo "📤 Uploading to staging (${PROD_HOST}:${STAGING_DIR})..."
if [[ "$DRY_RUN" == true ]]; then
  rsync -az --delete --dry-run -e "ssh -o BatchMode=yes -o StrictHostKeyChecking=accept-new" ./dist/ "${PROD_HOST}:${STAGING_DIR}"
else
  rsync -az --delete -e "ssh -o BatchMode=yes -o StrictHostKeyChecking=accept-new" ./dist/ "${PROD_HOST}:${STAGING_DIR}"
fi
echo "✅ Upload complete"

# ─────────────────────────────────────────────────────────────────────────────
# Step 4: Activate on prod
# ─────────────────────────────────────────────────────────────────────────────
if [[ "$DRY_RUN" == true ]]; then
  echo "⏭️  Skipping activation (dry-run)"
  echo "✅ Dry-run complete"
  exit 0
fi

echo "🚀 Activating on production..."
ssh -o BatchMode=yes -o StrictHostKeyChecking=accept-new "${PROD_HOST}" "sudo -n ${ACTIVATE_SCRIPT}"
echo "✅ Deployment complete"

# ─────────────────────────────────────────────────────────────────────────────
# Done
# ─────────────────────────────────────────────────────────────────────────────
echo ""
echo "🎉 Web portal deployed successfully!"
echo "   Verify: ./scripts/verify-deploy.sh"
