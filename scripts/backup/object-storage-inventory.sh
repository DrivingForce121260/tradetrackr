#!/usr/bin/env bash
#
# TradeTrackr Object Storage Inventory Script
#
# Workstream E2: Creates an inventory snapshot of all objects in the
# attachments bucket and uploads it to the backup bucket.
#
# Usage:
#   ./scripts/backup/object-storage-inventory.sh
#   npm run backup:inventory
#
# Required Environment Variables:
#   IONOS_S3_ENDPOINT     - S3 endpoint for attachments bucket
#   IONOS_S3_REGION       - S3 region
#   IONOS_S3_BUCKET       - Attachments bucket name
#   BACKUP_S3_ENDPOINT    - S3 endpoint for backup bucket
#   BACKUP_S3_BUCKET      - Backup bucket name
#
# Optional Environment Variables:
#   IONOS_S3_ACCESS_KEY_ID     - S3 access key
#   IONOS_S3_SECRET_ACCESS_KEY - S3 secret key
#   INVENTORY_PREFIX           - Prefix to inventory (default: tenants/)
#   BACKUP_S3_PREFIX           - Backup prefix (default: backups/inventory)
#
# Exit Codes:
#   0 - Inventory completed successfully
#   1 - Inventory failed
#
set -euo pipefail

# ─────────────────────────────────────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────────────────────────────────────
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Required
: "${IONOS_S3_ENDPOINT:?IONOS_S3_ENDPOINT is required}"
: "${IONOS_S3_REGION:?IONOS_S3_REGION is required}"
: "${IONOS_S3_BUCKET:?IONOS_S3_BUCKET is required}"
: "${BACKUP_S3_ENDPOINT:?BACKUP_S3_ENDPOINT is required}"
: "${BACKUP_S3_BUCKET:?BACKUP_S3_BUCKET is required}"

# Optional with defaults
INVENTORY_PREFIX="${INVENTORY_PREFIX:-tenants/}"
BACKUP_S3_PREFIX="${BACKUP_S3_PREFIX:-backups/inventory}"

# AWS CLI credentials
export AWS_ACCESS_KEY_ID="${IONOS_S3_ACCESS_KEY_ID:-${AWS_ACCESS_KEY_ID:-}}"
export AWS_SECRET_ACCESS_KEY="${IONOS_S3_SECRET_ACCESS_KEY:-${AWS_SECRET_ACCESS_KEY:-}}"
export AWS_DEFAULT_REGION="$IONOS_S3_REGION"

# Temp directory
WORK_DIR=$(mktemp -d)
trap 'rm -rf "$WORK_DIR"' EXIT

# File names
INVENTORY_FILE="inventory_${TIMESTAMP}.jsonl"
CHECKSUM_FILE="${INVENTORY_FILE}.sha256"
SUMMARY_FILE="inventory_${TIMESTAMP}.summary.txt"

# ─────────────────────────────────────────────────────────────────────────────
# Functions
# ─────────────────────────────────────────────────────────────────────────────
log() {
  echo "[$(date -Iseconds)] $*"
}

error() {
  echo "[$(date -Iseconds)] ERROR: $*" >&2
}

# S3 command for source bucket
s3_source() {
  aws s3api "$@" --endpoint-url "$IONOS_S3_ENDPOINT"
}

# S3 command for backup bucket
s3_backup() {
  aws s3 "$@" --endpoint-url "$BACKUP_S3_ENDPOINT"
}

# ─────────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────────
log "═══════════════════════════════════════════════════════════════════"
log "TradeTrackr Object Storage Inventory"
log "═══════════════════════════════════════════════════════════════════"
log ""

# Check required tools
for cmd in aws sha256sum jq; do
  if ! command -v "$cmd" &>/dev/null; then
    error "Required command not found: $cmd"
    exit 1
  fi
done

# Verify credentials
if [[ -z "$AWS_ACCESS_KEY_ID" || -z "$AWS_SECRET_ACCESS_KEY" ]]; then
  error "S3 credentials not set"
  exit 1
fi

cd "$WORK_DIR"

log "Source bucket: s3://${IONOS_S3_BUCKET}/${INVENTORY_PREFIX}"
log "Backup bucket: s3://${BACKUP_S3_BUCKET}/${BACKUP_S3_PREFIX}/"
log ""

# ─────────────────────────────────────────────────────────────────────────────
# Create Inventory
# ─────────────────────────────────────────────────────────────────────────────
log "Creating inventory..."

OBJECT_COUNT=0
TOTAL_SIZE=0
CONTINUATION_TOKEN=""

