/**
 * Email Intelligence Agent - IMAP Connector
 * Handles generic IMAP email integration (fallback option)
 */

import { BaseEmailConnector } from './base';
import { EmailConnectorSyncState, NormalizedEmail, NormalizedAttachment } from '../types';
import * as functions from 'firebase-functions';
// @ts-ignore - imap-simple is optional dependency
import * as imaps from 'imap-simple';
// @ts-ignore - mailparser is optional dependency
import { simpleParser, ParsedMail, Attachment } from 'mailparser';

/**
 * Generic IMAP connector for email providers without dedicated APIs
 */
export class ImapConnector extends BaseEmailConnector {
  private config: imaps.ImapSimpleOptions;
  private ownerUid: string;

  constructor(
    accountId: string, 
    orgId: string,
    ownerUid: string,
    config: {
      host: string;
      port: number;
      user: string;
      password: string;
      tls: boolean;
    }
  ) {
    super(accountId, orgId);
    this.ownerUid = ownerUid;
    
    this.config = {
      imap: {
        user: config.user,
        password: config.password,
        host: config.host,
        port: config.port,
        tls: config.tls,
        tlsOptions: { rejectUnauthorized: false },
        authTimeout: 10000,
      },
    };
  }

  /**
   * Fetch new messages via IMAP
   * Limited to MAX_EMAILS_PER_SYNC to prevent memory overflow
   */
  async fetchNewMessages(params: EmailConnectorSyncState): Promise<NormalizedEmail[]> {
    // Limit emails per sync to prevent memory issues and keep sync fast
    const MAX_EMAILS_PER_SYNC = 10;
    
    let connection: any = null;
    
    try {
      functions.logger.info(`IMAP: Connecting to ${this.config.imap.host}...`);
      
      // Connect to IMAP server
      connection = await imaps.connect(this.config);
      
      // Open INBOX
      await connection.openBox('INBOX');
      
      functions.logger.info('IMAP: Connected successfully, searching for messages');
      
      // Calculate search criteria
      // Fetch from last sync, or last 7 days if no previous sync (reduced from 60)
      const since = params.lastSyncedAt 
        ? new Date(params.lastSyncedAt.seconds * 1000)
        : new Date(Date.now() - 7 * 24 * 3600000); // Last 7 days for initial sync
      
      // Search for messages since last sync
      const searchCriteria = [['SINCE', since]];
      const fetchOptions = {
        bodies: ['HEADER', 'TEXT', ''],
        struct: true,
        markSeen: false,
      };
      
      const allMessages = await connection.search(searchCriteria, fetchOptions);
      
      functions.logger.info(`IMAP: Found ${allMessages.length} total messages since ${since.toISOString()}`);
      
      // Limit to newest MAX_EMAILS_PER_SYNC messages
      // Sort by UID descending (newest first) and take first N
      const messages = allMessages
        .sort((a: any, b: any) => (b.attributes?.uid || 0) - (a.attributes?.uid || 0))
        .slice(0, MAX_EMAILS_PER_SYNC);
      
      if (allMessages.length > MAX_EMAILS_PER_SYNC) {
        functions.logger.info(`IMAP: Processing ${messages.length} of ${allMessages.length} messages (limited)`);
      }
      
      // Parse and normalize messages
      const normalized: NormalizedEmail[] = [];
      
      for (const item of messages) {
        try {
          const normalizedEmail = await this.parseImapMessage(item);
          if (normalizedEmail) {
            normalized.push(normalizedEmail);
          }
        } catch (error) {
          functions.logger.error('Error parsing IMAP message:', error);
        }
      }
      
      functions.logger.info(`IMAP: Successfully parsed ${normalized.length} messages`);
      
      return normalized;
    } catch (error) {
      functions.logger.error('IMAP fetch error:', error);
      throw error;
    } finally {
      // Always close connection
      if (connection) {
        try {
          connection.end();
        } catch (closeError) {
          functions.logger.error('Error closing IMAP connection:', closeError);
        }
      }
    }
  }

  /**
   * IMAP doesn't support webhooks - this method is not applicable
   */
  async parseWebhook(req: any): Promise<NormalizedEmail[]> {
    functions.logger.warn('IMAP does not support webhooks - use polling instead');
    return [];
  }

  /**
   * Parse IMAP message to normalized format
   */
  private async parseImapMessage(item: any): Promise<NormalizedEmail | null> {
    try {
      // Find the full message part
      const all = item.parts.find((part: any) => part.which === '');
      
      if (!all || !all.body) {
        functions.logger.warn('No message body found');
        return null;
      }
      
      // Parse with mailparser
      const parsed: ParsedMail = await simpleParser(all.body);
      
      // Extract sender
      const fromValue = Array.isArray(parsed.from) ? parsed.from[0] : parsed.from;
      const from = fromValue?.value?.[0]?.address || fromValue?.text || '';
      
      // Extract recipients
      const toValue = Array.isArray(parsed.to) ? parsed.to : (parsed.to ? [parsed.to] : []);
      const to = toValue
        .flatMap((addr: any) => addr.value || [])
        .map((addr: any) => addr.address)
        .filter((addr: string) => this.isValidEmail(addr));
      
      const ccValue = Array.isArray(parsed.cc) ? parsed.cc : (parsed.cc ? [parsed.cc] : []);
      const cc = ccValue
        .flatMap((addr: any) => addr.value || [])
        .map((addr: any) => addr.address)
        .filter((addr: string) => this.isValidEmail(addr));
      
      // Extract body - use null instead of undefined for Firestore compatibility
      const bodyText = parsed.text || '';
      const bodyHtml = parsed.html ? parsed.html.toString() : null;
      
      // Extract attachments
      const attachments: NormalizedAttachment[] = [];
      
      if (parsed.attachments && parsed.attachments.length > 0) {
        for (const att of parsed.attachments) {
          attachments.push({
            fileName: att.filename || 'attachment',
            mimeType: att.contentType || 'application/octet-stream',
            data: att.content,
            size: att.size || att.content.length,
          });
        }
      }
      
      // Get UID as provider message ID
      const uid = item.attributes?.uid?.toString() || '';
      
      return {
        orgId: this.orgId,
        accountId: this.accountId,
        ownerUid: this.ownerUid,
        provider: 'imap',
        providerMessageId: uid,
        threadId: parsed.messageId || uid,
        from: this.normalizeEmailAddress(from),
        to: to.map((addr: string) => this.normalizeEmailAddress(addr)),
        cc: cc.map((addr: string) => this.normalizeEmailAddress(addr)),
        subject: parsed.subject || '(No Subject)',
        bodyText,
        bodyHtml,
        receivedAt: parsed.date || new Date(),
        attachments,
      };
    } catch (error) {
      functions.logger.error('Error parsing IMAP message:', error);
      return null;
    }
  }
}

