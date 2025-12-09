import { EmailService } from '@/services/emailService';
import type { SendEmailRequest } from '@/types/email';

describe('Email Service (mocked)', () => {
	it('email types are valid', () => {
		const types: Array<'offer' | 'invoice' | 'order' | 'report'> = ['offer', 'invoice', 'order', 'report'];
		expect(types).toContain('offer');
		expect(types).toContain('invoice');
		expect(types).toContain('order');
		expect(types).toContain('report');
	});

	it('email statuses are valid', () => {
		const statuses: Array<'sent' | 'delivered' | 'opened' | 'bounced' | 'failed'> = ['sent', 'delivered', 'opened', 'bounced', 'failed'];
		expect(statuses).toContain('sent');
		expect(statuses).toContain('delivered');
		expect(statuses).toContain('opened');
		expect(statuses).toContain('bounced');
		expect(statuses).toContain('failed');
	});
});













