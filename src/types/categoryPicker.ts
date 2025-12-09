// ============================================================================
// CATEGORY PICKER TYPES
// ============================================================================
// Shared types for cascading category picker components (Portal & Mobile)

/**
 * Value shape for category picker
 */
export interface CategoryPickerValue {
  categoryId: string | null;
  path: string[];  // Array of category names from root to selected category
}

/**
 * Props shape for cascading category picker
 * Shared between Portal and Mobile implementations
 */
export interface CascadingCategoryPickerProps {
  orgId: string;
  value: CategoryPickerValue;
  onChange: (value: CategoryPickerValue) => void;
  disabled?: boolean;
  allowInactiveSelection?: boolean;  // For admin screens - allow selecting inactive categories
  placeholder?: string;  // Custom placeholder text
  label?: string;  // Label for the picker
  required?: boolean;  // Whether selection is required
  maxDepth?: number;  // Maximum depth to show (default: unlimited)
}







