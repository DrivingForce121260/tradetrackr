# TradeTrackr Cloud Functions

Backend-Services für das TradeTrackr-Ökosystem (Portal + Field App).

## Endpoints

### `/ai/support` - AI Assistant

**Method:** POST  
**Auth:** Firebase ID Token (Bearer)

KI-Assistenz für Monteure. Nutzt Firestore-Kontext für intelligente Antworten.

**Request:**
```json
{
  "tenantId": "tenant-123",
  "userId": "user-456",
  "projectId": "project-789",
  "taskId": "task-abc",
  "message": "Wie funktioniert die Elektroinstallation?",
  "attachments": []
}
```

**Response:**
```json
{
  "id": "ai-msg-123",
  "role": "assistant",
  "content": "Die Elektroinstallation erfolgt in drei Schritten...",
  "context": {
    "projectId": "project-789",
    "taskId": "task-abc"
  },
  "createdAt": {
    "seconds": 1234567890,
    "nanoseconds": 0
  }
}
```

## Setup

### 1. Install Dependencies

```bash
cd functions
npm install
```

### 2. Configure Environment

```bash
# Set environment variables for your LLM provider
firebase functions:config:set openai.api_key="sk-..."
# or
firebase functions:config:set anthropic.api_key="sk-ant-..."
```

### 3. Deploy

```bash
# Deploy all functions
npm run deploy

# Deploy only AI function
firebase deploy --only functions:ai
```

## Local Development

### Run Emulators

```bash
# From project root
firebase emulators:start

# Or from functions directory
npm run serve
```

Emulator UI: http://localhost:4000

### Test AI Endpoint Locally

```bash
curl -X POST http://localhost:5001/YOUR_PROJECT/us-central1/ai/support \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "test-tenant",
    "userId": "test-user",
    "message": "Test message"
  }'
```

## LLM Provider Integration

### OpenAI (Recommended)

```typescript
// In src/aiSupport.ts, replace the callLLM function:

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function callLLM(message: string, context: any): Promise<string> {
  const systemPrompt = `Du bist ein hilfreicher KI-Assistent für Monteure...`;
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: message },
    ],
  });
  
  return response.choices[0].message.content || '';
}
```

### Anthropic Claude

```typescript
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function callLLM(message: string, context: any): Promise<string> {
  const response = await anthropic.messages.create({
    model: 'claude-3-opus-20240229',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: message,
    }],
  });
  
  return response.content[0].text;
}
```

## Security

- ✅ All requests must include valid Firebase ID Token
- ✅ TenantId from token must match request tenantId
- ✅ Functions have full Firestore access via Admin SDK
- ✅ LLM API keys never exposed to client
- ✅ All logs sanitized (no sensitive data)

## Firestore Triggers

### `onUserCreated`

Automatically sets custom claims when a user is created:
- `tenantId`: User's tenant
- `role`: User's role (field_tech, manager, admin)

**Note:** Currently a placeholder - implement actual tenant resolution logic.

## Monitoring

```bash
# View logs
npm run logs

# Or in Firebase Console
# Functions → Logs
```

## Cost Optimization

- Functions automatically scale to zero when not in use
- Consider caching frequently accessed Firestore data
- Use Firebase Performance Monitoring
- Set timeout limits: `{ timeoutSeconds: 60 }`

## Troubleshooting

### "Permission denied" errors
- Check Firestore Security Rules
- Verify custom claims are set correctly
- Ensure token is valid and not expired

### "Function execution took too long"
- Optimize Firestore queries
- Consider pagination for large datasets
- Increase timeout if necessary

### LLM errors
- Verify API key is set correctly
- Check API rate limits
- Monitor token usage

## Production Checklist

- [ ] Environment variables configured
- [ ] LLM provider integrated and tested
- [ ] Custom claims logic implemented
- [ ] Error handling and logging reviewed
- [ ] Rate limiting implemented
- [ ] Monitoring/alerting configured
- [ ] Cost budget set
- [ ] Security Rules deployed
- [ ] Functions tested in production-like environment








