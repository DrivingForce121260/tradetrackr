import { validateHMAC } from '../../functions/src/automation/webhook';

describe('Automation Webhook - HMAC Signature', () => {
	it('validates correct HMAC signature', () => {
		const payload = JSON.stringify({ foo: 'bar', n: 1 });
		const secret = 'TEST_SECRET_123';
		const crypto = require('crypto');
		const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

		expect(validateHMAC(payload, signature, secret)).toBe(true);
	});

	it('rejects incorrect HMAC signature', () => {
		const payload = JSON.stringify({ foo: 'bar', n: 1 });
		const secret = 'TEST_SECRET_123';
		const badSignature = 'deadbeef';

		expect(() => validateHMAC(payload, badSignature, secret)).toThrow();
	});
});

describe('Automation Function Exports', () => {
	it('automation function is exported path-like', async () => {
		const index = await import('../../functions/src/index');
		// Ensure the export exists
		expect(index).toHaveProperty('automationWebhook');
	});
});












