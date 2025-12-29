# TradeTrackr AI Gateway

HTTP service that routes AI requests to IONOS AI Model Hub or returns MOCK responses.

## Quick Start

```bash
# Install dependencies
cd services/ai-gateway
npm install

# Development (with hot reload)
npm run dev

# Production
npm run build
npm start
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `AI_GATEWAY_PORT` | No | `8787` | Port to listen on |
| `AI_GATEWAY_TOKEN` | Prod only | `dev-token` | Bearer token for auth |
| `AI_UPSTREAM_MODE` | No | `MOCK` | `MOCK` or `IONOS` |
| `LOG_LEVEL` | No | `info` | `debug`, `info`, `warn`, `error` |
| `NODE_ENV` | No | - | `production` for prod mode |

## Endpoints

### GET /healthz

Health check - no authentication required.

```bash
curl http://localhost:8787/healthz
```

Response:
```json
{
  "ok": true,
  "mode": "MOCK",
  "version": "1.0.0",
  "timestamp": "2025-12-28T12:00:00.000Z"
}
```

### POST /ai/summarizeEmail

Analyze and summarize an email.

```bash
curl -X POST http://localhost:8787/ai/summarizeEmail \
  -H "Authorization: Bearer dev-token" \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Rechnung Nr. 2025-1234",
    "bodyText": "Anbei erhalten Sie unsere Rechnung über 1.500 EUR..."
  }'
```

Response:
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

Generate a reply draft for an email.

```bash
curl -X POST http://localhost:8787/ai/draftReply \
  -H "Authorization: Bearer dev-token" \
  -H "Content-Type: application/json" \
  -d '{
    "originalSubject": "Anfrage Elektroinstallation",
    "originalFrom": "kunde@example.com",
    "originalTo": ["info@firma.de"],
    "originalBodyText": "Wir benötigen ein Angebot...",
    "tone": "friendly",
    "language": "de"
  }'
```

Response:
```json
{
  "subject": "AW: Anfrage Elektroinstallation",
  "bodyText": "Herzlichen Dank für Ihre Nachricht!...",
  "bodyHtml": "<p>Herzlichen Dank...</p>",
  "to": ["kunde@example.com"],
  "cc": []
}
```

### POST /ai/classifyDocument

Classify a document based on its text content.

```bash
curl -X POST http://localhost:8787/ai/classifyDocument \
  -H "Authorization: Bearer dev-token" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "LIEFERSCHEIN Nr. LS-2025-4567...",
    "filename": "lieferschein.pdf"
  }'
```

Response:
```json
{
  "type": "material.delivery_note",
  "confidence": 0.82,
  "reason": "Schlüsselwort \"lieferschein\" gefunden",
  "model": "mock-classifier-v1"
}
```

## Authentication

All endpoints except `/healthz` require a Bearer token:

```
Authorization: Bearer <AI_GATEWAY_TOKEN>
```

In development (`NODE_ENV` not set to `production`), any non-empty token is accepted.

## Switching from MOCK to IONOS

When the IONOS AI Model Hub token is available (Phase 2b):

1. Set `AI_UPSTREAM_MODE=IONOS`
2. Add `IONOS_API_KEY=<your-token>`
3. Restart the gateway

No code changes required - just environment variables.

## Security Notes

⚠️ **Do NOT expose this gateway to the public internet without:**
- TLS termination (via Nginx or similar)
- Rate limiting
- IP allowlisting (if possible)

The gateway is designed to be called by TradeTrackr backend only.

## Logging

The gateway uses safe logging - **no request/response content is logged**.

Only logged:
- Request ID
- Tenant ID (if provided)
- Endpoint path
- Status code
- Duration (ms)

## Development

```bash
# Type check
npm run typecheck

# Build
npm run build

# Run tests (when added)
npm test
```

## Docker

```bash
# Build image
docker build -t tradetrackr/ai-gateway .

# Run
docker run -p 8787:8787 \
  -e AI_GATEWAY_TOKEN=<secret> \
  -e AI_UPSTREAM_MODE=MOCK \
  tradetrackr/ai-gateway
```

## See Also

- `/docs/sovereignty/phase-2-ai-gateway.md` - Full Phase 2 documentation
- `/src/services/ai/` - TradeTrackr AI client
- `/docs/sovereignty/definition.md` - Sovereignty specification

