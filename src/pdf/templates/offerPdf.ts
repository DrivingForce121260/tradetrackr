/**
 * Offer PDF Template
 * 
 * Generates a German-compliant offer (Angebot) PDF
 * Visual reference: ANGEBOT template with TradeTrackr blue styling
 */

import jsPDF from 'jspdf';
import { Offer, TaxKey } from '@/types/invoicing';
import { BrandingSettings } from '@/services/brandingService';
import {
	createPdfDocument,
	MARGIN_LEFT,
	MARGIN_RIGHT,
	MARGIN_TOP,
	A4_WIDTH,
	A4_HEIGHT,
	CONTENT_WIDTH,
	FOOTER_TOP,
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
 * Options for PDF generation
 */
export interface OfferPdfOptions {
	generatedByName?: string; // Name of the user generating the PDF
}

/**
 * Build and render an Offer PDF
 */
export function buildOfferPdf(offer: Offer, issuer: BrandingSettings, options: OfferPdfOptions = {}): jsPDF {
	const doc = createPdfDocument();
	let y = MARGIN_TOP;

	// ========================================
	// HEADER: Title + Document Info
	// ========================================
	y = drawHeader(doc, offer, issuer, y);

	// ========================================
	// CUSTOMER BLOCK
	// ========================================
	y = drawCustomerBlock(doc, offer, y);

	// ========================================
	// INTRO TEXT
	// ========================================
	y = drawIntroText(doc, offer, y);

	// ========================================
	// META TABLE (Leistungszeitraum, Zahlungsziel, etc.)
	// ========================================
	y = drawMetaTable(doc, offer, issuer, y);

	// ========================================
	// POSITIONS TABLE
	// ========================================
	y = drawPositionsTable(doc, offer, issuer, y);

	// ========================================
	// SIGN-OFF + NOTES
	// ========================================
	y = drawSignOffAndNotes(doc, offer, options.generatedByName, y);

	// ========================================
	// FOOTER (on all pages)
	// ========================================
	drawFooter(doc, issuer);

	return doc;
}

/**
 * Draw the compact header section with two columns:
 * - LEFT: Issuer (company) info
 * - RIGHT: Title "ANGEBOT" + offer metadata
 * 
 * Both columns are top-aligned for a compact header.
 */
function drawHeader(doc: jsPDF, offer: Offer, issuer: BrandingSettings, startY: number): number {
	let y = startY;
	const rightX = A4_WIDTH - MARGIN_RIGHT;
	const lineSpacing = 4.5;

	// Calculate validity date
	const validityDays = issuer.offerValidityDays || 14;
	const issueDate = new Date(offer.issueDate);
	const validUntil = new Date(issueDate);
	validUntil.setDate(validUntil.getDate() + validityDays);

	// ========================================
	// RIGHT COLUMN: Title + Meta (top-aligned)
	// ========================================
	
	// Title: ANGEBOT (right-aligned, large)
	setBlueColor(doc);
	doc.setFontSize(20);
	doc.setFont('helvetica', 'bold');
	doc.text('ANGEBOT', rightX, y + 6, { align: 'right' });
	
	// Document metadata (right-aligned, below title)
	setBlackColor(doc);
	doc.setFontSize(9);
	doc.setFont('helvetica', 'normal');
	
	let metaY = y + 14;
	doc.text(`Angebotsnummer: ${offer.number}`, rightX, metaY, { align: 'right' });
	metaY += lineSpacing;
	doc.text(`Datum: ${formatDate(offer.issueDate)}`, rightX, metaY, { align: 'right' });
	metaY += lineSpacing;
	doc.text(`Gültig bis: ${formatDate(validUntil.toISOString())}`, rightX, metaY, { align: 'right' });

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
 * Draw the customer address block
 */
function drawCustomerBlock(doc: jsPDF, offer: Offer, startY: number): number {
	let y = startY;

	doc.setFontSize(9);
	setGrayColor(doc);
	doc.text('Kunde:', MARGIN_LEFT, y);
	y += 5;

	setBlackColor(doc);
	doc.setFontSize(10);
	doc.setFont('helvetica', 'bold');
	
	const customer = offer.clientSnapshot;
	if (customer?.name) {
		doc.text(customer.name, MARGIN_LEFT, y);
		y += 5;
	}

	doc.setFont('helvetica', 'normal');
	doc.setFontSize(9);

	if (customer?.billingAddress?.company) {
		doc.text(customer.billingAddress.company, MARGIN_LEFT, y);
		y += 4;
	}
	
	const fullName = [
		customer?.billingAddress?.firstName,
		customer?.billingAddress?.lastName
	].filter(Boolean).join(' ');
	if (fullName) {
		doc.text(fullName, MARGIN_LEFT, y);
		y += 4;
	}

	if (customer?.billingAddress?.street) {
		doc.text(customer.billingAddress.street, MARGIN_LEFT, y);
		y += 4;
	}

	const cityLine = [
		customer?.billingAddress?.postalCode,
		customer?.billingAddress?.city
	].filter(Boolean).join(' ');
	if (cityLine) {
		doc.text(cityLine, MARGIN_LEFT, y);
		y += 4;
	}

	if (customer?.billingAddress?.country && customer.billingAddress.country !== 'Deutschland') {
		doc.text(customer.billingAddress.country, MARGIN_LEFT, y);
		y += 4;
	}

	y += 8;
	return y;
}

/**
 * Draw intro text / Leistungsbeschreibung
 */
function drawIntroText(doc: jsPDF, offer: Offer, startY: number): number {
	let y = startY;

	if (offer.noteCustomer) {
		doc.setFontSize(9);
		setBlackColor(doc);
		doc.setFont('helvetica', 'normal');
		
		const lines = doc.splitTextToSize(offer.noteCustomer, CONTENT_WIDTH);
		doc.text(lines, MARGIN_LEFT, y);
		y += lines.length * 4 + 6;
	}

	return y;
}

/**
 * Draw meta information table
 */
function drawMetaTable(doc: jsPDF, offer: Offer, issuer: BrandingSettings, startY: number): number {
	let y = startY;

	const cellHeight = 10; // Increased padding
	const colWidth = CONTENT_WIDTH / 2;

	// Row 1: Zahlungsziel | Angebotsart
	drawTableCell(doc, 'Zahlungsziel', MARGIN_LEFT, y, colWidth / 2, cellHeight, 
		{ bold: true, fontSize: 8, fillColor: { r: 240, g: 248, b: 255 }, padding: 4 });
	drawTableCell(doc, issuer.paymentTermsText || '14 Tage netto', MARGIN_LEFT + colWidth / 2, y, colWidth / 2, cellHeight, 
		{ fontSize: 8, padding: 4 });
	drawTableCell(doc, 'Angebotsart', MARGIN_LEFT + colWidth, y, colWidth / 2, cellHeight, 
		{ bold: true, fontSize: 8, fillColor: { r: 240, g: 248, b: 255 }, padding: 4 });
	drawTableCell(doc, 'Pauschal', MARGIN_LEFT + colWidth + colWidth / 2, y, colWidth / 2, cellHeight, 
		{ fontSize: 8, padding: 4 });
	
	y += cellHeight + 10;
	return y;
}

/**
 * Draw positions table with line items
 * 
 * Column widths are explicitly set to ensure proper rendering:
 * - Pos: 14mm (narrow, for position numbers)
 * - Beschreibung: flexible (remaining space)
 * - Menge: 22mm (for quantities)
 * - Einheit: 18mm (for units like Stk, Std)
 * - Einzelpreis: 28mm (for prices with € symbol)
 * - Gesamt: 28mm (for totals with € symbol)
 */
function drawPositionsTable(doc: jsPDF, offer: Offer, issuer: BrandingSettings, startY: number): number {
	let y = startY;

	// Fixed column widths (must sum to CONTENT_WIDTH = 170mm)
	const colPos = 14;           // Position number
	const colMenge = 22;         // Quantity
	const colEinheit = 18;       // Unit
	const colEinzelpreis = 28;   // Unit price
	const colGesamt = 28;        // Line total - EXPLICIT width to prevent vertical text
	const colBeschreibung = CONTENT_WIDTH - colPos - colMenge - colEinheit - colEinzelpreis - colGesamt; // = 60
	
	const headerHeight = 10;

	// Header row - all headers use noWrap to prevent vertical text
	const headerFill = { r: 5, g: 139, b: 192 }; // TradeTrackr blue
	let x = MARGIN_LEFT;
	
	doc.setTextColor(255, 255, 255); // White text for header
	drawTableCell(doc, 'Pos.', x, y, colPos, headerHeight, 
		{ bold: true, fontSize: 8, align: 'center', fillColor: headerFill, padding: 4, noWrap: true });
	x += colPos;
	drawTableCell(doc, 'Beschreibung', x, y, colBeschreibung, headerHeight, 
		{ bold: true, fontSize: 8, fillColor: headerFill, padding: 4, noWrap: true });
	x += colBeschreibung;
	drawTableCell(doc, 'Menge', x, y, colMenge, headerHeight, 
		{ bold: true, fontSize: 8, align: 'right', fillColor: headerFill, padding: 4, noWrap: true });
	x += colMenge;
	drawTableCell(doc, 'Einheit', x, y, colEinheit, headerHeight, 
		{ bold: true, fontSize: 8, align: 'center', fillColor: headerFill, padding: 4, noWrap: true });
	x += colEinheit;
	drawTableCell(doc, 'E-Preis', x, y, colEinzelpreis, headerHeight, 
		{ bold: true, fontSize: 8, align: 'right', fillColor: headerFill, padding: 4, noWrap: true });
	x += colEinzelpreis;
	drawTableCell(doc, 'Gesamt', x, y, colGesamt, headerHeight, 
		{ bold: true, fontSize: 8, align: 'right', fillColor: headerFill, padding: 4, noWrap: true });

	setBlackColor(doc);
	y += headerHeight;

	// Line items
	for (const item of offer.lineItems || []) {
		// Calculate row height based on description length (with increased padding)
		const rowHeight = calculateCellHeight(doc, item.description || '', colBeschreibung, 9, 4, 9);
		
		// Check if we need a new page (reserve more space for totals + sign-off)
		y = ensureSpace(doc, y, rowHeight + 60);

		x = MARGIN_LEFT;
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
	y = drawTotals(doc, offer, issuer, y);

	return y;
}

/**
 * Draw totals section with improved spacing
 */
function drawTotals(doc: jsPDF, offer: Offer, issuer: BrandingSettings, startY: number): number {
	let y = startY;

	const totalsX = A4_WIDTH - MARGIN_RIGHT - 85;
	const labelWidth = 48;
	const valueWidth = 37;
	const rowHeight = 9; // Increased row height

	// Nettosumme
	drawTableCell(doc, 'Nettosumme:', totalsX, y, labelWidth, rowHeight, 
		{ fontSize: 9, align: 'right', borderColor: 'gray', padding: 4 });
	drawTableCell(doc, formatCurrency(offer.totals?.itemNetAfterDiscount || 0), totalsX + labelWidth, y, valueWidth, rowHeight, 
		{ fontSize: 9, align: 'right', borderColor: 'gray', padding: 4 });
	y += rowHeight;

	// VAT handling
	const isSmallBusiness = issuer.isSmallBusiness;
	
	if (!isSmallBusiness && offer.totals?.vatByKey) {
		for (const [key, vatAmount] of Object.entries(offer.totals.vatByKey)) {
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
		? (offer.totals?.itemNetAfterDiscount || 0) 
		: (offer.totals?.grandTotalGross || 0);

	const grandTotalRowHeight = 11;
	setBlueColor(doc);
	drawTableCell(doc, 'Gesamtbetrag:', totalsX, y, labelWidth, grandTotalRowHeight, 
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
 * Draw sign-off section with user name and auto-generation note
 */
function drawSignOffAndNotes(doc: jsPDF, offer: Offer, generatedByName: string | undefined, startY: number): number {
	let y = startY;

	// Ensure we have enough space for sign-off block
	y = ensureSpace(doc, y, 50);

	// Notes (if any)
	if (offer.noteInternal) {
		doc.setFontSize(9);
		setGrayColor(doc);
		doc.text('Interne Notiz:', MARGIN_LEFT, y);
		y += 4;
		setBlackColor(doc);
		const lines = doc.splitTextToSize(offer.noteInternal, CONTENT_WIDTH);
		doc.text(lines, MARGIN_LEFT, y);
		y += lines.length * 4 + 8;
	}

	// Sign-off block
	y += 8;
	doc.setFontSize(10);
	setBlackColor(doc);
	doc.setFont('helvetica', 'normal');
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
 * Generate and download an Offer PDF
 */
export function downloadOfferPdf(offer: Offer, issuer: BrandingSettings, generatedByName?: string): void {
	const doc = buildOfferPdf(offer, issuer, { generatedByName });
	const filename = `Angebot_${offer.number.replace(/[^a-zA-Z0-9-]/g, '_')}.pdf`;
	downloadPdf(doc, filename);
}

/**
 * Generate and open Offer PDF for printing
 */
export function printOfferPdf(offer: Offer, issuer: BrandingSettings, generatedByName?: string): void {
	const doc = buildOfferPdf(offer, issuer, { generatedByName });
	openPdfForPrint(doc);
}
