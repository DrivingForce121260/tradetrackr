export type TemplateKind = 'pdf' | 'email';

export interface TemplateBase {
	concernID: string; // company/tenant scope
	type: TemplateKind;
	/** Optional context to specialize usage, e.g. invoice/offer/order/report */
	useFor?: 'invoice' | 'offer' | 'order' | 'report';
	name: string;
	htmlBody: string; // raw HTML or MJML for emails
	placeholders: string[]; // e.g., client.name, invoice.number
	locale: 'de' | 'en';
	logoUrl?: string;
	colorPrimary?: string;
	footerText?: string;
	version: number;
	createdBy: string;
	createdAt: string; // ISO
	updatedAt: string; // ISO
	active: boolean;
}

export interface Template extends TemplateBase {
	id: string;
}

export interface TemplateHistory {
	id: string;
	templateId: string;
	concernID: string;
	version: number; // version being archived
	htmlBody: string;
	createdAt: string; // ISO when archived
	createdBy: string;
}

export interface RenderTemplateRequest {
	concernID: string;
	templateId: string;
	data: Record<string, any>;
	output: 'pdf' | 'html';
}

export interface RenderTemplateResult {
	url: string; // Signed URL of generated artifact
	contentType: string;
}


