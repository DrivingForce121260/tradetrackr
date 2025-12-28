/**
 * Category Type Detection Utility
 * Automatically detects if data should be Type 1 or Type 2
 */

export interface Type2Item {
  id: string;
  order?: number;
  value1: string;
  value2: string;
  value3: string;
}

export interface TypeDetectionResult {
  recommendedType: 'type1' | 'type2';
  confidence: 'high' | 'medium' | 'low';
  reason: string;
  warnings: string[];
  stats: {
    totalRows: number;
    rowsWithAllThreeColumns: number;
    rowsWithOnlyFirstColumn: number;
    emptyLevel2Count: number;
    emptyLevel3Count: number;
    percentageComplete: number;
  };
}

/**
 * Analyzes Type 2 data to determine if it should actually be Type 1
 * 
 * LOGIC:
 * - If >80% of rows have only value1 (column 1) filled → Type 1
 * - If >70% of rows have all 3 columns filled → Type 2
 * - Otherwise → Type 2 with warning
 */
export function detectCategoryType(items: Type2Item[]): TypeDetectionResult {
  // Filter out completely empty rows
  const nonEmptyItems = items.filter(item => 
    item.value1.trim() || item.value2.trim() || item.value3.trim()
  );

  if (nonEmptyItems.length === 0) {
    return {
      recommendedType: 'type1',
      confidence: 'low',
      reason: 'Keine Daten vorhanden',
      warnings: ['Es wurden keine Daten eingegeben'],
      stats: {
        totalRows: 0,
        rowsWithAllThreeColumns: 0,
        rowsWithOnlyFirstColumn: 0,
        emptyLevel2Count: 0,
        emptyLevel3Count: 0,
        percentageComplete: 0
      }
    };
  }

  // Count different patterns
  let rowsWithAllThree = 0;
  let rowsWithOnlyFirst = 0;
  let emptyLevel2 = 0;
  let emptyLevel3 = 0;

  for (const item of nonEmptyItems) {
    const hasValue1 = item.value1.trim().length > 0;
    const hasValue2 = item.value2.trim().length > 0;
    const hasValue3 = item.value3.trim().length > 0;

    if (hasValue1 && hasValue2 && hasValue3) {
      rowsWithAllThree++;
    } else if (hasValue1 && !hasValue2 && !hasValue3) {
      rowsWithOnlyFirst++;
    }

    if (!hasValue2) emptyLevel2++;
    if (!hasValue3) emptyLevel3++;
  }

  const totalRows = nonEmptyItems.length;
  const percentageComplete = (rowsWithAllThree / totalRows) * 100;
  const percentageOnlyFirst = (rowsWithOnlyFirst / totalRows) * 100;

  const stats = {
    totalRows,
    rowsWithAllThreeColumns: rowsWithAllThree,
    rowsWithOnlyFirstColumn: rowsWithOnlyFirst,
    emptyLevel2Count: emptyLevel2,
    emptyLevel3Count: emptyLevel3,
    percentageComplete: Math.round(percentageComplete)
  };

  const warnings: string[] = [];

  // DECISION LOGIC

  // Case 1: >80% have only first column → Clearly Type 1
  if (percentageOnlyFirst >= 80) {
    return {
      recommendedType: 'type1',
      confidence: 'high',
      reason: `${Math.round(percentageOnlyFirst)}% der Zeilen haben nur die erste Spalte ausgefüllt. Dies ist eine einfache Liste.`,
      warnings: [
        'Die Daten passen besser zu Kategorie Typ 1 (einfache Liste)',
        'Spalte 2 und 3 sind größtenteils leer',
        'Empfehlung: Verwenden Sie Kategorie Typ 1 stattdessen'
      ],
      stats
    };
  }

  // Case 2: >70% complete → Clearly Type 2
  if (percentageComplete >= 70) {
    return {
      recommendedType: 'type2',
      confidence: 'high',
      reason: `${Math.round(percentageComplete)}% der Zeilen haben alle 3 Spalten ausgefüllt. Dies ist eine strukturierte 3-Spalten-Kategorie.`,
      warnings: [],
      stats
    };
  }

  // Case 3: 50-70% complete → Type 2 with warning
  if (percentageComplete >= 50) {
    warnings.push(
      `Nur ${Math.round(percentageComplete)}% der Zeilen sind vollständig ausgefüllt`,
      'Einige Zeilen haben leere Spalten',
      'Prüfen Sie, ob alle Daten korrekt sind'
    );

    return {
      recommendedType: 'type2',
      confidence: 'medium',
      reason: `${Math.round(percentageComplete)}% der Zeilen haben alle 3 Spalten. Wird als Typ 2 behandelt, aber mit Warnungen.`,
      warnings,
      stats
    };
  }

  // Case 4: 30-50% only first column → Probably should be Type 1
  if (percentageOnlyFirst >= 30) {
    warnings.push(
      `${Math.round(percentageOnlyFirst)}% der Zeilen haben nur die erste Spalte`,
      'Dies könnte eine einfache Liste sein',
      'Erwägen Sie, Kategorie Typ 1 zu verwenden'
    );

    return {
      recommendedType: 'type1',
      confidence: 'medium',
      reason: `${Math.round(percentageOnlyFirst)}% der Zeilen haben nur die erste Spalte. Empfehlung: Typ 1.`,
      warnings,
      stats
    };
  }

  // Case 5: Mixed data, unclear pattern → Type 2 with strong warning
  warnings.push(
    'Die Daten haben kein klares Muster',
    `Nur ${Math.round(percentageComplete)}% der Zeilen sind vollständig`,
    'Prüfen Sie die Datenstruktur',
    'Möglicherweise fehlen Daten oder die Struktur ist inkonsistent'
  );

  return {
    recommendedType: 'type2',
    confidence: 'low',
    reason: 'Gemischte Datenstruktur. Wird als Typ 2 behandelt, aber bitte Daten prüfen.',
    warnings,
    stats
  };
}

/**
 * Generates a user-friendly message for the detection result
 */
export function getDetectionMessage(result: TypeDetectionResult): {
  title: string;
  description: string;
  variant: 'default' | 'warning' | 'info';
} {
  if (result.recommendedType === 'type1' && result.confidence === 'high') {
    return {
      title: '💡 Hinweis: Einfache Liste erkannt',
      description: result.reason + ' Die Daten werden automatisch als Typ 1 gespeichert.',
      variant: 'info'
    };
  }

  if (result.recommendedType === 'type1' && result.confidence === 'medium') {
    return {
      title: '⚠️ Warnung: Möglicherweise falsche Struktur',
      description: result.reason + ' Empfehlung: Verwenden Sie Kategorie Typ 1.',
      variant: 'warning'
    };
  }

  if (result.recommendedType === 'type2' && result.warnings.length > 0) {
    return {
      title: '⚠️ Warnung: Unvollständige Daten',
      description: result.reason + ' ' + result.warnings[0],
      variant: 'warning'
    };
  }

  return {
    title: '✅ Datenstruktur erkannt',
    description: result.reason,
    variant: 'default'
  };
}






