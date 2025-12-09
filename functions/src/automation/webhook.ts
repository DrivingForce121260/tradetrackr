/**
 * Automation Webhook Intake
 * Accepts structured payloads from external AI call assistants / chatbots / voice systems
 * and converts them into actionable CRM leads or project tasks.
 */

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import express from 'express';
import type { Request, Response } from 'express';
import * as crypto from 'crypto';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { AutomationPayload } from '../../../src/types/automation';

const db = admin.firestore();
const app = express();

app.use(express.json({ limit: '10mb' }));

/**
 * Validate HMAC signature
 */
export function validateHMAC(payload: string, signature: string, secret: string): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

/**
 * Authenticate webhook request using X-Trackr-Automation-Key header
 */
async function authenticateWebhook(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  try {
    const automationKey = req.headers['x-trackr-automation-key'] as string;
    if (!automationKey) {
      return res.status(401).json({ error: 'Missing X-Trackr-Automation-Key header' });
    }

    // Look up key in automationKeys collection
    const keySnap = await db
      .collection('automationKeys')
      .where('secret', '==', automationKey)
      .where('active', '==', true)
      .limit(1)
      .get();

    if (keySnap.empty) {
      return res.status(401).json({ error: 'Invalid or inactive automation key' });
    }

    const keyData = keySnap.docs[0].data();
    (req as any).automationKey = { id: keySnap.docs[0].id, ...keyData };

    // Update lastUsed
    await keySnap.docs[0].ref.update({ lastUsed: admin.firestore.FieldValue.serverTimestamp() });

    // Optional: Verify HMAC signature if provided
    const hmacSignature = req.headers['x-trackr-hmac-signature'] as string;
    if (hmacSignature) {
      const rawBody = JSON.stringify(req.body);
      if (!validateHMAC(rawBody, hmacSignature, automationKey)) {
        return res.status(401).json({ error: 'Invalid HMAC signature' });
      }
    }

    next();
  } catch (error: any) {
    console.error('Webhook authentication error:', error);
    return res.status(500).json({ error: 'Authentication failed' });
  }
}

/**
 * Detect intent using Gemini AI
 */
async function detectIntent(payload: AutomationPayload): Promise<{ intent: string; priority: 'low' | 'medium' | 'high'; summary?: string }> {
  const apiKey = process.env.GEMINI_API_KEY || functions.config().gemini?.api_key;
  if (!apiKey) {
    console.warn('Gemini API key not configured, using fallback intent detection');
    return { intent: payload.intent || 'unknown', priority: 'medium', summary: payload.summary };
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    const prompt = `Analyze the following automation payload and determine:
1. Intent (one of: quote_request, service_request, inquiry, complaint, support, other)
2. Priority (low, medium, high)
3. A brief summary (max 100 words)

Payload:
${JSON.stringify(payload, null, 2)}

Respond ONLY with valid JSON in this exact format:
{
  "intent": "quote_request",
  "priority": "high",
  "summary": "Customer requested quote for PV installation 10 kWp"
}`;

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    const response = result.response;
    const text = response.text().trim();

    // Extract JSON from response
    let jsonText = text;
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```(?:json)?\s*/m, '').replace(/\s*```$/m, '');
    }

    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonText = jsonMatch[0];
    }

    const parsed = JSON.parse(jsonText);
    return {
      intent: parsed.intent || payload.intent || 'unknown',
      priority: parsed.priority || 'medium',
      summary: parsed.summary || payload.summary,
    };
  } catch (error: any) {
    console.error('AI intent detection error:', error);
    return {
      intent: payload.intent || 'unknown',
      priority: 'medium',
      summary: payload.summary,
    };
  }
}

/**
 * Check for duplicate events (same source + client info + timestamp within 5 minutes)
 */
async function checkDuplicate(payload: AutomationPayload): Promise<boolean> {
  const clientIdentifier = payload.client?.phone || payload.client?.email || '';
  if (!clientIdentifier) return false;

  const fiveMinutesAgo = new Date(new Date(payload.timestamp).getTime() - 5 * 60 * 1000);

  const duplicateQuery = await db
    .collection('automationQueue')
    .where('payload.source', '==', payload.source)
    .where('status', 'in', ['pending', 'processing'])
    .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(fiveMinutesAgo))
    .limit(1)
    .get();

  return !duplicateQuery.empty;
}

