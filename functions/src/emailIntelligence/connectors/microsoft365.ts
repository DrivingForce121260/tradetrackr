/**
 * Email Intelligence Agent - Microsoft 365 Connector
 * Handles Microsoft Graph API integration via OAuth2
 */

import { BaseEmailConnector } from './base';
import { EmailConnectorSyncState, NormalizedEmail, NormalizedAttachment } from '../types';
import * as functions from 'firebase-functions';

/**
 * Microsoft 365 / Outlook connector using Graph API
 */
export class Microsoft365Connector extends BaseEmailConnector {
  private readonly graphBaseUrl = 'https://graph.microsoft.com/v1.0';

  constructor(accountId: string, orgId: string, private accessToken: string) {
    super(accountId, orgId);
  }

  /**
   * Fetch new messages from Microsoft Graph API
   */
  async fetchNewMessages(params: EmailConnectorSyncState): Promise<NormalizedEmail[]> {
    try {
      const messages: NormalizedEmail[] = [];

      // Use delta query if we have a deltaToken
      let url = params.deltaToken 
        ? `${this.graphBaseUrl}/me/messages/delta?$deltatoken=${params.deltaToken}`
        : `${this.graphBaseUrl}/me/messages/delta?$select=id,subject,from,toRecipients,ccRecipients,receivedDateTime,hasAttachments,body,conversationId`;

      while (url) {
        const response = await (global as any).fetch(url, {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`Graph API error: ${response.status} ${response.statusText}`);
        }

        const data: any = await response.json();

        // Process messages
        for (const message of data.value || []) {
          // Skip deleted messages
          if (message['@removed']) continue;

          const normalized = await this.normalizeMessage(message);
          if (normalized) messages.push(normalized);
        }

        // Check for next page or delta link
        url = data['@odata.nextLink'] || null;
      }

      return messages;
    } catch (error) {
      functions.logger.error('M365 fetch error:', error);
      throw error;
    }
  }

  /**
   * Normalize Microsoft Graph message to our format
   */
  private async normalizeMessage(message: any): Promise<NormalizedEmail | null> {
    try {
      // Parse recipients
      const to = (message.toRecipients || []).map((r: any) => 
        this.normalizeEmailAddress(r.emailAddress?.address || '')
      ).filter((e: string) => this.isValidEmail(e));

      const cc = (message.ccRecipients || []).map((r: any) => 
        this.normalizeEmailAddress(r.emailAddress?.address || '')
      ).filter((e: string) => this.isValidEmail(e));

      const from = this.normalizeEmailAddress(
        message.from?.emailAddress?.address || ''
      );

      // Extract body
      const bodyHtml = message.body?.contentType === 'html' 
        ? message.body.content 
        : undefined;
      const bodyText = message.body?.contentType === 'text' 
        ? message.body.content 
        : (bodyHtml ? this.stripHtml(bodyHtml) : '');

      // Fetch attachments if present
      const attachments: NormalizedAttachment[] = [];
      if (message.hasAttachments) {
        await this.fetchAttachments(message.id, attachments);
      }

      return {
        orgId: this.orgId,
        accountId: this.accountId,
        provider: 'm365',
        providerMessageId: message.id,
        threadId: message.conversationId || message.id,
        from,
        to,
        cc,
        subject: message.subject || '(No Subject)',
        bodyText,
        bodyHtml,
        receivedAt: new Date(message.receivedDateTime),
        attachments,
      };
    } catch (error) {
      functions.logger.error('Error normalizing M365 message:', error);
      return null;
    }
  }

  /**
   * Fetch attachments for a message
   */
  private async fetchAttachments(messageId: string, attachments: NormalizedAttachment[]) {
    try {
      const response = await (global as any).fetch(
        `${this.graphBaseUrl}/me/messages/${messageId}/attachments`,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        }
      );

      if (!response.ok) return;

      const data: any = await response.json();

      for (const attachment of data.value || []) {
        if (attachment['@odata.type'] === '#microsoft.graph.fileAttachment') {
          attachments.push({
            fileName: attachment.name,
            mimeType: attachment.contentType,
            data: Buffer.from(attachment.contentBytes, 'base64'),
            size: attachment.size,
          });
        }
      }
    } catch (error) {
      functions.logger.error('Error fetching M365 attachments:', error);
    }
  }

  /**
   * Parse Microsoft Graph change notification webhook
   */
  async parseWebhook(req: any): Promise<NormalizedEmail[]> {
    try {
      // Handle validation token for webhook subscription
      if (req.query && req.query.validationToken) {
        // This should be handled at the HTTP endpoint level
        return [];
      }

      // Process change notifications
      const notifications = req.body.value || [];
      const messages: NormalizedEmail[] = [];

      for (const notification of notifications) {
        if (notification.changeType === 'created') {
          // Fetch the new message
          const messageId = notification.resourceData?.id;
          if (messageId) {
            const response = await (global as any).fetch(
              `${this.graphBaseUrl}/me/messages/${messageId}`,
              {
                headers: {
                  Authorization: `Bearer ${this.accessToken}`,
                },
              }
            );

            if (response.ok) {
              const message = await response.json();
              const normalized = await this.normalizeMessage(message);
              if (normalized) messages.push(normalized);
            }
          }
        }
      }

      return messages;
    } catch (error) {
      functions.logger.error('M365 webhook parse error:', error);
      return [];
    }
  }
}

