import React from 'react';
import { useMessaging } from '@/hooks/useMessaging';
import { useAuth } from '@/contexts/AuthContext';
import Messaging from './Messaging';

const GlobalMessaging: React.FC = () => {
  const { isMessagingOpen, isMessagingMinimized, closeMessaging, toggleMinimizeMessaging } = useMessaging();
  const { isAuthenticated } = useAuth();

  // Only show messaging for authenticated users when messaging is open
  if (!isAuthenticated || !isMessagingOpen) {
    return null;
  }

  return (
    <Messaging
      isMinimized={isMessagingMinimized}
      onToggleMinimize={toggleMinimizeMessaging}
      onClose={closeMessaging}
    />
  );
};

export default GlobalMessaging;
