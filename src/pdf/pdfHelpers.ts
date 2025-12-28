/**
 * PDF Helper Functions
 * 
 * Shared utilities for PDF generation with jsPDF
 */

import jsPDF from 'jspdf';

// TradeTrackr brand color
export const TRADETRACKR_BLUE = '#058bc0';
export const TRADETRACKR_BLUE_RGB = { r: 5, g: 139, b: 192 };

// Standard A4 dimensions in mm
export const A4_WIDTH = 210;
export const A4_HEIGHT = 297;
export const MARGIN_LEFT = 20;
export const MARGIN_RIGHT = 20;
export const MARGIN_TOP = 20;
export const MARGIN_BOTTOM = 40; // Increased to prevent footer collision (was 35)
export const CONTENT_WIDTH = A4_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;

// Footer area starts here (reserved space for footer)
export const FOOTER_TOP = A4_HEIGHT - MARGIN_BOTTOM;

/**
 * Format a number as German currency
 */
export function formatCurrency(value: number): string {
	return value.toLocaleString('de-DE', { 
		minimumFractionDigits: 2, 
		maximumFractionDigits: 2 
	}) + ' €';
}

/**
 * Format a date as German date string
 */
export function formatDate(dateStr: string | undefined): string {
	if (!dateStr) return '-';
	try {
		return new Date(dateStr).toLocaleDateString('de-DE');
	} catch {
		return dateStr;
	}
}

/**
 * Format quantity for display
 */
export function formatQuantity(value: number): string {
	return value.toLocaleString('de-DE', { 
		minimumFractionDigits: 0, 
		maximumFractionDigits: 2 
	});
}

/**
 * Initialize a new A4 PDF document
 */
export function createPdfDocument(): jsPDF {
	return new jsPDF({
		orientation: 'portrait',
		unit: 'mm',
		format: 'a4',
	});
}

/**
 * Set the TradeTrackr blue color for drawing
 */
export function setBlueColor(doc: jsPDF): void {
	doc.setDrawColor(TRADETRACKR_BLUE_RGB.r, TRADETRACKR_BLUE_RGB.g, TRADETRACKR_BLUE_RGB.b);
	doc.setTextColor(TRADETRACKR_BLUE_RGB.r, TRADETRACKR_BLUE_RGB.g, TRADETRACKR_BLUE_RGB.b);
}

/**
 * Set black color for drawing
 */
export function setBlackColor(doc: jsPDF): void {
	doc.setDrawColor(0, 0, 0);
	doc.setTextColor(0, 0, 0);
}

/**
 * Set gray color for drawing
 */
export function setGrayColor(doc: jsPDF): void {
	doc.setDrawColor(100, 100, 100);
	doc.setTextColor(100, 100, 100);
}

/**
 * Draw a horizontal line
 */
export function drawHorizontalLine(doc: jsPDF, y: number, color: 'blue' | 'black' | 'gray' = 'blue'): void {
	if (color === 'blue') setBlueColor(doc);
	else if (color === 'gray') setGrayColor(doc);
	else setBlackColor(doc);
	
	doc.setLineWidth(0.3);
	doc.line(MARGIN_LEFT, y, A4_WIDTH - MARGIN_RIGHT, y);
	setBlackColor(doc);
}

/**
 * Draw text with automatic wrapping
 * Returns the new Y position after the text
 */
export function drawWrappedText(
	doc: jsPDF, 
	text: string, 
	x: number, 
	y: number, 
	maxWidth: number, 
	lineHeight: number = 5
): number {
	const lines = doc.splitTextToSize(text, maxWidth);
	doc.text(lines, x, y);
	return y + (lines.length * lineHeight);
}

/**
 * Add a new page and return the starting Y position
 */
export function addNewPage(doc: jsPDF): number {
	doc.addPage();
	return MARGIN_TOP;
}

/**
 * Check if there's enough space on the current page
 * If not, add a new page and return the new Y position
 */
