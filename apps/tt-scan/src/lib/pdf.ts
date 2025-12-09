import { PDFDocument } from 'pdf-lib';
import * as FileSystem from 'expo-file-system';

export async function imagesToPdf(
  imageUris: string[],
): Promise<{ path: string; bytes: number }> {
  const pdf = await PDFDocument.create();

  for (const uri of imageUris) {
    try {
      // Read image as base64
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Embed image (try JPG first, then PNG)
      let img;
      try {
        img = await pdf.embedJpg(base64);
      } catch {
        img = await pdf.embedPng(base64);
      }

      // Create A4 page (595.28 x 841.89 points)
      const page = pdf.addPage([595.28, 841.89]);

      // Scale image to fit, maintaining aspect ratio
      const { width, height } = img.scaleToFit(530, 760);

      // Center image on page
      const x = (595.28 - width) / 2;
      const y = (841.89 - height) / 2;

      page.drawImage(img, { x, y, width, height });
    } catch (error) {
      console.error('Failed to add image to PDF:', uri, error);
    }
  }

  // Save PDF
  const pdfBytes = await pdf.save();
  const timestamp = new Date()
    .toISOString()
    .slice(0, 19)
    .replace(/[:T]/g, '-');
  const path = `${FileSystem.cacheDirectory}Scan_${timestamp}.pdf`;

  // Write as base64
  const base64Pdf = btoa(
    String.fromCharCode.apply(null, Array.from(pdfBytes))
  );
  await FileSystem.writeAsStringAsync(path, base64Pdf, {
    encoding: FileSystem.EncodingType.Base64,
  });

  return { path, bytes: pdfBytes.length };
}











