import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { LineItem, CalcSummary } from '@/types/invoicing';

export class OfferCostingService {
	private concernID: string;
	private defaultOverheadPct: number;

	constructor(concernID: string, defaultOverheadPct: number = 10) {
		this.concernID = concernID;
		this.defaultOverheadPct = defaultOverheadPct;
	}

	async enrichItemWithCost(item: LineItem): Promise<LineItem> {
		const enriched = { ...item };

		if (item.type === 'material' && item.materialId) {
			const matSnap = await getDoc(doc(db, 'materials', item.materialId));
			if (matSnap.exists()) {
				const mat = matSnap.data() as any;
				enriched.unitCost = mat.unitPrice || mat.price || enriched.unitCost || 0;
			}
		} else if (item.type === 'labor' && item.personnelId) {
			const persSnap = await getDoc(doc(db, 'personnel', item.personnelId));
			if (persSnap.exists()) {
				const pers = persSnap.data() as any;
				enriched.unitCost = pers.hourlyRate || pers.rate || enriched.unitCost || 0;
			}
		}

		if (enriched.unitCost && enriched.quantity) {
			const sell = enriched.unitSell || enriched.unitPrice || 0;
			const costTotal = enriched.unitCost * enriched.quantity;
			const sellTotal = sell * enriched.quantity;
			enriched.lineMargin = sellTotal - costTotal;
			if (sellTotal > 0) {
				enriched.markupPct = ((sell - enriched.unitCost) / enriched.unitCost) * 100;
			}
		}

		return enriched;
	}

	async calculateSummary(items: LineItem[], overheadPct: number): Promise<CalcSummary> {
		let materialsCost = 0;
		let laborCost = 0;

		items.forEach(item => {
			const cost = (item.unitCost || 0) * item.quantity;
			if (item.type === 'material') {
				materialsCost += cost;
			} else if (item.type === 'labor') {
				laborCost += cost;
			} else {
				materialsCost += cost * 0.5; // Default split for services
				laborCost += cost * 0.5;
			}
		});

		const costBeforeOverhead = materialsCost + laborCost;
		const overheadValue = (costBeforeOverhead * overheadPct) / 100;
		const costTotal = costBeforeOverhead + overheadValue;

		const sellTotal = items.reduce((sum, item) => {
			const sell = item.unitSell || item.unitPrice || 0;
			return sum + (sell * item.quantity);
		}, 0);

		const marginValue = sellTotal - costTotal;
		const marginPct = sellTotal > 0 ? (marginValue / sellTotal) * 100 : 0;

		return {
			materialsCost: Math.round(materialsCost * 100) / 100,
			laborCost: Math.round(laborCost * 100) / 100,
			overheadPct,
			overheadValue: Math.round(overheadValue * 100) / 100,
			marginPct: Math.round(marginPct * 100) / 100,
			marginValue: Math.round(marginValue * 100) / 100,
			sellTotal: Math.round(sellTotal * 100) / 100,
			costTotal: Math.round(costTotal * 100) / 100,
		};
	}
}
