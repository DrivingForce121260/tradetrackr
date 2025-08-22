import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { Plus, Save, Edit, Trash2, Upload, Download, Search, Filter, Eye, EyeOff, ArrowUpDown, ArrowUp, ArrowDown, Table as TableIcon, Package, X, Building, Calendar, Hash, BarChart3, Settings, CheckCircle, AlertCircle, FolderOpen, CheckSquare, User, Building2, FileText, Archive } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import AppHeader from './AppHeader';

import { Category, CategoryItem, CategoriesProps } from '@/types';
import { useQuickAction } from '@/contexts/QuickActionContext';
import QuickActionButtons from './QuickActionButtons';

const Categories: React.FC<CategoriesProps> = ({ 
  onBack, 
  onNavigate,
  onOpenMessaging
}) => {
  const { user, hasPermission } = useAuth();
  const { t } = useLanguage();
  const { isQuickAction, quickActionType } = useQuickAction();
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategoryTitle, setNewCategoryTitle] = useState('');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingItems, setEditingItems] = useState<{ [key: string]: CategoryItem[] }>({});
  
  // UI state
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'populated' | 'empty'>('all');
  const [sortField, setSortField] = useState<keyof Category>('title');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // Permissions
  const canViewCategories = hasPermission('view_categories');
  const canCreateCategories = hasPermission('create_categories');
  const canEditCategories = hasPermission('edit_categories');
  const canDeleteCategories = hasPermission('delete_categories');
  const canManageCategories = hasPermission('create_category') || hasPermission('edit_category') || hasPermission('delete_category');

  // Undo functionality
  const [deletedCategory, setDeletedCategory] = useState<Category | null>(null);
  const [showUndo, setShowUndo] = useState(false);

  // File input ref for spreadsheet import
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Effect to load categories from localStorage
  useEffect(() => {
    const storedCategories = localStorage.getItem('categories');
    if (storedCategories) {
      setCategories(JSON.parse(storedCategories));
    }
  }, []);

  // Effect to save categories to localStorage
  useEffect(() => {
    localStorage.setItem('categories', JSON.stringify(categories));
  }, [categories]);

  // Filter categories based on search and status
  const filteredCategories = categories.filter(category => {
    const matchesSearch = category.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         category.items.some(item => 
                           item.name.toLowerCase().includes(searchTerm.toLowerCase())
                         );
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'populated' && category.items.length > 0) ||
      (statusFilter === 'empty' && category.items.length === 0);
    
    return matchesSearch && matchesStatus;
  });

  // Effect to handle undo
  useEffect(() => {
    if (showUndo && deletedCategory) {
      const timer = setTimeout(() => {
        setShowUndo(false);
        setDeletedCategory(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showUndo, deletedCategory]);

  // Effect to handle auto-creation of project group - removed for simplification

  // Auto-open create form for quick actions using QuickAction context
  useEffect(() => {
    if (isQuickAction && quickActionType === 'category') {
      // Focus on the category title input for quick creation
      setTimeout(() => {
        const categoryInput = document.querySelector('input[placeholder*="Kategorie"]') as HTMLInputElement;
        if (categoryInput) {
          categoryInput.focus();
        }
      }, 200);
    }
  }, [isQuickAction, quickActionType]);

  const handleAddCategory = () => {
    if (newCategoryTitle.trim() === '') {
      toast({
        title: 'Kategorie-Titel ist erforderlich',
        variant: 'destructive',
      });
      return;
    }
    const newCategory: Category = {
      id: `category-${Date.now()}`,
      title: newCategoryTitle,
      items: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setCategories(prev => [...prev, newCategory]);
    setNewCategoryTitle('');
    toast({
      title: 'Kategorie hinzugefügt',
      description: newCategory.title,
    });
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setEditingItems({ [category.id]: [...category.items] });
  };

  const handleSaveCategory = () => {
    if (!editingCategory) return;

    const updatedCategories = categories.map(cat =>
      cat.id === editingCategory.id ? editingCategory : cat
    );
    setCategories(updatedCategories);
    setEditingCategory(null);
    setEditingItems({});
    toast({
      title: 'Kategorie gespeichert',
      description: editingCategory.title,
    });
  };

  const handleDeleteCategory = (category: Category) => {
    const confirmDelete = window.confirm('Sind Sie sicher, dass Sie diese Kategorie lö¶schen mö¶chten?');
    if (confirmDelete) {
      setDeletedCategory(category);
      setShowUndo(true);
      setCategories(prev => prev.filter(cat => cat.id !== category.id));
      toast({
        title: 'Kategorie gelö¶scht',
        description: category.title,
        variant: 'destructive',
      });
    }
  };

  const handleUndoDelete = () => {
    if (deletedCategory) {
      setCategories(prev => [...prev, deletedCategory]);
      setDeletedCategory(null);
      setShowUndo(false);
      toast({
        title: 'Lö¶schung rückgö¤ngig gemacht',
        description: deletedCategory.title,
      });
    }
  };

  const handleAddItem = (categoryId: string) => {
    const newItem: CategoryItem = {
      id: `item-${Date.now()}`,
      name: '',
      description: '',
      unit: '',
      price: 0,
      supplier: '',
      category: '',
      status: 'aktiv',
    };
    
    setEditingItems(prev => ({
      ...prev,
      [categoryId]: [...(prev[categoryId] || []), newItem]
    }));
  };

  const handleSaveItem = (categoryId: string, itemId: string) => {
    const editingItem = editingItems[categoryId]?.find(item => item.id === itemId);
    if (!editingItem) return;

    const updatedCategories = categories.map(cat =>
      cat.id === categoryId ? {
        ...cat,
        items: cat.items.map(item => 
          item.id === itemId ? editingItem : item
        ),
        updatedAt: new Date()
      } : cat
    );
    
    setCategories(updatedCategories);
    toast({
      title: 'Element gespeichert',
      description: editingItem.name,
    });
  };

  const handleDeleteItem = (categoryId: string, itemId: string) => {
    const confirmDelete = window.confirm('Sind Sie sicher, dass Sie dieses Element lö¶schen mö¶chten?');
    if (confirmDelete) {
      const updatedCategories = categories.map(cat =>
        cat.id === categoryId ? {
          ...cat,
          items: cat.items.filter(item => item.id !== itemId),
          updatedAt: new Date()
        } : cat
      );
      setCategories(updatedCategories);
      toast({
        title: 'Element gelö¶scht',
        variant: 'destructive',
      });
    }
  };

  const handleExcelImport = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleExcelExport = () => {
    const data = categories.map(category => ({
      'Kategorie': category.title,
      'Anzahl Elemente': category.items.length,
      'Erstellt': category.createdAt.toLocaleDateString('de-DE'),
      'Aktualisiert': category.updatedAt.toLocaleDateString('de-DE'),
    }));
    
    const csvContent = [
      Object.keys(data[0]).join(','),
      ...data.map(row => Object.values(row).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'kategorien_export.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: 'Export erfolgreich',
      description: 'CSV-Datei wurde heruntergeladen',
    });
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setSortField('title');
    setSortDirection('asc');
  };

  const filteredAndSortedCategories = categories
    .filter(category => {
      const matchesSearch = category.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        category.items.some(item => 
          item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.description?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      
      const matchesStatus = statusFilter === 'all' ||
        (statusFilter === 'populated' && category.items.length > 0) ||
        (statusFilter === 'empty' && category.items.length === 0);
      
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      let aValue: any = a[sortField];
      let bValue: any = b[sortField];
      
      if (sortField === 'createdAt' || sortField === 'updatedAt') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      } else if (sortField === 'items') {
        aValue = a.items.length;
        bValue = b.items.length;
      }
      
      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  const handleSort = (field: keyof Category) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: keyof Category) => {
    if (sortField !== field) return <ArrowUpDown className="h-5 w-5" />;
    return sortDirection === 'asc' ? <ArrowUp className="h-5 w-5" /> : <ArrowDown className="h-5 w-5" />;
  };

  if (!canViewCategories) {
    return (
      <>
        <AppHeader 
          title="Materialgruppen"
          showBackButton={true} 
          onBack={onBack}
          onOpenMessaging={onOpenMessaging}
        />
        <div className="p-6">
          <div className="max-w-7xl mx-auto">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h2 className="text-xl font-semibold mb-4 text-gray-900">Zugriff verweigert</h2>
                  <p className="text-gray-600">Sie haben keine Berechtigung, Materialgruppen anzuzeigen.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="min-h-screen tradetrackr-gradient-blue">
      <AppHeader 
        title="Materialgruppen"
        showBackButton={true} 
        onBack={onBack}
        onOpenMessaging={onOpenMessaging}
      />
      
      <div className="p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Kategorien & Materialgruppen
                </h1>
                <p className="text-gray-600">
                  Verwalten Sie Kategorien und Materialgruppen für eine bessere Organisation
                </p>
              </div>
              {canCreateCategories && (
                <Button 
                  onClick={() => setNewCategoryTitle('')}
                  className="bg-[#058bc0] hover:bg-[#047aa0] text-white"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Neue Kategorie
                </Button>
              )}
            </div>
          </div>

          {/* Quick Action Buttons */}
          <QuickActionButtons onNavigate={onNavigate} hasPermission={hasPermission} currentPage="categories" />

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="tradetrackr-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-700">Gesamt Kategorien</CardTitle>
                <Building className="h-5 w-5 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{categories.length}</div>
              </CardContent>
            </Card>
            
            <Card className="tradetrackr-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-700">Gesamt Elemente</CardTitle>
                <Package className="h-5 w-5 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {categories.reduce((sum, cat) => sum + cat.items.length, 0)}
                </div>
              </CardContent>
            </Card>
            
            <Card className="tradetrackr-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-700">Mit Inhalt</CardTitle>
                <CheckCircle className="h-5 w-5 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {categories.filter(cat => cat.items.length > 0).length}
                </div>
              </CardContent>
            </Card>
            
            <Card className="tradetrackr-card">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-700">Leer</CardTitle>
                <AlertCircle className="h-5 w-5 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {categories.filter(cat => cat.items.length === 0).length}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Controls Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  Materialgruppen ({filteredCategories.length})
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={handleExcelImport}
                    size="sm"
                    className="h-8 px-3"
                  >
                    <Upload className="h-5 w-5 mr-1" />
                    Import
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleExcelExport}
                    size="sm"
                    className="h-8 px-3"
                  >
                    <Download className="h-5 w-5 mr-1" />
                    Export
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
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search and Filters */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    placeholder="Nach Kategoriename oder Artikeln suchen..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={(value: 'all' | 'populated' | 'empty') => setStatusFilter(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status auswö¤hlen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Kategorien</SelectItem>
                    <SelectItem value="populated">Mit Inhalt</SelectItem>
                    <SelectItem value="empty">Leer</SelectItem>
                  </SelectContent>
                </Select>
                <div></div>
              </div>

              {/* Clear Filters */}
              {(searchTerm || statusFilter !== 'all') && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearFilters}
                    className="text-xs h-8 px-3"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Alle Filter zurücksetzen
                  </Button>
                </div>
              )}
              

            </CardContent>
          </Card>



          {/* Undo Button */}
          {showUndo && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Package className="h-5 w-5 text-orange-500" />
                    <span className="text-sm text-gray-600">
                      Kategorie "{deletedCategory?.title}" wurde gelö¶scht
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleUndoDelete}
                    size="sm"
                  >
                    Rückgö¤ngig machen
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Content */}
          {filteredAndSortedCategories.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2 text-gray-900">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Keine Kategorien gefunden' 
                  : 'Keine Kategorien vorhanden'
                }
              </h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || statusFilter !== 'all'
                  ? 'Versuchen Sie andere Suchbegriffe oder Filter.'
                  : ''
                }
              </p>
            </div>
          ) : viewMode === 'table' ? (
            /* Table View */
            <Card>
              <CardHeader className="pb-4">
                <div className="text-lg font-medium text-gray-700">Tabellenansicht</div>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                      <TableHead>
                        <Button
                          variant="ghost"
                          onClick={() => handleSort('title')}
                          className="h-auto p-0 font-semibold"
                        >
                          <div className="flex items-center gap-2">
                            Kategorie
                            {getSortIcon('title')}
                          </div>
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          onClick={() => handleSort('items')}
                          className="h-auto p-0 font-semibold"
                        >
                          <div className="flex items-center gap-2">
                            Elemente
                            {getSortIcon('items')}
                          </div>
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          onClick={() => handleSort('createdAt')}
                          className="h-auto p-0 font-semibold"
                        >
                          <div className="flex items-center gap-2">
                            Erstellt
                            {getSortIcon('createdAt')}
                          </div>
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          onClick={() => handleSort('updatedAt')}
                          className="h-auto p-0 font-semibold"
                        >
                          <div className="flex items-center gap-2">
                            Aktualisiert
                            {getSortIcon('updatedAt')}
                          </div>
                        </Button>
                      </TableHead>
                      <TableHead className="text-right">Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAndSortedCategories.map((category) => (
                      <TableRow key={category.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center">
                              <Building className="h-5 w-5 text-white" />
                            </div>
                            <div>
                              <div className="font-medium">{category.title}</div>
                              <div className="text-sm text-gray-500">
                                ID: {category.id}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Hash className="h-5 w-5 text-gray-400" />
                            <span className="font-medium">{category.items.length}</span>
                            <Badge variant="outline" className="text-xs">
                              {category.items.length > 0 ? 'Mit Inhalt' : 'Leer'}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-5 w-5 text-gray-400" />
                            <span className="text-sm">
                              {category.createdAt.toLocaleDateString('de-DE')}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-5 w-5 text-gray-400" />
                            <span className="text-sm">
                              {category.updatedAt.toLocaleDateString('de-DE')}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {canEditCategories && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditCategory(category)}
                              >
                                <Edit className="h-5 w-5" />
                              </Button>
                            )}
                            {canDeleteCategories && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteCategory(category)}
                              >
                                <Trash2 className="h-5 w-5" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              </CardContent>
            </Card>
          ) : (
            /* Cards View */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAndSortedCategories.map((category) => (
                <Card key={category.id} className="tradetrackr-card">
                  <CardHeader className="pb-4">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center">
                          <span className="text-white text-sm font-bold">
                            {category.title.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <CardTitle className="text-base font-medium text-blue-600">
                            {category.title}
                          </CardTitle>
                          <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                            <div className="flex items-center gap-1">
                              <Hash className="h-3 w-3" />
                              <span>{category.items.length} Elemente</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>{category.createdAt.toLocaleDateString('de-DE')}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {category.items.length > 0 ? 'Mit Inhalt' : 'Leer'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-sm text-gray-600">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="h-5 w-5" />
                        <span>Aktualisiert: {category.updatedAt.toLocaleDateString('de-DE')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Hash className="h-5 w-5" />
                        <span>ID: {category.id}</span>
                      </div>
                    </div>
                    
                    <div className="flex justify-end gap-2">
                      {canEditCategories && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditCategory(category)}
                        >
                          <Edit className="h-5 w-5 mr-2" />
                          Bearbeiten
                        </Button>
                      )}
                      {canDeleteCategories && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteCategory(category)}
                        >
                          <Trash2 className="h-5 w-5 mr-2" />
                          Lö¶schen
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Hidden file input for Excel import */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".csv,.xlsx,.xls"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            toast({
              title: 'Datei importiert',
              description: file.name,
            });
          }
        }}
      />
    </div>
  );
};

export default Categories;
