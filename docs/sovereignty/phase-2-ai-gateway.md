# Phase 2: AI Gateway

This document describes the AI Gateway implementation for TradeTrackr data sovereignty.

## Overview

The AI Gateway is a dedicated HTTP service that routes AI requests to either:
- **MOCK upstream**: Deterministic responses for development/testing
- **IONOS upstream**: IONOS AI Model Hub (Phase 2b, when token available)

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────────┐
│  TradeTrackr    │────▶│  AI Gateway  │────▶│  MOCK/IONOS     │
│  (Frontend/BE)  │     │  (VPS)       │     │  Upstream       │
└─────────────────┘     └──────────────┘     └─────────────────┘
```

## Status

| Component | Status |
|-----------|--------|
| Gateway Service | ✅ Implemented |
| MOCK Upstream | ✅ Implemented |
| IONOS Upstream | 🔜 Phase 2b (waiting for token) |
| AIClient Integration | ✅ Implemented |
| Smoke Tests | ✅ Implemented |

## Quick Start

### 1. Start the Gateway

```bash
cd services/ai-gateway
npm install
npm run dev
```

The gateway starts on `http://localhost:8787`.

### 2. Test the Gateway

```bash
# Health check
curl http://localhost:8787/healthz

# Summarize email (requires auth)
curl -X POST http://localhost:8787/ai/summarizeEmail \
  -H "Authorization: Bearer dev-token" \
  -H "Content-Type: application/json" \
  -d '{"subject": "Test", "bodyText": "Dies ist ein Test"}'
```

### 3. Run Smoke Tests

```bash
node scripts/sovereignty/smoke-ai-gateway.js
```

### 4. Configure TradeTrackr to Use Gateway

Add to your `.env` or environment:

```bash
# Enable gateway
VITE_AI_GATEWAY_URL=http://localhost:8787
VITE_AI_GATEWAY_TOKEN=dev-token
```

## Environment Variables

### Gateway Service

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `AI_GATEWAY_PORT` | No | `8787` | Port to listen on |
| `AI_GATEWAY_TOKEN` | Prod | `dev-token` | Bearer token for authentication |
| `AI_UPSTREAM_MODE` | No | `MOCK` | `MOCK` or `IONOS` |
| `LOG_LEVEL` | No | `info` | `debug`, `info`, `warn`, `error` |
| `NODE_ENV` | No | - | `production` for production mode |

### TradeTrackr Client

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_AI_GATEWAY_URL` | No | - | Gateway URL (enables gateway mode) |
| `VITE_AI_GATEWAY_TOKEN` | No | - | Bearer token for gateway |

## Endpoints

### GET /healthz

Health check - no authentication required.

```bash
curl http://localhost:8787/healthz
```

### POST /ai/summarizeEmail

Analyze and summarize an email.

**Request:**
```json
{
  "subject": "Rechnung Nr. 2025-1234",
  "bodyText": "Anbei unsere Rechnung...",
  "attachments": [
    { "fileName": "rechnung.pdf", "mimeType": "application/pdf" }
  ],
  "language": "de"
}
```

**Response:**
```json
{
  "category": "INVOICE",
  "confidence": 0.85,
  "documentTypes": ["INVOICE"],
  "summaryBullets": [
    "Rechnung erhalten - Prüfung erforderlich",
    "Betreff: Rechnung Nr. 2025-1234..."
  ],
  "priority": "high"
}
```

### POST /ai/draftReply

Generate a reply draft.

**Request:**
```json
{
  "originalSubject": "Anfrage",
  "originalFrom": "kunde@example.com",
  "originalTo": ["info@firma.de"],
  "originalBodyText": "...",
  "tone": "friendly",
  "language": "de"
}
```

**Response:**
```json
{
  "subject": "AW: Anfrage",
  "bodyText": "Herzlichen Dank für Ihre Nachricht...",
  "bodyHtml": "<p>...</p>",
  "to": ["kunde@example.com"],
  "cc": []
}
```

### POST /ai/classifyDocument

Classify a document.

**Request:**
```json
{
  "text": "LIEFERSCHEIN Nr. LS-2025...",
  "filename": "lieferschein.pdf",
  "mimeType": "application/pdf"
}
```

**Response:**
```json
{
  "type": "material.delivery_note",
  "confidence": 0.82,
  "reason": "Schlüsselwort \"lieferschein\" gefunden",
  "model": "mock-classifier-v1"
}
```

## Switching from MOCK to IONOS

When the IONOS AI Model Hub token becomes available:

1. Obtain IONOS API credentials
2. Update environment:
   ```bash
   AI_UPSTREAM_MODE=IONOS
   IONOS_API_KEY=<your-token>
   ```
3. Restart the gateway

**No code changes required** - just environment variables.

## Security Notes

### ⚠️ Production Deployment

The gateway should **NOT** be exposed directly to the internet. Deploy behind:

1. **Nginx reverse proxy** with TLS
2. **Rate limiting**
3. **IP allowlisting** (if possible)

Example nginx config:

```nginx
server {
    listen 443 ssl;
    server_name ai-gateway.internal.tradetrackr.de;
    
    ssl_certificate /etc/ssl/certs/...;
    ssl_certificate_key /etc/ssl/private/...;
    
    location / {
        proxy_pass http://localhost:8787;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        
        # Rate limiting
        limit_req zone=ai_limit burst=10;
    }
}
```

### Token Security

- Use a strong, randomly generated token in production
- Rotate tokens periodically
- Never commit tokens to version control

## Logging

The gateway uses **safe logging** - no request/response content is logged.

Only logged:
- Request ID
- Tenant ID (if provided)
- Endpoint path
- Status code
- Duration (ms)
- Upstream mode (MOCK/IONOS)

## AIClient Behavior

| `AI_GATEWAY_URL` | `SOVEREIGNTY_MODE` | Behavior |
|------------------|-------------------|----------|
| Not set | OFF | Fallback/placeholder responses |
| Not set | IONOS_ONLY | ❌ Error: Gateway not configured |
| Set | OFF | ✅ Routes to gateway |
| Set | IONOS_ONLY | ✅ Routes to gateway |

## Docker Deployment

```bash
# Build
cd services/ai-gateway
docker build -t tradetrackr/ai-gateway .

# Run
docker run -p 8787:8787 \
  -e AI_GATEWAY_TOKEN=<secret> \
  -e AI_UPSTREAM_MODE=MOCK \
  -e NODE_ENV=production \
  tradetrackr/ai-gateway
```

## Troubleshooting

### Gateway not responding

```bash
# Check if running
curl http://localhost:8787/healthz

# Check logs
cd services/ai-gateway && npm run dev
```

### 401 Unauthorized

- Check `AI_GATEWAY_TOKEN` matches on client and server
- In dev mode, any non-empty token is accepted

### IONOS upstream not ready

Currently returns 501 - waiting for Phase 2b token.

## Files

| Path | Description |
|------|-------------|
| `services/ai-gateway/` | Gateway service |
| `src/services/ai/aiClient.ts` | AIClient with gateway support |
| `scripts/sovereignty/smoke-ai-gateway.js` | Smoke tests |

## Next Steps (Phase 2b)

When IONOS token is available:

1. Implement IONOS upstream in `services/ai-gateway/src/ionos/`
2. Add IONOS API client
3. Map request/response schemas to IONOS format
4. Test with real IONOS endpoints
5. Update smoke tests

## See Also

- `/docs/sovereignty/definition.md` - Sovereignty specification
- `/services/ai-gateway/README.md` - Gateway README
- `/src/services/ai/` - AIClient implementation

