import { httpsCallable } from 'firebase/functions';
import { functions } from '@/config/firebase';

export async function renderWithTemplate(params: {
	concernID: string;
	templateId: string;
	data: Record<string, any>;
	output?: 'pdf' | 'html';
}): Promise<{ url: string; contentType: string }> {
	const fn = httpsCallable(functions as any, 'renderTemplate');
	const res = await fn(params as any);
	return res.data as any;
}














