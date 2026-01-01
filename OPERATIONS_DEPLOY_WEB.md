# TradeTrackr Web Portal – Operations Runbook

## Overview

This document describes how to deploy the TradeTrackr web portal from the DEV VPS to PRODUCTION.

## Machines

| Machine | Role | Access |
|---------|------|--------|
| **PC** (Operator) | Triggers deploy via SSH to DEV VPS | SSH to DEV VPS |
| **DEV VPS** | Build + deploy runner | Contains repo at `~/dev/tradetrackr` |
| **PROD VPS** | nginx + `/var/www/tradetrackr` | `myvps@85.214.6.74` |

---

## One-Command Deploy

From the DEV VPS (or via SSH from your PC):

```bash
cd ~/dev/tradetrackr
./scripts/deploy-web.sh
```

This will:
1. Build the web portal (`npm run build`)
2. Write `dist/build-info.json` with commit hash and timestamp
3. Upload `./dist/` to staging on PROD (`/home/myvps/dist_new/`)
4. SSH to PROD and run the activation script (moves staging → webroot, reloads nginx)

### Dry-Run Mode

Preview what would be uploaded without making changes:

```bash
./scripts/deploy-web.sh --dry-run
```

---

## Required Invariants

### 1. DEV → PROD SSH Key Auth

SSH from DEV VPS to PROD VPS must work without password prompts:

```bash
ssh -o BatchMode=yes myvps@85.214.6.74 "echo ok"
```

**Expected:** `ok` (no password prompt)

If this fails, set up SSH keys:
```bash
ssh-keygen -t ed25519  # if no key exists
ssh-copy-id myvps@85.214.6.74
```

### 2. PROD Sudoers Rule

On PROD, the activation script must be runnable without password:

```bash
ssh myvps@85.214.6.74 "sudo -n /usr/local/bin/tradetrackr-activate-web.sh"
```

**Expected:** nginx reload message, no password prompt.

If this fails, add to `/etc/sudoers.d/tradetrackr-deploy` on PROD:
```
myvps ALL=(ALL) NOPASSWD: /usr/local/bin/tradetrackr-activate-web.sh
```

Ensure file permissions are `0440 root:root`.

---

## Verification

### Automated Verification Script

```bash
./scripts/verify-deploy.sh
```

**Expected output:**
```
🔍 Verifying TradeTrackr deployment...

✅ tradetrackr.de: 401
✅ ai-staging.tradetrackr.de/healthz: 200

───────────────────────────────────────
Results: 2 passed, 0 failed
───────────────────────────────────────
✅ All endpoints healthy
```

### Manual Verification

```bash
# Main site (expect 401 - basic auth enabled)
curl -i https://tradetrackr.de/ | head -5

# AI Gateway healthz (expect 200)
curl -i https://ai-staging.tradetrackr.de/healthz
```

### Build Info Check

After deploy, verify the build stamp:
```bash
curl -s https://tradetrackr.de/build-info.json
# Returns: {"commit":"abc1234","builtAt":"2025-12-31T22:12:48Z"}
```

---

## AI Gateway Testing (PowerShell)

When testing AI Gateway POST endpoints from Windows PowerShell, avoid JSON quoting issues:

```powershell
# Build the JSON payload
$body = @{
    subject = "Test Email"
    bodyText = "Dies ist ein Testinhalt."
    sender = "test@example.com"
} | ConvertTo-Json -Compress

# Call the endpoint using curl.exe (not PowerShell's curl alias)
curl.exe -X POST https://ai-staging.tradetrackr.de/ai/summarizeEmail `
  -H "Authorization: Bearer YOUR_TOKEN" `
  -H "Content-Type: application/json" `
  --data-binary $body
```

**Key points:**
- Use `curl.exe` (not the PowerShell `curl` alias)
- Use `ConvertTo-Json -Compress` to avoid multiline issues
- Use `--data-binary` (not `--data-raw`)

---

## Staging Allowlist Note

The AI Gateway staging endpoint (`ai-staging.tradetrackr.de`) has nginx IP allowlisting.

If testing from a remote PC fails with **403 Forbidden**:
1. Your PC's public IP is not in the allowlist
2. Add your IP to `/etc/nginx/sites-enabled/*ai-staging*` on PROD
3. Or test from the PROD VPS itself: `curl http://127.0.0.1:8787/healthz`

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| SSH password prompt | Set up SSH keys (see invariants above) |
| sudo password prompt | Add sudoers NOPASSWD entry on PROD |
| Build fails | Check `npm ci` and TypeScript errors |
| 403 on ai-staging | Add your IP to nginx allowlist on PROD |
| 502 on ai-staging | AI Gateway service not running on PROD |

### Check PROD AI Gateway Status

```bash
ssh myvps@85.214.6.74 "ps aux | grep ai-gateway | grep -v grep"
```

### Restart AI Gateway on PROD

```bash
ssh myvps@85.214.6.74 "sudo systemctl restart tradetrackr-ai-gateway"
```

---

## Quick Reference

| Task | Command |
|------|---------|
| Full deploy | `./scripts/deploy-web.sh` |
| Dry-run | `./scripts/deploy-web.sh --dry-run` |
| Verify | `./scripts/verify-deploy.sh` |
| Check nginx | `ssh myvps@85.214.6.74 "sudo nginx -t"` |
| View nginx logs | `ssh myvps@85.214.6.74 "sudo tail -50 /var/log/nginx/error.log"` |

