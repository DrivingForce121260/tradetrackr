import { db, storage } from '@/config/firebase';
import {
	addDoc,
	collection,
	deleteDoc,
	doc,
	getDoc,
	getDocs,
	orderBy,
	query,
	serverTimestamp,
	setDoc,
	updateDoc,
	where,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { Template, TemplateHistory, TemplateKind } from '@/types/templates';

const TEMPLATES = 'templates';
const TEMPLATES_HISTORY = 'templates_history';

export interface SaveTemplateInput {
	concernID: string;
	userUid: string;
	data: Omit<Template, 'id' | 'version' | 'createdAt' | 'updatedAt' | 'createdBy' | 'active'> & {
		active?: boolean;
	};
}

export const templateService = {
	async list(concernID: string): Promise<Template[]> {
		const q = query(collection(db, TEMPLATES), where('concernID', '==', concernID), orderBy('updatedAt', 'desc'));
		const snap = await getDocs(q);
		return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Template[];
	},

	async get(templateId: string): Promise<Template | null> {
		const s = await getDoc(doc(db, TEMPLATES, templateId));
		return s.exists() ? ({ id: s.id, ...(s.data() as any) } as Template) : null;
	},

	async getActive(concernID: string, type: TemplateKind, locale: 'de' | 'en', useFor?: 'invoice' | 'offer' | 'order' | 'report'): Promise<Template | null> {
		let qref: any = query(
			collection(db, TEMPLATES),
			where('concernID', '==', concernID),
			where('type', '==', type),
			where('locale', '==', locale),
			where('active', '==', true)
		);
		if (useFor) {
			qref = query(qref, where('useFor', '==', useFor));
		}
		const snap = await getDocs(qref);
		if (snap.empty) return null;
		const doc0 = snap.docs[0];
		return { id: doc0.id, ...(doc0.data() as any) } as Template;
	},

	async create(input: SaveTemplateInput): Promise<string> {
		const now = new Date().toISOString();
		const payload = {
			...input.data,
			concernID: input.concernID,
			version: 1,
			createdBy: input.userUid,
			createdAt: now,
			updatedAt: now,
			active: Boolean(input.data.active),
		};
		const refDoc = await addDoc(collection(db, TEMPLATES), payload as any);
		return refDoc.id;
	},

	async update(templateId: string, userUid: string, update: Partial<Template>): Promise<void> {
		// Fetch current to archive
		const currentSnap = await getDoc(doc(db, TEMPLATES, templateId));
		if (!currentSnap.exists()) throw new Error('Template not found');
		const current = currentSnap.data() as Template;

		// Archive current html into history
		const history: Omit<TemplateHistory, 'id'> = {
			templateId,
			concernID: current.concernID,
			version: current.version,
			htmlBody: current.htmlBody,
			createdAt: new Date().toISOString(),
			createdBy: userUid,
		};
		await addDoc(collection(db, TEMPLATES_HISTORY), history as any);

		// Increment version on save
		const nextVersion = (current.version || 0) + 1;
		await updateDoc(doc(db, TEMPLATES, templateId), {
			...update,
			version: nextVersion,
			updatedAt: new Date().toISOString(),
		} as any);
	},

	async setActive(templateId: string, active: boolean): Promise<void> {
		await updateDoc(doc(db, TEMPLATES, templateId), { active });
	},

	async duplicate(templateId: string, userUid: string): Promise<string> {
		const t = await this.get(templateId);
		if (!t) throw new Error('Template not found');
		const copy = { ...t } as any;
		delete copy.id;
		copy.name = `${t.name} (Copy)`;
		copy.version = 1;
		copy.active = false;
		copy.createdAt = new Date().toISOString();
		copy.updatedAt = copy.createdAt;
		copy.createdBy = userUid;
		const refDoc = await addDoc(collection(db, TEMPLATES), copy);
		return refDoc.id;
	},

	async listHistory(templateId: string): Promise<TemplateHistory[]> {
		const q = query(
			collection(db, TEMPLATES_HISTORY),
			where('templateId', '==', templateId),
			orderBy('version', 'desc')
		);
		const snap = await getDocs(q);
		return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as TemplateHistory[];
	},

	async restoreVersion(templateId: string, version: number, userUid: string): Promise<void> {
		const q = query(
			collection(db, TEMPLATES_HISTORY),
			where('templateId', '==', templateId),
			where('version', '==', version)
		);
		const snap = await getDocs(q);
		if (snap.empty) throw new Error('Version not found');
		const hist = snap.docs[0].data() as TemplateHistory;
		await this.update(templateId, userUid, { htmlBody: hist.htmlBody });
	},

	async uploadLogo(concernID: string, file: File): Promise<string> {
		const path = `branding/${concernID}/logo.png`;
		const r = ref(storage, path);
		await uploadBytes(r, file, { contentType: file.type || 'image/png' });
		return await getDownloadURL(r);
	},
};


