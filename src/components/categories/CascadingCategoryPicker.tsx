// ============================================================================
// CASCADING CATEGORY PICKER - Web Portal
// ============================================================================
// Cascading dropdown picker for hierarchical category selection
// Uses the unified category model from /categories collection

import React, { useState, useEffect, useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AlertCircle } from 'lucide-react';
import { CategoryPickerValue, CascadingCategoryPickerProps } from '@/types/categoryPicker';
import { Category } from '@/types/category';
import { fetchCategoriesForOrg, getChildren, getCategoryPath, findCategoryById } from '@/lib/categories/categoryHelpers';

export function CascadingCategoryPicker({
  orgId,
  value,
  onChange,
  disabled = false,
  allowInactiveSelection = false,
  placeholder = 'Kategorie auswählen...',
  label,
  required = false,
  maxDepth
}: CascadingCategoryPickerProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLevels, setSelectedLevels] = useState<string[]>([]); // Array of categoryIds for each level

  // Load categories on mount
  useEffect(() => {
    if (!orgId) {
      setLoading(false);
      return;
    }

    const loadCategories = async () => {
      setLoading(true);
      try {
        const fetchedCategories = await fetchCategoriesForOrg(orgId);
        setCategories(fetchedCategories);
      } catch (error) {
        console.error('[CascadingCategoryPicker] Failed to load categories:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCategories();
  }, [orgId]);

  // Initialize selectedLevels from value.categoryId
  useEffect(() => {
    if (value.categoryId && categories.length > 0) {
      const category = findCategoryById(categories, value.categoryId);
      if (category) {
        // Build path from root to category
        const path: string[] = [];
        let current: Category | null = category;
        
        while (current) {
          path.unshift(current.categoryId);
          if (current.parentId) {
            current = findCategoryById(categories, current.parentId);
          } else {
            current = null;
          }
        }
        
        setSelectedLevels(path);
      } else {
        // Category not found - might be inactive
        if (allowInactiveSelection) {
          setSelectedLevels([value.categoryId]);
        } else {
          setSelectedLevels([]);
        }
      }
    } else {
      setSelectedLevels([]);
    }
  }, [value.categoryId, categories, allowInactiveSelection]);

  // Get root categories (level 1)
  const rootCategories = useMemo(() => {
    return getChildren(categories, null);
  }, [categories]);

  // Get children for a specific level
  const getLevelChildren = (levelIndex: number): Category[] => {
    if (levelIndex === 0) {
      return rootCategories;
    }
    
    const parentId = selectedLevels[levelIndex - 1] || null;
    if (!parentId) return [];
    
    return getChildren(categories, parentId);
  };

  // Handle level selection
  const handleLevelChange = (levelIndex: number, categoryId: string | null) => {
    if (disabled) return;

    const newSelectedLevels = [...selectedLevels];
    
    // Set the selected category for this level
    if (categoryId) {
      newSelectedLevels[levelIndex] = categoryId;
      // Clear all deeper levels
      newSelectedLevels.splice(levelIndex + 1);
    } else {
      // Clear this level and all deeper levels
      newSelectedLevels.splice(levelIndex);
    }
    
    setSelectedLevels(newSelectedLevels);

    // Update value
    const finalCategoryId = newSelectedLevels.length > 0 
      ? newSelectedLevels[newSelectedLevels.length - 1] 
      : null;
    
    const finalCategory = finalCategoryId ? findCategoryById(categories, finalCategoryId) : null;
    const path = finalCategory ? getCategoryPath(categories, finalCategoryId) : [];

    onChange({
      categoryId: finalCategoryId,
      path
    });
  };

  // Determine how many levels to show
  const maxLevelsToShow = useMemo(() => {
    if (maxDepth !== undefined) return maxDepth;
    
    // Auto-detect max depth from categories
    if (categories.length === 0) return 3;
    
    const maxDepthInData = Math.max(...categories.map(c => c.depth));
    return Math.max(3, maxDepthInData + 1); // Show at least 3 levels, or more if needed
  }, [categories, maxDepth]);

  // Check if we should show a level
  const shouldShowLevel = (levelIndex: number): boolean => {
    if (levelIndex >= maxLevelsToShow) return false;
    
    // Show level 0 (root) always
    if (levelIndex === 0) return true;
    
    // Show level N if level N-1 has a selection
    return selectedLevels.length >= levelIndex;
  };

  // Get display value for a level
  const getLevelDisplayValue = (levelIndex: number): string => {
    const categoryId = selectedLevels[levelIndex];
    if (!categoryId) return '';
    
    const category = findCategoryById(categories, categoryId);
    if (!category) {
      // Category might be inactive
      return allowInactiveSelection ? `${categoryId} (inaktiv)` : '';
    }
    
    return category.name;
  };

  // Check if selected category is inactive
  const isSelectedCategoryInactive = (): boolean => {
    if (!value.categoryId) return false;
    const category = findCategoryById(categories, value.categoryId);
    return category ? !category.active : false;
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {label && <Label>{label}</Label>}
        <div className="text-sm text-gray-500">Lade Kategorien...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {label && (
        <Label>
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}

      {/* Cascading dropdowns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: maxLevelsToShow }).map((_, levelIndex) => {
          if (!shouldShowLevel(levelIndex)) return null;

          const levelChildren = getLevelChildren(levelIndex);
          const hasChildren = levelChildren.length > 0;
          const isLastLevel = levelIndex === maxLevelsToShow - 1;
          const shouldDisable = disabled || (levelIndex > 0 && !selectedLevels[levelIndex - 1]);

          // Don't show empty levels
          if (levelIndex > 0 && !hasChildren && selectedLevels.length < levelIndex) {
            return null;
          }

          return (
            <div key={levelIndex} className="space-y-2">
              <Label className="text-xs text-gray-600">
                {levelIndex === 0 ? 'Hauptkategorie' : `Unterkategorie ${levelIndex}`}
              </Label>
              <Select
                value={selectedLevels[levelIndex] || ''}
                onValueChange={(val) => handleLevelChange(levelIndex, val || null)}
                disabled={shouldDisable}
              >
                <SelectTrigger className={shouldDisable ? 'bg-gray-100' : ''}>
                  <SelectValue placeholder={levelIndex === 0 ? placeholder : 'Auswählen...'} />
                </SelectTrigger>
                <SelectContent>
                  {levelIndex > 0 && (
                    <SelectItem value="">
                      <span className="text-gray-400">Keine Auswahl</span>
                    </SelectItem>
                  )}
                  {levelChildren.map((category) => (
                    <SelectItem key={category.categoryId} value={category.categoryId}>
                      {category.name}
                      {!category.active && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          (inaktiv)
                        </Badge>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          );
        })}
      </div>

      {/* Show selected path */}
      {value.categoryId && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-600">Ausgewählt:</span>
          <Badge variant="outline" className="font-medium">
            {value.path.join(' > ') || 'Unbekannt'}
          </Badge>
          {isSelectedCategoryInactive() && (
            <Badge variant="outline" className="text-amber-600">
              <AlertCircle className="h-3 w-3 mr-1" />
              Inaktiv
            </Badge>
          )}
        </div>
      )}

      {/* Show message if no categories available */}
      {!loading && categories.length === 0 && (
        <div className="text-sm text-gray-500">
          Keine Kategorien verfügbar. Bitte erstellen Sie zuerst Kategorien in den Einstellungen.
        </div>
      )}
    </div>
  );
}







