import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable } from 'firebase/storage';
import * as FileSystem from 'expo-file-system';
import { db, storage, functions, httpsCallable } from './firebase';

export interface UploadResult {
  docId: string;
  storagePath: string;
  fileName: string;
}

export async function uploadPdf(
  uid: string,
  localPath: string,
  sizeBytes: number,
  hash: string,
  onProgress?: (progress: number) => void
): Promise<UploadResult> {
  // Create document reference with auto-generated ID
  const docRef = doc(db, 'documents');
  const docId = docRef.id;

  // Build storage path
  const yyyy = new Date().getFullYear().toString();
  const timestamp = new Date()
    .toISOString()
    .slice(0, 19)
    .replace(/[:T]/g, '-');
  const fileName = `Scan_${timestamp}.pdf`;
  const storagePath = `documents/${yyyy}/__unassigned__/${docId}/${fileName}`;

  // Read file as base64
  const base64 = await FileSystem.readAsStringAsync(localPath, {
    encoding: FileSystem.EncodingType.Base64,
  });

  // Convert base64 to Uint8Array
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // Upload to Firebase Storage
  const storageRef = ref(storage, storagePath);
  const uploadTask = uploadBytesResumable(storageRef, bytes, {
    contentType: 'application/pdf',
  });

  // Monitor upload progress
  await new Promise<void>((resolve, reject) => {
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = snapshot.bytesTransferred / snapshot.totalBytes;
        onProgress?.(progress);
      },
      (error) => {
        console.error('Upload failed:', error);
        reject(error);
      },
      () => {
        resolve();
      }
    );
  });

  // Create Firestore document
  await setDoc(docRef, {
    docId,
    type: null,
    typeConfidence: null,
    status: 'uploaded',
    storagePath: `/${storagePath}`,
    originalFilename: fileName,
    mimeType: 'application/pdf',
    sizeBytes,
    createdAt: serverTimestamp(),
    createdBy: uid,
    projectId: null,
    clientId: null,
    supplierId: null,
    meta: {
      ocrApplied: false,
      textSample: null,
      hashSha256: hash,
    },
    tags: ['mobile-scan'],
  });

  // Attempt to route document (ignore failures)
  try {
    const routeDocument = httpsCallable(functions, 'routeDocument');
    await routeDocument({ docId });
  } catch (error) {
    console.log('routeDocument call failed (ignored):', error);
  }

  return {
    docId,
    storagePath: `/${storagePath}`,
    fileName,
  };
}











