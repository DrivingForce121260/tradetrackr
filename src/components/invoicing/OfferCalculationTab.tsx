import React, { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lock, Unlock, Save } from 'lucide-react';
import { Offer, LineItem, CalcSummary } from '@/types/invoicing';
import { OfferCostingService } from '@/services/offerCostingService';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { InvoicingService } from '@/services/invoicingService';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/config/firebase';

interface OfferCalculationTabProps {
	offer: Offer;
	onUpdate: (offer: Offer) => Promise<void>;
}

const OfferCalculationTab: React.FC<OfferCalculationTabProps> = ({ offer, onUpdate }) => {
	const { user } = useAuth();
	const { toast } = useToast();
	const concernID = user?.concernID || user?.ConcernID;
	const [items, setItems] = useState<LineItem[]>(offer.lineItems || []);
	const [overheadPct, setOverheadPct] = useState<number>(offer.calcSummary?.overheadPct || 10);
	const [snapshotLocked, setSnapshotLocked] = useState<boolean>(offer.calcSummary?.snapshotLocked || false);
	const [summary, setSummary] = useState<CalcSummary | null>(offer.calcSummary || null);
	const [materials, setMaterials] = useState<any[]>([]);
	const [personnel, setPersonnel] = useState<any[]>([]);
	const [loading, setLoading] = useState(false);
	const [recalcTrigger, setRecalcTrigger] = useState(0);

	const costingService = useMemo(() => {
		if (!concernID) return null;
		return new OfferCostingService(concernID, overheadPct);
	}, [concernID, overheadPct]);

	const invoicingService = useMemo(() => {
		if (!concernID || !user?.uid) return null;
		return new InvoicingService(concernID, user.uid);
	}, [concernID, user?.uid]);

	useEffect(() => { (async () => {
		if (!concernID) return;
		const [matSnap, persSnap] = await Promise.all([
			getDocs(query(collection(db, 'materials'), where('concernID', '==', concernID), where('active', '==', true))),
			getDocs(query(collection(db, 'personnel'), where('concernID', '==', concernID))),
		]);
		setMaterials(matSnap.docs.map(d => ({ id: d.id, ...d.data() })));
		setPersonnel(persSnap.docs.map(d => ({ id: d.id, ...d.data() })));
	})(); }, [concernID]);

	useEffect(() => {
		if (offer.id) {
			setItems(offer.lineItems || []);
			setOverheadPct(offer.calcSummary?.overheadPct || 10);
			setSnapshotLocked(offer.calcSummary?.snapshotLocked || false);
			setSummary(offer.calcSummary || null);
			setRecalcTrigger(prev => prev + 1);
		}
	}, [offer.id, offer.lineItems?.length, offer.calcSummary?.snapshotLocked]);

	useEffect(() => {
		if (snapshotLocked) return;
		if (!costingService) return;
		(async () => {
			const enriched = await Promise.all(items.map(it => costingService.enrichItemWithCost(it)));
			setItems(prev => {
				// Only update if actually changed
				const changed = prev.length !== enriched.length || prev.some((p, i) => {
					const e = enriched[i];
					return p.unitCost !== e.unitCost || p.lineMargin !== e.lineMargin;
				});
				return changed ? enriched : prev;
			});
			const calc = await costingService.calculateSummary(enriched, overheadPct);
			setSummary(calc);
		})();
	}, [recalcTrigger, overheadPct, snapshotLocked, costingService, items.length]);

	const handleItemChange = async (index: number, field: keyof LineItem, value: any) => {
		if (snapshotLocked) return;
		const newItems = items.map((it, i) => i === index ? { ...it, [field]: (field === 'quantity' || field === 'unitCost' || field === 'unitSell' || field === 'markupPct' || field === 'lineMargin') ? Number(value) : value } : it);
		setItems(newItems);
		setRecalcTrigger(prev => prev + 1);
	};

	const handleLockSnapshot = async () => {
		if (!summary || !invoicingService) return;
		setLoading(true);
		try {
			const lockedSummary: CalcSummary = {
				...summary,
				snapshotDate: new Date().toISOString(),
				snapshotLocked: true,
			};
			await invoicingService.updateOffer(offer.id, { calcSummary: lockedSummary });
			setSnapshotLocked(true);
			toast({ title: 'Snapshot gespeichert', description: 'Kosten wurden eingefroren.' });
		} catch (e: any) {
			toast({ title: 'Fehler', description: e.message, variant: 'destructive' });
		} finally {
			setLoading(false);
		}
	};

	const handleUnlockSnapshot = async () => {
		if (!invoicingService) return;
		setLoading(true);
		try {
			await invoicingService.updateOffer(offer.id, { calcSummary: { ...summary, snapshotLocked: false, snapshotDate: undefined } as CalcSummary });
			setSnapshotLocked(false);
			toast({ title: 'Snapshot entsperrt', description: 'Kosten können neu berechnet werden.' });
		} catch (e: any) {
			toast({ title: 'Fehler', description: e.message, variant: 'destructive' });
		} finally {
			setLoading(false);
		}
	};

	const handleSave = async () => {
		if (!invoicingService) return;
		setLoading(true);
		try {
			await invoicingService.updateOffer(offer.id, { lineItems: items, calcSummary: summary || undefined });
			toast({ title: 'Gespeichert', description: 'Angebot aktualisiert.' });
		} catch (e: any) {
			toast({ title: 'Fehler', description: e.message, variant: 'destructive' });
		} finally {
			setLoading(false);
		}
	};

	const getMarginColor = (pct: number): string => {
		if (pct < 5) return 'bg-red-500';
		if (pct < 10) return 'bg-yellow-500';
		return 'bg-green-500';
	};

	return (
		<div className="space-y-6">
			<Card>
				<CardHeader className="flex flex-row items-center justify-between">
					<CardTitle>Kalkulation</CardTitle>
					<div className="flex gap-2">
						{snapshotLocked ? (
							<Button variant="outline" onClick={handleUnlockSnapshot} disabled={loading}>
								<Unlock className="h-4 w-4 mr-2" /> Entsperren
							</Button>
						) : (
							<Button variant="outline" onClick={handleLockSnapshot} disabled={loading || !summary}>
								<Lock className="h-4 w-4 mr-2" /> Snapshot speichern
							</Button>
						)}
						<Button onClick={handleSave} disabled={loading || snapshotLocked}>
							<Save className="h-4 w-4 mr-2" /> Speichern
						</Button>
					</div>
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						<div className="flex items-center gap-4">
							<Label>Gemeinkosten</Label>
							<Input
								type="number"
								min="0"
								max="100"
								value={overheadPct}
								onChange={e => {
									setOverheadPct(Number(e.target.value));
									setRecalcTrigger(prev => prev + 1);
								}}
								disabled={snapshotLocked}
								className="w-24"
							/>
							<span className="text-sm text-gray-500">%</span>
						</div>

						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Pos</TableHead>
									<TableHead>Typ</TableHead>
									<TableHead>Beschreibung</TableHead>
									<TableHead>Menge</TableHead>
									<TableHead>Einheit</TableHead>
									<TableHead>EK/Std</TableHead>
									<TableHead>VK/Std</TableHead>
									<TableHead>Marge</TableHead>
									<TableHead>Aktionen</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{items.map((item, idx) => (
									<TableRow key={idx}>
										<TableCell>{item.position}</TableCell>
										<TableCell>
											<Select
												value={item.type || 'service'}
												onValueChange={v => handleItemChange(idx, 'type', v)}
												disabled={snapshotLocked}
											>
												<SelectTrigger className="w-32">
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="material">Material</SelectItem>
													<SelectItem value="labor">Arbeit</SelectItem>
													<SelectItem value="service">Service</SelectItem>
												</SelectContent>
											</Select>
										</TableCell>
										<TableCell>{item.description}</TableCell>
										<TableCell>
											<Input
												type="number"
												value={item.quantity}
												onChange={e => handleItemChange(idx, 'quantity', e.target.value)}
												disabled={snapshotLocked}
												className="w-20"
											/>
										</TableCell>
										<TableCell>{item.unit}</TableCell>
										<TableCell>
											<Input
												type="number"
												step="0.01"
												value={item.unitCost || ''}
												onChange={e => handleItemChange(idx, 'unitCost', e.target.value)}
												disabled={snapshotLocked}
												className="w-24"
											/>
										</TableCell>
										<TableCell>
											<Input
												type="number"
												step="0.01"
												value={item.unitSell || item.unitPrice || ''}
												onChange={e => handleItemChange(idx, 'unitSell', e.target.value)}
												disabled={snapshotLocked}
												className="w-24"
											/>
										</TableCell>
										<TableCell>
											{item.lineMargin !== undefined ? (
												<span className={getMarginColor((item.lineMargin / ((item.quantity * (item.unitSell || item.unitPrice)) || 1)) * 100)}>
													{((item.lineMargin / ((item.quantity * (item.unitSell || item.unitPrice)) || 1)) * 100).toFixed(1)}%
												</span>
											) : '-'}
										</TableCell>
										<TableCell>
											{item.type === 'material' && (
												<Select
													value={item.materialId || ''}
													onValueChange={v => handleItemChange(idx, 'materialId', v)}
													disabled={snapshotLocked}
												>
													<SelectTrigger className="w-40">
														<SelectValue placeholder="Material" />
													</SelectTrigger>
													<SelectContent>
														{materials.map(m => (
															<SelectItem key={m.id} value={m.id}>{m.name || m.id}</SelectItem>
														))}
													</SelectContent>
												</Select>
											)}
											{item.type === 'labor' && (
												<Select
													value={item.personnelId || ''}
													onValueChange={v => handleItemChange(idx, 'personnelId', v)}
													disabled={snapshotLocked}
												>
													<SelectTrigger className="w-40">
														<SelectValue placeholder="Person" />
													</SelectTrigger>
													<SelectContent>
														{personnel.map(p => (
															<SelectItem key={p.id} value={p.id}>{p.name || p.id}</SelectItem>
														))}
													</SelectContent>
												</Select>
											)}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				</CardContent>
			</Card>

			{summary && (
				<Card>
					<CardHeader>
						<CardTitle>Kostenübersicht</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-2">
							<div className="flex justify-between">
								<span>Materialkosten:</span>
								<span>{summary.materialsCost.toFixed(2)} €</span>
							</div>
							<div className="flex justify-between">
								<span>Arbeitskosten:</span>
								<span>{summary.laborCost.toFixed(2)} €</span>
							</div>
							<div className="flex justify-between">
								<span>Gemeinkosten ({summary.overheadPct}%):</span>
								<span>{summary.overheadValue.toFixed(2)} €</span>
							</div>
							<div className="flex justify-between font-bold">
								<span>Gesamtkosten:</span>
								<span>{summary.costTotal.toFixed(2)} €</span>
							</div>
							<div className="flex justify-between">
								<span>Verkaufspreis:</span>
								<span>{summary.sellTotal.toFixed(2)} €</span>
							</div>
							<div className="flex justify-between font-bold">
								<span>Marge:</span>
								<span>{summary.marginValue.toFixed(2)} € ({summary.marginPct.toFixed(2)}%)</span>
							</div>
							<div className="mt-4">
								<div className="h-8 rounded bg-gray-200 overflow-hidden">
									<div
										className={`h-full ${getMarginColor(summary.marginPct)} transition-all`}
										style={{ width: `${Math.min(100, Math.max(0, summary.marginPct))}%` }}
									/>
								</div>
								<div className="text-xs text-gray-500 mt-1">
									Margin: {summary.marginPct.toFixed(2)}% {summary.marginPct < 5 ? '(Niedrig)' : summary.marginPct < 10 ? '(Moderat)' : '(Gut)'}
								</div>
							</div>
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
};

export default OfferCalculationTab;

