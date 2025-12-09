/**
 * AI Client Service
 * Communicates with backend AI endpoint for problem solving
 * 
 * IMPORTANT: This service sends requests to the SAME backend as the TradeTrackr portal.
 * All context (tenantId, projectId, taskId) allows the backend to access the same
 * Firestore documents that the portal uses.
 */

import { TenantId, UserId, ProjectId, TaskId, AIMessage, PhotoId } from '../types';
import { useAuthStore } from '../store/authStore';
import { validateTenantId } from '../config/tradeTrackrSchema';
import { env } from '../config/env';
import { logInfo, logError, logWarn } from './logger';
import { fetchWithTimeout } from '../utils/fetch';

const AI_ENDPOINT_BASE = env.AI_ENDPOINT || '';

interface SendAIMessageParams {
  tenantId: TenantId;
  userId: UserId;
  projectId?: ProjectId;
  taskId?: TaskId;
  message: string;
  attachments?: {
    photoId?: PhotoId;
    url?: string;
    type?: string;
  }[];
}

/**
 * Send a message to the AI support endpoint
 * 
 * The backend endpoint should:
 * - Verify auth token
 * - Access Firestore using provided tenantId/projectId/taskId
 * - Return contextual responses based on project data
 */
export async function sendAIMessage(params: SendAIMessageParams): Promise<AIMessage> {
  validateTenantId(params.tenantId);

  // In development mode without configured endpoint, use mock
  if (__DEV__ && !AI_ENDPOINT_BASE) {
    console.warn('AI endpoint not configured, using development mock response');
    return getDevelopmentMockResponse(params);
  }

  if (!AI_ENDPOINT_BASE) {
    throw new Error('KI-Endpoint nicht konfiguriert. Bitte Systemadministrator kontaktieren.');
  }

  // Get auth token from store
  const token = useAuthStore.getState().session?.token;

  if (!token) {
    throw new Error('Keine Authentifizierung gefunden. Bitte melden Sie sich erneut an.');
  }

  const endpoint = `${AI_ENDPOINT_BASE}/ai/support`;

  logInfo('AI Client: Sending request', { projectId: params.projectId, taskId: params.taskId });

  try {
    // Use hardened fetch with 60s timeout (AI requests can be slow)
    const response = await fetchWithTimeout(
      endpoint,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          tenantId: params.tenantId,
          userId: params.userId,
          context: {
            projectId: params.projectId,
            taskId: params.taskId,
          },
          message: params.message,
          attachments: params.attachments || [],
        }),
      },
      60000 // 60 second timeout
    );

    if (!response.ok) {
      const errorText = await response.text();
      logError('AI Client: Request failed', new Error(`Status ${response.status}`), { status: response.status, errorText });
      
      if (response.status === 401) {
        throw new Error('Authentifizierung fehlgeschlagen. Bitte melden Sie sich erneut an.');
      } else if (response.status === 403) {
        throw new Error('Zugriff verweigert. Sie haben keine Berechtigung für diese Funktion.');
      } else if (response.status >= 500) {
        throw new Error('Server-Fehler. Bitte später erneut versuchen.');
      }
      
      throw new Error(`KI-Anfrage fehlgeschlagen: ${response.status}`);
    }

    const data = await response.json();

    logInfo('AI Client: Response received', { hasMessage: !!data.message });

    // If backend returns full AIMessage
    if (data.message) {
      return data.message as AIMessage;
    }

    // If backend returns just content, construct AIMessage
    return {
      id: data.id || `ai-msg-${Date.now()}`,
      tenantId: params.tenantId,
      userId: 'ai-assistant',
      role: 'assistant',
      content: data.content || data.response || '',
      context: {
        projectId: params.projectId,
        taskId: params.taskId,
      },
      createdAt: {
        seconds: Date.now() / 1000,
        nanoseconds: 0,
      },
    };
  } catch (error: any) {
    logError('AI Client: Request failed', error, { endpoint });

    // In development, fall back to mock on network errors
    if (__DEV__ && (error.message?.includes('Network') || error.message?.includes('fetch') || error.message?.includes('timeout'))) {
      logWarn('AI Client: Using development mock due to network error');
      return getDevelopmentMockResponse(params);
    }

    // Provide user-friendly error message
    if (error.message?.includes('timeout') || error.message?.includes('zu lange')) {
      throw new Error('KI-Anfrage hat zu lange gedauert. Bitte erneut versuchen.');
    }

    throw new Error(error.message || 'KI-Anfrage fehlgeschlagen. Bitte später erneut versuchen.');
  }
}

/**
 * Get mock AI response for development only
 * Only available when __DEV__ is true
 */
function getDevelopmentMockResponse(params: SendAIMessageParams): AIMessage {
  if (!__DEV__) {
    throw new Error('Mock responses are only available in development mode');
  }

  const responses: Record<string, string> = {
    'Arbeitsauftrag erklären': 'Dein aktueller Arbeitsauftrag umfasst die Installation und Verkabelung der elektrischen Anlagen im Erdgeschoss. Bitte stelle sicher, dass alle Steckdosen gemäß Bauplan positioniert werden.',
    'Schritte vorschlagen': '1. Überprüfe den Bauplan und markiere die Positionen\n2. Verlege die Kabel gemäß Vorschrift\n3. Installiere die Dosen und Schalter\n4. Teste alle Verbindungen\n5. Dokumentiere mit Fotos',
    'Anleitung zusammenfassen': 'Zusammenfassung: Verkabelung Erdgeschoss gemäß DIN VDE 0100. Alle Leitungen NYM-J 3x1,5mm². Mindestabstände einhalten. Dokumentationspflicht beachten.',
    'Material prüfen': 'Benötigtes Material:\n- NYM-J Kabel 3x1,5mm² (ca. 150m)\n- Schalterdosen (20 Stück)\n- Steckdosen (15 Stück)\n- Lichtschalter (10 Stück)\n- Installationsrohr M20',
    'Notiz für Baustelle': 'Notiz: Installation Erdgeschoss läuft planmäßig. Alle Leitungen verlegt. Abnahme für morgen vorgesehen. Keine besonderen Vorkommnisse.',
  };

  const matchedResponse = Object.keys(responses).find((key) =>
    params.message.toLowerCase().includes(key.toLowerCase())
  );

  const content = matchedResponse
    ? responses[matchedResponse]
    : `[DEV MODE] Ich habe deine Nachricht verstanden: "${params.message}". Als KI-Assistent kann ich dir bei Fragen zu Arbeitsaufträgen, Material, Arbeitsschritten und Dokumentation helfen. ${params.projectId ? `Dein aktuelles Projekt ist ${params.projectId}.` : ''}\n\nHinweis: Dies ist eine Entwicklungs-Mock-Antwort. In Produktion würde hier die echte KI-Antwort erscheinen.`;

  return {
    id: `ai-msg-dev-${Date.now()}`,
    tenantId: params.tenantId,
    userId: 'ai-assistant-dev',
    role: 'assistant',
    content,
    context: {
      projectId: params.projectId,
      taskId: params.taskId,
    },
    createdAt: {
      seconds: Date.now() / 1000,
      nanoseconds: 0,
    },
  };
}
