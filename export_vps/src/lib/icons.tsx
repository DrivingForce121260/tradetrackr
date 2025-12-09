import React from 'react';
import { useState, useCallback } from 'react';

// ============================================================================
// ICON UTILITY FUNCTIONS FOR TRADRTRACKR PROJECT
// ============================================================================
// Centralized icon utilities and helper functions

// ============================================================================
// ICON UTILITY FUNCTIONS
// ============================================================================

// Icon size constants for consistent sizing across the application
export const ICON_SIZES = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
  '2xl': 48,
} as const;

export type IconSize = keyof typeof ICON_SIZES;

// Icon color variants for consistent theming
export const ICON_COLORS = {
  primary: 'text-blue-600',
  secondary: 'text-gray-600',
  success: 'text-green-600',
  warning: 'text-yellow-600',
  danger: 'text-red-600',
  info: 'text-blue-500',
  muted: 'text-gray-400',
  white: 'text-white',
} as const;

export type IconColor = keyof typeof ICON_COLORS;

// Icon wrapper component props for consistent styling
export interface IconWrapperProps {
  size?: IconSize;
  color?: IconColor;
  className?: string;
  children: React.ReactNode;
}

// Icon wrapper component for consistent styling
export const IconWrapper: React.FC<IconWrapperProps> = ({
  size = 'md',
  color = 'secondary',
  className = '',
  children,
}) => {
  const sizeClass = `w-${ICON_SIZES[size] / 4} h-${ICON_SIZES[size] / 4}`;
  const colorClass = ICON_COLORS[color];
  
  return (
    <div className={`${sizeClass} ${colorClass} ${className}`}>
      {children}
    </div>
  );
};

// ============================================================================
// ICON HELPER FUNCTIONS
// ============================================================================

// Get icon size class
export const getIconSizeClass = (size: IconSize): string => {
  return `w-${ICON_SIZES[size] / 4} h-${ICON_SIZES[size] / 4}`;
};

// Get icon color class
export const getIconColorClass = (color: IconColor): string => {
  return ICON_COLORS[color];
};

// Combine icon classes
export const getIconClasses = (size: IconSize, color: IconColor, additionalClasses?: string): string => {
  const sizeClass = getIconSizeClass(size);
  const colorClass = getIconColorClass(color);
  const classes = [sizeClass, colorClass];
  
  if (additionalClasses) {
    classes.push(additionalClasses);
  }
  
  return classes.join(' ');
};

// ============================================================================
// ICON UTILITY HOOKS
// ============================================================================

// Hook for managing icon states (hover, active, etc.)
export const useIconState = (initialState: 'default' | 'hover' | 'active' = 'default') => {
  const [state, setState] = useState(initialState);
  
  const handleMouseEnter = useCallback(() => setState('hover'), []);
  const handleMouseLeave = useCallback(() => setState('default'), []);
  const handleMouseDown = useCallback(() => setState('active'), []);
  const handleMouseUp = useCallback(() => setState('hover'), []);
  
  return {
    state,
    handlers: {
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
      onMouseDown: handleMouseDown,
      onMouseUp: handleMouseUp,
    },
  };
};

// Hook for icon animations
export const useIconAnimation = (duration: number = 200) => {
  const [isAnimating, setIsAnimating] = useState(false);
  
  const animate = useCallback(() => {
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), duration);
  }, [duration]);
  
  return { isAnimating, animate };
};
