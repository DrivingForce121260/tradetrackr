# Keycloak Setup Runbook

## Overview

This runbook documents the deployment and configuration of Keycloak as the identity provider for TradeTrackr (Sovereignty Phase 03).

**Target**: Self-hosted on IONOS VPS (Germany data residency)

---

## Prerequisites

- Docker and Docker Compose installed on VPS
- nginx configured as reverse proxy
- DNS: `auth.tradetrackr.de` pointing to VPS IP
- TLS certificate for `auth.tradetrackr.de`

---

## 1. Initial Deployment

### 1.1 Create Environment File

```bash
cd /opt/tradetrackr/keycloak
cp .env.example .env

# Generate strong passwords
KC_DB_PASSWORD=$(openssl rand -base64 32)
KC_ADMIN_PASSWORD=$(openssl rand -base64 24)

# Edit .env with generated values
nano .env
```

### 1.2 Start Services

```bash
docker-compose up -d

# Check logs
docker-compose logs -f keycloak

# Wait for "Keycloak ... started"
```

### 1.3 Configure nginx

Add to `/etc/nginx/sites-available/auth.tradetrackr.de.conf`:

```nginx
server {
    listen 80;
    server_name auth.tradetrackr.de;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name auth.tradetrackr.de;

    ssl_certificate /etc/letsencrypt/live/auth.tradetrackr.de/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/auth.tradetrackr.de/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;

    # Keycloak proxy
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffer_size 128k;
        proxy_buffers 4 256k;
        proxy_busy_buffers_size 256k;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/auth.tradetrackr.de.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

---

## 2. Realm Configuration

The realm is auto-imported from `realm-tradetrackr.json` on first start.

### 2.1 Verify Import

```bash
curl -sS https://auth.tradetrackr.de/realms/tradetrackr/.well-known/openid-configuration | jq .issuer
# Expected: "https://auth.tradetrackr.de/realms/tradetrackr"
```

### 2.2 Access Admin Console

1. Go to: `https://auth.tradetrackr.de/admin`
2. Login with `KC_ADMIN_USER` / `KC_ADMIN_PASSWORD`
3. Select "tradetrackr" realm

---

## 3. Client Configuration

### 3.1 Web Portal Client

Pre-configured in realm JSON:

| Setting | Value |
|---------|-------|
| Client ID | `tradetrackr-web` |
| Type | Public (PKCE) |
| Redirect URIs | `https://tradetrackr.de/*` |
| Web Origins | `https://tradetrackr.de` |

### 3.2 Mobile Client

Pre-configured in realm JSON:

| Setting | Value |
|---------|-------|
| Client ID | `tradetrackr-mobile` |
| Type | Public (PKCE) |
| Redirect URIs | `tradetrackr://callback` |

### 3.3 API Client

Bearer-only client for token validation:

| Setting | Value |
|---------|-------|
| Client ID | `tradetrackr-api` |
| Type | Confidential / Bearer-only |

---

## 4. Protocol Mappers

### 4.1 tenant_id Claim

Added to access and ID tokens:

```json
{
  "claim.name": "tenant_id",
  "user.attribute": "tenant_id"
}
```

### 4.2 Roles Claim

Realm roles mapped to `roles` claim in tokens.

---

## 5. User Creation

### 5.1 Manual (Admin Console)

1. Users → Add User
2. Set email (username = email)
3. Attributes → Add `tenant_id`
4. Role Mapping → Assign realm roles
5. Credentials → Set Temporary Password

### 5.2 Bulk Import (Script)

```bash
cd /home/david/dev/tradetrackr
node scripts/keycloak/import-users.js --input users.csv
```

See: `runbooks/user-migration.md`

---

## 6. Security Hardening

### 6.1 Brute Force Protection

Pre-configured in realm:
- Max 5 failures before lockout
- 15 minute wait after lockout

### 6.2 Password Policy

Configure in Admin Console → Authentication → Password Policy:
- Minimum length: 12
- Require digit
- Require uppercase
- Require special character

### 6.3 Session Limits

Pre-configured:
- Access token: 5 minutes
- SSO session idle: 30 minutes
- SSO session max: 10 hours

---

## 7. Backup & Recovery

### 7.1 Database Backup

```bash
# Backup
docker exec tradetrackr-keycloak-db pg_dump -U keycloak keycloak > keycloak_backup_$(date +%Y%m%d).sql

# Restore
docker exec -i tradetrackr-keycloak-db psql -U keycloak keycloak < keycloak_backup_20260101.sql
```

### 7.2 Realm Export

```bash
docker exec tradetrackr-keycloak /opt/keycloak/bin/kc.sh export --realm tradetrackr --file /tmp/realm-export.json
docker cp tradetrackr-keycloak:/tmp/realm-export.json ./realm-export-$(date +%Y%m%d).json
```

---

## 8. Troubleshooting

### 8.1 Health Check

```bash
curl -sS http://127.0.0.1:8080/health/ready | jq .
```

### 8.2 Logs

```bash
docker-compose logs -f keycloak
```

### 8.3 Common Issues

| Issue | Solution |
|-------|----------|
| "Database connection refused" | Wait for postgres healthcheck |
| "Hostname mismatch" | Verify `KC_HOSTNAME` matches DNS |
| "PKCE required" | Ensure client uses S256 code challenge |

---

## 9. Rotation

### 9.1 Rotate Admin Password

1. Login to Admin Console
2. Go to master realm → Users
3. Select admin user → Credentials → Reset password

### 9.2 Rotate Signing Keys

1. Realm Settings → Keys
2. Add new RS256 key provider
3. Set priority higher than old key
4. Wait for token expiry
5. Remove old key

---

## 10. Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `KC_DB_PASSWORD` | Yes | PostgreSQL password |
| `KC_ADMIN_PASSWORD` | Yes | Initial admin password |
| `KC_HOSTNAME` | Yes | Public hostname |
| `KC_LOG_LEVEL` | No | Logging level (default: info) |

---

*Runbook created for TradeTrackr Sovereignty Phase 03*

