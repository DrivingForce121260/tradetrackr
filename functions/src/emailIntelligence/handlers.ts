/**
 * Email Intelligence Agent - Cloud Function Handlers
 * HTTP handlers for webhooks and scheduled jobs
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { GmailConnector, Microsoft365Connector, ImapConnector } from './connectors';
import { processEmailBatch } from './processEmail';
import { EmailAccount } from './types';
import { getAccessToken as getTokenFromOAuth } from './oauth';
import { safeMergeWrite, serializeError, sanitizeForFirestore } from '../utils/sanitizeForFirestore';

const db = admin.firestore();

/**
 * Gmail Pub/Sub Handler
 * Triggered by Gmail push notifications
 */
export const gmailWebhook = functions
  .region('europe-west1')
  .pubsub.topic('gmail-notifications')
  .onPublish(async (message) => {
    try {
      functions.logger.info('Gmail webhook triggered', message.json);

      // Decode Pub/Sub message
      const data = message.json;
      const emailAddress = data.emailAddress;

      if (!emailAddress) {
        functions.logger.error('No email address in notification');
        return;
      }

      // Find email account
      const accountSnapshot = await db
        .collection('emailAccounts')
        .where('emailAddress', '==', emailAddress)
        .where('provider', '==', 'gmail')
        .where('active', '==', true)
        .limit(1)
        .get();

      if (accountSnapshot.empty) {
        functions.logger.error(`No active account found for ${emailAddress}`);
        return;
      }

      const accountDoc = accountSnapshot.docs[0];
      const account = accountDoc.data() as EmailAccount;

      // Get OAuth token (from secure storage - implementation depends on your auth setup)
      const accessToken = await getAccessToken(account.oauthRef);

      // Initialize connector
      const connector = new GmailConnector(accountDoc.id, account.orgId, accessToken);

      // Fetch new messages
      const messages = await connector.fetchNewMessages(account.syncState || {});

      functions.logger.info(`Fetched ${messages.length} new messages`);

      // Process messages
      if (messages.length > 0) {
        await processEmailBatch(messages);

        // Update sync state (safe merge)
        await safeMergeWrite(accountDoc.ref, {
          syncState: { lastSyncedAt: admin.firestore.FieldValue.serverTimestamp() },
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, 'gmailWebhook:syncState');
      }
    } catch (error) {
      functions.logger.error('Gmail webhook error:', error);
      throw error;
    }
  });

/**
 * Microsoft 365 Webhook Handler
 * Triggered by Microsoft Graph change notifications
 */
export const m365Webhook = functions
  .region('europe-west1')
  .https.onRequest(async (req, res) => {
    try {
      // Handle validation request
      if (req.query && req.query.validationToken) {
        functions.logger.info('M365 webhook validation');
        res.status(200).send(req.query.validationToken);
        return;
      }

      functions.logger.info('M365 webhook notification', req.body);

      // Process notifications
      const notifications = req.body.value || [];

      for (const notification of notifications) {
        const subscriptionId = notification.subscriptionId;

        // Find account by subscription ID
        const accountSnapshot = await db
          .collection('emailAccounts')
          .where('provider', '==', 'm365')
          .where('active', '==', true)
          .get();

        for (const accountDoc of accountSnapshot.docs) {
          const account = accountDoc.data() as EmailAccount;

          // Get OAuth token
          const accessToken = await getAccessToken(account.oauthRef);

          // Initialize connector
          const connector = new Microsoft365Connector(
            accountDoc.id, 
            account.orgId, 
            accessToken
          );

          // Parse webhook and fetch new messages
          const messages = await connector.parseWebhook({ body: req.body });

          functions.logger.info(`Fetched ${messages.length} new messages for ${account.emailAddress}`);

          // Process messages
          if (messages.length > 0) {
            await processEmailBatch(messages);

            // Update sync state (safe merge)
            await safeMergeWrite(accountDoc.ref, {
              syncState: { lastSyncedAt: admin.firestore.FieldValue.serverTimestamp() },
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            }, 'm365Webhook:syncState');
          }
        }
      }

      res.status(200).send('OK');
    } catch (error) {
      functions.logger.error('M365 webhook error:', error);
      res.status(500).send('Internal Server Error');
    }
  });

/**
 * IMAP Polling Job
 * Scheduled to run every 10 minutes
 * - Between 07:00-18:00: Runs every execution (every 10 min)
 * - Between 18:00-07:00: Runs every 12th execution (every 2 hours)
 */
export const imapPollJob = functions
  .region('europe-west1')
  .pubsub.schedule('every 10 minutes')
  .timeZone('Europe/Berlin')
  .onRun(async (context) => {
    try {
      // Check if we should run based on time of day and day of week
      const now = new Date();
      const hour = now.getHours();
      const minute = now.getMinutes();
      const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday
      
      // Weekends (Saturday=6, Sunday=0) and nights: Only run every 2 hours
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const isNightTime = hour >= 18 || hour < 7;
      const isReducedFrequency = isWeekend || isNightTime;
      
      if (isReducedFrequency) {
        // Only run on even hours (0, 2, 4, 6, 18, 20, 22) and only around the hour mark
        const isEvenHour = hour % 2 === 0;
        const isNearHourMark = minute <= 10; // Within first 10 minutes of the hour
        
        if (!isEvenHour || !isNearHourMark) {
          const reason = isWeekend ? 'weekend' : 'night time';
          functions.logger.info(`IMAP polling job skipped (${reason}, ${dayOfWeek === 0 ? 'Sunday' : dayOfWeek === 6 ? 'Saturday' : ''} hour: ${hour}:${minute.toString().padStart(2, '0')})`);
          return null;
        }
      }
      
      const timeType = isWeekend ? 'weekend' : (isNightTime ? 'night' : 'business hours');
      functions.logger.info(`IMAP polling job started (${timeType}, hour: ${hour}:${minute.toString().padStart(2, '0')})`);

      // Find all active IMAP accounts
      const accountsSnapshot = await db
        .collection('emailAccounts')
        .where('provider', '==', 'imap')
        .where('active', '==', true)
        .get();

      functions.logger.info(`Found ${accountsSnapshot.size} active IMAP accounts`);

      for (const accountDoc of accountsSnapshot.docs) {
        try {
          const account = accountDoc.data() as EmailAccount;

          // Get IMAP credentials (from secure storage)
          const credentials = await getImapCredentials(account.oauthRef);
          
          // Use account ownerUid for email scoping
          const ownerUid = account.ownerUid || '';

          // Initialize connector
          const connector = new ImapConnector(
            accountDoc.id,
            account.orgId,
            ownerUid,
            credentials
          );

          // Fetch new messages
          const messages = await connector.fetchNewMessages(account.syncState || {});

          functions.logger.info(`Fetched ${messages.length} messages for ${account.emailAddress}`);

          // Process messages
          if (messages.length > 0) {
            await processEmailBatch(messages);

            // Update sync state (safe merge)
            await safeMergeWrite(accountDoc.ref, {
              syncState: { lastSyncedAt: admin.firestore.FieldValue.serverTimestamp() },
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            }, 'imapPollJob:syncState');
          }
        } catch (error) {
          functions.logger.error(`Error polling account ${accountDoc.id}:`, error);
        }
      }

      functions.logger.info('IMAP polling job completed');
    } catch (error) {
      functions.logger.error('IMAP polling job error:', error);
      throw error;
    }
  });

/**
 * Manual Sync Trigger
 * Allows manual triggering of email sync for an account
 * 
 * UPDATED: Now uses user-scoped email accounts as primary path.
 * Supports lookup by doc ID or emailKey for compatibility.
 */
export const syncEmailAccount = functions
  .region('europe-west1')
  .runWith({
    memory: '512MB',  // 512MB is sufficient for 10 emails per sync
    timeoutSeconds: 120,  // 2 minutes is enough for 10 emails
  })
  .https.onCall(async (data, context) => {
    // Track tried paths for debugging - define FIRST
    const triedPaths: string[] = [];
    
    // Wrap EVERYTHING in outer try/catch to never return raw 500
    try {
      // Top-of-function log - ALWAYS runs
      console.info('[syncEmailAccount] start', { 
        uid: context.auth?.uid?.substring(0, 8), 
        dataKeys: data ? Object.keys(data) : [],
        timestamp: new Date().toISOString(),
      });

    // ============================================
    // 1. AUTHENTICATION
    // ============================================
    if (!context.auth) {
      console.error('[syncEmailAccount] unauthenticated request');
      throw new functions.https.HttpsError('unauthenticated', 'Nicht angemeldet');
    }

    const { concernId, accountId } = data || {};
    const uid = context.auth.uid;

    if (!concernId || !accountId) {
      console.error('[syncEmailAccount] missing params', { concernId: !!concernId, accountId: !!accountId });
      throw new functions.https.HttpsError(
        'invalid-argument', 
        'Fehlende Parameter: concernId und accountId erforderlich',
        { receivedConcernId: !!concernId, receivedAccountId: !!accountId }
      );
    }

    // Diagnostic context for logging (no sensitive data)
    const logContext = {
      concernId,
      accountId: String(accountId).substring(0, 20),
      userId: uid.substring(0, 8),
      startedAt: new Date().toISOString(),
    };

    try {
      functions.logger.info('[syncEmailAccount] processing', logContext);

      // ============================================
      // 2. LOOKUP ACCOUNT (User-scoped first)
      // ============================================
      let account: EmailAccount | null = null;
      let accountRef: admin.firestore.DocumentReference | null = null;
      let resolvedAccountId = accountId;

      // Path 1: Direct lookup by doc ID
      const directPath = `concerns/${concernId}/users/${uid}/emailAccounts/${accountId}`;
      triedPaths.push(`direct:${directPath}`);
      
      const userAccountRef = db.doc(directPath);
      const userAccountSnap = await userAccountRef.get();

      if (userAccountSnap.exists) {
        const userAccountData = userAccountSnap.data()!;
        account = {
          ...userAccountData,
          orgId: concernId,
          emailAddress: userAccountData.email || userAccountData.emailAddress,
        } as EmailAccount;
        accountRef = userAccountRef;
        
        functions.logger.info('syncEmailAccount: found by direct doc ID', {
          ...logContext,
          path: 'direct',
        });
      } else {
        // Path 2: Fallback - lookup by emailKey field
        triedPaths.push(`emailKey:${accountId}`);
        
        const emailKeyQuery = await db
          .collection(`concerns/${concernId}/users/${uid}/emailAccounts`)
          .where('emailKey', '==', accountId)
          .limit(1)
          .get();

        if (!emailKeyQuery.empty) {
          const doc = emailKeyQuery.docs[0];
          const docData = doc.data();
          resolvedAccountId = doc.id;
          
          account = {
            ...docData,
            orgId: concernId,
            emailAddress: docData.email || docData.emailAddress,
          } as EmailAccount;
          accountRef = doc.ref;

          functions.logger.info('syncEmailAccount: found by emailKey', {
            ...logContext,
            resolvedAccountId,
            path: 'emailKey',
          });
        } else {
          // Path 3: Legacy concern-scoped fallback
          triedPaths.push(`legacy:emailAccounts/${accountId}`);
          
          const legacyAccountRef = db.collection('emailAccounts').doc(accountId);
          const legacyAccountSnap = await legacyAccountRef.get();

          if (legacyAccountSnap.exists) {
            const legacyData = legacyAccountSnap.data()!;
            
            // Verify user owns this legacy account
            if (legacyData.orgId !== concernId) {
              throw new functions.https.HttpsError(
                'permission-denied', 
                'Kein Zugriff auf dieses Konto',
                { triedPaths }
              );
            }

            account = legacyData as EmailAccount;
            accountRef = legacyAccountRef;

            functions.logger.info('syncEmailAccount: found in legacy collection', {
              ...logContext,
              path: 'legacy',
            });
          }
        }
      }

      if (!account || !accountRef) {
        functions.logger.warn('syncEmailAccount: account not found after all paths', {
          ...logContext,
          triedPaths,
        });
        throw new functions.https.HttpsError(
          'not-found', 
          'Account nicht gefunden. Bitte Konto erneut verbinden.',
          { triedPaths, accountId: logContext.accountId }
        );
      }

      // ============================================
      // 3. VALIDATE ACCOUNT CONFIGURATION
      // ============================================
      if (!account.provider) {
        throw new functions.https.HttpsError(
          'failed-precondition', 
          'Konto unvollständig konfiguriert: Provider fehlt'
        );
      }

      if (!account.oauthRef && account.provider !== 'imap') {
        throw new functions.https.HttpsError(
          'failed-precondition', 
          'Konto unvollständig konfiguriert: OAuth-Referenz fehlt'
        );
      }

      // ============================================
      // 4. VERIFY OWNERSHIP OR SHARED ACCESS
      // ============================================
      // Check if user is owner or has shared access
      const accountOwnerUid = account.ownerUid;
      const sharedWithUids = account.sharedWithUids || [];
      const isOwner = accountOwnerUid === uid;
      const hasSharedAccess = sharedWithUids.includes(uid);
      
      // For user-scoped path (direct match), ownership is implicit
      // For emailKey lookup or legacy, verify explicitly
      if (!userAccountSnap.exists && !isOwner && !hasSharedAccess) {
        // Fallback: verify via emailAccountIndex for legacy accounts
        try {
          const { verifyEmailOwnership } = require('./emailAccountAssignment');
          const hasOwnership = await verifyEmailOwnership(concernId, uid, account.emailAddress);
          
          if (!hasOwnership) {
            console.warn('[syncEmailAccount] ownership verification failed', {
              ...logContext,
              ownerUid: accountOwnerUid?.substring(0, 8),
              requestingUid: uid.substring(0, 8),
            });
            throw new functions.https.HttpsError(
              'permission-denied', 
              'E-Mail-Konto ist nicht Ihnen zugeordnet'
            );
          }
        } catch (verifyErr) {
          // If verification fails, deny access
          if ((verifyErr as any).code === 'permission-denied') throw verifyErr;
          console.error('[syncEmailAccount] ownership verification error', verifyErr);
          throw new functions.https.HttpsError(
            'permission-denied', 
            'Zugriffsprüfung fehlgeschlagen'
          );
        }
      }
      
      console.info('[syncEmailAccount] access verified', {
        ...logContext,
        phase: 'access',
        isOwner,
        hasSharedAccess,
      });

      // ============================================
      // 5. INITIALIZE CONNECTOR
      // ============================================
      let connector: GmailConnector | Microsoft365Connector | ImapConnector;
      
      // IMPORTANT: Use resolvedAccountId (the actual doc ID) for storage, not the input accountId
      // This ensures emails are linked to the correct account in user-scoped storage
      const storageAccountId = resolvedAccountId;
      
      // Use the requesting user's UID as the owner for the emails
      // This ensures emails are correctly scoped to the user who triggered the sync
      const ownerUidForEmails = uid;

      if (account.provider === 'gmail') {
        const accessToken = await getAccessToken(account.oauthRef);
        connector = new GmailConnector(storageAccountId, concernId, accessToken);
      } else if (account.provider === 'm365') {
        const accessToken = await getAccessToken(account.oauthRef);
        connector = new Microsoft365Connector(storageAccountId, concernId, accessToken);
      } else if (account.provider === 'imap') {
        const credentials = await getImapCredentials(account.oauthRef);
        connector = new ImapConnector(storageAccountId, concernId, ownerUidForEmails, credentials);
      } else {
        throw new functions.https.HttpsError('invalid-argument', 'Unbekannter Provider');
      }

      // ============================================
      // 6. FETCH AND PROCESS MESSAGES
      // ============================================
      const allMessages = await connector.fetchNewMessages(account.syncState || {});
      
      // LIMIT: Process max 10 messages per sync to avoid timeout (408)
      // Cloud Functions HTTP timeout is ~60s, and each message can take ~3-5s with AI
      const MAX_MESSAGES_PER_SYNC = 10;
      const messages = allMessages.slice(0, MAX_MESSAGES_PER_SYNC);
      const skippedCount = allMessages.length - messages.length;

      functions.logger.info('syncEmailAccount: fetched messages', {
        ...logContext,
        provider: account.provider,
        totalFetched: allMessages.length,
        processing: messages.length,
        skipped: skippedCount,
      });

      // Process results tracking
      let batchResult = { processed: 0, failed: 0, errors: [] as string[] };
      
      if (messages.length > 0) {
        try {
          batchResult = await processEmailBatch(messages);
        } catch (batchError: any) {
          // Log batch error but don't fail the sync - emails are still saved
          functions.logger.error('syncEmailAccount: processEmailBatch error (non-fatal)', {
            error: batchError?.message || String(batchError),
            code: batchError?.code,
          });
          batchResult.failed = messages.length;
        }
      }

      // ============================================
      // 7. UPDATE SYNC STATE (using safeMergeWrite)
      // ============================================
      const now = admin.firestore.FieldValue.serverTimestamp();
      const syncStateUpdate = {
        lastSyncAt: now,
        syncState: {
          lastSyncedAt: now,
          messageCount: messages.length,
        },
        updatedAt: now,
      };

      // Update the account doc we found (safe merge, never throws on undefined)
      await safeMergeWrite(accountRef, syncStateUpdate, 'syncEmailAccount:accountRef');

      // If using legacy, also try to update user-scoped doc
      if (!userAccountSnap.exists) {
        try {
          await safeMergeWrite(userAccountRef, {
            lastSyncAt: now,
            updatedAt: now,
          }, 'syncEmailAccount:userAccountRef');
        } catch (updateErr) {
          // User-scoped doc may not exist - this is OK
          console.debug('[syncEmailAccount] Could not update user-scoped account doc', {
            accountId: String(accountId).substring(0, 8),
          });
        }
      }

      console.info('[syncEmailAccount] completed', {
        ...logContext,
        phase: 'done',
        messageCount: messages.length,
        skippedCount,
        totalFetched: allMessages.length,
        processed: batchResult.processed,
        failed: batchResult.failed,
      });

      return {
        ok: true,
        // Tell frontend if there are more messages to sync
        hasMore: skippedCount > 0,
        skippedCount,
        // Processing results
        processed: batchResult.processed,
        failed: batchResult.failed,
        success: true,
        accountId,
        messageCount: messages.length,
        syncedAt: new Date().toISOString(),
      };

    } catch (error: unknown) {
      const err = error as Error & { code?: string; httpErrorCode?: any };
      
      // ALWAYS log the full error with stack trace
      console.error('[syncEmailAccount] failed', {
        err: String(err),
        message: err?.message,
        name: err?.name,
        code: err?.code,
        stack: err?.stack,
        data: JSON.stringify(data).substring(0, 200),
        uid: context.auth?.uid,
        triedPaths,
      });
      
      // Build debug details for HttpsError response
      const debugDetails = {
        message: String(err?.message ?? err),
        name: err?.name || 'Error',
        code: err?.code,
        stack: err?.stack?.substring(0, 500),
        triedPaths,
        concernId: logContext.concernId,
        accountId: logContext.accountId,
        uid: context.auth?.uid?.substring(0, 8),
        data: JSON.stringify(data).substring(0, 100),
      };
      
      // Re-throw HttpsErrors as-is (they already have proper messages)
      if (err.name === 'HttpsError' || err.httpErrorCode) {
        console.info('[syncEmailAccount] rethrowing HttpsError', { code: err.code });
        throw err;
      }

      // Map specific error codes to German user messages
      if (err.code === 'EAUTH' || err.message?.includes('auth') || err.message?.includes('Auth')) {
        throw new functions.https.HttpsError(
          'unauthenticated', 
          'E-Mail-Authentifizierung fehlgeschlagen. Bitte Zugangsdaten prüfen.',
          debugDetails
        );
      }
      if (err.code === 'ECONNECTION' || err.code === 'ENOTFOUND' || err.message?.includes('connect') || err.message?.includes('ETIMEDOUT')) {
        throw new functions.https.HttpsError(
          'unavailable', 
          'Verbindung zum E-Mail-Server fehlgeschlagen. Bitte später erneut versuchen.',
          debugDetails
        );
      }
      if (err.message?.includes('OAuth') || err.message?.includes('token') || err.message?.includes('Token')) {
        throw new functions.https.HttpsError(
          'permission-denied', 
          'OAuth-Token ungültig oder abgelaufen. Bitte Konto erneut verbinden.',
          debugDetails
        );
      }
      if (err.message?.includes('oauthRef') || err.message?.includes('credentials')) {
        throw new functions.https.HttpsError(
          'failed-precondition', 
          'Konto unvollständig konfiguriert. Bitte erneut verbinden.',
          debugDetails
        );
      }
      
      // Generic error with full debug details - NEVER return raw 500
      throw new functions.https.HttpsError(
        'internal', 
        'Synchronisierung fehlgeschlagen',
        debugDetails
      );
    }
    } catch (outerError: unknown) {
      // OUTER catch - catches anything that escaped the inner try/catch
      const err = outerError as Error & { code?: string; httpErrorCode?: any };
      
      console.error('[syncEmailAccount] OUTER catch - unexpected error', {
        errorType: err?.constructor?.name,
        message: err?.message,
        code: err?.code,
        stack: err?.stack?.substring(0, 500),
        triedPaths,
        data: JSON.stringify(data).substring(0, 100),
        uid: context.auth?.uid?.substring(0, 8),
      });
      
      // Re-throw HttpsErrors
      if (err?.name === 'HttpsError' || err?.httpErrorCode) {
        throw err;
      }
      
      // Wrap any other error
      throw new functions.https.HttpsError(
        'internal',
        'Synchronisierung fehlgeschlagen (unerwarteter Fehler)',
        {
          message: String(err?.message ?? err),
          name: err?.name || 'Error',
          code: err?.code,
          stack: err?.stack?.substring(0, 300),
          triedPaths,
        }
      );
    }
  });

/**
 * Helper: Get OAuth access token from secure storage
 * Now uses the centralized getAccessToken from oauth.ts with automatic refresh
 */
async function getAccessToken(oauthRef: string): Promise<string> {
  return await getTokenFromOAuth(oauthRef);
}

/**
 * Helper: Get IMAP credentials from secure storage
 */
async function getImapCredentials(oauthRef: string): Promise<any> {
  const { getImapCredentials: getDecryptedCredentials } = require('./imapOAuth');
  return await getDecryptedCredentials(oauthRef);
}

