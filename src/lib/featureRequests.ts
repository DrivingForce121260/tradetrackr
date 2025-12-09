/**
 * Feature Requests Firestore Service
 * Handles saving feature requests to Firestore
 */

import { 
  addDoc, 
  collection, 
  serverTimestamp,
  Timestamp 
} from "firebase/firestore";
import { db } from "@/config/firebase";
import { FeatureRequest } from "@/types/featureRequests";

/**
 * Save a feature request to Firestore
 * 
 * @param input - Feature request data (without id, timestamps)
 * @returns Promise that resolves when the request is saved
 */
export async function saveFeatureRequest(
  input: Omit<FeatureRequest, "id" | "createdAt" | "updatedAt">
): Promise<string> {
  // Validate required fields
  if (!input.concernId) {
    throw new Error("concernId is required");
  }
  if (!input.userId) {
    throw new Error("userId is required");
  }
  if (!input.title || !input.description) {
    throw new Error("title and description are required");
  }

  // Prepare data for Firestore
  // Remove undefined values (Firestore doesn't accept undefined)
  const cleanInput = Object.fromEntries(
    Object.entries(input).filter(([_, value]) => value !== undefined)
  ) as Omit<FeatureRequest, "id" | "createdAt" | "updatedAt">;

  const data = {
    ...cleanInput,
    status: cleanInput.status ?? "new",
    version: cleanInput.version ?? 1,
    platform: "web" as const,
    language: cleanInput.language ?? "de",
    createdAt: serverTimestamp(),
    createdBy: cleanInput.userId,
    updatedAt: serverTimestamp(),
    updatedBy: cleanInput.userId,
  };

  // Add to Firestore
  const docRef = await addDoc(collection(db, "featureRequests"), data);
  
  return docRef.id;
}

/**
 * Extract a title from description text (first 80 chars or first sentence)
 */
export function extractTitle(description: string): string {
  const trimmed = description.trim();
  
  // Try to find first sentence (ends with . ! ?)
  const sentenceMatch = trimmed.match(/^[^.!?]+[.!?]/);
  if (sentenceMatch) {
    const sentence = sentenceMatch[0].trim();
    return sentence.length <= 80 ? sentence : sentence.substring(0, 77) + "...";
  }
  
  // Fallback: first 80 chars
  return trimmed.length <= 80 ? trimmed : trimmed.substring(0, 77) + "...";
}

