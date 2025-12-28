/**
 * Invoice PDF Template
 * 
 * Generates a German-compliant invoice (Rechnung) PDF
 * Visual reference: Matches the ANGEBOT template layout with TradeTrackr blue styling
 * 
 * Layout matches offerPdf.ts:
 * - Two-column header (issuer left, title + meta right)
 * - Normalized recipient block (no duplication)
 * - Payment info table with proper IBAN formatting
 * - Positions table with header repeat on page breaks
 * - Totals box aligned right
 * - Two-column footer (black text)
 */

import jsPDF from 'jspdf';
import { Invoice, TaxKey, PaymentStatus } from '@/types/invoicing';
import { BrandingSettings } from '@/services/brandingService';
import {
	createPdfDocument,
	MARGIN_LEFT,
	MARGIN_RIGHT,
	MARGIN_TOP,
	A4_WIDTH,
	A4_HEIGHT,
	CONTENT_WIDTH,
	formatCurrency,
	formatDate,
	formatQuantity,
	setBlueColor,
	setBlackColor,
	setGrayColor,
	drawHorizontalLine,
	drawTableCell,
	calculateCellHeight,
	ensureSpace,
	downloadPdf,
	openPdfForPrint,
	drawTwoColumnFooter,
} from '../pdfHelpers';

// Default tax keys for VAT calculation
const DEFAULT_TAX_KEYS: TaxKey[] = [
	{ key: 'DE19', ratePct: 19, descriptionDe: 'MwSt 19%', descriptionEn: 'VAT 19%' },
	{ key: 'DE7', ratePct: 7, descriptionDe: 'MwSt 7%', descriptionEn: 'VAT 7%' },
	{ key: 'DE0', ratePct: 0, descriptionDe: 'Steuerfrei', descriptionEn: 'Tax-free' },
];

/**
 * Validation result for invoice data
 */
export interface InvoiceValidationResult {
	valid: boolean;
	errors: string[];
}

/**
 * Options for PDF generation
 */
export interface InvoicePdfOptions {
	generatedByName?: string; // Name of the user generating the PDF
}

/**
 * Validate that invoice has all required fields for PDF generation
 */
export function validateInvoiceForPdf(invoice: Invoice): InvoiceValidationResult {
	const errors: string[] = [];
	
	if (!invoice.number?.trim()) {
		errors.push('Rechnungsnummer');
	}
	if (!invoice.issueDate) {
		errors.push('Rechnungsdatum');
	}
	
	return {
		valid: errors.length === 0,
		errors,
	};
}

/**
 * Normalize recipient address to prevent duplication.
 * Returns a clean array of address lines without repeats.
 */
function normalizeRecipient(customer: Invoice['clientSnapshot']): string[] {
	if (!customer) return ['[Kein Empfänger]'];
	
	const lines: string[] = [];
	const seenLines = new Set<string>();
	
	const addLine = (line: string | undefined | null, bold = false) => {
		if (!line) return;
		const trimmed = line.trim();
		const normalized = trimmed.toLowerCase();
		if (trimmed && !seenLines.has(normalized)) {
			seenLines.add(normalized);
			lines.push(trimmed);
		}
	};
	
	// Priority 1: Company name (from billingAddress or customer name)
	const company = customer.billingAddress?.company;
	const customerName = customer.name;
	
	// If customer.name is the company name, use it; otherwise use billingAddress.company
	if (company) {
		addLine(company);
		// If customerName is different from company (and not a person's name pattern), skip it
		if (customerName && customerName.toLowerCase() !== company.toLowerCase()) {
			// Check if customerName looks like a person's name (contains space, no company suffixes)
			const looksLikePersonName = customerName.includes(' ') && 
				!customerName.match(/(GmbH|UG|AG|KG|OHG|e\.K\.|GbR)/i);
			if (looksLikePersonName) {
				// It's a contact person, add as "z.Hd." line
				addLine(`z.Hd. ${customerName}`);
			}
		}
	} else if (customerName) {
		addLine(customerName);
	}
	
	// Priority 2: Contact person (firstName + lastName) - only if different from above
	const firstName = customer.billingAddress?.firstName;
	const lastName = customer.billingAddress?.lastName;
	const fullName = [firstName, lastName].filter(Boolean).join(' ');
	if (fullName) {
		addLine(fullName);
	}
	
	// Priority 3: Street address
	addLine(customer.billingAddress?.street);
	
	// Priority 4: Postal code + City
	const postalCode = customer.billingAddress?.postalCode;
	const city = customer.billingAddress?.city;
	const cityLine = [postalCode, city].filter(Boolean).join(' ');
	addLine(cityLine);
	
	// Priority 5: Country (only if not Germany)
	const country = customer.billingAddress?.country;
	if (country && country !== 'Deutschland' && country !== 'Germany') {
		addLine(country);
	}
	
	return lines.length > 0 ? lines : ['[Kein Empfänger]'];
}

