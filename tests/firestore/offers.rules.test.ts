/**
 * Firestore Security Rules Tests: Offers Collection
 * 
 * Tests the security rules for:
 * - /offers/{offerId}
 * - /offers/{offerId}/history/{eventId}
 * 
 * Run with: npm run test:rules
 * Requires: Firebase Emulator running (npm run emulators)
 */

import {
	initializeTestEnvironment,
	assertSucceeds,
	assertFails,
	RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, addDoc } from 'firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';
import { describe, it, beforeAll, afterAll, beforeEach, expect } from 'vitest';

// Test configuration
const PROJECT_ID = 'demo-tradetrackr';
const CONCERN_A = 'CONCERN_A';
const CONCERN_B = 'CONCERN_B';

let testEnv: RulesTestEnvironment;

// Load rules from project root
const rulesPath = path.join(__dirname, '../../firestore.rules');

beforeAll(async () => {
	testEnv = await initializeTestEnvironment({
		projectId: PROJECT_ID,
		firestore: {
			rules: fs.readFileSync(rulesPath, 'utf8'),
			host: '127.0.0.1',
			port: 8080,
		},
	});
});

afterAll(async () => {
	await testEnv.cleanup();
});

beforeEach(async () => {
	await testEnv.clearFirestore();
});

/**
 * Create authenticated context for a user with concernID claim
 */
function getAuthContext(userId: string, concernID: string) {
	return testEnv.authenticatedContext(userId, { concernID });
}

/**
 * Seed a draft offer using rules-disabled context
 */
async function seedDraftOffer(offerId: string, concernID: string) {
	await testEnv.withSecurityRulesDisabled(async (ctx) => {
		const db = ctx.firestore();
		await setDoc(doc(db, 'offers', offerId), {
			concernID,
			state: 'draft',
			documentType: 'offer',
			clientId: 'test_client',
			clientSnapshot: { name: 'Test Client' },
			locale: 'de',
			currency: 'EUR',
			issueDate: new Date().toISOString().slice(0, 10),
			lineItems: [],
			taxKeys: [],
			totals: {
				subtotalNet: 0,
				lineDiscountTotal: 0,
				itemNetAfterDiscount: 0,
				additionalDiscountAbs: 0,
				vatByKey: {},
				totalVat: 0,
				grandTotalGross: 0,
			},
			createdBy: 'seed_user',
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			number: 'TEST-001',
		});
	});
}

/**
 * Finalize an offer using rules-disabled context (simulates Cloud Function)
 */
async function finalizeOffer(offerId: string) {
	await testEnv.withSecurityRulesDisabled(async (ctx) => {
		const db = ctx.firestore();
		await updateDoc(doc(db, 'offers', offerId), {
			state: 'sent',
			sentAt: new Date().toISOString(),
			finalizedAt: new Date().toISOString(),
		});
	});
}

// ============================================
// OFFER DOCUMENT TESTS
// ============================================

describe('Offers Collection - Read Access', () => {
	it('T1: User can read offer from their concern', async () => {
		await seedDraftOffer('offer1', CONCERN_A);
		
		const ctx = getAuthContext('userA', CONCERN_A);
		const db = ctx.firestore();
		
		await assertSucceeds(getDoc(doc(db, 'offers', 'offer1')));
	});

	it('T2: User CANNOT read offer from different concern (cross-tenant blocked)', async () => {
		await seedDraftOffer('offer1', CONCERN_A);
		
		const ctx = getAuthContext('userB', CONCERN_B);
		const db = ctx.firestore();
		
		await assertFails(getDoc(doc(db, 'offers', 'offer1')));
	});

	it('T3: Unauthenticated user CANNOT read offers', async () => {
		await seedDraftOffer('offer1', CONCERN_A);
		
		const ctx = testEnv.unauthenticatedContext();
		const db = ctx.firestore();
		
		await assertFails(getDoc(doc(db, 'offers', 'offer1')));
	});
});

