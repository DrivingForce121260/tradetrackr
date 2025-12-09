/**
 * Firebase Cloud Functions for TradeTrackr
 * 
 * Entry point for all backend functions.
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as express from 'express';
import * as cors from 'cors';
import { handleAISupport } from './aiSupport';
import { 
  setUserCustomClaims, 
  onUserCreated as onUserCreatedAuth,
  migrateUserCustomClaims
} from './auth';

// Initialize Firebase Admin SDK
admin.initializeApp();

// ====================================
// AI SUPPORT ENDPOINT
// ====================================

/**
 * AI Support HTTP Function
 * 
 * Endpoint: /ai/support
 * Method: POST
 * Auth: Firebase ID Token (Bearer)
 * 
 * This is the ONLY AI endpoint that the Field App should call.
 * It provides secure, server-side AI assistance with full Firestore access.
 */
const aiSupportApp = express();

// Enable CORS for Field App
aiSupportApp.use(cors({ origin: true }));
aiSupportApp.use(express.json());

// POST /ai/support
aiSupportApp.post('/support', handleAISupport);

// Export as Firebase Function
export const ai = functions.https.onRequest(aiSupportApp);

// ====================================
// HEALTH CHECK ENDPOINT
// ====================================

/**
 * Health Check HTTP Function
 * 
 * Endpoint: /health
 * Method: GET
 * Auth: None (public for monitoring)
 * 
 * Used for deployment verification and monitoring.
 */
const healthApp = express();
healthApp.use(cors({ origin: true }));

healthApp.get('/', (req, res) => {
  const isDev = process.env.NODE_ENV !== 'production';
  
  res.status(200).json({
    status: 'ok',
    env: isDev ? 'development' : 'production',
    timestamp: Date.now(),
    version: '1.0.0',
    services: {
      firestore: 'available',
      auth: 'available',
      storage: 'available',
    },
  });
});

export const health = functions.https.onRequest(healthApp);

// ====================================
// FUTURE: OTHER ENDPOINTS
// ====================================

// Example: Data sync endpoint
// export const syncData = functions.https.onRequest(handleSyncData);

// Example: Webhook for external integrations
// export const webhook = functions.https.onRequest(handleWebhook);

// Example: Scheduled tasks
// export const dailyReportAggregation = functions.pubsub
//   .schedule('every day 00:00')
//   .timeZone('Europe/Berlin')
//   .onRun(handleDailyReportAggregation);

// ====================================
// FIRESTORE TRIGGERS (Examples)
// ====================================

// ====================================
// AUTHENTICATION FUNCTIONS
// ====================================

/**
 * Set custom claims for a user (callable function)
 */
export { setUserCustomClaims };

/**
 * Automatically set custom claims when user is created (trigger)
 */
export const onUserCreated = onUserCreatedAuth;

/**
 * Migrate existing users to have custom claims (callable function)
 */
export { migrateUserCustomClaims };

// ====================================
// FEATURE REQUESTS
// ====================================

/**
 * Summarize feature request from AI-guided dialog
 */
export { summarizeFeatureRequestFunction as summarizeFeatureRequest } from './featureRequests';

// ====================================
// CATEGORY STATISTICS
// ====================================

/**
 * Category statistics aggregation triggers
 */
export { onDocumentChange, onTaskChange, onCategoryChange } from './categories';

/**
 * Example: Trigger when a time entry is confirmed
 */
// export const onTimeEntryConfirmed = functions.firestore
//   .document('tenants/{tenantId}/timeEntries/{entryId}')
//   .onUpdate(async (change, context) => {
//     const before = change.before.data();
//     const after = change.after.data();
//
//     if (!before.confirmed && after.confirmed) {
//       // Time entry was just confirmed
//       // Trigger any downstream processes (payroll integration, etc.)
//       console.log('Time entry confirmed:', context.params.entryId);
//     }
//   });
