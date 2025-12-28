/**
 * Type-2 Deterministic Analyzer
 * Analyzes CSV/XLS files for Type-2 structure WITHOUT using AI
 * AI is only used as a last resort fallback
 */

import * as Papa from 'papaparse';
import * as ExcelJS from 'exceljs';

export interface Type2Column {
  index: number;
  role: 'article' | 'name' | 'quantity';
  confidence: number;
  sampleValues: string[];
}

export interface Type2AnalysisResult {
  isValid: boolean;
  confidence: number;
  columns: Type2Column[];
  rows: Type2Row[];
  issues: string[];
  autoCorrections: string[];
  shouldEscalateToAI: boolean;
  messageKey: 'VALID' | 'AUTO_CORRECTED' | 'INVALID' | 'ESCALATE_AI';
}

export interface Type2Row {
  article: string;
  name: string;
  quantity: number;
  rawQuantity: string;
}

/**
 * Main entry point: Analyze file structure deterministically
 */
export async function analyzeType2Structure(
  fileName: string,
  buffer: Buffer
): Promise<Type2AnalysisResult> {
  const ext = fileName.toLowerCase().split('.').pop() || '';
  
  let rawData: string[][];
  
  try {
    if (['xlsx', 'xls'].includes(ext)) {
      rawData = await parseExcelToArray(buffer);
    } else if (ext === 'csv') {
      rawData = await parseCsvToArray(buffer);
    } else {
      return createInvalidResult(['Nicht unterstütztes Dateiformat für Typ-2 Import']);
    }
  } catch (error) {
    return createInvalidResult([`Fehler beim Lesen der Datei: ${error}`]);
  }
  
  // Step 1: Clean and normalize data
  const cleaned = cleanRawData(rawData);
  
  if (cleaned.rows.length === 0) {
    return createInvalidResult(['Keine Daten in der Datei gefunden']);
  }
  
  // Step 2: Detect column structure
  const columnAnalysis = analyzeColumns(cleaned.rows);
  
  if (!columnAnalysis.isValid) {
    return {
      isValid: false,
      confidence: 0,
      columns: [],
      rows: [],
      issues: columnAnalysis.issues,
      autoCorrections: [],
      shouldEscalateToAI: columnAnalysis.shouldEscalateToAI,
      messageKey: columnAnalysis.shouldEscalateToAI ? 'ESCALATE_AI' : 'INVALID',
    };
  }
  
  // Step 3: Extract and normalize rows
  const extractResult = extractType2Rows(cleaned.rows, columnAnalysis.columns);
  
  return {
    isValid: true,
    confidence: columnAnalysis.confidence,
    columns: columnAnalysis.columns,
    rows: extractResult.rows,
    issues: [],
    autoCorrections: extractResult.autoCorrections,
    shouldEscalateToAI: false,
    messageKey: extractResult.autoCorrections.length > 0 ? 'AUTO_CORRECTED' : 'VALID',
  };
}

/**
 * Parse Excel file to 2D array
 */
async function parseExcelToArray(buffer: Buffer): Promise<string[][]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as any);
  
  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    throw new Error('Keine Arbeitsblätter gefunden');
  }
  
  const rows: string[][] = [];
  worksheet.eachRow((row: any) => {
    const values = row.values as any[];
    // Skip first element (row number in ExcelJS)
    const rowData = values.slice(1).map((v: any) => String(v || '').trim());
    rows.push(rowData);
  });
  
  return rows;
}

/**
 * Parse CSV file to 2D array with auto-delimiter detection
 */
async function parseCsvToArray(buffer: Buffer): Promise<string[][]> {
  const text = buffer.toString('utf-8');
  
  // Try to detect delimiter
  const delimiters = [',', ';', '\t', '|'];
  let bestDelimiter = ',';
  let maxColumns = 0;
  
  for (const delimiter of delimiters) {
    const result = Papa.parse(text, { delimiter, skipEmptyLines: true });
    if (result.data.length > 0) {
      const firstRow = result.data[0] as string[];
      if (firstRow.length > maxColumns) {
        maxColumns = firstRow.length;
        bestDelimiter = delimiter;
      }
    }
  }
  
  // Parse with best delimiter
  const result = Papa.parse(text, {
    delimiter: bestDelimiter,
    skipEmptyLines: true,
    transformHeader: (header: string) => header.trim(),
    transform: (value: string) => value.trim(),
  });
  
  return result.data as string[][];
}

/**
 * Clean raw data: remove empty rows, trim whitespace, detect header
 */
