# Workstream E1: Release Gate

Pre-release verification gate that ensures all sovereignty and safety checks pass before deployment.

## Overview

The release gate runs a series of automated checks:

1. **Sovereignty Scan** - Scans source code for banned provider references
2. **No-Google-Ever** - Strict check for any Google/Firebase/OpenAI dependencies
3. **AI Gateway Smoke Test** - Verifies AI endpoint connectivity
4. **Secrets Check** - Ensures no secrets are bundled in dist/
5. **Storage Smoke Test** - Verifies object storage connectivity

## Quick Start

```bash
# Set the test token (see "How to Get a Token" below)
export TRADETRACKR_TEST_TOKEN='eyJ...'

# Run the release gate
./scripts/release-gate.sh

# Or via npm
npm run release:gate
```

## Required Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `TRADETRACKR_TEST_TOKEN` | Keycloak JWT for smoke tests | Yes |

## How to Get a Token

1. Open https://tradetrackr.de in your browser
2. Log in with your account
3. Open Developer Tools (F12)
4. Go to the **Network** tab
5. Click on any API request (e.g., to `/api/v1/...`)
6. Find the **Authorization** header in the request headers
7. Copy the value after `Bearer ` (the JWT token)

```bash
# Example
export TRADETRACKR_TEST_TOKEN='eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...'
```

**Note:** Tokens expire after a certain time (typically 1 hour). Get a fresh token if tests fail with 401 errors.

## CI Integration

The release gate runs automatically on every push and PR to `main`:

```yaml
# .github/workflows/sovereignty-gate.yml
- name: Run Release Gate
  env:
    TRADETRACKR_TEST_TOKEN: ${{ secrets.TRADETRACKR_TEST_TOKEN }}
  run: bash scripts/release-gate.sh
```

## Deploy Enforcement

The deploy script (`scripts/deploy-web.sh`) automatically runs the release gate before deploying:

```bash
# This will run release-gate.sh first
./scripts/deploy-web.sh
```

If the gate fails, deployment is aborted.

## Common Failure Modes

### "TRADETRACKR_TEST_TOKEN is not set"

**Cause:** The environment variable is missing or empty.

**Fix:**
```bash
export TRADETRACKR_TEST_TOKEN='eyJ...'
```

### "Token does not appear to be a JWT"

**Cause:** The token value is malformed.

**Fix:** Make sure you copied only the token, not the "Bearer " prefix.

### "sovereignty:scan failed"

**Cause:** New banned provider references detected in source code.

**Fix:**
1. Run `npm run sovereignty:scan` to see details
2. Remove or migrate the offending code
3. If intentional (e.g., documentation), update the baseline:
   ```bash
   npm run sovereignty:baseline
   ```

### "sovereignty:never-google failed"

**Cause:** Firebase/Google/OpenAI dependencies found in package.json or source.

**Fix:**
1. Run `npm run sovereignty:never-google` to see details
2. Remove the dependency from package.json
3. Remove any import or endpoint references from source code

### "Check no secrets in dist failed"

**Cause:** Secrets or tokens found in the production build.

**Fix:**
1. Run `./scripts/check-no-secrets-in-dist.sh` to see details
2. Ensure secrets are only in `.env` files, not hardcoded
3. Rebuild: `npm run build`

## Running Individual Checks

```bash
# Sovereignty scan only
npm run sovereignty:scan

# No-Google-Ever check only
npm run sovereignty:never-google

# Secrets check only (requires dist/)
npm run build
./scripts/check-no-secrets-in-dist.sh

# AI Gateway smoke test
node scripts/sovereignty/smoke-ai-gateway.js
```

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | All checks passed |
| 1 | One or more checks failed |

## Files

| File | Description |
|------|-------------|
| `scripts/release-gate.sh` | Main release gate script |
| `scripts/no-google-ever.sh` | Decommission hardening check |
| `.github/workflows/sovereignty-gate.yml` | CI workflow |
| `scripts/deploy-web.sh` | Deploy script (runs gate first) |

