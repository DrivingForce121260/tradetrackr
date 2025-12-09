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










