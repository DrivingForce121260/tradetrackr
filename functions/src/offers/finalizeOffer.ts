/**
 * Cloud Function: finalizeOffer
 * 
 * Callable function that atomically finalizes an offer:
 * - Validates user belongs to the offer's concern
 * - Updates offer state to 'sent' (read-only)
 * - Writes history entries (SENT + FINALIZED) with server timestamps
 * - Prevents client-side bypass of finalization logic
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

interface FinalizeOfferRequest {
	offerId: string;
}

interface FinalizeOfferResponse {
	success: boolean;
	message: string;
	alreadyFinalized?: boolean;
}

export const finalizeOffer = functions
	.region('europe-west1')
	.https.onCall(async (data: FinalizeOfferRequest, context): Promise<FinalizeOfferResponse> => {
		// 1. Verify authentication
		if (!context.auth) {
			throw new functions.https.HttpsError('unauthenticated', 'Benutzer nicht authentifiziert.');
		}

		const { offerId } = data;

		if (!offerId || typeof offerId !== 'string') {
			throw new functions.https.HttpsError('invalid-argument', 'offerId ist erforderlich.');
		}

		const userId = context.auth.uid;
		// Get user name from token or fetch from users collection
		const userName = context.auth.token.name || context.auth.token.email || 'Unbekannt';

		try {
			// 2. Load offer document
			const offerRef = db.collection('offers').doc(offerId);
			const offerDoc = await offerRef.get();

			if (!offerDoc.exists) {
				throw new functions.https.HttpsError('not-found', 'Angebot nicht gefunden.');
			}

			const offerData = offerDoc.data()!;

			// 3. Validate offer has concernID field (runtime check)
			const offerConcernId = offerData.concernID;
			if (!offerConcernId) {
				functions.logger.error(`Offer ${offerId} is missing concernID field`);
				throw new functions.https.HttpsError(
					'failed-precondition',
					'Angebot hat keine gültige Mandanten-ID.'
				);
			}

			// 4. Validate user belongs to offer's concern
			const userConcernId = context.auth.token.concernID || context.auth.token.tenantId;

			if (!userConcernId || offerConcernId !== userConcernId) {
				throw new functions.https.HttpsError(
					'permission-denied',
					'Keine Berechtigung für dieses Angebot.'
				);
			}

			// 5. Check if already finalized (idempotent success)
			if (offerData.state !== 'draft') {
				return {
					success: true,
					message: 'Angebot bereits finalisiert.',
					alreadyFinalized: true,
				};
			}

			// 6. Prepare atomic update with batch
			const batch = db.batch();
			const serverTimestamp = admin.firestore.FieldValue.serverTimestamp();

			// Update offer document
			batch.update(offerRef, {
				state: 'sent',
				sentAt: serverTimestamp,
				sentBy: { userId, name: userName },
				finalizedAt: serverTimestamp,
				finalizedBy: { userId, name: userName },
				updatedAt: serverTimestamp,
			});

			// 7. Write history entries
			// Note: No tenant field in history - scoped by parent offer
			const historyRef = offerRef.collection('history');

			// SENT event
			const sentEventRef = historyRef.doc();
			batch.set(sentEventRef, {
				offerId,
				type: 'SENT',
				at: serverTimestamp,
				byUserId: userId,
				byUserName: userName,
				summary: 'Angebot als versendet markiert',
			});

			// FINALIZED event
			const finalizedEventRef = historyRef.doc();
			batch.set(finalizedEventRef, {
				offerId,
				type: 'FINALIZED',
				at: serverTimestamp,
				byUserId: userId,
				byUserName: userName,
				summary: 'Angebot finalisiert (keine Bearbeitung mehr möglich)',
			});

			// 8. Commit batch
			await batch.commit();

			functions.logger.info(`Offer ${offerId} finalized by user ${userId}`);

			return {
				success: true,
				message: 'Angebot erfolgreich finalisiert.',
			};
		} catch (error: any) {
			functions.logger.error('Error finalizing offer:', error);

			if (error instanceof functions.https.HttpsError) {
				throw error;
			}

			throw new functions.https.HttpsError(
				'internal',
				'Fehler beim Finalisieren des Angebots: ' + (error.message || 'Unbekannter Fehler')
			);
		}
	});

