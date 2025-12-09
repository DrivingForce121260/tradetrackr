// ============================================================================
// EMAIL TRACKING TYPES & INTERFACES
// ============================================================================

export type EmailDocumentType = 'offer' | 'invoice' | 'order' | 'report';

export type EmailStatus = 'sent' | 'delivered' | 'opened' | 'bounced' | 'failed';

export interface EmailRecord {
	id: string;
	documentId: string;
	documentType: EmailDocumentType;
	recipient: string;
	subject: string;
	status: EmailStatus;
	providerId?: string; // Provider message ID
	sentAt: Date;
	openedAt?: Date;
	bounceReason?: string;
	errorMessage?: string;
	templateId?: string;
	attachments?: Array<{
		name: string;
		url: string;
		size: number;
	}>;
	metadata?: Record<string, any>;
}

export interface SendEmailRequest {
	documentId: string;
	documentType: EmailDocumentType;
	recipient: string;
	templateId?: string;
	subject?: string;
	body?: string; // Override template body
	attachments?: Array<{
		name: string;
		url: string; // Signed URL or storage path
	}>;
	customData?: Record<string, any>; // Additional data for template placeholders
}

export interface EmailStatusUpdate {
	emailId: string;
	status: EmailStatus;
	providerId?: string;
	openedAt?: Date;
	bounceReason?: string;
	errorMessage?: string;
}

// ============================================================================
// EMAIL INTELLIGENCE AGENT TYPES
// ============================================================================

export type EmailProvider = 'gmail' | 'm365' | 'imap';

export type EmailCategory = 
	| 'INVOICE' 
	| 'ORDER' 
	| 'SHIPPING' 
	| 'CLAIM' 
	| 'COMPLAINT' 
	| 'KYC' 
	| 'GENERAL' 
	| 'SPAM';

export type EmailPriority = 'high' | 'normal' | 'low';
export type EmailSummaryStatus = 'open' | 'in_progress' | 'done';

export type DocumentType = 
	| 'INVOICE' 
	| 'PO' 
	| 'CONTRACT' 
	| 'ID' 
	| 'OTHER';

export interface EmailAccount {
	id: string;
	orgId: string;
	provider: EmailProvider;
	emailAddress: string;
	oauthRef: string; // Encrypted token reference
	syncState?: {
		historyId?: string;
		deltaToken?: string;
		lastSyncedAt?: Date;
	};
	active: boolean;
	createdAt: Date;
	updatedAt: Date;
}

export interface IncomingEmail {
	id: string;
	orgId: string;
	accountId: string;
	provider: EmailProvider;
	providerMessageId: string;
	threadId: string;
	from: string;
	to: string[];
	cc: string[];
	subject: string;
	bodyText: string;
	bodyHtml?: string;
	receivedAt: Date;
	hasAttachments: boolean;
	category?: EmailCategory;
	categoryConfidence?: number;
	processed: boolean;
	createdAt: Date;
}

export interface EmailAttachment {
	id: string;
	orgId: string;
	emailId: string;
	fileName: string;
	mimeType: string;
	storagePath: string;
	docType?: DocumentType;
	metadata?: Record<string, any>;
	linkedDocumentId?: string;
	createdAt: Date;
}

export interface EmailSummary {
	id: string; // Same as emailId for 1:1 mapping
	orgId: string;
	emailId: string;
	category: EmailCategory;
	summaryBullets: string[];
	priority: EmailPriority;
	status: EmailSummaryStatus;
	assignedTo?: string | null;
	createdAt: Date;
	// Email metadata for list display (loaded from emails collection)
	emailFrom?: string;
	emailSubject?: string;
	// Archive/Hide functionality
	archived?: boolean;
	archivedAt?: Date;
	archivedBy?: string;
	// New email indicator
	isNew?: boolean;
	readAt?: Date;
}

export interface NormalizedEmail {
	orgId: string;
	accountId: string;
	provider: EmailProvider;
	providerMessageId: string;
	threadId: string;
	from: string;
	to: string[];
	cc: string[];
	subject: string;
	bodyText: string;
	bodyHtml?: string;
	receivedAt: Date;
	attachments: NormalizedAttachment[];
}

export interface NormalizedAttachment {
	fileName: string;
	mimeType: string;
	data: Buffer;
	size: number;
}

export interface EmailConnectorSyncState {
	historyId?: string;
	deltaToken?: string;
	lastSyncedAt?: Date;
}

export interface EmailConnector {
	fetchNewMessages(params: EmailConnectorSyncState): Promise<NormalizedEmail[]>;
	parseWebhook(req: any): Promise<NormalizedEmail[]>;
}

export interface LLMAnalysisResult {
	category: EmailCategory;
	confidence: number;
	document_types: DocumentType[];
	summary_bullets: string[];
	priority: EmailPriority;
}





