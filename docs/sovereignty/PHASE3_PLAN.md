# TradeTrackr Sovereignty Phase 03 - Firebase Auth → Keycloak Migration

**Status**: 🔄 In Progress  
**Created**: 2026-01-01

---

## 1. Current State Audit

### 1.1 Authentication Stack

| Component | Current Implementation | Location |
|-----------|----------------------|----------|
| **Web Login** | Firebase Auth (`signInWithEmailAndPassword`) | `src/contexts/AuthContext.tsx` |
| **Token Storage** | Firebase User + Zustand store | `src/store/authStore.ts` |
| **API Auth** | Firebase Admin `verifyIdToken` | `functions/src/api/index.ts` |
| **Session Management** | Custom Firestore-based | `src/services/sessionService.ts` |

### 1.2 Firebase Auth Entry Points

```
src/contexts/AuthContext.tsx
├── signInWithEmailAndPassword (line 3)
├── signOut (line 4)
├── onAuthStateChanged (line 5)
├── createUserWithEmailAndPassword (line 7)
└── updateProfile (line 8)

src/store/authStore.ts
├── signInWithEmailAndPassword (line 10)
├── signOut (line 10)
└── sendPasswordResetEmail (line 10)

src/config/firebase.ts
└── Firebase app initialization + auth export

functions/src/api/index.ts
└── admin.auth().verifyIdToken (line 16)
```

### 1.3 Token Shape (Current: Firebase ID Token)

```json
{
  "iss": "https://securetoken.google.com/[project-id]",
  "aud": "[project-id]",
  "sub": "[firebase-uid]",
  "email": "user@example.com",
  "email_verified": true,
  "user_id": "[firebase-uid]"
}
```

### 1.4 Tenancy Model

| Field | Location | Purpose |
|-------|----------|---------|
| `concernID` | User document in Firestore | Multi-tenant isolation key |
| `role` | User document | Role-based access (admin, manager, employee, etc.) |

**Current enforcement**: After Firebase auth, user document is fetched from Firestore to get `concernID`. All data queries filter by `concernID`.

---

## 2. Target State (Keycloak OIDC)

### 2.1 Token Shape (Target: Keycloak JWT)

```json
{
  "iss": "https://auth.tradetrackr.de/realms/tradetrackr",
  "aud": ["tradetrackr-web", "tradetrackr-api"],
  "sub": "[keycloak-user-id]",
  "email": "user@example.com",
  "email_verified": true,
  "tenant_id": "[concernID]",
  "roles": ["admin", "staff"],
  "preferred_username": "user@example.com"
}
```

### 2.2 Architecture

```
┌─────────────────┐    OIDC PKCE     ┌─────────────────┐
│   Web Portal    │ ◄─────────────►  │    Keycloak     │
└────────┬────────┘                  │  (IONOS Docker) │
         │                           └─────────────────┘
         │ Bearer JWT                        ▲
         ▼                                   │
┌─────────────────┐                          │
│   API Gateway   │ ──── JWKS Validation ────┘
│  (Cloud Funcs)  │
└─────────────────┘
```

### 2.3 Keycloak Clients

| Client ID | Type | Grant Type | Purpose |
|-----------|------|------------|---------|
| `tradetrackr-web` | Public | Authorization Code + PKCE | Web portal |
| `tradetrackr-mobile` | Public | Authorization Code + PKCE | Mobile app |
| `tradetrackr-api` | Confidential | Client Credentials | Service-to-service |

---

## 3. Implementation Plan

### 3.1 Phase 3A: Keycloak Infrastructure

- [ ] Create `infra/keycloak/docker-compose.yml`
- [ ] Create `infra/keycloak/realm-tradetrackr.json`
- [ ] Create `runbooks/keycloak-setup.md`

### 3.2 Phase 3B: API JWT Middleware

- [ ] Create `src/lib/auth/keycloak-jwt.ts` (JWKS verification)
- [ ] Create `src/lib/auth/tenant-guard.ts` (tenant isolation)
- [ ] Update `functions/src/api/index.ts` to use new middleware
- [ ] Add unit tests

### 3.3 Phase 3C: Web OIDC Integration

- [ ] Add `oidc-client-ts` dependency
- [ ] Create `src/lib/auth/oidc-client.ts`
- [ ] Update `AuthContext` to use OIDC
- [ ] Update `authStore` to use OIDC
- [ ] Remove Firebase Auth imports
- [ ] Update env vars

### 3.4 Phase 3D: User Migration

- [ ] Create `scripts/keycloak/import-users.ts`
- [ ] Create `runbooks/user-migration.md`
- [ ] Test migration with sample users

### 3.5 Phase 3E: CI/Sovereignty Gates

- [ ] Update `scripts/ci/check-banned-strings.sh` for Firebase Auth
- [ ] Add `sovereignty:phase3:verify` npm script
- [ ] Update EVIDENCE.md

---

## 4. Environment Variables

### 4.1 Frontend (`.env.production`)

```bash
# OIDC Configuration
VITE_OIDC_AUTHORITY=https://auth.tradetrackr.de/realms/tradetrackr
VITE_OIDC_CLIENT_ID=tradetrackr-web
VITE_OIDC_REDIRECT_URI=https://tradetrackr.de/callback
VITE_OIDC_POST_LOGOUT_REDIRECT_URI=https://tradetrackr.de

# API
VITE_API_BASE_URL=https://api.tradetrackr.de

# AI Gateway (unchanged from Phase 02)
VITE_AI_GATEWAY_URL=https://ai.tradetrackr.de
```

### 4.2 Backend / API

```bash
# Keycloak JWKS
KEYCLOAK_ISSUER=https://auth.tradetrackr.de/realms/tradetrackr
KEYCLOAK_JWKS_URI=https://auth.tradetrackr.de/realms/tradetrackr/protocol/openid-connect/certs
KEYCLOAK_AUDIENCE=tradetrackr-api
```

---

## 5. Rollback Plan

If Phase 3 fails:

1. Revert code changes (git)
2. Keep Firebase Auth enabled in parallel during rollout
3. Feature flag: `AUTH_PROVIDER=firebase|keycloak`
4. Users continue with Firebase until stable

---

## 6. Acceptance Criteria

| ID | Criterion | Test |
|----|-----------|------|
| P3-A | No Firebase Auth in prod code | `rg "firebase/auth\|FirebaseAuth\|verifyIdToken" src/` returns empty |
| P3-B | Web uses OIDC PKCE | Login redirects to Keycloak |
| P3-C | API validates Keycloak JWT | Requests with Firebase token return 401 |
| P3-D | tenant_id enforced | API rejects requests without tenant_id claim |
| P3-E | User migration works | Script imports users, forces password reset |

---

## 7. Timeline

| Week | Milestone |
|------|-----------|
| W1 | Keycloak deployment + realm setup |
| W2 | API middleware + tests |
| W3 | Web OIDC integration |
| W4 | User migration + go-live |

---

*Document created as part of TradeTrackr Sovereignty Phase 03*