/**
 * Format IBAN with consistent spacing (groups of 4).
 * Keeps IBAN together to prevent mid-number line breaks.
 */
function formatIban(iban: string | undefined): string {
	if (!iban) return '';
	// Remove all spaces first, then format in groups of 4
	const clean = iban.replace(/\s/g, '').toUpperCase();
	return clean.match(/.{1,4}/g)?.join(' ') || clean;
}

/**
 * Build and render an Invoice PDF
 */
export function buildInvoicePdf(invoice: Invoice, issuer: BrandingSettings, options: InvoicePdfOptions = {}): jsPDF {
	const doc = createPdfDocument();
	let y = MARGIN_TOP;

	// ========================================
	// HEADER: Two-column layout (matching Offer)
	// Left: Issuer info
	// Right: Title "RECHNUNG" + metadata
	// ========================================
	y = drawHeader(doc, invoice, issuer, y);

	// ========================================
	// CUSTOMER BLOCK (normalized, no duplication)
	// ========================================
	y = drawCustomerBlock(doc, invoice, y);

	// ========================================
	// INTRO TEXT (if any)
	// ========================================
	y = drawIntroText(doc, invoice, y);

	// ========================================
	// PAYMENT INFO TABLE (improved IBAN formatting)
	// ========================================
	y = drawPaymentTable(doc, invoice, issuer, y);

	// ========================================
	// POSITIONS TABLE (with header repeat)
	// ========================================
	y = drawPositionsTable(doc, invoice, issuer, y);

	// ========================================
	// SIGN-OFF + NOTES
	// ========================================
	y = drawSignOffAndNotes(doc, invoice, options.generatedByName, y);

	// ========================================
	// PAYMENT STATUS WATERMARK (if paid)
	// ========================================
	drawPaymentStatusWatermark(doc, invoice);

	// ========================================
	// FOOTER (on all pages)
	// ========================================
	drawFooter(doc, issuer);

	return doc;
}

/**
 * Draw the two-column header section (matches Offer layout):
 * - LEFT: Issuer (company) info
 * - RIGHT: Title "RECHNUNG" + invoice metadata
 */
