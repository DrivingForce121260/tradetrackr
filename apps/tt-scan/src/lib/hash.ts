import * as FileSystem from 'expo-file-system';
import * as Crypto from 'expo-crypto';

export async function sha256FromFile(uri: string): Promise<string> {
  try {
    // Use Expo's Crypto module for hashing
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 }),
      { encoding: Crypto.CryptoEncoding.HEX }
    );
    return hash;
  } catch (error) {
    console.error('Hash generation failed:', error);
    // Fallback: return empty hash
    return '';
  }
}











