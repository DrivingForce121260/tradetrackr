import { buildICS, formatDateTime } from '../../functions/src/calendar/ics';

describe('ICS helpers', () => {
	it('formatDateTime returns RFC5545 UTC format', () => {
		const dt = new Date(Date.UTC(2025, 0, 2, 3, 4, 5)); // 2025-01-02T03:04:05Z
		expect(formatDateTime(dt)).toBe('20250102T030405Z');
	});

	it('buildICS produces a valid VCALENDAR with events', () => {
		const start = new Date(Date.UTC(2025, 9, 31, 8, 0, 0));
		const end = new Date(Date.UTC(2025, 9, 31, 12, 0, 0));
		const ics = buildICS('Test Kalender', [{
			uid: 'slot123@tradetrackr',
			summary: 'Projekt A Einsatz',
			description: 'Adresse Musterstraße 1 Notiz',
			location: 'Musterstraße 1, 12345 Musterstadt',
			start,
			end,
			status: 'CONFIRMED',
		}]);
		expect(ics).toContain('BEGIN:VCALENDAR');
		expect(ics).toContain('END:VCALENDAR');
		expect(ics).toContain('BEGIN:VEVENT');
		expect(ics).toContain('UID:slot123@tradetrackr');
		expect(ics).toContain('SUMMARY:Projekt A Einsatz');
		expect(ics).toContain('LOCATION:Musterstraße 1, 12345 Musterstadt');
		expect(ics).toContain('DTSTART:20251031T080000Z');
		expect(ics).toContain('DTEND:20251031T120000Z');
	});

	it('buildICS produces empty calendar skeleton when no events', () => {
		const ics = buildICS('Leer', []);
		expect(ics).toContain('BEGIN:VCALENDAR');
		expect(ics).toContain('END:VCALENDAR');
		// No VEVENT present
		expect(ics).not.toContain('BEGIN:VEVENT');
	});
});












