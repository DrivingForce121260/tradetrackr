// ============================================================================
// GENERATE AUFMASS CLOUD FUNCTION - TradeTrackr Portal
// ============================================================================

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as puppeteer from 'puppeteer';
import * as crypto from 'crypto';
import { format } from 'date-fns';

// Types matching the portal types
interface GenerateAufmassRequest {
  projectId: string;
  projectNumber?: string;
  range: {
    mode: 'project' | 'custom';
    from?: string;
    to?: string;
  };
  sources: {
    items: boolean;
    hours: boolean;
    materials: boolean;
  };
  aggregateBy: 'positionUnit' | 'descriptionUnit';
  hideZeroQuantities?: boolean;
  csvAlso: boolean;
}

interface GenerateAufmassResponse {
  docId: string;
  fileName: string;
  storagePath: string;
  csvPath?: string;
  rowCount: number;
  period: {
    from: string;
    to: string;
  };
}

interface ReportRecord {
  reportId: string;
  projectId: string;
  projectNumber?: string;
  date: string;
  items?: Array<{
    position?: string;
    description: string;
    unit?: string;
    quantity?: number;
    unitPrice?: number;
    section?: string;
  }>;
  hours?: Array<{
    employeeId: string;
    role?: string;
    hours: number;
    description?: string;
  }>;
  materials?: Array<{
    sku?: string;
    name: string;
    unit?: string;
    quantity: number;
    unitCost?: number;
  }>;
}

interface AufmassLineItem {
  key: string;
  position?: string;
  description: string;
  unit: string;
  quantity: number;
  section?: string;
  source: 'items' | 'hours' | 'materials';
}

interface AufmassAggregatedLine {
  position?: string;
  description: string;
  unit: string;
  totalQuantity: number;
  section?: string;
}

// Aggregation logic (mirroring client-side)
function normalizeReportToLineItems(
  report: ReportRecord,
  sources: { items: boolean; hours: boolean; materials: boolean }
): AufmassLineItem[] {
  const lineItems: AufmassLineItem[] = [];

  if (sources.items && report.items) {
    for (const item of report.items) {
      if (!item.description) continue;
      
      const quantity = item.quantity || 0;
      const unit = item.unit || 'Stk';
      const position = item.position || '';
      const section = item.section || '';

      lineItems.push({
        key: `${position}__${unit}`,
        position,
        description: item.description,
        unit,
        quantity,
        section,
        source: 'items'
      });
    }
  }

  if (sources.hours && report.hours) {
    const hoursByRole = new Map<string, number>();
    
    for (const entry of report.hours) {
      const role = entry.role || 'Arbeitsstunden';
      const current = hoursByRole.get(role) || 0;
      hoursByRole.set(role, current + entry.hours);
    }

    for (const [role, totalHours] of hoursByRole) {
      lineItems.push({
        key: `HOURS__${role}__h`,
        position: undefined,
        description: role,
        unit: 'h',
        quantity: totalHours,
        source: 'hours'
      });
    }
  }

  if (sources.materials && report.materials) {
    for (const material of report.materials) {
      const sku = material.sku || '';
      const name = material.name || 'Unbekanntes Material';
      const unit = material.unit || 'Stk';
      const quantity = material.quantity || 0;

      lineItems.push({
        key: `${sku}__${unit}`,
        position: sku,
        description: name,
        unit,
        quantity,
        source: 'materials'
      });
    }
  }

  return lineItems;
}

