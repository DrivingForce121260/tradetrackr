// ============================================================================
// OPTIMIZED MESSAGING HOOKS
// ============================================================================
import { useContext, useCallback, useMemo } from 'react';
import { MessagingContext } from '@/contexts/MessagingContext';

export const useMessaging = () => {
  const context = useContext(MessagingContext);
  if (!context) {
    throw new Error('useMessaging must be used within a MessagingProvider');
  }

  // Return the context directly since it already has all the needed properties
  return context;
};

// Specialized messaging hooks
export const useMessageNotifications = () => {
  const { messages, markAsRead } = useMessaging();
  
  const unreadCount = messages.filter(msg => !msg.read).length;
  
  const hasUnreadMessages = unreadCount > 0;
  
  const markNotificationsAsRead = useCallback(() => {
    messages.forEach(msg => {
      if (!msg.read && msg.type === 'info') {
        markAsRead(msg.id);
      }
    });
  }, [messages, markAsRead]);

  return {
    unreadCount,
    hasUnreadMessages,
    markNotificationsAsRead,
  };
};

export const useMessageHistory = () => {
  const { messages, groupMessagesByDate, cleanupOldMessages } = useMessaging();
  
  const messageHistory = useMemo(() => groupMessagesByDate(), [groupMessagesByDate]);
  
  const getRecentMessages = useCallback((limit: number = 10) => {
    return [...messages]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }, [messages]);

  const getMessagesByDateRange = useCallback((startDate: Date, endDate: Date) => {
    return messages.filter(msg => {
      const msgDate = new Date(msg.timestamp);
      return msgDate >= startDate && msgDate <= endDate;
    });
  }, [messages]);

  return {
    messageHistory,
    getRecentMessages,
    getMessagesByDateRange,
    cleanupOldMessages,
  };
};