# Use pagination to handle large buckets
while true; do
  # Build list-objects-v2 command
  CMD_ARGS=(
    --bucket "$IONOS_S3_BUCKET"
    --prefix "$INVENTORY_PREFIX"
    --max-keys 1000
  )
  
  if [[ -n "$CONTINUATION_TOKEN" ]]; then
    CMD_ARGS+=(--continuation-token "$CONTINUATION_TOKEN")
  fi
  
  # List objects
  RESPONSE=$(s3_source list-objects-v2 "${CMD_ARGS[@]}" 2>/dev/null || echo '{"Contents":[]}')
  
  # Extract objects and write to JSONL
  echo "$RESPONSE" | jq -c '.Contents[]? | {
    key: .Key,
    size: .Size,
    lastModified: .LastModified,
    etag: .ETag,
    storageClass: .StorageClass
  }' >> "$INVENTORY_FILE" 2>/dev/null || true
  
  # Count objects in this batch
  BATCH_COUNT=$(echo "$RESPONSE" | jq '.Contents | length // 0')
  BATCH_SIZE=$(echo "$RESPONSE" | jq '[.Contents[]?.Size // 0] | add // 0')
  
  OBJECT_COUNT=$((OBJECT_COUNT + BATCH_COUNT))
  TOTAL_SIZE=$((TOTAL_SIZE + BATCH_SIZE))
  
  # Check for more pages
  IS_TRUNCATED=$(echo "$RESPONSE" | jq -r '.IsTruncated // false')
  if [[ "$IS_TRUNCATED" == "true" ]]; then
    CONTINUATION_TOKEN=$(echo "$RESPONSE" | jq -r '.NextContinuationToken // empty')
    if [[ -z "$CONTINUATION_TOKEN" ]]; then
      break
    fi
    log "  Fetched $OBJECT_COUNT objects so far..."
  else
    break
  fi
done

log "✓ Inventory created: $OBJECT_COUNT objects"

# Create checksum
sha256sum "$INVENTORY_FILE" > "$CHECKSUM_FILE"
log "✓ Checksum created"

# Create summary
{
  echo "TradeTrackr Object Storage Inventory"
  echo "====================================="
  echo ""
  echo "Timestamp: $(date -Iseconds)"
  echo "Source Bucket: $IONOS_S3_BUCKET"
  echo "Prefix: $INVENTORY_PREFIX"
  echo ""
  echo "Statistics:"
  echo "  Total Objects: $OBJECT_COUNT"
  echo "  Total Size: $(numfmt --to=iec-i --suffix=B "$TOTAL_SIZE" 2>/dev/null || echo "$TOTAL_SIZE bytes")"
  echo ""
  
  if [[ $OBJECT_COUNT -gt 0 ]]; then
    echo "Objects by Tenant:"
    # Extract tenant IDs and count
    jq -r '.key' "$INVENTORY_FILE" 2>/dev/null | \
      grep -oP 'tenants/\K[^/]+' | \
      sort | uniq -c | sort -rn | head -20 | \
      while read count tenant; do
        echo "  $tenant: $count"
      done
    echo ""
    
    echo "File Types:"
    jq -r '.key' "$INVENTORY_FILE" 2>/dev/null | \
      grep -oP '\.[^./]+$' | \
      sort | uniq -c | sort -rn | head -10 | \
      while read count ext; do
        echo "  $ext: $count"
      done
  fi
} > "$SUMMARY_FILE"

log "✓ Summary created"

# ─────────────────────────────────────────────────────────────────────────────
# Upload to Backup Bucket
# ─────────────────────────────────────────────────────────────────────────────
log ""
log "Uploading to backup bucket..."

s3_backup cp "$INVENTORY_FILE" "s3://${BACKUP_S3_BUCKET}/${BACKUP_S3_PREFIX}/${INVENTORY_FILE}" --quiet
s3_backup cp "$CHECKSUM_FILE" "s3://${BACKUP_S3_BUCKET}/${BACKUP_S3_PREFIX}/${CHECKSUM_FILE}" --quiet
s3_backup cp "$SUMMARY_FILE" "s3://${BACKUP_S3_BUCKET}/${BACKUP_S3_PREFIX}/${SUMMARY_FILE}" --quiet

log "✓ Uploaded inventory files"

# ─────────────────────────────────────────────────────────────────────────────
# Summary
# ─────────────────────────────────────────────────────────────────────────────
log ""
log "═══════════════════════════════════════════════════════════════════"
log "✅ Inventory completed successfully"
log "═══════════════════════════════════════════════════════════════════"
log ""
log "Objects inventoried: $OBJECT_COUNT"
log "Total size: $(numfmt --to=iec-i --suffix=B "$TOTAL_SIZE" 2>/dev/null || echo "$TOTAL_SIZE bytes")"
log "Inventory: s3://${BACKUP_S3_BUCKET}/${BACKUP_S3_PREFIX}/${INVENTORY_FILE}"
log ""

exit 0

