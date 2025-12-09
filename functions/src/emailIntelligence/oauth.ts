/**
 * Email Intelligence Agent - OAuth Flow Handlers
 * Handles OAuth2 authentication for Gmail and Microsoft 365
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { google } from 'googleapis';

const db = admin.firestore();

/**
 * Initiate OAuth flow for Gmail
 */
export const gmailOAuthInit = functions
  .region('europe-west1')
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User not authenticated');
    }

    const { emailAddress, orgId } = data;

    if (!emailAddress || !orgId) {
      throw new functions.https.HttpsError('invalid-argument', 'Email address and orgId required');
    }

    try {
      // Get OAuth2 credentials from environment
      const clientId = process.env.GMAIL_CLIENT_ID || functions.config().gmail?.client_id;
      const clientSecret = process.env.GMAIL_CLIENT_SECRET || functions.config().gmail?.client_secret;
      const redirectUri = process.env.GMAIL_REDIRECT_URI || functions.config().gmail?.redirect_uri;

      if (!clientId || !clientSecret || !redirectUri) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          'Gmail OAuth not configured. Please set GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, and GMAIL_REDIRECT_URI'
        );
      }

      const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

      // Generate authorization URL
      const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: [
          'https://www.googleapis.com/auth/gmail.readonly',
          'https://www.googleapis.com/auth/gmail.modify',
        ],
        state: JSON.stringify({
          userId: context.auth.uid,
          orgId,
          emailAddress,
          provider: 'gmail',
        }),
      });

      return {
        authUrl,
        message: 'Redirect user to this URL to authorize',
      };
    } catch (error) {
      functions.logger.error('Gmail OAuth init error:', error);
      throw new functions.https.HttpsError('internal', 'Failed to initialize OAuth flow');
    }
  });

/**
 * Handle OAuth callback from Gmail
 */
