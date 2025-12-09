/**
 * Feature Request Types
 * Type definitions for the "Wünsch-dir-was" feature request system
 */

export type FeatureRequestStatus =
  | "new"
  | "reviewed"
  | "planned"
  | "in_progress"
  | "released"
  | "rejected";

export type FeatureRequestType = "free_text" | "ai_guided";

export interface FeatureRequestDialogStep {
  question: string;
  answer: string;
}

export interface FeatureRequest {
  id?: string;                     // Firestore doc id
  concernId: string;               // from auth context
  userId: string;
  userEmail?: string;
  userName?: string;
  platform: "web";                 // fixed here
  route: string;                   // current pathname
  module?: string;                 // optional logical module name
  entityId?: string;               // e.g. projectId, reportId
  requestType: FeatureRequestType;
  title: string;                   // short label for backlog
  description: string;             // final confirmed text
  category?: string;               // "Zeiterfassung", "Doku", "KI", etc.
  impactSelfRating?: "low" | "medium" | "high";
  usageFrequency?: "rare" | "sometimes" | "daily";
  painPointToday?: string;
  aiDialogSteps?: FeatureRequestDialogStep[];
  aiGeneratedSummary?: string;
  language?: string;               // "de" or "en"
  status: FeatureRequestStatus;
  internalNotes?: string;
  linkedTaskId?: string;
  version?: number;
  createdAt: Date;                 // store as Firestore Timestamp in DB
  createdBy: string;               // same as userId
  updatedAt?: Date;
  updatedBy?: string;
}

/**
 * Input for AI summarization endpoint
 */
export interface AISummarizeInput {
  concernId: string;
  userId: string;
  userEmail?: string;
  route: string;
  module?: string;
  entityId?: string;
  steps: FeatureRequestDialogStep[];
  language?: string;
}

/**
 * Output from AI summarization endpoint
 */
export interface AISummarizeOutput {
  title: string;
  description: string;
  useCases: string[];
  category?: string;
  impactRating?: "low" | "medium" | "high";
}







