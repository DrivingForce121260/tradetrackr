/**
 * Material OCR Service
 * 
 * AI-powered material invoice scanning using Cloud Function
 */

import { httpsCallable } from 'firebase/functions';
import { functions, storage } from '@/config/firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

export interface MaterialOCRData {
  name: string;
  supplier: string;
  itemNumber: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  category: string;
  description: string;
  confidence: number;
}

export interface MaterialOCRResult {
  materials: MaterialOCRData[];
  documentInfo: {
    documentType: 'Rechnung' | 'Auftragsbestätigung' | 'Lieferschein' | 'Unbekannt';
    documentNumber: string;
    documentDate: string;
    customerNumber: string;
    orderDate: string;
    orderNumber: string;
  };
  supplierInfo: {
    name: string;
    street: string;
    postalCode: string;
    city: string;
    country: string;
    phone: string;
    email: string;
    website: string;
    taxNumber: string;
    vatNumber: string;
  };
  bankDetails: {
    bankName: string;
    iban: string;
    bic: string;
  };
  totals: {
    subtotal: number;
    taxRate: number;
    taxAmount: number;
    total: number;
  };
  notes: string[];
}

const AI_SYSTEM_PROMPT = `You are an AI assistant that analyzes invoice/receipt images or PDFs to extract material/product information.

Your task is to extract the following information from the document:
1. Material/Product Name
2. Supplier/Manufacturer  
3. Item Number / SKU / Article Number
4. Quantity
5. Unit (Stk, m, kg, etc.)
6. Unit Price
7. Total Price
8. Category/Type (if mentioned)
9. Description/Specifications

Respond ONLY with valid JSON in this exact format:
{
  "materials": [
    {
      "name": "Material name",
      "supplier": "Supplier name",
      "itemNumber": "SKU/Article number",
      "quantity": 10,
      "unit": "Stk",
      "unitPrice": 5.99,
      "totalPrice": 59.90,
      "category": "Category name",
      "description": "Additional specs/description",
      "confidence": 0.95
    }
  ],
  "invoiceInfo": {
    "invoiceNumber": "INV-12345",
    "invoiceDate": "2025-01-15",
    "supplier": "Supplier name",
    "totalAmount": 59.90
  }
}

If multiple items are found, include them all in the "materials" array.
Confidence should be a number between 0 and 1 indicating how confident you are about the extraction.
If a field cannot be determined, use null or empty string.
Always respond with valid JSON only, no additional text.`;

export class MaterialOCRService {
  /**
   * Compress image to reduce file size and API quota usage
   */
  private static async compressImage(file: File, maxSizeBytes: number): Promise<File> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const img = new Image();
        
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Scale down if dimensions too large
          const maxDimension = 2048;
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = (height / width) * maxDimension;
              width = maxDimension;
            } else {
              width = (width / height) * maxDimension;
              height = maxDimension;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas context not available'));
            return;
          }
          
          ctx.drawImage(img, 0, 0, width, height);
          
          // Try different quality levels to get under maxSize
          let quality = 0.85;
          const tryCompress = () => {
            canvas.toBlob(
              (blob) => {
                if (!blob) {
                  reject(new Error('Compression failed'));
                  return;
                }
                
                if (blob.size <= maxSizeBytes || quality <= 0.5) {
                  const compressedFile = new File([blob], file.name, {
                    type: 'image/jpeg',
                    lastModified: Date.now()
                  });
                  resolve(compressedFile);
                } else {
                  quality -= 0.1;
                  tryCompress();
                }
              },
              'image/jpeg',
              quality
            );
          };
          
          tryCompress();
        };
        
        img.onerror = () => reject(new Error('Image load failed'));
        img.src = e.target?.result as string;
      };
      
      reader.onerror = () => reject(new Error('File read failed'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * Analyze invoice/receipt using Cloud Function (same as Category Type 2)
   */
  static async analyzeInvoice(file: File, concernID: string, userId: string): Promise<MaterialOCRResult> {
    // Validate file size (max 15MB)
    if (file.size > 15 * 1024 * 1024) {
      throw new Error('Datei ist zu groß. Maximale Größe: 15 MB');
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    const isValidType = validTypes.some(type => file.type.includes(type.split('/')[1])) || file.name.endsWith('.pdf');
    
    if (!isValidType) {
      throw new Error('Ungültiger Dateityp. Bitte verwenden Sie JPG, PNG, WEBP oder PDF.');
    }

    try {
      // 1. Compress image if needed (max 1MB to save API quota)
      let fileToUpload = file;
      
      if (file.type.startsWith('image/') && file.size > 1024 * 1024) {
        console.log('🗜️ Komprimiere Bild von', Math.round(file.size / 1024), 'KB...');
        
        fileToUpload = await this.compressImage(file, 1024 * 1024); // Max 1MB
        
        console.log('✅ Komprimiert auf', Math.round(fileToUpload.size / 1024), 'KB');
      }
      
      // 2. Upload file to Storage
      const timestamp = Date.now();
      const fileName = `${timestamp}-${file.name}`;
      const storagePath = `material_ocr/${userId}/${fileName}`;
      const storageRef = ref(storage, storagePath);

      console.log('📤 Uploading file to Storage:', storagePath);

      const uploadTask = uploadBytesResumable(storageRef, fileToUpload);

      await new Promise<void>((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            console.log('Upload progress:', progress.toFixed(0) + '%');
          },
          (error) => {
            console.error('Upload error:', error);
            reject(error);
          },
          async () => {
            console.log('✅ Upload complete');
            resolve();
          }
        );
      });

      // 2. Call dedicated Material OCR Cloud Function with retry logic
      console.log('🤖 Calling analyzeMaterialInvoice Cloud Function...');
      
      const aiAnalyze = httpsCallable<any, { success: boolean; data: MaterialOCRResult }>(
        functions,
        'analyzeMaterialInvoice'
      );
      
      let result;
      let retries = 0;
      const maxRetries = 2;
      
      while (retries <= maxRetries) {
        try {
          result = await aiAnalyze({
            filePath: storagePath,
            concernID: concernID
          });
          break; // Success, exit loop
        } catch (error: any) {
          if (error.code === 'functions/resource-exhausted' || 
              error.message?.includes('429') || 
              error.message?.includes('quota')) {
            retries++;
            if (retries > maxRetries) {
              throw new Error('API-Quota überschritten. Bitte warten Sie 1-2 Minuten und versuchen Sie es erneut.');
            }
            console.warn(`⏳ Quota exceeded, retry ${retries}/${maxRetries} in ${retries * 5}s...`);
            await new Promise(resolve => setTimeout(resolve, retries * 5000)); // Backoff: 5s, 10s
          } else {
            throw error;
          }
        }
      }

      console.log('🔍 Cloud Function response:', result.data);
      
      if (!result.data.success) {
        throw new Error('Cloud Function returned unsuccessful result');
      }

      const finalResult = result.data.data;
      
      console.log('📊 Total materials extracted:', finalResult.materials?.length || 0);
      console.log('✅ Final OCR result:', finalResult);
      
      return finalResult;
      
    } catch (error: any) {
      console.error('❌ Material OCR error:', error);
      throw new Error(`OCR-Analyse fehlgeschlagen: ${error.message || 'Unbekannter Fehler'}`);
    }
  }
}