function drawHeader(doc: jsPDF, invoice: Invoice, issuer: BrandingSettings, startY: number): number {
	let y = startY;
	const rightX = A4_WIDTH - MARGIN_RIGHT;
	const lineSpacing = 4.5;

	// ========================================
	// RIGHT COLUMN: Title + Meta (top-aligned)
	// ========================================
	
	// Title: RECHNUNG (right-aligned, large)
	setBlueColor(doc);
	doc.setFontSize(20);
	doc.setFont('helvetica', 'bold');
	doc.text('RECHNUNG', rightX, y + 6, { align: 'right' });
	
	// Document metadata (right-aligned, below title)
	setBlackColor(doc);
	doc.setFontSize(9);
	doc.setFont('helvetica', 'normal');
	
	let metaY = y + 14;
	doc.text(`Rechnungsnummer: ${invoice.number || '-'}`, rightX, metaY, { align: 'right' });
	metaY += lineSpacing;
	doc.text(`Rechnungsdatum: ${formatDate(invoice.issueDate)}`, rightX, metaY, { align: 'right' });
	metaY += lineSpacing;
	doc.text(`Leistungsdatum: ${formatDate(invoice.issueDate)}`, rightX, metaY, { align: 'right' });
	
	if (invoice.dueDate) {
		metaY += lineSpacing;
		doc.text(`Zahlbar bis: ${formatDate(invoice.dueDate)}`, rightX, metaY, { align: 'right' });
	}

	// ========================================
	// LEFT COLUMN: Issuer (company) info (top-aligned)
	// ========================================
	
	let leftY = y;
	
	// Company name + legal form (bold)
	doc.setFontSize(10);
	doc.setFont('helvetica', 'bold');
	doc.text(`${issuer.companyName || ''} ${issuer.legalForm || ''}`.trim(), MARGIN_LEFT, leftY);
	leftY += 5;
	
	// Address and contact (normal)
	doc.setFont('helvetica', 'normal');
	doc.setFontSize(9);
	
	if (issuer.street) {
		doc.text(issuer.street, MARGIN_LEFT, leftY);
		leftY += lineSpacing;
	}
	
	// City line with optional country
	const cityParts = [issuer.postalCode, issuer.city].filter(Boolean).join(' ');
	const cityWithCountry = issuer.country && issuer.country !== 'Deutschland'
		? `${cityParts} · ${issuer.country}`
		: cityParts;
	if (cityWithCountry) {
		doc.text(cityWithCountry, MARGIN_LEFT, leftY);
		leftY += lineSpacing;
	}
	
	// Contact line (phone, email, website combined)
	const contactParts = [
		issuer.phone ? `Tel: ${issuer.phone}` : null,
		issuer.email,
		issuer.website
	].filter(Boolean);
	if (contactParts.length > 0) {
		doc.text(contactParts.join(' · '), MARGIN_LEFT, leftY);
		leftY += lineSpacing;
	}

	// Determine the bottom of the header (max of both columns)
	const headerBottom = Math.max(metaY, leftY) + 6;
	
	// Horizontal separator line
	drawHorizontalLine(doc, headerBottom, 'blue');
	
	return headerBottom + 8;
}

/**
 * Draw the customer address block (normalized, no duplication)
 */
function drawCustomerBlock(doc: jsPDF, invoice: Invoice, startY: number): number {
	let y = startY;

	doc.setFontSize(9);
	setGrayColor(doc);
	doc.text('Rechnungsempfänger:', MARGIN_LEFT, y);
	y += 5;

	setBlackColor(doc);
	const lines = normalizeRecipient(invoice.clientSnapshot);
	
	lines.forEach((line, index) => {
		if (index === 0) {
			doc.setFontSize(10);
			doc.setFont('helvetica', 'bold');
		} else {
			doc.setFontSize(9);
			doc.setFont('helvetica', 'normal');
		}
		doc.text(line, MARGIN_LEFT, y);
		y += index === 0 ? 5 : 4;
	});

	// Customer VAT ID if present
	if (invoice.clientSnapshot?.vatId) {
		y += 2;
		setGrayColor(doc);
		doc.setFontSize(9);
		doc.text(`USt-IdNr.: ${invoice.clientSnapshot.vatId}`, MARGIN_LEFT, y);
		setBlackColor(doc);
		y += 4;
	}

	y += 8;
	return y;
}

/**
 * Draw intro text / reference
 */
function drawIntroText(doc: jsPDF, invoice: Invoice, startY: number): number {
	let y = startY;

	// Reference to related order (human-readable order number only - NEVER show Firestore ID)
	// Note: resolveInvoiceOrderNumber() should be called before PDF generation for legacy invoices
	if (invoice.relatedOrderNumber) {
		doc.setFontSize(9);
		setGrayColor(doc);
		doc.text(`Bezug: Auftrag ${invoice.relatedOrderNumber}`, MARGIN_LEFT, y);
		setBlackColor(doc);
		y += 6;
	} else if (invoice.relatedOrderId) {
		// Legacy invoice without resolved order number - show "(unbekannt)" instead of Firestore ID
		doc.setFontSize(9);
		setGrayColor(doc);
		doc.text('Bezug: Auftrag (unbekannt)', MARGIN_LEFT, y);
		console.warn(`Invoice ${invoice.number || invoice.id} has relatedOrderId but no relatedOrderNumber. Call resolveInvoiceOrderNumber() before PDF generation.`);
		setBlackColor(doc);
		y += 6;
	}

	if (invoice.noteCustomer) {
		doc.setFontSize(9);
		setBlackColor(doc);
		doc.setFont('helvetica', 'normal');
		
		const lines = doc.splitTextToSize(invoice.noteCustomer, CONTENT_WIDTH);
		doc.text(lines, MARGIN_LEFT, y);
		y += lines.length * 4 + 6;
	}

	return y;
}

