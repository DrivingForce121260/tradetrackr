/**
 * Email Intelligence Agent - IMAP Account Management
 * Handles IMAP credential storage (no OAuth, uses password)
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';

const db = admin.firestore();

// Encryption key - should be in environment variables in production
const ENCRYPTION_KEY = process.env.IMAP_ENCRYPTION_KEY || 'default-key-change-in-production-32b';
const ALGORITHM = 'aes-256-cbc';

/**
 * Encrypt password for storage
 */
function encryptPassword(password: string): { encrypted: string; iv: string } {
  const iv = crypto.randomBytes(16);
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(password, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return {
    encrypted,
    iv: iv.toString('hex'),
  };
}

/**
 * Decrypt password from storage
 */
function decryptPassword(encrypted: string, ivHex: string): string {
  const iv = Buffer.from(ivHex, 'hex');
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Store IMAP account credentials
 * 
 * CRITICAL: This function now enforces email uniqueness via emailAccountIndex.
 * The email must be available (not assigned to another user) before storing.
 */
export const storeImapAccount = functions
  .region('europe-west1')
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User not authenticated');
    }

    const callerUid = context.auth.uid;
    const { orgId, emailAddress, host, port, user, password, tls } = data;

    if (!orgId || !emailAddress || !host || !port || !user || !password) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'All IMAP credentials required: orgId, emailAddress, host, port, user, password'
      );
    }

    // Verify user has access to this org
    const userDoc = await db.collection('users').doc(callerUid).get();
    const userData = userDoc.data();
    const userOrgId = userData?.concernID || userData?.ConcernID;

    if (userOrgId !== orgId) {
      throw new functions.https.HttpsError('permission-denied', 'Access denied to this organization');
    }

    // ========================================
    // CRITICAL: Check email availability FIRST
    // ========================================
    const { checkEmailAvailability } = require('./emailAccountAssignment');
    const availability = await checkEmailAvailability(orgId, callerUid, emailAddress);

    if (!availability.available) {
      functions.logger.warn('storeImapAccount: email already assigned to another user', {
        orgId,
        emailAddress,
        callerUid: callerUid.substring(0, 8),
        reason: availability.reason,
      });
      throw new functions.https.HttpsError(
        'failed-precondition',
        'EMAIL_ALREADY_ASSIGNED'
      );
    }

    try {
      // Test IMAP connection before storing
      functions.logger.info(`Testing IMAP connection for ${emailAddress}...`);
      
      const imaps = require('imap-simple');
      const testConfig = {
        imap: {
          user,
          password,
          host,
          port: parseInt(port),
          tls: tls !== false,
          tlsOptions: { rejectUnauthorized: false },
          authTimeout: 10000,
        },
      };

      try {
        const connection = await imaps.connect(testConfig);
        await connection.openBox('INBOX');
        connection.end();
        functions.logger.info('IMAP connection test passed');
      } catch (testError: any) {
        functions.logger.error('IMAP connection test failed:', testError);
        throw new functions.https.HttpsError(
          'failed-precondition',
          `Verbindung fehlgeschlagen: ${testError.message}. Bitte überprüfen Sie Host, Port, Benutzername und Passwort.`
        );
      }

      // ========================================
      // CRITICAL: Assign email in index BEFORE storing account
      // This ensures atomicity of the assignment
      // ========================================
      const crypto = require('crypto');
      const normalizedEmail = emailAddress.toLowerCase().trim();
      const emailKey = crypto.createHash('sha256').update(normalizedEmail).digest('hex').substring(0, 32);
      const indexRef = db.doc(`concerns/${orgId}/emailAccountIndex/${emailKey}`);
      const now = admin.firestore.FieldValue.serverTimestamp();

      // Create account ID
      const accountId = `${orgId}_${emailAddress.replace(/[^a-zA-Z0-9]/g, '_')}`;

      // Use transaction to ensure atomicity of assignment + account creation
      await db.runTransaction(async (transaction: admin.firestore.Transaction) => {
        const indexDoc = await transaction.get(indexRef);

        // Double-check assignment in transaction
        if (indexDoc.exists) {
          const indexData = indexDoc.data();
          if (indexData?.assignedToUid !== callerUid && indexData?.status === 'assigned') {
            throw new functions.https.HttpsError(
              'failed-precondition',
              'EMAIL_ALREADY_ASSIGNED'
            );
          }
        }

        // Assign email to user in index
        transaction.set(indexRef, {
          email: normalizedEmail,
          emailKey,
          assignedToUid: callerUid,
          assignedAt: now,
          updatedAt: now,
          provider: 'imap',
          accountId,
          status: 'assigned',
        }, { merge: true });

        // Store email account in USER-SCOPED path
        // Path: concerns/{concernId}/users/{uid}/emailAccounts/{accountId}
        const userEmailAccountRef = db.doc(
          `concerns/${orgId}/users/${callerUid}/emailAccounts/${accountId}`
        );
        transaction.set(userEmailAccountRef, {
          id: accountId,
          concernId: orgId,
          ownerUid: callerUid,
          email: normalizedEmail,
          emailKey,
          provider: 'imap',
          oauthRef: accountId,
          status: 'connected',
          active: true,
          createdAt: now,
          updatedAt: now,
        });

        // ALSO store in legacy location for sync function compatibility
        // TODO: Remove this after migrating sync function to user-scoped paths
        transaction.set(db.collection('emailAccounts').doc(accountId), {
          orgId,
          provider: 'imap',
          emailAddress,
          oauthRef: accountId,
          active: true,
          ownerUid: callerUid,
          createdAt: now,
          updatedAt: now,
        });
      });

      // Encrypt password and store credentials (outside transaction - not critical for uniqueness)
      const { encrypted, iv } = encryptPassword(password);
      await db.collection('_oauth_tokens').doc(accountId).set({
        imapConfig: {
          host,
          port: parseInt(port),
          user,
          encryptedPassword: encrypted,
          iv,
          tls: tls !== false,
        },
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      functions.logger.info(`IMAP account stored and assigned: ${emailAddress} for org ${orgId} to user ${callerUid.substring(0, 8)}`);

      return {
        success: true,
        accountId,
        message: `IMAP-Konto ${emailAddress} erfolgreich verbunden und validiert`,
      };
    } catch (error: any) {
      functions.logger.error('Error storing IMAP account:', error);
      
      // Pass through validation errors
      if (error.code === 'failed-precondition') {
        throw error;
      }
      
      throw new functions.https.HttpsError('internal', `Failed to store IMAP account: ${error.message}`);
    }
  });

