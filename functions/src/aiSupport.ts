/**
 * AI Support Endpoint for TradeTrackr Field App
 * 
 * This is the ONLY approved AI endpoint for the Field App.
 * It runs server-side in a trusted environment with access to:
 * - Firebase Admin SDK (full Firestore access)
 * - LLM providers (OpenAI, Anthropic, etc.)
 * - Secure environment variables
 * 
 * CRITICAL: This endpoint MUST be deployed server-side.
 * Never expose LLM API keys in the client app.
 */

import * as admin from 'firebase-admin';
import { Request, Response } from 'express';

// ====================================
// TYPES (should match client types)
// ====================================

interface AIMessageRequest {
  tenantId: string;
  userId: string;
  projectId?: string;
  taskId?: string;
  message: string;
  attachments?: {
    photoId?: string;
    url?: string;
    type?: string;
  }[];
}

interface AIMessageResponse {
  id: string;
  role: 'assistant';
  content: string;
  context?: {
    projectId?: string;
    taskId?: string;
  };
  createdAt: {
    seconds: number;
    nanoseconds: number;
  };
}

// ====================================
// SCHEMA (shared with client)
// ====================================

const TradeTrackrSchema = {
  projectDoc: (tenantId: string, projectId: string) =>
    `tenants/${tenantId}/projects/${projectId}`,
  projectTasksCol: (tenantId: string, projectId: string) =>
    `tenants/${tenantId}/projects/${projectId}/tasks`,
  projectNotesCol: (tenantId: string, projectId: string) =>
    `tenants/${tenantId}/projects/${projectId}/notes`,
};

// ====================================
// AUTHENTICATION
// ====================================

/**
 * Verify Firebase ID token and extract claims
 */
async function verifyAuth(req: Request): Promise<admin.auth.DecodedIdToken> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Keine Authentifizierung gefunden');
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    return decodedToken;
  } catch (error) {
    console.error('Token verification failed:', error);
    throw new Error('Ungültiges Authentifizierungs-Token');
  }
}

// ====================================
// CONTEXT LOADING
// ====================================

/**
 * Load project context from Firestore
 */
async function loadProjectContext(
  tenantId: string,
  projectId: string
): Promise<any> {
  try {
    const projectRef = admin.firestore().doc(
      TradeTrackrSchema.projectDoc(tenantId, projectId)
    );
    const projectDoc = await projectRef.get();

    if (!projectDoc.exists) {
      return null;
    }

    return projectDoc.data();
  } catch (error) {
    console.error('Failed to load project context:', error);
    return null;
  }
}

/**
 * Load recent tasks for a project
 */
async function loadTasksContext(
  tenantId: string,
  projectId: string,
  limit: number = 5
): Promise<any[]> {
  try {
    const tasksRef = admin.firestore().collection(
      TradeTrackrSchema.projectTasksCol(tenantId, projectId)
    );
    const snapshot = await tasksRef.orderBy('createdAt', 'desc').limit(limit).get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('Failed to load tasks context:', error);
    return [];
  }
}

/**
 * Load recent notes for a project
 */
async function loadNotesContext(
  tenantId: string,
  projectId: string,
  limit: number = 3
): Promise<any[]> {
  try {
    const notesRef = admin.firestore().collection(
      TradeTrackrSchema.projectNotesCol(tenantId, projectId)
    );
    const snapshot = await notesRef.orderBy('createdAt', 'desc').limit(limit).get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('Failed to load notes context:', error);
    return [];
  }
}

// ====================================
// LLM INTEGRATION
// ====================================

/**
 * Call LLM provider (placeholder - integrate your provider here)
 * 
 * Examples:
 * - OpenAI GPT-4
 * - Anthropic Claude
 * - Google Gemini
 * - Azure OpenAI
 */
