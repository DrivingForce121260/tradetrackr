import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

const db = admin.firestore();
const storage = admin.storage();

// Optional: Vision API client if available
// import { ImageAnnotatorClient } from '@google-cloud/vision';
// const vision = new ImageAnnotatorClient();

// Extracts basic text for images/PDFs and updates project_documents.searchableText/fullTextSearch
export const onDocumentFileFinalized = functions.storage
  .object()
  .onFinalize(async object => {
    const filePath = object.name || '';
    if (!filePath.includes('/documents/')) return;

    // Find corresponding Firestore doc by storagePath
    const qs = await db.collection('project_documents')
      .where('storagePath', '==', filePath)
      .limit(1)
      .get();
    if (qs.empty) return;
    const docRef = qs.docs[0].ref;
    const mimeType = object.contentType || '';

    // Basic stub extraction: store filename and mimeType; real OCR optional
    let extracted = '';
    try {
      // If Vision client is configured, you could do OCR here
      // For now, keep a minimal index seed
      extracted = `${qs.docs[0].get('displayName') || ''}`;
    } catch (e) {
      // ignore
    }

    const tokens = (extracted || '').toLowerCase().split(/\s+/).filter(Boolean);
    await docRef.update({
      searchableText: extracted,
      fullTextSearch: admin.firestore.FieldValue.arrayUnion(...tokens.slice(0, 50)),
      mimeType
    });
  });














