// ============================================================================
// DETERMINISTIC DOCUMENT ROUTING - No AI Guessing
// ============================================================================

import { DocumentType, RoutingDecision, UploadContext } from '@/types/documents';

/**
 * Pure function for deterministic document routing based on heuristics.
 * Returns routing decision or null if no confident match found.
 * 
 * @param file - File object with name and type
 * @param context - Upload context (project, client, etc.)
 * @param parsedText - Optional OCR or extracted text
 * @returns Routing decision with confidence score
 */
export function routeByHeuristics(
  file: { name: string; type: string },
  context: UploadContext,
  parsedText?: string | null
): RoutingDecision | null {
  
  const filename = file.name.toLowerCase();
  const mimeType = file.type.toLowerCase();
  const text = (parsedText || '').toLowerCase();

  // Rule 1: Upload context - if projectId is set, boost project-expected forms
  if (context.projectId) {
    const projectContextResult = checkProjectContext(filename, text);
    if (projectContextResult) {
      return {
        ...projectContextResult,
        ruleId: 'RULE_1_PROJECT_CONTEXT',
        reason: `Uploaded in project context: ${projectContextResult.reason}`
      };
    }
  }

  // Rule 2: Filename hints (high confidence)
  const filenameResult = checkFilenameHints(filename);
  if (filenameResult) {
    return {
      ...filenameResult,
      ruleId: 'RULE_2_FILENAME_HINT',
      reason: `Filename pattern match: ${filenameResult.reason}`
    };
  }

  // Rule 3: MIME type defaults
  const mimeResult = checkMimeTypeDefaults(mimeType);
  if (mimeResult) {
    return {
      ...mimeResult,
      ruleId: 'RULE_3_MIME_DEFAULT',
      reason: `MIME type default: ${mimeResult.reason}`
    };
  }

  // Rule 4: Template anchors in text (PDFs and OCR text)
  if (parsedText) {
    const templateResult = checkTemplateAnchors(text);
    if (templateResult) {
      return {
        ...templateResult,
        ruleId: 'RULE_4_TEMPLATE_ANCHOR',
        reason: `Document template detected: ${templateResult.reason}`
      };
    }
  }

  // Rule 5: Context-based link detection
  const linkResult = checkContextLinks(context);
  if (linkResult) {
    return {
      ...linkResult,
      ruleId: 'RULE_5_CONTEXT_LINK',
      reason: `Context link analysis: ${linkResult.reason}`
    };
  }

  // No confident match found
  return null;
}

/**
 * Rule 1: Check project context for expected document types
 */
function checkProjectContext(filename: string, text: string): Partial<RoutingDecision> | null {
  // Daily report indicators
  if (
    filename.includes('tagesbericht') ||
    filename.includes('daily') ||
    filename.includes('rapport') ||
    text.includes('tagesbericht') ||
    text.includes('baustellenbericht')
  ) {
    return {
      type: 'project.site_daily_report',
      confidence: 0.92,
      reason: 'Daily report indicators in project context'
    };
  }

  // Work order indicators
  if (
    filename.includes('arbeitsauftrag') ||
    filename.includes('work_order') ||
    filename.includes('workorder') ||
    text.includes('arbeitsauftrag')
  ) {
    return {
      type: 'project.task_work_order',
      confidence: 0.91,
      reason: 'Work order indicators in project context'
    };
  }

  // Handover indicators
  if (
    filename.includes('übergabe') ||
    filename.includes('uebergabe') ||
    filename.includes('handover') ||
    text.includes('übergabeprotokoll') ||
    text.includes('projektübergabe')
  ) {
    return {
      type: 'project.handover',
      confidence: 0.93,
      reason: 'Handover indicators in project context'
    };
  }

  return null;
}

/**
 * Rule 2: Filename pattern matching with regex
 */