function cleanRawData(rawData: string[][]): {
  rows: string[][];
  hasHeader: boolean;
  headerRow?: string[];
} {
  // Remove completely empty rows
  const nonEmptyRows = rawData.filter(row => 
    row.some(cell => cell && cell.trim().length > 0)
  );
  
  if (nonEmptyRows.length === 0) {
    return { rows: [], hasHeader: false };
  }
  
  // Detect header row (first row with text-heavy content)
  const firstRow = nonEmptyRows[0];
  const hasHeader = firstRow.every(cell => isNaN(Number(cell)) || cell.trim().length === 0);
  
  if (hasHeader && nonEmptyRows.length > 1) {
    return {
      rows: nonEmptyRows.slice(1),
      hasHeader: true,
      headerRow: firstRow,
    };
  }
  
  return {
    rows: nonEmptyRows,
    hasHeader: false,
  };
}

/**
 * Analyze columns to detect Type-2 structure
 */
function analyzeColumns(rows: string[][]): {
  isValid: boolean;
  confidence: number;
  columns: Type2Column[];
  issues: string[];
  shouldEscalateToAI: boolean;
} {
  if (rows.length === 0) {
    return {
      isValid: false,
      confidence: 0,
      columns: [],
      issues: ['Keine Datenzeilen gefunden'],
      shouldEscalateToAI: false,
    };
  }
  
  // Check consistent column count
  const columnCounts = rows.map(row => row.length);
  const mostCommonCount = mode(columnCounts);
  
  if (mostCommonCount !== 3) {
    const hasTabularStructure = mostCommonCount >= 2 && mostCommonCount <= 5;
    return {
      isValid: false,
      confidence: 0,
      columns: [],
      issues: [
        `Erwartet werden genau 3 Spalten (Artikel / Bezeichnung / Menge).`,
        `Gefunden: ${mostCommonCount} Spalten.`,
      ],
      shouldEscalateToAI: hasTabularStructure,
    };
  }
  
  // Filter rows with exactly 3 columns
  const validRows = rows.filter(row => row.length === mostCommonCount);
  
  if (validRows.length < rows.length * 0.8) {
    return {
      isValid: false,
      confidence: 0,
      columns: [],
      issues: [
        'Zu viele Zeilen mit inkonsistenter Spaltenanzahl',
        `${validRows.length} von ${rows.length} Zeilen haben 3 Spalten`,
      ],
      shouldEscalateToAI: false,
    };
  }
  
  // Analyze each column
  const columnScores: Array<{
    index: number;
    articleScore: number;
    nameScore: number;
    quantityScore: number;
  }> = [];
  
  for (let colIdx = 0; colIdx < 3; colIdx++) {
    const columnValues = validRows.map(row => row[colIdx] || '').filter(v => v.length > 0);
    
    if (columnValues.length === 0) {
      return {
        isValid: false,
        confidence: 0,
        columns: [],
        issues: [`Spalte ${colIdx + 1} ist leer`],
        shouldEscalateToAI: false,
      };
    }
    
    columnScores.push({
      index: colIdx,
      articleScore: scoreAsArticle(columnValues),
      nameScore: scoreAsName(columnValues),
      quantityScore: scoreAsQuantity(columnValues),
    });
  }
  
  // Assign roles based on scores
  const columns: Type2Column[] = [];
  const usedRoles = new Set<string>();
  
  // First pass: assign clear winners
  for (const role of ['quantity', 'article', 'name'] as const) {
    const scoreKey = `${role}Score` as keyof typeof columnScores[0];
    const sorted = [...columnScores].sort((a, b) => b[scoreKey] - a[scoreKey]);
    
    const best = sorted[0];
    const bestScore = best[scoreKey];
    
    if (bestScore > 0.6 && !usedRoles.has(role)) {
      const colIdx = best.index;
      const sampleValues = validRows.slice(0, 5).map(row => row[colIdx] || '');
      
      columns.push({
        index: colIdx,
        role,
        confidence: bestScore,
        sampleValues,
      });
      
      usedRoles.add(role);
      columnScores.splice(columnScores.findIndex(c => c.index === colIdx), 1);
    }
  }
  
  // Second pass: assign remaining roles
  if (columns.length < 3) {
    const remainingRoles = (['article', 'name', 'quantity'] as const).filter(r => !usedRoles.has(r));
    
    for (let i = 0; i < remainingRoles.length && i < columnScores.length; i++) {
      const role = remainingRoles[i];
      const col = columnScores[i];
      const sampleValues = validRows.slice(0, 5).map(row => row[col.index] || '');
      
      columns.push({
        index: col.index,
        role,
        confidence: 0.5,
        sampleValues,
      });
    }
  }
  
  if (columns.length !== 3) {
    return {
      isValid: false,
      confidence: 0,
      columns: [],
      issues: ['Konnte Spaltenrollen nicht eindeutig zuordnen'],
      shouldEscalateToAI: true,
    };
  }
  
  // Sort by index for consistent ordering
  columns.sort((a, b) => a.index - b.index);
  
  const avgConfidence = columns.reduce((sum, col) => sum + col.confidence, 0) / 3;
  
  return {
    isValid: true,
    confidence: avgConfidence,
    columns,
    issues: [],
    shouldEscalateToAI: false,
  };
}