export const gmailOAuthCallback = functions
  .region('europe-west1')
  .https.onRequest(async (req, res) => {
    try {
      const { code, state } = req.query;

      if (!code || !state) {
        res.status(400).send('Missing authorization code or state');
        return;
      }

      // Parse state
      const stateData = JSON.parse(state as string);
      const { userId, orgId, emailAddress, provider } = stateData;

      // Get OAuth2 credentials
      const clientId = process.env.GMAIL_CLIENT_ID || functions.config().gmail?.client_id;
      const clientSecret = process.env.GMAIL_CLIENT_SECRET || functions.config().gmail?.client_secret;
      const redirectUri = process.env.GMAIL_REDIRECT_URI || functions.config().gmail?.redirect_uri;

      const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

      // Exchange code for tokens
      const { tokens } = await oauth2Client.getToken(code as string);

      if (!tokens.access_token || !tokens.refresh_token) {
        throw new Error('No tokens received from OAuth');
      }

      // Store tokens securely (using Firestore for now, should use Secret Manager in production)
      const accountId = `${orgId}_${emailAddress.replace(/[^a-zA-Z0-9]/g, '_')}`;
      
      await db.collection('emailAccounts').doc(accountId).set({
        orgId,
        provider: 'gmail',
        emailAddress,
        oauthRef: accountId, // Reference to token storage
        active: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Store tokens in a separate secure collection
      await db.collection('_oauth_tokens').doc(accountId).set({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiryDate: tokens.expiry_date,
        tokenType: tokens.token_type,
        scope: tokens.scope,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      functions.logger.info(`Gmail account connected: ${emailAddress} for org ${orgId}`);

      // Redirect to success page
      res.redirect(`/smart-inbox?success=true&email=${encodeURIComponent(emailAddress)}`);
    } catch (error) {
      functions.logger.error('Gmail OAuth callback error:', error);
      res.status(500).send('OAuth authentication failed');
    }
  });

/**
 * Initiate OAuth flow for Microsoft 365
 */
export const m365OAuthInit = functions
  .region('europe-west1')
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User not authenticated');
    }

    const { emailAddress, orgId } = data;

    if (!emailAddress || !orgId) {
      throw new functions.https.HttpsError('invalid-argument', 'Email address and orgId required');
    }

    try {
      const clientId = process.env.M365_CLIENT_ID || functions.config().m365?.client_id;
      const redirectUri = process.env.M365_REDIRECT_URI || functions.config().m365?.redirect_uri;

      if (!clientId || !redirectUri) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          'Microsoft 365 OAuth not configured'
        );
      }

      const state = Buffer.from(
        JSON.stringify({
          userId: context.auth.uid,
          orgId,
          emailAddress,
          provider: 'm365',
        })
      ).toString('base64');

      const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
        `client_id=${clientId}` +
        `&response_type=code` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&response_mode=query` +
        `&scope=${encodeURIComponent('https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/Mail.ReadWrite offline_access')}` +
        `&state=${state}`;

      return {
        authUrl,
        message: 'Redirect user to this URL to authorize',
      };
    } catch (error) {
      functions.logger.error('M365 OAuth init error:', error);
      throw new functions.https.HttpsError('internal', 'Failed to initialize OAuth flow');
    }
  });

/**
 * Handle OAuth callback from Microsoft 365
 */
export const m365OAuthCallback = functions
  .region('europe-west1')
  .https.onRequest(async (req, res) => {
    try {
      const { code, state } = req.query;

      if (!code || !state) {
        res.status(400).send('Missing authorization code or state');
        return;
      }

      // Parse state
      const stateData = JSON.parse(Buffer.from(state as string, 'base64').toString());
      const { userId, orgId, emailAddress } = stateData;

      const clientId = process.env.M365_CLIENT_ID || functions.config().m365?.client_id;
      const clientSecret = process.env.M365_CLIENT_SECRET || functions.config().m365?.client_secret;
      const redirectUri = process.env.M365_REDIRECT_URI || functions.config().m365?.redirect_uri;

      // Exchange code for tokens
      const tokenResponse = await (global as any).fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code: code as string,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
        }),
      });

      const tokens = await tokenResponse.json();

      if (!tokens.access_token || !tokens.refresh_token) {
        throw new Error('No tokens received from OAuth');
      }

      // Store account
      const accountId = `${orgId}_${emailAddress.replace(/[^a-zA-Z0-9]/g, '_')}`;
      
      await db.collection('emailAccounts').doc(accountId).set({
        orgId,
        provider: 'm365',
        emailAddress,
        oauthRef: accountId,
        active: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Store tokens
      await db.collection('_oauth_tokens').doc(accountId).set({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresIn: tokens.expires_in,
        tokenType: tokens.token_type,
        scope: tokens.scope,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      functions.logger.info(`M365 account connected: ${emailAddress} for org ${orgId}`);

      res.redirect(`/smart-inbox?success=true&email=${encodeURIComponent(emailAddress)}`);
    } catch (error) {
      functions.logger.error('M365 OAuth callback error:', error);
      res.status(500).send('OAuth authentication failed');
    }
  });

/**
 * Get access token for an account (handles refresh if needed)
 */
export async function getAccessToken(accountId: string): Promise<string> {
  try {
    const tokenDoc = await db.collection('_oauth_tokens').doc(accountId).get();
    
    if (!tokenDoc.exists) {
      throw new Error('No tokens found for account');
    }

    const tokenData = tokenDoc.data()!;
    const account = await db.collection('emailAccounts').doc(accountId).get();
    const accountData = account.data();

    if (!accountData) {
      throw new Error('Account not found');
    }

    // Check if token is expired and refresh if needed
    const now = Date.now();
    const expiryDate = tokenData.expiryDate || 0;
    const BUFFER_TIME = 5 * 60 * 1000; // 5 minutes buffer

    if (now >= expiryDate - BUFFER_TIME) {
      functions.logger.info(`Token expired for account ${accountId}, refreshing...`);
      
      // Token expired or about to expire - refresh it
      let newToken: string;
      let newExpiryDate: number;
      
      if (accountData.provider === 'gmail') {
        const result = await refreshGmailToken(tokenData.refreshToken);
        newToken = result.accessToken;
        newExpiryDate = result.expiryDate;
      } else if (accountData.provider === 'm365') {
        const result = await refreshM365Token(tokenData.refreshToken);
        newToken = result.accessToken;
        newExpiryDate = result.expiryDate;
      } else {
        // IMAP doesn't use OAuth tokens
        return tokenData.accessToken || '';
      }
      
      // Update token in Firestore
      await tokenDoc.ref.update({
        accessToken: newToken,
        expiryDate: newExpiryDate,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      
      functions.logger.info(`Token refreshed successfully for account ${accountId}`);
      
      return newToken;
    }

    // Token still valid
    return tokenData.accessToken;
  } catch (error) {
    functions.logger.error(`Error getting access token for ${accountId}:`, error);
    throw error;
  }
}

/**
 * Refresh Gmail access token using refresh token
 */
async function refreshGmailToken(refreshToken: string): Promise<{ accessToken: string; expiryDate: number }> {
  try {
    const clientId = process.env.GMAIL_CLIENT_ID || functions.config().gmail?.client_id;
    const clientSecret = process.env.GMAIL_CLIENT_SECRET || functions.config().gmail?.client_secret;

    if (!clientId || !clientSecret) {
      throw new Error('Gmail OAuth credentials not configured');
    }

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
    oauth2Client.setCredentials({ refresh_token: refreshToken });

    // Refresh the access token
    const { credentials } = await oauth2Client.refreshAccessToken();

    if (!credentials.access_token) {
      throw new Error('No access token received from refresh');
    }

    const expiryDate = credentials.expiry_date || Date.now() + 3600000; // Default 1 hour

    functions.logger.info('Gmail token refreshed successfully');

    return {
      accessToken: credentials.access_token,
      expiryDate,
    };
  } catch (error) {
    functions.logger.error('Gmail token refresh error:', error);
    throw error;
  }
}

/**
 * Refresh Microsoft 365 access token using refresh token
 */
async function refreshM365Token(refreshToken: string): Promise<{ accessToken: string; expiryDate: number }> {
  try {
    const clientId = process.env.M365_CLIENT_ID || functions.config().m365?.client_id;
    const clientSecret = process.env.M365_CLIENT_SECRET || functions.config().m365?.client_secret;

    if (!clientId || !clientSecret) {
      throw new Error('M365 OAuth credentials not configured');
    }

    const tokenResponse = await (global as any).fetch(
      'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }).toString(),
      }
    );

    if (!tokenResponse.ok) {
      throw new Error(`Token refresh failed: ${tokenResponse.status} ${tokenResponse.statusText}`);
    }

    const tokens = await tokenResponse.json();

    if (!tokens.access_token) {
      throw new Error('No access token received from refresh');
    }

    const expiresIn = tokens.expires_in || 3600; // Default 1 hour
    const expiryDate = Date.now() + expiresIn * 1000;

    functions.logger.info('M365 token refreshed successfully');

    return {
      accessToken: tokens.access_token,
      expiryDate,
    };
  } catch (error) {
    functions.logger.error('M365 token refresh error:', error);
    throw error;
  }
}

