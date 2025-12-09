// ============================================================================
// OPTIMIZED DATA HOOKS
// ============================================================================
import { useState, useCallback, useMemo, useRef, useEffect } from 'react';

// Pagination hook
export interface PaginationConfig {
  initialPage?: number;
  initialPageSize?: number;
  totalItems?: number;
  pageSizeOptions?: number[];
}

export interface PaginationState {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginationActions {
  goToPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  setPageSize: (size: number) => void;
  goToFirst: () => void;
  goToLast: () => void;
}

export function usePagination(config: PaginationConfig = {}) {
  const {
    initialPage = 1,
    initialPageSize = 10,
    totalItems = 0,
    pageSizeOptions = [5, 10, 20, 50, 100],
  } = config;

  const [currentPage, setCurrentPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const totalPages = Math.ceil(totalItems / pageSize);
  const hasNextPage = currentPage < totalPages;
  const hasPrevPage = currentPage > 1;

  const goToPage = useCallback((page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  }, [totalPages]);

  const nextPage = useCallback(() => {
    if (hasNextPage) {
      setCurrentPage(prev => prev + 1);
    }
  }, [hasNextPage]);

  const prevPage = useCallback(() => {
    if (hasPrevPage) {
      setCurrentPage(prev => prev - 1);
    }
  }, [hasPrevPage]);

  const setPageSizeAndReset = useCallback((size: number) => {
    setPageSize(size);
    setCurrentPage(1); // Reset to first page when changing page size
  }, []);

  const goToFirst = useCallback(() => {
    setCurrentPage(1);
  }, []);

  const goToLast = useCallback(() => {
    setCurrentPage(totalPages);
  }, [totalPages]);

  // Reset to first page when total items change
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  const state: PaginationState = {
    currentPage,
    pageSize,
    totalItems,
    totalPages,
    hasNextPage,
    hasPrevPage,
  };

  const actions: PaginationActions = {
    goToPage,
    nextPage,
    prevPage,
    setPageSize: setPageSizeAndReset,
    goToFirst,
    goToLast,
  };

  return {
    ...state,
    ...actions,
    pageSizeOptions,
  };
}

// Sorting hook
export type SortDirection = 'asc' | 'desc';

export interface SortConfig<T> {
  key: keyof T;
  direction: SortDirection;
}

export interface SortingState<T> {
  sortConfig: SortConfig<T> | null;
}

export interface SortingActions<T> {
  sortBy: (key: keyof T) => void;
  setSortConfig: (config: SortConfig<T>) => void;
  clearSort: () => void;
  toggleSort: (key: keyof T) => void;
}

export function useSorting<T>(initialSort?: SortConfig<T>) {
  const [sortConfig, setSortConfig] = useState<SortConfig<T> | null>(initialSort || null);

  const sortBy = useCallback((key: keyof T) => {
    setSortConfig({ key, direction: 'asc' });
  }, []);

  const setSortConfigDirect = useCallback((config: SortConfig<T>) => {
    setSortConfig(config);
  }, []);

  const clearSort = useCallback(() => {
    setSortConfig(null);
  }, []);

  const toggleSort = useCallback((key: keyof T) => {
    if (sortConfig?.key === key) {
      if (sortConfig.direction === 'asc') {
        setSortConfig({ key, direction: 'desc' });
      } else {
        clearSort();
      }
    } else {
      setSortConfig({ key, direction: 'asc' });
    }
  }, [sortConfig, clearSort]);

  const state: SortingState<T> = {
    sortConfig,
  };

  const actions: SortingActions<T> = {
    sortBy,
    setSortConfig: setSortConfigDirect,
    clearSort,
    toggleSort,
  };

  return {
    ...state,
    ...actions,
  };
}

// Filtering hook
export interface FilterConfig<T> {
  key: keyof T;
  value: any;
  operator: 'equals' | 'contains' | 'startsWith' | 'endsWith' | 'greaterThan' | 'lessThan' | 'in' | 'notIn';
}

export interface FilteringState<T> {
  filters: FilterConfig<T>[];
}

export interface FilteringActions<T> {
  addFilter: (filter: FilterConfig<T>) => void;
  removeFilter: (key: keyof T) => void;
  updateFilter: (key: keyof T, value: any) => void;
  clearFilters: () => void;
  clearFilter: (key: keyof T) => void;
}

export function useFiltering<T>(initialFilters: FilterConfig<T>[] = []) {
  const [filters, setFilters] = useState<FilterConfig<T>[]>(initialFilters);

  const addFilter = useCallback((filter: FilterConfig<T>) => {
    setFilters(prev => {
      const existingIndex = prev.findIndex(f => f.key === filter.key);
      if (existingIndex >= 0) {
        const newFilters = [...prev];
        newFilters[existingIndex] = filter;
        return newFilters;
      }
      return [...prev, filter];
    });
  }, []);

  const removeFilter = useCallback((key: keyof T) => {
    setFilters(prev => prev.filter(f => f.key !== key));
  }, []);

  const updateFilter = useCallback((key: keyof T, value: any) => {
    setFilters(prev => prev.map(f => 
      f.key === key ? { ...f, value } : f
    ));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters([]);
  }, []);

  const clearFilter = useCallback((key: keyof T) => {
    removeFilter(key);
  }, [removeFilter]);

  const state: FilteringState<T> = {
    filters,
  };

  const actions: FilteringActions<T> = {
    addFilter,
    removeFilter,
    updateFilter,
    clearFilters,
    clearFilter,
  };

  return {
    ...state,
    ...actions,
  };
}

// Combined data management hook
export interface DataConfig<T> {
  data: T[];
  pagination?: PaginationConfig;
  initialSort?: SortConfig<T>;
  initialFilters?: FilterConfig<T>[];
}

export function useData<T>(config: DataConfig<T>) {
  const { data, pagination, initialSort, initialFilters } = config;

  const paginationHook = usePagination(pagination);
  const sortingHook = useSorting(initialSort);
  const filteringHook = useFiltering(initialFilters);

  // Apply filters
  const filteredData = useMemo(() => {
    if (filteringHook.filters.length === 0) return data;

    return data.filter(item => {
      return filteringHook.filters.every(filter => {
        const itemValue = item[filter.key];
        const filterValue = filter.value;

        switch (filter.operator) {
          case 'equals':
            return itemValue === filterValue;
          case 'contains':
            return String(itemValue).toLowerCase().includes(String(filterValue).toLowerCase());
          case 'startsWith':
            return String(itemValue).toLowerCase().startsWith(String(filterValue).toLowerCase());
          case 'endsWith':
            return String(itemValue).toLowerCase().endsWith(String(filterValue).toLowerCase());
          case 'greaterThan':
            return Number(itemValue) > Number(filterValue);
          case 'lessThan':
            return Number(itemValue) < Number(filterValue);
          case 'in':
            return Array.isArray(filterValue) && filterValue.includes(itemValue);
          case 'notIn':
            return Array.isArray(filterValue) && !filterValue.includes(itemValue);
          default:
            return true;
        }
      });
    });
  }, [data, filteringHook.filters]);

  // Apply sorting
  const sortedData = useMemo(() => {
    if (!sortingHook.sortConfig) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aValue = a[sortingHook.sortConfig!.key];
      const bValue = b[sortingHook.sortConfig!.key];

      if (aValue < bValue) {
        return sortingHook.sortConfig!.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortingHook.sortConfig!.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [filteredData, sortingHook.sortConfig]);

  // Apply pagination
  const paginatedData = useMemo(() => {
    const startIndex = (paginationHook.currentPage - 1) * paginationHook.pageSize;
    const endIndex = startIndex + paginationHook.pageSize;
    return sortedData.slice(startIndex, endIndex);
  }, [sortedData, paginationHook.currentPage, paginationHook.pageSize]);

  // Update pagination total when filtered data changes
  useEffect(() => {
    paginationHook.goToPage(1);
  }, [filteredData.length]);

  return {
    // Data
    data: paginatedData,
    filteredData,
    sortedData,
    originalData: data,
    
    // Pagination
    ...paginationHook,
    totalItems: filteredData.length,
    
    // Sorting
    ...sortingHook,
    
    // Filtering
    ...filteringHook,
    
    // Utilities
    isEmpty: filteredData.length === 0,
    isFiltered: filteringHook.filters.length > 0,
    isSorted: sortingHook.sortConfig !== null,
  };
}