/**
 * Draw payment information table with improved IBAN formatting.
 * Bank details are displayed in separate rows to prevent awkward line breaks.
 */
function drawPaymentTable(doc: jsPDF, invoice: Invoice, issuer: BrandingSettings, startY: number): number {
	let y = startY;

	const cellHeight = 10;
	const colWidth = CONTENT_WIDTH / 2;
	const labelWidth = colWidth / 2;
	const valueWidth = colWidth / 2;

	const lightBlue = { r: 240, g: 248, b: 255 };

	// Row 1: Zahlbar bis | Zahlungsart
	const dueDate = invoice.dueDate 
		? formatDate(invoice.dueDate) 
		: 'Sofort fällig';
	
	drawTableCell(doc, 'Zahlbar bis', MARGIN_LEFT, y, labelWidth, cellHeight, 
		{ bold: true, fontSize: 8, fillColor: lightBlue, padding: 4 });
	drawTableCell(doc, dueDate, MARGIN_LEFT + labelWidth, y, valueWidth, cellHeight, 
		{ fontSize: 8, padding: 4 });
	drawTableCell(doc, 'Zahlungsart', MARGIN_LEFT + colWidth, y, labelWidth, cellHeight, 
		{ bold: true, fontSize: 8, fillColor: lightBlue, padding: 4 });
	drawTableCell(doc, 'Überweisung', MARGIN_LEFT + colWidth + labelWidth, y, valueWidth, cellHeight, 
		{ fontSize: 8, padding: 4 });
	
	y += cellHeight;

	// Row 2: Verwendungszweck | Bank
	drawTableCell(doc, 'Verwendungszweck', MARGIN_LEFT, y, labelWidth, cellHeight, 
		{ bold: true, fontSize: 8, fillColor: lightBlue, padding: 4 });
	drawTableCell(doc, invoice.number || '-', MARGIN_LEFT + labelWidth, y, valueWidth, cellHeight, 
		{ fontSize: 8, padding: 4 });
	drawTableCell(doc, 'Bank', MARGIN_LEFT + colWidth, y, labelWidth, cellHeight, 
		{ bold: true, fontSize: 8, fillColor: lightBlue, padding: 4 });
	drawTableCell(doc, issuer.bankName || '-', MARGIN_LEFT + colWidth + labelWidth, y, valueWidth, cellHeight, 
		{ fontSize: 8, padding: 4 });
	
	y += cellHeight;

	// Row 3: (empty left) | IBAN
	drawTableCell(doc, '', MARGIN_LEFT, y, labelWidth, cellHeight, 
		{ fontSize: 8, padding: 4 });
	drawTableCell(doc, '', MARGIN_LEFT + labelWidth, y, valueWidth, cellHeight, 
		{ fontSize: 8, padding: 4 });
	drawTableCell(doc, 'IBAN', MARGIN_LEFT + colWidth, y, labelWidth, cellHeight, 
		{ bold: true, fontSize: 8, fillColor: lightBlue, padding: 4 });
	drawTableCell(doc, formatIban(issuer.iban), MARGIN_LEFT + colWidth + labelWidth, y, valueWidth, cellHeight, 
		{ fontSize: 8, padding: 4, noWrap: true });
	
	y += cellHeight;

	// Row 4: (empty left) | BIC (if present)
	if (issuer.bic) {
		drawTableCell(doc, '', MARGIN_LEFT, y, labelWidth, cellHeight, 
			{ fontSize: 8, padding: 4 });
		drawTableCell(doc, '', MARGIN_LEFT + labelWidth, y, valueWidth, cellHeight, 
			{ fontSize: 8, padding: 4 });
		drawTableCell(doc, 'BIC', MARGIN_LEFT + colWidth, y, labelWidth, cellHeight, 
			{ bold: true, fontSize: 8, fillColor: lightBlue, padding: 4 });
		drawTableCell(doc, issuer.bic, MARGIN_LEFT + colWidth + labelWidth, y, valueWidth, cellHeight, 
			{ fontSize: 8, padding: 4 });
		
		y += cellHeight;
	}
	
	y += 10;
	return y;
}

