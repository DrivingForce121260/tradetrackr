import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Filter, 
  X, 
  ChevronDown, 
  ChevronUp,
  Plus,
  Settings
} from 'lucide-react';
import { DocumentFilter, DocumentCategory } from '@/types/documents';

interface DocumentFiltersProps {
  filters: DocumentFilter;
  onFiltersChange: (filters: DocumentFilter) => void;
  categories: DocumentCategory[];
  canManageCategories: boolean;
  externalProjects?: Array<{id: string; projectName: string}>;
  internalProjects?: Array<{id: string; projectName: string; internalCategory?: string}>;
}

const DocumentFilters: React.FC<DocumentFiltersProps> = ({
  filters,
  onFiltersChange,
  categories,
  canManageCategories,
  externalProjects = [],
  internalProjects = []
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);

  // Filter aktualisieren
  const updateFilter = (key: keyof DocumentFilter, value: any) => {
    // Behandle "__all__" wie undefined/leer
    const actualValue = value === '__all__' ? undefined : value;
    onFiltersChange({
      ...filters,
      [key]: actualValue
    });
  };

  // Filter zurücksetzen
  const resetFilters = () => {
    onFiltersChange({});
  };

  // Aktive Filter zö¤hlen
  const activeFilterCount = Object.keys(filters).filter(key => 
    filters[key as keyof DocumentFilter] !== undefined && 
    filters[key as keyof DocumentFilter] !== ''
  ).length;

  // Filter entfernen
  const removeFilter = (key: keyof DocumentFilter) => {
    const newFilters = { ...filters };
    delete newFilters[key];
    onFiltersChange(newFilters);
  };

  // Datum formatieren für Input
  const formatDateForInput = (date: Date | undefined): string => {
    if (!date) return '';
    return date.toISOString().split('T')[0];
  };

  // Datum aus Input parsen
  const parseDateFromInput = (dateString: string): Date | undefined => {
    if (!dateString) return undefined;
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? undefined : date;
  };

  return (
    <div className="space-y-4">
      {/* Filter Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">Filter</span>
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-2">
              {activeFilterCount} aktiv
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="h-8 px-2 text-gray-600 hover:text-gray-800"
            >
              <X className="h-4 w-4 mr-1" />
              Zurücksetzen
            </Button>
          )}
          
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 px-3">
                {isExpanded ? (
                  <>
                    <ChevronUp className="h-4 w-4 mr-1" />
                    Weniger
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 mr-1" />
                    Mehr
                  </>
                )}
              </Button>
            </CollapsibleTrigger>
          </Collapsible>
        </div>
      </div>

      {/* Aktive Filter anzeigen */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.projectType && (
            <Badge variant="outline" className="flex items-center gap-1">
              Projekttyp: {filters.projectType === 'external' ? 'Extern' : 'Intern'}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeFilter('projectType')}
                className="h-4 w-4 p-0 hover:bg-transparent"
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
          
          {filters.projectId && (
            <Badge variant="outline" className="flex items-center gap-1">
              Projekt: {[...externalProjects, ...internalProjects].find(p => p.id === filters.projectId)?.projectName || filters.projectId}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeFilter('projectId')}
                className="h-4 w-4 p-0 hover:bg-transparent"
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
          
          {filters.category && (
            <Badge variant="outline" className="flex items-center gap-1">
              Kategorie: {categories.find(c => c.id === filters.category)?.name || filters.category}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeFilter('category')}
                className="h-4 w-4 p-0 hover:bg-transparent"
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
          
          {filters.documentType && (
            <Badge variant="outline" className="flex items-center gap-1">
              Typ: {filters.documentType}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeFilter('documentType')}
                className="h-4 w-4 p-0 hover:bg-transparent"
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
          
          {filters.priority && (
            <Badge variant="outline" className="flex items-center gap-1">
              Priorität: {filters.priority}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeFilter('priority')}
                className="h-4 w-4 p-0 hover:bg-transparent"
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
          
          {filters.projectPhase && (
            <Badge variant="outline" className="flex items-center gap-1">
              Phase: {filters.projectPhase}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeFilter('projectPhase')}
                className="h-4 w-4 p-0 hover:bg-transparent"
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
          
          {filters.uploadedBy && (
            <Badge variant="outline" className="flex items-center gap-1">
              Upload von: {filters.uploadedBy}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeFilter('uploadedBy')}
                className="h-4 w-4 p-0 hover:bg-transparent"
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
          
          {filters.dateFrom && (
            <Badge variant="outline" className="flex items-center gap-1">
              Von: {filters.dateFrom.toLocaleDateString('de-DE')}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeFilter('dateFrom')}
                className="h-4 w-4 p-0 hover:bg-transparent"
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
          
          {filters.dateTo && (
            <Badge variant="outline" className="flex items-center gap-1">
              Bis: {filters.dateTo.toLocaleDateString('de-DE')}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeFilter('dateTo')}
                className="h-4 w-4 p-0 hover:bg-transparent"
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
        </div>
      )}

      {/* Erweiterte Filter */}
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleContent className="space-y-4">
          <div className="bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 p-6 rounded-lg border-2 border-blue-200 shadow-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Projekttyp Filter */}
              <div>
                <Label htmlFor="filter-projectType" className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  🏢 Projekttyp
                </Label>
                <Select
                  value={filters.projectType || ''}
                  onValueChange={(value) => updateFilter('projectType', value || undefined)}
                >
                  <SelectTrigger className="border-2 border-gray-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/20 bg-white">
                    <SelectValue placeholder="Alle Projekte" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">📁 Alle Projekttypen</SelectItem>
                    <SelectItem value="external">💼 Externe Projekte (Kunden)</SelectItem>
                    <SelectItem value="internal">🏢 Interne Projekte</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Projekt Filter */}
              <div>
                <Label htmlFor="filter-projectId" className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  📂 Projekt
                </Label>
                <Select
                  value={filters.projectId || ''}
                  onValueChange={(value) => updateFilter('projectId', value || undefined)}
                >
                  <SelectTrigger className="border-2 border-gray-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/20 bg-white">
                    <SelectValue placeholder="Alle Projekte" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">📁 Alle Projekte</SelectItem>
                    {externalProjects.length > 0 && (
                      <>
                        <SelectItem disabled value="header-external">
                          <span className="font-bold text-indigo-700">💼 Kundenprojekte</span>
                        </SelectItem>
                        {externalProjects.slice(0, 20).map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {'  '}{project.projectName}
                          </SelectItem>
                        ))}
                      </>
                    )}
                    {internalProjects.length > 0 && (
                      <>
                        <SelectItem disabled value="header-internal">
                          <span className="font-bold text-blue-700">🏢 Interne Projekte</span>
                        </SelectItem>
                        {internalProjects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {'  '}{project.projectName}
                          </SelectItem>
                        ))}
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Kategorie Filter */}
              <div>
                <Label htmlFor="filter-category" className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  🏷️ Kategorie
                </Label>
                <Select
                  value={filters.category || ''}
                  onValueChange={(value) => updateFilter('category', value || undefined)}
                >
                  <SelectTrigger className="border-2 border-gray-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/20 bg-white">
                    <SelectValue placeholder="Alle Kategorien" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">📁 Alle Kategorien</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        <div className="flex items-center gap-2">
                          <span>{category.icon}</span>
                          <span>{category.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Dokumententyp Filter */}
              <div>
                <Label htmlFor="filter-documentType" className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  📄 Dokumententyp
                </Label>
                <Select
                  value={filters.documentType || ''}
                  onValueChange={(value) => updateFilter('documentType', value || undefined)}
                >
                  <SelectTrigger className="border-2 border-gray-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/20 bg-white">
                    <SelectValue placeholder="Alle Typen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">📋 Alle Typen</SelectItem>
                    <SelectItem value="drawing">📐 Zeichnung</SelectItem>
                    <SelectItem value="contract">📝 Vertrag</SelectItem>
                    <SelectItem value="photo">📷 Foto</SelectItem>
                    <SelectItem value="report">📊 Bericht</SelectItem>
                    <SelectItem value="other">📎 Sonstiges</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Priorität Filter */}
              <div>
                <Label htmlFor="filter-priority" className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  ⚡ Priorität
                </Label>
                <Select
                  value={filters.priority || ''}
                  onValueChange={(value) => updateFilter('priority', value || undefined)}
                >
                  <SelectTrigger className="border-2 border-gray-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/20 bg-white">
                    <SelectValue placeholder="Alle Prioritäten" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">📊 Alle Prioritäten</SelectItem>
                    <SelectItem value="low">🟢 Niedrig</SelectItem>
                    <SelectItem value="medium">🟡 Mittel</SelectItem>
                    <SelectItem value="high">🔴 Hoch</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Projektphase Filter */}
              <div>
                <Label htmlFor="filter-projectPhase" className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  🔄 Projektphase
                </Label>
                <Input
                  id="filter-projectPhase"
                  value={filters.projectPhase || ''}
                  onChange={(e) => updateFilter('projectPhase', e.target.value || undefined)}
                  placeholder="z.B. Planung, Ausführung"
                  className="border-2 border-gray-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/20 bg-white"
                />
              </div>

              {/* Upload von Filter */}
              <div>
                <Label htmlFor="filter-uploadedBy" className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  👤 Upload von
                </Label>
                <Input
                  id="filter-uploadedBy"
                  value={filters.uploadedBy || ''}
                  onChange={(e) => updateFilter('uploadedBy', e.target.value || undefined)}
                  placeholder="E-Mail oder Name"
                  className="border-2 border-gray-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/20 bg-white"
                />
              </div>

              {/* Datum von Filter */}
              <div>
                <Label htmlFor="filter-dateFrom" className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  📅 Datum von
                </Label>
                <Input
                  id="filter-dateFrom"
                  type="date"
                  value={formatDateForInput(filters.dateFrom)}
                  onChange={(e) => updateFilter('dateFrom', parseDateFromInput(e.target.value))}
                  className="border-2 border-gray-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/20 bg-white"
                />
              </div>

              {/* Datum bis Filter */}
              <div>
                <Label htmlFor="filter-dateTo" className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  📅 Datum bis
                </Label>
                <Input
                  id="filter-dateTo"
                  type="date"
                  value={formatDateForInput(filters.dateTo)}
                  onChange={(e) => updateFilter('dateTo', parseDateFromInput(e.target.value))}
                  className="border-2 border-gray-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/20 bg-white"
                />
              </div>
            </div>

            {/* Kategorie-Management Button */}
            {canManageCategories && (
              <div className="flex justify-end mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCategoryManager(true)}
                  className="flex items-center gap-2 border-2 border-purple-300 hover:border-purple-500 hover:bg-purple-50 transition-all shadow-md hover:shadow-lg"
                >
                  <Settings className="h-4 w-4 text-purple-600" />
                  <span className="font-semibold text-purple-700">Kategorien verwalten</span>
                </Button>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Kategorie-Manager Modal würde hier implementiert werden */}
      {showCategoryManager && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Kategorien verwalten</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCategoryManager(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="space-y-4">
              <p className="text-gray-600">
                Kategorie-Management wird in einer zukünftigen Version implementiert.
              </p>
              
              <div className="flex justify-end">
                <Button onClick={() => setShowCategoryManager(false)}>
                  Schließen
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentFilters;