describe('Offers Collection - Create Access', () => {
	it('T4: User can create draft offer for their concern', async () => {
		const ctx = getAuthContext('userA', CONCERN_A);
		const db = ctx.firestore();
		
		await assertSucceeds(setDoc(doc(db, 'offers', 'newOffer'), {
			concernID: CONCERN_A,
			state: 'draft',
			documentType: 'offer',
			clientId: 'test_client',
			clientSnapshot: { name: 'Test' },
			locale: 'de',
			currency: 'EUR',
			issueDate: '2024-01-01',
			lineItems: [],
			taxKeys: [],
			totals: {},
			createdBy: 'userA',
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			number: 'NEW-001',
		}));
	});

	it('T5: User CANNOT create offer for different concern', async () => {
		const ctx = getAuthContext('userA', CONCERN_A);
		const db = ctx.firestore();
		
		await assertFails(setDoc(doc(db, 'offers', 'newOffer'), {
			concernID: CONCERN_B, // Different concern!
			state: 'draft',
			documentType: 'offer',
			clientId: 'test_client',
			clientSnapshot: { name: 'Test' },
			locale: 'de',
			currency: 'EUR',
			issueDate: '2024-01-01',
			lineItems: [],
			taxKeys: [],
			totals: {},
			createdBy: 'userA',
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			number: 'NEW-001',
		}));
	});

	it('T6: User CANNOT create offer with state other than draft', async () => {
		const ctx = getAuthContext('userA', CONCERN_A);
		const db = ctx.firestore();
		
		await assertFails(setDoc(doc(db, 'offers', 'newOffer'), {
			concernID: CONCERN_A,
			state: 'sent', // Not allowed!
			documentType: 'offer',
			clientId: 'test_client',
			clientSnapshot: { name: 'Test' },
			locale: 'de',
			currency: 'EUR',
			issueDate: '2024-01-01',
			lineItems: [],
			taxKeys: [],
			totals: {},
			createdBy: 'userA',
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
			number: 'NEW-001',
		}));
	});
});

describe('Offers Collection - Update Access (Draft)', () => {
	it('T7: User can update draft offer (normal edit)', async () => {
		await seedDraftOffer('offer1', CONCERN_A);
		
		const ctx = getAuthContext('userA', CONCERN_A);
		const db = ctx.firestore();
		
		await assertSucceeds(updateDoc(doc(db, 'offers', 'offer1'), {
			noteCustomer: 'Updated note',
			updatedAt: new Date().toISOString(),
			// state remains 'draft'
			state: 'draft',
			concernID: CONCERN_A,
		}));
	});

	it('T8: User CANNOT change state from draft to sent', async () => {
		await seedDraftOffer('offer1', CONCERN_A);
		
		const ctx = getAuthContext('userA', CONCERN_A);
		const db = ctx.firestore();
		
		await assertFails(updateDoc(doc(db, 'offers', 'offer1'), {
			state: 'sent', // Not allowed from client!
			concernID: CONCERN_A,
		}));
	});

	it('T9: User CANNOT change concernID', async () => {
		await seedDraftOffer('offer1', CONCERN_A);
		
		const ctx = getAuthContext('userA', CONCERN_A);
		const db = ctx.firestore();
		
		await assertFails(updateDoc(doc(db, 'offers', 'offer1'), {
			concernID: CONCERN_B, // Cannot change tenant!
			state: 'draft',
		}));
	});

	it('T10: User from different concern CANNOT update offer', async () => {
		await seedDraftOffer('offer1', CONCERN_A);
		
		const ctx = getAuthContext('userB', CONCERN_B);
		const db = ctx.firestore();
		
		await assertFails(updateDoc(doc(db, 'offers', 'offer1'), {
			noteCustomer: 'Hacked',
			state: 'draft',
			concernID: CONCERN_A,
		}));
	});
});

