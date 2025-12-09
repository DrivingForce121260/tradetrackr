// ============================================================================
// AI CATEGORY 2 IMPORT TYPES
// ============================================================================

export interface AICategory2Payload {
  category: {
    title: string;
    slug?: string;
    notes?: string;
  };
  options: Array<{
    familyID: string;
    key: string;
    label: string;
    order?: number;
    attributes?: Record<string, string | number | boolean>;
  }>;
  warnings?: string[];
}

export interface ImportJob {
  jobId: string;
  preview: AICategory2Payload;
  stats: {
    familiesCount: number;
    optionsCount: number;
    warningsCount: number;
  };
  sourceFile: string;
  ownerId: string;
  projectId?: string;
  createdAt: Date;
  expiresAt: Date;
  committedAt?: Date;
  committedCounts?: {
    categoryCreated: boolean;
    optionsCreated: number;
    optionsUpdated: number;
  };
}

export interface ImportAnalysisResponse {
  jobId: string;
  preview: AICategory2Payload;
  stats: {
    familiesCount: number;
    optionsCount: number;
    warningsCount: number;
  };
}

export interface CommitRequest {
  jobId: string;
  applyMode: 'upsert' | 'insertOnly';
  linkToCategoryId?: string;
  concernID?: string;
  categoryName: string;
}

export interface CommitResponse {
  committedCounts: {
    categoryCreated: boolean;
    optionsCreated: number;
    optionsUpdated: number;
  };
}

export type ImportErrorType = 
  | 'UPLOAD_ERROR'
  | 'PARSE_ERROR'
  | 'AI_ERROR'
  | 'VALIDATION_ERROR'
  | 'COMMIT_ERROR';

export interface ImportError {
  type: ImportErrorType;
  message: string;
  details?: string;
}


