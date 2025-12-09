import React, { createContext, useContext } from 'react';

// Create context for quick actions
interface QuickActionContextType {
  isQuickAction: boolean;
  quickActionType: string | null;
}

const QuickActionContext = createContext<QuickActionContextType>({
  isQuickAction: false,
  quickActionType: null
});

export const useQuickAction = () => useContext(QuickActionContext);
export { QuickActionContext };

