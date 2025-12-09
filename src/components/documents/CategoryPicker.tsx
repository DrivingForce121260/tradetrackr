// ============================================================================
// CATEGORY PICKER COMPONENT - Select Category for Document
// ============================================================================
// Wrapper component that uses CascadingCategoryPicker for consistent UX

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Folder } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { CascadingCategoryPicker } from '@/components/categories/CascadingCategoryPicker';
import { CategoryPickerValue } from '@/types/categoryPicker';
import { fetchCategoriesForOrg, getCategoryPath as getCategoryPathHelper } from '@/lib/categories/categoryHelpers';

interface CategoryPickerProps {
  selectedCategoryId: string | null;
  onSelect: (categoryId: string | null) => void;
  candidates?: Array<{categoryId: string; confidence: number}>;
  disabled?: boolean;
}

export function CategoryPicker({ 
  selectedCategoryId, 
  onSelect, 
  candidates = [],
  disabled = false 
}: CategoryPickerProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);

  // Get orgId
  const orgId = user?.concernID || user?.ConcernID || '';

  // Load categories for path display
  React.useEffect(() => {
    if (orgId) {
      fetchCategoriesForOrg(orgId).then(setCategories).catch(console.error);
    }
  }, [orgId]);

  const getCategoryPathDisplay = (categoryId: string | null): string => {
    if (!categoryId) return 'Keine Kategorie';
    const path = getCategoryPathHelper(categories, categoryId);
    return path.length > 0 ? path.join(' > ') : 'Unbekannt';
  };

  const handleChange = (value: CategoryPickerValue) => {
    onSelect(value.categoryId);
    setOpen(false);
  };

  const currentValue: CategoryPickerValue = {
    categoryId: selectedCategoryId,
    path: selectedCategoryId ? getCategoryPathHelper(categories, selectedCategoryId) : []
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          disabled={disabled}
          className="text-left justify-start"
        >
          <Folder className="h-4 w-4 mr-2" />
          <span className="truncate max-w-[200px]">
            {getCategoryPathDisplay(selectedCategoryId)}
          </span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Kategorie auswählen</DialogTitle>
        </DialogHeader>
        
        {candidates.length > 0 && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm font-medium text-amber-900 mb-2">
              Vorgeschlagene Kategorien:
            </p>
            <div className="flex flex-wrap gap-2">
              {candidates.map((candidate, idx) => {
                const path = getCategoryPathHelper(categories, candidate.categoryId);
                return (
                  <Badge
                    key={idx}
                    variant="outline"
                    className="cursor-pointer hover:bg-amber-100"
                    onClick={() => {
                      onSelect(candidate.categoryId);
                      setOpen(false);
                    }}
                  >
                    {path.join(' > ')}
                    <span className="ml-2 text-xs">
                      ({(candidate.confidence * 100).toFixed(0)}%)
                    </span>
                  </Badge>
                );
              })}
            </div>
          </div>
        )}

        <CascadingCategoryPicker
          orgId={orgId}
          value={currentValue}
          onChange={handleChange}
          disabled={disabled}
          placeholder="Kategorie auswählen..."
        />
      </DialogContent>
    </Dialog>
  );
}

