# TradeTrackr Data Sovereignty Definition

## A) Purpose: Sovereignty Mode (IONOS_ONLY)

TradeTrackr supports a **Sovereignty Mode** (`IONOS_ONLY`) designed to ensure that all data processing, storage, AI inference, and logging occurs exclusively within IONOS Germany infrastructure. This mode is intended for customers with strict data residency requirements under German/EU law.

When `SOVEREIGNTY_MODE=IONOS_ONLY` is enabled:
- No customer data leaves German data centers (IONOS)
- No direct calls to US-based cloud providers for processing/storage
- All AI inference is routed through an internal AI Gateway hosted in Germany
- Logging contains only IDs/hashes, never raw customer content

---

## B) In-Scope: What Must Be IONOS-Only

When Sovereignty Mode is enabled, the following services **MUST** run exclusively on IONOS Germany infrastructure:

| Service Category | Requirement |
|------------------|-------------|
| **Database** | PostgreSQL on IONOS (not Firebase/Firestore) |
| **Object Storage** | IONOS S3-compatible storage (Germany region) |
| **AI/LLM Inference** | Internal AI Gateway (proxying to approved models) |
| **Backend Compute** | IONOS Cloud VMs or containers |
| **Logging/Telemetry** | Self-hosted or IONOS-based (no Google Analytics, Crashlytics) |
| **Authentication** | Self-hosted auth or IONOS-compatible IdP |

---

## C) Out-of-Scope: Truth-in-Advertising Exceptions

The following are explicitly **out of scope** for sovereignty guarantees because they involve customer-controlled upstream systems:

### 1. Customer's Upstream Mailbox Host
- **Gmail, Microsoft 365, IMAP servers** – TradeTrackr connects to the customer's chosen email provider
- This is unavoidable: we cannot control where the customer hosts their email
- **Mitigation**: Only the mailbox connector module may communicate with these providers

### 2. Mobile Push Infrastructure
- **Apple Push Notification Service (APNs)** and **Firebase Cloud Messaging (FCM)** are required for mobile push notifications
- **Mitigation**: Push payloads must contain **only IDs/references**, never customer content
- The actual data is fetched from IONOS-hosted backend after the push wakes the app

---

## D) Explicit Exception: Mailbox Connector Module

### Allowed Path
```
functions/src/emailIntelligence/**
```

### What This Exception Covers
The mailbox connector module is **explicitly permitted** to:
- Communicate with Google APIs (Gmail API)
- Communicate with Microsoft Graph API (M365)
- Connect to arbitrary IMAP/SMTP servers
- Store OAuth tokens for upstream providers

### Why This Exception Exists
TradeTrackr's email intelligence feature must connect to wherever the customer hosts their email. This is a customer-controlled choice, not a TradeTrackr infrastructure decision.

### Constraints on the Exception
- The connector may **fetch** emails from upstream providers
- The connector must **immediately process and store** email content in IONOS infrastructure
- No raw email content may be logged to external services
- OAuth tokens must be stored encrypted in IONOS-hosted database

---

## E) Acceptance Criteria (Hard, Testable)

### E.1 No Outbound Calls to Forbidden Domains
**Condition**: In production with `SOVEREIGNTY_MODE=IONOS_ONLY`

**Test**: No outbound network calls to the following domains from any code path **EXCEPT** `functions/src/emailIntelligence/**`:
- `*.googleapis.com` (except Gmail API in connector)
- `*.firebaseio.com`
- `*.firebase.com`
- `*.crashlytics.com`
- `*.google-analytics.com`
- `generativelanguage.googleapis.com`
- `api.openai.com`
- `api.anthropic.com`

### E.2 No Firebase/Google Keys in Frontend
**Condition**: Production frontend build with `SOVEREIGNTY_MODE=IONOS_ONLY`

**Test**: The following must NOT be present in built frontend assets:
- Firebase API keys
- Firebase project IDs
- Google Cloud service account keys
- Any `GOOGLE_*` or `FIREBASE_*` environment variables

