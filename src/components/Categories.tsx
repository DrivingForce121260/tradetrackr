import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { Plus, Save, Edit, Trash2, Upload, Download, Search, Filter, Eye, EyeOff, ArrowUpDown, ArrowUp, ArrowDown, Table as TableIcon, Package, X, Building, Calendar, Hash, BarChart3, Settings, CheckCircle, AlertCircle, FolderOpen, CheckSquare, User, Building2, FileText, Archive, Type, Database } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import AppHeader from './AppHeader';

import { Category, CategoryItem, CategoriesProps } from '@/types';
import { useQuickAction } from '@/contexts/QuickActionContext';
import QuickActionButtons from './QuickActionButtons';

// Neue Typen für die erweiterten Kategorien
interface CategoryType1 {
  id: string;
  title: string;
  type: 'type1';
  content: string;
  contentType: 'text' | 'table';
  createdAt: Date;
  updatedAt: Date;
}

interface CategoryType2 {
  id: string;
  title: string;
  type: 'type2';
  characteristic1: string;
  characteristic2: string;
  characteristic3: string;
  items: Array<{
    id: string;
    value1: string;
    value2: string;
    value3: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

type ExtendedCategory = CategoryType1 | CategoryType2;

const Categories: React.FC<CategoriesProps> = ({ 
  onBack, 
  onNavigate,
  onOpenMessaging
}) => {
  const { user, hasPermission } = useAuth();
  const { t } = useLanguage();
  const { isQuickAction, quickActionType } = useQuickAction();
  const [categories, setCategories] = useState<Category[]>([]);
  const [extendedCategories, setExtendedCategories] = useState<ExtendedCategory[]>([]);
  const [newCategoryTitle, setNewCategoryTitle] = useState('');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingItems, setEditingItems] = useState<{ [key: string]: CategoryItem[] }>({});
  
  // Neue States für das erweiterte Kategorieformular
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [selectedCategoryType, setSelectedCategoryType] = useState<'type1' | 'type2' | null>(null);
  const [newCategoryType1, setNewCategoryType1] = useState({
    title: '',
    content: '',
    contentType: 'text' as 'text' | 'table'
  });
  const [newCategoryType2, setNewCategoryType2] = useState({
    title: '',
    characteristic1: '',
    characteristic2: '',
    characteristic3: '',
    items: [{ id: '1', value1: '', value2: '', value3: '' }]
  });
  
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
    
    const storedExtendedCategories = localStorage.getItem('extendedCategories');
    if (storedExtendedCategories) {
      setExtendedCategories(JSON.parse(storedExtendedCategories));
    }
  }, []);

  // Effect to save categories to localStorage
  useEffect(() => {
    localStorage.setItem('categories', JSON.stringify(categories));
  }, [categories]);

  // Effect to save extended categories to localStorage
  useEffect(() => {
    localStorage.setItem('extendedCategories', JSON.stringify(extendedCategories));
  }, [extendedCategories]);

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

  // Neue Funktionen für erweiterte Kategorien
  const handleCreateCategoryType1 = () => {
    if (!newCategoryType1.title.trim()) {
      toast({
        title: 'Titel ist erforderlich',
        variant: 'destructive',
      });
      return;
    }

    const newCategory: CategoryType1 = {
      id: `type1-${Date.now()}`,
      title: newCategoryType1.title,
      type: 'type1',
      content: newCategoryType1.content,
      contentType: newCategoryType1.contentType,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    setExtendedCategories(prev => [...prev, newCategory]);
    
    // Reset form
    setNewCategoryType1({
      title: '',
      content: '',
      contentType: 'text'
    });
    
    setSelectedCategoryType(null);
    setShowCategoryModal(false);
    
    toast({
      title: 'Kategorie Typ 1 erstellt',
      description: newCategory.title,
    });
  };

  const handleCreateCategoryType2 = async () => {
    if (!newCategoryType2.title.trim() || !newCategoryType2.characteristic1.trim() || 
        !newCategoryType2.characteristic2.trim() || !newCategoryType2.characteristic3.trim()) {
      toast({
        title: 'Alle Felder sind erforderlich',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Get concernId from user context
      const concernId = user?.concernID || 'default-concern';
      
      // Create lookupFamilies document
      const familyData = {
        concernId: concernId,
        familyId: newCategoryType2.title,
        familyName: newCategoryType2.title,
        level0: newCategoryType2.characteristic1,
        level1: newCategoryType2.characteristic2,
        level2: newCategoryType2.characteristic3,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1
      };

      // Save to Firestore
      const { addDoc, collection, serverTimestamp } = await import('firebase/firestore');
      const { db } = await import('@/config/firebase');
      
      // Add to lookupFamilies collection
      const familyRef = await addDoc(collection(db, 'lookupFamilies'), {
        ...familyData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Create lookupOptions documents for each item
      const optionsPromises = newCategoryType2.items
        .filter(item => item.value1.trim() || item.value2.trim() || item.value3.trim())
        .map(async (item, index) => {
          const order = index + 1;
          const parentType = item.value1.trim(); // Always the value from Merkmal 1 column
          
          const options = [];
          
          // Level 1 (Merkmal 1)
          if (item.value1.trim()) {
            options.push({
              concernId: concernId,
              familyId: newCategoryType2.title,
              key: newCategoryType2.characteristic1,
              level: 1,
              order: order,
              parent_Type: parentType,
              value: item.value1.trim(),
              // No valueNumber for level 1
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            });
          }
          
          // Level 2 (Merkmal 2)
          if (item.value2.trim()) {
            const valueNumber2 = parseFloat(item.value2.trim());
            options.push({
              concernId: concernId,
              familyId: newCategoryType2.title,
              key: newCategoryType2.characteristic2,
              level: 2,
              order: order,
              parent_Type: parentType,
              value: item.value2.trim(),
              valueNumber: isNaN(valueNumber2) ? null : valueNumber2,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            });
          }
          
          // Level 3 (Merkmal 3)
          if (item.value3.trim()) {
            const valueNumber3 = parseFloat(item.value3.trim());
            options.push({
              concernId: concernId,
              familyId: newCategoryType2.title,
              key: newCategoryType2.characteristic3,
              level: 3,
              order: order,
              parent_Type: parentType,
              value: item.value3.trim(),
              valueNumber: isNaN(valueNumber3) ? null : valueNumber3,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            });
          }
          
          return options;
        });

      const allOptions = (await Promise.all(optionsPromises)).flat();
      
      // Add all options to lookupOptions collection
      for (const option of allOptions) {
        await addDoc(collection(db, 'lookupOptions'), option);
      }

      // Create local category for display
      const newCategory: CategoryType2 = {
        id: familyRef.id, // Use Firestore document ID
        title: newCategoryType2.title,
        type: 'type2',
        characteristic1: newCategoryType2.characteristic1,
        characteristic2: newCategoryType2.characteristic2,
        characteristic3: newCategoryType2.characteristic3,
        items: newCategoryType2.items.filter(item => item.value1.trim() || item.value2.trim() || item.value3.trim()),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      setExtendedCategories(prev => [...prev, newCategory]);
      
      // Reset form
      setNewCategoryType2({
        title: '',
        characteristic1: '',
        characteristic2: '',
        characteristic3: '',
        items: [{ id: '1', value1: '', value2: '', value3: '' }]
      });
      
      setSelectedCategoryType(null);
      setShowCategoryModal(false);
      
      toast({
        title: 'Kategorie Typ 2 erfolgreich erstellt',
        description: `${newCategory.title} wurde in Firestore gespeichert`,
      });
      
    } catch (error) {
      console.error('Error saving to Firestore:', error);
      toast({
        title: 'Fehler beim Speichern',
        description: 'Kategorie konnte nicht in der Datenbank gespeichert werden',
        variant: 'destructive',
      });
    }
  };

  const addNewItemToType2 = () => {
    setNewCategoryType2(prev => ({
      ...prev,
      items: [...prev.items, { 
        id: `${Date.now()}-${prev.items.length}`, 
        value1: '', 
        value2: '', 
        value3: '' 
      }]
    }));
  };

  const removeItemFromType2 = (index: number) => {
    if (newCategoryType2.items.length > 1) {
      setNewCategoryType2(prev => ({
        ...prev,
        items: prev.items.filter((_, i) => i !== index)
      }));
    }
  };

  const updateType2Item = (index: number, field: 'value1' | 'value2' | 'value3', value: string) => {
    setNewCategoryType2(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const openCategoryModal = () => {
    setShowCategoryModal(true);
    setSelectedCategoryType(null);
    setNewCategoryType1({ title: '', content: '', contentType: 'text' });
    setNewCategoryType2({ 
      title: '', 
      characteristic1: '', 
      characteristic2: '', 
      characteristic3: '', 
      items: [{ id: '1', value1: '', value2: '', value3: '' }] 
    });
  };

  const closeCategoryModal = () => {
    // Prüfe, ob Daten eingegeben wurden
    const hasData = selectedCategoryType === 'type1' 
      ? (newCategoryType1.title || newCategoryType1.content)
      : (newCategoryType2.title || newCategoryType2.characteristic1 || newCategoryType2.characteristic2 || newCategoryType2.characteristic3 || newCategoryType2.items.some(item => item.value1 || item.value2 || item.value3));

    if (hasData) {
      const confirmClose = window.confirm(
        'Warnung: Sie haben Daten eingegeben, die noch nicht gespeichert wurden. Möchten Sie wirklich fortfahren? Alle eingegebenen Daten gehen verloren.'
      );
      if (!confirmClose) return;
    }

    setShowCategoryModal(false);
    setSelectedCategoryType(null);
  };

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
    const confirmDelete = window.confirm('Sind Sie sicher, dass Sie diese Kategorie löschen möchten?');
    if (confirmDelete) {
      setDeletedCategory(category);
      setShowUndo(true);
      setCategories(prev => prev.filter(cat => cat.id !== category.id));
      toast({
        title: 'Kategorie gelöscht',
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
        title: 'Löschung rückgängig gemacht',
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
    const confirmDelete = window.confirm('Sind Sie sicher, dass Sie dieses Element löschen möchten?');
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
        title: 'Element gelöscht',
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
      {/* Header */}
      <AppHeader 
        title="Kategorien & Materialgruppen"
        showBackButton={!!onBack}
        onBack={onBack}
        onOpenMessaging={onOpenMessaging}
      />



      {/* Kategorie-Erstellungs-Modal */}
      <Dialog open={showCategoryModal} onOpenChange={setShowCategoryModal}>
        <DialogContent 
          className="max-w-4xl max-h-[90vh] relative mx-auto" 
          style={{ 
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            margin: 0,
            maxHeight: '90vh',
            minWidth: '600px',
            minHeight: '400px',
            cursor: 'move',
            resize: 'both',
            overflow: 'visible'
          }}
          onMouseDown={(e) => {
            // Mache das Modal bewegbar
            if (e.target === e.currentTarget || e.target === e.currentTarget.querySelector('.dialog-header')) {
              const modal = e.currentTarget;
              let isDragging = false;
              let startX = e.clientX;
              let startY = e.clientY;
              let startLeft = parseInt(modal.style.left) || 0;
              let startTop = parseInt(modal.style.top) || 0;

              const handleMouseMove = (e: MouseEvent) => {
                if (!isDragging) return;
                const deltaX = e.clientX - startX;
                const deltaY = e.clientY - startY;
                modal.style.left = `${startLeft + deltaX}px`;
                modal.style.top = `${startTop + deltaY}px`;
                modal.style.transform = 'none';
              };

              const handleMouseUp = () => {
                isDragging = false;
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
              };

              isDragging = true;
              document.addEventListener('mousemove', handleMouseMove);
              document.addEventListener('mouseup', handleMouseUp);
            }
          }}
        >
          <DialogHeader className="dialog-header cursor-move bg-gray-50 border-b p-4 -m-4 mb-4">
            <DialogTitle>Neue Kategorie erstellen</DialogTitle>
          </DialogHeader>
          
          {!selectedCategoryType ? (
            // Kategorietyp-Auswahl
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-gray-600 mb-6">Wählen Sie den Typ der Kategorie aus:</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Kategorie Typ 1 */}
                <Card 
                  className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-blue-500"
                  onClick={() => setSelectedCategoryType('type1')}
                >
                  <CardHeader className="text-center">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Type className="w-8 h-8 text-blue-600" />
                    </div>
                    <CardTitle className="text-lg">Kategorie Typ 1</CardTitle>
                    <p className="text-sm text-gray-600">Einfache Kategorie für mobile App-Benutzer</p>
                  </CardHeader>
                  <CardContent>
                    <ul className="text-sm text-gray-600 space-y-2">
                      <li>• Titel der Kategorie</li>
                      <li>• Text oder Excel-ähnliche Tabelle</li>
                      <li>• Für Informationszwecke</li>
                    </ul>
                  </CardContent>
                </Card>

                {/* Kategorie Typ 2 */}
                <Card 
                  className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-green-500"
                  onClick={() => setSelectedCategoryType('type2')}
                >
                  <CardHeader className="text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Database className="w-8 h-8 text-green-600" />
                    </div>
                    <CardTitle className="text-lg">Kategorie Typ 2</CardTitle>
                    <p className="text-sm text-gray-600">Komplexe Kategorie mit drei Merkmalen</p>
                  </CardHeader>
                  <CardContent>
                    <ul className="text-sm text-gray-600 space-y-2">
                      <li>• Titel der Kategorie</li>
                      <li>• Drei definierte Merkmale</li>
                      <li>• Mehrere Einträge möglich</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : selectedCategoryType === 'type1' ? (
            // Formular für Kategorie Typ 1
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedCategoryType(null)}
                >
                  ← Zurück zur Auswahl
                </Button>
                <div className="flex items-center gap-2">
                  <Type className="w-5 h-5 text-blue-600" />
                  <span className="font-medium">Kategorie Typ 1</span>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="type1-title">Titel der Kategorie *</Label>
                  <Input
                    id="type1-title"
                    placeholder="z.B. Sicherheitshinweise, Arbeitsanweisungen"
                    value={newCategoryType1.title}
                    onChange={(e) => setNewCategoryType1(prev => ({ ...prev, title: e.target.value }))}
                  />
                </div>

                <div>
                  <Label htmlFor="type1-content-type">Inhaltstyp</Label>
                  <Select 
                    value={newCategoryType1.contentType} 
                    onValueChange={(value: 'text' | 'table') => 
                      setNewCategoryType1(prev => ({ ...prev, contentType: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Text</SelectItem>
                      <SelectItem value="table">Tabelle</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="type1-content">Inhalt *</Label>
                  {newCategoryType1.contentType === 'text' ? (
                    <Textarea
                      id="type1-content"
                      placeholder="Geben Sie den Inhalt ein..."
                      value={newCategoryType1.content}
                      onChange={(e) => setNewCategoryType1(prev => ({ ...prev, content: e.target.value }))}
                      rows={6}
                    />
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600">Excel-ähnliche Tabelle (CSV-Format)</p>
                      <Textarea
                        id="type1-content"
                        placeholder="Spalte1,Spalte2,Spalte3&#10;Wert1,Wert2,Wert3&#10;Wert4,Wert5,Wert6"
                        value={newCategoryType1.content}
                        onChange={(e) => setNewCategoryType1(prev => ({ ...prev, content: e.target.value }))}
                        rows={6}
                      />
                      <p className="text-xs text-gray-500">Verwenden Sie Kommas als Trennzeichen und Zeilenumbrüche für neue Zeilen</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={closeCategoryModal}>
                  Abbrechen
                </Button>
                <Button onClick={handleCreateCategoryType1}>
                  <Save className="w-4 h-4 mr-2" />
                  Kategorie erstellen
                </Button>
              </div>
            </div>
          ) : (
            // Formular für Kategorie Typ 2
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedCategoryType(null)}
                >
                  ← Zurück zur Auswahl
                </Button>
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-green-600" />
                  <span className="font-medium">Kategorie Typ 2</span>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="type2-title">Titel der Kategorie *</Label>
                  <Input
                    id="type2-title"
                    placeholder="z.B. Kabel, Schrauben, Werkzeuge"
                    value={newCategoryType2.title}
                    onChange={(e) => setNewCategoryType2(prev => ({ ...prev, title: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="type2-char1">Merkmal 1 *</Label>
                    <Input
                      id="type2-char1"
                      placeholder="z.B. Kabeltyp (NYM)"
                      value={newCategoryType2.characteristic1}
                      onChange={(e) => setNewCategoryType2(prev => ({ ...prev, characteristic1: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="type2-char2">Merkmal 2 *</Label>
                    <Input
                      id="type2-char2"
                      placeholder="z.B. Anzahl Adern"
                      value={newCategoryType2.characteristic2}
                      onChange={(e) => setNewCategoryType2(prev => ({ ...prev, characteristic2: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="type2-char3">Merkmal 3 *</Label>
                    <Input
                      id="type2-char3"
                      placeholder="z.B. Querschnitt (mm²)"
                      value={newCategoryType2.characteristic3}
                      onChange={(e) => setNewCategoryType2(prev => ({ ...prev, characteristic3: e.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Label>Einträge</Label>
                      <Badge variant="outline" className="text-xs">
                        {newCategoryType2.items.length} Einträge
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      <div className="relative group">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = '.csv';
                            input.onchange = (e) => {
                              const file = (e.target as HTMLInputElement).files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = (e) => {
                                  const csv = e.target?.result as string;
                                  const lines = csv.split('\n');
                                  const items = lines
                                    .filter(line => line.trim())
                                    .map((line, index) => {
                                      const values = line.split(/[,;]/).map(v => v.trim().replace(/"/g, ''));
                                      return {
                                        id: `${Date.now()}-${index}`,
                                        value1: values[0] || '',
                                        value2: values[1] || '',
                                        value3: values[2] || ''
                                      };
                                    });
                                  setNewCategoryType2(prev => ({ ...prev, items }));
                                  toast({
                                    title: 'CSV erfolgreich importiert',
                                    description: `${items.length} Einträge geladen`,
                                  });
                                };
                                reader.readAsText(file);
                              }
                            };
                            input.click();
                          }}
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          CSV Import
                        </Button>
                        
                        {/* Hover Tooltip */}
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-[9999] w-80 shadow-lg">
                          <div className="relative">
                            <div className="mb-2 font-semibold">📁 CSV-Datei Format für Kategorie Typ 2</div>
                            <div className="space-y-2 text-xs">
                              <div>
                                <strong>Spaltenstruktur:</strong>
                                <ul className="mt-1 ml-2 space-y-1">
                                  <li>• <strong>Spalte 1:</strong> {newCategoryType2.characteristic1 || 'Merkmal 1'} (z.B. Kabeltyp)</li>
                                  <li>• <strong>Spalte 2:</strong> {newCategoryType2.characteristic2 || 'Merkmal 2'} (z.B. Anzahl Adern)</li>
                                  <li>• <strong>Spalte 3:</strong> {newCategoryType2.characteristic3 || 'Merkmal 3'} (z.B. Querschnitt)</li>
                                </ul>
                              </div>
                              <div>
                                <strong>Beispiel CSV-Inhalt:</strong>
                                <div className="mt-1 p-2 bg-gray-800 rounded font-mono text-xs">
                                  NYM;3;2.5<br/>
                                  NYM;5;1.5<br/>
                                  NYM;7;4.0<br/>
                                  H05VV;2;0.75
                                </div>
                              </div>
                              <div>
                                <strong>Wichtige Hinweise:</strong>
                                <ul className="mt-1 ml-2 space-y-1">
                                  <li>• Verwenden Sie Kommas (,) oder Semikolons (;) als Trennzeichen</li>
                                  <li>• Jede Zeile wird zu einem Eintrag</li>
                                  <li>• Leere Zeilen werden automatisch ignoriert</li>
                                  <li>• Anführungszeichen werden automatisch entfernt</li>
                                  <li>• Die Datei muss im UTF-8 Format gespeichert sein</li>
                                </ul>
                              </div>
                            </div>
                            {/* Tooltip Arrow */}
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                          </div>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addNewItemToType2}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Eintrag hinzufügen
                      </Button>
                    </div>
                  </div>


                  
                  {/* Tabellarische Ansicht der Einträge */}
                  <div className="border rounded-lg overflow-hidden">
                    {/* Tabellen-Header */}
                    <div className="bg-gray-50 border-b">
                      <div className="grid grid-cols-4 gap-0">
                        <div className="px-2 py-3 text-xs font-medium text-gray-500 border-r bg-gray-100 w-8 text-center">
                          #
                        </div>
                        <div className="px-4 py-3 text-sm font-medium text-gray-700 border-r">
                          {newCategoryType2.characteristic1 || 'Merkmal 1'}
                        </div>
                        <div className="px-4 py-3 text-sm font-medium text-gray-700 border-r">
                          {newCategoryType2.characteristic2 || 'Merkmal 2'}
                        </div>
                        <div className="px-4 py-3 text-sm font-medium text-gray-700">
                          {newCategoryType2.characteristic3 || 'Merkmal 3'}
                        </div>
                      </div>
                    </div>
                    
                    {/* Scrollbarer Tabellen-Body */}
                    <div className="max-h-64 overflow-y-auto">
                      {newCategoryType2.items.map((item, index) => (
                        <div 
                          key={item.id} 
                          className={`grid grid-cols-4 gap-0 border-b last:border-b-0 hover:bg-gray-50 transition-colors ${
                            index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                          }`}
                        >
                          <div className="px-2 py-2 border-r bg-gray-25 text-xs text-gray-500 text-center flex items-center justify-center w-8">
                            {index + 1}
                          </div>
                          <div className="px-4 py-2 border-r">
                            <Input
                              placeholder={newCategoryType2.characteristic1 || 'Merkmal 1'}
                              value={item.value1}
                              onChange={(e) => updateType2Item(index, 'value1', e.target.value)}
                              className="border-0 p-0 h-8 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-transparent"
                            />
                          </div>
                          <div className="px-4 py-2 border-r">
                            <Input
                              placeholder={newCategoryType2.characteristic2 || 'Merkmal 2'}
                              value={item.value2}
                              onChange={(e) => updateType2Item(index, 'value2', e.target.value)}
                              className="border-0 p-0 h-8 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-transparent"
                            />
                          </div>
                          <div className="px-4 py-2 flex items-center justify-between">
                            <Input
                              placeholder={newCategoryType2.characteristic3 || 'Merkmal 3'}
                              value={item.value3}
                              onChange={(e) => updateType2Item(index, 'value3', e.target.value)}
                              className="border-0 p-0 h-8 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-transparent"
                            />
                            {newCategoryType2.items.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeItemFromType2(index)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 ml-2 h-6 w-6 p-0"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={closeCategoryModal}>
                  Abbrechen
                </Button>
                <Button onClick={handleCreateCategoryType2}>
                  <Save className="w-4 h-4 mr-2" />
                  Kategorie erstellen
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Main Content */}
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
                  onClick={openCategoryModal}
                  className="bg-[#058bc0] hover:bg-[#047aa0] text-white"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Neue Kategorie
                </Button>
              )}
            </div>
          </div>

          {/* Extended Categories Section */}
          {extendedCategories.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-green-600" />
                  Erweiterte Kategorien ({extendedCategories.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {extendedCategories.map((category) => (
                    <Card key={category.id} className="border-2 hover:shadow-lg transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {category.type === 'type1' ? (
                              <Type className="w-5 h-5 text-blue-600" />
                            ) : (
                              <Database className="w-5 h-5 text-green-600" />
                            )}
                            <CardTitle className="text-sm font-medium">
                              {category.title}
                            </CardTitle>
                          </div>
                          <Badge variant={category.type === 'type1' ? 'default' : 'secondary'}>
                            {category.type === 'type1' ? 'Typ 1' : 'Typ 2'}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {category.type === 'type1' ? (
                          <div>
                            <p className="text-xs text-gray-500 mb-2">
                              Inhaltstyp: {category.contentType === 'text' ? 'Text' : 'Tabelle'}
                            </p>
                            <div className="text-sm text-gray-700 bg-gray-50 p-2 rounded">
                              {category.content.substring(0, 100)}
                              {category.content.length > 100 && '...'}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="grid grid-cols-3 gap-2 text-xs">
                              <div className="text-center">
                                <div className="font-medium text-gray-700">{category.characteristic1}</div>
                                <div className="text-gray-500">{category.items.length} Einträge</div>
                              </div>
                              <div className="text-center">
                                <div className="font-medium text-gray-700">{category.characteristic2}</div>
                              </div>
                              <div className="text-center">
                                <div className="font-medium text-gray-700">{category.characteristic3}</div>
                              </div>
                            </div>
                          </div>
                        )}
                        <div className="flex justify-between items-center text-xs text-gray-500">
                          <span>Erstellt: {category.createdAt.toLocaleDateString('de-DE')}</span>
                          <span>Aktualisiert: {category.updatedAt.toLocaleDateString('de-DE')}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

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
                    <SelectValue placeholder="Status auswählen" />
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
                      Kategorie "{deletedCategory?.title}" wurde gelöscht
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleUndoDelete}
                    size="sm"
                  >
                    Rückgängig machen
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
                          Löschen
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

      {/* Quick Action Buttons */}
      <QuickActionButtons onNavigate={onNavigate} hasPermission={hasPermission} currentPage="categories" />

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
