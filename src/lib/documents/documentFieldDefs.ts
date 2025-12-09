// ============================================================================
// DOCUMENT FIELD DEFINITIONS - For Form Generation
// ============================================================================

import { DocumentType } from '@/types/documents';

export interface FieldDefinition {
  name: string;
  label: string;
  labelDe: string;
  type: 'text' | 'number' | 'date' | 'textarea' | 'select' | 'array';
  required?: boolean;
  placeholder?: string;
  options?: string[]; // For select fields
}

// Field definitions for each document type
export const DOCUMENT_FIELD_DEFINITIONS: Record<DocumentType, FieldDefinition[]> = {
  // ===== CLIENT DOCUMENTS =====
  'client.invoice': [
    { name: 'documentNumber', label: 'Invoice Number', labelDe: 'Rechnungsnummer', type: 'text', required: true },
    { name: 'documentDate', label: 'Invoice Date', labelDe: 'Rechnungsdatum', type: 'date', required: true },
    { name: 'supplierName', label: 'Supplier', labelDe: 'Lieferant', type: 'text', required: true },
    { name: 'customerName', label: 'Customer', labelDe: 'Kunde', type: 'text', required: true },
    { name: 'totalAmount', label: 'Total Amount', labelDe: 'Gesamtbetrag', type: 'number', required: true },
    { name: 'taxAmount', label: 'Tax Amount', labelDe: 'MwSt-Betrag', type: 'number' },
    { name: 'dueDate', label: 'Due Date', labelDe: 'Fälligkeitsdatum', type: 'date' },
    { name: 'description', label: 'Description', labelDe: 'Beschreibung', type: 'textarea' }
  ],
  
  'client.offer_quote': [
    { name: 'documentNumber', label: 'Quote Number', labelDe: 'Angebotsnummer', type: 'text', required: true },
    { name: 'documentDate', label: 'Quote Date', labelDe: 'Angebotsdatum', type: 'date', required: true },
    { name: 'customerName', label: 'Customer', labelDe: 'Kunde', type: 'text', required: true },
    { name: 'totalAmount', label: 'Total Amount', labelDe: 'Gesamtbetrag', type: 'number', required: true },
    { name: 'validUntil', label: 'Valid Until', labelDe: 'Gültig bis', type: 'date' },
    { name: 'projectName', label: 'Project', labelDe: 'Projekt', type: 'text' },
    { name: 'description', label: 'Description', labelDe: 'Beschreibung', type: 'textarea' }
  ],
  
  'client.contract': [
    { name: 'documentNumber', label: 'Contract Number', labelDe: 'Vertragsnummer', type: 'text', required: true },
    { name: 'documentDate', label: 'Contract Date', labelDe: 'Vertragsdatum', type: 'date', required: true },
    { name: 'party1Name', label: 'Party 1', labelDe: 'Vertragspartei 1', type: 'text', required: true },
    { name: 'party2Name', label: 'Party 2', labelDe: 'Vertragspartei 2', type: 'text', required: true },
    { name: 'effectiveDate', label: 'Effective Date', labelDe: 'Inkrafttreten', type: 'date' },
    { name: 'expiryDate', label: 'Expiry Date', labelDe: 'Ablaufdatum', type: 'date' },
    { name: 'contractValue', label: 'Contract Value', labelDe: 'Vertragswert', type: 'number' },
    { name: 'description', label: 'Description', labelDe: 'Beschreibung', type: 'textarea' }
  ],
  
  'client.credit_note': [
    { name: 'documentNumber', label: 'Credit Note Number', labelDe: 'Gutschriftnummer', type: 'text', required: true },
    { name: 'documentDate', label: 'Credit Note Date', labelDe: 'Gutschriftdatum', type: 'date', required: true },
    { name: 'originalInvoiceNumber', label: 'Original Invoice', labelDe: 'Ursprüngliche Rechnung', type: 'text' },
    { name: 'customerName', label: 'Customer', labelDe: 'Kunde', type: 'text', required: true },
    { name: 'creditAmount', label: 'Credit Amount', labelDe: 'Gutschriftbetrag', type: 'number', required: true },
    { name: 'reason', label: 'Reason', labelDe: 'Grund', type: 'textarea' }
  ],
  
  'client.acceptance_report': [
    { name: 'documentNumber', label: 'Report Number', labelDe: 'Protokollnummer', type: 'text' },
    { name: 'documentDate', label: 'Acceptance Date', labelDe: 'Abnahmedatum', type: 'date', required: true },
    { name: 'projectName', label: 'Project', labelDe: 'Projekt', type: 'text', required: true },
    { name: 'customerName', label: 'Customer', labelDe: 'Kunde', type: 'text', required: true },
    { name: 'location', label: 'Location', labelDe: 'Standort', type: 'text' },
    { name: 'acceptedBy', label: 'Accepted By', labelDe: 'Abgenommen von', type: 'text' },
    { name: 'defects', label: 'Defects', labelDe: 'Mängel', type: 'textarea' },
    { name: 'notes', label: 'Notes', labelDe: 'Bemerkungen', type: 'textarea' }
  ],
  
  // ===== MATERIAL DOCUMENTS =====
  'material.delivery_note': [
    { name: 'documentNumber', label: 'Delivery Note Number', labelDe: 'Lieferscheinnummer', type: 'text', required: true },
    { name: 'documentDate', label: 'Delivery Date', labelDe: 'Lieferdatum', type: 'date', required: true },
    { name: 'supplierName', label: 'Supplier', labelDe: 'Lieferant', type: 'text', required: true },
    { name: 'customerName', label: 'Customer', labelDe: 'Kunde', type: 'text' },
    { name: 'orderNumber', label: 'Order Number', labelDe: 'Bestellnummer', type: 'text' },
    { name: 'deliveryAddress', label: 'Delivery Address', labelDe: 'Lieferadresse', type: 'textarea' },
    { name: 'notes', label: 'Notes', labelDe: 'Bemerkungen', type: 'textarea' }
  ],
  
  'material.goods_receipt': [
    { name: 'documentNumber', label: 'Receipt Number', labelDe: 'Wareneingangsnummer', type: 'text', required: true },
    { name: 'documentDate', label: 'Receipt Date', labelDe: 'Eingangsdatum', type: 'date', required: true },
    { name: 'supplierName', label: 'Supplier', labelDe: 'Lieferant', type: 'text', required: true },
    { name: 'deliveryNoteNumber', label: 'Delivery Note', labelDe: 'Lieferscheinnummer', type: 'text' },
    { name: 'receivedBy', label: 'Received By', labelDe: 'Empfangen von', type: 'text' },
    { name: 'condition', label: 'Condition', labelDe: 'Zustand', type: 'select', options: ['Einwandfrei', 'Beschädigt', 'Unvollständig'] },
    { name: 'notes', label: 'Notes', labelDe: 'Bemerkungen', type: 'textarea' }
  ],
  
  'material.requisition': [
    { name: 'documentNumber', label: 'Requisition Number', labelDe: 'Anforderungsnummer', type: 'text' },
    { name: 'documentDate', label: 'Request Date', labelDe: 'Anforderungsdatum', type: 'date', required: true },
    { name: 'requestedBy', label: 'Requested By', labelDe: 'Angefordert von', type: 'text', required: true },
    { name: 'projectName', label: 'Project', labelDe: 'Projekt', type: 'text' },
    { name: 'urgency', label: 'Urgency', labelDe: 'Dringlichkeit', type: 'select', options: ['Normal', 'Dringend', 'Notfall'] },
    { name: 'notes', label: 'Notes', labelDe: 'Bemerkungen', type: 'textarea' }
  ],
  
  'material.inventory_sheet': [
    { name: 'documentNumber', label: 'Inventory Number', labelDe: 'Inventurnummer', type: 'text' },
    { name: 'documentDate', label: 'Inventory Date', labelDe: 'Inventurdatum', type: 'date', required: true },
    { name: 'location', label: 'Location', labelDe: 'Standort', type: 'text' },
    { name: 'countedBy', label: 'Counted By', labelDe: 'Gezählt von', type: 'text' },
    { name: 'notes', label: 'Notes', labelDe: 'Bemerkungen', type: 'textarea' }
  ],
  
  // ===== PERSONNEL DOCUMENTS =====
  'personnel.timesheet': [
    { name: 'employeeName', label: 'Employee', labelDe: 'Mitarbeiter', type: 'text', required: true },
    { name: 'period', label: 'Period', labelDe: 'Zeitraum', type: 'text', required: true },
    { name: 'documentDate', label: 'Date', labelDe: 'Datum', type: 'date', required: true },
    { name: 'totalHours', label: 'Total Hours', labelDe: 'Gesamtstunden', type: 'number', required: true },
    { name: 'regularHours', label: 'Regular Hours', labelDe: 'Normalstunden', type: 'number' },
    { name: 'overtimeHours', label: 'Overtime', labelDe: 'Überstunden', type: 'number' },
    { name: 'projectName', label: 'Project', labelDe: 'Projekt', type: 'text' },
    { name: 'notes', label: 'Notes', labelDe: 'Bemerkungen', type: 'textarea' }
  ],
  
  'personnel.travel_log': [
    { name: 'employeeName', label: 'Employee', labelDe: 'Mitarbeiter', type: 'text', required: true },
    { name: 'documentDate', label: 'Travel Date', labelDe: 'Fahrtdatum', type: 'date', required: true },
    { name: 'startLocation', label: 'Start', labelDe: 'Start', type: 'text' },
    { name: 'endLocation', label: 'Destination', labelDe: 'Ziel', type: 'text' },
    { name: 'distance', label: 'Distance (km)', labelDe: 'Strecke (km)', type: 'number' },
    { name: 'purpose', label: 'Purpose', labelDe: 'Zweck', type: 'textarea' },
    { name: 'notes', label: 'Notes', labelDe: 'Bemerkungen', type: 'textarea' }
  ],
  
  'personnel.expense_claim': [
    { name: 'employeeName', label: 'Employee', labelDe: 'Mitarbeiter', type: 'text', required: true },
    { name: 'documentDate', label: 'Expense Date', labelDe: 'Spesendatum', type: 'date', required: true },
    { name: 'totalAmount', label: 'Total Amount', labelDe: 'Gesamtbetrag', type: 'number', required: true },
    { name: 'category', label: 'Category', labelDe: 'Kategorie', type: 'select', options: ['Reisekosten', 'Verpflegung', 'Unterkunft', 'Sonstiges'] },
    { name: 'projectName', label: 'Project', labelDe: 'Projekt', type: 'text' },
    { name: 'description', label: 'Description', labelDe: 'Beschreibung', type: 'textarea' }
  ],
  
  // ===== PROJECT DOCUMENTS =====
  'project.site_daily_report': [
    { name: 'documentDate', label: 'Report Date', labelDe: 'Berichtsdatum', type: 'date', required: true },
    { name: 'projectName', label: 'Project', labelDe: 'Projekt', type: 'text', required: true },
    { name: 'projectNumber', label: 'Project Number', labelDe: 'Projektnummer', type: 'text' },
    { name: 'location', label: 'Site Location', labelDe: 'Baustellenort', type: 'text' },
    { name: 'weather', label: 'Weather', labelDe: 'Wetter', type: 'text' },
    { name: 'workPerformed', label: 'Work Performed', labelDe: 'Durchgeführte Arbeiten', type: 'textarea', required: true },
    { name: 'crew', label: 'Crew', labelDe: 'Personal vor Ort', type: 'text' },
    { name: 'notes', label: 'Notes', labelDe: 'Bemerkungen', type: 'textarea' }
  ],
  
  'project.task_work_order': [
    { name: 'documentNumber', label: 'Work Order Number', labelDe: 'Auftragsnummer', type: 'text', required: true },
    { name: 'documentDate', label: 'Order Date', labelDe: 'Auftragsdatum', type: 'date', required: true },
    { name: 'projectName', label: 'Project', labelDe: 'Projekt', type: 'text', required: true },
    { name: 'taskDescription', label: 'Task Description', labelDe: 'Aufgabenbeschreibung', type: 'textarea', required: true },
    { name: 'assignedTo', label: 'Assigned To', labelDe: 'Zugewiesen an', type: 'text' },
    { name: 'dueDate', label: 'Due Date', labelDe: 'Fälligkeitsdatum', type: 'date' },
    { name: 'priority', label: 'Priority', labelDe: 'Priorität', type: 'select', options: ['Niedrig', 'Mittel', 'Hoch', 'Dringend'] }
  ],
  
  'project.handover': [
    { name: 'documentDate', label: 'Handover Date', labelDe: 'Übergabedatum', type: 'date', required: true },
    { name: 'projectName', label: 'Project', labelDe: 'Projekt', type: 'text', required: true },
    { name: 'handedOverBy', label: 'Handed Over By', labelDe: 'Übergeben von', type: 'text', required: true },
    { name: 'receivedBy', label: 'Received By', labelDe: 'Entgegengenommen von', type: 'text', required: true },
    { name: 'completionStatus', label: 'Completion', labelDe: 'Fertigstellung', type: 'select', options: ['100%', '> 95%', '< 95%'] },
    { name: 'openIssues', label: 'Open Issues', labelDe: 'Offene Punkte', type: 'textarea' },
    { name: 'notes', label: 'Notes', labelDe: 'Bemerkungen', type: 'textarea' }
  ],
  
  'project.change_order': [
    { name: 'documentNumber', label: 'Change Order Number', labelDe: 'Änderungsauftragsnummer', type: 'text', required: true },
    { name: 'documentDate', label: 'Change Date', labelDe: 'Änderungsdatum', type: 'date', required: true },
    { name: 'projectName', label: 'Project', labelDe: 'Projekt', type: 'text', required: true },
    { name: 'originalOrderNumber', label: 'Original Order', labelDe: 'Ursprünglicher Auftrag', type: 'text' },
    { name: 'changeDescription', label: 'Change Description', labelDe: 'Änderungsbeschreibung', type: 'textarea', required: true },
    { name: 'additionalCost', label: 'Additional Cost', labelDe: 'Mehrkosten', type: 'number' },
    { name: 'approvedBy', label: 'Approved By', labelDe: 'Genehmigt von', type: 'text' }
  ],
  
  'project.risk_assessment': [
    { name: 'documentNumber', label: 'Assessment Number', labelDe: 'Beurteilungsnummer', type: 'text' },
    { name: 'documentDate', label: 'Assessment Date', labelDe: 'Beurteilungsdatum', type: 'date', required: true },
    { name: 'projectName', label: 'Project', labelDe: 'Projekt', type: 'text', required: true },
    { name: 'location', label: 'Location', labelDe: 'Standort', type: 'text' },
    { name: 'assessedBy', label: 'Assessed By', labelDe: 'Beurteilt von', type: 'text', required: true },
    { name: 'hazards', label: 'Hazards', labelDe: 'Gefährdungen', type: 'textarea', required: true },
    { name: 'controlMeasures', label: 'Control Measures', labelDe: 'Schutzmaßnahmen', type: 'textarea' }
  ],
  
  // ===== QUALITY DOCUMENTS =====
  'quality.commissioning_report': [
    { name: 'documentNumber', label: 'Report Number', labelDe: 'Protokollnummer', type: 'text' },
    { name: 'documentDate', label: 'Commissioning Date', labelDe: 'Inbetriebnahmedatum', type: 'date', required: true },
    { name: 'projectName', label: 'Project', labelDe: 'Projekt', type: 'text', required: true },
    { name: 'equipment', label: 'Equipment', labelDe: 'Anlage/Gerät', type: 'text', required: true },
    { name: 'serialNumber', label: 'Serial Number', labelDe: 'Seriennummer', type: 'text' },
    { name: 'commissionedBy', label: 'Commissioned By', labelDe: 'In Betrieb genommen von', type: 'text' },
    { name: 'testResults', label: 'Test Results', labelDe: 'Testergebnisse', type: 'textarea' },
    { name: 'notes', label: 'Notes', labelDe: 'Bemerkungen', type: 'textarea' }
  ],
  
  'quality.measurement_test': [
    { name: 'documentNumber', label: 'Protocol Number', labelDe: 'Protokollnummer', type: 'text' },
    { name: 'documentDate', label: 'Test Date', labelDe: 'Prüfdatum', type: 'date', required: true },
    { name: 'standard', label: 'Standard', labelDe: 'Norm (z.B. VDE 0100)', type: 'text' },
    { name: 'projectName', label: 'Project', labelDe: 'Projekt', type: 'text' },
    { name: 'testedBy', label: 'Tested By', labelDe: 'Geprüft von', type: 'text', required: true },
    { name: 'testResults', label: 'Results', labelDe: 'Messergebnisse', type: 'textarea', required: true },
    { name: 'passed', label: 'Passed', labelDe: 'Bestanden', type: 'select', options: ['Ja', 'Nein', 'Mit Auflagen'] },
    { name: 'notes', label: 'Notes', labelDe: 'Bemerkungen', type: 'textarea' }
  ],
  
  'quality.maintenance_log': [
    { name: 'documentNumber', label: 'Log Number', labelDe: 'Protokollnummer', type: 'text' },
    { name: 'documentDate', label: 'Maintenance Date', labelDe: 'Wartungsdatum', type: 'date', required: true },
    { name: 'equipment', label: 'Equipment', labelDe: 'Anlage/Gerät', type: 'text', required: true },
    { name: 'serialNumber', label: 'Serial Number', labelDe: 'Seriennummer', type: 'text' },
    { name: 'performedBy', label: 'Performed By', labelDe: 'Durchgeführt von', type: 'text' },
    { name: 'workPerformed', label: 'Work Performed', labelDe: 'Durchgeführte Arbeiten', type: 'textarea', required: true },
    { name: 'nextMaintenanceDate', label: 'Next Maintenance', labelDe: 'Nächste Wartung', type: 'date' }
  ],
  
  'quality.photo_doc': [
    { name: 'documentDate', label: 'Photo Date', labelDe: 'Aufnahmedatum', type: 'date' },
    { name: 'projectName', label: 'Project', labelDe: 'Projekt', type: 'text' },
    { name: 'location', label: 'Location', labelDe: 'Standort', type: 'text' },
    { name: 'photographer', label: 'Photographer', labelDe: 'Fotograf', type: 'text' },
    { name: 'description', label: 'Description', labelDe: 'Beschreibung', type: 'textarea' }
  ],
  
  // ===== COMPLIANCE DOCUMENTS =====
  'compliance.certificate': [
    { name: 'documentNumber', label: 'Certificate Number', labelDe: 'Zertifikatsnummer', type: 'text', required: true },
    { name: 'documentDate', label: 'Issue Date', labelDe: 'Ausstellungsdatum', type: 'date', required: true },
    { name: 'holderName', label: 'Certificate Holder', labelDe: 'Zertifikatsinhaber', type: 'text', required: true },
    { name: 'issuerName', label: 'Issuer', labelDe: 'Aussteller', type: 'text', required: true },
    { name: 'certificateType', label: 'Type', labelDe: 'Zertifikatstyp', type: 'text' },
    { name: 'validFrom', label: 'Valid From', labelDe: 'Gültig ab', type: 'date' },
    { name: 'validUntil', label: 'Valid Until', labelDe: 'Gültig bis', type: 'date' },
    { name: 'scope', label: 'Scope', labelDe: 'Geltungsbereich', type: 'textarea' }
  ],
  
  'compliance.insurance': [
    { name: 'documentNumber', label: 'Policy Number', labelDe: 'Versicherungsnummer', type: 'text', required: true },
    { name: 'documentDate', label: 'Policy Date', labelDe: 'Policendatum', type: 'date' },
    { name: 'insuranceCompany', label: 'Insurance Company', labelDe: 'Versicherungsgesellschaft', type: 'text', required: true },
    { name: 'policyHolder', label: 'Policy Holder', labelDe: 'Versicherungsnehmer', type: 'text', required: true },
    { name: 'insuranceType', label: 'Type', labelDe: 'Versicherungsart', type: 'text' },
    { name: 'coverage', label: 'Coverage', labelDe: 'Deckungssumme', type: 'number' },
    { name: 'validFrom', label: 'Valid From', labelDe: 'Gültig ab', type: 'date' },
    { name: 'validUntil', label: 'Valid Until', labelDe: 'Gültig bis', type: 'date' }
  ],
  
  'compliance.vehicle_equipment_inspection': [
    { name: 'documentNumber', label: 'Inspection Number', labelDe: 'Prüfnummer', type: 'text' },
    { name: 'documentDate', label: 'Inspection Date', labelDe: 'Prüfdatum', type: 'date', required: true },
    { name: 'vehicleEquipment', label: 'Vehicle/Equipment', labelDe: 'Fahrzeug/Gerät', type: 'text', required: true },
    { name: 'licenseOrSerial', label: 'License/Serial', labelDe: 'Kennzeichen/Seriennr.', type: 'text' },
    { name: 'inspectionType', label: 'Type', labelDe: 'Prüfart', type: 'select', options: ['TÜV', 'UVV', 'Hauptuntersuchung', 'Sicherheitsprüfung'] },
    { name: 'inspectedBy', label: 'Inspected By', labelDe: 'Geprüft von', type: 'text' },
    { name: 'result', label: 'Result', labelDe: 'Ergebnis', type: 'select', options: ['Bestanden', 'Nicht bestanden', 'Mit Auflagen'] },
    { name: 'nextInspectionDate', label: 'Next Inspection', labelDe: 'Nächste Prüfung', type: 'date' },
    { name: 'defects', label: 'Defects', labelDe: 'Mängel', type: 'textarea' }
  ],
  
  'compliance.training_record': [
    { name: 'documentNumber', label: 'Certificate Number', labelDe: 'Zertifikatsnummer', type: 'text' },
    { name: 'documentDate', label: 'Training Date', labelDe: 'Schulungsdatum', type: 'date', required: true },
    { name: 'participantName', label: 'Participant', labelDe: 'Teilnehmer', type: 'text', required: true },
    { name: 'trainingTitle', label: 'Training Title', labelDe: 'Schulungstitel', type: 'text', required: true },
    { name: 'trainer', label: 'Trainer', labelDe: 'Trainer/Ausbilder', type: 'text' },
    { name: 'duration', label: 'Duration (hours)', labelDe: 'Dauer (Stunden)', type: 'number' },
    { name: 'validUntil', label: 'Valid Until', labelDe: 'Gültig bis', type: 'date' },
    { name: 'result', label: 'Result', labelDe: 'Ergebnis', type: 'select', options: ['Bestanden', 'Nicht bestanden', 'Teilgenommen'] }
  ],
  
  'compliance.gdpr_consent': [
    { name: 'documentDate', label: 'Consent Date', labelDe: 'Einwilligungsdatum', type: 'date', required: true },
    { name: 'dataSubject', label: 'Data Subject', labelDe: 'Betroffene Person', type: 'text', required: true },
    { name: 'purpose', label: 'Purpose', labelDe: 'Zweck', type: 'textarea', required: true },
    { name: 'dataCategories', label: 'Data Categories', labelDe: 'Datenkategorien', type: 'textarea' },
    { name: 'validFrom', label: 'Valid From', labelDe: 'Gültig ab', type: 'date' },
    { name: 'notes', label: 'Notes', labelDe: 'Bemerkungen', type: 'textarea' }
  ]
};

// Helper function to get fields for a document type
export function getFieldsForDocumentType(docType: DocumentType): FieldDefinition[] {
  return DOCUMENT_FIELD_DEFINITIONS[docType] || [
    { name: 'documentNumber', label: 'Document Number', labelDe: 'Dokumentnummer', type: 'text' },
    { name: 'documentDate', label: 'Document Date', labelDe: 'Dokumentdatum', type: 'date', required: true },
    { name: 'description', label: 'Description', labelDe: 'Beschreibung', type: 'textarea', required: true },
    { name: 'notes', label: 'Notes', labelDe: 'Bemerkungen', type: 'textarea' }
  ];
}

