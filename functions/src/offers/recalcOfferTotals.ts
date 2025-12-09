import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

interface LineItem {
	position: number;
	description: string;
	quantity: number;
	unit: string;
	unitPrice: number;
	taxKey: string;
	type?: 'material' | 'labor' | 'service';
	unitCost?: number;
	unitSell?: number;
	markupPct?: number;
	lineMargin?: number;
	materialId?: string;
	personnelId?: string;
}

interface CalcSummary {
	materialsCost: number;
	laborCost: number;
	overheadPct: number;
	overheadValue: number;
	marginPct: number;
	marginValue: number;
	sellTotal: number;
	costTotal: number;
}

function calculateSummary(items: LineItem[], overheadPct: number): CalcSummary {
	let materialsCost = 0;
	let laborCost = 0;

	items.forEach((item: LineItem) => {
		const cost = (item.unitCost || 0) * item.quantity;
		if (item.type === 'material') {
			materialsCost += cost;
		} else if (item.type === 'labor') {
			laborCost += cost;
		} else {
			materialsCost += cost * 0.5;
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

export const recalcOfferTotals = functions.https.onCall(async (data: { offerId: string; overheadPct?: number }, context) => {
	if (!context.auth) {
		throw new functions.https.HttpsError('unauthenticated', 'Login erforderlich');
	}

	const { offerId, overheadPct = 10 } = data;
	if (!offerId) {
		throw new functions.https.HttpsError('invalid-argument', 'offerId erforderlich');
	}

	const offerSnap = await db.collection('offers').doc(offerId).get();
	if (!offerSnap.exists) {
		throw new functions.https.HttpsError('not-found', 'Angebot nicht gefunden');
	}

	const offer = offerSnap.data() as any;
	if (offer.calcSummary?.snapshotLocked) {
		throw new functions.https.HttpsError('failed-precondition', 'Kosten sind gesperrt');
	}

	const items = (offer.lineItems || []) as LineItem[];
	const calcSummary = calculateSummary(items, overheadPct);

	await offerSnap.ref.update({
		calcSummary,
		updatedAt: admin.firestore.FieldValue.serverTimestamp(),
	});

	return { success: true, calcSummary };
});