describe('Offers Collection - Update Access (Finalized)', () => {
	it('T11: User CANNOT update finalized offer', async () => {
		await seedDraftOffer('offer1', CONCERN_A);
		await finalizeOffer('offer1');
		
		const ctx = getAuthContext('userA', CONCERN_A);
		const db = ctx.firestore();
		
		await assertFails(updateDoc(doc(db, 'offers', 'offer1'), {
			noteCustomer: 'Try to update after finalization',
			state: 'sent',
			concernID: CONCERN_A,
		}));
	});

	it('T12: User CANNOT change state of finalized offer', async () => {
		await seedDraftOffer('offer1', CONCERN_A);
		await finalizeOffer('offer1');
		
		const ctx = getAuthContext('userA', CONCERN_A);
		const db = ctx.firestore();
		
		await assertFails(updateDoc(doc(db, 'offers', 'offer1'), {
			state: 'accepted', // Cannot change
			concernID: CONCERN_A,
		}));
	});
});

describe('Offers Collection - Delete Access', () => {
	it('T13: User CANNOT delete offers', async () => {
		await seedDraftOffer('offer1', CONCERN_A);
		
		const ctx = getAuthContext('userA', CONCERN_A);
		const db = ctx.firestore();
		
		await assertFails(deleteDoc(doc(db, 'offers', 'offer1')));
	});
});

// ============================================
// OFFER HISTORY SUBCOLLECTION TESTS
// ============================================

describe('Offer History - Read Access', () => {
	it('T14: User can read history from their concern\'s offer', async () => {
		await seedDraftOffer('offer1', CONCERN_A);
		
		// Seed a history entry
		await testEnv.withSecurityRulesDisabled(async (ctx) => {
			const db = ctx.firestore();
			await setDoc(doc(db, 'offers', 'offer1', 'history', 'h1'), {
				offerId: 'offer1',
				type: 'CREATED',
				at: new Date().toISOString(),
				byUserId: 'seed',
				byUserName: 'Seed',
				summary: 'Created',
			});
		});
		
		const ctx = getAuthContext('userA', CONCERN_A);
		const db = ctx.firestore();
		
		await assertSucceeds(getDoc(doc(db, 'offers', 'offer1', 'history', 'h1')));
	});

	it('T15: User CANNOT read history from different concern\'s offer', async () => {
		await seedDraftOffer('offer1', CONCERN_A);
		
		await testEnv.withSecurityRulesDisabled(async (ctx) => {
			const db = ctx.firestore();
			await setDoc(doc(db, 'offers', 'offer1', 'history', 'h1'), {
				offerId: 'offer1',
				type: 'CREATED',
				at: new Date().toISOString(),
				byUserId: 'seed',
				byUserName: 'Seed',
				summary: 'Created',
			});
		});
		
		const ctx = getAuthContext('userB', CONCERN_B);
		const db = ctx.firestore();
		
		await assertFails(getDoc(doc(db, 'offers', 'offer1', 'history', 'h1')));
	});
});

