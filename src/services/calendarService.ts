import { db } from '@/config/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export class CalendarService {
	private currentUser: any;
	constructor(currentUser: any) { this.currentUser = currentUser; }

	async getToken(uid: string): Promise<{ token?: string; active?: boolean } | null> {
		const snap = await getDoc(doc(db, 'calendarTokens', uid));
		if (!snap.exists()) return null;
		return snap.data() as any;
	}

	async generateOrRotate(uid: string): Promise<{ token: string }> {
		// Generate UUID v4 token
		let token: string;
		if (typeof crypto !== 'undefined' && crypto.randomUUID) {
			token = crypto.randomUUID();
		} else {
			// Fallback for older browsers
			token = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
				const r = Math.random() * 16 | 0;
				const v = c === 'x' ? r : (r & 0x3 | 0x8);
				return v.toString(16);
			});
		}
		await setDoc(doc(db, 'calendarTokens', uid), { token, active: true }, { merge: true });
		return { token };
	}

	async revoke(uid: string): Promise<void> {
		await setDoc(doc(db, 'calendarTokens', uid), { active: false }, { merge: true });
	}

	buildFeedUrl(uid: string, token: string, projectId?: string): string {
		// Use TradeTrackr API calendar endpoint (Workstream B2: Firebase removal)
		const apiBase = (import.meta as any).env?.VITE_API_BASE_URL || '';
		const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
		const base = isLocal 
			? 'http://localhost:8787/api/v1/calendar'
			: `${apiBase || window.location.origin}/api/v1/calendar`;
		const q = new URLSearchParams({ uid, token, ...(projectId ? { projectId } : {}) });
		return `${base}/ics?${q.toString()}`;
	}
}

export default CalendarService;
