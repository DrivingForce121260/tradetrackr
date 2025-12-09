import { Timestamp, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { DocumentType, NumberCounter } from '@/types/invoicing';

const COUNTERS_COLLECTION = 'counters';

function getYear(): number {
	return new Date().getFullYear();
}

function buildCounterId(documentType: DocumentType, year: number): string {
	return `${documentType}-${year}`;
}

export async function getNextDocumentNumber(documentType: DocumentType): Promise<string> {
	const year = getYear();
	const counterId = buildCounterId(documentType, year);
	const ref = doc(db, COUNTERS_COLLECTION, counterId);
	const snap = await getDoc(ref);

	let nextSeq = 1;
	if (snap.exists()) {
		const data = snap.data() as Partial<NumberCounter>;
		nextSeq = (data.seq ?? 0) + 1;
	}

	await setDoc(ref, {
		id: counterId,
		documentType,
		year,
		seq: nextSeq,
		updatedAt: Timestamp.now(),
	}, { merge: true });

	const seqStr = String(nextSeq).padStart(4, '0');
	return `${year}-${seqStr}`;
}