/**
 * Draw positions table with line items.
 * Matches Offer table layout with header repeat on page breaks.
 * 
 * Column widths (must sum to CONTENT_WIDTH = 170mm):
 * - Pos: 14mm (position numbers)
 * - Beschreibung: 60mm (flexible, remaining space)
 * - Menge: 22mm (quantities)
 * - Einheit: 18mm (units like Stk, Std)
 * - Einzelpreis: 28mm (unit prices)
 * - Gesamt: 28mm (line totals)
 */
function drawPositionsTable(doc: jsPDF, invoice: Invoice, issuer: BrandingSettings, startY: number): number {
	let y = startY;

	// Fixed column widths (must sum to CONTENT_WIDTH = 170mm)
	const colPos = 14;
	const colMenge = 22;
	const colEinheit = 18;
	const colEinzelpreis = 28;
	const colGesamt = 28;
	const colBeschreibung = CONTENT_WIDTH - colPos - colMenge - colEinheit - colEinzelpreis - colGesamt; // = 60
	
	const headerHeight = 10;
	const headerFill = { r: 5, g: 139, b: 192 }; // TradeTrackr blue

	// Function to draw table header
	const drawTableHeader = (startY: number): number => {
		let x = MARGIN_LEFT;
		
		doc.setTextColor(255, 255, 255); // White text for header
		drawTableCell(doc, 'Pos.', x, startY, colPos, headerHeight, 
			{ bold: true, fontSize: 8, align: 'center', fillColor: headerFill, padding: 4, noWrap: true });
		x += colPos;
		drawTableCell(doc, 'Beschreibung', x, startY, colBeschreibung, headerHeight, 
			{ bold: true, fontSize: 8, fillColor: headerFill, padding: 4, noWrap: true });
		x += colBeschreibung;
		drawTableCell(doc, 'Menge', x, startY, colMenge, headerHeight, 
			{ bold: true, fontSize: 8, align: 'right', fillColor: headerFill, padding: 4, noWrap: true });
		x += colMenge;
		drawTableCell(doc, 'Einheit', x, startY, colEinheit, headerHeight, 
			{ bold: true, fontSize: 8, align: 'center', fillColor: headerFill, padding: 4, noWrap: true });
		x += colEinheit;
		drawTableCell(doc, 'E-Preis', x, startY, colEinzelpreis, headerHeight, 
			{ bold: true, fontSize: 8, align: 'right', fillColor: headerFill, padding: 4, noWrap: true });
		x += colEinzelpreis;
		drawTableCell(doc, 'Gesamt', x, startY, colGesamt, headerHeight, 
			{ bold: true, fontSize: 8, align: 'right', fillColor: headerFill, padding: 4, noWrap: true });

		setBlackColor(doc);
		return startY + headerHeight;
	};

	// Draw initial header
	y = drawTableHeader(y);

	// Line items
	const items = invoice.lineItems || [];
	for (let i = 0; i < items.length; i++) {
		const item = items[i];
		
		// Calculate row height based on description length
		const rowHeight = calculateCellHeight(doc, item.description || '', colBeschreibung, 9, 4, 9);
		
		// Check if we need a new page (reserve space for totals + sign-off)
		const spaceNeeded = rowHeight + 70;
		if (y + spaceNeeded > A4_HEIGHT - 40) {
			// Add new page and redraw header
			doc.addPage();
			y = MARGIN_TOP;
			y = drawTableHeader(y);
		}

		let x = MARGIN_LEFT;
		drawTableCell(doc, String(item.position), x, y, colPos, rowHeight, 
			{ fontSize: 9, align: 'center', padding: 4, noWrap: true });
		x += colPos;
		drawTableCell(doc, item.description || '', x, y, colBeschreibung, rowHeight, 
			{ fontSize: 9, padding: 4 }); // Description can wrap
		x += colBeschreibung;
		drawTableCell(doc, formatQuantity(item.quantity || 0), x, y, colMenge, rowHeight, 
			{ fontSize: 9, align: 'right', padding: 4, noWrap: true });
		x += colMenge;
		drawTableCell(doc, item.unit || '', x, y, colEinheit, rowHeight, 
			{ fontSize: 9, align: 'center', padding: 4, noWrap: true });
		x += colEinheit;
		drawTableCell(doc, formatCurrency(item.unitPrice || 0), x, y, colEinzelpreis, rowHeight, 
			{ fontSize: 9, align: 'right', padding: 4, noWrap: true });
		x += colEinzelpreis;
		
		const lineTotal = (item.quantity || 0) * (item.unitPrice || 0) * (1 - (item.discountPct || 0) / 100);
		drawTableCell(doc, formatCurrency(lineTotal), x, y, colGesamt, rowHeight, 
			{ fontSize: 9, align: 'right', padding: 4, noWrap: true });

		y += rowHeight;
	}

	y += 8; // Vertical spacing before totals

	// ========================================
	// TOTALS SECTION
	// ========================================
	y = drawTotals(doc, invoice, issuer, y);

	return y;
}

