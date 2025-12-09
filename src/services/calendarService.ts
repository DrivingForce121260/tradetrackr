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
		// Use Firebase Functions URL for the calendar endpoint
		const projectId_env = (import.meta as any).env?.VITE_FIREBASE_PROJECT_ID || 'reportingapp817';
		const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
		// In production, the function URL would be: https://europe-west1-<project>.cloudfunctions.net/calendar
		const base = isLocal 
			? `http://localhost:5001/${projectId_env}/europe-west1/calendar`
			: `https://europe-west1-${projectId_env}.cloudfunctions.net/calendar`;
		const q = new URLSearchParams({ uid, token, ...(projectId ? { projectId } : {}) });
		return `${base}/ics?${q.toString()}`;
	}
}

export default CalendarService;
