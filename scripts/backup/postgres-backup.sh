#!/usr/bin/env bash
#
# TradeTrackr PostgreSQL Backup Script
#
# Workstream E2: Creates a timestamped backup of the PostgreSQL database
# and uploads it to IONOS S3-compatible object storage.
#
# Usage:
#   ./scripts/backup/postgres-backup.sh
#   npm run backup:pg
#
# Required Environment Variables:
#   DATABASE_URL          - PostgreSQL connection string
#   BACKUP_S3_ENDPOINT    - S3 endpoint (e.g., https://s3.eu-central-4.ionoscloud.com)
#   BACKUP_S3_REGION      - S3 region (e.g., eu-central-4)
#   BACKUP_S3_BUCKET      - S3 bucket name
#
# Optional Environment Variables:
#   BACKUP_S3_PREFIX           - S3 key prefix (default: backups/postgres)
#   BACKUP_RETENTION_DAYS      - Keep daily backups for N days (default: 14)
#   BACKUP_RETENTION_WEEKS     - Keep weekly backups for N weeks (default: 8)
#   BACKUP_RETENTION_MONTHS    - Keep monthly backups for N months (default: 12)
#   IONOS_S3_ACCESS_KEY_ID     - S3 access key (or AWS_ACCESS_KEY_ID)
#   IONOS_S3_SECRET_ACCESS_KEY - S3 secret key (or AWS_SECRET_ACCESS_KEY)
#
# Exit Codes:
#   0 - Backup completed successfully
#   1 - Backup failed
#
set -euo pipefail

# ─────────────────────────────────────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────────────────────────────────────
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DATE_YYYMMDD=$(date +%Y%m%d)
DAY_OF_WEEK=$(date +%u)  # 1=Monday, 7=Sunday
DAY_OF_MONTH=$(date +%d)

# Required
: "${DATABASE_URL:?DATABASE_URL is required}"
: "${BACKUP_S3_ENDPOINT:?BACKUP_S3_ENDPOINT is required}"
: "${BACKUP_S3_REGION:?BACKUP_S3_REGION is required}"
: "${BACKUP_S3_BUCKET:?BACKUP_S3_BUCKET is required}"

# Optional with defaults
BACKUP_S3_PREFIX="${BACKUP_S3_PREFIX:-backups/postgres}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
BACKUP_RETENTION_WEEKS="${BACKUP_RETENTION_WEEKS:-8}"
BACKUP_RETENTION_MONTHS="${BACKUP_RETENTION_MONTHS:-12}"

# AWS CLI credentials (use IONOS_S3_* if set, else fall back to AWS_*)
export AWS_ACCESS_KEY_ID="${IONOS_S3_ACCESS_KEY_ID:-${AWS_ACCESS_KEY_ID:-}}"
export AWS_SECRET_ACCESS_KEY="${IONOS_S3_SECRET_ACCESS_KEY:-${AWS_SECRET_ACCESS_KEY:-}}"
export AWS_DEFAULT_REGION="$BACKUP_S3_REGION"

# Temp directory
WORK_DIR=$(mktemp -d)
trap 'rm -rf "$WORK_DIR"' EXIT

# File names
DUMP_FILE="tradetrackr_pg_${TIMESTAMP}.dump"
CHECKSUM_FILE="${DUMP_FILE}.sha256"

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
# Pre-flight Checks
# ─────────────────────────────────────────────────────────────────────────────
log "═══════════════════════════════════════════════════════════════════"
log "TradeTrackr PostgreSQL Backup"
log "═══════════════════════════════════════════════════════════════════"
log ""

# Check required tools
for cmd in pg_dump aws sha256sum gzip; do
  if ! command -v "$cmd" &>/dev/null; then
    error "Required command not found: $cmd"
    exit 1
  fi
done

# Verify S3 credentials
if [[ -z "$AWS_ACCESS_KEY_ID" || -z "$AWS_SECRET_ACCESS_KEY" ]]; then
  error "S3 credentials not set. Set IONOS_S3_ACCESS_KEY_ID and IONOS_S3_SECRET_ACCESS_KEY"
  exit 1
fi

# Test S3 connectivity
log "Testing S3 connectivity..."
if ! s3_cmd ls "s3://${BACKUP_S3_BUCKET}/" --max-items 1 &>/dev/null; then
  error "Cannot connect to S3 bucket: ${BACKUP_S3_BUCKET}"
  exit 1
fi
log "✓ S3 connectivity OK"

# ─────────────────────────────────────────────────────────────────────────────
# Create Backup
# ─────────────────────────────────────────────────────────────────────────────
log ""
log "Creating database dump..."

cd "$WORK_DIR"

# pg_dump with custom format (compressed)
if ! pg_dump "$DATABASE_URL" -Fc -f "$DUMP_FILE" 2>/dev/null; then
  error "pg_dump failed"
  exit 1
fi

DUMP_SIZE=$(stat -c%s "$DUMP_FILE" 2>/dev/null || stat -f%z "$DUMP_FILE")
log "✓ Dump created: $DUMP_FILE ($(numfmt --to=iec-i --suffix=B "$DUMP_SIZE" 2>/dev/null || echo "${DUMP_SIZE} bytes"))"

