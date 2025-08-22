// ============================================================================
// OPTIMIZED SEARCH AND FILTER HOOKS
// ============================================================================
// Erweiterte und optimierte Search- und Filter-Hooks

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface FilterConfig<T> {
  key: keyof T;
  label: string;
  type: 'text' | 'select' | 'multiselect' | 'date' | 'dateRange' | 'number' | 'numberRange' | 'boolean';
  options?: Array<{ value: any; label: string }>;
  placeholder?: string;
  defaultValue?: any;
  transform?: (value: any) => any;
  validate?: (value: any) => boolean;
}

export interface FilterState<T> {
  [key: string]: any;
}

export type FilterKey<T> = keyof T;

export interface SearchFilterOptions {
  debounceMs?: number;
  caseSensitive?: boolean;
  fuzzySearch?: boolean;
  searchFields?: string[];
  highlightMatches?: boolean;
}

export interface UseSearchFilterReturn<T> {
  // State
  searchTerm: string;
  filters: FilterState<T>;
  filteredData: T[];
  
  // Actions
  setSearchTerm: (term: string) => void;
  setFilter: (key: string, value: any) => void;
  setFilters: (filters: Partial<FilterState<T>>) => void;
  clearFilters: () => void;
  clearSearch: () => void;
  clearAll: () => void;
  
  // Computed values
  isFiltered: boolean;
  isSearching: boolean;
  totalItems: number;
  filteredCount: number;
  
  // Utilities
  getFilterValue: (key: string) => any;
  hasActiveFilters: boolean;
  getActiveFilters: () => Array<{ key: string; value: any; label: string }>;
}

// ============================================================================
// MAIN SEARCH AND FILTER HOOK
// ============================================================================

export const useSearchFilter = <T extends Record<string, any>>(
  data: T[],
  filterConfigs: FilterConfig<T>[],
  options: SearchFilterOptions = {}
): UseSearchFilterReturn<T> => {
  const {
    debounceMs = 300,
    caseSensitive = false,
    fuzzySearch = false,
    searchFields = [],
    highlightMatches = false,
  } = options;

  const [searchTerm, setSearchTermState] = useState('');
  const [filters, setFiltersState] = useState<FilterState<T>>({});
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  const debounceTimerRef = useRef<NodeJS.Timeout>();

  // Initialize filters with default values
  useEffect(() => {
    const defaultFilters: FilterState<T> = {};
    filterConfigs.forEach(config => {
      if (config.defaultValue !== undefined) {
        defaultFilters[String(config.key)] = config.defaultValue;
      }
    });
    setFiltersState(defaultFilters);
  }, [filterConfigs]);

  // Debounced search term
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchTerm, debounceMs]);

  // Search functionality
  const searchData = useCallback((items: T[], term: string): T[] => {
    if (!term.trim()) return items;

    const searchValue = caseSensitive ? term : term.toLowerCase();
    
    return items.filter(item => {
      const searchableFields = searchFields.length > 0 ? searchFields : Object.keys(item);
      
      return searchableFields.some(field => {
        const fieldValue = String(item[field as keyof T] || '');
        const itemValue = caseSensitive ? fieldValue : fieldValue.toLowerCase();
        
        if (fuzzySearch) {
          return fuzzyMatch(itemValue, searchValue);
        }
        
        return itemValue.includes(searchValue);
      });
    });
  }, [caseSensitive, fuzzySearch, searchFields]);

  // Filter functionality
  const filterData = useCallback((items: T[], currentFilters: FilterState<T>): T[] => {
    return items.filter(item => {
      return Object.entries(currentFilters).every(([key, filterValue]) => {
        if (filterValue === undefined || filterValue === null || filterValue === '') {
          return true;
        }

        const itemValue = item[key as keyof T];
        const config = filterConfigs.find(c => c.key === key);
        
        if (config?.transform) {
          return config.transform(itemValue) === filterValue;
        }
        
        if (config?.validate && !config.validate(filterValue)) {
          return true;
        }

        return itemValue === filterValue;
      });
    });
  }, [filterConfigs]);

  // Combined search and filter
  const filteredData = useMemo(() => {
    let result = data;
    
    // Apply search
    if (debouncedSearchTerm.trim()) {
      result = searchData(result, debouncedSearchTerm);
    }
    
    // Apply filters
    if (Object.keys(filters).length > 0) {
      result = filterData(result, filters);
    }
    
    return result;
  }, [data, debouncedSearchTerm, filters, searchData, filterData]);

  // Actions
  const setSearchTerm = useCallback((term: string) => {
    setSearchTermState(term);
  }, []);

  const setFilter = useCallback((key: string, value: any) => {
    setFiltersState(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  const setFilters = useCallback((newFilters: Partial<FilterState<T>>) => {
    setFiltersState(prev => ({
      ...prev,
      ...newFilters
    }));
  }, []);

  const clearFilters = useCallback(() => {
    setFiltersState({});
  }, []);

  const clearSearch = useCallback(() => {
    setSearchTermState('');
  }, []);

  const clearAll = useCallback(() => {
    setSearchTermState('');
    setFiltersState({});
  }, []);

  // Computed values
  const isFiltered = useMemo(() => {
    return searchTerm.trim() !== '' || Object.keys(filters).length > 0;
  }, [searchTerm, filters]);

  const isSearching = useMemo(() => {
    return searchTerm !== debouncedSearchTerm;
  }, [searchTerm, debouncedSearchTerm]);

  const totalItems = useMemo(() => data.length, [data]);
  const filteredCount = useMemo(() => filteredData.length, [filteredData]);

  // Utilities
  const getFilterValue = useCallback((key: string) => {
    return filters[key];
  }, [filters]);

  const hasActiveFilters = useMemo(() => {
    return Object.values(filters).some(value => 
      value !== undefined && value !== null && value !== ''
    );
  }, [filters]);

  const getActiveFilters = useCallback(() => {
    return Object.entries(filters)
      .filter(([_, value]) => value !== undefined && value !== null && value !== '')
      .map(([key, value]) => ({
        key: key,
        value,
        label: filterConfigs.find(c => c.key === key)?.label || key
      }));
  }, [filters, filterConfigs]);

  return {
    searchTerm,
    filters,
    filteredData,
    setSearchTerm,
    setFilter,
    setFilters,
    clearFilters,
    clearSearch,
    clearAll,
    isFiltered,
    isSearching,
    totalItems,
    filteredCount,
    getFilterValue,
    hasActiveFilters,
    getActiveFilters,
  };
};

// ============================================================================
// SPECIALIZED HOOKS
// ============================================================================

export const useTextSearch = <T extends Record<string, any>>(
  data: T[],
  searchFields: (keyof T)[],
  options: { caseSensitive?: boolean; fuzzySearch?: boolean } = {}
) => {
  const { caseSensitive = false, fuzzySearch = false } = options;
  
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedTerm, setDebouncedTerm] = useState('');
  
  const debounceTimerRef = useRef<NodeJS.Timeout>();
  
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedTerm(searchTerm);
    }, 300);
    
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchTerm]);
  
  const filteredData = useMemo(() => {
    if (!debouncedTerm.trim()) return data;
    
    const searchValue = caseSensitive ? debouncedTerm : debouncedTerm.toLowerCase();
    
    return data.filter(item => {
      return searchFields.some(field => {
        const fieldValue = String(item[field] || '');
        const itemValue = caseSensitive ? fieldValue : fieldValue.toLowerCase();
        
        if (fuzzySearch) {
          return fuzzyMatch(itemValue, searchValue);
        }
        
        return itemValue.includes(searchValue);
      });
    });
  }, [data, debouncedTerm, searchFields, caseSensitive, fuzzySearch]);
  
  return {
    searchTerm,
    setSearchTerm,
    filteredData,
    isSearching: searchTerm !== debouncedTerm,
  };
};