function aggregateLineItems(
  lineItems: AufmassLineItem[],
  aggregateBy: 'positionUnit' | 'descriptionUnit',
  hideZeroQuantities: boolean = true
): AufmassAggregatedLine[] {
  const aggregationMap = new Map<string, AufmassAggregatedLine>();

  for (const item of lineItems) {
    let key: string;
    
    if (aggregateBy === 'positionUnit') {
      const pos = item.position || item.description;
      key = `${pos}__${item.unit}`;
    } else {
      key = `${item.description}__${item.unit}`;
    }

    const existing = aggregationMap.get(key);
    if (existing) {
      existing.totalQuantity += item.quantity;
    } else {
      aggregationMap.set(key, {
        position: item.position,
        description: item.description,
        unit: item.unit,
        totalQuantity: item.quantity,
        section: item.section
      });
    }
  }

  let result = Array.from(aggregationMap.values());

  if (hideZeroQuantities) {
    result = result.filter(line => line.totalQuantity > 0);
  }

  result.sort((a, b) => {
    if (a.position && b.position) {
      const posCompare = a.position.localeCompare(b.position, 'de', { numeric: true });
      if (posCompare !== 0) return posCompare;
    }
    if (a.position && !b.position) return -1;
    if (!a.position && b.position) return 1;
    
    return a.description.localeCompare(b.description, 'de');
  });

  return result;
}

function formatQuantity(quantity: number, unit: string): string {
  if (unit === 'h' || unit.includes('²') || unit.includes('m²')) {
    return quantity.toFixed(2);
  }
  return quantity.toFixed(2);
}

function calculateTotalsByUnit(lines: AufmassAggregatedLine[]): Map<string, number> {
  const totals = new Map<string, number>();
  
  for (const line of lines) {
    const current = totals.get(line.unit) || 0;
    totals.set(line.unit, current + line.totalQuantity);
  }
  
  return totals;
}

