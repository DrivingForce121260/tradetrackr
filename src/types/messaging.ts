// ============================================================================
// MESSAGING INTERFACES AND TYPES
// ============================================================================

import { ManagementProps } from './common';

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: string;
  isRead: boolean;
  messageType: MessageType;
}

export interface SimpleMessage {
  id: string;
  text: string;
  sender: string;
  timestamp: Date;
  isOwn: boolean;
}

// Message Type
export type MessageType = 'text' | 'file' | 'system';

// Messaging Props Interfaces
export interface SimpleMessagingProps extends ManagementProps {}
