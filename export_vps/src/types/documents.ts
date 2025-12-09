// ============================================================================
// DOCUMENT MANAGEMENT TYPES - TradeTrackr Portal
// ============================================================================

import { Timestamp } from 'firebase/firestore';

// Canonical document types for portal
export type DocumentType =
  | "project.site_daily_report"
  | "project.task_work_order"
  | "project.handover"
  | "project.change_order"
  | "project.risk_assessment"
  | "project.aufmass"
  | "personnel.timesheet"
  | "personnel.travel_log"
  | "personnel.expense_claim"
  | "material.requisition"
  | "material.delivery_note"
  | "material.goods_receipt"
  | "material.inventory_sheet"
  | "client.offer_quote"
  | "client.contract"
  | "client.invoice"
  | "client.credit_note"
  | "client.acceptance_report"
  | "quality.commissioning_report"
  | "quality.measurement_test"
  | "quality.maintenance_log"
  | "quality.photo_doc"
  | "compliance.certificate"
  | "compliance.insurance"
  | "compliance.vehicle_equipment_inspection"
  | "compliance.training_record"
  | "compliance.gdpr_consent";

export type DocumentStatus = 
  | "uploaded" 
  | "routed" 
  | "ai_requested" 
  | "ai_processing" 
  | "needs_review" 
  | "stored" 
  | "rejected";

export interface DocRecord {
  docId: string;
  orgId?: string;                       // Organization ID (concernID equivalent)
  concernId?: string;                   // Alias for orgId (for backwards compatibility)
  projectId: string;                    // NOW MANDATORY - always links to a project (external or internal)
  categoryId?: string | null;           // NEW: reference to /categories/{categoryId} - optional but recommended for semantic documents
  employeeId?: string | null;
  clientId?: string | null;
  supplierId?: string | null;
  type?: DocumentType | null;          // absent until determined
  typeConfidence?: number | null;      // 0..1
  status: DocumentStatus;
  storagePath: string;                  // gs:// path
  originalFilename: string;
  mimeType: string;                     // e.g., application/pdf, image/jpeg
  sizeBytes: number;
  createdAt: Timestamp;
  createdBy: string;                    // uid
  meta?: {
    date?: string | null;              // ISO date parsed if available
    number?: string | null;            // invoice/order/delivery note number
    ocrApplied?: boolean;
    textSample?: string | null;        // short snippet indexed for search
    hashSha256?: string;               // dedupe
  };
  tags?: string[];
  notes?: string;
  // audit
  routeDecision?: {
    ruleId?: string | null;
    reason?: string | null;
    candidates?: Array<{projectId: string; confidence: number}>;  // For needs_review status
  };
  categoryDecision?: {                  // NEW: Category routing decision
    categoryId?: string | null;
    confidence?: number;                // 0..1
    source?: "explicit" | "filename" | "docType" | "content" | "ai";
    candidates?: Array<{categoryId: string; confidence: number}>;
    reason?: string;
  };
  aiDecision?: {
    model?: string | null;
    reason?: string | null;
  };
}

export interface DocumentTypeConfig {
  slug: DocumentType;
  label: string;
  labelDe: string;
  category: 'project' | 'personnel' | 'material' | 'client' | 'quality' | 'compliance';
  allowedMime: string[];
  requiredLinks: ('projectId' | 'employeeId' | 'clientId' | 'supplierId')[];
  description?: string;
  descriptionDe?: string;
}

export interface RoutingDecision {
  type?: DocumentType;
  confidence: number;
  ruleId: string;
  reason: string;
}

export interface AIDecision {
  type?: DocumentType;
  confidence: number;
  reason: string;
  model: string;
}

export interface UploadContext {
  projectId?: string | null;
  clientId?: string | null;
  supplierId?: string | null;
  employeeId?: string | null;
  tags?: string[];
}

