import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckSquare, Square, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BulkSelectProps<T> {
  items: T[];
  selectedItems: Set<string>;
  onSelectionChange: (selected: Set<string>) => void;
  getItemId: (item: T) => string;
  getItemLabel?: (item: T) => string;
  className?: string;
  showCount?: boolean;
  selectAllLabel?: string;
  clearLabel?: string;
}

export function BulkSelect<T>({
  items,
  selectedItems,
  onSelectionChange,
  getItemId,
  getItemLabel,
  className,
  showCount = true,
  selectAllLabel = 'Alle auswählen',
  clearLabel = 'Auswahl löschen',
}: BulkSelectProps<T>) {
  const allSelected = items.length > 0 && items.every(item => selectedItems.has(getItemId(item)));
  const someSelected = selectedItems.size > 0 && !allSelected;

  const handleSelectAll = () => {
    if (allSelected) {
      onSelectionChange(new Set());
    } else {
      const allIds = new Set(items.map(item => getItemId(item)));
      onSelectionChange(allIds);
    }
  };

  const handleClear = () => {
    onSelectionChange(new Set());
  };

  return (
    <div className={cn('flex items-center gap-4 p-3 bg-blue-50 border-2 border-blue-200 rounded-lg', className)}>
      <div className="flex items-center gap-2">
        <Checkbox
          checked={allSelected}
          onCheckedChange={handleSelectAll}
          className={cn(
            'h-5 w-5 border-2',
            allSelected && 'bg-blue-600 border-blue-600',
            someSelected && 'bg-blue-300 border-blue-400'
          )}
          aria-label={allSelected ? 'Alle abwählen' : selectAllLabel}
        />
        <span className="text-sm font-semibold text-gray-700">
          {allSelected ? 'Alle abwählen' : selectAllLabel}
        </span>
      </div>

      {showCount && selectedItems.size > 0 && (
        <Badge variant="secondary" className="bg-blue-600 text-white font-semibold">
          {selectedItems.size} {selectedItems.size === 1 ? 'ausgewählt' : 'ausgewählt'}
        </Badge>
      )}

      {selectedItems.size > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClear}
          className="h-8 px-3 text-sm text-gray-600 hover:text-gray-900 hover:bg-blue-100"
          aria-label={clearLabel}
        >
          <X className="h-4 w-4 mr-1" />
          {clearLabel}
        </Button>
      )}
    </div>
  );
}

export interface BulkActionsProps {
  selectedCount: number;
  onBulkDelete?: () => void;
  onBulkEdit?: () => void;
  onBulkArchive?: () => void;
  onBulkStatusChange?: (status: string) => void;
  className?: string;
  availableActions?: ('delete' | 'edit' | 'archive' | 'status')[];
}

export function BulkActions({
  selectedCount,
  onBulkDelete,
  onBulkEdit,
  onBulkArchive,
  onBulkStatusChange,
  className,
  availableActions = ['delete', 'edit', 'archive', 'status'],
}: BulkActionsProps) {
  if (selectedCount === 0) return null;

  return (
    <div className={cn('flex items-center gap-2 p-3 bg-green-50 border-2 border-green-200 rounded-lg', className)}>
      <span className="text-sm font-semibold text-gray-700">
        {selectedCount} {selectedCount === 1 ? 'Element ausgewählt' : 'Elemente ausgewählt'}
      </span>

      <div className="flex items-center gap-2 ml-auto">
        {availableActions.includes('edit') && onBulkEdit && (
          <Button
            variant="outline"
            size="sm"
            onClick={onBulkEdit}
            className="h-8 px-3 text-sm border-blue-300 hover:bg-blue-50"
            aria-label={`${selectedCount} Elemente bearbeiten`}
          >
            ✏️ Bearbeiten
          </Button>
        )}

        {availableActions.includes('status') && onBulkStatusChange && (
          <select
            onChange={(e) => onBulkStatusChange(e.target.value)}
            className="h-8 px-3 text-sm border-2 border-gray-300 rounded-md focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            aria-label="Status für ausgewählte Elemente ändern"
          >
            <option value="">Status ändern...</option>
            <option value="active">Aktiv</option>
            <option value="completed">Abgeschlossen</option>
            <option value="archived">Archiviert</option>
          </select>
        )}

        {availableActions.includes('archive') && onBulkArchive && (
          <Button
            variant="outline"
            size="sm"
            onClick={onBulkArchive}
            className="h-8 px-3 text-sm border-yellow-300 hover:bg-yellow-50"
            aria-label={`${selectedCount} Elemente archivieren`}
          >
            📦 Archivieren
          </Button>
        )}

        {availableActions.includes('delete') && onBulkDelete && (
          <Button
            variant="outline"
            size="sm"
            onClick={onBulkDelete}
            className="h-8 px-3 text-sm border-red-300 hover:bg-red-50 text-red-600"
            aria-label={`${selectedCount} Elemente löschen`}
          >
            🗑️ Löschen
          </Button>
        )}
      </div>
    </div>
  );
}







