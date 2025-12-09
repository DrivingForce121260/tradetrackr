// ============================================================================
// ICON UTILITIES INDEX - OPTIMIZED
// ============================================================================
// Central export hub for all icon utilities and components with optimized performance

// Main icon utilities
export * from '../icons';

// Specialized icon modules
export * from './navigation';
export * from './actions';
export * from './business';

// Icon utility functions
export * from './utils';

// ============================================================================
// CENTRAL ICON CONFIGURATION
// ============================================================================

// Common icon sizes with consistent scaling
export const ICON_SIZES = {
  xs: 'w-3 h-3',
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
  xl: 'w-8 h-8',
  '2xl': 'w-10 h-10',
} as const;

// Common icon colors for consistent theming
export const ICON_COLORS = {
  primary: 'text-blue-600',
  secondary: 'text-gray-600',
  success: 'text-green-600',
  warning: 'text-yellow-600',
  danger: 'text-red-600',
  info: 'text-blue-500',
  muted: 'text-gray-400',
  white: 'text-white',
  black: 'text-black',
} as const;

// Common button variants
export const BUTTON_VARIANTS = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
  secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-500',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
  success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500',
  outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-500',
  ghost: 'text-gray-600 hover:bg-gray-100 focus:ring-gray-500',
} as const;

// Common button sizes
export const BUTTON_SIZES = {
  xs: 'px-2 py-1 text-xs',
  sm: 'px-2 py-1 text-sm',
  md: 'px-3 py-2 text-base',
  lg: 'px-4 py-2 text-lg',
  xl: 'px-6 py-3 text-xl',
} as const;

// ============================================================================
// OPTIMIZED ICON COMPONENTS
// ============================================================================

import React, { memo } from 'react';
import {
  // Navigation
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  
  // Actions
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
  
  // Business
  Calendar,
  Clock,
  MapPin,
  DollarSign,
  Package,
  FileText,
  File,
  Image,
  CheckSquare,
  BarChart3,
  TrendingUp,
  Database,
  Scale,
  Building,
  User,
  Users,
  Truck,
  Box,
  Hash,
  Settings,
  Globe,
  Phone,
  Mail,
  MessageCircle,
  Shield,
  Wrench,
  
  // User & Auth
  UserCheck,
  UserPlus,
  LogIn,
  LogOut,
  
  // Communication
  Send,
  Video,
  MoreVertical,
  Paperclip,
  Smile,
  Minimize2,
  Maximize2,
  
  // Other
  Play,
  Table,
} from 'lucide-react';

// Type definitions for better TypeScript support
export type IconSize = keyof typeof ICON_SIZES;
export type IconColor = keyof typeof ICON_COLORS;
export type ButtonVariant = keyof typeof BUTTON_VARIANTS;
export type ButtonSize = keyof typeof BUTTON_SIZES;

// Base icon component with memoization for performance
export const BaseIcon = memo<{
  icon: React.ComponentType<{ className?: string }>;
  size?: IconSize;
  color?: IconColor;
  className?: string;
}>(({ icon: Icon, size = 'md', color = 'secondary', className = '' }) => (
  <Icon 
    className={`${ICON_SIZES[size]} ${ICON_COLORS[color]} ${className}`}
  />
));

BaseIcon.displayName = 'BaseIcon';

// Optimized icon button component
export const IconButton = memo<{
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconSize?: IconSize;
  disabled?: boolean;
  className?: string;
  title?: string;
  children?: React.ReactNode;
}>(({ 
  icon: Icon, 
  onClick, 
  variant = 'secondary', 
  size = 'md', 
  iconSize = 'md',
  disabled = false,
  className = '',
  title,
  children 
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={`
      flex items-center gap-2 rounded-md font-medium transition-all duration-200
      focus:outline-none focus:ring-2 focus:ring-offset-2
      ${BUTTON_VARIANTS[variant]}
      ${BUTTON_SIZES[size]}
      ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-105'}
      ${className}
    `}
  >
    <Icon className={ICON_SIZES[iconSize]} />
    {children}
  </button>
));

IconButton.displayName = 'IconButton';

// Status icon component with predefined statuses
export const StatusIcon = memo<{
  status: 'success' | 'error' | 'warning' | 'info' | 'pending' | 'completed';
  size?: IconSize;
  showLabel?: boolean;
  className?: string;
}>(({ status, size = 'md', showLabel = false, className = '' }) => {
  const statusConfig = {
    success: { icon: CheckCircle, color: 'success', label: 'Erfolgreich' },
    error: { icon: XCircle, color: 'danger', label: 'Fehler' },
    warning: { icon: AlertTriangle, color: 'warning', label: 'Warnung' },
    info: { icon: Info, color: 'info', label: 'Information' },
    pending: { icon: Clock, color: 'warning', label: 'Ausstehend' },
    completed: { icon: CheckSquare, color: 'success', label: 'Abgeschlossen' },
  };
  
  const config = statusConfig[status];
  const IconComponent = config.icon;
  
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <IconComponent className={`${ICON_SIZES[size]} ${ICON_COLORS[config.color]}`} />
      {showLabel && (
        <span className="text-sm font-medium text-gray-700">{config.label}</span>
      )}
    </div>
  );
});

StatusIcon.displayName = 'StatusIcon';

// Quick access to commonly used icons
export const CommonIcons = {
  // Navigation
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  
  // Actions
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
  
  // Business
  Calendar,
  Clock,
  MapPin,
  DollarSign,
  Package,
  FileText,
  File,
  Image,
  CheckSquare,
  BarChart3,
  TrendingUp,
  Database,
  Scale,
  Building,
  User,
  Users,
  Truck,
  Box,
  Hash,
  Settings,
  Globe,
  Phone,
  Mail,
  MessageCircle,
  Shield,
  Wrench,
  
  // User & Auth
  UserCheck,
  UserPlus,
  LogIn,
  LogOut,
  
  // Communication
  Send,
  Video,
  MoreVertical,
  Paperclip,
  Smile,
  Minimize2,
  Maximize2,
  
  // Other
  Play,
  Table,
} as const;

// Utility function to create icon with consistent styling
export const createIcon = (
  icon: React.ComponentType<{ className?: string }>,
  size: IconSize = 'md',
  color: IconColor = 'secondary'
) => {
  return React.memo<{ className?: string }>(({ className = '' }) => (
    <BaseIcon 
      icon={icon} 
      size={size} 
      color={color} 
      className={className} 
    />
  ));
};

// Export all individual icons for backward compatibility
export {
  // Navigation
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  
  // Actions
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
  
  // Business
  Calendar,
  Clock,
  MapPin,
  DollarSign,
  Package,
  FileText,
  File,
  Image,
  CheckSquare,
  BarChart3,
  TrendingUp,
  Database,
  Scale,
  Building,
  User,
  Users,
  Truck,
  Box,
  Hash,
  Settings,
  Globe,
  Phone,
  Mail,
  MessageCircle,
  Shield,
  Wrench,
  
  // User & Auth
  UserCheck,
  UserPlus,
  LogIn,
  LogOut,
  
  // Communication
  Send,
  Video,
  MoreVertical,
  Paperclip,
  Smile,
  Minimize2,
  Maximize2,
  
  // Other
  Play,
  Table,
} from 'lucide-react';