// Generate HTML for PDF
function generateAufmassHTML(
  projectNumber: string,
  projectId: string,
  period: { from: string; to: string },
  lines: AufmassAggregatedLine[],
  aggregateBy: 'positionUnit' | 'descriptionUnit'
): string {
  const totals = calculateTotalsByUnit(lines);
  const today = format(new Date(), 'dd.MM.yyyy');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page {
      size: A4;
      margin: 2cm;
    }
    body {
      font-family: 'Arial', sans-serif;
      font-size: 10pt;
      line-height: 1.4;
      color: #333;
    }
    .header {
      margin-bottom: 30px;
      border-bottom: 2px solid #2563eb;
      padding-bottom: 15px;
    }
    .header h1 {
      margin: 0 0 10px 0;
      font-size: 24pt;
      color: #2563eb;
    }
    .header .info {
      display: flex;
      justify-content: space-between;
      font-size: 9pt;
      color: #666;
    }
    .header .info div {
      margin-bottom: 3px;
    }
    .header .info strong {
      color: #333;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      font-size: 9pt;
    }
    thead {
      background-color: #2563eb;
      color: white;
    }
    thead th {
      padding: 10px 8px;
      text-align: left;
      font-weight: 600;
    }
    tbody tr {
      border-bottom: 1px solid #e5e7eb;
    }
    tbody tr:nth-child(even) {
      background-color: #f9fafb;
    }
    tbody td {
      padding: 8px;
    }
    .pos-col {
      width: 100px;
      font-family: 'Courier New', monospace;
      font-size: 8pt;
    }
    .desc-col {
      width: auto;
    }
    .unit-col {
      width: 80px;
      font-weight: 500;
    }
    .qty-col {
      width: 120px;
      text-align: right;
      font-family: 'Courier New', monospace;
    }
    .totals {
      margin-top: 30px;
      padding: 15px;
      background-color: #f3f4f6;
      border-left: 4px solid #2563eb;
    }
    .totals h3 {
      margin: 0 0 10px 0;
      font-size: 12pt;
    }
    .totals .total-item {
      display: inline-block;
      margin-right: 25px;
      margin-bottom: 5px;
      font-size: 10pt;
    }
    .totals .total-item strong {
      font-family: 'Courier New', monospace;
      color: #2563eb;
    }
    .footer {
      position: fixed;
      bottom: 1cm;
      left: 2cm;
      right: 2cm;
      text-align: center;
      font-size: 8pt;
      color: #999;
      border-top: 1px solid #e5e7eb;
      padding-top: 10px;
    }
    .page-number:after {
      content: counter(page);
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Aufmaß</h1>
    <div class="info">
      <div>
        <div><strong>Projekt:</strong> ${projectNumber} / ${projectId}</div>
        <div><strong>Zeitraum:</strong> ${period.from} – ${period.to}</div>
      </div>
      <div>
        <div><strong>Erzeugt am:</strong> ${today}</div>
        <div><strong>Zeilen:</strong> ${lines.length}</div>
      </div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        ${aggregateBy === 'positionUnit' ? '<th class="pos-col">Pos./Key</th>' : ''}
        <th class="desc-col">Beschreibung</th>
        <th class="unit-col">Einheit</th>
        <th class="qty-col">Menge</th>
      </tr>
    </thead>
    <tbody>
      ${lines.map(line => `
        <tr>
          ${aggregateBy === 'positionUnit' ? `<td class="pos-col">${line.position || '-'}</td>` : ''}
          <td class="desc-col">${line.description}</td>
          <td class="unit-col">${line.unit}</td>
          <td class="qty-col">${formatQuantity(line.totalQuantity, line.unit)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="totals">
    <h3>Summen nach Einheit</h3>
    ${Array.from(totals.entries()).map(([unit, total]) => `
      <div class="total-item">
        <strong>${formatQuantity(total, unit)} ${unit}</strong>
      </div>
    `).join('')}
  </div>

  <div class="footer">
    <div>TradeTrackr Aufmaß · Seite <span class="page-number"></span></div>
  </div>
</body>
</html>
  `.trim();
}

// Generate CSV
function generateAufmassCSV(
  lines: AufmassAggregatedLine[],
  aggregateBy: 'positionUnit' | 'descriptionUnit'
): string {
  let csv = '';
  
  if (aggregateBy === 'positionUnit') {
    csv = 'Pos./Key,Beschreibung,Einheit,Menge\n';
    for (const line of lines) {
      csv += `"${line.position || ''}","${line.description}","${line.unit}",${line.totalQuantity}\n`;
    }
  } else {
    csv = 'Beschreibung,Einheit,Menge\n';
    for (const line of lines) {
      csv += `"${line.description}","${line.unit}",${line.totalQuantity}\n`;
    }
  }
  
  return csv;
}

// Main Cloud Function
export const generateAufmass = functions
  .runWith({
    timeoutSeconds: 540,
    memory: '2GB'
  })
  .https.onCall(async (data: GenerateAufmassRequest, context) => {
    // Authentication check
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { projectId, projectNumber, range, sources, aggregateBy, hideZeroQuantities, csvAlso } = data;

    // Validation
    if (!projectId) {
      throw new functions.https.HttpsError('invalid-argument', 'projectId is required');
    }

    const db = admin.firestore();
    const storage = admin.storage();
    const bucket = storage.bucket();

    try {
      // Resolve project number if not provided
      let resolvedProjectNumber = projectNumber;
      if (!resolvedProjectNumber) {
        const projectDoc = await db.collection('projects').doc(projectId).get();
        if (projectDoc.exists) {
          resolvedProjectNumber = projectDoc.data()?.projectNumber || projectId;
        } else {
          resolvedProjectNumber = projectId;
        }
      }

      // Query reports
      const reportsRef = db.collection('projects').doc(projectId).collection('reports');
      let query: any = reportsRef.orderBy('date', 'asc');

      if (range.mode === 'custom' && range.from && range.to) {
        query = reportsRef
          .where('date', '>=', range.from)
          .where('date', '<=', range.to)
          .orderBy('date', 'asc');
      }

      const snapshot = await query.get();
      const reports: ReportRecord[] = [];

      snapshot.forEach((doc: any) => {
        const docData = doc.data();
        reports.push({
          reportId: doc.id,
          projectId: projectId,
          projectNumber: resolvedProjectNumber,
          date: docData.date || docData.reportDate || docData.workDate,
          items: docData.items || [],
          hours: docData.hours || [],
          materials: docData.materials || []
        });
      });

      if (reports.length === 0) {
        throw new functions.https.HttpsError('not-found', 'No reports found for the specified criteria');
      }

      // Determine date range
      const dates = reports.map(r => r.date).filter(Boolean).sort();
      const periodFrom = range.mode === 'custom' && range.from ? range.from : dates[0];
      const periodTo = range.mode === 'custom' && range.to ? range.to : dates[dates.length - 1];

      // Normalize and aggregate
      const allLineItems: AufmassLineItem[] = [];
      for (const report of reports) {
        const items = normalizeReportToLineItems(report, sources);
        allLineItems.push(...items);
      }

      const aggregatedLines = aggregateLineItems(allLineItems, aggregateBy, hideZeroQuantities ?? true);

      if (aggregatedLines.length === 0) {
        throw new functions.https.HttpsError('failed-precondition', 'No data found after aggregation');
      }

      // Generate PDF
      const html = generateAufmassHTML(
        resolvedProjectNumber,
        projectId,
        { from: periodFrom, to: periodTo },
        aggregatedLines,
        aggregateBy
      );

      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '2cm',
          right: '2cm',
          bottom: '2cm',
          left: '2cm'
        }
      });

      await browser.close();

      // Generate filenames
      const today = format(new Date(), 'yyyy-MM-dd');
      const docId = `doc_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
      const fileName = `Aufmass_${resolvedProjectNumber}_${today}.pdf`;
      const year = new Date().getFullYear();
      const storagePath = `documents/${year}/${resolvedProjectNumber}/${docId}/${fileName}`;

      // Upload PDF to Storage
      const file = bucket.file(storagePath);
      await file.save(pdfBuffer, {
        contentType: 'application/pdf',
        metadata: {
          contentType: 'application/pdf',
          metadata: {
            uploadedBy: context.auth.uid,
            projectId: projectId,
            projectNumber: resolvedProjectNumber,
            type: 'project.aufmass'
          }
        }
      });

      // Compute hash
      const hash = crypto.createHash('sha256').update(pdfBuffer).digest('hex');

      // Create Firestore document record
      const docRecord = {
        docId,
        projectId,
        type: 'project.aufmass',
        status: 'stored',
        storagePath: `gs://reportingapp817.firebasestorage.app/${storagePath}`,
        originalFilename: fileName,
        mimeType: 'application/pdf',
        sizeBytes: pdfBuffer.length,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        createdBy: context.auth.uid,
        concernId: context.auth.token.concernID || null,
        meta: {
          date: today,
          textSample: `Aufmaß ${resolvedProjectNumber} ${periodFrom} - ${periodTo}`,
          hashSha256: hash
        }
      };

      await db.collection('documents').doc(docId).set(docRecord);

      // Link to project
      await db.collection('projects').doc(projectId).collection('documents').doc(docId).set({
        docId,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      let csvPath: string | undefined;

      // Generate CSV if requested
      if (csvAlso) {
        const csvContent = generateAufmassCSV(aggregatedLines, aggregateBy);
        const csvFileName = `Aufmass_${resolvedProjectNumber}_${today}.csv`;
        const csvStoragePath = `documents/${year}/${resolvedProjectNumber}/${docId}/${csvFileName}`;
        
        const csvFile = bucket.file(csvStoragePath);
        await csvFile.save(csvContent, {
          contentType: 'text/csv',
          metadata: {
            contentType: 'text/csv',
            metadata: {
              uploadedBy: context.auth.uid,
              projectId: projectId,
              projectNumber: resolvedProjectNumber,
              type: 'project.aufmass'
            }
          }
        });

        csvPath = `gs://reportingapp817.firebasestorage.app/${csvStoragePath}`;
      }

      const response: GenerateAufmassResponse = {
        docId,
        fileName,
        storagePath: `gs://reportingapp817.firebasestorage.app/${storagePath}`,
        csvPath,
        rowCount: aggregatedLines.length,
        period: {
          from: periodFrom,
          to: periodTo
        }
      };

      return response;

    } catch (error: any) {
      console.error('Error generating Aufmaß:', error);
      
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      
      throw new functions.https.HttpsError('internal', `Failed to generate Aufmaß: ${error.message}`);
    }
  });