export const useAdvancedFilter = <T extends Record<string, any>>(
  data: T[],
  filterRules: Array<{
    field: keyof T;
    operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'contains' | 'startsWith' | 'endsWith';
    value: any;
    logic?: 'AND' | 'OR';
  }>
) => {
  const filteredData = useMemo(() => {
    if (filterRules.length === 0) return data;
    
    return data.filter(item => {
      return filterRules.every(rule => {
        const itemValue = item[rule.field];
        return evaluateFilterRule(itemValue, rule);
      });
    });
  }, [data, filterRules]);
  
  return {
    filteredData,
    filterRules,
    totalItems: data.length,
    filteredCount: filteredData.length,
  };
};

export const useDateRangeFilter = <T extends Record<string, any>>(
  data: T[],
  dateField: keyof T
) => {
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  
  const filteredData = useMemo(() => {
    if (!startDate && !endDate) return data;
    
    return data.filter(item => {
      const itemDate = new Date(item[dateField]);
      
      if (startDate && endDate) {
        return itemDate >= startDate && itemDate <= endDate;
      } else if (startDate) {
        return itemDate >= startDate;
      } else if (endDate) {
        return itemDate <= endDate;
      }
      
      return true;
    });
  }, [data, dateField, startDate, endDate]);
  
  return {
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    filteredData,
    clearDates: () => {
      setStartDate(null);
      setEndDate(null);
    },
  };
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function fuzzyMatch(text: string, pattern: string): boolean {
  const textLower = text.toLowerCase();
  const patternLower = pattern.toLowerCase();
  
  let patternIndex = 0;
  for (let i = 0; i < textLower.length && patternIndex < patternLower.length; i++) {
    if (textLower[i] === patternLower[patternIndex]) {
      patternIndex++;
    }
  }
  
  return patternIndex === patternLower.length;
}

function evaluateFilterRule(itemValue: any, rule: {
  operator: string;
  value: any;
}): boolean {
  switch (rule.operator) {
    case 'eq':
      return itemValue === rule.value;
    case 'ne':
      return itemValue !== rule.value;
    case 'gt':
      return itemValue > rule.value;
    case 'gte':
      return itemValue >= rule.value;
    case 'lt':
      return itemValue < rule.value;
    case 'lte':
      return itemValue <= rule.value;
    case 'in':
      return Array.isArray(rule.value) && rule.value.includes(itemValue);
    case 'nin':
      return Array.isArray(rule.value) && !rule.value.includes(itemValue);
    case 'contains':
      return String(itemValue).includes(String(rule.value));
    case 'startsWith':
      return String(itemValue).startsWith(String(rule.value));
    case 'endsWith':
      return String(itemValue).endsWith(String(rule.value));
    default:
      return true;
  }
}