/**
 * Score column as article identifier
 */
function scoreAsArticle(values: string[]): number {
  let score = 0;
  let count = 0;
  
  for (const val of values) {
    count++;
    
    // Short strings
    if (val.length <= 20) score += 0.3;
    
    // Contains numbers
    if (/\d/.test(val)) score += 0.3;
    
    // Contains common article patterns
    if (/^[A-Z0-9\-\.]+$/i.test(val)) score += 0.2;
    
    // Not too long
    if (val.length <= 15) score += 0.2;
  }
  
  return count > 0 ? score / count : 0;
}

/**
 * Score column as name/description
 */
function scoreAsName(values: string[]): number {
  let score = 0;
  let count = 0;
  
  for (const val of values) {
    count++;
    
    // Longer strings
    if (val.length > 15) score += 0.3;
    
    // Contains spaces (natural language)
    if (/\s/.test(val)) score += 0.3;
    
    // Contains letters
    if (/[a-zA-Z]/.test(val)) score += 0.2;
    
    // Not purely numeric
    if (!/^\d+[,.]?\d*$/.test(val)) score += 0.2;
  }
  
  return count > 0 ? score / count : 0;
}

/**
 * Score column as quantity
 */
function scoreAsQuantity(values: string[]): number {
  let score = 0;
  let count = 0;
  
  for (const val of values) {
    count++;
    
    // Numeric value (with optional decimal separator)
    if (/^\d+[,.]?\d*$/.test(val)) {
      score += 0.5;
    }
    
    // Numeric with trivial unit (m, pcs, stk, etc.)
    if (/^\d+[,.]?\d*\s*(m|pcs|stk|stück|pc|piece|pieces)?$/i.test(val)) {
      score += 0.3;
    }
    
    // Short (quantities are typically short)
    if (val.length <= 10) score += 0.2;
  }
  
  return count > 0 ? score / count : 0;
}

/**
 * Extract and normalize Type-2 rows
 */
function extractType2Rows(
  rows: string[][],
  columns: Type2Column[]
): {
  rows: Type2Row[];
  autoCorrections: string[];
} {
  const articleCol = columns.find(c => c.role === 'article')!;
  const nameCol = columns.find(c => c.role === 'name')!;
  const quantityCol = columns.find(c => c.role === 'quantity')!;
  
  const result: Type2Row[] = [];
  const autoCorrections: string[] = [];
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    
    if (row.length !== 3) continue;
    
    const article = row[articleCol.index] || '';
    const name = row[nameCol.index] || '';
    const rawQuantity = row[quantityCol.index] || '';
    
    if (!article || !name || !rawQuantity) continue;
    
    // Normalize quantity
    const normalized = normalizeQuantity(rawQuantity);
    
    if (normalized.corrected) {
      autoCorrections.push(
        `Zeile ${i + 1}: Menge "${rawQuantity}" → ${normalized.value}`
      );
    }
    
    result.push({
      article,
      name,
      quantity: normalized.value,
      rawQuantity,
    });
  }
  
  return { rows: result, autoCorrections };
}

/**
 * Normalize quantity string to number
 */
function normalizeQuantity(raw: string): { value: number; corrected: boolean } {
  let cleaned = raw.trim();
  let corrected = false;
  
  // Remove trivial units
  const withoutUnit = cleaned.replace(/\s*(m|pcs|stk|stück|pc|piece|pieces)$/i, '');
  if (withoutUnit !== cleaned) {
    cleaned = withoutUnit;
    corrected = true;
  }
  
  // Replace comma with dot
  if (cleaned.includes(',')) {
    cleaned = cleaned.replace(',', '.');
    corrected = true;
  }
  
  const num = parseFloat(cleaned);
  
  if (isNaN(num)) {
    return { value: 0, corrected: true };
  }
  
  return { value: num, corrected };
}

/**
 * Create invalid result
 */
function createInvalidResult(issues: string[]): Type2AnalysisResult {
  return {
    isValid: false,
    confidence: 0,
    columns: [],
    rows: [],
    issues,
    autoCorrections: [],
    shouldEscalateToAI: false,
    messageKey: 'INVALID',
  };
}

/**
 * Find most common value in array
 */
function mode(arr: number[]): number {
  const counts = new Map<number, number>();
  for (const val of arr) {
    counts.set(val, (counts.get(val) || 0) + 1);
  }
  
  let maxCount = 0;
  let modeValue = 0;
  
  for (const [val, count] of counts.entries()) {
    if (count > maxCount) {
      maxCount = count;
      modeValue = val;
    }
  }
  
  return modeValue;
}






