# TradeTrackr Web Portal – Ops Deployment Runbook

## Overview

This document describes how to deploy the TradeTrackr web portal to production.

**Target:** `myvps@85.214.6.74`  
**Web root:** `/var/www/tradetrackr/`  
**Staging dir:** `/home/myvps/dist_new/`

---

## Prerequisites

### 1. SSH Key Access

Ensure you can SSH to the production VPS without a password:

```bash
ssh -o BatchMode=yes myvps@85.214.6.74 "echo ok"
```

If this fails, set up SSH key auth:

```bash
ssh-copy-id myvps@85.214.6.74
```

### 2. Activation Script on Prod (one-time setup)

SSH to the VPS and create the activation script:

```bash
ssh myvps@85.214.6.74
```

Then run:

```bash
sudo tee /usr/local/bin/tradetrackr-activate-web.sh > /dev/null << 'EOF'
#!/usr/bin/env bash
#
# TradeTrackr Web Activation Script
# Syncs staging to webroot and reloads nginx.
#
set -euo pipefail

STAGING_DIR="/home/myvps/dist_new/"
WEB_ROOT="/var/www/tradetrackr/"

# Validate staging exists
if [[ ! -d "$STAGING_DIR" ]]; then
  echo "ERROR: Staging directory not found: $STAGING_DIR"
  exit 1
fi

# Sync staging -> webroot
rsync -a --delete "$STAGING_DIR" "$WEB_ROOT"

# Verify and reload nginx
nginx -t
systemctl reload nginx

echo "Activation complete: $(date -Iseconds)"
EOF

sudo chmod +x /usr/local/bin/tradetrackr-activate-web.sh
```

### 3. Sudoers Entry (one-time setup)

Allow the `myvps` user to run the activation script without a password:

```bash
sudo visudo
```

Add this line at the end:

```
myvps ALL=(ALL) NOPASSWD: /usr/local/bin/tradetrackr-activate-web.sh
```

Save and exit. Verify it works:

```bash
sudo /usr/local/bin/tradetrackr-activate-web.sh
```

---

## Day-to-Day Deployment

### Full Deploy

From the repo root on your local machine:

```bash
./scripts/deploy-web.sh
```

This will:
1. Build the web portal (`npm run build`)
2. Upload `./dist/` to staging on prod
3. SSH and run the activation script (sudo, no password prompt)

### Dry-Run (Preview)

To preview what would be uploaded without making changes:

```bash
./scripts/deploy-web.sh --dry-run
```

### Verify Deployment

After deploying, verify endpoints:

```bash
./scripts/verify-endpoints.sh
```

Expected output:
```
🔍 Verifying TradeTrackr endpoints...

✅ tradetrackr.de: 401
✅ ai-staging.tradetrackr.de/healthz: 200

───────────────────────────────────────
Results: 2 passed, 0 failed
───────────────────────────────────────
✅ All endpoints healthy
```

---

## Troubleshooting

### SSH connection fails

```bash
# Test connectivity
ssh -v myvps@85.214.6.74 "hostname"
```

### Sudo password prompt appears

Ensure the sudoers entry is correct:

```bash
ssh myvps@85.214.6.74 "sudo -l"
```

Should show:
```
(ALL) NOPASSWD: /usr/local/bin/tradetrackr-activate-web.sh
```

### Nginx reload fails

Check nginx config on prod:

```bash
ssh myvps@85.214.6.74 "sudo nginx -t"
```

### AI Gateway returns 403

Your IP may not be in the nginx allowlist. Check:

```bash
curl -s https://ifconfig.me
```

Then add your IP to `/etc/nginx/sites-enabled/*ai-staging*` on prod.

---

## Quick Reference

| Task | Command |
|------|---------|
| Full deploy | `./scripts/deploy-web.sh` |
| Dry-run | `./scripts/deploy-web.sh --dry-run` |
| Verify | `./scripts/verify-endpoints.sh` |
| Check prod nginx | `ssh myvps@85.214.6.74 "sudo nginx -t"` |
| View prod logs | `ssh myvps@85.214.6.74 "sudo journalctl -u nginx -n 50"` |

