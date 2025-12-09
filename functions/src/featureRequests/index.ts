/**
 * Feature Requests Cloud Functions
 */

import * as functions from 'firebase-functions';
import { summarizeFeatureRequest, SummarizeFeatureRequestInput, SummarizeFeatureRequestOutput } from './summarizeFeatureRequest';

/**
 * Summarize Feature Request
 * 
 * Cloud Function that generates a structured summary from AI-guided dialog steps
 * 
 * @param data - Input containing dialog steps and context
 * @param context - Firebase auth context
 * @returns Structured feature request summary
 */
export const summarizeFeatureRequestFunction = functions
  .region('europe-west1')
  .runWith({ timeoutSeconds: 60, memory: '512MB' })
  .https.onCall(async (data: SummarizeFeatureRequestInput, context) => {
    // Check authentication
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated'
      );
    }

    // Validate input
    if (!data.steps || !Array.isArray(data.steps) || data.steps.length === 0) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'steps array is required and must not be empty'
      );
    }

    if (!data.concernId || !data.userId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'concernId and userId are required'
      );
    }

    // Verify user matches
    if (data.userId !== context.auth.uid) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'userId must match authenticated user'
      );
    }

    try {
      const summary = await summarizeFeatureRequest(data);
      return summary as SummarizeFeatureRequestOutput;
    } catch (error: any) {
      functions.logger.error('Error in summarizeFeatureRequest:', error);
      throw new functions.https.HttpsError(
        'internal',
        error.message || 'Failed to generate summary'
      );
    }
  });







