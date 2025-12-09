// ============================================================================
// NAVIGATION ICONS
// ============================================================================
// Specialized navigation icons with consistent styling and behavior

import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Home,
  Menu,
  X,
} from 'lucide-react';

// Navigation icon components with consistent styling
export const NavigationIcons = {
  // Basic navigation
  back: ArrowLeft,
  forward: ArrowRight,
  up: ArrowUp,
  down: ArrowDown,
  home: Home,
  menu: Menu,
  close: X,
  
  // Sorting and expansion
  sort: ArrowUpDown,
  expand: ChevronDown,
  collapse: ChevronUp,
  next: ChevronRight,
  previous: ChevronLeft,
} as const;

// Navigation icon with consistent styling
export const NavIcon: React.FC<{
  icon: keyof typeof NavigationIcons;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ icon, size = 'md', className = '' }) => {
  const IconComponent = NavigationIcons[icon];
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };
  
  return (
    <IconComponent 
      className={`${sizeClasses[size]} text-gray-600 hover:text-gray-800 transition-colors ${className}`}
    />
  );
};

// Back button component
export const BackButton: React.FC<{
  onClick: () => void;
  className?: string;
  children?: React.ReactNode;
}> = ({ onClick, className = '', children }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors ${className}`}
  >
    <ArrowLeft className="w-4 h-4" />
    {children || 'Zurück'}
  </button>
);

// Sort button component
export const SortButton: React.FC<{
  direction: 'asc' | 'desc' | 'none';
  onClick: () => void;
  className?: string;
}> = ({ direction, onClick, className = '' }) => {
  const getIcon = () => {
    switch (direction) {
      case 'asc':
        return <ArrowUp className="w-4 h-4" />;
      case 'desc':
        return <ArrowDown className="w-4 h-4" />;
      default:
        return <ArrowUpDown className="w-4 h-4" />;
    }
  };
  
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 text-gray-600 hover:text-gray-800 transition-colors ${className}`}
    >
      {getIcon()}
    </button>
  );
};
