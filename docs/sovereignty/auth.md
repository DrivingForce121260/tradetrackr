# TradeTrackr Authentication - Keycloak OIDC

## Overview

TradeTrackr uses Keycloak as the identity provider for all authentication, replacing Firebase Auth as part of Sovereignty Phase 03.

**Authentication Flow**: Authorization Code + PKCE (for web and mobile)

---

## Token Claims

### Access Token

| Claim | Type | Description |
|-------|------|-------------|
| `iss` | string | Keycloak issuer URL |
| `sub` | string | User ID (Keycloak subject) |
| `aud` | string[] | Audience (client IDs) |
| `exp` | number | Expiration timestamp |
| `email` | string | User email address |
| `email_verified` | boolean | Email verification status |
| `tenant_id` | string | **Mandanten-ID (concernID)** |
| `roles` | string[] | Assigned realm roles |
| `preferred_username` | string | Username (email) |
| `azp` | string | Authorized party (client ID) |

### Example Token Payload

```json
{
  "iss": "https://auth.tradetrackr.de/realms/tradetrackr",
  "sub": "abc123-def456-ghi789",
  "aud": ["tradetrackr-web", "tradetrackr-api"],
  "exp": 1704067200,
  "email": "user@company.de",
  "email_verified": true,
  "tenant_id": "DE1234567890",
  "roles": ["admin", "staff"],
  "preferred_username": "user@company.de",
  "azp": "tradetrackr-web"
}
```

---

## Tenant Isolation

### Critical Requirement

Every API request **MUST** include a valid `tenant_id` claim. Requests without tenant_id are rejected with 401.

### Enforcement

```typescript
// Example middleware usage
import { keycloakAuthMiddleware, assertTenantAccess } from '@/lib/auth/keycloak-jwt';

app.get('/api/v1/projects', keycloakAuthMiddleware(), async (req, res) => {
  const user = req.user;
  
  // All queries MUST filter by tenant
  const projects = await db.collection('projects')
    .where('tenantId', '==', user.tenantId)
    .get();
  
  res.json({ projects });
});
```

### Cross-Tenant Access (Admin Only)

Super-admin users may access multiple tenants. This requires:
1. `super_admin` role
2. Explicit tenant ID in request header: `X-Tenant-ID`
3. Audit logging for cross-tenant access

---

## API Authentication

### Request Format

```http
GET /api/v1/projects HTTP/1.1
Host: api.tradetrackr.de
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Error Responses

| Status | Error | Description |
|--------|-------|-------------|
| 401 | `Token fehlt` | No Authorization header |
| 401 | `Sitzung abgelaufen` | Token expired |
| 401 | `Ungültiges Token` | Signature verification failed |
| 403 | `Kein Mandant zugewiesen` | Missing tenant_id claim |
| 403 | `Falscher Mandant` | Tenant mismatch |

---

## Roles

### Realm Roles

| Role | Description |
|------|-------------|
| `admin` | Full access to all features |
| `manager` | Team management, reports |
| `staff` | Regular employee access |
| `accounting` | Financial features |
| `office` | Back-office operations |
| `technician` | Field service access |

### Role Checking

```typescript
import { hasAnyRole, assertRole } from '@/lib/auth/keycloak-jwt';

// Check
if (hasAnyRole(user, ['admin', 'manager'])) {
  // Allow action
}

// Assert (throws on failure)
assertRole(user, ['admin']); // Throws if not admin
```

---

## JWKS Verification

### Configuration

| Variable | Value |
|----------|-------|
| `KEYCLOAK_ISSUER` | `https://auth.tradetrackr.de/realms/tradetrackr` |
| `KEYCLOAK_JWKS_URI` | `https://auth.tradetrackr.de/realms/tradetrackr/protocol/openid-connect/certs` |
| `KEYCLOAK_AUDIENCE` | `tradetrackr-api` |

### Key Rotation

JWKS is cached with automatic refresh. When Keycloak rotates keys:
1. New key is published to JWKS endpoint
2. jose library automatically fetches new keys
3. Old tokens remain valid until expiry

---

## Web Client (OIDC PKCE)

### Configuration

```env
VITE_OIDC_AUTHORITY=https://auth.tradetrackr.de/realms/tradetrackr
VITE_OIDC_CLIENT_ID=tradetrackr-web
VITE_OIDC_REDIRECT_URI=https://tradetrackr.de/callback
VITE_OIDC_POST_LOGOUT_REDIRECT_URI=https://tradetrackr.de
```

### Usage

```typescript
import { login, logout, getUser, getAccessToken } from '@/lib/auth/oidc-client';

// Login (redirects to Keycloak)
await login();

// Get current user
const user = await getUser();
console.log(user?.tenantId);

// Get token for API calls
const token = await getAccessToken();

// Logout (redirects to Keycloak)
await logout();
```

---

## Mobile Client

### Flutter/React Native

Use standard OIDC PKCE libraries:
- Flutter: `flutter_appauth`
- React Native: `react-native-app-auth`

### Redirect URIs

```
tradetrackr://callback
com.tradetrackr.app://callback
```

### Secure Storage

Store tokens in:
- iOS: Keychain
- Android: EncryptedSharedPreferences

---

## Security Considerations

### Token Storage

| Platform | Storage | Security |
|----------|---------|----------|
| Web | sessionStorage | Cleared on tab close |
| Mobile | Keychain/Keystore | Hardware-backed |

### Token Lifetime

| Token | Lifetime | Refresh |
|-------|----------|---------|
| Access | 5 minutes | Silent refresh |
| Refresh | 30 minutes | User re-auth |
| SSO Session | 10 hours | Max lifetime |

### PKCE

PKCE (S256) is **required** for all public clients. This prevents authorization code interception attacks.

---

## Migration from Firebase Auth

### Differences

| Aspect | Firebase Auth | Keycloak |
|--------|--------------|----------|
| Token issuer | `securetoken.google.com` | `auth.tradetrackr.de/realms/tradetrackr` |
| Token format | Custom Firebase token | Standard JWT |
| Tenant claim | Not in token (Firestore) | `tenant_id` in token |
| Verification | Firebase Admin SDK | Standard JWKS |

### Cutover Plan

1. Import users to Keycloak (forced password reset)
2. Deploy Keycloak auth code
3. Notify users of password reset
4. Remove Firebase Auth code
5. Update sovereignty scanner baseline

---

*Documentation for TradeTrackr Sovereignty Phase 03*

