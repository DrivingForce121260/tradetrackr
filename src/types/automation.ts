// ============================================================================
// AUTOMATION TYPES & INTERFACES
// ============================================================================

export interface AutomationQueueItem {
  id: string;
  payload: AutomationPayload;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  intent?: string;
  priority?: 'low' | 'medium' | 'high';
  assignedUserId?: string;
  error?: string;
  processedAt?: Date;
  createdAt: Date;
}

export interface AutomationPayload {
  source: string; // e.g., "meiti"
  type: 'call_transcript' | 'email' | 'form_submission' | 'chat' | 'other';
  timestamp: string; // ISO 8601
  client?: {
    name?: string;
    phone?: string;
    email?: string;
  };
  intent?: string; // e.g., "quote_request", "service_request"
  summary?: string;
  transcript?: string;
  attachments?: Array<{
    type: string;
    url: string;
    filename?: string;
  }>;
  metadata?: Record<string, any>;
}

export interface AutomationKey {
  id: string;
  serviceName: string;
  secret: string;
  active: boolean;
  createdAt: Date;
  lastUsed?: Date;
}

export interface AutomationEvent {
  id: string;
  source: string;
  type: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  intent?: string;
  summary?: string;
  createdAt: Date;
  processedAt?: Date;
  assignedTo?: string;
  error?: string;
}













