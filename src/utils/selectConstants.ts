/**
 * Select Constants
 * 
 * Constants for Radix Select component handling.
 * Radix SelectItem cannot have an empty string value.
 * Use SELECT_NONE as sentinel for "no selection" option.
 */

/**
 * Sentinel value for "no selection" / "clear selection" option.
 * Use this instead of empty string "" in SelectItem value prop.
 */
export const SELECT_NONE = '__none__';

/**
 * Check if a select value represents "no selection"
 */
export function isNoneValue(value: string | undefined | null): boolean {
  return !value || value === SELECT_NONE;
}

/**
 * Convert a field value to Select component value
 * (undefined/null becomes empty string for placeholder display)
 */
export function toSelectValue(value: string | undefined | null): string {
  return value ?? '';
}



