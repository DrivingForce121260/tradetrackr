/**
 * OfferItemsGrid - Spreadsheet-like line items editor for offers
 * 
 * Features:
 * - Resizable columns via drag handles
 * - Auto row height with text wrapping
 * - Keyboard navigation (Tab/Enter)
 * - Auto-add new row when editing last row
 * - No per-line tax column (tax is offer-level)
 * 
 * Manual Test Checklist:
 * [ ] Can resize columns by dragging header borders
 * [ ] Text wraps in description and rows expand automatically
 * [ ] Tab navigates between cells
 * [ ] Adding content to last row creates new empty row
 * [ ] Delete row button works
 * [ ] All data persists correctly
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Trash2, GripVertical, Plus } from 'lucide-react';

export interface OfferItem {
  position: number;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discountPct?: number;
  taxKey?: string; // Kept internally for backward compatibility
}

interface OfferItemsGridProps {
  items: OfferItem[];
  onChangeItems: (next: OfferItem[]) => void;
  readOnly?: boolean;
}

interface ColumnConfig {
  key: keyof OfferItem | 'lineTotal' | 'actions';
  label: string;
  minWidth: number;
  defaultWidth: number;
  maxWidth: number;
  type: 'number' | 'text' | 'textarea' | 'computed' | 'actions';
  align?: 'left' | 'center' | 'right';
}

const COLUMNS: ColumnConfig[] = [
  { key: 'position', label: 'Pos', minWidth: 50, defaultWidth: 60, maxWidth: 100, type: 'number', align: 'center' },
  { key: 'description', label: 'Beschreibung', minWidth: 150, defaultWidth: 300, maxWidth: 600, type: 'textarea', align: 'left' },
  { key: 'quantity', label: 'Menge', minWidth: 70, defaultWidth: 90, maxWidth: 150, type: 'number', align: 'right' },
  { key: 'unit', label: 'Einheit', minWidth: 60, defaultWidth: 80, maxWidth: 120, type: 'text', align: 'center' },
  { key: 'unitPrice', label: 'EP netto (€)', minWidth: 90, defaultWidth: 110, maxWidth: 180, type: 'number', align: 'right' },
  { key: 'discountPct', label: 'Rabatt %', minWidth: 70, defaultWidth: 90, maxWidth: 120, type: 'number', align: 'right' },
  { key: 'lineTotal', label: 'Gesamt (€)', minWidth: 90, defaultWidth: 110, maxWidth: 180, type: 'computed', align: 'right' },
  { key: 'actions', label: '', minWidth: 50, defaultWidth: 50, maxWidth: 60, type: 'actions', align: 'center' },
];

// Load column widths from localStorage
const loadColumnWidths = (): Record<string, number> => {
  try {
    const saved = localStorage.getItem('offerItemsGridColWidths');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Error loading column widths:', e);
  }
  // Return defaults
  return COLUMNS.reduce((acc, col) => {
    acc[col.key] = col.defaultWidth;
    return acc;
  }, {} as Record<string, number>);
};

// Save column widths to localStorage
const saveColumnWidths = (widths: Record<string, number>) => {
  try {
    localStorage.setItem('offerItemsGridColWidths', JSON.stringify(widths));
  } catch (e) {
    console.error('Error saving column widths:', e);
  }
};

const OfferItemsGrid: React.FC<OfferItemsGridProps> = ({ items, onChangeItems, readOnly = false }) => {
  const [colWidths, setColWidths] = useState<Record<string, number>>(loadColumnWidths);
  const [resizing, setResizing] = useState<{ colKey: string; startX: number; startWidth: number } | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  // Save column widths when they change
  useEffect(() => {
    saveColumnWidths(colWidths);
  }, [colWidths]);

  // Handle column resize
  const handleResizeStart = useCallback((e: React.MouseEvent, colKey: string) => {
    e.preventDefault();
    e.stopPropagation();
    setResizing({
      colKey,
      startX: e.clientX,
      startWidth: colWidths[colKey] || COLUMNS.find(c => c.key === colKey)?.defaultWidth || 100,
    });
  }, [colWidths]);

  useEffect(() => {
    if (!resizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const col = COLUMNS.find(c => c.key === resizing.colKey);
      if (!col) return;
      
      const deltaX = e.clientX - resizing.startX;
      const newWidth = Math.max(col.minWidth, Math.min(col.maxWidth, resizing.startWidth + deltaX));
      
      setColWidths(prev => ({
        ...prev,
        [resizing.colKey]: newWidth,
      }));
    };

    const handleMouseUp = () => {
      setResizing(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizing]);

  // Calculate line total
  const calcLineTotal = (item: OfferItem): number => {
    const subtotal = item.quantity * item.unitPrice;
    const discount = item.discountPct ? subtotal * (item.discountPct / 100) : 0;
    return subtotal - discount;
  };

  // Handle item change
  const handleChange = (index: number, field: keyof OfferItem, value: any) => {
    const newItems = [...items];
    const parsedValue = ['quantity', 'unitPrice', 'discountPct', 'position'].includes(field)
      ? (value === '' ? 0 : Number(value))
      : value;
    
    newItems[index] = { ...newItems[index], [field]: parsedValue };
    onChangeItems(newItems);

    // Auto-add new row if editing the last row and it becomes non-empty
    if (index === items.length - 1) {
      const item = newItems[index];
      const isNonEmpty = item.description || item.quantity > 0 || item.unitPrice > 0;
      if (isNonEmpty) {
        onChangeItems([
          ...newItems,
          createEmptyItem(newItems.length + 1),
        ]);
      }
    }
  };

  // Create empty item
  const createEmptyItem = (position: number): OfferItem => ({
    position,
    description: '',
    quantity: 1,
    unit: 'Stk',
    unitPrice: 0,
    discountPct: 0,
  });

  // Add new row
  const handleAddRow = () => {
    onChangeItems([...items, createEmptyItem(items.length + 1)]);
  };

  // Delete row
  const handleDeleteRow = (index: number) => {
    if (items.length <= 1) return; // Keep at least one row
    const newItems = items.filter((_, i) => i !== index);
    // Renumber positions
    const renumbered = newItems.map((item, i) => ({ ...item, position: i + 1 }));
    onChangeItems(renumbered);
  };

  // Auto-resize textarea
  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  };

  // Format currency
  const formatCurrency = (value: number): string => {
    return value.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <div className="w-full overflow-x-auto" ref={tableRef}>
      <div 
        className="min-w-max border-2 border-green-300 rounded-lg overflow-hidden"
        style={{ userSelect: resizing ? 'none' : 'auto' }}
      >
        {/* Header Row */}
        <div className="flex bg-gradient-to-r from-green-100 to-emerald-100 border-b-2 border-green-300">
          {COLUMNS.map((col, colIndex) => (
            <div
              key={col.key}
              className="relative flex items-center px-2 py-3 font-bold text-gray-900 text-sm border-r border-green-200 last:border-r-0"
              style={{ 
                width: colWidths[col.key] || col.defaultWidth,
                minWidth: col.minWidth,
                textAlign: col.align || 'left',
                justifyContent: col.align === 'right' ? 'flex-end' : col.align === 'center' ? 'center' : 'flex-start',
              }}
            >
              <span className="truncate">{col.label}</span>
              
              {/* Resize Handle - not on last column (actions) */}
              {colIndex < COLUMNS.length - 1 && (
                <div
                  className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-green-400/50 transition-colors z-10 flex items-center justify-center"
                  onMouseDown={(e) => handleResizeStart(e, col.key)}
                >
                  <div className="w-0.5 h-4 bg-green-400 rounded-full opacity-0 group-hover:opacity-100" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Data Rows */}
        <div className="bg-white">
          {items.map((item, rowIndex) => (
            <div 
              key={rowIndex}
              className="flex border-b border-green-100 last:border-b-0 hover:bg-green-50/50 transition-colors group"
              style={{ alignItems: 'stretch' }}
            >
              {COLUMNS.map((col) => (
                <div
                  key={col.key}
                  className="flex items-start px-1 py-1 border-r border-green-100 last:border-r-0"
                  style={{ 
                    width: colWidths[col.key] || col.defaultWidth,
                    minWidth: col.minWidth,
                  }}
                >
                  {col.type === 'textarea' ? (
                    readOnly ? (
                      <div 
                        className="w-full px-2 py-1.5 text-sm bg-gray-50 text-gray-700"
                        style={{ 
                          minHeight: '32px',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                        }}
                      >
                        {item[col.key as keyof OfferItem] as string || '-'}
                      </div>
                    ) : (
                      <textarea
                        value={item[col.key as keyof OfferItem] as string || ''}
                        onChange={(e) => {
                          handleChange(rowIndex, col.key as keyof OfferItem, e.target.value);
                          handleTextareaInput(e);
                        }}
                        onFocus={(e) => handleTextareaInput(e as any)}
                        className="w-full px-2 py-1.5 text-sm border border-transparent rounded focus:border-green-500 focus:ring-1 focus:ring-green-500/30 focus:outline-none resize-none overflow-hidden bg-transparent hover:bg-white"
                        style={{ 
                          minHeight: '32px',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                        }}
                        rows={1}
                      />
                    )
                  ) : col.type === 'number' ? (
                    readOnly ? (
                      <div className="w-full h-8 px-2 flex items-center justify-end text-sm text-gray-700 bg-gray-50">
                        {col.key === 'unitPrice' || col.key === 'discountPct' 
                          ? formatCurrency(item[col.key as keyof OfferItem] as number || 0)
                          : (item[col.key as keyof OfferItem] as number || 0)}
                      </div>
                    ) : (
                      <Input
                        type="number"
                        value={item[col.key as keyof OfferItem] as number || ''}
                        onChange={(e) => handleChange(rowIndex, col.key as keyof OfferItem, e.target.value)}
                        className="w-full h-8 px-2 text-sm border border-transparent rounded focus:border-green-500 focus:ring-1 focus:ring-green-500/30 bg-transparent hover:bg-white text-right"
                        step={col.key === 'unitPrice' ? '0.01' : col.key === 'discountPct' ? '0.1' : '1'}
                        min={0}
                      />
                    )
                  ) : col.type === 'text' ? (
                    readOnly ? (
                      <div className="w-full h-8 px-2 flex items-center justify-center text-sm text-gray-700 bg-gray-50">
                        {item[col.key as keyof OfferItem] as string || '-'}
                      </div>
                    ) : (
                      <Input
                        type="text"
                        value={item[col.key as keyof OfferItem] as string || ''}
                        onChange={(e) => handleChange(rowIndex, col.key as keyof OfferItem, e.target.value)}
                        className="w-full h-8 px-2 text-sm border border-transparent rounded focus:border-green-500 focus:ring-1 focus:ring-green-500/30 bg-transparent hover:bg-white text-center"
                      />
                    )
                  ) : col.type === 'computed' ? (
                    <div className="w-full h-8 px-2 flex items-center justify-end text-sm font-semibold text-gray-700">
                      {formatCurrency(calcLineTotal(item))}
                    </div>
                  ) : col.type === 'actions' ? (
                    readOnly ? null : (
                      <div className="w-full h-8 flex items-center justify-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteRow(rowIndex)}
                          disabled={items.length <= 1}
                          className="h-6 w-6 p-0 text-red-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-30"
                          title="Position löschen"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )
                  ) : null}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Add Row Button - hidden in read-only mode */}
        {!readOnly && (
          <div className="flex justify-center py-2 bg-gradient-to-r from-green-50 to-emerald-50 border-t border-green-200">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleAddRow}
              className="text-green-600 hover:text-green-700 hover:bg-green-100"
            >
              <Plus className="h-4 w-4 mr-1" />
              Position hinzufügen
            </Button>
          </div>
        )}
      </div>

      {/* Resize Cursor Overlay */}
      {resizing && (
        <div 
          className="fixed inset-0 cursor-col-resize z-50" 
          style={{ pointerEvents: 'auto' }}
        />
      )}
    </div>
  );
};

export default OfferItemsGrid;

