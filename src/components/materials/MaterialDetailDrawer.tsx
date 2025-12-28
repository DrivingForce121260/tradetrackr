/**
 * MaterialDetailDrawer - Side panel for viewing material details and movement history
 * 
 * German UI labels
 * Displays:
 * - Material metadata (name, sku, unit, stock)
 * - Movement history (newest first)
 * - References to source deliveries
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Package,
  ArrowDown,
  ArrowUp,
  RefreshCw,
  Loader2,
  Truck,
  FileText,
  AlertCircle,
  X,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { MaterialsService } from '@/services/materialsService';
import {
  Material,
  MaterialMovement,
  MATERIAL_STATUS_LABELS,
  MATERIAL_STATUS_COLORS,
  MOVEMENT_TYPE_LABELS,
} from '@/types/materials';

interface MaterialDetailDrawerProps {
  material: Material | null;
  open: boolean;
  onClose: () => void;
}

const MaterialDetailDrawer: React.FC<MaterialDetailDrawerProps> = ({
  material,
  open,
  onClose,
}) => {
  const { user } = useAuth();
  const concernID = user?.concernID || user?.ConcernID;

  const [movements, setMovements] = useState<MaterialMovement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const materialsService = useMemo(() => {
    if (!concernID) return null;
    return new MaterialsService(concernID);
  }, [concernID]);

  // Load movements when material changes
  useEffect(() => {
    if (!material?.id || !materialsService) {
      setMovements([]);
      return;
    }

    const loadMovements = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await materialsService.getMovementsByMaterial(material.id);
        setMovements(data);
      } catch (err: any) {
        console.error('Error loading movements:', err);
        if (err.code === 'permission-denied') {
          setError('Keine Berechtigung oder Firestore-Regeln fehlen.');
        } else {
          setError('Fehler beim Laden der Bewegungen.');
        }
      } finally {
        setLoading(false);
      }
    };

    loadMovements();
  }, [material?.id, materialsService]);

  // Format date helper
  const formatDate = (timestamp: any): string => {
    if (!timestamp) return '-';
    try {
      const date = timestamp.toDate?.() || new Date(timestamp);
      return date.toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '-';
    }
  };

  // Movement type icon
  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'in':
        return <ArrowDown className="h-4 w-4 text-green-600" />;
      case 'out':
        return <ArrowUp className="h-4 w-4 text-red-600" />;
      case 'adjust':
        return <RefreshCw className="h-4 w-4 text-blue-600" />;
      default:
        return <Package className="h-4 w-4 text-gray-600" />;
    }
  };

  if (!material) return null;

  const statusColors = MATERIAL_STATUS_COLORS[material.status] || MATERIAL_STATUS_COLORS.available;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="pb-4 border-b">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <SheetTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Package className="h-6 w-6 text-[#058bc0]" />
                {material.name}
              </SheetTitle>
              <SheetDescription className="mt-1">
                {material.sku && (
                  <span className="font-mono text-sm text-gray-600">SKU: {material.sku}</span>
                )}
              </SheetDescription>
            </div>
            <Badge className={`${statusColors.bg} ${statusColors.text} border-0`}>
              {MATERIAL_STATUS_LABELS[material.status] || material.status}
            </Badge>
          </div>
        </SheetHeader>

        <div className="py-6 space-y-6">
          {/* Key Info Cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-[#058bc0]">
                {material.stock?.onHand || 0}
              </div>
              <div className="text-sm text-gray-600">{material.unit}</div>
              <div className="text-xs text-gray-500 mt-1">Bestand</div>
            </div>
            {material.lastPurchasePriceNet != null && (
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-green-700">
                  {material.lastPurchasePriceNet.toFixed(2)} €
                </div>
                <div className="text-xs text-gray-500 mt-1">Letzter Einkaufspreis (netto)</div>
              </div>
            )}
          </div>

          {/* Details */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Details
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-500">Einheit:</span>
                <span className="ml-2 font-medium">{material.unit}</span>
              </div>
              {material.category && (
                <div>
                  <span className="text-gray-500">Kategorie:</span>
                  <span className="ml-2 font-medium">{material.category}</span>
                </div>
              )}
              {material.supplierSnapshot?.name && (
                <div className="col-span-2">
                  <span className="text-gray-500">Lieferant:</span>
                  <span className="ml-2 font-medium">{material.supplierSnapshot.name}</span>
                </div>
              )}
              {material.projectSnapshot?.name && (
                <div className="col-span-2">
                  <span className="text-gray-500">Projekt:</span>
                  <span className="ml-2 font-medium">
                    {material.projectSnapshot.projectNumber} - {material.projectSnapshot.name}
                  </span>
                </div>
              )}
              {material.description && (
                <div className="col-span-2">
                  <span className="text-gray-500">Beschreibung:</span>
                  <p className="mt-1 text-gray-700">{material.description}</p>
                </div>
              )}
              {material.notes && (
                <div className="col-span-2">
                  <span className="text-gray-500">Notizen:</span>
                  <p className="mt-1 text-gray-700">{material.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Movement History */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Truck className="h-4 w-4" />
              Bewegungsverlauf
            </h3>

            {loading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-[#058bc0]" />
                <span className="ml-2 text-gray-600">Lade Bewegungen...</span>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                <AlertCircle className="h-5 w-5" />
                <span>{error}</span>
              </div>
            )}

            {!loading && !error && movements.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Package className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                <p>Keine Bewegungen vorhanden</p>
              </div>
            )}

            {!loading && !error && movements.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="w-12">Typ</TableHead>
                      <TableHead>Datum</TableHead>
                      <TableHead className="text-right">Menge</TableHead>
                      <TableHead>Referenz</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movements.map((mov) => (
                      <TableRow key={mov.id} className="hover:bg-gray-50">
                        <TableCell>
                          <div className="flex items-center gap-1" title={MOVEMENT_TYPE_LABELS[mov.type]}>
                            {getMovementIcon(mov.type)}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDate(mov.at)}
                        </TableCell>
                        <TableCell className={`text-right font-mono font-medium ${
                          mov.type === 'in' ? 'text-green-700' :
                          mov.type === 'out' ? 'text-red-700' :
                          'text-blue-700'
                        }`}>
                          {mov.type === 'in' ? '+' : mov.type === 'out' ? '-' : ''}
                          {Math.abs(mov.qty)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {mov.reference?.deliveryNoteNumber && (
                            <div className="flex items-center gap-1 text-gray-600">
                              <Truck className="h-3 w-3" />
                              <span>{mov.reference.deliveryNoteNumber}</span>
                            </div>
                          )}
                          {mov.reference?.supplierName && !mov.reference?.deliveryNoteNumber && (
                            <span className="text-gray-600">{mov.reference.supplierName}</span>
                          )}
                          {mov.notes && !mov.reference?.deliveryNoteNumber && (
                            <span className="text-gray-500 text-xs">{mov.notes}</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t">
          <Button variant="outline" onClick={onClose} className="w-full">
            Schließen
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default MaterialDetailDrawer;



