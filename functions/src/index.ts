/**
 * Firebase Cloud Functions for TradeTrackr
 * 
 * Entry point for all backend functions.
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import express from 'express';
import cors from 'cors';
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

// ====================================
// CATEGORY IMPORT FUNCTIONS
// ====================================

/**
 * AI Category 2 Import Functions
 * Handles deterministic and AI-assisted import of Category Type 2 data
 */
export { aiCategory2Import, aiCategory2Commit } from './categoryImport';

// ====================================
// DIAGNOSTIC FUNCTIONS
// ====================================

/**
 * Category Type 2 Diagnostic Function
 * For debugging data structure issues
 */
export { debugCategoryType2 } from './diagnostics/categoryType2Debug';

// ====================================
// MIGRATION FUNCTIONS
// ====================================

/**
 * Convert Parts from Type 2 to Type 1
 */
export { convertPartsToType1 } from './migrations/convertPartsToType1';

// ====================================
// EMAIL INTELLIGENCE FUNCTIONS
// ====================================

/**
 * Email Intelligence Agent - Cloud Functions
 * Handles email processing, AI analysis, and webhooks
 */
export {
  gmailWebhook,      // Gmail push notification handler
  m365Webhook,       // Microsoft 365 webhook handler
  imapPollJob,       // IMAP polling job (runs every 10 minutes)
  syncEmailAccount   // Manual sync trigger (callable)
} from './emailIntelligence/handlers';

export {
  storeImapAccount,  // Add/connect IMAP email account (callable)
  testImapConnection // Test IMAP credentials before storing (callable)
} from './emailIntelligence/imapOAuth';

export {
  reanalyzeEmail     // Re-analyze email with AI (callable)
} from './emailIntelligence/reanalyzeEmail';

export {
  generateEmailReplyDraft  // Generate AI draft reply to email (callable)
} from './emailIntelligence/generateEmailReplyDraft';

export {
  sendEmailReply     // Send email reply via provider (callable)
} from './emailIntelligence/sendEmailReply';

// ====================================
// PROJECT FUNCTIONS
// ====================================

/**
 * Project Number Allocation
 * Allocates unique project numbers with concurrency safety
 */
export {
  allocateProjectNumber,  // Allocate unique project number (callable)
  registerProjectNumber   // Register project number for uniqueness (callable)
} from './projects/allocateProjectNumber';

// ====================================
// MIGRATION FUNCTIONS
// ====================================

/**
 * Project Number Migration
 * One-time migration to renumber all projects to new PN- scheme
 */
export { runProjectNumberMigration } from './migrations/runProjectMigration';

/**
 * Maintenance Functions
 * For fixing orphaned tasks and migrating internal projects
 */
export {
  analyzeOrphanedTasks,
  deleteOrphanedTasks,
  analyzeInternalProjects,
  migrateInternalProjects
} from './maintenance/dataFixes';

// ====================================
// DOCUMENT MANAGEMENT FUNCTIONS
// ====================================

/**
 * Document Analysis with AI
 * Performs OCR and AI classification
 */
export { analyzeDocument } from './documents/analyzeDocument';

/**
 * Document Project Linking
 * Auto-detects project numbers and allocates per-project document suffixes
 */
export {
  allocateProjectDocumentSuffix  // Allocate suffix for project document (callable)
} from './documents/allocateProjectDocumentSuffix';

export {
  finalizeDocumentProjectLink     // Finalize project link with suffix & designation (callable)
} from './documents/finalizeDocumentProjectLink';

// ====================================
// TRANSACTIONAL EMAIL FUNCTIONS
// ====================================

/**
 * Send Transactional Email
 * Sends emails for offers, invoices, orders with attachments
 */
export { sendTransactionalEmail } from './email/sendTransactionalEmail';

// ====================================
// OFFER PDF GENERATION
// ====================================

/**
 * Generate Offer PDF
 * Creates a German-compliant PDF and stores it in Cloud Storage
 */
export { generateOfferPdf } from './offers/generateOfferPdf';

// ====================================
// OFFER FINALIZATION
// ====================================

/**
 * Finalize Offer
 * Atomically transitions offer to 'sent' state with server-side validation
 * and history entries. Prevents client-side bypass of finalization logic.
 */
export { finalizeOffer } from './offers/finalizeOffer';

// ====================================
// PROCUREMENT FUNCTIONS
// ====================================

/**
 * Generate Procurement Request PDF
 * Creates a German-compliant request PDF and stores it in Cloud Storage
 */
export { generateRequestPdf } from './procurement/generateRequestPdf';

/**
 * Send Procurement Request Email
 * Sends the request to the supplier via email with optional PDF attachment
 */
export { sendRequestEmail } from './procurement/sendRequestEmail';

// ====================================
// USER SESSION MANAGEMENT
// ====================================

/**
 * User Session Functions (europe-west1)
 * Enforces single active session per user
 */
export { claimUserSession, releaseUserSession } from './sessions/userSession';

// ====================================
// EMAIL ACCOUNT ASSIGNMENT
// ====================================

/**
 * Email Account Assignment Functions (europe-west1)
 * Enforces unique email account per user per concern
 */
export { assignEmailAccount, unassignEmailAccount } from './emailIntelligence/emailAccountAssignment';

// ====================================
// EMAIL ANALYSIS (CANONICAL DEDUP)
// ====================================

/**
 * Email Analysis Functions (europe-west1)
 * Provides exactly-once AI analysis for canonical messages
 */
export { analyzeEmailMessage, retryEmailAnalysis } from './emailIntelligence/analyzeEmailMessage';

// ====================================
// CRM FUNCTIONS
// ====================================

/**
 * Create Procurement Request from CRM Email Inquiry (europe-west1)
 * Idempotent function that creates a procurement request from an email inquiry.
 * NOTE: This is for SUPPLIER OFFERS, not customer inquiries.
 */
export { createProcurementRequestFromInquiry } from './crm/createProcurementRequestFromInquiry';

// ====================================
// SALES FUNCTIONS
// ====================================

/**
 * Create Sales Offer Draft from Email Inquiry (europe-west1)
 * Idempotent function that converts a customer inquiry email into a sales offer draft.
 * Also creates CRM company/note at conversion time.
 */
export { createSalesOfferFromEmailInquiry } from './sales/createSalesOfferFromEmailInquiry';
