# Workstream E2: Backups & Restore Drills

Backup and restore procedures for TradeTrackr using IONOS S3-compatible object storage.

## Overview

| Component | Frequency | Script | Timer |
|-----------|-----------|--------|-------|
| PostgreSQL | Nightly | `postgres-backup.sh` | 02:00 |
| Object Storage Inventory | Weekly | `object-storage-inventory.sh` | Sunday 03:00 |
| Keycloak | Monthly | `keycloak-export.sh` | 1st 04:00 |

## Required Environment Variables

Create `/opt/tradetrackr-ops/.env`:

```bash
# Database
DATABASE_URL=postgresql://tradetrackr:password@localhost:5432/tradetrackr

# S3 Storage (for backup destination)
BACKUP_S3_ENDPOINT=https://s3.eu-central-4.ionoscloud.com
BACKUP_S3_REGION=eu-central-4
BACKUP_S3_BUCKET=tradetrackr-backups

# IONOS S3 Credentials
IONOS_S3_ACCESS_KEY_ID=<access-key>
IONOS_S3_SECRET_ACCESS_KEY=<secret-key>

# Attachments bucket (for inventory)
IONOS_S3_ENDPOINT=https://s3.eu-central-2.ionoscloud.com
IONOS_S3_REGION=eu-central-2
IONOS_S3_BUCKET=tradetrackr-files

# Retention Policy
BACKUP_RETENTION_DAYS=14
BACKUP_RETENTION_WEEKS=8
BACKUP_RETENTION_MONTHS=12

# Keycloak (for export)
KEYCLOAK_BASE_URL=https://auth.tradetrackr.de
KEYCLOAK_REALM=tradetrackr
KEYCLOAK_ADMIN_USER=admin
KEYCLOAK_ADMIN_PASSWORD=<admin-password>
```

## Quick Start (Local)

```bash
# Set environment variables
source /path/to/.env

# PostgreSQL backup
npm run backup:pg

# Object storage inventory
npm run backup:inventory

# Keycloak export
npm run backup:keycloak
```

## Manual Backup Commands

### PostgreSQL

```bash
# Run backup manually
source /opt/tradetrackr-ops/.env
/opt/tradetrackr-api/scripts/backup/postgres-backup.sh
```

### Object Storage Inventory

```bash
source /opt/tradetrackr-ops/.env
/opt/tradetrackr-api/scripts/backup/object-storage-inventory.sh
```

### Keycloak

```bash
source /opt/tradetrackr-ops/.env
/opt/tradetrackr-api/scripts/backup/keycloak-export.sh
```

## Verify Uploaded Backups

```bash
# List PostgreSQL backups
aws s3 ls s3://$BACKUP_S3_BUCKET/backups/postgres/daily/ \
  --endpoint-url $BACKUP_S3_ENDPOINT

# List inventory snapshots
aws s3 ls s3://$BACKUP_S3_BUCKET/backups/inventory/ \
  --endpoint-url $BACKUP_S3_ENDPOINT

# List Keycloak exports
aws s3 ls s3://$BACKUP_S3_BUCKET/backups/keycloak/ \
  --endpoint-url $BACKUP_S3_ENDPOINT
```

## VPS Installation

### 1. Create Ops Directory

```bash
sudo mkdir -p /opt/tradetrackr-ops
sudo chown myvps:myvps /opt/tradetrackr-ops
```

### 2. Create Environment File

```bash
sudo nano /opt/tradetrackr-ops/.env
# (paste configuration from above with real values)
sudo chmod 600 /opt/tradetrackr-ops/.env
```

### 3. Clone/Update Repository

```bash
cd /opt
sudo git clone https://github.com/your-org/tradetrackr.git tradetrackr-api
# Or if already exists:
cd /opt/tradetrackr-api && sudo git pull
```

### 4. Make Scripts Executable

```bash
sudo chmod +x /opt/tradetrackr-api/scripts/backup/*.sh
```

### 5. Install Systemd Timers

```bash
# Copy service and timer files
sudo cp /opt/tradetrackr-api/ops/systemd/tradetrackr-backup-*.service /etc/systemd/system/
sudo cp /opt/tradetrackr-api/ops/systemd/tradetrackr-backup-*.timer /etc/systemd/system/

# Reload systemd
sudo systemctl daemon-reload

# Enable and start timers
sudo systemctl enable --now tradetrackr-backup-postgres.timer
sudo systemctl enable --now tradetrackr-backup-inventory.timer
sudo systemctl enable --now tradetrackr-backup-keycloak.timer

# Verify timers are active
sudo systemctl list-timers | grep tradetrackr
```

### Cron Fallback

If systemd timers aren't available, use cron:

```cron
# /etc/cron.d/tradetrackr-backup

# PostgreSQL backup - nightly at 2 AM
0 2 * * * myvps /opt/tradetrackr-api/scripts/backup/postgres-backup.sh >> /var/log/tradetrackr-backup.log 2>&1

# Object storage inventory - weekly on Sunday at 3 AM
0 3 * * 0 myvps /opt/tradetrackr-api/scripts/backup/object-storage-inventory.sh >> /var/log/tradetrackr-backup.log 2>&1

# Keycloak export - monthly on 1st at 4 AM
0 4 1 * * myvps /opt/tradetrackr-api/scripts/backup/keycloak-export.sh >> /var/log/tradetrackr-backup.log 2>&1
```

