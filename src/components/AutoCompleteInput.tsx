import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Clock, TrendingUp, User, Building2, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AutocompleteOption {
  id: string;
  label: string;
  value: string;
  description?: string;
  metadata?: Record<string, any>;
  lastUsed?: Date | string;
  usageCount?: number;
}

interface AutoCompleteInputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onSelect?: (option: AutocompleteOption) => void;
  options: AutocompleteOption[];
  filterFn?: (option: AutocompleteOption, searchTerm: string) => boolean;
  getSuggestions?: (searchTerm: string, options: AutocompleteOption[]) => AutocompleteOption[];
  maxSuggestions?: number;
  showRecentFirst?: boolean;
  showUsageCount?: boolean;
  className?: string;
  inputClassName?: string;
  disabled?: boolean;
  required?: boolean;
  icon?: React.ReactNode;
  emptyMessage?: string;
}

const AutoCompleteInput: React.FC<AutoCompleteInputProps> = ({
  label,
  placeholder,
  value,
  onChange,
  onSelect,
  options = [],
  filterFn,
  getSuggestions,
  maxSuggestions = 5,
  showRecentFirst = true,
  showUsageCount = false,
  className,
  inputClassName,
  disabled = false,
  required = false,
  icon,
  emptyMessage = 'Keine Vorschläge gefunden',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Update search term when value changes externally
  useEffect(() => {
    setSearchTerm(value);
  }, [value]);

  // Filter and sort suggestions
  const getFilteredSuggestions = useCallback((): AutocompleteOption[] => {
    if (!searchTerm.trim()) {
      // Show recent items when no search term
      if (showRecentFirst) {
        return options
          .filter(opt => opt.lastUsed)
          .sort((a, b) => {
            const aDate = a.lastUsed ? new Date(a.lastUsed).getTime() : 0;
            const bDate = b.lastUsed ? new Date(b.lastUsed).getTime() : 0;
            return bDate - aDate;
          })
          .slice(0, maxSuggestions);
      }
      return options.slice(0, maxSuggestions);
    }

    let filtered: AutocompleteOption[];

    if (getSuggestions) {
      filtered = getSuggestions(searchTerm, options);
    } else if (filterFn) {
      filtered = options.filter(opt => filterFn(opt, searchTerm));
    } else {
      // Default: case-insensitive partial match
      const lowerSearch = searchTerm.toLowerCase();
      filtered = options.filter(opt =>
        opt.label.toLowerCase().includes(lowerSearch) ||
        opt.value.toLowerCase().includes(lowerSearch) ||
        opt.description?.toLowerCase().includes(lowerSearch)
      );
    }

    // Sort by relevance and usage
    filtered.sort((a, b) => {
      // Exact match first
      const aExact = a.label.toLowerCase() === searchTerm.toLowerCase() || 
                     a.value.toLowerCase() === searchTerm.toLowerCase();
      const bExact = b.label.toLowerCase() === searchTerm.toLowerCase() || 
                     b.value.toLowerCase() === searchTerm.toLowerCase();
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;

      // Starts with search term
      const aStarts = a.label.toLowerCase().startsWith(searchTerm.toLowerCase()) ||
                      a.value.toLowerCase().startsWith(searchTerm.toLowerCase());
      const bStarts = b.label.toLowerCase().startsWith(searchTerm.toLowerCase()) ||
                      b.value.toLowerCase().startsWith(searchTerm.toLowerCase());
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;

      // Usage count (if available)
      if (showUsageCount && a.usageCount && b.usageCount) {
        return b.usageCount - a.usageCount;
      }

      // Recent usage
      if (showRecentFirst && a.lastUsed && b.lastUsed) {
        const aDate = new Date(a.lastUsed).getTime();
        const bDate = new Date(b.lastUsed).getTime();
        return bDate - aDate;
      }

      return 0;
    });

    return filtered.slice(0, maxSuggestions);
  }, [searchTerm, options, filterFn, getSuggestions, maxSuggestions, showRecentFirst, showUsageCount]);

  const suggestions = getFilteredSuggestions();

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    onChange(newValue);
    setIsOpen(true);
    setHighlightedIndex(-1);
  };

  // Handle option selection
  const handleSelect = (option: AutocompleteOption) => {
    setSearchTerm(option.label);
    onChange(option.value);
    setIsOpen(false);
    setHighlightedIndex(-1);
    
    if (onSelect) {
      onSelect(option);
    }

    // Track usage
    trackUsage(option.id);
  };

  // Track option usage for future suggestions
  const trackUsage = (optionId: string) => {
    try {
      const usageKey = `autocomplete_usage_${optionId}`;
      const usageData = {
        lastUsed: new Date().toISOString(),
        usageCount: (() => {
          const stored = localStorage.getItem(usageKey);
          if (stored) {
            const parsed = JSON.parse(stored);
            return (parsed.usageCount || 0) + 1;
          }
          return 1;
        })(),
      };
      localStorage.setItem(usageKey, JSON.stringify(usageData));
    } catch (error) {
      console.error('Error tracking usage:', error);
    }
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) {
      if (e.key === 'ArrowDown' && suggestions.length > 0) {
        setIsOpen(true);
        setHighlightedIndex(0);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
          handleSelect(suggestions[highlightedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Format date for display
  const formatDate = (date: Date | string | undefined): string => {
    if (!date) return '';
    try {
      const d = typeof date === 'string' ? new Date(date) : date;
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 0) return 'Heute';
      if (diffDays === 1) return 'Gestern';
      if (diffDays < 7) return `Vor ${diffDays} Tagen`;
      if (diffDays < 30) return `Vor ${Math.floor(diffDays / 7)} Wochen`;
      return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return '';
    }
  };

  return (
    <div className={cn('relative', className)}>
      {label && (
        <Label htmlFor={inputRef.current?.id} className="mb-2 block">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 z-10">
            {icon}
          </div>
        )}
        <Input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={cn(
            icon && 'pl-10',
            'transition-all duration-200',
            inputClassName
          )}
          autoComplete="off"
        />
      </div>

      {/* Dropdown Suggestions */}
      {isOpen && suggestions.length > 0 && (
        <Card
          ref={dropdownRef}
          className="absolute z-50 w-full mt-2 shadow-xl border-2 border-[#058bc0]/20 max-h-64 overflow-y-auto"
        >
          <CardContent className="p-3">
            <div className="space-y-1.5">
              {suggestions.map((option, index) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleSelect(option)}
                  className={cn(
                    'w-full text-left px-4 py-3 rounded-lg transition-all duration-150',
                    'hover:bg-[#058bc0]/10 hover:border-[#058bc0]/30',
                    'border-2 border-transparent',
                    highlightedIndex === index
                      ? 'bg-[#058bc0]/20 border-[#058bc0]/50 shadow-md'
                      : 'bg-white',
                    'flex items-start justify-between gap-3 group'
                  )}
                  onMouseEnter={() => setHighlightedIndex(index)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-base text-gray-900 group-hover:text-[#058bc0] transition-colors">
                        {option.label}
                      </span>
                      {option.lastUsed && showRecentFirst && (
                        <Badge variant="outline" className="text-xs">
                          <Clock className="h-3 w-3 mr-1" />
                          {formatDate(option.lastUsed)}
                        </Badge>
                      )}
                      {option.usageCount && showUsageCount && (
                        <Badge variant="outline" className="text-xs">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          {option.usageCount}x
                        </Badge>
                      )}
                    </div>
                    {option.description && (
                      <p className="text-sm text-gray-600 mt-1.5">
                        {option.description}
                      </p>
                    )}
                  </div>
                  {highlightedIndex === index && (
                    <Check className="h-5 w-5 text-[#058bc0] flex-shrink-0 mt-0.5" />
                  )}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {isOpen && suggestions.length === 0 && searchTerm.trim() && (
        <Card className="absolute z-50 w-full mt-1 shadow-lg border-2 border-gray-200">
          <CardContent className="p-4 text-center text-gray-500 text-sm">
            {emptyMessage}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AutoCompleteInput;







