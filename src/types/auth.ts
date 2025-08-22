// ============================================================================
// AUTHENTICATION INTERFACES AND TYPES
// ============================================================================

import { BackNavigationProps } from './common';

// Auth Props Interfaces
export interface LandingPageProps {
  // onLoginSuccess removed - navigation is now handled directly in LoginForm
}

export interface LoginFormProps {
  onNavigateToRegister?: () => void;
}

export interface RegisterFormProps extends BackNavigationProps {
  onSuccess?: () => void;
  onShowAGB?: () => void;
  onShowDatenschutz?: () => void;
}
