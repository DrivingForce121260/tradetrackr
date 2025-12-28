// ============================================================================
// CRM TYPES & INTERFACES
// ============================================================================

export interface CRMAccount {
  id: string;
  name: string;
  legalForm?: string;
  vatId?: string;
  addresses: CRMAddress[];
  billingEmail?: string;
  tags: string[];
  source: 'referral' | 'web' | 'phone' | 'other';
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  notes?: string;
  ownerUserId: string;
  stats: {
    totalProjects: number;
    lifetimeValue: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface CRMAddress {
  type: 'billing' | 'shipping' | 'main';
  street: string;
  city: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}

export interface CRMContact {
  id: string;
  accountId: string;
  firstName: string;
  lastName: string;
  role?: string;
  phones: string[];
  emails: string[];
  preferredChannel: 'phone' | 'email' | 'whatsapp';
  notes?: string;
  ownerUserId: string;
  gdprConsent: {
    marketing: boolean;
    date: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface CRMLead {
  id: string;
  companyName: string;
  contactName: string;
  contactEmail?: string;
  contactPhone?: string;
  source: 'referral' | 'web' | 'phone' | 'other';
  status: 'new' | 'working' | 'qualified' | 'disqualified';
  reasonIfLost?: string;
  nextAction: {
    type: string;
    dueAt: Date;
    assigneeId: string;
  };
  ownerUserId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CRMOpportunity {
  id: string;
  accountId: string;
  primaryContactId: string;
  title: string;
  pipelineId: string;
  stage: CRMOpportunityStage;
  amountNet: number;
  probability: number;
  expectedCloseDate: Date;
  links: {
    quoteId?: string;
    projectId?: string;
  };
  notes: CRMNote[];
  nextAction: {
    type: string;
    dueAt: Date;
    assigneeId: string;
  };
  ownerUserId: string;
  createdAt: Date;
  updatedAt: Date;
}

export type CRMOpportunityStage = 
  | 'new'
  | 'qualified'
  | 'site-visit'
  | 'quotation-sent'
  | 'negotiation'
  | 'won'
  | 'lost';

export interface CRMNote {
  id: string;
  content: string;
  authorId: string;
  createdAt: Date;
}

export interface CRMActivity {
  id: string;
  parent: {
    type: 'account' | 'contact' | 'opportunity' | 'lead';
    id: string;
  };
  kind: 'call' | 'email' | 'meeting' | 'note' | 'site-visit' | 'task';
  summary: string;
  body?: string;
  dueAt?: Date;
  doneAt?: Date;
  assigneeId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CRMQuote {
  id: string;
  accountId: string;
  opportunityId: string;
  lineItems: CRMQuoteLineItem[];
  totals: {
    subtotal: number;
    discount: number;
    net: number;
    tax: number;
    gross: number;
  };
  validityUntil: Date;
  terms?: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected';
  files: CRMFile[];
  lastSentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CRMQuoteLineItem {
  itemId: string;
  description: string;
  qty: number;
  unit: string;
  unitPriceNet: number;
  discountPercent: number;
}

export interface CRMPricebookItem {
  id: string;
  sku: string;
  name: string;
  unit: string;
  unitPriceNet: number;
  vatRate: number;
  category: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CRMPipeline {
  id: string;
  name: string;
  stages: string[];
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CRMFile {
  id: string;
  parentRef: string;
  storagePath: string;
  fileName: string;
  mimeType: string;
  uploadedBy: string;
  createdAt: Date;
}

// CRM Form Data Interfaces
export interface CRMAccountFormData {
  name: string;
  legalForm?: string;
  vatId?: string;
  addresses: CRMAddress[];
  billingEmail?: string;
  tags: string[];
  source: 'referral' | 'web' | 'phone' | 'other';
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  notes?: string;
}

export interface CRMContactFormData {
  accountId: string;
  firstName: string;
  lastName: string;
  role?: string;
  phones: string[];
  emails: string[];
  preferredChannel: 'phone' | 'email' | 'whatsapp';
  notes?: string;
}

export interface CRMOpportunityFormData {
  accountId: string;
  primaryContactId: string;
  title: string;
  pipelineId: string;
  stage: CRMOpportunityStage;
  amountNet: number;
  probability: number;
  expectedCloseDate: Date;
}

export interface CRMQuoteFormData {
  accountId: string;
  opportunityId: string;
  lineItems: CRMQuoteLineItem[];
  validityUntil: Date;
  terms?: string;
}

// CRM Statistics
export interface CRMStats {
  totalAccounts: number;
  totalContacts: number;
  totalOpportunities: number;
  totalQuotes: number;
  totalValue: number;
  wonValue: number;
  conversionRate: number;
}

// ============================================================================
// EMAIL-DERIVED CRM RECORDS (AI Pipeline)
// ============================================================================

/**
 * CRM Company derived from email inquiry.
 * User-scoped (ownerUid) within a concern.
 * Path: concerns/{concernId}/crmCompanies/{companyId}
 */
export interface CRMEmailCompany {
  id: string;
  concernId: string;
  ownerUid: string;
  
  // Company identification
  name: string;
  domain: string | null;
  email: string | null;
  phone: string | null;
  
  // Address (extracted from email/signature)
  address?: {
    street?: string;
    city?: string;
    postalCode?: string;
    country?: string;
  };
  
  // Source tracking
  source: 'email_ai' | 'manual' | 'business_card';
  
  // Inquiry metrics
  lastInquiryAt: Date;
  lastInquiryEmailId: string;
  inquiryCount: number;
  
  // Optional: Link to full CRM account if converted
  linkedCrmAccountId?: string;
  
  // Audit
  createdAt: Date;
  updatedAt: Date;
}

/**
 * CRM Note for email-derived inquiries.
 * User-scoped (ownerUid) within a concern.
 * Path: concerns/{concernId}/crmNotes/{noteId}
 */
export interface CRMEmailNote {
  id: string;
  concernId: string;
  ownerUid: string;
  
  // Link to company
  companyId: string;
  
  // Note type
  type: 'email_inquiry' | 'email_offer' | 'email_general';
  
  // Content
  title: string;
  body: string;
  
  // Email reference
  emailId: string;
  messageKey?: string;
  providerMessageId?: string;
  
  // Email context
  receivedAt: Date;
  senderEmail: string;
  senderName?: string;
  subject: string;
  
  // AI analysis
  ai: {
    confidence: number;
    classification: string;
    extracted?: {
      projectNumber?: string;
      requestNumber?: string;
      phone?: string;
      address?: string;
      keywords?: string[];
    };
  };
  
  // Linking (Phase 2 + 3)
  linkedProjectId?: string;
  linkedProjectNumber?: string;
  linkedProcurementRequestId?: string;
  
  // Idempotency
  idempotencyKey: string;
  
  // Audit
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Status labels for CRM Email Companies (German)
 */
export const CRM_EMAIL_COMPANY_SOURCE_LABELS: Record<CRMEmailCompany['source'], string> = {
  email_ai: 'E-Mail (KI)',
  manual: 'Manuell',
  business_card: 'Visitenkarte',
};

/**
 * Note type labels (German)
 */
export const CRM_EMAIL_NOTE_TYPE_LABELS: Record<CRMEmailNote['type'], string> = {
  email_inquiry: 'E-Mail-Anfrage',
  email_offer: 'E-Mail-Angebot',
  email_general: 'E-Mail-Notiz',
};

// ============================================================================
// EMAIL INQUIRY (Incoming Request from potential customer)
// ============================================================================

/**
 * Status for email-derived inquiry (incoming request)
 */
export type EmailInquiryStatus = 'new' | 'in_review' | 'converted' | 'rejected' | 'archived';

export const EMAIL_INQUIRY_STATUS_LABELS: Record<EmailInquiryStatus, string> = {
  new: 'Neu',
  in_review: 'In Bearbeitung',
  converted: 'Umgewandelt',
  rejected: 'Abgelehnt',
  archived: 'Archiviert',
};

export const EMAIL_INQUIRY_STATUS_COLORS: Record<EmailInquiryStatus, { bg: string; text: string }> = {
  new: { bg: 'bg-blue-100', text: 'text-blue-700' },
  in_review: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  converted: { bg: 'bg-green-100', text: 'text-green-700' },
  rejected: { bg: 'bg-red-100', text: 'text-red-700' },
  archived: { bg: 'bg-gray-100', text: 'text-gray-700' },
};

/**
 * Email Inquiry - Incoming request from potential customer.
 * Path: concerns/{concernId}/emailInquiries/{inquiryId}
 * User-scoped: ownerUid for strict access control.
 */
export interface EmailInquiry {
  id: string;
  concernId: string;
  ownerUid: string;
  
  // Request details
  title: string;
  senderEmail: string;
  senderName?: string;
  companyName?: string;
  
  // Source tracking
  source: 'email_ai';
  status: EmailInquiryStatus;
  
  // Email reference
  emailId: string;
  messageKey?: string;
  crmCompanyId?: string;
  crmNoteId?: string;
  
  // Extracted data
  extracted?: {
    projectNumber?: string;
    items?: string[];
    quantities?: string[];
    dates?: string[];
    references?: string[];
  };
  
  // AI analysis
  aiConfidence: number;
  aiSummary?: string[];
  
  // Linking
  projectId?: string;
  projectNumber?: string;
  linkedProjectId?: string;
  linkedProjectNumber?: string;
  
  // Sales conversion (customer inquiry → offer)
  linkedSalesOfferId?: string;
  linkedSalesOfferNumber?: string;
  conversionState?: 'pending' | 'converted';
  convertedAt?: Date;
  convertedBy?: string;
  
  // Legacy fields (kept for backward compatibility)
  convertedToQuoteId?: string;
  convertedToOpportunityId?: string;
  linkedProcurementRequestId?: string;
  
  // Email context
  receivedAt: Date;
  subject: string;
  
  // Idempotency
  idempotencyKey: string;
  
  // Audit
  createdAt: Date;
  updatedAt: Date;
}










