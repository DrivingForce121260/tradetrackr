/**
 * Email Intelligence Agent - Base Connector Interface
 * Defines the contract that all email connectors must implement
 */

import { EmailConnector, EmailConnectorSyncState, NormalizedEmail } from '../types';

/**
 * Abstract base class for email connectors
 * Provides common functionality and enforces interface implementation
 */
export abstract class BaseEmailConnector implements EmailConnector {
  protected accountId: string;
  protected orgId: string;

  constructor(accountId: string, orgId: string) {
    this.accountId = accountId;
    this.orgId = orgId;
  }

  /**
   * Fetch new messages from the email provider
   * @param params - Sync state for incremental fetching
   */
  abstract fetchNewMessages(params: EmailConnectorSyncState): Promise<NormalizedEmail[]>;

  /**
   * Parse webhook notification from the email provider
   * @param req - Express request object from webhook
   */
  abstract parseWebhook(req: any): Promise<NormalizedEmail[]>;

  /**
   * Helper method to normalize email addresses
   */
  protected normalizeEmailAddress(address: string): string {
    return address.toLowerCase().trim();
  }

  /**
   * Helper method to extract plain text from HTML
   */
  protected stripHtml(html: string): string {
    // Basic HTML stripping - can be enhanced
    return html
      .replace(/<style[^>]*>.*?<\/style>/gi, '')
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Helper method to validate email format
   */
  protected isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}