# Create checksum
sha256sum "$DUMP_FILE" > "$CHECKSUM_FILE"
log "✓ Checksum created: $CHECKSUM_FILE"

# ─────────────────────────────────────────────────────────────────────────────
# Upload to S3
# ─────────────────────────────────────────────────────────────────────────────
log ""
log "Uploading to S3..."

# Determine subfolder based on retention tier
# - Daily backups go to daily/
# - Weekly backups (Sunday) also go to weekly/
# - Monthly backups (1st of month) also go to monthly/

DAILY_KEY="${BACKUP_S3_PREFIX}/daily/${DUMP_FILE}"
s3_cmd cp "$DUMP_FILE" "s3://${BACKUP_S3_BUCKET}/${DAILY_KEY}" --quiet
s3_cmd cp "$CHECKSUM_FILE" "s3://${BACKUP_S3_BUCKET}/${DAILY_KEY}.sha256" --quiet
log "✓ Uploaded to daily/"

# Weekly backup (Sunday = 7)
if [[ "$DAY_OF_WEEK" == "7" ]]; then
  WEEKLY_KEY="${BACKUP_S3_PREFIX}/weekly/${DUMP_FILE}"
  s3_cmd cp "$DUMP_FILE" "s3://${BACKUP_S3_BUCKET}/${WEEKLY_KEY}" --quiet
  s3_cmd cp "$CHECKSUM_FILE" "s3://${BACKUP_S3_BUCKET}/${WEEKLY_KEY}.sha256" --quiet
  log "✓ Uploaded to weekly/ (Sunday)"
fi

# Monthly backup (1st of month)
if [[ "$DAY_OF_MONTH" == "01" ]]; then
  MONTHLY_KEY="${BACKUP_S3_PREFIX}/monthly/${DUMP_FILE}"
  s3_cmd cp "$DUMP_FILE" "s3://${BACKUP_S3_BUCKET}/${MONTHLY_KEY}" --quiet
  s3_cmd cp "$CHECKSUM_FILE" "s3://${BACKUP_S3_BUCKET}/${MONTHLY_KEY}.sha256" --quiet
  log "✓ Uploaded to monthly/ (1st of month)"
fi

# ─────────────────────────────────────────────────────────────────────────────
# Apply Retention Policy
# ─────────────────────────────────────────────────────────────────────────────
log ""
log "Applying retention policy..."

apply_retention() {
  local prefix="$1"
  local days="$2"
  local tier="$3"
  
  local cutoff_date=$(date -d "-${days} days" +%Y%m%d 2>/dev/null || date -v-${days}d +%Y%m%d)
  local deleted=0
  
  # List objects and filter by date
  while IFS= read -r line; do
    # Extract filename from line (format: YYYY-MM-DD HH:MM:SS size filename)
    local filename=$(echo "$line" | awk '{print $NF}')
    
    # Extract date from filename (tradetrackr_pg_YYYYMMDD_HHMMSS.dump)
    if [[ "$filename" =~ tradetrackr_pg_([0-9]{8})_ ]]; then
      local file_date="${BASH_REMATCH[1]}"
      
      if [[ "$file_date" < "$cutoff_date" ]]; then
        s3_cmd rm "s3://${BACKUP_S3_BUCKET}/${prefix}/${filename}" --quiet 2>/dev/null || true
        s3_cmd rm "s3://${BACKUP_S3_BUCKET}/${prefix}/${filename}.sha256" --quiet 2>/dev/null || true
        ((deleted++)) || true
      fi
    fi
  done < <(s3_cmd ls "s3://${BACKUP_S3_BUCKET}/${prefix}/" 2>/dev/null | grep "\.dump$" || true)
  
  if [[ $deleted -gt 0 ]]; then
    log "  ${tier}: deleted $deleted old backup(s)"
  else
    log "  ${tier}: no old backups to delete"
  fi
}

# Apply retention to each tier
apply_retention "${BACKUP_S3_PREFIX}/daily" "$BACKUP_RETENTION_DAYS" "daily"

# Weekly retention (convert weeks to days)
WEEKLY_DAYS=$((BACKUP_RETENTION_WEEKS * 7))
apply_retention "${BACKUP_S3_PREFIX}/weekly" "$WEEKLY_DAYS" "weekly"

# Monthly retention (convert months to days, approximate)
MONTHLY_DAYS=$((BACKUP_RETENTION_MONTHS * 30))
apply_retention "${BACKUP_S3_PREFIX}/monthly" "$MONTHLY_DAYS" "monthly"

# ─────────────────────────────────────────────────────────────────────────────
# Summary
# ─────────────────────────────────────────────────────────────────────────────
log ""
log "═══════════════════════════════════════════════════════════════════"
log "✅ Backup completed successfully"
log "═══════════════════════════════════════════════════════════════════"
log ""
log "Backup file: $DUMP_FILE"
log "S3 location: s3://${BACKUP_S3_BUCKET}/${DAILY_KEY}"
log ""

exit 0