/**
 * Draw totals section (matches Offer layout)
 */
function drawTotals(doc: jsPDF, invoice: Invoice, issuer: BrandingSettings, startY: number): number {
	let y = startY;

	// Ensure space for totals on same page as last items
	y = ensureSpace(doc, y, 50);

	const totalsX = A4_WIDTH - MARGIN_RIGHT - 85;
	const labelWidth = 48;
	const valueWidth = 37;
	const rowHeight = 9;

	// Nettosumme
	drawTableCell(doc, 'Nettosumme:', totalsX, y, labelWidth, rowHeight, 
		{ fontSize: 9, align: 'right', borderColor: 'gray', padding: 4 });
	drawTableCell(doc, formatCurrency(invoice.totals?.itemNetAfterDiscount || 0), totalsX + labelWidth, y, valueWidth, rowHeight, 
		{ fontSize: 9, align: 'right', borderColor: 'gray', padding: 4 });
	y += rowHeight;

	// VAT handling
	const isSmallBusiness = issuer.isSmallBusiness;
	
	if (!isSmallBusiness && invoice.totals?.vatByKey) {
		for (const [key, vatAmount] of Object.entries(invoice.totals.vatByKey)) {
			const taxKey = DEFAULT_TAX_KEYS.find(t => t.key === key);
			const rate = taxKey?.ratePct || 0;
			
			if (rate > 0) {
				drawTableCell(doc, `MwSt ${rate}%:`, totalsX, y, labelWidth, rowHeight, 
					{ fontSize: 9, align: 'right', borderColor: 'gray', padding: 4 });
				drawTableCell(doc, formatCurrency(vatAmount as number), totalsX + labelWidth, y, valueWidth, rowHeight, 
					{ fontSize: 9, align: 'right', borderColor: 'gray', padding: 4 });
				y += rowHeight;
			}
		}
	}

	// Grand total with more prominence
	const grandTotal = isSmallBusiness 
		? (invoice.totals?.itemNetAfterDiscount || 0) 
		: (invoice.totals?.grandTotalGross || 0);

	const grandTotalRowHeight = 11;
	setBlueColor(doc);
	drawTableCell(doc, 'Rechnungsbetrag:', totalsX, y, labelWidth, grandTotalRowHeight, 
		{ bold: true, fontSize: 10, align: 'right', padding: 4 });
	drawTableCell(doc, formatCurrency(grandTotal), totalsX + labelWidth, y, valueWidth, grandTotalRowHeight, 
		{ bold: true, fontSize: 10, align: 'right', padding: 4 });
	setBlackColor(doc);
	y += grandTotalRowHeight;

	// Small business note
	if (isSmallBusiness) {
		y += 6;
		doc.setFontSize(8);
		setGrayColor(doc);
		doc.text('Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.', totalsX, y);
		setBlackColor(doc);
		y += 4;
	}

	y += 12;
	return y;
}

/**
 * Draw payment status watermark on all pages.
 * Uses clean text rendering (no special characters that might not render).
 */
