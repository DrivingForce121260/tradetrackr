#!/usr/bin/env bash
#
# TradeTrackr Egress Snapshot Tool
#
# Workstream E3: Captures current outbound connections and compares
# against the egress allowlist for sovereignty drift detection.
#
# Usage:
#   ./tools/ops/egress-snapshot.sh
#   ./tools/ops/egress-snapshot.sh --upload   # Also upload report to S3
#
# Optional Environment Variables:
#   BACKUP_S3_ENDPOINT    - S3 endpoint (for --upload)
#   BACKUP_S3_BUCKET      - S3 bucket name
#   BACKUP_S3_PREFIX      - S3 prefix (default: reports/egress)
#
# Exit Codes:
#   0 - All connections are in allowlist
#   1 - Unknown/forbidden connections detected
#   2 - Script error
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Configuration
ALLOWLIST_FILE="$REPO_ROOT/ops/egress-allowlist.txt"
OUTPUT_DIR="$SCRIPT_DIR/out"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_FILE="$OUTPUT_DIR/egress_${TIMESTAMP}.txt"
UPLOAD_REPORT=false

# Parse arguments
if [[ "${1:-}" == "--upload" ]]; then
  UPLOAD_REPORT=true
fi

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
# Functions
# ─────────────────────────────────────────────────────────────────────────────
log() {
  echo "[$(date -Iseconds)] $*"
}

error() {
  echo "[$(date -Iseconds)] ERROR: $*" >&2
}

