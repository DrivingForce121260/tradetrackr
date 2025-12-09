// ============================================================================
// ACTION ICONS
// ============================================================================
// Specialized action icons with consistent styling and behavior

import {
  Plus,
  Edit,
  Trash2,
  Save,
  Search,
  Filter,
  Download,
  Upload,
  Eye,
  EyeOff,
  X,
  CheckCircle,
  XCircle,
  AlertCircle,
  AlertTriangle,
  Info,
  MoreVertical,
  Settings,
} from 'lucide-react';

// Action icon components with consistent styling
export const ActionIcons = {
  // CRUD operations
  add: Plus,
  edit: Edit,
  delete: Trash2,
  save: Save,
  
  // Search and filter
  search: Search,
  filter: Filter,
  
  // File operations
  download: Download,
  upload: Upload,
  
  // Visibility
  view: Eye,
  hide: EyeOff,
  
  // Status
  close: X,
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
  
  // Other
  more: MoreVertical,
  settings: Settings,
} as const;

// Action button component
export const ActionButton: React.FC<{
  icon: keyof typeof ActionIcons;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
}> = ({ 
  icon, 
  onClick, 
  variant = 'secondary', 
  size = 'md', 
  disabled = false,
  className = '',
  children 
}) => {
  const IconComponent = ActionIcons[icon];
  
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    success: 'bg-green-600 text-white hover:bg-green-700',
  };
  
  const sizeClasses = {
    sm: 'px-2 py-1 text-sm',
    md: 'px-3 py-2 text-base',
    lg: 'px-4 py-2 text-lg',
  };
  
  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        flex items-center gap-2 rounded-md font-medium transition-colors
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
    >
      <IconComponent className={iconSizes[size]} />
      {children}
    </button>
  );
};

// Icon-only action button
export const IconButton: React.FC<{
  icon: keyof typeof ActionIcons;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
  title?: string;
}> = ({ 
  icon, 
  onClick, 
  variant = 'secondary', 
  size = 'md', 
  disabled = false,
  className = '',
  title
}) => {
  const IconComponent = ActionIcons[icon];
  
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    success: 'bg-green-600 text-white hover:bg-green-700',
  };
  
  const sizeClasses = {
    sm: 'p-1',
    md: 'p-2',
    lg: 'p-3',
  };
  
  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`
        rounded-md transition-colors
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
    >
      <IconComponent className={iconSizes[size]} />
    </button>
  );
};

// Status icon component
export const StatusIcon: React.FC<{
  status: 'success' | 'error' | 'warning' | 'info';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ status, size = 'md', className = '' }) => {
  const statusIcons = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertTriangle,
    info: Info,
  };
  
  const statusColors = {
    success: 'text-green-600',
    error: 'text-red-600',
    warning: 'text-yellow-600',
    info: 'text-blue-600',
  };
  
  const IconComponent = statusIcons[status];
  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };
  
  return (
    <IconComponent 
      className={`${iconSizes[size]} ${statusColors[status]} ${className}`}
    />
  );
};
