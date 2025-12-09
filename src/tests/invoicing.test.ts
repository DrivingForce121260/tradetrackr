jest.mock('@/config/firebase', () => ({ db: {} }));
import { InvoicingService } from '@/services/invoicingService';
import { TaxKey, LineItem } from '@/types/invoicing';

const approxEqual = (a: number, b: number, eps = 0.01) => Math.abs(a - b) <= eps;

describe('Invoicing totals and DATEV export', () => {
  const svc = new InvoicingService('testConcern', 'testUser');
  const taxKeys: TaxKey[] = [
    { key: 'DE19', ratePct: 19, descriptionDe: '', descriptionEn: '' },
    { key: 'DE7', ratePct: 7, descriptionDe: '', descriptionEn: '' },
    { key: 'DE0', ratePct: 0, descriptionDe: '', descriptionEn: '' },
  ];

  it('computes totals with additional discount', () => {
    const items: LineItem[] = [
      { position: 1, description: 'Pos1', quantity: 2, unit: 'Stk', unitPrice: 100, taxKey: 'DE19' },
      { position: 2, description: 'Pos2', quantity: 1, unit: 'Stk', unitPrice: 50, taxKey: 'DE7' },
    ];
    const totals = svc.computeTotals(items, taxKeys, 10);
    expect(approxEqual(totals.subtotalNet, 250)).toBe(true);
    expect(approxEqual(totals.itemNetAfterDiscount, 250)).toBe(true);
    expect(approxEqual(totals.additionalDiscountAbs, 10)).toBe(true);
    expect(approxEqual(Object.values(totals.vatByKey).reduce((a, b) => a + b, 0), totals.totalVat)).toBe(true);
    expect(totals.grandTotalGross).toBeGreaterThan(0);
  });

  it('exports minimal DATEV header', async () => {
    const csv = await svc.exportInvoicesToDATEVCSV([]);
    expect(csv.startsWith('"EXTF"')).toBe(true);
  });
});


