import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import express from 'express';
import type { Request, Response } from 'express';

const db = admin.firestore();
const app = express();

export function formatDateTime(dt: Date): string {
	// RFC5545 local time with Z where appropriate; use floating with TZID via Europe/Berlin
	const pad = (n: number) => String(n).padStart(2, '0');
	const y = dt.getUTCFullYear();
	const m = pad(dt.getUTCMonth() + 1);
	const d = pad(dt.getUTCDate());
	const hh = pad(dt.getUTCHours());
	const mm = pad(dt.getUTCMinutes());
	const ss = pad(dt.getUTCSeconds());
	return `${y}${m}${d}T${hh}${mm}${ss}Z`;
}

function icsSkeleton(name: string): string {
	return [
		'BEGIN:VCALENDAR',
		'PRODID:-//TradeTrackr//Schedule//DE',
		'VERSION:2.0',
		'CALSCALE:GREGORIAN',
		`X-WR-CALNAME:${name}`,
		'END:VCALENDAR',
	].join('\r\n');
}

export function buildICS(name: string, events: Array<{
	uid: string;
	summary: string;
	description?: string;
	location?: string;
	start: Date;
	end: Date;
	status?: 'CONFIRMED' | 'TENTATIVE' | 'CANCELLED';
}>): string {
	const lines: string[] = [
		'BEGIN:VCALENDAR',
		'PRODID:-//TradeTrackr//Schedule//DE',
		'VERSION:2.0',
		'CALSCALE:GREGORIAN',
		`X-WR-CALNAME:${name}`,
		'TIMEZONE-ID:Europe/Berlin',
	];
	for (const e of events) {
		lines.push('BEGIN:VEVENT');
		lines.push(`UID:${e.uid}`);
		lines.push(`SUMMARY:${e.summary.replace(/\r?\n/g, ' ')}`);
		if (e.description) lines.push(`DESCRIPTION:${e.description.replace(/\r?\n/g, ' ')}`);
		if (e.location) lines.push(`LOCATION:${e.location.replace(/\r?\n/g, ' ')}`);
		lines.push(`DTSTART:${formatDateTime(e.start)}`);
		lines.push(`DTEND:${formatDateTime(e.end)}`);
		lines.push(`DTSTAMP:${formatDateTime(new Date())}`);
		lines.push(`STATUS:${e.status || 'CONFIRMED'}`);
		lines.push('END:VEVENT');
	}
	lines.push('END:VCALENDAR');
	return lines.join('\r\n');
}

// GET /calendar/ics?uid=...&token=...&projectId=...
app.get('/ics', async (req: Request, res: Response) => {
	try {
		const { uid, token, projectId } = req.query as any;
		if (!uid || !token) {
			return res.status(400).send('Missing uid or token');
		}
		// Verify token
		const tokDoc = await db.collection('calendarTokens').doc(uid).get();
		if (!tokDoc.exists) return res.status(403).send('Forbidden');
		const data = tokDoc.data() as any;
		if (!data.active || data.token !== token) return res.status(403).send('Forbidden');
		
		// Load schedule slots
		let events: any[] = [];
		if (projectId) {
			const qs = await db.collection('scheduleSlots').where('projectId', '==', projectId).limit(500).get();
			events = qs.docs.map(d => ({ id: d.id, ...d.data() }));
		} else {
			const qs = await db.collection('scheduleSlots').where('assigneeIds', 'array-contains', uid).limit(500).get();
			events = qs.docs.map(d => ({ id: d.id, ...d.data() }));
		}

		if (!events.length) {
			const empty = icsSkeleton(projectId ? `Projekt ${projectId}` : `Benutzer ${uid}`);
			res.set('Content-Type', 'text/calendar; charset=utf-8');
			return res.status(200).send(empty);
		}

		const mapped = events.map((s) => {
			const start = new Date(s.startAt || s.start || s.startDate || s.from);
			const end = new Date(s.endAt || s.end || s.endDate || s.to);
			const summary = `${s.projectName || s.projectId || ''} ${s.title || s.taskTitle || ''}`.trim();
			const description = `${s.projectAddress || ''} ${s.note || s.notes || ''} ${s.plannerName || ''}`.trim();
			return {
				uid: `${s.id}@tradetrackr`,
				summary,
				description,
				location: s.projectAddress || '',
				start,
				end,
				status: (s.status === 'cancelled' ? 'CANCELLED' : (s.status === 'tentative' ? 'TENTATIVE' : 'CONFIRMED')) as any,
			};
		});

		const ics = buildICS(projectId ? `Projekt ${projectId}` : `Benutzer ${uid}`, mapped);
		res.set('Content-Type', 'text/calendar; charset=utf-8');
		return res.status(200).send(ics);
	} catch (error: any) {
		console.error('ICS error', error);
		return res.status(500).send('Error');
	}
});

// POST /calendar/revoke { uid }
app.post('/revoke', async (req: Request, res: Response) => {
	try {
		const { uid } = req.body || {};
		if (!uid) return res.status(400).json({ error: 'uid required' });
		await db.collection('calendarTokens').doc(uid).set({ active: false }, { merge: true });
		return res.status(200).json({ success: true });
	} catch (error: any) {
		console.error('Revoke error', error);
		return res.status(500).json({ error: error.message });
	}
});

export const calendar = functions.https.onRequest(app);