/**
 * Test IMAP connection before storing
 */
export const testImapConnection = functions
  .region('europe-west1')
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User not authenticated');
    }

    const { host, port, user, password, tls } = data;

    if (!host || !port || !user || !password) {
      throw new functions.https.HttpsError('invalid-argument', 'All IMAP credentials required');
    }

    try {
      const imaps = require('imap-simple');

      const config = {
        imap: {
          user,
          password,
          host,
          port: parseInt(port),
          tls: tls !== false,
          tlsOptions: { rejectUnauthorized: false },
          authTimeout: 10000,
        },
      };

      functions.logger.info(`Testing IMAP connection to ${host}:${port}`);

      // Try to connect
      const connection = await imaps.connect(config);
      
      // Try to open INBOX
      await connection.openBox('INBOX');
      
      // Close connection
      connection.end();

      functions.logger.info('IMAP connection test successful');

      return {
        success: true,
        message: 'Verbindung erfolgreich',
      };
    } catch (error: any) {
      functions.logger.error('IMAP connection test failed:', error);
      throw new functions.https.HttpsError(
        'failed-precondition',
        `Verbindung fehlgeschlagen: ${error.message}`
      );
    }
  });

/**
 * Helper function to get decrypted IMAP credentials
 * Used by other functions (not exported as Cloud Function)
 */
export async function getImapCredentials(accountId: string): Promise<any> {
  try {
    const tokenDoc = await db.collection('_oauth_tokens').doc(accountId).get();
    
    if (!tokenDoc.exists) {
      throw new Error('IMAP credentials not found');
    }

    const data = tokenDoc.data()!;
    const imapConfig = data.imapConfig;

    if (!imapConfig) {
      throw new Error('No IMAP config found');
    }

    // Decrypt password
    const password = decryptPassword(imapConfig.encryptedPassword, imapConfig.iv);

    return {
      host: imapConfig.host,
      port: imapConfig.port,
      user: imapConfig.user,
      password,
      tls: imapConfig.tls,
    };
  } catch (error) {
    functions.logger.error(`Error getting IMAP credentials for ${accountId}:`, error);
    throw error;
  }
}


