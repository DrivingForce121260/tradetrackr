import { mergePlaceholders } from '@/lib/mergePlaceholders';

describe('Template placeholder merging', () => {
	const html = `
    <html><body>
      <h1>{{document.title}} {{invoice.number}}</h1>
      <div>{{client.name}}</div>
      <div>{{branding.footerText}}</div>
    </body></html>`;

	const data = {
		client: { name: 'Muster GmbH' },
		invoice: { number: '2025-0001' },
		document: { title: 'Rechnung' },
		branding: { footerText: 'Rechtlicher Hinweis' },
	};

	it('merges placeholders correctly', () => {
		const result = mergePlaceholders(html, data);
		expect(result).toMatchSnapshot();
	});
});

describe('Version rollback logic (simulated)', () => {
	it('restores previous html body from history', () => {
		const history = [
			{ version: 1, htmlBody: '<div>v1</div>' },
			{ version: 2, htmlBody: '<div>v2</div>' },
		];
		const restoreVersion = (target: number) => {
			const h = history.find((h) => h.version === target);
			if (!h) throw new Error('not found');
			return h.htmlBody;
		};
		expect(restoreVersion(1)).toBe('<div>v1</div>');
		expect(restoreVersion(2)).toBe('<div>v2</div>');
	});
});