# Load allowlist into array
load_allowlist() {
  local -n arr=$1
  while IFS= read -r line; do
    # Skip comments and blank lines
    [[ "$line" =~ ^[[:space:]]*# ]] && continue
    [[ -z "${line// }" ]] && continue
    arr+=("$line")
  done < "$ALLOWLIST_FILE"
}

# Check if a host matches the allowlist
is_allowed() {
  local host="$1"
  local -n allowlist=$2
  
  for allowed in "${allowlist[@]}"; do
    # Exact match
    if [[ "$host" == "$allowed" ]]; then
      return 0
    fi
    # Subdomain match (e.g., *.ionoscloud.com)
    if [[ "$host" == *".$allowed" ]]; then
      return 0
    fi
  done
  
  return 1
}

# Resolve IP to hostname (best effort)
resolve_ip() {
  local ip="$1"
  local hostname
  
  # Try reverse DNS lookup
  hostname=$(host "$ip" 2>/dev/null | awk '/domain name pointer/ {print $NF}' | sed 's/\.$//' || echo "")
  
  if [[ -n "$hostname" ]]; then
    echo "$hostname"
  else
    echo "$ip"
  fi
}

# ─────────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────────
mkdir -p "$OUTPUT_DIR"

{
  echo "═══════════════════════════════════════════════════════════════════"
  echo "TradeTrackr Egress Snapshot"
  echo "═══════════════════════════════════════════════════════════════════"
  echo ""
  echo "Timestamp: $(date -Iseconds)"
  echo "Hostname: $(hostname)"
  echo ""
} | tee "$REPORT_FILE"

# Load allowlist
declare -a ALLOWED_HOSTS
if [[ -f "$ALLOWLIST_FILE" ]]; then
  load_allowlist ALLOWED_HOSTS
  log "Loaded ${#ALLOWED_HOSTS[@]} entries from allowlist"
else
  error "Allowlist not found: $ALLOWLIST_FILE"
  exit 2
fi

# Collect established connections
log "Collecting established connections..."
echo "" >> "$REPORT_FILE"
echo "───────────────────────────────────────────────────────────────────" >> "$REPORT_FILE"
echo "Established Connections" >> "$REPORT_FILE"
echo "───────────────────────────────────────────────────────────────────" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

declare -A CONNECTIONS
UNKNOWN_COUNT=0
ALLOWED_COUNT=0

# Get connections for node processes
while IFS= read -r line; do
  # Extract remote IP:port (format: peer:[[::ffff:1.2.3.4]:443])
  if [[ "$line" =~ peer:\[\[([^\]]+)\]:([0-9]+)\] ]]; then
    ip="${BASH_REMATCH[1]}"
    port="${BASH_REMATCH[2]}"
    
    # Clean up IPv4-mapped IPv6 addresses
    ip="${ip#::ffff:}"
    
    # Skip localhost
    [[ "$ip" == "127.0.0.1" || "$ip" == "::1" ]] && continue
    
    # Try to resolve hostname
    hostname=$(resolve_ip "$ip")
    
    # Store unique connections
    key="${hostname}:${port}"
    CONNECTIONS["$key"]=1
  fi
done < <(ss -tpn state established 2>/dev/null | grep -E "node|nginx" || true)

# Also check direct ss output format
while IFS= read -r line; do
  # Extract peer address (different format)
  if [[ "$line" =~ ([0-9]+\.[0-9]+\.[0-9]+\.[0-9]+):([0-9]+)[[:space:]] ]]; then
    ip="${BASH_REMATCH[1]}"
    port="${BASH_REMATCH[2]}"
    
    # Skip localhost and private ranges for peer
    [[ "$ip" == "127."* ]] && continue
    [[ "$ip" == "10."* ]] && continue
    [[ "$ip" == "192.168."* ]] && continue
    
    hostname=$(resolve_ip "$ip")
    key="${hostname}:${port}"
    CONNECTIONS["$key"]=1
  fi
done < <(ss -tpn state established 2>/dev/null || true)

# Analyze connections
declare -a UNKNOWN_HOSTS

for conn in "${!CONNECTIONS[@]}"; do
  host="${conn%:*}"
  port="${conn#*:}"
  
  if is_allowed "$host" ALLOWED_HOSTS; then
    printf "  ${GREEN}✓${NC} %s:%s\n" "$host" "$port" | tee -a "$REPORT_FILE"
    ((ALLOWED_COUNT++))
  else
    printf "  ${RED}✗${NC} %s:%s (UNKNOWN)\n" "$host" "$port" | tee -a "$REPORT_FILE"
    UNKNOWN_HOSTS+=("$host")
    ((UNKNOWN_COUNT++))
  fi
done

if [[ ${#CONNECTIONS[@]} -eq 0 ]]; then
  echo "  (no established outbound connections)" | tee -a "$REPORT_FILE"
fi

# ─────────────────────────────────────────────────────────────────────────────
# Summary
# ─────────────────────────────────────────────────────────────────────────────
{
  echo ""
  echo "───────────────────────────────────────────────────────────────────"
  echo "Summary"
  echo "───────────────────────────────────────────────────────────────────"
  echo ""
  echo "Total connections: ${#CONNECTIONS[@]}"
  echo "Allowed: $ALLOWED_COUNT"
  echo "Unknown: $UNKNOWN_COUNT"
  echo ""
} | tee -a "$REPORT_FILE"

# Upload report if requested
if [[ "$UPLOAD_REPORT" == "true" && -n "${BACKUP_S3_ENDPOINT:-}" ]]; then
  log "Uploading report to S3..."
  
  BACKUP_S3_PREFIX="${BACKUP_S3_PREFIX:-reports/egress}"
  
  if aws s3 cp "$REPORT_FILE" \
    "s3://${BACKUP_S3_BUCKET}/${BACKUP_S3_PREFIX}/$(basename "$REPORT_FILE")" \
    --endpoint-url "$BACKUP_S3_ENDPOINT" \
    --quiet 2>/dev/null; then
    log "✓ Report uploaded"
  else
    error "Failed to upload report"
  fi
fi

# Final result
echo "═══════════════════════════════════════════════════════════════════" | tee -a "$REPORT_FILE"

if [[ $UNKNOWN_COUNT -gt 0 ]]; then
  echo -e "${RED}❌ EGRESS CHECK FAILED${NC}" | tee -a "$REPORT_FILE"
  echo "" | tee -a "$REPORT_FILE"
  echo "Unknown hosts detected:" | tee -a "$REPORT_FILE"
  for host in "${UNKNOWN_HOSTS[@]}"; do
    echo "  - $host" | tee -a "$REPORT_FILE"
  done
  echo "" | tee -a "$REPORT_FILE"
  echo "Action required:" | tee -a "$REPORT_FILE"
  echo "  1. Investigate the source of these connections" | tee -a "$REPORT_FILE"
  echo "  2. If legitimate, add to ops/egress-allowlist.txt" | tee -a "$REPORT_FILE"
  echo "  3. If unauthorized, investigate and block" | tee -a "$REPORT_FILE"
  echo "" | tee -a "$REPORT_FILE"
  echo "Report saved: $REPORT_FILE" | tee -a "$REPORT_FILE"
  exit 1
fi

echo -e "${GREEN}✅ EGRESS CHECK PASSED${NC}" | tee -a "$REPORT_FILE"
echo "" | tee -a "$REPORT_FILE"
echo "All outbound connections are in the allowlist." | tee -a "$REPORT_FILE"
echo "Report saved: $REPORT_FILE"
exit 0

