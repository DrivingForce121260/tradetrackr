import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';

export interface BrandingSettings {
	companyName?: string;
	address?: string;
	email?: string;
	phone?: string;
	logoUrl?: string;
	defaultLocale?: 'de' | 'en';
	datevContraAccount?: string;
	taxAccountMapping?: Record<string, string>;
}

export async function fetchBrandingSettings(concernID: string): Promise<BrandingSettings | null> {
	try {
		const ref = doc(db as any, 'concern', concernID, 'settings', 'branding');
		const snap = await getDoc(ref);
		if (!snap.exists()) return null;
		return snap.data() as BrandingSettings;
	} catch (e) {
		console.error('Failed to load branding settings', e);
		return null;
	}
}

export async function saveBrandingSettings(concernID: string, data: BrandingSettings): Promise<void> {
	const ref = doc(db as any, 'concern', concernID, 'settings', 'branding');
	await setDoc(ref, data, { merge: true });
}


