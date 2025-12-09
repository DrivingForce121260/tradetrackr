// ============================================================================
// OCR AND TEXT EXTRACTION - Pluggable Interface
// ============================================================================

/**
 * Extract text from various document types.
 * This is a pluggable interface - implement with your preferred OCR provider.
 * 
 * Supported:
 * - Images: OCR (Google Cloud Vision, Tesseract, etc.)
 * - PDFs: Text extraction or OCR if scanned
 * - DOCX/XLSX: Text content extraction
 * 
 * @param file - File to extract text from
 * @param storagePath - Optional Firebase Storage path if file already uploaded
 * @returns Extracted text sample (max ~5000 chars) or null
 */
export async function extractText(
  file: File,
  storagePath?: string
): Promise<{ text: string; method: string } | null> {
  
  const mimeType = file.type.toLowerCase();
  
  try {
    // Image files - OCR required
    if (mimeType.startsWith('image/')) {
      return await extractFromImage(file);
    }
    
    // PDF files - extract text or OCR
    if (mimeType === 'application/pdf') {
      return await extractFromPDF(file);
    }
    
    // Text files - direct read
    if (mimeType === 'text/plain' || mimeType === 'text/csv') {
      return await extractFromTextFile(file);
    }
    
    // Office documents - extraction libraries
    if (mimeType.includes('wordprocessingml') || mimeType.includes('spreadsheetml')) {
      return await extractFromOfficeDoc(file);
    }
    
    console.log('[extractText] Unsupported file type for text extraction:', mimeType);
    return null;
    
  } catch (error) {
    console.error('[extractText] Extraction failed:', error);
    return null;
  }
}

/**
 * Extract text from image using OCR
 * TODO: Implement with Cloud Vision API or Tesseract
 */
async function extractFromImage(file: File): Promise<{ text: string; method: string } | null> {
  console.log('[extractFromImage] OCR requested for image:', file.name);
  
  // Placeholder: This should call Cloud Vision API or Tesseract
  // For now, return null to indicate OCR not yet implemented
  
  /*
  Example Cloud Vision integration:
  
  import vision from '@google-cloud/vision';
  const client = new vision.ImageAnnotatorClient();
  
  const [result] = await client.textDetection({
    image: { content: await fileToBase64(file) }
  });
  
  const text = result.textAnnotations?.[0]?.description || '';
  return { text: text.slice(0, 5000), method: 'google-cloud-vision' };
  */
  
  return null; // OCR not implemented yet
}

/**
 * Extract text from PDF
 * TODO: Implement with pdf.js or similar
 */
async function extractFromPDF(file: File): Promise<{ text: string; method: string } | null> {
  console.log('[extractFromPDF] Text extraction requested for PDF:', file.name);
  
  // Placeholder: This should use pdf.js or pdfjs-dist
  // For now, return null
  
  /*
  Example pdf.js integration:
  
  import * as pdfjsLib from 'pdfjs-dist';
  
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  let text = '';
  for (let i = 1; i <= Math.min(5, pdf.numPages); i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((item: any) => item.str).join(' ') + '\n';
  }
  
  return { text: text.slice(0, 5000), method: 'pdf.js' };
  */
  
  return null; // PDF extraction not implemented yet
}

/**
 * Extract text from plain text or CSV files
 */
async function extractFromTextFile(file: File): Promise<{ text: string; method: string } | null> {
  try {
    const text = await file.text();
    return {
      text: text.slice(0, 5000), // First 5000 chars
      method: 'file-reader-text'
    };
  } catch (error) {
    console.error('[extractFromTextFile] Failed to read text file:', error);
    return null;
  }
}

/**
 * Extract text from Office documents (DOCX, XLSX)
 * TODO: Implement with mammoth.js (DOCX) or xlsx.js (XLSX)
 */
async function extractFromOfficeDoc(file: File): Promise<{ text: string; method: string } | null> {
  console.log('[extractFromOfficeDoc] Text extraction requested for Office doc:', file.name);
  
  // Placeholder: This should use mammoth.js for DOCX or xlsx for XLSX
  // For now, return null
  
  /*
  Example mammoth.js integration for DOCX:
  
  import mammoth from 'mammoth';
  
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  
  return { text: result.value.slice(0, 5000), method: 'mammoth.js' };
  */
  
  return null; // Office doc extraction not implemented yet
}

/**
 * Helper: Convert file to base64 for API calls
 */
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Client-side light extraction (for browser preview/routing)
 * This runs before upload for quick filename-based routing
 */
export function extractQuickMetadata(file: File): {
  filename: string;
  mimeType: string;
  sizeBytes: number;
  extension: string;
} {
  const parts = file.name.split('.');
  const extension = parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
  
  return {
    filename: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
    extension
  };
}













