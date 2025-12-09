// ============================================================================
// TYPE SELECTOR MODAL - Manual Document Type Selection
// ============================================================================

import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertCircle, Search, FileText, CheckCircle } from 'lucide-react';
import { DocumentType, DOCUMENT_TYPE_CONFIGS, getDocumentTypeConfig, UploadContext } from '@/types/documents';

interface TypeSelectorModalProps {
  file: { file: File; id: string };
  context: UploadContext;
  onSelect: (type: DocumentType) => void;
  onCancel: () => void;
}

export function TypeSelectorModal({ file, context, onSelect, onCancel }: TypeSelectorModalProps) {
  const [selectedType, setSelectedType] = useState<DocumentType | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState<string>('all');

  const filteredTypes = useMemo(() => {
    let filtered = DOCUMENT_TYPE_CONFIGS;
    
    if (category !== 'all') {
      filtered = filtered.filter(t => t.category === category);
    }
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(t => 
        t.labelDe.toLowerCase().includes(term) ||
        t.label.toLowerCase().includes(term) ||
        t.slug.toLowerCase().includes(term) ||
        (t.descriptionDe || '').toLowerCase().includes(term)
      );
    }
    
    return filtered;
  }, [category, searchTerm]);

  const handleSelect = () => {
    if (!selectedType) return;
    
    const config = getDocumentTypeConfig(selectedType);
    if (!config) return;
    
    // Validate required links
    const missingLinks = config.requiredLinks.filter(link => !context[link]);
    if (missingLinks.length > 0) {
      alert(`Folgende Informationen fehlen: ${missingLinks.join(', ')}`);
      return;
    }
    
    onSelect(selectedType);
  };

  const categories = [
    { value: 'all', label: 'Alle', icon: '📁', count: DOCUMENT_TYPE_CONFIGS.length },
    { value: 'project', label: 'Projekt', icon: '🏗️', count: DOCUMENT_TYPE_CONFIGS.filter(c => c.category === 'project').length },
    { value: 'personnel', label: 'Personal', icon: '👷', count: DOCUMENT_TYPE_CONFIGS.filter(c => c.category === 'personnel').length },
    { value: 'material', label: 'Material', icon: '📦', count: DOCUMENT_TYPE_CONFIGS.filter(c => c.category === 'material').length },
    { value: 'client', label: 'Kunde', icon: '👤', count: DOCUMENT_TYPE_CONFIGS.filter(c => c.category === 'client').length },
    { value: 'quality', label: 'Qualität', icon: '✅', count: DOCUMENT_TYPE_CONFIGS.filter(c => c.category === 'quality').length },
    { value: 'compliance', label: 'Compliance', icon: '🛡️', count: DOCUMENT_TYPE_CONFIGS.filter(c => c.category === 'compliance').length }
  ];

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-3xl border-2 border-[#058bc0] shadow-2xl max-h-[90vh]">
        <DialogHeader className="border-b-2 border-gray-200 pb-4">
          <DialogTitle className="flex items-center gap-3 text-2xl">
            <div className="bg-gradient-to-br from-[#058bc0] to-[#047ba8] p-3 rounded-xl shadow-lg">
              <FileText className="h-7 w-7 text-white" />
            </div>
            Dokumenttyp wählen
          </DialogTitle>
          <DialogDescription className="space-y-3 pt-3">
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-3">
              <p className="text-sm font-semibold text-gray-900 mb-1">
                📎 Datei: <span className="text-[#058bc0]">{file.file.name}</span>
              </p>
              <p className="text-xs text-gray-600">
                Wählen Sie den passenden Dokumenttyp aus {DOCUMENT_TYPE_CONFIGS.length} Optionen
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Search - Enhanced */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-[#058bc0]" />
            <Input
              placeholder="Dokumenttyp suchen... (z.B. Rechnung, Lieferschein)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 border-2 border-gray-300 focus:border-[#058bc0] h-12 text-base font-medium"
            />
          </div>

          {/* Category Filter - Beautiful Buttons */}
          <div className="flex gap-2 flex-wrap">
            {categories.map(cat => (
              <Button
                key={cat.value}
                variant={category === cat.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCategory(cat.value)}
                className={`transition-all duration-200 ${
                  category === cat.value 
                    ? 'bg-gradient-to-r from-[#058bc0] to-[#047ba8] text-white border-2 border-[#047ba8] shadow-md scale-105' 
                    : 'border-2 border-gray-300 hover:border-[#058bc0] hover:bg-blue-50'
                }`}
              >
                <span className="mr-1">{cat.icon}</span>
                {cat.label}
                <Badge variant="secondary" className="ml-2 text-xs">
                  {cat.count}
                </Badge>
              </Button>
            ))}
          </div>

          {/* Type List - Enhanced */}
          <ScrollArea className="h-[400px] border-2 border-gray-300 rounded-xl">
            <div className="p-3 space-y-2">
              {filteredTypes.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">Keine Dokumenttypen gefunden</p>
                </div>
              ) : (
                filteredTypes.map(type => {
                  const missingLinks = type.requiredLinks.filter(link => !context[link]);
                  const canSelect = missingLinks.length === 0;
                  
                  return (
                    <div
                      key={type.slug}
                      className={`p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                        selectedType === type.slug
                          ? 'border-[#058bc0] bg-gradient-to-r from-blue-50 to-cyan-50 shadow-md scale-[1.02]'
                          : canSelect
                          ? 'border-gray-200 hover:border-[#058bc0] hover:shadow-sm hover:bg-blue-50/50'
                          : 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
                      }`}
                      onClick={() => canSelect && setSelectedType(type.slug)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-bold text-base">{type.labelDe}</span>
                            <Badge 
                              variant="outline" 
                              className={`text-xs font-semibold ${
                                selectedType === type.slug 
                                  ? 'bg-[#058bc0] text-white border-[#058bc0]' 
                                  : 'border-gray-300'
                              }`}
                            >
                              {type.category}
                            </Badge>
                          </div>
                          {type.descriptionDe && (
                            <p className="text-sm text-gray-700 mb-2">{type.descriptionDe}</p>
                          )}
                          {type.requiredLinks.length > 0 && (
                            <div className="flex items-center gap-1 text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded inline-block">
                              <span className="font-semibold">Benötigt:</span> {type.requiredLinks.join(', ')}
                            </div>
                          )}
                          {!canSelect && missingLinks.length > 0 && (
                            <div className="flex items-center gap-2 mt-2 text-sm text-amber-700 bg-amber-50 border-2 border-amber-300 px-3 py-2 rounded-lg">
                              <AlertCircle className="h-4 w-4 flex-shrink-0" />
                              <span className="font-semibold">Fehlend: {missingLinks.join(', ')}</span>
                            </div>
                          )}
                        </div>
                        {selectedType === type.slug && (
                          <div className="ml-3">
                            <div className="h-8 w-8 rounded-full bg-[#058bc0] flex items-center justify-center shadow-lg">
                              <CheckCircle className="h-5 w-5 text-white" />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </div>
        
        <DialogFooter className="flex gap-3 sm:justify-between pt-4 border-t-2 border-gray-200">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
            className="border-2 border-gray-300 font-semibold px-6"
          >
            Abbrechen
          </Button>
          <Button 
            type="button" 
            onClick={handleSelect}
            disabled={!selectedType}
            className="bg-gradient-to-r from-[#058bc0] to-[#047ba8] hover:from-[#047ba8] hover:to-[#036a8f] text-white font-bold px-8 border-2 border-[#047ba8] shadow-lg disabled:opacity-50"
          >
            <CheckCircle className="h-5 w-5 mr-2" />
            Typ auswählen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