/**
 * Create or find CRM client
 */
async function findOrCreateClient(clientInfo: { name?: string; phone?: string; email?: string }): Promise<string | null> {
  if (!clientInfo.email && !clientInfo.phone) return null;

  // Search existing accounts by email or phone
  if (clientInfo.email) {
    const emailQuery = await db
      .collection('crm_accounts')
      .where('billingEmail', '==', clientInfo.email)
      .limit(1)
      .get();

    if (!emailQuery.empty) {
      return emailQuery.docs[0].id;
    }
  }

  // Create new account if not found
  const newAccount = {
    name: clientInfo.name || clientInfo.email || 'Unknown',
    billingEmail: clientInfo.email,
    addresses: [],
    tags: ['automation'],
    source: 'phone',
    ownerUserId: '', // Will be assigned by office user
    stats: {
      totalProjects: 0,
      lifetimeValue: 0,
    },
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  const accountRef = await db.collection('crm_accounts').add(newAccount);
  return accountRef.id;
}

/**
 * Create CRM lead
 */
async function createCRMLead(
  payload: AutomationPayload,
  accountId: string | null,
  intent: string,
  summary: string
): Promise<string> {
  const leadData = {
    companyName: payload.client?.name || 'Unknown',
    contactName: payload.client?.name || '',
    contactEmail: payload.client?.email,
    contactPhone: payload.client?.phone,
    source: 'phone' as const,
    status: intent === 'quote_request' ? 'qualified' : 'new',
    reasonIfLost: undefined,
    nextAction: {
      type: intent === 'quote_request' ? 'Send Quote' : 'Follow Up',
      dueAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 24 * 60 * 60 * 1000)),
      assigneeId: '', // Will be assigned by office user
    },
    ownerUserId: '',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  const leadRef = await db.collection('crm_leads').add(leadData);
  return leadRef.id;
}

/**
 * Create offer draft
 */
async function createOfferDraft(accountId: string | null, summary: string): Promise<string> {
  if (!accountId) {
    throw new Error('Account ID required for offer creation');
  }

  // Get account data
  const accountSnap = await db.collection('crm_accounts').doc(accountId).get();
  const account = accountSnap.data();

  const offerData = {
    concernID: '', // Will be set based on assigned user
    documentType: 'offer',
    clientId: accountId,
    clientSnapshot: {
      name: account?.name || 'Unknown',
      billingAddress: account?.addresses?.[0] || {},
      vatId: account?.vatId,
      currency: 'EUR',
    },
    locale: 'de-DE',
    currency: 'EUR',
    issueDate: admin.firestore.Timestamp.fromDate(new Date()),
    noteInternal: `Created from automation: ${summary}`,
    noteCustomer: '',
    lineItems: [],
    additionalDiscountAbs: 0,
    taxKeys: {},
    state: 'draft',
    totals: {
      subtotalNet: 0,
      lineDiscountTotal: 0,
      itemNetAfterDiscount: 0,
      additionalDiscountAbs: 0,
      vatByKey: {},
      totalVat: 0,
      grandTotalGross: 0,
    },
    createdBy: '',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    number: '',
  };

  const offerRef = await db.collection('offers').add(offerData);
  return offerRef.id;
}

/**
 * Create task
 */
async function createTask(
  summary: string,
  concernID: string,
  assignedUserId?: string
): Promise<string> {
  const taskData = {
    concernID,
    dateCreated: admin.firestore.Timestamp.fromDate(new Date()),
    lastModified: admin.firestore.Timestamp.fromDate(new Date()),
    taskNumber: `AUTO-${Date.now()}`,
    title: summary.substring(0, 100) || 'Automation Task',
    description: summary,
    projectNumber: '',
    assignedTo: assignedUserId || '',
    customer: '',
    workLocation: '',
    dueDate: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
    priority: 'high',
    status: 'open',
    hours: 0,
    actualHours: 0,
    category: 'automation',
    tags: ['automation'],
    createdBy: '',
    createdByName: 'Automation System',
    assignedToName: '',
    taskType: 'standard',
    estimatedHours: 0,
    completionNotes: '',
    attachments: [],
    requiresApproval: false,
    approvedBy: null,
    approvedAt: null,
    rejectionReason: null,
  };

  const taskRef = await db.collection('tasks').add(taskData);
  return taskRef.id;
}

