# Workstream E3: Monitoring & Sovereignty Drift Detection

Real-time monitoring and detection of any egress to non-sovereign endpoints.

## Overview

TradeTrackr uses a strict egress allowlist to ensure all outbound connections go only to IONOS infrastructure and our own services. This document covers:

1. **Egress Allowlist** - Approved outbound hosts
2. **Egress Snapshot Tool** - Connection monitoring
3. **Health Endpoint Enrichment** - Sovereignty status in API
4. **Journald Configuration** - Log retention

## Egress Allowlist

The allowlist file defines all permitted outbound connections:

```bash
cat ops/egress-allowlist.txt
```

### Allowed Hosts

| Category | Hosts |
|----------|-------|
| **IONOS AI** | `openai.inference.de-txl.ionos.com`, `openai.inference.de-fra.ionos.com` |
| **IONOS S3** | `s3.eu-central-2.ionoscloud.com`, `s3.eu-central-4.ionoscloud.com` |
| **TradeTrackr** | `auth.tradetrackr.de`, `api.tradetrackr.de`, `ai.tradetrackr.de` |

### Adding New Hosts

If a legitimate new host needs to be added:

1. Create a ticket documenting the requirement
2. Verify the host is IONOS/EU-only infrastructure
3. Add to `ops/egress-allowlist.txt`
4. Commit and deploy

## Egress Snapshot Tool

The egress snapshot tool captures current outbound connections and validates them against the allowlist.

### Running Manually

```bash
# Run snapshot
./tools/ops/egress-snapshot.sh

# Run and upload report to S3
./tools/ops/egress-snapshot.sh --upload
```

### Output

The tool produces a timestamped report in `tools/ops/out/`:

```
═══════════════════════════════════════════════════════════════════
TradeTrackr Egress Snapshot
═══════════════════════════════════════════════════════════════════

Timestamp: 2026-01-10T14:30:00+00:00
Hostname: vps-tradetrackr

───────────────────────────────────────────────────────────────────
Established Connections
───────────────────────────────────────────────────────────────────

  ✓ s3.eu-central-2.ionoscloud.com:443
  ✓ openai.inference.de-txl.ionos.com:443
  ✓ auth.tradetrackr.de:443

───────────────────────────────────────────────────────────────────
Summary
───────────────────────────────────────────────────────────────────

Total connections: 3
Allowed: 3
Unknown: 0

═══════════════════════════════════════════════════════════════════
✅ EGRESS CHECK PASSED
```

### When Unknown Hosts Are Detected

If the tool detects connections to hosts not in the allowlist:

1. **Investigate immediately** - Determine what process is making the connection
2. **Check for compromise** - Verify it's not a security incident
3. **If legitimate** - Add to allowlist with ticket reference
4. **If unauthorized** - Block and investigate further

## Health Endpoint Enrichment

The API health endpoint includes sovereignty information:

```bash
curl https://api.tradetrackr.de/healthz | jq
```

Response:
```json
{
  "ok": true,
  "version": "2.0.0",
  "uptime": 86400,
  "timestamp": "2026-01-10T14:30:00.000Z",
  "auth": "keycloak",
  "database": "postgresql",
  "sovereignty": "strict",
  "firestoreDisabled": true,
  "objectStorageHost": "s3.eu-central-2.ionoscloud.com",
  "objectStorageConfigured": true,
  "aiProvider": "ionos",
  "aiBaseHost": "openai.inference.de-txl.ionos.com",
  "aiSovereignty": "strict",
  "aiConfigured": true
}
```

### Sovereignty Fields

| Field | Description |
|-------|-------------|
| `sovereignty` | Mode: "strict" or "default" |
| `firestoreDisabled` | true if Firestore is blocked |
| `objectStorageHost` | Hostname only (no secrets) |
| `aiProvider` | "ionos" or "none" |
| `aiBaseHost` | AI endpoint hostname only |
| `aiSovereignty` | AI mode: "strict" or "default" |

## Journald Configuration

### Recommended Settings

Create `/etc/systemd/journald.conf.d/tradetrackr.conf`:

```ini
[Journal]
# Keep logs for 30 days
MaxRetentionSec=30day

# Limit total size to 2GB
SystemMaxUse=2G

# Limit individual file size
SystemMaxFileSize=100M

# Compress logs
Compress=yes

# Forward to syslog if needed
ForwardToSyslog=no
```

Apply the configuration:

```bash
sudo systemctl restart systemd-journald
```

### Viewing Logs

```bash
# TradeTrackr API logs
sudo journalctl -u tradetrackr-api -f

# Backup service logs
sudo journalctl -u tradetrackr-backup-postgres -n 50

# All TradeTrackr services
sudo journalctl -u 'tradetrackr-*' --since "1 hour ago"
```

## Alerting (Future)

Planned alerting integrations:

1. **Unknown egress detected** → Alert via webhook
2. **Health check failed** → Alert via monitoring
3. **Backup failed** → Alert via email

## Files

| File | Description |
|------|-------------|
| `ops/egress-allowlist.txt` | Allowed outbound hosts |
| `tools/ops/egress-snapshot.sh` | Connection snapshot tool |
| `tools/ops/out/` | Snapshot reports |
| `scripts/ops/egress-verify.sh` | Egress verification test |

## Troubleshooting

### "Unknown host detected: xyz.com"

1. Check what process owns the connection:
   ```bash
   sudo ss -tpn | grep xyz.com
   ```

2. If it's a system process (apt, systemd), it may be normal
3. If it's node/nginx, investigate the code path

### Health endpoint missing sovereignty fields

1. Verify API version supports the fields
2. Check if SOVEREIGNTY_MODE is set:
   ```bash
   sudo systemctl show tradetrackr-api -p Environment
   ```

### Journald filling disk

1. Check current usage:
   ```bash
   journalctl --disk-usage
   ```

2. Vacuum old logs:
   ```bash
   sudo journalctl --vacuum-time=7d
   ```

