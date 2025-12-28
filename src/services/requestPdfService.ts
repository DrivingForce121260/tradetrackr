/**
 * Request PDF Service
 * 
 * Client-side service for generating and managing procurement request PDFs.
 * Mirrors the pattern from offer PDF service.
 */

import { getFunctions, httpsCallable } from 'firebase/functions';

interface GenerateRequestPdfInput {
  concernId: string;
  requestId: string;
}

interface GenerateRequestPdfResult {
  storagePath: string;
  downloadUrl: string;
  fileName: string;
  generatedAt: string;
}

interface SendRequestEmailInput {
  concernId: string;
  requestId: string;
  toEmail?: string;
  subject?: string;
  body?: string;
  attachPdf?: boolean;
}

interface SendRequestEmailResult {
  success: boolean;
  messageId?: string;
  sentTo: string;
  sentAt: string;
}

/**
 * Generate PDF for a procurement request
 * 
 * @param concernId - The concern/tenant ID
 * @param requestId - The procurement request ID
 * @returns PDF generation result with download URL
 */
export async function generateRequestPdf(
  concernId: string,
  requestId: string
): Promise<GenerateRequestPdfResult> {
  const functions = getFunctions(undefined, 'europe-west1');
  const generatePdf = httpsCallable<GenerateRequestPdfInput, GenerateRequestPdfResult>(
    functions,
    'generateRequestPdf'
  );

  const result = await generatePdf({ concernId, requestId });
  return result.data;
}

/**
 * Send procurement request email to supplier
 * 
 * @param input - Email sending parameters
 * @returns Email sending result
 */
export async function sendRequestEmail(
  input: SendRequestEmailInput
): Promise<SendRequestEmailResult> {
  const functions = getFunctions(undefined, 'europe-west1');
  const sendEmail = httpsCallable<SendRequestEmailInput, SendRequestEmailResult>(
    functions,
    'sendRequestEmail'
  );

  const result = await sendEmail(input);
  return result.data;
}

/**
 * Open the generated PDF in a new tab
 * 
 * @param downloadUrl - The signed download URL
 */
export function openRequestPdf(downloadUrl: string): void {
  window.open(downloadUrl, '_blank');
}

export const requestPdfService = {
  generateRequestPdf,
  sendRequestEmail,
  openRequestPdf,
};

export default requestPdfService;