/**
 * Send notification to office users
 */
async function sendNotification(
  intent: string,
  summary: string,
  leadId?: string,
  taskId?: string
): Promise<void> {
  // Get office users
  const officeUsersQuery = await db
    .collection('users')
    .where('role', 'in', ['admin', 'office'])
    .limit(10)
    .get();

  const userIds = officeUsersQuery.docs.map(d => d.id);

  if (userIds.length === 0) return;

  // Create notification topic
  const topic = 'automation.new';

  // Create notification record for each user
  const batch = db.batch();
  for (const userId of userIds) {
    const notificationRef = db.collection('notifications').doc();
    batch.set(notificationRef, {
      recipients: [userId],
      topic,
      title: `Neue Automation: ${intent}`,
      body: summary,
      data: {
        type: 'automation',
        intent,
        leadId,
        taskId,
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      read: false,
    });
  }

  await batch.commit();
}

/**
 * Log audit entry
 */
async function logAudit(
  action: string,
  details: Record<string, any>,
  automationKeyId: string
): Promise<void> {
  await db.collection('audits').add({
    action,
    details,
    automationKeyId,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });
}

/**
 * Webhook intake endpoint
 */
app.post('/automation/intake', authenticateWebhook, async (req, res) => {
  try {
    const payload: AutomationPayload = req.body;
    const automationKey = (req as any).automationKey;

    // Validate payload
    if (!payload.source || !payload.type || !payload.timestamp) {
      return res.status(400).json({ error: 'Invalid payload: missing required fields' });
    }

    // Check for duplicates
    const isDuplicate = await checkDuplicate(payload);
    if (isDuplicate) {
      await logAudit('automation.intake.duplicate', { payload }, automationKey.id);
      return res.status(409).json({ error: 'Duplicate event detected' });
    }

    // Store in automationQueue
    const queueItem = {
      payload,
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const queueRef = await db.collection('automationQueue').add(queueItem);
    await logAudit('automation.intake', { queueId: queueRef.id, payload }, automationKey.id);

    // Process asynchronously
    processQueueItem(queueRef.id, payload).catch((error) => {
      console.error('Error processing queue item:', error);
    });

    res.status(202).json({
      success: true,
      queueId: queueRef.id,
      message: 'Event queued for processing',
    });
  } catch (error: any) {
    console.error('Webhook intake error:', error);
    await logAudit('automation.intake.error', { error: error.message }, (req as any).automationKey?.id || 'unknown');
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Process queue item
 */
async function processQueueItem(queueId: string, payload: AutomationPayload): Promise<void> {
  const queueRef = db.collection('automationQueue').doc(queueId);

  try {
    // Update status to processing
    await queueRef.update({ status: 'processing' });

    // Detect intent using AI
    const { intent, priority, summary } = await detectIntent(payload);
    const finalSummary = summary || payload.summary || `${payload.type} from ${payload.source}`;

    // Update queue item with intent
    await queueRef.update({
      intent,
      priority,
      processedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    let leadId: string | undefined;
    let taskId: string | undefined;
    let offerId: string | undefined;
    let accountId: string | null = null;

    // Create or find client
    if (payload.client) {
      accountId = await findOrCreateClient(payload.client);
    }

    // Process based on intent
    if (intent === 'quote_request') {
      // Create CRM lead
      leadId = await createCRMLead(payload, accountId, intent, finalSummary);

      // Create offer draft
      if (accountId) {
        try {
          offerId = await createOfferDraft(accountId, finalSummary);
        } catch (error) {
          console.error('Error creating offer draft:', error);
        }
      }
    } else if (intent === 'service_request') {
      // Create task (we need concernID - will be assigned later)
      // For now, create with empty concernID
      try {
        taskId = await createTask(finalSummary, '', undefined);
      } catch (error) {
        console.error('Error creating task:', error);
      }
    } else {
      // Create lead for other intents
      if (accountId || payload.client) {
        leadId = await createCRMLead(payload, accountId, intent, finalSummary);
      }
    }

    // Send notifications
    await sendNotification(intent, finalSummary, leadId, taskId);

    // Update status to completed
    await queueRef.update({
      status: 'completed',
      processedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (error: any) {
    console.error('Error processing queue item:', error);
    await queueRef.update({
      status: 'failed',
      error: error.message,
      processedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
}

export const automationWebhook = functions.https.onRequest(app);

