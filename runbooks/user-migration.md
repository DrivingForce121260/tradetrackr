# User Migration Runbook: Firebase Auth → Keycloak

## Overview

This runbook describes the process for migrating users from Firebase Authentication to Keycloak as part of Sovereignty Phase 03.

**IMPORTANT**: Passwords are NOT migrated. Users will set new passwords on first login.

---

## Prerequisites

1. Keycloak is deployed and running (see `runbooks/keycloak-setup.md`)
2. Realm `tradetrackr` is configured
3. Admin credentials available
4. User export from Firebase/Firestore

---

## 1. Export Users from Firestore

### 1.1 Export Script

Run from Firebase admin environment:

```bash
firebase login
firebase use production

# Export users collection
firebase firestore:export --collection=users --output=users-export.json
```

### 1.2 Transform to Import Format

The import script expects:

**CSV format:**
```csv
email,tenant_id,roles
admin@company.de,DE1234567890,admin
user@company.de,DE1234567890,staff
```

**JSON format:**
```json
[
  {
    "email": "admin@company.de",
    "tenant_id": "DE1234567890",
    "roles": ["admin"],
    "firstName": "Max",
    "lastName": "Mustermann"
  }
]
```

### 1.3 Transform Firestore Export

```typescript
// scripts/transform-users.ts
import { readFileSync, writeFileSync } from 'fs';

const data = JSON.parse(readFileSync('users-export.json', 'utf8'));

const users = data.map((doc: any) => ({
  email: doc.email,
  tenant_id: doc.concernID,
  roles: [doc.role || 'staff'],
  firstName: doc.vorname,
  lastName: doc.nachname,
}));

writeFileSync('users-import.json', JSON.stringify(users, null, 2));
console.log(`Transformed ${users.length} users`);
```

---

## 2. Dry Run

Always run in dry-run mode first:

```bash
cd /home/david/dev/tradetrackr

npx tsx scripts/keycloak/import-users.ts --input users-import.json --dry-run
```

Review the output:
- Correct number of users?
- Tenant IDs look correct?
- Roles assigned properly?

---

## 3. Import Users

### 3.1 Set Environment Variables

```bash
export KEYCLOAK_BASE_URL=https://auth.tradetrackr.de
export KEYCLOAK_REALM=tradetrackr
export KEYCLOAK_ADMIN_USER=admin
export KEYCLOAK_ADMIN_PASSWORD=<admin-password>
```

### 3.2 Run Import

```bash
npx tsx scripts/keycloak/import-users.ts --input users-import.json
```

### 3.3 Verify

```bash
# Check user count in Keycloak
curl -s -H "Authorization: Bearer $TOKEN" \
  "https://auth.tradetrackr.de/admin/realms/tradetrackr/users/count"
```

---

## 4. User Communication

### 4.1 Email Template (German)

```
Betreff: TradeTrackr - Neues Anmeldeverfahren

Sehr geehrte/r [Name],

wir haben unser Anmeldeverfahren auf ein sichereres System umgestellt.

Bitte setzen Sie bei Ihrer nächsten Anmeldung ein neues Passwort:

1. Gehen Sie zu https://tradetrackr.de
2. Klicken Sie auf "Anmelden"
3. Geben Sie Ihre E-Mail-Adresse ein: [email]
4. Klicken Sie auf "Passwort vergessen"
5. Folgen Sie den Anweisungen in der E-Mail

Bei Fragen stehen wir Ihnen gerne zur Verfügung.

Mit freundlichen Grüßen
Ihr TradeTrackr Team
```

### 4.2 Send Notification

Configure Keycloak SMTP settings, then use:

```bash
# Trigger password reset email for all imported users
for user_id in $(curl -s -H "Authorization: Bearer $TOKEN" \
  "https://auth.tradetrackr.de/admin/realms/tradetrackr/users" | jq -r '.[].id'); do
  curl -X PUT -H "Authorization: Bearer $TOKEN" \
    "https://auth.tradetrackr.de/admin/realms/tradetrackr/users/$user_id/execute-actions-email" \
    -H "Content-Type: application/json" \
    -d '["UPDATE_PASSWORD"]'
done
```

---

## 5. Rollback

If migration fails:

1. **Keep Firebase Auth enabled** during transition period
2. Feature flag in app: `AUTH_PROVIDER=firebase|keycloak`
3. Users can continue using Firebase until Keycloak is stable

### 5.1 Delete Imported Users (if needed)

```bash
# WARNING: This deletes all users from Keycloak!
# Only use if migration needs to be completely reverted.

for user_id in $(curl -s -H "Authorization: Bearer $TOKEN" \
  "https://auth.tradetrackr.de/admin/realms/tradetrackr/users" | jq -r '.[].id'); do
  curl -X DELETE -H "Authorization: Bearer $TOKEN" \
    "https://auth.tradetrackr.de/admin/realms/tradetrackr/users/$user_id"
done
```

---

## 6. Verification Checklist

| Check | Command | Expected |
|-------|---------|----------|
| Users created | Count users in Keycloak | Matches Firestore count |
| Attributes set | Check user in admin console | tenant_id present |
| Roles assigned | Check user roles | Correct roles |
| Login works | Test login flow | Redirect to password reset |

---

## 7. Timeline

| Phase | Duration | Activity |
|-------|----------|----------|
| Day 1 | 2h | Export + transform users |
| Day 1 | 1h | Dry run + review |
| Day 2 | 1h | Production import |
| Day 2 | 2h | User notifications |
| Week 1-2 | - | Support period |
| Week 3 | - | Disable Firebase Auth |

---

## 8. Troubleshooting

### 8.1 Import Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "User already exists" | Re-run import | Script is idempotent, will update |
| "Authentication failed" | Wrong credentials | Check KEYCLOAK_ADMIN_PASSWORD |
| "Role not found" | Role missing in realm | Import realm JSON first |

### 8.2 Login Issues

| Issue | Check | Fix |
|-------|-------|-----|
| "Invalid redirect URI" | Client config | Add URI to allowed list |
| "User not found" | Import logs | Re-run import |
| "No tenant_id" | User attributes | Manually add in admin console |

---

*Runbook created for TradeTrackr Sovereignty Phase 03*