function checkFilenameHints(filename: string): Partial<RoutingDecision> | null {
  const patterns: Array<{ regex: RegExp; type: DocumentType; confidence: number; label: string }> = [
    // Material documents
    { regex: /lieferschein|delivery[_-]?note|delivery_note/i, type: 'material.delivery_note', confidence: 0.95, label: 'Lieferschein' },
    { regex: /wareneingang|goods[_-]?receipt/i, type: 'material.goods_receipt', confidence: 0.93, label: 'Wareneingang' },
    { regex: /materialanforderung|requisition/i, type: 'material.requisition', confidence: 0.91, label: 'Materialanforderung' },
    { regex: /inventar|inventory/i, type: 'material.inventory_sheet', confidence: 0.89, label: 'Inventar' },
    
    // Client documents
    { regex: /rechnung|invoice|inv[_-]?\d+/i, type: 'client.invoice', confidence: 0.96, label: 'Rechnung' },
    { regex: /angebot|quote|offer|ang[_-]?\d+/i, type: 'client.offer_quote', confidence: 0.94, label: 'Angebot' },
    { regex: /gutschrift|credit[_-]?note/i, type: 'client.credit_note', confidence: 0.94, label: 'Gutschrift' },
    { regex: /vertrag|contract/i, type: 'client.contract', confidence: 0.92, label: 'Vertrag' },
    { regex: /abnahme|acceptance/i, type: 'client.acceptance_report', confidence: 0.93, label: 'Abnahmeprotokoll' },
    
    // Personnel documents
    { regex: /stundenzettel|timesheet|stunden/i, type: 'personnel.timesheet', confidence: 0.94, label: 'Stundenzettel' },
    { regex: /fahrtenbuch|travel[_-]?log|mileage/i, type: 'personnel.travel_log', confidence: 0.93, label: 'Fahrtenbuch' },
    { regex: /spesen|expense|reisekosten/i, type: 'personnel.expense_claim', confidence: 0.91, label: 'Spesenabrechnung' },
    
    // Quality documents
    { regex: /inbetriebnahme|commissioning/i, type: 'quality.commissioning_report', confidence: 0.92, label: 'Inbetriebnahme' },
    { regex: /protokoll|messprotokoll|prüfprotokoll|vde|test[_-]?protocol/i, type: 'quality.measurement_test', confidence: 0.90, label: 'Prüfprotokoll' },
    { regex: /wartung|maintenance/i, type: 'quality.maintenance_log', confidence: 0.89, label: 'Wartungsprotokoll' },
    
    // Compliance documents
    { regex: /zertifikat|certificate|cert/i, type: 'compliance.certificate', confidence: 0.91, label: 'Zertifikat' },
    { regex: /versicherung|insurance/i, type: 'compliance.insurance', confidence: 0.92, label: 'Versicherung' },
    { regex: /tüv|uvv|prüfung|inspection/i, type: 'compliance.vehicle_equipment_inspection', confidence: 0.90, label: 'Prüfung' },
    { regex: /schulung|training/i, type: 'compliance.training_record', confidence: 0.89, label: 'Schulungsnachweis' },
    
    // Project documents
    { regex: /tagesbericht|daily[_-]?report/i, type: 'project.site_daily_report', confidence: 0.93, label: 'Tagesbericht' },
    { regex: /änderung|change[_-]?order/i, type: 'project.change_order', confidence: 0.91, label: 'Änderungsauftrag' },
    { regex: /gefährdung|risk[_-]?assessment/i, type: 'project.risk_assessment', confidence: 0.90, label: 'Gefährdungsbeurteilung' }
  ];

  for (const pattern of patterns) {
    if (pattern.regex.test(filename)) {
      return {
        type: pattern.type,
        confidence: pattern.confidence,
        reason: `Filename contains "${pattern.label}" pattern`
      };
    }
  }

  return null;
}

/**
 * Rule 3: MIME type default routing
 */
