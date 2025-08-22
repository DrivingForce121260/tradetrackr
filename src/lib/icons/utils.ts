// ============================================================================
// ICON UTILITY FUNCTIONS
// ============================================================================
// Additional utility functions for icon management and optimization

import { ICON_SIZES, ICON_COLORS, type IconSize, type IconColor } from './index';

// ============================================================================
// ICON SIZE UTILITIES
// ============================================================================

/**
 * Get the CSS classes for a specific icon size
 */
export const getIconSizeClasses = (size: IconSize): string => {
  return ICON_SIZES[size];
};

/**
 * Get the numeric size value from an icon size
 */
export const getIconSizeValue = (size: IconSize): number => {
  const sizeMap = {
    xs: 12,
    sm: 16,
    md: 20,
    lg: 24,
    xl: 32,
    '2xl': 40,
  };
  return sizeMap[size];
};

/**
 * Scale an icon size by a factor
 */
export const scaleIconSize = (size: IconSize, factor: number): IconSize => {
  const sizes: IconSize[] = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'];
  const currentIndex = sizes.indexOf(size);
  const newIndex = Math.max(0, Math.min(sizes.length - 1, currentIndex + factor));
  return sizes[newIndex];
};

// ============================================================================
// ICON COLOR UTILITIES
// ============================================================================

/**
 * Get the CSS classes for a specific icon color
 */
export const getIconColorClasses = (color: IconColor): string => {
  return ICON_COLORS[color];
};

/**
 * Get a color variant based on the current theme
 */
export const getIconColorVariant = (
  baseColor: IconColor,
  variant: 'light' | 'dark' | 'hover' | 'active' = 'light'
): IconColor => {
  const colorVariants: Record<IconColor, Record<string, IconColor>> = {
    primary: {
      light: 'info',
      dark: 'primary',
      hover: 'primary',
      active: 'primary',
    },
    secondary: {
      light: 'muted',
      dark: 'secondary',
      hover: 'secondary',
      active: 'primary',
    },
    success: {
      light: 'success',
      dark: 'success',
      hover: 'success',
      active: 'success',
    },
    warning: {
      light: 'warning',
      dark: 'warning',
      hover: 'warning',
      active: 'warning',
    },
    danger: {
      light: 'danger',
      dark: 'danger',
      hover: 'danger',
      active: 'danger',
    },
    info: {
      light: 'info',
      dark: 'info',
      hover: 'primary',
      active: 'primary',
    },
    muted: {
      light: 'muted',
      dark: 'secondary',
      hover: 'secondary',
      active: 'primary',
    },
    white: {
      light: 'white',
      dark: 'white',
      hover: 'white',
      active: 'white',
    },
    black: {
      light: 'black',
      dark: 'black',
      hover: 'black',
      active: 'black',
    },
  };

  return colorVariants[baseColor]?.[variant] || baseColor;
};

// ============================================================================
// ICON ANIMATION UTILITIES
// ============================================================================

/**
 * Get CSS classes for icon animations
 */
export const getIconAnimationClasses = (
  animation: 'spin' | 'pulse' | 'bounce' | 'ping' | 'none' = 'none'
): string => {
  const animationClasses = {
    spin: 'animate-spin',
    pulse: 'animate-pulse',
    bounce: 'animate-bounce',
    ping: 'animate-ping',
    none: '',
  };
  return animationClasses[animation];
};

/**
 * Get CSS classes for icon transitions
 */
export const getIconTransitionClasses = (
  duration: 'fast' | 'normal' | 'slow' = 'normal',
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' = 'ease-in-out'
): string => {
  const durationClasses = {
    fast: 'duration-150',
    normal: 'duration-200',
    slow: 'duration-300',
  };

  const easingClasses = {
    linear: 'ease-linear',
    'ease-in': 'ease-in',
    'ease-out': 'ease-out',
    'ease-in-out': 'ease-in-out',
  };

  return `transition-all ${durationClasses[duration]} ${easingClasses[easing]}`;
};

