import React, { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Offer } from '@/types/invoicing';
import { InvoicingService } from '@/services/invoicingService';
import OfferCalculationTab from './OfferCalculationTab';

interface OfferDetailProps {
	offer: Offer;
	onBack?: () => void;
	onUpdate?: (offer: Offer) => Promise<void>;
}

const OfferDetail: React.FC<OfferDetailProps> = ({ offer, onBack, onUpdate }) => {
	const { user } = useAuth();
	const concernID = user?.concernID || user?.ConcernID;
	const [currentOffer, setCurrentOffer] = useState<Offer>(offer);

	const invoicingService = useMemo(() => {
		if (!concernID || !user?.uid) return null;
		return new InvoicingService(concernID, user.uid);
	}, [concernID, user?.uid]);

	const handleUpdate = async (updated: Offer) => {
		if (!invoicingService) return;
		await invoicingService.updateOffer(updated.id, updated);
		setCurrentOffer(updated);
		if (onUpdate) {
			await onUpdate(updated);
		}
	};

	return (
		<div className="min-h-screen bg-gray-50">
			<Card className="m-4">
				<CardHeader>
					<div className="flex items-center justify-between">
						<CardTitle>Angebot {offer.number}</CardTitle>
						{onBack && (
							<button onClick={onBack} className="text-sm text-gray-600 hover:text-gray-900">
								← Zurück
							</button>
						)}
					</div>
				</CardHeader>
				<CardContent>
					<Tabs defaultValue="details" className="w-full">
						<TabsList>
							<TabsTrigger value="details">Details</TabsTrigger>
							<TabsTrigger value="calculation">Kalkulation</TabsTrigger>
						</TabsList>
						<TabsContent value="details" className="mt-4">
							<div className="space-y-4">
								<div>
									<span className="font-semibold">Kunde:</span> {offer.clientSnapshot?.name || offer.clientId}
								</div>
								<div>
									<span className="font-semibold">Datum:</span> {offer.issueDate}
								</div>
								<div>
									<span className="font-semibold">Status:</span> {offer.state}
								</div>
								<div>
									<span className="font-semibold">Summe (brutto):</span> {offer.totals?.grandTotalGross?.toFixed(2) || '0.00'} €
								</div>
								{offer.calcSummary && (
									<div className="mt-4 p-4 bg-gray-50 rounded">
										<h4 className="font-semibold mb-2">Kostenübersicht:</h4>
										<div className="space-y-1 text-sm">
											<div>Materialkosten: {offer.calcSummary.materialsCost.toFixed(2)} €</div>
											<div>Arbeitskosten: {offer.calcSummary.laborCost.toFixed(2)} €</div>
											<div>Gemeinkosten ({offer.calcSummary.overheadPct}%): {offer.calcSummary.overheadValue.toFixed(2)} €</div>
											<div className="font-bold">Gesamtkosten: {offer.calcSummary.costTotal.toFixed(2)} €</div>
											<div>Verkaufspreis: {offer.calcSummary.sellTotal.toFixed(2)} €</div>
											<div className="font-bold">Marge: {offer.calcSummary.marginValue.toFixed(2)} € ({offer.calcSummary.marginPct.toFixed(2)}%)</div>
										</div>
									</div>
								)}
							</div>
						</TabsContent>
						<TabsContent value="calculation" className="mt-4">
							<OfferCalculationTab offer={currentOffer} onUpdate={handleUpdate} />
						</TabsContent>
					</Tabs>
				</CardContent>
			</Card>
		</div>
	);
};

export default OfferDetail;













