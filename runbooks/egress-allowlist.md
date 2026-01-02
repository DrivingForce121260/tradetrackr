# Network Egress Allowlist Runbook

## Overview

This runbook documents the network-level egress controls for TradeTrackr production servers when running in IONOS_ONLY sovereignty mode.

**IMPORTANT**: The app-level `safeFetch` already enforces egress restrictions. Network-level controls are defense-in-depth.

---

## Quick Reference: Go-Live Procedure

### A) BEFORE: Audit Current State

```bash
# On DEV VPS (can SSH to PROD)
ssh myvps@85.214.6.74 'bash -s' < ./scripts/ops/print-egress-state.sh
```

### B) APPLY: Firewall Rules (see detailed sections below)

**Option 1: UFW (Recommended)**
```bash
ssh myvps@85.214.6.74 << 'EOF'
sudo ufw default deny outgoing
sudo ufw allow out 53/udp comment 'DNS'
sudo ufw allow out 53/tcp comment 'DNS'
sudo ufw allow out 123/udp comment 'NTP'
sudo ufw allow out 22/tcp comment 'SSH out'
sudo ufw allow out 443/tcp comment 'HTTPS'
sudo ufw allow out 587/tcp comment 'SMTP'
sudo ufw reload
sudo ufw status verbose
EOF
```

**Option 2: iptables (Alternative)**
```bash
ssh myvps@85.214.6.74 << 'EOF'
# Drop all OUTPUT by default
sudo iptables -P OUTPUT DROP
# Allow established connections
sudo iptables -A OUTPUT -m state --state ESTABLISHED,RELATED -j ACCEPT
# Allow loopback
sudo iptables -A OUTPUT -o lo -j ACCEPT
# Allow DNS
sudo iptables -A OUTPUT -p udp --dport 53 -j ACCEPT
sudo iptables -A OUTPUT -p tcp --dport 53 -j ACCEPT
# Allow NTP
sudo iptables -A OUTPUT -p udp --dport 123 -j ACCEPT
# Allow HTTPS
sudo iptables -A OUTPUT -p tcp --dport 443 -j ACCEPT
# Allow SSH
sudo iptables -A OUTPUT -p tcp --dport 22 -j ACCEPT
# Allow SMTP
sudo iptables -A OUTPUT -p tcp --dport 587 -j ACCEPT
# Persist
sudo iptables-save | sudo tee /etc/iptables.rules
EOF
```

### C) VERIFY: Run Egress Tests

```bash
# Copy and run verification script on PROD
scp ./scripts/ops/egress-verify.sh myvps@85.214.6.74:/tmp/
ssh myvps@85.214.6.74 'chmod +x /tmp/egress-verify.sh && /tmp/egress-verify.sh'
```

Expected output:
- ✅ IONOS AI reachable
- ✅ AI Gateway reachable
- ✅ api.openai.com blocked
- ✅ googleapis.com blocked

### D) ROLLBACK: If Something Breaks

**UFW:**
```bash
ssh myvps@85.214.6.74 'sudo ufw default allow outgoing && sudo ufw reload'
```

**iptables:**
```bash
ssh myvps@85.214.6.74 'sudo iptables -P OUTPUT ACCEPT && sudo iptables -F OUTPUT'
```

---

## Minimal Required Outbound Hosts

### AI Gateway Service

| Host | Port | Purpose |
|------|------|---------|
| `openai.inference.de-txl.ionos.com` | 443 | IONOS AI Model Hub (primary) |
| `openai.inference.de-fra.ionos.com` | 443 | IONOS AI Model Hub (backup) |
| `s3.eu-central-3.ionoscloud.com` | 443 | IONOS Object Storage (if used) |
| `s3.eu-central-4.ionoscloud.com` | 443 | IONOS Object Storage (backup) |

### Web Portal / API

| Host | Port | Purpose |
|------|------|---------|
| `ai.tradetrackr.de` | 443 | Internal AI Gateway |
| `api.tradetrackr.de` | 443 | API endpoint |
| SMTP relay (configured) | 25/587 | Transactional email |

