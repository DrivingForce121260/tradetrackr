#!/usr/bin/env bash
#
# TradeTrackr Keycloak Realm Export Script
#
# Workstream E2: Exports Keycloak realm configuration and uploads to S3.
#
# Note: This exports realm configuration only, not user credentials.
# For full user migration, use the Keycloak admin console or CLI.
#
# Usage:
#   ./scripts/backup/keycloak-export.sh
#   npm run backup:keycloak
#
# Required Environment Variables:
#   KEYCLOAK_BASE_URL      - Keycloak base URL (e.g., https://auth.tradetrackr.de)
#   KEYCLOAK_REALM         - Realm to export (e.g., tradetrackr)
#   KEYCLOAK_ADMIN_USER    - Admin username
#   KEYCLOAK_ADMIN_PASSWORD - Admin password
#   BACKUP_S3_ENDPOINT     - S3 endpoint
#   BACKUP_S3_BUCKET       - S3 bucket name
#
# Optional Environment Variables:
#   KEYCLOAK_ADMIN_REALM   - Admin realm (default: master)
#   BACKUP_S3_PREFIX       - S3 prefix (default: backups/keycloak)
#   IONOS_S3_ACCESS_KEY_ID - S3 access key
#   IONOS_S3_SECRET_ACCESS_KEY - S3 secret key
#
# Exit Codes:
#   0 - Export completed successfully
#   1 - Export failed
#
set -euo pipefail

# ─────────────────────────────────────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────────────────────────────────────
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Required
: "${KEYCLOAK_BASE_URL:?KEYCLOAK_BASE_URL is required}"
: "${KEYCLOAK_REALM:?KEYCLOAK_REALM is required}"
: "${KEYCLOAK_ADMIN_USER:?KEYCLOAK_ADMIN_USER is required}"
: "${KEYCLOAK_ADMIN_PASSWORD:?KEYCLOAK_ADMIN_PASSWORD is required}"
: "${BACKUP_S3_ENDPOINT:?BACKUP_S3_ENDPOINT is required}"
: "${BACKUP_S3_BUCKET:?BACKUP_S3_BUCKET is required}"

# Optional with defaults
KEYCLOAK_ADMIN_REALM="${KEYCLOAK_ADMIN_REALM:-master}"
BACKUP_S3_PREFIX="${BACKUP_S3_PREFIX:-backups/keycloak}"
BACKUP_S3_REGION="${BACKUP_S3_REGION:-eu-central-2}"

# AWS CLI credentials
export AWS_ACCESS_KEY_ID="${IONOS_S3_ACCESS_KEY_ID:-${AWS_ACCESS_KEY_ID:-}}"
export AWS_SECRET_ACCESS_KEY="${IONOS_S3_SECRET_ACCESS_KEY:-${AWS_SECRET_ACCESS_KEY:-}}"
export AWS_DEFAULT_REGION="$BACKUP_S3_REGION"

# Temp directory
WORK_DIR=$(mktemp -d)
trap 'rm -rf "$WORK_DIR"' EXIT

# File names
EXPORT_FILE="keycloak_${KEYCLOAK_REALM}_${TIMESTAMP}.json"
CHECKSUM_FILE="${EXPORT_FILE}.sha256"

# ─────────────────────────────────────────────────────────────────────────────
# Functions
# ─────────────────────────────────────────────────────────────────────────────
log() {
  echo "[$(date -Iseconds)] $*"
}

error() {
  echo "[$(date -Iseconds)] ERROR: $*" >&2
}

s3_cmd() {
  aws s3 "$@" --endpoint-url "$BACKUP_S3_ENDPOINT"
}

# ─────────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────────
log "═══════════════════════════════════════════════════════════════════"
log "TradeTrackr Keycloak Realm Export"
log "═══════════════════════════════════════════════════════════════════"
log ""

# Check required tools
for cmd in curl jq aws sha256sum; do
  if ! command -v "$cmd" &>/dev/null; then
    error "Required command not found: $cmd"
    exit 1
  fi
done

cd "$WORK_DIR"

log "Keycloak URL: $KEYCLOAK_BASE_URL"
log "Realm: $KEYCLOAK_REALM"
log "Admin Realm: $KEYCLOAK_ADMIN_REALM"
log ""

# ─────────────────────────────────────────────────────────────────────────────
# Get Admin Token
# ─────────────────────────────────────────────────────────────────────────────
log "Obtaining admin token..."

TOKEN_ENDPOINT="${KEYCLOAK_BASE_URL}/realms/${KEYCLOAK_ADMIN_REALM}/protocol/openid-connect/token"