### E.3 AI Calls Routed via Internal Gateway
**Condition**: `SOVEREIGNTY_MODE=IONOS_ONLY`

**Test**: All LLM/AI inference calls must be routed through:
```
https://ai-gateway.internal.tradetrackr.de/v1/*
```
Direct calls to OpenAI, Anthropic, or Google AI endpoints are forbidden.

### E.4 Object Storage Germany-Only
**Condition**: `SOVEREIGNTY_MODE=IONOS_ONLY`

**Test**: All object storage buckets must be in Germany regions:
- IONOS S3: `de-fra1`, `de-txl1`
- No Firebase Storage, no GCS buckets

### E.5 No Raw Content in Logs
**Condition**: `SOVEREIGNTY_MODE=IONOS_ONLY`

**Test**: Production logs must not contain:
- Email body text
- Customer names or addresses
- Document content
- Only IDs, hashes, and metadata are permitted

---

## F) Enforcement Mechanisms

### F.1 CI Banned-Domain Scan
- **Script**: `/scripts/sovereignty/check-banned-strings.js`
- **Behavior**: Scans source files for forbidden domain patterns
- **Exception**: Files in `functions/src/emailIntelligence/**` are allowed
- **Mode**: 
  - `SOVEREIGNTY_SCAN_MODE=warn` (default) – prints findings, exits 0
  - `SOVEREIGNTY_SCAN_MODE=error` – exits 1 if findings exist
- **Integration**: GitHub Actions workflow on PR and push to main

### F.2 Runtime Assertion Gate
- **Module**: `/src/config/sovereigntyGate.ts`
- **Behavior**: At server startup, asserts that forbidden environment variables are not set when `SOVEREIGNTY_MODE=IONOS_ONLY`
- **Blocked Variables**: `FIREBASE_*`, `GOOGLE_*`, `GCP_*`, `OPENAI_API_KEY`, `GEMINI_API_KEY`, `ANTHROPIC_API_KEY`
- **Bypass**: Disabled in test mode (`NODE_ENV=test`)

### F.3 Central Provider Policy
- **Module**: `/src/config/providerPolicy.ts`
- **Purpose**: Single source of truth for:
  - Current sovereignty mode
  - Allowed/banned domain patterns
  - Exception paths for mailbox connector
- **Usage**: All sovereignty checks reference this policy

---

## G) Migration Phases

| Phase | Description | Status |
|-------|-------------|--------|
| **Phase 0** | Definition, CI gate, runtime assertion | ✅ Complete |
| **Phase 1** | Safe logging, AIClient abstraction, fixtures | ✅ Complete |
| **Phase 2** | AI Gateway (MOCK), frontend secret removal, egress control | ✅ Complete |
| **Phase 2b** | AI Gateway IONOS integration (waiting for token) | ⏳ Pending Token |
| **Phase 3** | Firebase Auth → Keycloak (OIDC) migration | 🔄 In Progress |
| **Phase 4** | PostgreSQL migration (Firestore → Postgres on IONOS) | ⏳ Planned |
| **Phase 5** | Object storage migration (Firebase Storage → IONOS S3) | ⏳ Planned |
| **Phase 6** | Full IONOS_ONLY validation & go-live | ⏳ Planned |

### Evidence Report

See [EVIDENCE.md](./EVIDENCE.md) for Phase 02 completion details.

---

## H) Glossary

| Term | Definition |
|------|------------|
| **IONOS_ONLY** | Sovereignty mode where all TradeTrackr infrastructure runs on IONOS Germany |
| **Mailbox Connector** | Module that connects to customer's email provider (Gmail, M365, IMAP) |
| **AI Gateway** | Internal proxy that routes AI requests to approved LLM providers |
| **Upstream Provider** | Customer's chosen email/cloud provider (not TradeTrackr's choice) |

---

## I) Contact

For questions about data sovereignty:
- Technical: Development Team
- Legal/Compliance: [Compliance Contact]
- Customer Inquiries: Support Team

