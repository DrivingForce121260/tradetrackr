import { OfferCostingService } from '@/services/offerCostingService';
import { LineItem, CalcSummary } from '@/types/invoicing';

describe('OfferCostingService', () => {
	let service: OfferCostingService;
	const concernID = 'test-concern';

	beforeEach(() => {
		service = new OfferCostingService(concernID, 10);
	});

	describe('calculateSummary', () => {
		it('should calculate correct totals for material items', async () => {
			const items: LineItem[] = [
				{
					position: 1,
					description: 'Material 1',
					quantity: 10,
					unit: 'Stk',
					unitPrice: 20,
					unitCost: 15,
					type: 'material',
					taxKey: 'DE19',
				},
				{
					position: 2,
					description: 'Material 2',
					quantity: 5,
					unit: 'Stk',
					unitPrice: 30,
					unitCost: 20,
					type: 'material',
					taxKey: 'DE19',
				},
			];

			const summary = await service.calculateSummary(items, 10);
			expect(summary.materialsCost).toBe(250); // (10 * 15) + (5 * 20)
			expect(summary.laborCost).toBe(0);
			expect(summary.overheadValue).toBe(25); // 10% of 250
			expect(summary.costTotal).toBe(275); // 250 + 25
			expect(summary.sellTotal).toBe(350); // (10 * 20) + (5 * 30)
			expect(summary.marginValue).toBe(75); // 350 - 275
			expect(summary.marginPct).toBeCloseTo(21.43, 1); // (75 / 350) * 100
		});

		it('should calculate correct totals for labor items', async () => {
			const items: LineItem[] = [
				{
					position: 1,
					description: 'Labor 1',
					quantity: 8,
					unit: 'Std',
					unitPrice: 50,
					unitCost: 30,
					type: 'labor',
					taxKey: 'DE19',
				},
			];

			const summary = await service.calculateSummary(items, 10);
			expect(summary.materialsCost).toBe(0);
			expect(summary.laborCost).toBe(240); // 8 * 30
			expect(summary.overheadValue).toBe(24); // 10% of 240
			expect(summary.costTotal).toBe(264); // 240 + 24
			expect(summary.sellTotal).toBe(400); // 8 * 50
			expect(summary.marginValue).toBe(136); // 400 - 264
			expect(summary.marginPct).toBe(34); // (136 / 400) * 100
		});

		it('should round values to 2 decimals', async () => {
			const items: LineItem[] = [
				{
					position: 1,
					description: 'Item',
					quantity: 3,
					unit: 'Stk',
					unitPrice: 10.333,
					unitCost: 7.777,
					type: 'material',
					taxKey: 'DE19',
				},
			];

			const summary = await service.calculateSummary(items, 10);
			expect(summary.materialsCost).toBe(23.33);
			expect(summary.sellTotal).toBe(30.99);
			expect(summary.marginPct).toBeCloseTo(20.0, 0);
		});

		it('should handle margin < 5% (red)', async () => {
			const items: LineItem[] = [
				{
					position: 1,
					description: 'Low margin',
					quantity: 100,
					unit: 'Stk',
					unitPrice: 11,
					unitCost: 10,
					type: 'material',
					taxKey: 'DE19',
				},
			];

			const summary = await service.calculateSummary(items, 10);
			expect(summary.marginPct).toBeLessThan(5);
		});

		it('should handle empty items array', async () => {
			const summary = await service.calculateSummary([], 10);
			expect(summary.materialsCost).toBe(0);
			expect(summary.laborCost).toBe(0);
			expect(summary.costTotal).toBe(0);
			expect(summary.sellTotal).toBe(0);
			expect(summary.marginValue).toBe(0);
			expect(summary.marginPct).toBe(0);
		});
	});

	describe('enrichItemWithCost', () => {
		it('should calculate line margin correctly', async () => {
			const item: LineItem = {
				position: 1,
				description: 'Test',
				quantity: 5,
				unit: 'Stk',
				unitPrice: 20,
				unitCost: 15,
				type: 'material',
				taxKey: 'DE19',
			};

			const enriched = await service.enrichItemWithCost(item);
			expect(enriched.lineMargin).toBe(25); // (5 * 20) - (5 * 15)
			expect(enriched.markupPct).toBeCloseTo(33.33, 1); // ((20 - 15) / 15) * 100
		});
	});
});