function checkMimeTypeDefaults(mimeType: string): Partial<RoutingDecision> | null {
  // Images default to photo documentation (low confidence - needs user confirmation)
  if (mimeType.startsWith('image/')) {
    return {
      type: 'quality.photo_doc',
      confidence: 0.65,
      reason: 'Image file defaults to photo documentation (unless scanned document)'
    };
  }

  // No other MIME-only defaults with sufficient confidence
  return null;
}

/**
 * Rule 4: Template anchor detection in extracted text
 */
function checkTemplateAnchors(text: string): Partial<RoutingDecision> | null {
  const anchors: Array<{ keywords: string[]; type: DocumentType; confidence: number; label: string }> = [
    // Invoice anchors
    {
      keywords: ['rechnungsnummer', 'invoice number', 'rech.-nr', 'inv. no.'],
      type: 'client.invoice',
      confidence: 0.97,
      label: 'Invoice template'
    },
    // Delivery note anchors
    {
      keywords: ['lieferschein-nr', 'delivery note no', 'lieferscheinnummer'],
      type: 'material.delivery_note',
      confidence: 0.96,
      label: 'Delivery note template'
    },
    // Quote anchors
    {
      keywords: ['angebotsnummer', 'quote no', 'angebot-nr'],
      type: 'client.offer_quote',
      confidence: 0.95,
      label: 'Quote template'
    },
    // VDE test protocol
    {
      keywords: ['vde 0100', 'vde 0105', 'messprotokoll', 'prüfprotokoll'],
      type: 'quality.measurement_test',
      confidence: 0.94,
      label: 'VDE test protocol'
    },
    // Acceptance report
    {
      keywords: ['abnahmeprotokoll', 'acceptance protocol', 'abnahmebescheinigung'],
      type: 'client.acceptance_report',
      confidence: 0.93,
      label: 'Acceptance report template'
    },
    // Commissioning report
    {
      keywords: ['inbetriebnahmeprotokoll', 'commissioning report', 'inbetriebsetzung'],
      type: 'quality.commissioning_report',
      confidence: 0.92,
      label: 'Commissioning report template'
    },
    // Timesheet
    {
      keywords: ['stundennachweis', 'arbeitszeitnachweis', 'timesheet'],
      type: 'personnel.timesheet',
      confidence: 0.91,
      label: 'Timesheet template'
    }
  ];

  for (const anchor of anchors) {
    const matchCount = anchor.keywords.filter(kw => text.includes(kw.toLowerCase())).length;
    if (matchCount > 0) {
      return {
        type: anchor.type,
        confidence: anchor.confidence,
        reason: `Document contains template anchor: ${anchor.label}`
      };
    }
  }

  return null;
}

/**
 * Rule 5: Context link analysis
 */
function checkContextLinks(context: UploadContext): Partial<RoutingDecision> | null {
  // If uploaded with client context only, likely a client document
  if (context.clientId && !context.projectId) {
    return {
      type: 'client.offer_quote',
      confidence: 0.70,
      reason: 'Uploaded in client context, likely client document'
    };
  }

  // If uploaded with employee context only, likely personnel document
  if (context.employeeId && !context.projectId) {
    return {
      type: 'personnel.timesheet',
      confidence: 0.68,
      reason: 'Uploaded in employee context, likely personnel document'
    };
  }

  // If uploaded with supplier context, likely material document
  if (context.supplierId) {
    return {
      type: 'material.delivery_note',
      confidence: 0.72,
      reason: 'Uploaded in supplier context, likely delivery note or invoice'
    };
  }

  return null;
}

/**
 * Helper: Evaluate final decision based on confidence thresholds
 * >= 0.90: Accept and route
 * 0.60-0.89: Needs review
 * < 0.60: Reject (return null)
 */
export function evaluateConfidence(decision: RoutingDecision | null): {
  action: 'route' | 'review' | 'reject';
  decision: RoutingDecision | null;
} {
  if (!decision || decision.confidence < 0.6) {
    return { action: 'reject', decision: null };
  }
  
  if (decision.confidence >= 0.9) {
    return { action: 'route', decision };
  }
  
  return { action: 'review', decision };
}













