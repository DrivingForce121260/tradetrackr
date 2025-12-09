// ============================================================================
// DOCUMENT FIELD DEFINITIONS - For all 26 document types
// ============================================================================

import { DocumentType } from '@/types/documents';

export interface DocumentField {
  name: string;
  label: string;
  labelDe: string;
  type: 'text' | 'number' | 'date' | 'textarea' | 'select';
  required: boolean;
  placeholder?: string;
  options?: string[]; // For select fields
  description?: string;
}

export const DOCUMENT_FIELDS: Record<DocumentType, DocumentField[]> = {
  // ========================================================================
  // PROJECT DOCUMENTS
  // ========================================================================
  
  'project.site_daily_report': [
    { name: 'reportDate', label: 'Report Date', labelDe: 'Berichtsdatum', type: 'date', required: true },
    { name: 'projectNumber', label: 'Project Number', labelDe: 'Projektnummer', type: 'text', required: true },
    { name: 'siteName', label: 'Site Name', labelDe: 'Baustellenname', type: 'text', required: true },
    { name: 'weather', label: 'Weather', labelDe: 'Wetter', type: 'text', required: false },
    { name: 'temperature', label: 'Temperature', labelDe: 'Temperatur', type: 'text', required: false },
    { name: 'workersPresent', label: 'Workers Present', labelDe: 'Anwesende Arbeiter', type: 'number', required: false },
    { name: 'workDescription', label: 'Work Description', labelDe: 'Arbeitsbeschreibung', type: 'textarea', required: true },
    { name: 'progress', label: 'Progress %', labelDe: 'Fortschritt %', type: 'number', required: false },
    { name: 'issues', label: 'Issues/Problems', labelDe: 'Probleme/Hindernisse', type: 'textarea', required: false },
    { name: 'nextSteps', label: 'Next Steps', labelDe: 'Nächste Schritte', type: 'textarea', required: false },
    { name: 'reportedBy', label: 'Reported By', labelDe: 'Erstellt von', type: 'text', required: true }
  ],

  'project.task_work_order': [
    { name: 'orderNumber', label: 'Order Number', labelDe: 'Auftragsnummer', type: 'text', required: true },
    { name: 'orderDate', label: 'Order Date', labelDe: 'Auftragsdatum', type: 'date', required: true },
    { name: 'projectNumber', label: 'Project Number', labelDe: 'Projektnummer', type: 'text', required: true },
    { name: 'taskTitle', label: 'Task Title', labelDe: 'Aufgabentitel', type: 'text', required: true },
    { name: 'taskDescription', label: 'Task Description', labelDe: 'Aufgabenbeschreibung', type: 'textarea', required: true },
    { name: 'assignedTo', label: 'Assigned To', labelDe: 'Zugewiesen an', type: 'text', required: true },
    { name: 'dueDate', label: 'Due Date', labelDe: 'Fälligkeitsdatum', type: 'date', required: true },
    { name: 'priority', label: 'Priority', labelDe: 'Priorität', type: 'select', required: true, options: ['Niedrig', 'Mittel', 'Hoch', 'Dringend'] },
    { name: 'estimatedHours', label: 'Estimated Hours', labelDe: 'Geschätzte Stunden', type: 'number', required: false },
    { name: 'specialInstructions', label: 'Special Instructions', labelDe: 'Besondere Anweisungen', type: 'textarea', required: false }
  ],

  'project.handover': [
    { name: 'handoverDate', label: 'Handover Date', labelDe: 'Übergabedatum', type: 'date', required: true },
    { name: 'projectNumber', label: 'Project Number', labelDe: 'Projektnummer', type: 'text', required: true },
    { name: 'projectName', label: 'Project Name', labelDe: 'Projektname', type: 'text', required: true },
    { name: 'completionStatus', label: 'Completion Status', labelDe: 'Fertigstellungsgrad %', type: 'number', required: true },
    { name: 'handedOverBy', label: 'Handed Over By', labelDe: 'Übergeben von', type: 'text', required: true },
    { name: 'receivedBy', label: 'Received By', labelDe: 'Empfangen von', type: 'text', required: true },
    { name: 'defects', label: 'Defects/Issues', labelDe: 'Mängel/Probleme', type: 'textarea', required: false },
    { name: 'pendingWork', label: 'Pending Work', labelDe: 'Ausstehende Arbeiten', type: 'textarea', required: false },
    { name: 'warranty', label: 'Warranty Info', labelDe: 'Gewährleistung', type: 'textarea', required: false },
    { name: 'clientSignature', label: 'Client Signature', labelDe: 'Unterschrift Kunde', type: 'text', required: false }
  ],

  'project.change_order': [
    { name: 'changeOrderNumber', label: 'Change Order Number', labelDe: 'Änderungsauftragsnummer', type: 'text', required: true },
    { name: 'changeOrderDate', label: 'Change Order Date', labelDe: 'Datum', type: 'date', required: true },
    { name: 'projectNumber', label: 'Project Number', labelDe: 'Projektnummer', type: 'text', required: true },
    { name: 'originalScope', label: 'Original Scope', labelDe: 'Ursprünglicher Umfang', type: 'textarea', required: false },
    { name: 'changeDescription', label: 'Change Description', labelDe: 'Änderungsbeschreibung', type: 'textarea', required: true },
    { name: 'reason', label: 'Reason for Change', labelDe: 'Grund für Änderung', type: 'textarea', required: true },
    { name: 'costImpact', label: 'Cost Impact', labelDe: 'Kostenauswirkung €', type: 'number', required: false },
    { name: 'timeImpact', label: 'Time Impact (days)', labelDe: 'Zeitauswirkung (Tage)', type: 'number', required: false },
    { name: 'approvedBy', label: 'Approved By', labelDe: 'Genehmigt von', type: 'text', required: false }
  ],

  'project.risk_assessment': [
    { name: 'assessmentDate', label: 'Assessment Date', labelDe: 'Bewertungsdatum', type: 'date', required: true },
    { name: 'projectNumber', label: 'Project Number', labelDe: 'Projektnummer', type: 'text', required: true },
    { name: 'assessor', label: 'Assessor Name', labelDe: 'Bewerter', type: 'text', required: true },
    { name: 'activity', label: 'Activity/Task', labelDe: 'Tätigkeit', type: 'text', required: true },
    { name: 'hazards', label: 'Identified Hazards', labelDe: 'Erkannte Gefährdungen', type: 'textarea', required: true },
    { name: 'riskLevel', label: 'Risk Level', labelDe: 'Risikostufe', type: 'select', required: true, options: ['Niedrig', 'Mittel', 'Hoch', 'Sehr Hoch'] },
    { name: 'controlMeasures', label: 'Control Measures', labelDe: 'Schutzmaßnahmen', type: 'textarea', required: true },
    { name: 'ppe', label: 'PPE Required', labelDe: 'Erforderliche PSA', type: 'textarea', required: false },
    { name: 'reviewDate', label: 'Review Date', labelDe: 'Überprüfungsdatum', type: 'date', required: false }
  ],

  // ========================================================================
  // PERSONNEL DOCUMENTS
  // ========================================================================

  'personnel.timesheet': [
    { name: 'timesheetPeriod', label: 'Period', labelDe: 'Zeitraum', type: 'text', required: true, placeholder: 'z.B. KW 45 2025' },
    { name: 'employeeName', label: 'Employee Name', labelDe: 'Mitarbeitername', type: 'text', required: true },
    { name: 'employeeNumber', label: 'Employee Number', labelDe: 'Personalnummer', type: 'text', required: false },
    { name: 'totalHours', label: 'Total Hours', labelDe: 'Gesamtstunden', type: 'number', required: true },
    { name: 'regularHours', label: 'Regular Hours', labelDe: 'Regelarbeitszeit', type: 'number', required: false },
    { name: 'overtimeHours', label: 'Overtime Hours', labelDe: 'Überstunden', type: 'number', required: false },
    { name: 'projectBreakdown', label: 'Project Breakdown', labelDe: 'Projektzuordnung', type: 'textarea', required: false },
    { name: 'approvedBy', label: 'Approved By', labelDe: 'Genehmigt von', type: 'text', required: false },
    { name: 'submittedDate', label: 'Submitted Date', labelDe: 'Eingereicht am', type: 'date', required: true }
  ],

  'personnel.travel_log': [
    { name: 'logPeriod', label: 'Log Period', labelDe: 'Zeitraum', type: 'text', required: true },
    { name: 'employeeName', label: 'Employee Name', labelDe: 'Mitarbeitername', type: 'text', required: true },
    { name: 'vehicle', label: 'Vehicle', labelDe: 'Fahrzeug', type: 'text', required: true, placeholder: 'z.B. MB-XX 1234' },
    { name: 'totalKm', label: 'Total Kilometers', labelDe: 'Gesamtkilometer', type: 'number', required: true },
    { name: 'businessKm', label: 'Business Kilometers', labelDe: 'Dienstkilometer', type: 'number', required: true },
    { name: 'privateKm', label: 'Private Kilometers', labelDe: 'Privatkilometer', type: 'number', required: false },
    { name: 'fuelCosts', label: 'Fuel Costs', labelDe: 'Tankkosten €', type: 'number', required: false },
    { name: 'tollCosts', label: 'Toll Costs', labelDe: 'Mautkosten €', type: 'number', required: false }
  ],

  'personnel.expense_claim': [
    { name: 'claimDate', label: 'Claim Date', labelDe: 'Abrechnungsdatum', type: 'date', required: true },
    { name: 'employeeName', label: 'Employee Name', labelDe: 'Mitarbeitername', type: 'text', required: true },
    { name: 'purpose', label: 'Purpose', labelDe: 'Zweck/Anlass', type: 'textarea', required: true },
    { name: 'travelExpenses', label: 'Travel Expenses', labelDe: 'Reisekosten €', type: 'number', required: false },
    { name: 'mealExpenses', label: 'Meal Expenses', labelDe: 'Verpflegung €', type: 'number', required: false },
    { name: 'accommodationExpenses', label: 'Accommodation', labelDe: 'Unterkunft €', type: 'number', required: false },
    { name: 'otherExpenses', label: 'Other Expenses', labelDe: 'Sonstige Ausgaben €', type: 'number', required: false },
    { name: 'totalAmount', label: 'Total Amount', labelDe: 'Gesamtbetrag €', type: 'number', required: true },
    { name: 'notes', label: 'Notes', labelDe: 'Bemerkungen', type: 'textarea', required: false }
  ],

  // ========================================================================
  // MATERIAL DOCUMENTS
  // ========================================================================

  'material.requisition': [
    { name: 'requisitionNumber', label: 'Requisition Number', labelDe: 'Anforderungsnummer', type: 'text', required: true },
    { name: 'requisitionDate', label: 'Requisition Date', labelDe: 'Anforderungsdatum', type: 'date', required: true },
    { name: 'projectNumber', label: 'Project Number', labelDe: 'Projektnummer', type: 'text', required: true },
    { name: 'requestedBy', label: 'Requested By', labelDe: 'Angefordert von', type: 'text', required: true },
    { name: 'urgency', label: 'Urgency', labelDe: 'Dringlichkeit', type: 'select', required: true, options: ['Normal', 'Dringend', 'Sofort'] },
    { name: 'deliveryDate', label: 'Required Delivery Date', labelDe: 'Benötigt bis', type: 'date', required: false },
    { name: 'materialsList', label: 'Materials List', labelDe: 'Materialliste', type: 'textarea', required: true, description: 'Ein Material pro Zeile' },
    { name: 'purpose', label: 'Purpose', labelDe: 'Verwendungszweck', type: 'textarea', required: false }
  ],

  'material.delivery_note': [
    { name: 'deliveryNoteNumber', label: 'Delivery Note Number', labelDe: 'Lieferscheinnummer', type: 'text', required: true },
    { name: 'deliveryDate', label: 'Delivery Date', labelDe: 'Lieferdatum', type: 'date', required: true },
    { name: 'orderNumber', label: 'Order Number', labelDe: 'Bestellnummer', type: 'text', required: false },
    { name: 'supplierName', label: 'Supplier Name', labelDe: 'Lieferant', type: 'text', required: true },
    { name: 'supplierAddress', label: 'Supplier Address', labelDe: 'Lieferantenadresse', type: 'textarea', required: false },
    { name: 'deliveryAddress', label: 'Delivery Address', labelDe: 'Lieferadresse', type: 'textarea', required: false },
    { name: 'itemsList', label: 'Items List', labelDe: 'Positionen', type: 'textarea', required: true, description: 'Artikel, Menge, Einheit' },
    { name: 'carrier', label: 'Carrier/Driver', labelDe: 'Fahrer/Spediteur', type: 'text', required: false },
    { name: 'receivedBy', label: 'Received By', labelDe: 'Empfangen von', type: 'text', required: false }
  ],

  'material.goods_receipt': [
    { name: 'receiptNumber', label: 'Receipt Number', labelDe: 'Wareneingangsnummer', type: 'text', required: true },
    { name: 'receiptDate', label: 'Receipt Date', labelDe: 'Eingangsdatum', type: 'date', required: true },
    { name: 'deliveryNoteNumber', label: 'Delivery Note Number', labelDe: 'Lieferscheinnummer', type: 'text', required: false },
    { name: 'orderNumber', label: 'Order Number', labelDe: 'Bestellnummer', type: 'text', required: false },
    { name: 'supplierName', label: 'Supplier', labelDe: 'Lieferant', type: 'text', required: true },
    { name: 'inspector', label: 'Inspector', labelDe: 'Prüfer', type: 'text', required: true },
    { name: 'conditionStatus', label: 'Condition Status', labelDe: 'Warenzustand', type: 'select', required: true, options: ['Einwandfrei', 'Beschädigt', 'Unvollständig'] },
    { name: 'itemsList', label: 'Items List', labelDe: 'Positionen', type: 'textarea', required: true },
    { name: 'damages', label: 'Damages/Issues', labelDe: 'Schäden/Mängel', type: 'textarea', required: false }
  ],

  'material.inventory_sheet': [
    { name: 'inventoryDate', label: 'Inventory Date', labelDe: 'Inventurdatum', type: 'date', required: true },
    { name: 'location', label: 'Location', labelDe: 'Standort/Lager', type: 'text', required: true },
    { name: 'performedBy', label: 'Performed By', labelDe: 'Durchgeführt von', type: 'text', required: true },
    { name: 'category', label: 'Category', labelDe: 'Kategorie', type: 'text', required: false },
    { name: 'itemsList', label: 'Items List', labelDe: 'Bestandsliste', type: 'textarea', required: true, description: 'Artikel, Menge, Wert' },
    { name: 'totalValue', label: 'Total Value', labelDe: 'Gesamtwert €', type: 'number', required: false },
    { name: 'discrepancies', label: 'Discrepancies', labelDe: 'Abweichungen', type: 'textarea', required: false }
  ],

  // ========================================================================
  // CLIENT DOCUMENTS
  // ========================================================================

  'client.offer_quote': [
    { name: 'quoteNumber', label: 'Quote Number', labelDe: 'Angebotsnummer', type: 'text', required: true },
    { name: 'quoteDate', label: 'Quote Date', labelDe: 'Angebotsdatum', type: 'date', required: true },
    { name: 'validUntil', label: 'Valid Until', labelDe: 'Gültig bis', type: 'date', required: false },
    { name: 'clientName', label: 'Client Name', labelDe: 'Kundenname', type: 'text', required: true },
    { name: 'clientAddress', label: 'Client Address', labelDe: 'Kundenadresse', type: 'textarea', required: false },
    { name: 'projectDescription', label: 'Project Description', labelDe: 'Projektbeschreibung', type: 'textarea', required: true },
    { name: 'itemsList', label: 'Items/Services', labelDe: 'Positionen', type: 'textarea', required: true },
    { name: 'subtotal', label: 'Subtotal', labelDe: 'Zwischensumme €', type: 'number', required: false },
    { name: 'taxRate', label: 'Tax Rate %', labelDe: 'MwSt. %', type: 'number', required: false },
    { name: 'totalAmount', label: 'Total Amount', labelDe: 'Gesamtbetrag €', type: 'number', required: true },
    { name: 'paymentTerms', label: 'Payment Terms', labelDe: 'Zahlungsbedingungen', type: 'textarea', required: false }
  ],

  'client.contract': [
    { name: 'contractNumber', label: 'Contract Number', labelDe: 'Vertragsnummer', type: 'text', required: true },
    { name: 'contractDate', label: 'Contract Date', labelDe: 'Vertragsdatum', type: 'date', required: true },
    { name: 'clientName', label: 'Client Name', labelDe: 'Auftraggeber', type: 'text', required: true },
    { name: 'contractorName', label: 'Contractor Name', labelDe: 'Auftragnehmer', type: 'text', required: true },
    { name: 'contractValue', label: 'Contract Value', labelDe: 'Auftragswert €', type: 'number', required: true },
    { name: 'startDate', label: 'Start Date', labelDe: 'Beginn', type: 'date', required: true },
    { name: 'endDate', label: 'End Date', labelDe: 'Ende', type: 'date', required: false },
    { name: 'scopeOfWork', label: 'Scope of Work', labelDe: 'Leistungsumfang', type: 'textarea', required: true },
    { name: 'paymentTerms', label: 'Payment Terms', labelDe: 'Zahlungsbedingungen', type: 'textarea', required: true },
    { name: 'warrantyPeriod', label: 'Warranty Period', labelDe: 'Gewährleistungsfrist', type: 'text', required: false },
    { name: 'specialConditions', label: 'Special Conditions', labelDe: 'Besondere Bedingungen', type: 'textarea', required: false }
  ],

  'client.invoice': [
    { name: 'invoiceNumber', label: 'Invoice Number', labelDe: 'Rechnungsnummer', type: 'text', required: true },
    { name: 'invoiceDate', label: 'Invoice Date', labelDe: 'Rechnungsdatum', type: 'date', required: true },
    { name: 'dueDate', label: 'Due Date', labelDe: 'Fälligkeitsdatum', type: 'date', required: false },
    { name: 'clientName', label: 'Client Name', labelDe: 'Kundenname', type: 'text', required: true },
    { name: 'clientNumber', label: 'Client Number', labelDe: 'Kundennummer', type: 'text', required: false },
    { name: 'orderNumber', label: 'Order Number', labelDe: 'Bestellnummer', type: 'text', required: false },
    { name: 'itemsList', label: 'Line Items', labelDe: 'Rechnungspositionen', type: 'textarea', required: true },
    { name: 'subtotal', label: 'Subtotal', labelDe: 'Nettobetrag €', type: 'number', required: true },
    { name: 'taxRate', label: 'Tax Rate %', labelDe: 'MwSt. %', type: 'number', required: true },
    { name: 'taxAmount', label: 'Tax Amount', labelDe: 'Steuerbetrag €', type: 'number', required: true },
    { name: 'totalAmount', label: 'Total Amount', labelDe: 'Bruttobetrag €', type: 'number', required: true },
    { name: 'paymentMethod', label: 'Payment Method', labelDe: 'Zahlungsart', type: 'text', required: false }
  ],

  'client.credit_note': [
    { name: 'creditNoteNumber', label: 'Credit Note Number', labelDe: 'Gutschriftnummer', type: 'text', required: true },
    { name: 'creditNoteDate', label: 'Credit Note Date', labelDe: 'Gutschriftdatum', type: 'date', required: true },
    { name: 'originalInvoiceNumber', label: 'Original Invoice Number', labelDe: 'Urspr. Rechnungsnummer', type: 'text', required: true },
    { name: 'clientName', label: 'Client Name', labelDe: 'Kundenname', type: 'text', required: true },
    { name: 'reason', label: 'Reason', labelDe: 'Grund für Gutschrift', type: 'textarea', required: true },
    { name: 'itemsList', label: 'Items', labelDe: 'Positionen', type: 'textarea', required: true },
    { name: 'subtotal', label: 'Subtotal', labelDe: 'Nettobetrag €', type: 'number', required: true },
    { name: 'taxAmount', label: 'Tax Amount', labelDe: 'Steuerbetrag €', type: 'number', required: true },
    { name: 'totalAmount', label: 'Total Amount', labelDe: 'Bruttobetrag €', type: 'number', required: true }
  ],

  'client.acceptance_report': [
    { name: 'acceptanceDate', label: 'Acceptance Date', labelDe: 'Abnahmedatum', type: 'date', required: true },
    { name: 'projectNumber', label: 'Project Number', labelDe: 'Projektnummer', type: 'text', required: true },
    { name: 'projectName', label: 'Project Name', labelDe: 'Projektname', type: 'text', required: true },
    { name: 'clientName', label: 'Client Name', labelDe: 'Auftraggeber', type: 'text', required: true },
    { name: 'contractorName', label: 'Contractor Name', labelDe: 'Auftragnehmer', type: 'text', required: true },
    { name: 'scopeCompleted', label: 'Scope Completed', labelDe: 'Ausgeführte Leistungen', type: 'textarea', required: true },
    { name: 'defects', label: 'Defects', labelDe: 'Festgestellte Mängel', type: 'textarea', required: false },
    { name: 'acceptanceStatus', label: 'Acceptance Status', labelDe: 'Abnahmestatus', type: 'select', required: true, options: ['Abgenommen', 'Abgenommen mit Mängeln', 'Nicht abgenommen'] },
    { name: 'clientSignature', label: 'Client Signature', labelDe: 'Unterschrift Auftraggeber', type: 'text', required: false },
    { name: 'contractorSignature', label: 'Contractor Signature', labelDe: 'Unterschrift Auftragnehmer', type: 'text', required: false }
  ],

  // ========================================================================
  // QUALITY DOCUMENTS
  // ========================================================================

  'quality.commissioning_report': [
    { name: 'commissioningDate', label: 'Commissioning Date', labelDe: 'Inbetriebnahmedatum', type: 'date', required: true },
    { name: 'projectNumber', label: 'Project Number', labelDe: 'Projektnummer', type: 'text', required: true },
    { name: 'equipmentDescription', label: 'Equipment Description', labelDe: 'Anlagenbeschreibung', type: 'textarea', required: true },
    { name: 'manufacturer', label: 'Manufacturer', labelDe: 'Hersteller', type: 'text', required: false },
    { name: 'serialNumber', label: 'Serial Number', labelDe: 'Seriennummer', type: 'text', required: false },
    { name: 'testResults', label: 'Test Results', labelDe: 'Prüfergebnisse', type: 'textarea', required: true },
    { name: 'functionalStatus', label: 'Functional Status', labelDe: 'Funktionsstatus', type: 'select', required: true, options: ['Funktionsfähig', 'Eingeschränkt', 'Nicht funktionsfähig'] },
    { name: 'commissionedBy', label: 'Commissioned By', labelDe: 'Inbetriebnahme durch', type: 'text', required: true },
    { name: 'clientAcceptance', label: 'Client Acceptance', labelDe: 'Kundenabnahme', type: 'text', required: false }
  ],

  'quality.measurement_test': [
    { name: 'testDate', label: 'Test Date', labelDe: 'Prüfdatum', type: 'date', required: true },
    { name: 'testNumber', label: 'Test Number', labelDe: 'Prüfprotokollnummer', type: 'text', required: true },
    { name: 'standard', label: 'Standard/Norm', labelDe: 'Norm/Standard', type: 'text', required: true, placeholder: 'z.B. VDE 0100, DIN EN 60204' },
    { name: 'equipmentTested', label: 'Equipment Tested', labelDe: 'Geprüfte Anlage', type: 'textarea', required: true },
    { name: 'testerName', label: 'Tester Name', labelDe: 'Prüfer', type: 'text', required: true },
    { name: 'testerQualification', label: 'Tester Qualification', labelDe: 'Qualifikation', type: 'text', required: false },
    { name: 'measurements', label: 'Measurements', labelDe: 'Messwerte', type: 'textarea', required: true },
    { name: 'testResult', label: 'Test Result', labelDe: 'Prüfergebnis', type: 'select', required: true, options: ['Bestanden', 'Nicht bestanden', 'Bedingt bestanden'] },
    { name: 'nextTestDate', label: 'Next Test Date', labelDe: 'Nächste Prüfung', type: 'date', required: false }
  ],

  'quality.maintenance_log': [
    { name: 'maintenanceDate', label: 'Maintenance Date', labelDe: 'Wartungsdatum', type: 'date', required: true },
    { name: 'maintenanceNumber', label: 'Maintenance Number', labelDe: 'Wartungsnummer', type: 'text', required: false },
    { name: 'equipment', label: 'Equipment', labelDe: 'Anlage/Gerät', type: 'text', required: true },
    { name: 'serialNumber', label: 'Serial Number', labelDe: 'Seriennummer', type: 'text', required: false },
    { name: 'maintenanceType', label: 'Maintenance Type', labelDe: 'Wartungsart', type: 'select', required: true, options: ['Planmäßig', 'Außerplanmäßig', 'Reparatur', 'Inspektion'] },
    { name: 'workPerformed', label: 'Work Performed', labelDe: 'Durchgeführte Arbeiten', type: 'textarea', required: true },
    { name: 'partsReplaced', label: 'Parts Replaced', labelDe: 'Ersetzte Teile', type: 'textarea', required: false },
    { name: 'performedBy', label: 'Performed By', labelDe: 'Durchgeführt von', type: 'text', required: true },
    { name: 'nextMaintenanceDate', label: 'Next Maintenance', labelDe: 'Nächste Wartung', type: 'date', required: false }
  ],

  'quality.photo_doc': [
    { name: 'photoDate', label: 'Photo Date', labelDe: 'Aufnahmedatum', type: 'date', required: false },
    { name: 'location', label: 'Location', labelDe: 'Standort/Ort', type: 'text', required: false },
    { name: 'description', label: 'Description', labelDe: 'Beschreibung', type: 'textarea', required: false },
    { name: 'category', label: 'Category', labelDe: 'Kategorie', type: 'select', required: false, options: ['Vor-Zustand', 'Nach-Zustand', 'Schaden', 'Fortschritt', 'Sonstiges'] },
    { name: 'photographer', label: 'Photographer', labelDe: 'Fotograf', type: 'text', required: false }
  ],

  // ========================================================================
  // COMPLIANCE DOCUMENTS
  // ========================================================================

  'compliance.certificate': [
    { name: 'certificateNumber', label: 'Certificate Number', labelDe: 'Zertifikatsnummer', type: 'text', required: true },
    { name: 'certificateType', label: 'Certificate Type', labelDe: 'Zertifikatstyp', type: 'text', required: true, placeholder: 'z.B. ISO 9001, CE-Kennzeichnung' },
    { name: 'issuedTo', label: 'Issued To', labelDe: 'Ausgestellt für', type: 'text', required: true },
    { name: 'issuedBy', label: 'Issued By', labelDe: 'Ausgestellt von', type: 'text', required: true },
    { name: 'issueDate', label: 'Issue Date', labelDe: 'Ausstellungsdatum', type: 'date', required: true },
    { name: 'expiryDate', label: 'Expiry Date', labelDe: 'Gültig bis', type: 'date', required: false },
    { name: 'scope', label: 'Scope', labelDe: 'Geltungsbereich', type: 'textarea', required: false }
  ],

  'compliance.insurance': [
    { name: 'policyNumber', label: 'Policy Number', labelDe: 'Versicherungsnummer', type: 'text', required: true },
    { name: 'insuranceType', label: 'Insurance Type', labelDe: 'Versicherungsart', type: 'text', required: true, placeholder: 'z.B. Haftpflicht, Betriebshaftpflicht' },
    { name: 'insuranceCompany', label: 'Insurance Company', labelDe: 'Versicherungsgesellschaft', type: 'text', required: true },
    { name: 'policyHolder', label: 'Policy Holder', labelDe: 'Versicherungsnehmer', type: 'text', required: true },
    { name: 'coverageAmount', label: 'Coverage Amount', labelDe: 'Deckungssumme €', type: 'number', required: false },
    { name: 'validFrom', label: 'Valid From', labelDe: 'Gültig ab', type: 'date', required: true },
    { name: 'validUntil', label: 'Valid Until', labelDe: 'Gültig bis', type: 'date', required: true },
    { name: 'premium', label: 'Premium', labelDe: 'Beitrag €', type: 'number', required: false }
  ],

  'compliance.vehicle_equipment_inspection': [
    { name: 'inspectionDate', label: 'Inspection Date', labelDe: 'Prüfdatum', type: 'date', required: true },
    { name: 'inspectionType', label: 'Inspection Type', labelDe: 'Prüfart', type: 'select', required: true, options: ['TÜV/HU', 'UVV', 'Geräteprüfung', 'Sicherheitsprüfung'] },
    { name: 'vehicleEquipment', label: 'Vehicle/Equipment', labelDe: 'Fahrzeug/Gerät', type: 'text', required: true },
    { name: 'registrationNumber', label: 'Registration Number', labelDe: 'Kennzeichen/Nummer', type: 'text', required: false },
    { name: 'inspector', label: 'Inspector', labelDe: 'Prüfer', type: 'text', required: true },
    { name: 'inspectionResult', label: 'Inspection Result', labelDe: 'Prüfergebnis', type: 'select', required: true, options: ['Bestanden', 'Nicht bestanden', 'Mängel festgestellt'] },
    { name: 'defects', label: 'Defects', labelDe: 'Festgestellte Mängel', type: 'textarea', required: false },
    { name: 'nextInspectionDate', label: 'Next Inspection', labelDe: 'Nächste Prüfung', type: 'date', required: false }
  ],

  'compliance.training_record': [
    { name: 'trainingDate', label: 'Training Date', labelDe: 'Schulungsdatum', type: 'date', required: true },
    { name: 'trainingTitle', label: 'Training Title', labelDe: 'Schulungsthema', type: 'text', required: true },
    { name: 'attendeeName', label: 'Attendee Name', labelDe: 'Teilnehmer', type: 'text', required: true },
    { name: 'trainer', label: 'Trainer', labelDe: 'Schulungsleiter', type: 'text', required: false },
    { name: 'duration', label: 'Duration (hours)', labelDe: 'Dauer (Stunden)', type: 'number', required: false },
    { name: 'topics', label: 'Topics Covered', labelDe: 'Schulungsinhalte', type: 'textarea', required: true },
    { name: 'testResult', label: 'Test Result', labelDe: 'Prüfungsergebnis', type: 'select', required: false, options: ['Bestanden', 'Nicht bestanden', 'Keine Prüfung'] },
    { name: 'certificateNumber', label: 'Certificate Number', labelDe: 'Zertifikatsnummer', type: 'text', required: false },
    { name: 'validUntil', label: 'Valid Until', labelDe: 'Gültig bis', type: 'date', required: false }
  ],

  'compliance.gdpr_consent': [
    { name: 'consentDate', label: 'Consent Date', labelDe: 'Einwilligungsdatum', type: 'date', required: true },
    { name: 'personName', label: 'Person Name', labelDe: 'Name der Person', type: 'text', required: true },
    { name: 'purposeOfProcessing', label: 'Purpose of Processing', labelDe: 'Verarbeitungszweck', type: 'textarea', required: true },
    { name: 'dataCategories', label: 'Data Categories', labelDe: 'Datenkategorien', type: 'textarea', required: true },
    { name: 'consentGiven', label: 'Consent Given', labelDe: 'Einwilligung erteilt', type: 'select', required: true, options: ['Ja', 'Nein', 'Teilweise'] },
    { name: 'withdrawalInfo', label: 'Withdrawal Info', labelDe: 'Widerrufsrecht erklärt', type: 'select', required: true, options: ['Ja', 'Nein'] },
    { name: 'signature', label: 'Signature', labelDe: 'Unterschrift', type: 'text', required: false }
  ]
};

/**
 * Get fields for a document type
 */
export function getDocumentFields(type: DocumentType): DocumentField[] {
  return DOCUMENT_FIELDS[type] || [];
}

/**
 * Get required fields for a document type
 */
export function getRequiredFields(type: DocumentType): string[] {
  const fields = getDocumentFields(type);
  return fields.filter(f => f.required).map(f => f.name);
}













