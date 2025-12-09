// ============================================================================
// CATEGORY ANALYTICS COMPONENT
// ============================================================================
// Analytics view for category usage across documents, tasks, and reports

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { 
  Search, 
  BarChart3, 
  FileText, 
  ClipboardList, 
  FileCheck,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Filter,
  X
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { CategoryStats, CategoryAnalyticsFilter, CategoryAnalyticsSort } from '@/types/categoryStats';
import { fetchCategoryStats, getCategoryTotals } from '@/services/categoryAnalyticsService';
import AppHeader from '@/components/AppHeader';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface CategoryAnalyticsProps {
  onBack?: () => void;
  onNavigate?: (page: string) => void;
  onOpenMessaging?: () => void;
}

const COLORS = ['#058bc0', '#0470a0', '#035c80', '#04a0c0', '#02c0d0', '#00d0e0'];

export default function CategoryAnalytics({ 
  onBack, 
  onNavigate, 
  onOpenMessaging 
}: CategoryAnalyticsProps) {
  const { user, hasPermission } = useAuth();
  const { toast } = useToast();
  
  const [stats, setStats] = useState<CategoryStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState({
    totalCategories: 0,
    totalDocuments: 0,
    totalTasks: 0,
    totalReports: 0
  });

  const [filter, setFilter] = useState<CategoryAnalyticsFilter>({
    type: 'all',
    activeOnly: true
  });
  const [sort, setSort] = useState<CategoryAnalyticsSort>({
    field: 'totalCount',
    order: 'desc'
  });
  const [searchTerm, setSearchTerm] = useState('');

  const orgId = user?.concernID || user?.ConcernID || '';

  // Check permissions
  const canViewAnalytics = hasPermission('admin_access') || user?.role === 'admin' || user?.role === 'manager';

  useEffect(() => {
    if (!canViewAnalytics) {
      toast({
        title: 'Zugriff verweigert',
        description: 'Sie haben keine Berechtigung, Analytics anzuzeigen.',
        variant: 'destructive'
      });
      return;
    }

    if (orgId) {
      loadStats();
    }
  }, [orgId, canViewAnalytics]);

  const loadStats = async () => {
    if (!orgId) return;

    setLoading(true);
    try {
      const [statsData, totalsData] = await Promise.all([
        fetchCategoryStats(orgId, { ...filter, searchTerm }, sort, 100),
        getCategoryTotals(orgId)
      ]);

      setStats(statsData);
      setTotals(totalsData);
    } catch (error: any) {
      console.error('[CategoryAnalytics] Failed to load stats:', error);
      toast({
        title: 'Fehler',
        description: `Statistiken konnten nicht geladen werden: ${error.message}`,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Apply filters and sorting
  const filteredAndSortedStats = useMemo(() => {
    let filtered = [...stats];

    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(stat =>
        stat.path.some(segment => segment.toLowerCase().includes(searchLower)) ||
        stat.path.join(' > ').toLowerCase().includes(searchLower)
      );
    }

    // Apply type filter
    if (filter.type && filter.type !== 'all') {
      filtered = filtered.filter(stat => {
        switch (filter.type) {
          case 'documents':
            return stat.totalDocuments > 0;
          case 'tasks':
            return stat.totalTasks > 0;
          case 'reports':
            return stat.totalReports > 0;
          default:
            return true;
        }
      });
    }

    // Apply minCount filter
    if (filter.minCount !== undefined) {
      filtered = filtered.filter(stat => {
        const total = stat.totalDocuments + stat.totalTasks + stat.totalReports;
        return total >= filter.minCount!;
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: number | string;
      let bValue: number | string;

      switch (sort.field) {
        case 'totalCount':
          aValue = a.totalDocuments + a.totalTasks + a.totalReports;
          bValue = b.totalDocuments + b.totalTasks + b.totalReports;
          break;
        case 'documents':
          aValue = a.totalDocuments;
          bValue = b.totalDocuments;
          break;
        case 'tasks':
          aValue = a.totalTasks;
          bValue = b.totalTasks;
          break;
        case 'reports':
          aValue = a.totalReports;
          bValue = b.totalReports;
          break;
        case 'name':
          aValue = a.path.join(' > ');
          bValue = b.path.join(' > ');
          break;
        case 'depth':
          aValue = a.depth;
          bValue = b.depth;
          break;
        default:
          aValue = a.totalDocuments + a.totalTasks + a.totalReports;
          bValue = b.totalDocuments + b.totalTasks + b.totalReports;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sort.order === 'desc' 
          ? bValue.localeCompare(aValue)
          : aValue.localeCompare(bValue);
      }

      return sort.order === 'desc' 
        ? (bValue as number) - (aValue as number)
        : (aValue as number) - (bValue as number);
    });

    return filtered;
  }, [stats, filter, sort, searchTerm]);

  // Chart data
  const topCategoriesChartData = useMemo(() => {
    return filteredAndSortedStats
      .slice(0, 10)
      .map(stat => ({
        name: stat.path[stat.path.length - 1] || 'Unbekannt',
        fullPath: stat.path.join(' > '),
        documents: stat.totalDocuments,
        tasks: stat.totalTasks,
        reports: stat.totalReports,
        total: stat.totalDocuments + stat.totalTasks + stat.totalReports
      }))
      .filter(item => item.total > 0);
  }, [filteredAndSortedStats]);

  const rootCategoryData = useMemo(() => {
    const rootStats = filteredAndSortedStats.filter(stat => stat.depth === 0);
    return rootStats.map(stat => ({
      name: stat.path[0] || 'Unbekannt',
      documents: stat.totalDocuments,
      tasks: stat.totalTasks,
      reports: stat.totalReports,
      total: stat.totalDocuments + stat.totalTasks + stat.totalReports
    }))
    .filter(item => item.total > 0)
    .sort((a, b) => b.total - a.total);
  }, [filteredAndSortedStats]);

  const handleSort = (field: CategoryAnalyticsSort['field']) => {
    setSort(prev => ({
      field,
      order: prev.field === field && prev.order === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleCategoryClick = (categoryId: string, type: 'documents' | 'tasks' | 'reports') => {
    // Navigate to filtered list view
    if (type === 'documents') {
      onNavigate?.(`/portal/documents?categoryId=${categoryId}`);
    } else if (type === 'tasks') {
      onNavigate?.(`/portal/tasks?categoryId=${categoryId}`);
    } else if (type === 'reports') {
      onNavigate?.(`/portal/reports?categoryId=${categoryId}`);
    }
  };

  const getSortIcon = (field: CategoryAnalyticsSort['field']) => {
    if (sort.field !== field) {
      return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
    }
    return sort.order === 'desc' 
      ? <ArrowDown className="h-4 w-4 text-blue-600" />
      : <ArrowUp className="h-4 w-4 text-blue-600" />;
  };

  if (!canViewAnalytics) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-lg text-gray-600">
              Sie haben keine Berechtigung, Category Analytics anzuzeigen.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50">
      <AppHeader 
        onBack={onBack} 
        onNavigate={onNavigate}
        onOpenMessaging={onOpenMessaging}
      />

      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <Card className="border-2 border-[#058bc0] shadow-lg">
          <CardHeader className="bg-gradient-to-r from-[#058bc0] to-[#0470a0] text-white">
            <CardTitle className="flex items-center gap-3 text-2xl">
              <BarChart3 className="h-8 w-8" />
              Category Analytics
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card className="bg-blue-50 border-2 border-blue-200">
                <CardContent className="p-4">
                  <div className="text-sm text-blue-600 font-medium">Kategorien</div>
                  <div className="text-2xl font-bold text-blue-900">{totals.totalCategories}</div>
                </CardContent>
              </Card>
              <Card className="bg-green-50 border-2 border-green-200">
                <CardContent className="p-4">
                  <div className="text-sm text-green-600 font-medium">Dokumente</div>
                  <div className="text-2xl font-bold text-green-900">{totals.totalDocuments}</div>
                </CardContent>
              </Card>
              <Card className="bg-purple-50 border-2 border-purple-200">
                <CardContent className="p-4">
                  <div className="text-sm text-purple-600 font-medium">Aufgaben</div>
                  <div className="text-2xl font-bold text-purple-900">{totals.totalTasks}</div>
                </CardContent>
              </Card>
              <Card className="bg-orange-50 border-2 border-orange-200">
                <CardContent className="p-4">
                  <div className="text-sm text-orange-600 font-medium">Berichte</div>
                  <div className="text-2xl font-bold text-orange-900">{totals.totalReports}</div>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  placeholder="Kategorie suchen..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select
                value={filter.type || 'all'}
                onValueChange={(value) => setFilter(prev => ({ ...prev, type: value as any }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Typ filtern" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Typen</SelectItem>
                  <SelectItem value="documents">Nur Dokumente</SelectItem>
                  <SelectItem value="tasks">Nur Aufgaben</SelectItem>
                  <SelectItem value="reports">Nur Berichte</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filter.activeOnly ? 'active' : 'all'}
                onValueChange={(value) => setFilter(prev => ({ ...prev, activeOnly: value === 'active' }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Kategorien</SelectItem>
                  <SelectItem value="active">Nur aktive</SelectItem>
                </SelectContent>
              </Select>

              <Button onClick={loadStats} disabled={loading} variant="outline">
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Aktualisieren
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Categories Pie Chart */}
          <Card className="border-2 border-gray-300 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Top 10 Kategorien (nach Dokumenten)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {topCategoriesChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={topCategoriesChartData}
                      dataKey="documents"
                      nameKey="fullPath"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {topCategoriesChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  Keine Daten verfügbar
                </div>
              )}
            </CardContent>
          </Card>

          {/* Root Categories Bar Chart */}
          <Card className="border-2 border-gray-300 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Verwendung nach Hauptkategorie
              </CardTitle>
            </CardHeader>
            <CardContent>
              {rootCategoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={rootCategoryData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="documents" fill="#058bc0" name="Dokumente" />
                    <Bar dataKey="tasks" fill="#9c27b0" name="Aufgaben" />
                    <Bar dataKey="reports" fill="#ff9800" name="Berichte" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  Keine Daten verfügbar
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Category Usage Table */}
        <Card className="border-2 border-gray-300 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Kategorie-Verwendung ({filteredAndSortedStats.length} Kategorien)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-[#058bc0]" />
                <p className="text-gray-600">Lade Statistiken...</p>
              </div>
            ) : filteredAndSortedStats.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Filter className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p>Keine Kategorien gefunden</p>
                <p className="text-sm mt-2">Versuchen Sie andere Filter</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSort('name')}
                          className="h-8 px-2"
                        >
                          Kategorie {getSortIcon('name')}
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSort('documents')}
                          className="h-8 px-2"
                        >
                          Dokumente {getSortIcon('documents')}
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSort('tasks')}
                          className="h-8 px-2"
                        >
                          Aufgaben {getSortIcon('tasks')}
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSort('reports')}
                          className="h-8 px-2"
                        >
                          Berichte {getSortIcon('reports')}
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSort('totalCount')}
                          className="h-8 px-2"
                        >
                          Gesamt {getSortIcon('totalCount')}
                        </Button>
                      </TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAndSortedStats.map((stat) => {
                      const total = stat.totalDocuments + stat.totalTasks + stat.totalReports;
                      return (
                        <TableRow key={stat.categoryId} className="hover:bg-gray-50">
                          <TableCell>
                            <div className="font-medium">
                              {stat.path.join(' > ')}
                            </div>
                            {stat.depth > 0 && (
                              <div className="text-xs text-gray-500 mt-1">
                                Tiefe: {stat.depth}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            {stat.totalDocuments > 0 ? (
                              <Button
                                variant="link"
                                className="h-auto p-0 text-blue-600 hover:text-blue-800"
                                onClick={() => handleCategoryClick(stat.categoryId, 'documents')}
                              >
                                {stat.totalDocuments}
                              </Button>
                            ) : (
                              <span className="text-gray-400">0</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {stat.totalTasks > 0 ? (
                              <Button
                                variant="link"
                                className="h-auto p-0 text-purple-600 hover:text-purple-800"
                                onClick={() => handleCategoryClick(stat.categoryId, 'tasks')}
                              >
                                {stat.totalTasks}
                              </Button>
                            ) : (
                              <span className="text-gray-400">0</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {stat.totalReports > 0 ? (
                              <Button
                                variant="link"
                                className="h-auto p-0 text-orange-600 hover:text-orange-800"
                                onClick={() => handleCategoryClick(stat.categoryId, 'reports')}
                              >
                                {stat.totalReports}
                              </Button>
                            ) : (
                              <span className="text-gray-400">0</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-semibold">
                              {total}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {stat.categoryActive ? (
                              <Badge className="bg-green-500">Aktiv</Badge>
                            ) : (
                              <Badge variant="outline" className="text-amber-600 border-amber-600">
                                Inaktiv
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {stat.totalDocuments > 0 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleCategoryClick(stat.categoryId, 'documents')}
                                  title="Dokumente anzeigen"
                                >
                                  <FileText className="h-4 w-4" />
                                </Button>
                              )}
                              {stat.totalTasks > 0 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleCategoryClick(stat.categoryId, 'tasks')}
                                  title="Aufgaben anzeigen"
                                >
                                  <ClipboardList className="h-4 w-4" />
                                </Button>
                              )}
                              {stat.totalReports > 0 && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleCategoryClick(stat.categoryId, 'reports')}
                                  title="Berichte anzeigen"
                                >
                                  <FileCheck className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}