TOKEN_RESPONSE=$(curl -sS -X POST "$TOKEN_ENDPOINT" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password" \
  -d "client_id=admin-cli" \
  -d "username=${KEYCLOAK_ADMIN_USER}" \
  -d "password=${KEYCLOAK_ADMIN_PASSWORD}" \
  2>/dev/null)

ACCESS_TOKEN=$(echo "$TOKEN_RESPONSE" | jq -r '.access_token // empty')

if [[ -z "$ACCESS_TOKEN" ]]; then
  error "Failed to obtain admin token"
  error "Response: $(echo "$TOKEN_RESPONSE" | jq -r '.error_description // .error // "Unknown error"')"
  exit 1
fi

log "✓ Admin token obtained"

# ─────────────────────────────────────────────────────────────────────────────
# Export Realm
# ─────────────────────────────────────────────────────────────────────────────
log ""
log "Exporting realm configuration..."

# Keycloak Admin API endpoint for realm export
# Note: This exports the full realm configuration including clients, roles, etc.
# but not user credentials (secrets are excluded by default)
EXPORT_ENDPOINT="${KEYCLOAK_BASE_URL}/admin/realms/${KEYCLOAK_REALM}"

EXPORT_RESPONSE=$(curl -sS -X GET "$EXPORT_ENDPOINT" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Accept: application/json" \
  2>/dev/null)

# Check if export was successful
if echo "$EXPORT_RESPONSE" | jq -e '.realm' >/dev/null 2>&1; then
  # Pretty-print the JSON
  echo "$EXPORT_RESPONSE" | jq '.' > "$EXPORT_FILE"
  log "✓ Realm exported"
else
  error "Failed to export realm"
  error "Response: $(echo "$EXPORT_RESPONSE" | head -c 500)"
  exit 1
fi

# Create checksum
sha256sum "$EXPORT_FILE" > "$CHECKSUM_FILE"
log "✓ Checksum created"

# ─────────────────────────────────────────────────────────────────────────────
# Export Summary
# ─────────────────────────────────────────────────────────────────────────────
log ""
log "Export summary:"

# Count various objects in the export
CLIENT_COUNT=$(jq '.clients | length // 0' "$EXPORT_FILE")
ROLE_COUNT=$(jq '.roles.realm | length // 0' "$EXPORT_FILE")
GROUP_COUNT=$(jq '.groups | length // 0' "$EXPORT_FILE")
IDP_COUNT=$(jq '.identityProviders | length // 0' "$EXPORT_FILE")

log "  Clients: $CLIENT_COUNT"
log "  Realm Roles: $ROLE_COUNT"
log "  Groups: $GROUP_COUNT"
log "  Identity Providers: $IDP_COUNT"

# File size
FILE_SIZE=$(stat -c%s "$EXPORT_FILE" 2>/dev/null || stat -f%z "$EXPORT_FILE")
log "  Export size: $(numfmt --to=iec-i --suffix=B "$FILE_SIZE" 2>/dev/null || echo "$FILE_SIZE bytes")"

# ─────────────────────────────────────────────────────────────────────────────
# Upload to S3
# ─────────────────────────────────────────────────────────────────────────────
log ""
log "Uploading to S3..."

# Verify credentials
if [[ -z "$AWS_ACCESS_KEY_ID" || -z "$AWS_SECRET_ACCESS_KEY" ]]; then
  error "S3 credentials not set"
  exit 1
fi

s3_cmd cp "$EXPORT_FILE" "s3://${BACKUP_S3_BUCKET}/${BACKUP_S3_PREFIX}/${EXPORT_FILE}" --quiet
s3_cmd cp "$CHECKSUM_FILE" "s3://${BACKUP_S3_BUCKET}/${BACKUP_S3_PREFIX}/${CHECKSUM_FILE}" --quiet

log "✓ Uploaded to S3"

# ─────────────────────────────────────────────────────────────────────────────
# Summary
# ─────────────────────────────────────────────────────────────────────────────
log ""
log "═══════════════════════════════════════════════════════════════════"
log "✅ Keycloak export completed successfully"
log "═══════════════════════════════════════════════════════════════════"
log ""
log "Realm: $KEYCLOAK_REALM"
log "Export: s3://${BACKUP_S3_BUCKET}/${BACKUP_S3_PREFIX}/${EXPORT_FILE}"
log ""
log "Note: This export includes realm configuration but not user credentials."
log "      For full user migration, use Keycloak CLI or admin console."
log ""

exit 0

