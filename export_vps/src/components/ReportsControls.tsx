import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, X, Download, Package, BarChart3, EyeOff, TableIcon } from 'lucide-react';

interface ReportsControlsProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  projectFilter: string;
  setProjectFilter: (project: string) => void;
  employeeFilter: string;
  setEmployeeFilter: (employee: string) => void;
  viewMode: 'table' | 'cards';
  setViewMode: (mode: 'table' | 'cards') => void;
  showStatistics: boolean;
  setShowStatistics: (show: boolean) => void;
  reportsCount: number;
  onExportCSV: () => void;
  onExportPDF: () => void;
}

const ReportsControls: React.FC<ReportsControlsProps> = ({
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  projectFilter,
  setProjectFilter,
  employeeFilter,
  setEmployeeFilter,
  viewMode,
  setViewMode,
  showStatistics,
  setShowStatistics,
  reportsCount,
  onExportCSV,
  onExportPDF
}) => {
  const hasActiveFilters = searchTerm || statusFilter !== 'all' || projectFilter !== 'all' || employeeFilter !== 'all';

  const clearAllFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setProjectFilter('all');
    setEmployeeFilter('all');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            Berichte ({reportsCount})
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowStatistics(!showStatistics)}
              className="text-xs h-8 px-3"
            >
              {showStatistics ? <EyeOff className="h-3 w-3 mr-1" /> : <BarChart3 className="h-3 w-3 mr-1" />}
              {showStatistics ? 'Statistiken ausblenden' : 'Statistiken'}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={onExportCSV}
              className="text-xs h-8 px-3"
            >
              <Download className="h-3 w-3 mr-1" />
              Export CSV
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={onExportPDF}
              className="text-xs h-8 px-3"
            >
              <Package className="h-3 w-3 mr-1" />
              Export PDF
            </Button>

            <Button
              variant={viewMode === 'table' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('table')}
              className="h-8 px-3"
            >
              <TableIcon className="h-5 w-5 mr-1" />
              Tabelle
            </Button>
            
            <Button
              variant={viewMode === 'cards' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('cards')}
              className="h-8 px-3"
            >
              <Package className="h-5 w-5 mr-1" />
              Karten
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search and Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Projekt auswö¤hlen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Projekte</SelectItem>
              <SelectItem value="PRJ-2024-001">PRJ-2024-001 - München Immobilien GmbH</SelectItem>
              <SelectItem value="PRJ-2024-002">PRJ-2024-002 - Hamburg Wohnbau AG</SelectItem>
              <SelectItem value="PRJ-2024-003">PRJ-2024-003 - Berlin Shopping Center GmbH</SelectItem>
              <SelectItem value="PRJ-2024-004">PRJ-2024-004 - Frankfurt Krankenhaus Stiftung</SelectItem>
              <SelectItem value="PRJ-2024-005">PRJ-2024-005 - Köln Schulamt</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Mitarbeiter auswö¤hlen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Mitarbeiter</SelectItem>
              <SelectItem value="Max Mustermann">Max Mustermann</SelectItem>
              <SelectItem value="Anna Schmidt">Anna Schmidt</SelectItem>
              <SelectItem value="Tom Weber">Tom Weber</SelectItem>
              <SelectItem value="Lisa Müller">Lisa Müller</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              placeholder="Suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Status filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Status</SelectItem>
              <SelectItem value="pending">Eingereicht</SelectItem>
              <SelectItem value="approved">Akzeptiert</SelectItem>
              <SelectItem value="rejected">Abgelehnt</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={clearAllFilters}
              className="text-xs h-8 px-3"
            >
              <X className="h-3 w-3 mr-1" />
              Alle Filter zurücksetzen
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ReportsControls;

