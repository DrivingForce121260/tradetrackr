import React from 'react';
import { Messaging } from './Messaging';
import { SimpleMessaging } from './SimpleMessaging';

type Props = {
  mode?: 'full' | 'compact';
  isMinimized?: boolean;
  onClose?: () => void;
  onToggleMinimize?: () => void;
};

export const MessagingUnified: React.FC<Props> = ({ mode = 'full', isMinimized, onClose, onToggleMinimize }) => {
  if (mode === 'compact') {
    return <SimpleMessaging isButton={false} />;
  }
  // default to full messaging UI
  return <Messaging isMinimized={Boolean(isMinimized)} onToggleMinimize={onToggleMinimize || (() => {})} onClose={onClose || (() => {})} />;
};