// ============================================================================
// ICON ACCESSIBILITY UTILITIES
// ============================================================================

/**
 * Generate accessible label for icon buttons
 */
export const getIconAccessibilityLabel = (
  iconName: string,
  action?: string
): string => {
  if (action) {
    return `${action} ${iconName}`;
  }
  return iconName;
};

/**
 * Get ARIA attributes for icon buttons
 */
export const getIconAriaAttributes = (
  iconName: string,
  action?: string,
  pressed?: boolean
) => {
  const baseAttributes = {
    'aria-label': getIconAccessibilityLabel(iconName, action),
    role: 'button',
    tabIndex: 0,
  };

  if (pressed !== undefined) {
    return {
      ...baseAttributes,
      'aria-pressed': pressed,
    };
  }

  return baseAttributes;
};

// ============================================================================
// ICON VALIDATION UTILITIES
// ============================================================================

/**
 * Validate if a string is a valid icon size
 */
export const isValidIconSize = (size: string): size is IconSize => {
  return Object.keys(ICON_SIZES).includes(size);
};

/**
 * Validate if a string is a valid icon color
 */
export const isValidIconColor = (color: string): color is IconColor => {
  return Object.keys(ICON_COLORS).includes(color);
};

/**
 * Get fallback values for invalid icon properties
 */
export const getIconFallback = {
  size: (size: string): IconSize => {
    return isValidIconSize(size) ? (size as IconSize) : 'md';
  },
  color: (color: string): IconColor => {
    return isValidIconColor(color) ? (color as IconColor) : 'secondary';
  },
};

// ============================================================================
// ICON PERFORMANCE UTILITIES
// ============================================================================

/**
 * Debounce icon updates to prevent excessive re-renders
 */
export const debounceIconUpdate = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

/**
 * Memoize icon component to prevent unnecessary re-renders
 */
export const memoizeIcon = <T extends React.ComponentType<any>>(
  IconComponent: T,
  deps: React.DependencyList = []
): T => {
  return React.memo(IconComponent) as T;
};

// ============================================================================
// ICON THEME UTILITIES
// ============================================================================

/**
 * Get icon color based on current theme
 */
export const getThemedIconColor = (
  color: IconColor,
  isDarkMode: boolean = false
): IconColor => {
  if (!isDarkMode) return color;

  const darkModeColors: Partial<Record<IconColor, IconColor>> = {
    primary: 'info',
    secondary: 'muted',
    muted: 'secondary',
  };

  return darkModeColors[color] || color;
};

/**
 * Get icon size based on screen size
 */
export const getResponsiveIconSize = (
  baseSize: IconSize,
  breakpoint: 'sm' | 'md' | 'lg' | 'xl' = 'md'
): IconSize => {
  const responsiveSizes: Record<string, Partial<Record<IconSize, IconSize>>> = {
    sm: { xs: 'xs', sm: 'xs', md: 'sm', lg: 'md', xl: 'lg', '2xl': 'xl' },
    md: { xs: 'sm', sm: 'sm', md: 'md', lg: 'lg', xl: 'xl', '2xl': '2xl' },
    lg: { xs: 'sm', sm: 'md', md: 'lg', lg: 'xl', xl: '2xl', '2xl': '2xl' },
    xl: { xs: 'md', sm: 'lg', md: 'xl', lg: '2xl', xl: '2xl', '2xl': '2xl' },
  };

  return responsiveSizes[breakpoint]?.[baseSize] || baseSize;
};

// ============================================================================
// EXPORT ALL UTILITIES
// ============================================================================

export {
  getIconSizeClasses,
  getIconSizeValue,
  scaleIconSize,
  getIconColorClasses,
  getIconColorVariant,
  getIconAnimationClasses,
  getIconTransitionClasses,
  getIconAccessibilityLabel,
  getIconAriaAttributes,
  isValidIconSize,
  isValidIconColor,
  getIconFallback,
  debounceIconUpdate,
  memoizeIcon,
  getThemedIconColor,
  getResponsiveIconSize,
};