### Firebase Functions (Email Intelligence Exception)

| Host | Port | Purpose |
|------|------|---------|
| `*.googleapis.com` | 443 | Gmail API (mailbox connector only) |
| `graph.microsoft.com` | 443 | M365 API (mailbox connector only) |
| `outlook.office365.com` | 443 | M365 IMAP (mailbox connector only) |
| Customer IMAP servers | 993 | Custom IMAP (mailbox connector only) |

## Explicitly Denied Hosts

These hosts must NEVER be reachable from production (except mailbox connector):

| Pattern | Reason |
|---------|--------|
| `*.google.com` | Non-IONOS infrastructure |
| `*.gstatic.com` | Google static assets |
| `api.openai.com` | Direct OpenAI (use IONOS gateway) |
| `api.anthropic.com` | Anthropic AI |
| `*.cloudflare.com` | CDN (use IONOS) |
| `*.amazonaws.com` | AWS services |

## Detection Scripts

### Check Current State

```bash
# Run from any machine with SSH access to production
./scripts/ops/print-egress-state.sh
```

This script detects:
- UFW rules (if installed)
- iptables OUTPUT chain rules
- nftables rules (if used)
- Docker network policies (if applicable)

### Verify Egress is Blocked

```bash
# Test that Google is unreachable (should timeout/fail)
ssh myvps@85.214.6.74 'curl --connect-timeout 5 https://www.google.com'
# Expected: Connection refused or timeout

# Test that IONOS AI is reachable
ssh myvps@85.214.6.74 'curl --connect-timeout 5 https://openai.inference.de-txl.ionos.com/health'
# Expected: 200 or 404 (endpoint exists)
```

## Implementation Guide (UFW)

**WARNING**: Apply only after confirming SSH access will not be broken.

### Step 1: Pre-checks

```bash
# Ensure SSH is allowed
sudo ufw status
sudo ufw allow 22/tcp comment 'SSH'

# Ensure current session won't be dropped
# Test from a SEPARATE terminal that SSH works
```

### Step 2: Set Default Deny Outbound

```bash
# CAUTION: This will block all outbound by default
sudo ufw default deny outgoing
```

### Step 3: Allow Required Hosts

```bash
# DNS (required for name resolution)
sudo ufw allow out 53/udp comment 'DNS'
sudo ufw allow out 53/tcp comment 'DNS'

# NTP (time sync)
sudo ufw allow out 123/udp comment 'NTP'

# HTTPS to IONOS AI
sudo ufw allow out to any port 443 comment 'HTTPS (filtered by app)'

# SSH outbound (if needed for deployments)
sudo ufw allow out 22/tcp comment 'SSH out'

# SMTP (if sending email)
sudo ufw allow out 25/tcp comment 'SMTP'
sudo ufw allow out 587/tcp comment 'SMTP submission'
```

### Step 4: Reload

```bash
sudo ufw reload
sudo ufw status verbose
```

## Rollback

If something breaks:

```bash
# Immediate rollback
sudo ufw default allow outgoing
sudo ufw reload

# Or disable entirely (emergency)
sudo ufw disable
```

## Monitoring

### Log Blocked Connections

```bash
# Enable logging
sudo ufw logging medium

# View blocked egress
sudo tail -f /var/log/ufw.log | grep '\[UFW BLOCK\].*OUT'
```

### Periodic Audit

Run weekly:

```bash
./scripts/ops/print-egress-state.sh > /var/log/tradetrackr/egress-audit-$(date +%Y%m%d).log
```

## App-Level vs Network-Level

| Layer | Mechanism | Scope |
|-------|-----------|-------|
| **App-Level** | `safeFetch.ts` | All HTTP from Node.js |
| **Network-Level** | UFW/iptables | All TCP/UDP from host |

The app-level check is the primary control. Network-level is defense-in-depth for:
- Compromised dependencies
- Subprocess spawning
- Misconfigured services

## Contact

For questions about egress controls:
- Technical: Development Team
- Security: [Security Contact]