function drawPaymentStatusWatermark(doc: jsPDF, invoice: Invoice): void {
	// Determine payment status
	const isPaid = invoice.state === 'paid' || invoice.paymentStatus === 'paid';
	const isOverpaid = invoice.paymentStatus === 'overpaid';
	const isOverdue = invoice.state === 'overdue';
	
	if (!isPaid && !isOverpaid && !isOverdue) return;
	
	const totalPages = doc.getNumberOfPages();
	
	for (let i = 1; i <= totalPages; i++) {
		doc.setPage(i);
		
		if (isPaid || isOverpaid) {
			// Green "BEZAHLT" watermark
			doc.setFontSize(48);
			doc.setFont('helvetica', 'bold');
			doc.setTextColor(0, 150, 0); // Green
			doc.setGState(doc.GState({ opacity: 0.15 }));
			
			// Draw diagonally across the page
			doc.text('BEZAHLT', A4_WIDTH / 2, A4_HEIGHT / 2, {
				align: 'center',
				angle: 45,
			});
			
			// Reset opacity and color
			doc.setGState(doc.GState({ opacity: 1 }));
			setBlackColor(doc);
		} else if (isOverdue) {
			// Red "ÜBERFÄLLIG" watermark
			doc.setFontSize(40);
			doc.setFont('helvetica', 'bold');
			doc.setTextColor(200, 50, 50); // Red
			doc.setGState(doc.GState({ opacity: 0.12 }));
			
			doc.text('ÜBERFÄLLIG', A4_WIDTH / 2, A4_HEIGHT / 2, {
				align: 'center',
				angle: 45,
			});
			
			doc.setGState(doc.GState({ opacity: 1 }));
			setBlackColor(doc);
		}
	}
	
	// Ensure we're back on the last page
	doc.setPage(totalPages);
}

/**
 * Draw sign-off section with user name and auto-generation note
 * (matches Offer layout)
 */
function drawSignOffAndNotes(doc: jsPDF, invoice: Invoice, generatedByName: string | undefined, startY: number): number {
	let y = startY;

	// Ensure we have enough space for sign-off block
	y = ensureSpace(doc, y, 50);

	// Internal notes (if any)
	if (invoice.noteInternal) {
		doc.setFontSize(9);
		setGrayColor(doc);
		doc.text('Interne Notiz:', MARGIN_LEFT, y);
		y += 4;
		setBlackColor(doc);
		const lines = doc.splitTextToSize(invoice.noteInternal, CONTENT_WIDTH);
		doc.text(lines, MARGIN_LEFT, y);
		y += lines.length * 4 + 8;
	}

	// Thanks message
	y += 5;
	doc.setFontSize(10);
	doc.setFont('helvetica', 'normal');
	setBlackColor(doc);
	doc.text('Vielen Dank für Ihren Auftrag!', MARGIN_LEFT, y);
	y += 8;
	
	// Sign-off block
	doc.text('Mit freundlichen Grüßen', MARGIN_LEFT, y);
	y += 6;
	
	// User name (if provided)
	if (generatedByName) {
		doc.setFont('helvetica', 'bold');
		doc.text(generatedByName, MARGIN_LEFT, y);
		doc.setFont('helvetica', 'normal');
		y += 5;
	}
	
	// Auto-generation note
	y += 3;
	doc.setFontSize(9);
	setBlueColor(doc);
	doc.text('Dieses Dokument wurde elektronisch erstellt und ist auch ohne Unterschrift gültig.', MARGIN_LEFT, y);
	setBlackColor(doc);

	return y;
}

/**
 * Draw footer on all pages with two-column layout
 * (uses shared helper from pdfHelpers.ts)
 */
function drawFooter(doc: jsPDF, issuer: BrandingSettings): void {
	const totalPages = doc.getNumberOfPages();
	
	for (let i = 1; i <= totalPages; i++) {
		doc.setPage(i);
		drawTwoColumnFooter(doc, issuer, i, totalPages);
	}
	
	setBlackColor(doc);
}

/**
 * Generate and download an Invoice PDF
 */
export function downloadInvoicePdf(invoice: Invoice, issuer: BrandingSettings, generatedByName?: string): void {
	const doc = buildInvoicePdf(invoice, issuer, { generatedByName });
	const filename = `Rechnung_${invoice.number.replace(/[^a-zA-Z0-9-]/g, '_')}.pdf`;
	downloadPdf(doc, filename);
}

/**
 * Generate and open Invoice PDF for printing
 */
export function printInvoicePdf(invoice: Invoice, issuer: BrandingSettings, generatedByName?: string): void {
	const doc = buildInvoicePdf(invoice, issuer, { generatedByName });
	openPdfForPrint(doc);
}
