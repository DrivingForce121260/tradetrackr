import { useState, useEffect, useMemo } from 'react';
import { AutocompleteOption } from '@/components/AutoCompleteInput';

interface UseAutocompleteOptions<T> {
  data: T[];
  getLabel: (item: T) => string;
  getValue: (item: T) => string;
  getDescription?: (item: T) => string;
  getMetadata?: (item: T) => Record<string, any>;
  filterBy?: (item: T, searchTerm: string) => boolean;
  storageKey?: string; // For tracking usage
  maxRecentItems?: number;
}

export function useAutocomplete<T>({
  data,
  getLabel,
  getValue,
  getDescription,
  getMetadata,
  filterBy,
  storageKey,
  maxRecentItems = 10,
}: UseAutocompleteOptions<T>) {
  const [recentItems, setRecentItems] = useState<string[]>([]);

  // Load recent items from localStorage
  useEffect(() => {
    if (storageKey) {
      try {
        const stored = localStorage.getItem(`autocomplete_recent_${storageKey}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          setRecentItems(parsed.slice(0, maxRecentItems));
        }
      } catch (error) {
        console.error('Error loading recent items:', error);
      }
    }
  }, [storageKey, maxRecentItems]);

  // Convert data to AutocompleteOption format
  const options: AutocompleteOption[] = useMemo(() => {
    return data.map((item) => {
      const value = getValue(item);
      const option: AutocompleteOption = {
        id: value,
        label: getLabel(item),
        value: value,
        description: getDescription?.(item),
        metadata: getMetadata?.(item),
      };

      // Add usage tracking data if available
      if (storageKey) {
        try {
          const usageKey = `autocomplete_usage_${value}`;
          const stored = localStorage.getItem(usageKey);
          if (stored) {
            const parsed = JSON.parse(stored);
            option.lastUsed = parsed.lastUsed;
            option.usageCount = parsed.usageCount;
          }
        } catch (error) {
          // Ignore errors
        }
      }

      return option;
    });
  }, [data, getLabel, getValue, getDescription, getMetadata, storageKey]);

  // Track item usage
  const trackUsage = (value: string) => {
    if (!storageKey) return;

    try {
      // Update recent items
      const newRecent = [value, ...recentItems.filter((v) => v !== value)].slice(
        0,
        maxRecentItems
      );
      setRecentItems(newRecent);
      localStorage.setItem(
        `autocomplete_recent_${storageKey}`,
        JSON.stringify(newRecent)
      );

      // Update usage count
      const usageKey = `autocomplete_usage_${value}`;
      const stored = localStorage.getItem(usageKey);
      const usageData = {
        lastUsed: new Date().toISOString(),
        usageCount: stored
          ? (JSON.parse(stored).usageCount || 0) + 1
          : 1,
      };
      localStorage.setItem(usageKey, JSON.stringify(usageData));
    } catch (error) {
      console.error('Error tracking usage:', error);
    }
  };

  // Custom filter function
  const filterFn = filterBy
    ? (option: AutocompleteOption, searchTerm: string) => {
        const item = data.find((d) => getValue(d) === option.value);
        return item ? filterBy(item, searchTerm) : false;
      }
    : undefined;

  return {
    options,
    trackUsage,
    filterFn,
    recentItems,
  };
}







