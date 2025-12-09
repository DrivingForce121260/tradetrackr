// ============================================================================
// FILE HASHING FOR DEDUPLICATION
// ============================================================================

/**
 * Compute SHA-256 hash of a file in the browser.
 * Used for deduplication checks before upload.
 * 
 * @param file - File to hash
 * @returns SHA-256 hash as hex string
 */
export async function computeFileSHA256(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  } catch (error) {
    console.error('[computeFileSHA256] Hashing failed:', error);
    throw new Error('Failed to compute file hash');
  }
}

/**
 * Check if a file with this hash already exists in Firestore
 * 
 * @param hash - SHA-256 hash
 * @param concernId - Current concern ID for scoping
 * @returns Existing document record if found, null otherwise
 */
export async function checkDuplicateHash(
  hash: string,
  concernId: string
): Promise<{ exists: boolean; docId?: string; filename?: string } | null> {
  
  // This will be implemented in the document service
  // For now, return null (no duplicate check)
  
  console.log('[checkDuplicateHash] Checking for duplicate:', hash);
  return null;
}