describe('Offer History - Create Access (Draft Offer)', () => {
	it('T16: User can create CREATED history while offer is draft', async () => {
		await seedDraftOffer('offer1', CONCERN_A);
		
		const ctx = getAuthContext('userA', CONCERN_A);
		const db = ctx.firestore();
		
		await assertSucceeds(setDoc(doc(db, 'offers', 'offer1', 'history', 'h1'), {
			offerId: 'offer1',
			type: 'CREATED',
			at: new Date().toISOString(),
			byUserId: 'userA',
			byUserName: 'User A',
			summary: 'Angebot erstellt',
		}));
	});

	it('T17: User can create UPDATED history while offer is draft', async () => {
		await seedDraftOffer('offer1', CONCERN_A);
		
		const ctx = getAuthContext('userA', CONCERN_A);
		const db = ctx.firestore();
		
		await assertSucceeds(setDoc(doc(db, 'offers', 'offer1', 'history', 'h2'), {
			offerId: 'offer1',
			type: 'UPDATED',
			at: new Date().toISOString(),
			byUserId: 'userA',
			byUserName: 'User A',
			summary: 'Angebot bearbeitet',
		}));
	});

	it('T18: User can create PDF_GENERATED history while offer is draft', async () => {
		await seedDraftOffer('offer1', CONCERN_A);
		
		const ctx = getAuthContext('userA', CONCERN_A);
		const db = ctx.firestore();
		
		await assertSucceeds(setDoc(doc(db, 'offers', 'offer1', 'history', 'h3'), {
			offerId: 'offer1',
			type: 'PDF_GENERATED',
			at: new Date().toISOString(),
			byUserId: 'userA',
			byUserName: 'User A',
			summary: 'PDF erstellt',
		}));
	});

	it('T19: User CANNOT create SENT history (server-only)', async () => {
		await seedDraftOffer('offer1', CONCERN_A);
		
		const ctx = getAuthContext('userA', CONCERN_A);
		const db = ctx.firestore();
		
		await assertFails(setDoc(doc(db, 'offers', 'offer1', 'history', 'h4'), {
			offerId: 'offer1',
			type: 'SENT', // Not allowed from client!
			at: new Date().toISOString(),
			byUserId: 'userA',
			byUserName: 'User A',
			summary: 'Should fail',
		}));
	});

	it('T20: User CANNOT create FINALIZED history (server-only)', async () => {
		await seedDraftOffer('offer1', CONCERN_A);
		
		const ctx = getAuthContext('userA', CONCERN_A);
		const db = ctx.firestore();
		
		await assertFails(setDoc(doc(db, 'offers', 'offer1', 'history', 'h5'), {
			offerId: 'offer1',
			type: 'FINALIZED', // Not allowed from client!
			at: new Date().toISOString(),
			byUserId: 'userA',
			byUserName: 'User A',
			summary: 'Should fail',
		}));
	});

	it('T21: User from different concern CANNOT create history', async () => {
		await seedDraftOffer('offer1', CONCERN_A);
		
		const ctx = getAuthContext('userB', CONCERN_B);
		const db = ctx.firestore();
		
		await assertFails(setDoc(doc(db, 'offers', 'offer1', 'history', 'h6'), {
			offerId: 'offer1',
			type: 'CREATED',
			at: new Date().toISOString(),
			byUserId: 'userB',
			byUserName: 'User B',
			summary: 'Hacked',
		}));
	});
});

describe('Offer History - Create Access (Finalized Offer)', () => {
	it('T22: User CANNOT create any history after offer is finalized', async () => {
		await seedDraftOffer('offer1', CONCERN_A);
		await finalizeOffer('offer1');
		
		const ctx = getAuthContext('userA', CONCERN_A);
		const db = ctx.firestore();
		
		await assertFails(setDoc(doc(db, 'offers', 'offer1', 'history', 'h7'), {
			offerId: 'offer1',
			type: 'UPDATED', // Even allowed type fails after finalization
			at: new Date().toISOString(),
			byUserId: 'userA',
			byUserName: 'User A',
			summary: 'Should fail - offer finalized',
		}));
	});
});

describe('Offer History - Update/Delete Access', () => {
	it('T23: User CANNOT update existing history entry (immutable)', async () => {
		await seedDraftOffer('offer1', CONCERN_A);
		
		await testEnv.withSecurityRulesDisabled(async (ctx) => {
			const db = ctx.firestore();
			await setDoc(doc(db, 'offers', 'offer1', 'history', 'h1'), {
				offerId: 'offer1',
				type: 'CREATED',
				at: new Date().toISOString(),
				byUserId: 'seed',
				byUserName: 'Seed',
				summary: 'Original',
			});
		});
		
		const ctx = getAuthContext('userA', CONCERN_A);
		const db = ctx.firestore();
		
		await assertFails(updateDoc(doc(db, 'offers', 'offer1', 'history', 'h1'), {
			summary: 'Modified', // Cannot update!
		}));
	});

	it('T24: User CANNOT delete history entry (audit trail)', async () => {
		await seedDraftOffer('offer1', CONCERN_A);
		
		await testEnv.withSecurityRulesDisabled(async (ctx) => {
			const db = ctx.firestore();
			await setDoc(doc(db, 'offers', 'offer1', 'history', 'h1'), {
				offerId: 'offer1',
				type: 'CREATED',
				at: new Date().toISOString(),
				byUserId: 'seed',
				byUserName: 'Seed',
				summary: 'Cannot delete',
			});
		});
		
		const ctx = getAuthContext('userA', CONCERN_A);
		const db = ctx.firestore();
		
		await assertFails(deleteDoc(doc(db, 'offers', 'offer1', 'history', 'h1')));
	});
});