async function callLLM(
  message: string,
  context: {
    project?: any;
    tasks?: any[];
    notes?: any[];
  }
): Promise<string> {
  // TODO: Integrate with your LLM provider
  // Example with OpenAI:
  // const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  // const response = await openai.chat.completions.create({
  //   model: 'gpt-4',
  //   messages: [
  //     {
  //       role: 'system',
  //       content: 'Du bist ein hilfreicher Assistent für Monteure...',
  //     },
  //     {
  //       role: 'user',
  //       content: message,
  //     },
  //   ],
  // });
  // return response.choices[0].message.content;

  // PLACEHOLDER: Return a structured response
  const contextSummary = context.project
    ? `Projekt: ${context.project.name}\n`
    : '';

  return `[SERVER] Ich habe deine Anfrage erhalten: "${message}"\n\n${contextSummary}\nDies ist eine Platzhalter-Antwort. Integriere einen echten LLM-Provider (OpenAI, Anthropic, etc.) um vollständige KI-Funktionalität zu erhalten.\n\nDein Backend hat Zugriff auf:\n- Firestore (alle Projekt-/Aufgaben-Daten)\n- Sichere Umgebungsvariablen\n- Firebase Admin SDK\n\nKonfiguriere OPENAI_API_KEY oder ANTHROPIC_API_KEY in deiner Functions-Umgebung.`;
}

// ====================================
// MAIN HANDLER
// ====================================

/**
 * Handle AI support request
 * 
 * This is the main entry point for the Field App AI feature.
 */
export async function handleAISupport(
  req: Request,
  res: Response
): Promise<void> {
  try {
    // 1. Verify authentication
    const decodedToken = await verifyAuth(req);
    const tokenTenantId = decodedToken.tenantId as string;

    // 2. Validate request body
    const body = req.body as AIMessageRequest;

    if (!body.message || !body.tenantId || !body.userId) {
      res.status(400).json({
        error: 'Ungültige Anfrage: message, tenantId und userId erforderlich',
      });
      return;
    }

    // 3. Verify tenant isolation
    if (tokenTenantId !== body.tenantId) {
      console.error('Tenant mismatch:', {
        token: tokenTenantId,
        body: body.tenantId,
      });
      res.status(403).json({
        error: 'Zugriff verweigert: Tenant stimmt nicht überein',
      });
      return;
    }

    // 4. Load context from Firestore (if projectId provided)
    let context: any = {};

    if (body.projectId) {
      const [project, tasks, notes] = await Promise.all([
        loadProjectContext(body.tenantId, body.projectId),
        loadTasksContext(body.tenantId, body.projectId),
        body.taskId ? [] : loadNotesContext(body.tenantId, body.projectId),
      ]);

      context = { project, tasks, notes };
    }

    // 5. Call LLM with message and context
    const aiResponse = await callLLM(body.message, context);

    // 6. Build response
    const response: AIMessageResponse = {
      id: `ai-msg-${Date.now()}`,
      role: 'assistant',
      content: aiResponse,
      context: {
        projectId: body.projectId,
        taskId: body.taskId,
      },
      createdAt: {
        seconds: Math.floor(Date.now() / 1000),
        nanoseconds: 0,
      },
    };

    // 7. Optionally log to Firestore for audit
    // const aiMessagesRef = admin.firestore().collection(
    //   `tenants/${body.tenantId}/aiMessages`
    // );
    // await aiMessagesRef.add({
    //   ...response,
    //   userId: body.userId,
    //   tenantId: body.tenantId,
    // });

    // 8. Return response
    res.status(200).json(response);
  } catch (error: any) {
    console.error('AI Support error:', error);

    if (error.message?.includes('Authentifizierung')) {
      res.status(401).json({ error: error.message });
    } else if (error.message?.includes('Zugriff verweigert')) {
      res.status(403).json({ error: error.message });
    } else {
      res.status(500).json({
        error: 'Interner Server-Fehler bei der KI-Anfrage',
      });
    }
  }
}