export function ensureSpace(doc: jsPDF, currentY: number, neededSpace: number): number {
	if (currentY + neededSpace > A4_HEIGHT - MARGIN_BOTTOM) {
		return addNewPage(doc);
	}
	return currentY;
}

/**
 * Draw a table cell with border
 * 
 * @param noWrap - If true, text will not wrap and may be truncated. Use for numeric values.
 */
export function drawTableCell(
	doc: jsPDF,
	text: string,
	x: number,
	y: number,
	width: number,
	height: number,
	options: {
		align?: 'left' | 'center' | 'right';
		bold?: boolean;
		fontSize?: number;
		padding?: number;
		borderColor?: 'blue' | 'black' | 'gray';
		fillColor?: { r: number; g: number; b: number } | null;
		noWrap?: boolean; // Prevent text wrapping (for headers and numeric values)
	} = {}
): void {
	const { 
		align = 'left', 
		bold = false, 
		fontSize = 9,
		padding = 2,
		borderColor = 'blue',
		fillColor = null,
		noWrap = false,
	} = options;

	// Fill background if specified
	if (fillColor) {
		doc.setFillColor(fillColor.r, fillColor.g, fillColor.b);
		doc.rect(x, y, width, height, 'F');
	}

	// Draw border
	if (borderColor === 'blue') setBlueColor(doc);
	else if (borderColor === 'gray') setGrayColor(doc);
	else setBlackColor(doc);
	
	doc.setLineWidth(0.2);
	doc.rect(x, y, width, height, 'S');

	// Set text style
	setBlackColor(doc);
	doc.setFontSize(fontSize);
	doc.setFont('helvetica', bold ? 'bold' : 'normal');

	// Calculate text position
	const textX = align === 'center' ? x + width / 2 
		: align === 'right' ? x + width - padding 
		: x + padding;
	const textY = y + height / 2 + 1;

	// Handle noWrap mode - draw single line without splitting
	if (noWrap) {
		doc.text(text, textX, textY, { 
			align: align === 'center' ? 'center' : align === 'right' ? 'right' : 'left' 
		});
		return;
	}

	// Draw text (with wrapping if needed)
	const maxTextWidth = width - (padding * 2);
	const lines = doc.splitTextToSize(text, maxTextWidth);
	
	if (lines.length === 1) {
		doc.text(lines[0], textX, textY, { 
			align: align === 'center' ? 'center' : align === 'right' ? 'right' : 'left' 
		});
	} else {
		// Multiple lines - start from top
		const lineHeight = fontSize * 0.4;
		const startY = y + padding + lineHeight;
		lines.forEach((line: string, i: number) => {
			doc.text(line, textX, startY + (i * lineHeight), { 
				align: align === 'center' ? 'center' : align === 'right' ? 'right' : 'left' 
			});
		});
	}
}

/**
 * Calculate the height needed for wrapped text in a cell
 */
export function calculateCellHeight(
	doc: jsPDF,
	text: string,
	width: number,
	fontSize: number = 9,
	padding: number = 2,
	minHeight: number = 7
): number {
	doc.setFontSize(fontSize);
	const maxTextWidth = width - (padding * 2);
	const lines = doc.splitTextToSize(text, maxTextWidth);
	const lineHeight = fontSize * 0.4;
	const calculatedHeight = (lines.length * lineHeight) + (padding * 2);
	return Math.max(calculatedHeight, minHeight);
}

/**
 * Draw a section title
 */
export function drawSectionTitle(doc: jsPDF, text: string, y: number): number {
	setBlueColor(doc);
	doc.setFontSize(11);
	doc.setFont('helvetica', 'bold');
	doc.text(text, MARGIN_LEFT, y);
	setBlackColor(doc);
	return y + 6;
}

/**
 * Draw two-column footer
 * Left: Company info, address, contact
 * Right: Register, tax, VAT, bank details
 * 
 * Both columns are always rendered - right column will show placeholder if no data
 */