## Restore Procedures

### PostgreSQL Restore (Staging)

```bash
# 1. Set up target database (NOT production!)
export TARGET_DATABASE_URL="postgresql://user:pass@localhost/tradetrackr_staging"

# 2. Identify backup to restore
aws s3 ls s3://$BACKUP_S3_BUCKET/backups/postgres/daily/ \
  --endpoint-url $BACKUP_S3_ENDPOINT | tail -5

# 3. Set backup key
export BACKUP_OBJECT_KEY="backups/postgres/daily/tradetrackr_pg_20260110_020000.dump"

# 4. Run restore (dry-run first)
DRY_RUN=1 ./scripts/backup/postgres-restore.sh

# 5. Run actual restore
./scripts/backup/postgres-restore.sh
```

### PostgreSQL Restore (Production - Emergency Only)

⚠️ **WARNING**: Only use in disaster recovery scenarios.

```bash
# DANGER: This will overwrite production data!
export FORCE=1
export TARGET_DATABASE_URL="postgresql://...production..."
export BACKUP_OBJECT_KEY="backups/postgres/daily/tradetrackr_pg_YYYYMMDD.dump"

./scripts/backup/postgres-restore.sh
# Type "YES" when prompted
```

## Quarterly Restore Drill Procedure

Perform this drill quarterly to verify backups are restorable.

### 1. Prepare Test Environment

```bash
# Create a test database (NOT production!)
createdb tradetrackr_restore_test

# Set target URL (NOT production!)
export TARGET_DATABASE_URL="postgresql://user:pass@localhost/tradetrackr_restore_test"
```

### 2. Identify Recent Backup

```bash
# List available backups
aws s3 ls s3://$BACKUP_S3_BUCKET/backups/postgres/daily/ \
  --endpoint-url $BACKUP_S3_ENDPOINT | tail -5

# Choose a recent backup
export BACKUP_OBJECT_KEY="backups/postgres/daily/tradetrackr_pg_20260110_020000.dump"
```

### 3. Run Restore

```bash
./scripts/backup/postgres-restore.sh
```

### 4. Verify Data

```bash
# Connect to test database
psql $TARGET_DATABASE_URL

# Verify data
SELECT COUNT(*) FROM doc_store;
SELECT collection, COUNT(*) FROM doc_store GROUP BY collection;
\q
```

### 5. Cleanup

```bash
# Drop test database
dropdb tradetrackr_restore_test
```

### 6. Document Results

Record the following in your ops log:
- Date of drill
- Backup date used
- Restore duration
- Any issues encountered
- Document count verified

## Retention Policy

| Tier | Retention | Folder |
|------|-----------|--------|
| Daily | 14 days | `backups/postgres/daily/` |
| Weekly | 8 weeks | `backups/postgres/weekly/` |
| Monthly | 12 months | `backups/postgres/monthly/` |

Weekly backups are created on Sunday. Monthly backups are created on the 1st of each month.

## Troubleshooting

### Backup Failed: pg_dump not found

```bash
# Install PostgreSQL client
sudo apt install postgresql-client
```

### Backup Failed: aws CLI not found

```bash
# Install AWS CLI
sudo apt install awscli
```

### Backup Failed: jq not found

```bash
# Install jq (for inventory script)
sudo apt install jq
```

### Restore Refused: Production Detected

The restore script detects production hosts and refuses to run without `FORCE=1`. This is a safety feature.

### S3 Upload Failed

Check credentials:
```bash
aws s3 ls s3://$BACKUP_S3_BUCKET/ \
  --endpoint-url $BACKUP_S3_ENDPOINT
```

### Keycloak Export Failed: 401 Unauthorized

Verify admin credentials:
```bash
curl -X POST "$KEYCLOAK_BASE_URL/realms/master/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password" \
  -d "client_id=admin-cli" \
  -d "username=$KEYCLOAK_ADMIN_USER" \
  -d "password=$KEYCLOAK_ADMIN_PASSWORD"
```

## npm Scripts

```bash
# PostgreSQL backup
npm run backup:pg

# Object storage inventory
npm run backup:inventory

# Keycloak export
npm run backup:keycloak

# PostgreSQL restore (requires FORCE=1 for production)
npm run restore:pg
```

## Files

| File | Description |
|------|-------------|
| `scripts/backup/postgres-backup.sh` | PostgreSQL backup script |
| `scripts/backup/postgres-restore.sh` | PostgreSQL restore script |
| `scripts/backup/object-storage-inventory.sh` | Object storage inventory |
| `scripts/backup/keycloak-export.sh` | Keycloak realm export |
| `ops/systemd/tradetrackr-backup-*.service` | Systemd service units |
| `ops/systemd/tradetrackr-backup-*.timer` | Systemd timer units |