// Document type configurations
export const DOCUMENT_TYPE_CONFIGS: DocumentTypeConfig[] = [
  // Project documents
  {
    slug: "project.site_daily_report",
    label: "Site Daily Report",
    labelDe: "Tagesbericht",
    category: "project",
    allowedMime: ["application/pdf", "image/jpeg", "image/png"],
    requiredLinks: ["projectId"],
    descriptionDe: "Täglicher Baustellenbericht mit Arbeitsfortschritt"
  },
  {
    slug: "project.task_work_order",
    label: "Task Work Order",
    labelDe: "Arbeitsauftrag",
    category: "project",
    allowedMime: ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
    requiredLinks: ["projectId"],
    descriptionDe: "Detaillierter Arbeitsauftrag für Aufgaben"
  },
  {
    slug: "project.handover",
    label: "Project Handover",
    labelDe: "Projektübergabe",
    category: "project",
    allowedMime: ["application/pdf"],
    requiredLinks: ["projectId"],
    descriptionDe: "Übergabeprotokoll bei Projektabschluss"
  },
  {
    slug: "project.change_order",
    label: "Change Order",
    labelDe: "Änderungsauftrag",
    category: "project",
    allowedMime: ["application/pdf"],
    requiredLinks: ["projectId"],
    descriptionDe: "Beauftragung von Änderungen am Projekt"
  },
  {
    slug: "project.risk_assessment",
    label: "Risk Assessment",
    labelDe: "Gefährdungsbeurteilung",
    category: "project",
    allowedMime: ["application/pdf"],
    requiredLinks: ["projectId"],
    descriptionDe: "Sicherheits- und Risikoanalyse"
  },
  {
    slug: "project.aufmass",
    label: "Aufmaß",
    labelDe: "Aufmaß",
    category: "project",
    allowedMime: ["application/pdf", "text/csv"],
    requiredLinks: ["projectId"],
    descriptionDe: "Aggregiertes Aufmaß aus Berichten"
  },
  
  // Personnel documents
  {
    slug: "personnel.timesheet",
    label: "Timesheet",
    labelDe: "Stundenzettel",
    category: "personnel",
    allowedMime: ["application/pdf", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
    requiredLinks: ["employeeId"],
    descriptionDe: "Arbeitszeitnachweis"
  },
  {
    slug: "personnel.travel_log",
    label: "Travel Log",
    labelDe: "Fahrtenbuch",
    category: "personnel",
    allowedMime: ["application/pdf", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
    requiredLinks: ["employeeId"],
    descriptionDe: "Dokumentation von Dienstfahrten"
  },
  {
    slug: "personnel.expense_claim",
    label: "Expense Claim",
    labelDe: "Spesenabrechnung",
    category: "personnel",
    allowedMime: ["application/pdf", "image/jpeg", "image/png"],
    requiredLinks: ["employeeId"],
    descriptionDe: "Auslagenerstattung"
  },
  
  // Material documents
  {
    slug: "material.requisition",
    label: "Material Requisition",
    labelDe: "Materialanforderung",
    category: "material",
    allowedMime: ["application/pdf"],
    requiredLinks: [],
    descriptionDe: "Anforderung von Material"
  },
  {
    slug: "material.delivery_note",
    label: "Delivery Note",
    labelDe: "Lieferschein",
    category: "material",
    allowedMime: ["application/pdf", "image/jpeg", "image/png"],
    requiredLinks: [],
    descriptionDe: "Nachweis über Warenlieferung"
  },
  {
    slug: "material.goods_receipt",
    label: "Goods Receipt",
    labelDe: "Wareneingang",
    category: "material",
    allowedMime: ["application/pdf"],
    requiredLinks: [],
    descriptionDe: "Bestätigung des Wareneingangs"
  },
  {
    slug: "material.inventory_sheet",
    label: "Inventory Sheet",
    labelDe: "Inventarliste",
    category: "material",
    allowedMime: ["application/pdf", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
    requiredLinks: [],
    descriptionDe: "Bestandsaufnahme"
  },
  
  // Client documents
  {
    slug: "client.offer_quote",
    label: "Offer/Quote",
    labelDe: "Angebot",
    category: "client",
    allowedMime: ["application/pdf"],
    requiredLinks: ["clientId"],
    descriptionDe: "Preisangebot für Kunde"
  },
  {
    slug: "client.contract",
    label: "Contract",
    labelDe: "Vertrag",
    category: "client",
    allowedMime: ["application/pdf"],
    requiredLinks: ["clientId"],
    descriptionDe: "Vertragsvereinbarung"
  },
  {
    slug: "client.invoice",
    label: "Invoice",
    labelDe: "Rechnung",
    category: "client",
    allowedMime: ["application/pdf"],
    requiredLinks: ["clientId"],
    descriptionDe: "Zahlungsaufforderung"
  },
  {
    slug: "client.credit_note",
    label: "Credit Note",
    labelDe: "Gutschrift",
    category: "client",
    allowedMime: ["application/pdf"],
    requiredLinks: ["clientId"],
    descriptionDe: "Rechnungskorrektur oder Rückerstattung"
  },
  {
    slug: "client.acceptance_report",
    label: "Acceptance Report",
    labelDe: "Abnahmeprotokoll",
    category: "client",
    allowedMime: ["application/pdf"],
    requiredLinks: ["clientId", "projectId"],
    descriptionDe: "Bestätigung der Leistungsabnahme"
  },
  
  // Quality documents
  {
    slug: "quality.commissioning_report",
    label: "Commissioning Report",
    labelDe: "Inbetriebnahmeprotokoll",
    category: "quality",
    allowedMime: ["application/pdf"],
    requiredLinks: ["projectId"],
    descriptionDe: "Dokumentation der Inbetriebnahme"
  },
  {
    slug: "quality.measurement_test",
    label: "Measurement/Test Protocol",
    labelDe: "Mess- und Prüfprotokoll",
    category: "quality",
    allowedMime: ["application/pdf"],
    requiredLinks: [],
    descriptionDe: "Technische Messungen und Tests (z.B. VDE)"
  },
  {
    slug: "quality.maintenance_log",
    label: "Maintenance Log",
    labelDe: "Wartungsprotokoll",
    category: "quality",
    allowedMime: ["application/pdf"],
    requiredLinks: [],
    descriptionDe: "Wartungs- und Instandhaltungsnachweis"
  },
  {
    slug: "quality.photo_doc",
    label: "Photo Documentation",
    labelDe: "Fotodokumentation",
    category: "quality",
    allowedMime: ["image/jpeg", "image/png", "image/tiff"],
    requiredLinks: [],
    descriptionDe: "Bildliche Dokumentation"
  },
  
  // Compliance documents
  {
    slug: "compliance.certificate",
    label: "Certificate",
    labelDe: "Zertifikat",
    category: "compliance",
    allowedMime: ["application/pdf"],
    requiredLinks: [],
    descriptionDe: "Qualifikations- oder Prüfzertifikat"
  },
  {
    slug: "compliance.insurance",
    label: "Insurance Document",
    labelDe: "Versicherungsnachweis",
    category: "compliance",
    allowedMime: ["application/pdf"],
    requiredLinks: [],
    descriptionDe: "Versicherungspolice oder -bescheinigung"
  },
  {
    slug: "compliance.vehicle_equipment_inspection",
    label: "Vehicle/Equipment Inspection",
    labelDe: "Fahrzeug-/Geräteprüfung",
    category: "compliance",
    allowedMime: ["application/pdf"],
    requiredLinks: [],
    descriptionDe: "TÜV, UVV oder ähnliche Prüfungen"
  },
  {
    slug: "compliance.training_record",
    label: "Training Record",
    labelDe: "Schulungsnachweis",
    category: "compliance",
    allowedMime: ["application/pdf"],
    requiredLinks: [],
    descriptionDe: "Bescheinigung über Schulungen"
  },
  {
    slug: "compliance.gdpr_consent",
    label: "GDPR Consent",
    labelDe: "DSGVO-Einwilligung",
    category: "compliance",
    allowedMime: ["application/pdf"],
    requiredLinks: [],
    descriptionDe: "Datenschutz-Einwilligungserklärung"
  }
];

// Helper to get config by slug
export function getDocumentTypeConfig(slug: DocumentType): DocumentTypeConfig | undefined {
  return DOCUMENT_TYPE_CONFIGS.find(c => c.slug === slug);
}

// Allowed MIME types for upload
export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // docx
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // xlsx
  "application/vnd.ms-excel", // xls
  "text/csv",
  "text/plain",
  "image/jpeg",
  "image/png",
  "image/tiff"
];

// Maximum file size: 50MB
export const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024;
