/**
 * Email Intelligence Agent - Gmail Connector
 * Handles Gmail API integration via OAuth2
 */

import { google } from 'googleapis';
import { BaseEmailConnector } from './base';
import { EmailConnectorSyncState, NormalizedEmail, NormalizedAttachment } from '../types';
import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';

/**
 * Gmail connector using Gmail API with OAuth2
 */
export class GmailConnector extends BaseEmailConnector {
  private gmail: any;

  constructor(accountId: string, orgId: string, private accessToken: string) {
    super(accountId, orgId);
  }

  /**
   * Initialize Gmail API client
   */
  private async initializeClient() {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: this.accessToken });
    this.gmail = google.gmail({ version: 'v1', auth });
  }

  /**
   * Fetch new messages from Gmail using History API
   */
  async fetchNewMessages(params: EmailConnectorSyncState): Promise<NormalizedEmail[]> {
    try {
      await this.initializeClient();

      const messages: NormalizedEmail[] = [];

      // Use history API if we have a historyId, otherwise do initial sync
      if (params.historyId) {
        const history = await this.gmail.users.history.list({
          userId: 'me',
          startHistoryId: params.historyId,
          historyTypes: ['messageAdded'],
        });

        if (history.data.history) {
          for (const record of history.data.history) {
            if (record.messagesAdded) {
              for (const added of record.messagesAdded) {
                const message = await this.fetchFullMessage(added.message.id);
                if (message) messages.push(message);
              }
            }
          }
        }
      } else {
        // Initial sync - fetch recent messages (last 7 days)
        const query = `after:${Math.floor(Date.now() / 1000) - 7 * 24 * 3600}`;
        const response = await this.gmail.users.messages.list({
          userId: 'me',
          q: query,
          maxResults: 100,
        });

        if (response.data.messages) {
          for (const msg of response.data.messages) {
            const message = await this.fetchFullMessage(msg.id);
            if (message) messages.push(message);
          }
        }
      }

      return messages;
    } catch (error) {
      functions.logger.error('Gmail fetch error:', error);
      throw error;
    }
  }

  /**
   * Fetch full message details from Gmail
   */
  private async fetchFullMessage(messageId: string): Promise<NormalizedEmail | null> {
    try {
      const response = await this.gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full',
      });

      const message = response.data;
      const headers = this.parseHeaders(message.payload.headers);

      // Extract body
      let bodyText = '';
      let bodyHtml = '';
      this.extractBody(message.payload, (text, html) => {
        bodyText += text;
        bodyHtml += html;
      });

      // Extract attachments
      const attachments: NormalizedAttachment[] = [];
      await this.extractAttachments(message.payload, messageId, attachments);

      return {
        orgId: this.orgId,
        accountId: this.accountId,
        provider: 'gmail',
        providerMessageId: messageId,
        threadId: message.threadId || messageId,
        from: this.normalizeEmailAddress(headers.from || ''),
        to: this.parseEmailList(headers.to || ''),
        cc: this.parseEmailList(headers.cc || ''),
        subject: headers.subject || '(No Subject)',
        bodyText: bodyText || this.stripHtml(bodyHtml),
        bodyHtml: bodyHtml || undefined,
        receivedAt: new Date(parseInt(message.internalDate)),
        attachments,
      };
    } catch (error) {
      functions.logger.error(`Error fetching message ${messageId}:`, error);
      return null;
    }
  }

  /**
   * Parse email headers into object
   */
  private parseHeaders(headers: any[]): Record<string, string> {
    const parsed: Record<string, string> = {};
    for (const header of headers) {
      parsed[header.name.toLowerCase()] = header.value;
    }
    return parsed;
  }

  /**
   * Parse comma-separated email list
   */
  private parseEmailList(emailString: string): string[] {
    return emailString
      .split(',')
      .map(e => this.normalizeEmailAddress(e.replace(/<[^>]+>/, '').trim()))
      .filter(e => this.isValidEmail(e));
  }

  /**
   * Extract body text and HTML from message payload
   */
  private extractBody(part: any, callback: (text: string, html: string) => void) {
    if (part.body && part.body.data) {
      const data = Buffer.from(part.body.data, 'base64').toString('utf-8');
      if (part.mimeType === 'text/plain') {
        callback(data, '');
      } else if (part.mimeType === 'text/html') {
        callback('', data);
      }
    }

    if (part.parts) {
      for (const subPart of part.parts) {
        this.extractBody(subPart, callback);
      }
    }
  }

  /**
   * Extract attachments from message payload
   */
  private async extractAttachments(
    part: any, 
    messageId: string, 
    attachments: NormalizedAttachment[]
  ) {
    if (part.filename && part.body && part.body.attachmentId) {
      try {
        const attachment = await this.gmail.users.messages.attachments.get({
          userId: 'me',
          messageId: messageId,
          id: part.body.attachmentId,
        });

        attachments.push({
          fileName: part.filename,
          mimeType: part.mimeType,
          data: Buffer.from(attachment.data.data, 'base64'),
          size: part.body.size,
        });
      } catch (error) {
        functions.logger.error('Error fetching attachment:', error);
      }
    }

    if (part.parts) {
      for (const subPart of part.parts) {
        await this.extractAttachments(subPart, messageId, attachments);
      }
    }
  }

  /**
   * Parse Gmail Pub/Sub webhook notification
   */
  async parseWebhook(req: any): Promise<NormalizedEmail[]> {
    try {
      // Gmail Pub/Sub sends base64-encoded JSON in message.data
      const message = req.body.message;
      if (!message || !message.data) {
        return [];
      }

      const data = JSON.parse(Buffer.from(message.data, 'base64').toString());
      const historyId = data.historyId;

      // Fetch new messages using history API
      return await this.fetchNewMessages({ historyId });
    } catch (error) {
      functions.logger.error('Gmail webhook parse error:', error);
      return [];
    }
  }
}









