import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';

/**
 * Company Profile / Branding Settings for a Concern
 * Used for generating offers, invoices, and other documents in the name of the company
 */
export interface BrandingSettings {
	// Basic company info
	companyName?: string;
	legalForm?: string; // UG, GmbH, GbR, Einzelunternehmen, etc.
	
	// Address (structured for German format)
	street?: string;
	postalCode?: string;
	city?: string;
	country?: string; // Default: "Deutschland"
	address?: string; // Legacy combined address field
	
	// Contact
	email?: string;
	phone?: string;
	website?: string;
	
	// Logo
	logoUrl?: string;
	
	// Tax & Legal (German requirements)
	vatId?: string; // USt-IdNr. (e.g., "DE123456789")
	taxNumber?: string; // Steuernummer (local tax number)
	commercialRegister?: string; // Handelsregister (e.g., "HRB 12345, Amtsgericht München")
	managingDirector?: string; // Geschäftsführer / Inhaber
	
	// Bank details
	bankName?: string;
	iban?: string;
	bic?: string;
	
	// VAT handling
	isSmallBusiness?: boolean; // Kleinunternehmer §19 UStG
	defaultVatRate?: number; // Default VAT rate (19 or 7)
	
	// Document settings
	defaultLocale?: 'de' | 'en';
	offerValidityDays?: number; // Default validity period for offers (default: 14)
	paymentTermsText?: string; // e.g., "Zahlbar innerhalb von 14 Tagen ohne Abzug."
	offerFooterText?: string; // Custom footer text for offers
	invoiceFooterText?: string; // Custom footer text for invoices
	
	// DATEV integration
	datevContraAccount?: string;
	taxAccountMapping?: Record<string, string>;
}

/**
 * Validates that the company profile has the minimum required fields for document generation
 */
export function validateCompanyProfile(settings: BrandingSettings | null): { valid: boolean; missingFields: string[] } {
	const missingFields: string[] = [];
	
	if (!settings) {
		return { valid: false, missingFields: ['Alle Firmendaten'] };
	}
	
	if (!settings.companyName?.trim()) missingFields.push('Firmenname');
	if (!settings.street?.trim() && !settings.address?.trim()) missingFields.push('Straße');
	if (!settings.postalCode?.trim() && !settings.address?.trim()) missingFields.push('Postleitzahl');
	if (!settings.city?.trim() && !settings.address?.trim()) missingFields.push('Stadt');
	
	return { valid: missingFields.length === 0, missingFields };
}

/**
 * Creates an issuer snapshot from branding settings for document archival
 * This freezes the company data at the time of document creation
 */
export function createIssuerSnapshot(settings: BrandingSettings): BrandingSettings {
	return { ...settings };
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


