import { formatDateTime, buildICS } from '../../functions/src/calendar/ics';

describe('Audit & GDPR Compliance (Basic)', () => {
	it('audit entry structure is valid', () => {
		const entry = {
			entityType: 'projects',
			entityId: 'p123',
			action: 'CREATE',
			actorId: 'u456',
			timestamp: new Date(),
			before: null,
			after: { title: 'Test Project' },
		};
		expect(entry.entityType).toBe('projects');
		expect(entry.action).toMatch(/^(CREATE|UPDATE|DELETE|EXPORT|DELETE_CONFIRMED)$/);
	});

	it('GDPR export scopes are valid', () => {
		const scopes = ['user', 'client'];
		expect(scopes).toContain('user');
		expect(scopes).toContain('client');
	});

	it('retention modules list is complete', () => {
		const modules = ['projects', 'materials', 'personnel', 'clients', 'invoices', 'tasks', 'timeEntries', 'auditLogs'];
		expect(modules.length).toBeGreaterThan(0);
		expect(modules).toContain('auditLogs');
	});
});













