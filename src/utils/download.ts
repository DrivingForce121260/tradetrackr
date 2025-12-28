/**
 * Download Utility
 * 
 * Provides browser-safe file download functionality.
 * Uses <a download> pattern for user-gesture triggered downloads.
 */

/**
 * Trigger a file download in the browser
 * 
 * @param url - The URL of the file to download
 * @param filename - The suggested filename for the download
 * @returns Promise that resolves when download is triggered
 */
export async function downloadFile(url: string, filename: string): Promise<void> {
  // Create a temporary anchor element
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener noreferrer';
  link.target = '_blank';
  
  // For cross-origin URLs, the download attribute may not work
  // In that case, the browser will open the file in a new tab
  // which still allows the user to download it
  
  // Append to body, click, and remove
  document.body.appendChild(link);
  link.click();
  
  // Small delay before removing to ensure click is processed
  setTimeout(() => {
    document.body.removeChild(link);
  }, 100);
}

/**
 * Open a file in a new browser tab
 * Useful as fallback when download attribute doesn't work
 * 
 * @param url - The URL to open
 */
export function openInNewTab(url: string): void {
  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * Sanitize a filename for safe download
 * Removes/replaces characters that could cause issues
 * 
 * @param filename - The original filename
 * @returns Sanitized filename
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[<>:"/\\|?*]/g, '_') // Replace invalid chars
    .replace(/\s+/g, '_')          // Replace spaces with underscores
    .replace(/_+/g, '_')           // Collapse multiple underscores
    .replace(/^_|_$/g, '');        // Trim leading/trailing underscores
}



