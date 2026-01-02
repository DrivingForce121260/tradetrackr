#!/usr/bin/env bash
#
# TradeTrackr Security Check: No Secrets in dist/
# Fails if sensitive tokens or patterns are found in the build output.
#
set -euo pipefail

DIST_DIR="${1:-./dist}"

if [[ ! -d "$DIST_DIR" ]]; then
  echo "❌ dist/ directory not found at: $DIST_DIR"
  exit 1
fi

echo "🔍 Scanning $DIST_DIR for leaked secrets..."

FOUND=0

# Check for AI gateway token variable names
if grep -rIl "VITE_AI_GATEWAY_TOKEN\|AI_GATEWAY_TOKEN" "$DIST_DIR" 2>/dev/null; then
  echo "❌ FOUND: AI_GATEWAY_TOKEN reference in dist/"
  FOUND=1
fi

# Check for 64-character hex strings (typical token format)
# Pattern: standalone 64-char hex string (not part of longer hash)
if grep -rIoE '\b[a-f0-9]{64}\b' "$DIST_DIR" 2>/dev/null | head -5; then
  echo "⚠️  WARNING: 64-char hex strings found (may be hashes or tokens)"
  # Don't fail on this - could be legitimate hashes like SHA-256
fi

# Check for Bearer token patterns with hardcoded values
if grep -rIE 'Bearer [a-zA-Z0-9_-]{32,}' "$DIST_DIR" 2>/dev/null | grep -v 'Bearer \$' | head -5; then
  echo "❌ FOUND: Hardcoded Bearer token in dist/"
  FOUND=1
fi

# Check for IONOS API token patterns (JWT format)
if grep -rIE 'eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+' "$DIST_DIR" 2>/dev/null | head -3; then
  echo "❌ FOUND: JWT token (possibly IONOS) in dist/"
  FOUND=1
fi

if [[ "$FOUND" -eq 1 ]]; then
  echo ""
  echo "❌ SECURITY CHECK FAILED: Secrets found in dist/"
  echo "   Review the files above and remove any hardcoded tokens."
  exit 1
fi

echo "✅ No secrets detected in dist/"
exit 0
