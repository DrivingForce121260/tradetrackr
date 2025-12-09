// ============================================================================
// AUFMASS AGGREGATION LOGIC - TradeTrackr Portal
// ============================================================================

import type {
  ReportRecord,
  AufmassLineItem,
  AufmassAggregatedLine,
  AggregationOptions
} from '@/types/aufmass';

/**
 * Normalize report data into line items
 */
export function normalizeReportToLineItems(
  report: ReportRecord,
  sources: { items: boolean; hours: boolean; materials: boolean }
): AufmassLineItem[] {
  const lineItems: AufmassLineItem[] = [];

  // Process items
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

  // Process hours
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

  // Process materials
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

/**
 * Aggregate line items by the specified key
 */
export function aggregateLineItems(
  lineItems: AufmassLineItem[],
  options: AggregationOptions
): AufmassAggregatedLine[] {
  const { aggregateBy, hideZeroQuantities = true } = options;
  
  const aggregationMap = new Map<string, AufmassAggregatedLine>();

  for (const item of lineItems) {
    let key: string;
    
    if (aggregateBy === 'positionUnit') {
      // Group by (position || description, unit)
      const pos = item.position || item.description;
      key = `${pos}__${item.unit}`;
    } else {
      // Group by (description, unit)
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

  // Convert map to array
  let result = Array.from(aggregationMap.values());

  // Filter out zero quantities if requested
  if (hideZeroQuantities) {
    result = result.filter(line => line.totalQuantity > 0);
  }

  // Sort by position (if available) then by description
  result.sort((a, b) => {
    // First sort by position if both have it
    if (a.position && b.position) {
      const posCompare = a.position.localeCompare(b.position, 'de', { numeric: true });
      if (posCompare !== 0) return posCompare;
    }
    // If one has position and other doesn't, prioritize the one with position
    if (a.position && !b.position) return -1;
    if (!a.position && b.position) return 1;
    
    // Then sort by description
    return a.description.localeCompare(b.description, 'de');
  });

  return result;
}

/**
 * Aggregate multiple reports into a single Aufmaß
 */
export function aggregateReports(
  reports: ReportRecord[],
  sources: { items: boolean; hours: boolean; materials: boolean },
  options: AggregationOptions
): AufmassAggregatedLine[] {
  // Normalize all reports to line items
  const allLineItems: AufmassLineItem[] = [];
  
  for (const report of reports) {
    const items = normalizeReportToLineItems(report, sources);
    allLineItems.push(...items);
  }

  // Aggregate the line items
  return aggregateLineItems(allLineItems, options);
}

/**
 * Calculate totals by unit
 */
export function calculateTotalsByUnit(lines: AufmassAggregatedLine[]): Map<string, number> {
  const totals = new Map<string, number>();
  
  for (const line of lines) {
    const current = totals.get(line.unit) || 0;
    totals.set(line.unit, current + line.totalQuantity);
  }
  
  return totals;
}

/**
 * Format quantity with appropriate decimal places
 */
export function formatQuantity(quantity: number, unit: string): string {
  // Hours typically have 2 decimal places
  if (unit === 'h') {
    return quantity.toFixed(2);
  }
  
  // Currencies have 2 decimal places
  if (unit === '€' || unit === 'EUR') {
    return quantity.toFixed(2);
  }
  
  // m² and other area measurements typically have 2 decimal places
  if (unit.includes('²') || unit.includes('m²')) {
    return quantity.toFixed(2);
  }
  
  // Most other measurements can have 2 decimal places
  return quantity.toFixed(2);
}













