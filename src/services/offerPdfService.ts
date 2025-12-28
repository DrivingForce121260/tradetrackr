/**
 * Offer PDF Service
 * 
 * Client-side service for offer PDF workflows and email integration.
 * Uses the centralized PDF generation from /src/pdf/
 */

import { Offer } from '@/types/invoicing';
import { BrandingSettings } from '@/services/brandingService';
import { downloadOfferPdf } from '@/pdf';

/**
 * Build mailto URL for sending an offer
 * 
 * @param params - Email parameters
 * @returns Encoded mailto URL
 */
export function buildOfferMailto(params: {
	to?: string;
	offerNumber: string;
	customerName?: string;
	optionalMessage?: string;
	senderName?: string;
}): string {
	const { to, offerNumber, customerName, optionalMessage, senderName } = params;
	
	const subject = `Angebot ${offerNumber}`;
	
	// Build body
	let body = '';
	
	if (customerName) {
		body += `Sehr geehrte/r ${customerName},\n\n`;
	} else {
		body += `Sehr geehrte Damen und Herren,\n\n`;
	}
	
	body += `anbei erhalten Sie unser Angebot Nr. ${offerNumber}.\n\n`;
	
	if (optionalMessage) {
		body += `${optionalMessage}\n\n`;
	}
	
	body += `Wir freuen uns auf Ihre Rückmeldung und stehen für Rückfragen gerne zur Verfügung.\n\n`;
	body += `Mit freundlichen Grüßen\n`;
	body += senderName || 'Ihr Team';
	body += '\n\n';
	
	// Add attachment instruction
	body += `---\n`;
	body += `📎 HINWEIS: Das PDF wurde soeben heruntergeladen.\n`;
	body += `Bitte fügen Sie die Datei aus Ihrem Download-Ordner als Anhang hinzu.\n`;
	body += `---`;
	
	// Build mailto URL
	const mailtoParams = [
		`subject=${encodeURIComponent(subject)}`,
		`body=${encodeURIComponent(body)}`,
	];
	
	const recipientPart = to ? encodeURIComponent(to) : '';
	
	return `mailto:${recipientPart}?${mailtoParams.join('&')}`;
}

/**
 * One-click email flow: download PDF and open email client
 * 
 * Workflow:
 * 1. Downloads the offer as PDF
 * 2. Opens email client with prefilled subject/body
 * 
 * @param params - All parameters needed for the flow
 */
export function sendOfferViaEmail(params: {
	offer: Offer;
	branding: BrandingSettings;
	recipientEmail?: string;
	customerName?: string;
	senderName?: string;
	onProgress?: (step: 'generating' | 'opening') => void;
}): void {
	const { offer, branding, recipientEmail, customerName, senderName, onProgress } = params;
	
	// Step 1: Download PDF
	onProgress?.('generating');
	downloadOfferPdf(offer, branding, senderName);
	
	// Step 2: Open email client after a short delay
	onProgress?.('opening');
	
	setTimeout(() => {
		const mailtoUrl = buildOfferMailto({
			to: recipientEmail,
			offerNumber: offer.number,
			customerName,
			senderName,
		});
		
		window.location.href = mailtoUrl;
	}, 500);
}
