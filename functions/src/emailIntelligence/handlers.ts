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

        // Update sync state
        await accountDoc.ref.update({
          'syncState.lastSyncedAt': admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
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

            // Update sync state
            await accountDoc.ref.update({
              'syncState.lastSyncedAt': admin.firestore.FieldValue.serverTimestamp(),
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
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

          // Initialize connector
          const connector = new ImapConnector(
            accountDoc.id,
            account.orgId,
            credentials
          );

          // Fetch new messages
          const messages = await connector.fetchNewMessages(account.syncState || {});

          functions.logger.info(`Fetched ${messages.length} messages for ${account.emailAddress}`);

          // Process messages
          if (messages.length > 0) {
            await processEmailBatch(messages);

            // Update sync state
            await accountDoc.ref.update({
              'syncState.lastSyncedAt': admin.firestore.FieldValue.serverTimestamp(),
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
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
 */
export const syncEmailAccount = functions
  .region('europe-west1')
  .https.onCall(async (data, context) => {
    // Check authentication
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User not authenticated');
    }

    const accountId = data.accountId;

    if (!accountId) {
      throw new functions.https.HttpsError('invalid-argument', 'Account ID required');
    }

    try {
      // Get account
      const accountDoc = await db.collection('emailAccounts').doc(accountId).get();

      if (!accountDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Account not found');
      }

      const account = accountDoc.data() as EmailAccount;

      // Check user has access to this org
      const userDoc = await db.collection('users').doc(context.auth.uid).get();
      const userData = userDoc.data();

      if (userData?.concernID !== account.orgId && userData?.ConcernID !== account.orgId) {
        throw new functions.https.HttpsError('permission-denied', 'Access denied');
      }

      // Get credentials based on provider
      let connector: any;

      if (account.provider === 'gmail') {
        const accessToken = await getAccessToken(account.oauthRef);
        connector = new GmailConnector(accountId, account.orgId, accessToken);
      } else if (account.provider === 'm365') {
        const accessToken = await getAccessToken(account.oauthRef);
        connector = new Microsoft365Connector(accountId, account.orgId, accessToken);
      } else if (account.provider === 'imap') {
        const credentials = await getImapCredentials(account.oauthRef);
        connector = new ImapConnector(accountId, account.orgId, credentials);
      } else {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid provider');
      }

      // Fetch and process messages
      const messages = await connector.fetchNewMessages(account.syncState || {});

      if (messages.length > 0) {
        await processEmailBatch(messages);

        // Update sync state
        await accountDoc.ref.update({
          'syncState.lastSyncedAt': admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      return {
        success: true,
        messageCount: messages.length,
      };
    } catch (error) {
      functions.logger.error('Manual sync error:', error);
      throw new functions.https.HttpsError('internal', 'Sync failed');
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

