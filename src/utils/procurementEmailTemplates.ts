/**
 * Procurement Email Templates
 * 
 * Generates German email content for procurement documents (Anfragen, Bestellungen, etc.)
 * Used with the mailto: flow to open the user's email client.
 */

import type { ProcurementRequest, RequestLineItem, ProjectSnapshot } from '@/types/procurement';

export interface RequestEmailDraftParams {
  request: ProcurementRequest;
  supplierName: string;
  supplierEmail?: string;
  userName?: string;
  companyName?: string;
  pdfUrl?: string;
  portalUrl?: string;
}

export interface EmailDraft {
  to: string;
  subject: string;
  body: string;
}

/**
 * Format line items as plain text for email body
 */
function formatLineItems(lineItems: RequestLineItem[]): string {
  if (!lineItems || lineItems.length === 0) {
    return '  (Keine Positionen)';
  }

  return lineItems
    .map((item, index) => {
      const pos = item.position || index + 1;
      const qty = item.qty?.toLocaleString('de-DE') || '1';
      const unit = item.unit || 'Stk';
      const desc = item.description || '(keine Beschreibung)';
      return `  ${pos}. ${qty} ${unit} – ${desc}`;
    })
    .join('\n');
}

/**
 * Format project info for subject line (short version)
 */
function formatProjectShort(project?: ProjectSnapshot): string {
  if (!project) return '';
  return ` (Projekt ${project.projectNumber || project.name})`;
}

/**
 * Format project info for email body
 */
function formatProjectLine(project?: ProjectSnapshot): string {
  if (!project) return '';
  return `Projekt: ${project.projectNumber} – ${project.name}`;
}

/**
 * Format date for display (German format)
 */
function formatDate(timestamp: any): string {
  if (!timestamp) return new Date().toLocaleDateString('de-DE');
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('de-DE');
}

/**
 * Build email draft for a procurement request
 * 
 * @param params - Request data and context
 * @returns EmailDraft with to, subject, and body
 */
export function buildRequestEmailDraft(params: RequestEmailDraftParams): EmailDraft {
  const {
    request,
    supplierName,
    supplierEmail = '',
    userName = 'Ihr TradeTrackr Team',
    companyName = 'TradeTrackr',
    pdfUrl,
    portalUrl,
  } = params;

  // Build subject
  const projectShort = formatProjectShort(request.project);
  const subject = `Anfrage ${request.requestNumber}${projectShort} – ${companyName}`;

  // Build body
  const lines: string[] = [];

  // Greeting
  lines.push(`Guten Tag ${supplierName},`);
  lines.push('');
  lines.push(`anbei erhalten Sie unsere Anfrage ${request.requestNumber}.`);
  lines.push('Bitte senden Sie uns Ihr Angebot mit Preisen und voraussichtlichen Lieferzeiten.');
  lines.push('');

  // Request meta
  lines.push('---');
  lines.push(`Anfrage-Nr.: ${request.requestNumber}`);
  if (request.title) {
    lines.push(`Betreff: ${request.title}`);
  }
  lines.push(`Datum: ${formatDate(request.requestedAt)}`);
  
  // Project if present
  const projectLine = formatProjectLine(request.project);
  if (projectLine) {
    lines.push(projectLine);
  }
  lines.push('---');
  lines.push('');

  // Line items
  lines.push('Positionen:');
  lines.push(formatLineItems(request.lineItems));
  lines.push('');

  // Notes if present
  if (request.notes) {
    lines.push('Anmerkungen:');
    lines.push(request.notes);
    lines.push('');
  }

  // PDF link if available
  if (pdfUrl) {
    lines.push('---');
    lines.push(`PDF-Dokument: ${pdfUrl}`);
    lines.push('');
  }

  // Portal link if available
  if (portalUrl) {
    lines.push(`Im Portal öffnen: ${portalUrl}`);
    lines.push('');
  }

  // Signature
  lines.push('Mit freundlichen Grüßen');
  lines.push(userName);
  lines.push(companyName);

  const body = lines.join('\n');

  return {
    to: supplierEmail,
    subject,
    body,
  };
}

/**
 * Build a shortened email draft for when full body exceeds mailto limits
 * 
 * @param params - Request data and context
 * @returns EmailDraft with shorter body
 */
export function buildShortRequestEmailDraft(params: RequestEmailDraftParams): EmailDraft {
  const {
    request,
    supplierName,
    supplierEmail = '',
    userName = 'Ihr TradeTrackr Team',
    companyName = 'TradeTrackr',
    pdfUrl,
    portalUrl,
  } = params;

  const projectShort = formatProjectShort(request.project);
  const subject = `Anfrage ${request.requestNumber}${projectShort} – ${companyName}`;

  const lines: string[] = [];

  lines.push(`Guten Tag ${supplierName},`);
  lines.push('');
  lines.push(`anbei erhalten Sie unsere Anfrage ${request.requestNumber}.`);
  lines.push(`Diese enthält ${request.lineItems?.length || 0} Position(en).`);
  lines.push('');

  if (pdfUrl) {
    lines.push(`PDF-Dokument: ${pdfUrl}`);
    lines.push('');
  }

  if (portalUrl) {
    lines.push(`Vollständige Details im Portal: ${portalUrl}`);
    lines.push('');
  }

  lines.push('Mit freundlichen Grüßen');
  lines.push(userName);
  lines.push(companyName);

  return {
    to: supplierEmail,
    subject,
    body: lines.join('\n'),
  };
}

export default {
  buildRequestEmailDraft,
  buildShortRequestEmailDraft,
};



