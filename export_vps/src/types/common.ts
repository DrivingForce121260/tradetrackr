// ============================================================================
// COMMON INTERFACES AND TYPES
// ============================================================================

// ============================================================================
// NAVIGATION PROPS INTERFACES
// ============================================================================

// Basic navigation - only back functionality
export interface BackNavigationProps {
  onBack: () => void;
}

// Full navigation - back + forward navigation
export interface NavigationProps {
  onBack: () => void;
  onNavigate?: (page: string) => void;
  onOpenMessaging?: () => void;
}

// ============================================================================
// COMPONENT PROPS INTERFACES
// ============================================================================

// Management components that only need back navigation
export interface ManagementProps extends BackNavigationProps {
  onOpenMessaging?: () => void;
}

// Management components that need both back and forward navigation
export interface ManagementWithNavigationProps extends NavigationProps {
  onOpenMessaging?: () => void;
}

// Dashboard components that need navigation to other pages
export interface DashboardProps {
  onNavigate: (page: string) => void;
  onOpenMessaging?: () => void;
}

// ============================================================================
// FLEXIBLE DASHBOARD INTERFACES
// ============================================================================

// Statistic card configuration
export interface StatCard {
  id: string;
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: 'blue' | 'green' | 'orange' | 'red' | 'purple' | 'gray';
  trend?: {
    value: string;
    isPositive: boolean;
  };
}

// Action button configuration
export interface ActionButton {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  variant?: 'default' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  permission?: string;
}

// Dashboard section configuration
export interface DashboardSection {
  id: string;
  title: string;
  type: 'stats' | 'actions' | 'table' | 'cards' | 'chart' | 'custom';
  config: any;
  permission?: string;
}

// Flexible dashboard configuration
export interface FlexibleDashboardConfig {
  title: string;
  subtitle?: string;
  showHeader?: boolean;
  sections: DashboardSection[];
  layout?: 'grid' | 'stack' | 'sidebar';
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '7xl';
}

// Flexible dashboard props
export interface FlexibleDashboardProps extends BackNavigationProps {
  config: FlexibleDashboardConfig;
  onNavigate?: (page: string) => void;
  user?: any;
  hasPermission?: (permission: string) => boolean;
}

// ============================================================================
// FORM AND LIST INTERFACES
// ============================================================================

// Form components with submit functionality
export interface FormProps<T = any> {
  onSubmit: (data: T) => void;
  initialData?: T | null;
}

// List components with data and actions
export interface ListProps<T = any> {
  data: T[];
  onEdit?: (item: T) => void;
  onDelete?: (id: string) => void;
  onView?: (item: T) => void;
}

// CRUD operations interface
export interface CrudProps<T = any> extends BackNavigationProps {
  onEdit?: (item: T) => void;
  onDelete?: (id: string) => void;
  onView?: (item: T) => void;
  onNavigate?: (page: string) => void;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';
export type SortDirection = 'asc' | 'desc';
export type FilterStatus = 'all' | string;

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
