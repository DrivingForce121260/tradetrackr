// ============================================================================
// CATEGORY MANAGER COMPONENT
// ============================================================================
// Portal-based Category Manager UI for managing hierarchical categories
// Located at: /portal/settings/categories (integrated into Settings tabs)

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Move, 
  ArrowUp, 
  ArrowDown,
  Folder,
  FolderOpen,
  X,
  GripVertical
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Category, 
  CategoryTreeNode 
} from '@/types/category';
import {
  fetchCategoriesForOrg,
  buildCategoryTree,
  createCategory,
  renameCategory,
  moveCategory,
  deleteCategory,
  reorderCategories
} from '@/lib/categories/categoryHelpers';

interface CategoryManagerProps {
  onBack?: () => void;
  onOpenMessaging?: () => void;
}

const CategoryManager: React.FC<CategoryManagerProps> = ({ onBack, onOpenMessaging }) => {
  const { user, hasPermission } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryTree, setCategoryTree] = useState<CategoryTreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoot, setSelectedRoot] = useState<string | null>(null);
  const [selectedMiddle, setSelectedMiddle] = useState<string | null>(null);
  
  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  // Form states
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryParentId, setNewCategoryParentId] = useState<string | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');
  const [movingCategoryId, setMovingCategoryId] = useState<string | null>(null);
  const [movingToParentId, setMovingToParentId] = useState<string | null>(null);
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null);
  
  const canManageCategories = hasPermission('manage_categories') || hasPermission('admin');

  // Load categories
  const loadCategories = useCallback(async () => {
    if (!user?.concernID) return;
    
    setLoading(true);
    try {
      const fetchedCategories = await fetchCategoriesForOrg(user.concernID);
      setCategories(fetchedCategories);
      const tree = buildCategoryTree(fetchedCategories.filter(c => c.active));
      setCategoryTree(tree);
    } catch (error: any) {
      toast({
        title: 'Fehler',
        description: `Kategorien konnten nicht geladen werden: ${error.message}`,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [user?.concernID, user?.ConcernID]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // Get root categories
  const rootCategories = categoryTree.filter(cat => cat.depth === 0);

  // Get children of selected root
  const middleCategories = selectedRoot
    ? categoryTree.find(cat => cat.categoryId === selectedRoot)?.children || []
    : [];

  // Get children of selected middle
  const deepCategories = selectedMiddle
    ? middleCategories.find(cat => cat.categoryId === selectedMiddle)?.children || []
    : [];

  // Handle create category
  const handleCreateCategory = async () => {
    const orgId = user?.concernID || user?.ConcernID;
    if (!newCategoryName.trim() || !orgId) return;

    try {
      await createCategory({
        orgId: orgId,
        parentId: newCategoryParentId,
        name: newCategoryName.trim()
      });
      
      toast({
        title: 'Erfolg',
        description: 'Kategorie wurde erstellt'
      });
      
      setShowCreateDialog(false);
      setNewCategoryName('');
      setNewCategoryParentId(null);
      await loadCategories();
    } catch (error: any) {
      toast({
        title: 'Fehler',
        description: `Kategorie konnte nicht erstellt werden: ${error.message}`,
        variant: 'destructive'
      });
    }
  };

  // Handle rename category
  const handleRenameCategory = async () => {
    if (!editingCategoryId || !editingCategoryName.trim()) return;

    try {
      await renameCategory({
        categoryId: editingCategoryId,
        newName: editingCategoryName.trim()
      });
      
      toast({
        title: 'Erfolg',
        description: 'Kategorie wurde umbenannt'
      });
      
      setShowRenameDialog(false);
      setEditingCategoryId(null);
      setEditingCategoryName('');
      await loadCategories();
    } catch (error: any) {
      toast({
        title: 'Fehler',
        description: `Kategorie konnte nicht umbenannt werden: ${error.message}`,
        variant: 'destructive'
      });
    }
  };

  // Handle move category
  const handleMoveCategory = async () => {
    if (!movingCategoryId) return;

    try {
      await moveCategory({
        categoryId: movingCategoryId,
        newParentId: movingToParentId
      });
      
      toast({
        title: 'Erfolg',
        description: 'Kategorie wurde verschoben'
      });
      
      setShowMoveDialog(false);
      setMovingCategoryId(null);
      setMovingToParentId(null);
      setSelectedRoot(null);
      setSelectedMiddle(null);
      await loadCategories();
    } catch (error: any) {
      toast({
        title: 'Fehler',
        description: `Kategorie konnte nicht verschoben werden: ${error.message}`,
        variant: 'destructive'
      });
    }
  };

  // Handle delete category
  const handleDeleteCategory = async () => {
    if (!deletingCategoryId) return;

    try {
      await deleteCategory(deletingCategoryId, true);
      
      toast({
        title: 'Erfolg',
        description: 'Kategorie wurde deaktiviert'
      });
      
      setShowDeleteDialog(false);
      setDeletingCategoryId(null);
      await loadCategories();
    } catch (error: any) {
      toast({
        title: 'Fehler',
        description: `Kategorie konnte nicht gelöscht werden: ${error.message}`,
        variant: 'destructive'
      });
    }
  };

  // Handle reorder (move up/down)
  const handleReorder = async (categoryId: string, direction: 'up' | 'down') => {
    const category = categories.find(c => c.categoryId === categoryId);
    if (!category) return;

    const siblings = categories.filter(
      c => c.parentId === category.parentId && c.active
    ).sort((a, b) => a.sortOrder - b.sortOrder);

    const currentIndex = siblings.findIndex(c => c.categoryId === categoryId);
    if (currentIndex === -1) return;

    let newIndex: number;
    if (direction === 'up' && currentIndex > 0) {
      newIndex = currentIndex - 1;
    } else if (direction === 'down' && currentIndex < siblings.length - 1) {
      newIndex = currentIndex + 1;
    } else {
      return;
    }

    const newSortOrder = siblings[newIndex].sortOrder;

    try {
      await reorderCategories(categoryId, newSortOrder);
      await loadCategories();
    } catch (error: any) {
      toast({
        title: 'Fehler',
        description: `Reihenfolge konnte nicht geändert werden: ${error.message}`,
        variant: 'destructive'
      });
    }
  };

  // Render category list
  const renderCategoryList = (
    items: CategoryTreeNode[],
    level: 'root' | 'middle' | 'deep',
    onSelect?: (categoryId: string) => void
  ) => {
    if (items.length === 0) {
      return (
        <div className="text-sm text-gray-500 text-center py-8">
          Keine Kategorien vorhanden
        </div>
      );
    }

    return (
      <div className="space-y-1">
        {items.map((category) => (
          <div
            key={category.categoryId}
            className={`
              flex items-center justify-between p-2 rounded-lg border
              ${level === 'root' && selectedRoot === category.categoryId
                ? 'bg-blue-50 border-blue-300'
                : level === 'middle' && selectedMiddle === category.categoryId
                ? 'bg-blue-50 border-blue-300'
                : 'bg-white border-gray-200 hover:border-gray-300'
              }
              ${!category.active ? 'opacity-50' : ''}
            `}
          >
            <div className="flex items-center gap-2 flex-1">
              {level === 'root' && (
                <Folder className="h-4 w-4 text-blue-500" />
              )}
              {level === 'middle' && (
                <FolderOpen className="h-4 w-4 text-green-500" />
              )}
              {level === 'deep' && (
                <GripVertical className="h-4 w-4 text-gray-400" />
              )}
              <span
                className="flex-1 cursor-pointer"
                onClick={() => onSelect?.(category.categoryId)}
              >
                {category.name}
              </span>
              {!category.active && (
                <Badge variant="outline" className="text-xs">(inaktiv)</Badge>
              )}
              {category.children && category.children.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {category.children.length}
                </Badge>
              )}
            </div>
            
            {canManageCategories && (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleReorder(category.categoryId, 'up')}
                  disabled={!category.active}
                  className="h-6 w-6 p-0"
                >
                  <ArrowUp className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleReorder(category.categoryId, 'down')}
                  disabled={!category.active}
                  className="h-6 w-6 p-0"
                >
                  <ArrowDown className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditingCategoryId(category.categoryId);
                    setEditingCategoryName(category.name);
                    setShowRenameDialog(true);
                  }}
                  disabled={!category.active}
                  className="h-6 w-6 p-0"
                >
                  <Edit className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setMovingCategoryId(category.categoryId);
                    setMovingToParentId(category.parentId);
                    setShowMoveDialog(true);
                  }}
                  disabled={!category.active}
                  className="h-6 w-6 p-0"
                >
                  <Move className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setDeletingCategoryId(category.categoryId);
                    setShowDeleteDialog(true);
                  }}
                  className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  // Build flat list of all categories for parent selection
  const getAllCategoriesFlat = (nodes: CategoryTreeNode[]): CategoryTreeNode[] => {
    const result: CategoryTreeNode[] = [];
    const traverse = (items: CategoryTreeNode[]) => {
      items.forEach(item => {
        result.push(item);
        if (item.children) {
          traverse(item.children);
        }
      });
    };
    traverse(nodes);
    return result;
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-[#058bc0] mx-auto mb-4"></div>
        <p className="text-gray-600 font-medium">Lade Kategorien...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Kategorien verwalten</h2>
          <p className="text-sm text-gray-600 mt-1">
            Hierarchische Kategorienstruktur für Projekte, Materialien und Aufgaben
          </p>
        </div>
        {canManageCategories && (
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-[#058bc0] to-[#0470a0] text-white">
                <Plus className="h-4 w-4 mr-2" />
                Neue Kategorie
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Neue Kategorie erstellen</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Name</label>
                  <Input
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="Kategoriename"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Übergeordnete Kategorie (optional)</label>
                  <select
                    value={newCategoryParentId || ''}
                    onChange={(e) => setNewCategoryParentId(e.target.value || null)}
                    className="mt-1 w-full p-2 border rounded-lg"
                  >
                    <option value="">Keine (Root-Kategorie)</option>
                    {getAllCategoriesFlat(categoryTree).map(cat => (
                      <option key={cat.categoryId} value={cat.categoryId}>
                        {cat.path.join(' > ')}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Abbrechen
                </Button>
                <Button onClick={handleCreateCategory} disabled={!newCategoryName.trim()}>
                  Erstellen
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Three-column layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Left: Root categories */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Root-Kategorien</CardTitle>
          </CardHeader>
          <CardContent>
            {renderCategoryList(rootCategories, 'root', (categoryId) => {
              setSelectedRoot(categoryId);
              setSelectedMiddle(null);
            })}
          </CardContent>
        </Card>

        {/* Middle: Children of selected root */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {selectedRoot ? 'Unterkategorien' : 'Wählen Sie eine Root-Kategorie'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedRoot ? (
              <>
                {renderCategoryList(middleCategories, 'middle', (categoryId) => {
                  setSelectedMiddle(categoryId);
                })}
                {canManageCategories && middleCategories.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-2"
                    onClick={() => {
                      setNewCategoryParentId(selectedRoot);
                      setShowCreateDialog(true);
                    }}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Unterkategorie hinzufügen
                  </Button>
                )}
              </>
            ) : (
              <div className="text-sm text-gray-500 text-center py-8">
                Wählen Sie eine Root-Kategorie aus
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right: Children of selected middle */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {selectedMiddle ? 'Weitere Unterkategorien' : 'Wählen Sie eine Unterkategorie'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedMiddle ? (
              <>
                {renderCategoryList(deepCategories, 'deep')}
                {canManageCategories && deepCategories.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-2"
                    onClick={() => {
                      setNewCategoryParentId(selectedMiddle);
                      setShowCreateDialog(true);
                    }}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Unterkategorie hinzufügen
                  </Button>
                )}
              </>
            ) : (
              <div className="text-sm text-gray-500 text-center py-8">
                {selectedRoot ? 'Wählen Sie eine Unterkategorie aus' : 'Wählen Sie zuerst eine Root-Kategorie'}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Rename Dialog */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kategorie umbenennen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Neuer Name</label>
              <Input
                value={editingCategoryName}
                onChange={(e) => setEditingCategoryName(e.target.value)}
                placeholder="Kategoriename"
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRenameDialog(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleRenameCategory} disabled={!editingCategoryName.trim()}>
              Umbenennen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move Dialog */}
      <Dialog open={showMoveDialog} onOpenChange={setShowMoveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kategorie verschieben</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Neue übergeordnete Kategorie</label>
              <select
                value={movingToParentId || ''}
                onChange={(e) => setMovingToParentId(e.target.value || null)}
                className="mt-1 w-full p-2 border rounded-lg"
              >
                <option value="">Keine (Root-Kategorie)</option>
                {getAllCategoriesFlat(categoryTree)
                  .filter(cat => cat.categoryId !== movingCategoryId)
                  .map(cat => (
                    <option key={cat.categoryId} value={cat.categoryId}>
                      {cat.path.join(' > ')}
                    </option>
                  ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMoveDialog(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleMoveCategory}>
              Verschieben
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kategorie deaktivieren</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600">
            Möchten Sie diese Kategorie wirklich deaktivieren? Sie wird aus den Auswahlfeldern ausgeblendet, aber nicht gelöscht.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleDeleteCategory} variant="destructive">
              Deaktivieren
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CategoryManager;