export function drawTwoColumnFooter(
	doc: jsPDF, 
	issuer: {
		companyName?: string;
		legalForm?: string;
		street?: string;
		postalCode?: string;
		city?: string;
		country?: string;
		phone?: string;
		email?: string;
		website?: string;
		commercialRegister?: string;
		taxNumber?: string;
		vatId?: string;
		bankName?: string;
		iban?: string;
		bic?: string;
	},
	pageNumber: number,
	totalPages: number
): void {
	const footerY = A4_HEIGHT - 30;
	const lineSpacing = 3;
	const rightColumnX = A4_WIDTH - MARGIN_RIGHT;
	
	// Blue line above footer
	setBlueColor(doc);
	doc.setLineWidth(0.5);
	doc.line(MARGIN_LEFT, footerY - 3, rightColumnX, footerY - 3);

	// Left column - Company, Address, Contact
	const leftLines: string[] = [];
	const companyLine = [issuer.companyName, issuer.legalForm].filter(Boolean).join(' ');
	if (companyLine) leftLines.push(companyLine);
	if (issuer.street) leftLines.push(issuer.street);
	
	const cityLine = [issuer.postalCode, issuer.city].filter(Boolean).join(' ');
	const cityWithCountry = issuer.country && issuer.country !== 'Deutschland' 
		? `${cityLine} · ${issuer.country}` 
		: cityLine;
	if (cityWithCountry) leftLines.push(cityWithCountry);
	
	const contactLine = [
		issuer.phone ? `Tel. ${issuer.phone}` : null,
		issuer.email,
		issuer.website
	].filter(Boolean).join(' · ');
	if (contactLine) leftLines.push(contactLine);

	// Right column - Register, Tax, VAT, Bank
	// IMPORTANT: Always include at least empty array to ensure column renders
	const rightLinesRaw: (string | null)[] = [
		issuer.commercialRegister ? `HR: ${issuer.commercialRegister}` : null,
		issuer.taxNumber ? `Steuernr.: ${issuer.taxNumber}` : null,
		issuer.vatId ? `USt-IdNr.: ${issuer.vatId}` : null,
		issuer.bankName ? `Bank: ${issuer.bankName}` : null,
		issuer.iban ? `IBAN: ${issuer.iban}` : null,
		issuer.bic ? `BIC: ${issuer.bic}` : null,
	];
	const rightLines = rightLinesRaw.filter((line): line is string => line !== null);

	// Draw left column - text in black (not blue)
	doc.setFontSize(7);
	let ly = footerY;
	leftLines.forEach((line, i) => {
		doc.setFont('helvetica', i === 0 ? 'bold' : 'normal');
		setBlackColor(doc); // Changed from blue to black
		doc.text(line, MARGIN_LEFT, ly);
		ly += lineSpacing;
	});

	// Draw right column - ALWAYS draw even if empty (prevents column collapse)
	// Text in black (not blue)
	let ry = footerY;
	doc.setFont('helvetica', 'normal');
	doc.setFontSize(7);
	
	if (rightLines.length > 0) {
		rightLines.forEach((line) => {
			setBlackColor(doc); // Changed from blue to black
			doc.text(line, rightColumnX, ry, { align: 'right' });
			ry += lineSpacing;
		});
	}

	// Page number at bottom
	doc.setFontSize(8);
	setGrayColor(doc);
	doc.text(`Seite ${pageNumber} von ${totalPages}`, rightColumnX, A4_HEIGHT - 5, { align: 'right' });
	
	setBlackColor(doc);
}

/**
 * Download the PDF
 */
export function downloadPdf(doc: jsPDF, filename: string): void {
	doc.save(filename);
}

/**
 * Open PDF in new window for printing
 */
export function openPdfForPrint(doc: jsPDF): void {
	const blob = doc.output('blob');
	const url = URL.createObjectURL(blob);
	const win = window.open(url, '_blank');
	if (win) {
		win.onload = () => win.print();
	}
}

