'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Lock, AlertTriangle, Loader2, CheckCircle } from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { functionsEU } from '@/config/firebase';

interface FinalizeOfferDialogProps {
	open: boolean;
	onClose: () => void;
	onSuccess: () => void; // Called after successful finalization
	offerId: string;
	offerNumber: string;
}

interface FinalizeOfferResponse {
	success: boolean;
	message: string;
	alreadyFinalized?: boolean;
}

export function FinalizeOfferDialog({ open, onClose, onSuccess, offerId, offerNumber }: FinalizeOfferDialogProps) {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function handleConfirm() {
		setLoading(true);
		setError(null);

		try {
			// Call the Cloud Function
			const finalizeOfferFn = httpsCallable<{ offerId: string }, FinalizeOfferResponse>(
				functionsEU,
				'finalizeOffer'
			);

			const result = await finalizeOfferFn({ offerId });

			if (result.data.success) {
				onSuccess();
				onClose();
			} else {
				setError(result.data.message || 'Unbekannter Fehler');
			}
		} catch (err: any) {
			console.error('Error finalizing offer:', err);
			
			// Extract error message from Firebase callable error
			const errorMessage = err.message || err.details || 'Fehler beim Finalisieren des Angebots';
			setError(errorMessage);
		} finally {
			setLoading(false);
		}
	}

	return (
		<Dialog open={open} onOpenChange={(o) => !o && onClose()}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2 text-amber-600">
						<Lock className="h-5 w-5" />
						Angebot finalisieren
					</DialogTitle>
					<DialogDescription className="pt-2">
						Angebot {offerNumber} als versendet markieren
					</DialogDescription>
				</DialogHeader>

				<div className="py-4 space-y-4">
					{/* Error message */}
					{error && (
						<div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
							<AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
							<div className="text-sm text-red-800">
								<p className="font-semibold">Fehler</p>
								<p>{error}</p>
							</div>
						</div>
					)}

					{/* Warning box */}
					<div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
						<AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
						<div className="text-sm text-amber-800">
							<p className="font-semibold mb-1">
								Achtung: Diese Aktion kann nicht rückgängig gemacht werden.
							</p>
							<p>
								Nach dem Finalisieren kann das Angebot nicht mehr bearbeitet werden. 
								Es wird als "Gesendet" markiert und ist schreibgeschützt.
							</p>
						</div>
					</div>

					<p className="text-sm text-gray-600">
						Wurde die E-Mail mit dem Angebot erfolgreich versendet?
					</p>
				</div>

				<DialogFooter className="gap-2 sm:gap-0">
					<Button 
						variant="outline" 
						onClick={onClose}
						disabled={loading}
					>
						Noch nicht versendet
					</Button>
					<Button 
						onClick={handleConfirm}
						disabled={loading}
						className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white"
					>
						{loading ? (
							<>
								<Loader2 className="h-4 w-4 mr-2 animate-spin" />
								Wird finalisiert...
							</>
						) : (
							<>
								<Lock className="h-4 w-4 mr-2" />
								Ja, finalisieren
							</>
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

export default FinalizeOfferDialog;
