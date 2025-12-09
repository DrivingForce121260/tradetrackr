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
import { Plus, Save, Edit, Trash2, Upload, Download, Search, Filter, Eye, EyeOff, ArrowUpDown, ArrowUp, ArrowDown, Table as TableIcon, Package, X, Building, Calendar, Hash, BarChart3, Settings, CheckCircle, AlertCircle, FolderOpen, CheckSquare, User, Building2, FileText, Archive, Type, Database, RefreshCw, Copy, Sparkles, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import AppHeader from './AppHeader';
import { addDoc, collection, serverTimestamp, getDocs, query, where, orderBy, deleteDoc } from 'firebase/firestore';
import { db, storage, functions } from '@/config/firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { httpsCallable } from 'firebase/functions';
import { AICategory2Payload, ImportAnalysisResponse, CommitRequest, ImportError } from '@/types/categoryImport';

import { Category, CategoryItem, CategoriesProps } from '@/types';
import { useQuickAction } from '@/contexts/QuickActionContext';

// Neue Typen für die erweiterten Kategorien
interface CategoryType1 {
  id: string;
  title: string;
  type: 'type1';
  content: string;
  contentType: 'text' | 'table';
  createdAt: Date;
  updatedAt: Date;
  concernId?: string;
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
    order?: number;
    value1: string;
    value2: string;
    value3: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
  concernId?: string;
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
    contentType: 'text' as 'text' | 'table' | 'file',
    tableInputMethod: 'direct' as 'direct' | 'csv',
    tableHeaders: ['', '', ''],
    tableData: [['', '', '']],
    tableColumns: 3,
    uploadedFile: null as { name: string; url: string; type: string; size: number } | null,
    parsedFileData: null as { headers: string[]; rows: string[][] } | null
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

  // Upload dialog states
  const [selectedCategoryForUpload, setSelectedCategoryForUpload] = useState<ExtendedCategory | null>(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [isEditingCategory, setIsEditingCategory] = useState(false);
  const [editingCategoryData, setEditingCategoryData] = useState<ExtendedCategory | null>(null);
  const [showCloneConfirmation, setShowCloneConfirmation] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<ExtendedCategory | null>(null);
  const [isCloning, setIsCloning] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Sorting states for the editing table
  const [editSortColumn, setEditSortColumn] = useState<'order' | 'value1' | 'value2' | 'value3' | null>(null);
  const [editSortDirection, setEditSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // Loading and retry states
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoriesLoadError, setCategoriesLoadError] = useState<string | null>(null);

  // File input ref for spreadsheet import
  const fileInputRef = useRef<HTMLInputElement>(null);

  // AI Import states
  const [aiImportState, setAiImportState] = useState<'idle' | 'uploading' | 'analyzing' | 'validating' | 'preview' | 'error'>('idle');
  const [aiImportFile, setAiImportFile] = useState<File | null>(null);
  const [aiPreview, setAiPreview] = useState<AICategory2Payload | null>(null);
  const [aiJobId, setAiJobId] = useState<string | null>(null);
  const [aiError, setAiError] = useState<ImportError | null>(null);
  const [aiUpdateExisting, setAiUpdateExisting] = useState(false);
  const [aiPreviewViewMode, setAiPreviewViewMode] = useState<'table' | 'json'>('table');
  const [aiCategoryName, setAiCategoryName] = useState('');
  const aiFileInputRef = useRef<HTMLInputElement>(null);

  // CSV upload handler for Type 1 categories
  const handleCSVUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text) {
        // Parse CSV and convert to table format
        const lines = text.split('\n').filter(line => line.trim());
        if (lines.length > 0) {
          // Split first line to determine number of columns
          const firstLine = lines[0];
          const columns = firstLine.split(',').map(col => col.trim());
          const numColumns = columns.length;
          
          // Convert all lines to table data
          const tableData = lines.map(line => {
            const cells = line.split(',').map(cell => cell.trim());
            // Ensure all rows have the same number of columns
            while (cells.length < numColumns) {
              cells.push('');
            }
            return cells.slice(0, numColumns);
          });
          
          // Update state with parsed table data
          setNewCategoryType1(prev => ({
            ...prev,
            tableColumns: numColumns,
            tableHeaders: columns,
            tableData: tableData,
            content: text, // Keep original CSV for storage
            csvFile: file
          }));
          
          toast({
            title: 'CSV erfolgreich geladen',
            description: `${file.name} wurde erfolgreich verarbeitet - ${tableData.length} Zeilen, ${numColumns} Spalten`,
          });
        }
      }
    };
    reader.readAsText(file);
  };

  // Convert table data to CSV format
  const convertTableToCSV = () => {
    if (newCategoryType1.contentType === 'table' && newCategoryType1.tableInputMethod === 'direct') {
      const headers = newCategoryType1.tableHeaders || [];
      const data = newCategoryType1.tableData || [];
      
      // Create CSV content
      const csvLines = [];
      
      // Add headers
      if (headers.some(h => h.trim())) {
        csvLines.push(headers.join(','));
      }
      
      // Add data rows
      data.forEach(row => {
        if (row.some(cell => cell.trim())) {
          csvLines.push(row.join(','));
        }
      });
      
      const csvContent = csvLines.join('\n');
      setNewCategoryType1(prev => ({ ...prev, content: csvContent }));
      return csvContent;
    }
    return newCategoryType1.content;
  };

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

  // Load categories from Firestore
  useEffect(() => {
    const loadCategoriesFromFirestore = async () => {
      if (!user?.concernID) {
        console.log('No user concernID available, will retry...');
        return;
      }

      setCategoriesLoading(true);
      setCategoriesLoadError(null);
      console.log('Loading categories from Firestore for concernID:', user.concernID);

      try {
        // Load concern-specific categories
        const concernQuery = query(
          collection(db, 'lookupFamilies'),
          where('concernId', '==', user.concernID)
        );
        
        console.log('Querying concern-specific categories...');
        const concernSnapshot = await getDocs(concernQuery);
        console.log('Found concern-specific categories:', concernSnapshot.docs.length);
        
        // Load generic categories
        const genericQuery = query(
          collection(db, 'lookupFamilies'),
          where('concernId', '==', 'LUFGENERIC')
        );

        console.log('Querying generic categories...');
        const genericSnapshot = await getDocs(genericQuery);
        console.log('Found generic categories:', genericSnapshot.docs.length);

        // Process concern-specific categories
        const concernCategories: ExtendedCategory[] = [];
        for (const doc of concernSnapshot.docs) {
          const data = doc.data();
          console.log('Processing concern category:', data.familyName);
          
          try {
            // Load options for this family
            const optionsQuery = query(
              collection(db, 'lookupOptions'),
              where('familyId', '==', data.familyId)
            );
            const optionsSnapshot = await getDocs(optionsQuery);
            console.log('Found options for concern category:', data.familyName, ':', optionsSnapshot.docs.length);
            
            // Also try to find options by familyName if familyId search didn't return enough results
            let allOptions = optionsSnapshot.docs;
            if (optionsSnapshot.docs.length < 50) { // If we found very few results, try familyName
              const nameOptionsQuery = query(
                collection(db, 'lookupOptions'),
                where('familyId', '==', data.familyName)
              );
              const nameOptionsSnapshot = await getDocs(nameOptionsQuery);
              console.log('Found additional options by familyName:', nameOptionsSnapshot.docs.length);
              
              // Combine both results, avoiding duplicates
              const existingIds = new Set(optionsSnapshot.docs.map(doc => doc.id));
              const additionalOptions = nameOptionsSnapshot.docs.filter(doc => !existingIds.has(doc.id));
              allOptions = [...optionsSnapshot.docs, ...additionalOptions];
            }
            
            // For concern-specific categories, also search for options that might be shared
            if (allOptions.length < 50) {
              console.log('Concern category with few options, searching for additional options...');
              
              // Search for options that match the familyId but may have different concernId values
              const sharedOptionsQuery = query(
                collection(db, 'lookupOptions'),
                where('familyId', '==', data.familyId)
              );
              const sharedOptionsSnapshot = await getDocs(sharedOptionsQuery);
              console.log('Found shared options by familyId:', sharedOptionsSnapshot.docs.length);
              
              // Also search by familyName
              const sharedNameOptionsQuery = query(
                collection(db, 'lookupOptions'),
                where('familyId', '==', data.familyName)
              );
              const sharedNameOptionsSnapshot = await getDocs(sharedNameOptionsQuery);
              console.log('Found shared options by familyName:', sharedNameOptionsSnapshot.docs.length);
              
              // Combine all results, avoiding duplicates
              const allExistingIds = new Set(allOptions.map(doc => doc.id));
              const sharedOptions = [...sharedOptionsSnapshot.docs, ...sharedNameOptionsSnapshot.docs]
                .filter(doc => !allExistingIds.has(doc.id));
              
              allOptions = [...allOptions, ...sharedOptions];
              console.log('Total options after shared search:', allOptions.length);
            }
            
            console.log('Total options found:', allOptions.length);
            
            // Determine category type based on available data
            const hasLevels = data.level0 && data.level1 && data.level2;
            
            if (hasLevels) {
              // Type 2 category - organize options by level and order
              const level1Options = allOptions
                .filter(doc => doc.data().level === 1)
                .sort((a, b) => (a.data().order || 0) - (b.data().order || 0));
              const level2Options = allOptions
                .filter(doc => doc.data().level === 2)
                .sort((a, b) => (a.data().order || 0) - (b.data().order || 0));
              const level3Options = allOptions
                .filter(doc => doc.data().level === 3)
                .sort((a, b) => (a.data().order || 0) - (b.data().order || 0));
              
              console.log(`Level options for ${data.familyName}:`, {
                level1: level1Options.length,
                level2: level2Options.length,
                level3: level3Options.length
              });
              
              // Create items array with proper structure using order from database
              const items = [];
              
              // Get all unique order values from all levels
              const allOrders = new Set([
                ...level1Options.map(doc => doc.data().order || 0),
                ...level2Options.map(doc => doc.data().order || 0),
                ...level3Options.map(doc => doc.data().order || 0)
              ]);
              
              // Sort orders and create items
              const sortedOrders = Array.from(allOrders).sort((a, b) => a - b);
              
              console.log(`Total unique orders for ${data.familyName}:`, sortedOrders.length);
              
              for (const order of sortedOrders) {
                const level1Option = level1Options.find(doc => doc.data().order === order);
                const level2Option = level2Options.find(doc => doc.data().order === order);
                const level3Option = level3Options.find(doc => doc.data().order === order);
                
                // Create item even if some levels are missing
                const item = {
                  id: `item-${order}`,
                  order: order,
                  value1: level1Option?.data().value || '',
                  value2: level2Option?.data().value || '',
                  value3: level3Option?.data().value || ''
                };
                
                // Only add item if it has at least one value
                if (item.value1 || item.value2 || item.value3) {
                  items.push(item);
                }
              }

              console.log(`Created ${items.length} items for ${data.familyName}`);

              concernCategories.push({
                id: doc.id,
                title: data.familyName,
                type: 'type2',
                characteristic1: data.level0 || 'Merkmal 1',
                characteristic2: data.level1 || 'Merkmal 2',
                characteristic3: data.level2 || 'Merkmal 3',
                items: items, // Remove the filter - show all items
                createdAt: data.createdAt?.toDate() || new Date(),
                updatedAt: data.updatedAt?.toDate() || new Date(),
                concernId: data.concernId
              });
            } else {
              // Type 1 category
              const contentOption = allOptions.find(doc => doc.data().level === 1);
              concernCategories.push({
                id: doc.id,
                title: data.familyName,
                type: 'type1',
                content: contentOption?.data().value || 'Kein Inhalt verfügbar',
                contentType: 'text',
                createdAt: data.createdAt?.toDate() || new Date(),
                updatedAt: data.updatedAt?.toDate() || new Date(),
                concernId: data.concernId
              });
            }
          } catch (optionError) {
            console.error('Error processing options for category:', data.familyName, optionError);
          }
        }

        // Process generic categories (same logic as concern-specific)
        const genericCategories: ExtendedCategory[] = [];
        for (const doc of genericSnapshot.docs) {
          const data = doc.data();
          console.log('Processing generic category:', data.familyName);
          
          try {
            // Load options for this family
            const optionsQuery = query(
              collection(db, 'lookupOptions'),
              where('familyId', '==', data.familyId)
            );
            const optionsSnapshot = await getDocs(optionsQuery);
            console.log('Found options for generic', data.familyName, ':', optionsSnapshot.docs.length);
            
            // Also try to find options by familyName if familyId search didn't return enough results
            let allOptions = optionsSnapshot.docs;
            if (optionsSnapshot.docs.length < 50) { // If we found very few results, try familyName
              const nameOptionsQuery = query(
                collection(db, 'lookupOptions'),
                where('familyId', '==', data.familyName)
              );
              const nameOptionsSnapshot = await getDocs(nameOptionsQuery);
              console.log('Found additional options by familyName:', nameOptionsSnapshot.docs.length);
              
              // Combine both results, avoiding duplicates
              const existingIds = new Set(optionsSnapshot.docs.map(doc => doc.id));
              const additionalOptions = nameOptionsSnapshot.docs.filter(doc => !existingIds.has(doc.id));
              allOptions = [...optionsSnapshot.docs, ...additionalOptions];
            }
            
            // For generic categories, also search without concernId constraint to find all related options
            if (data.concernId === 'LUFGENERIC' && allOptions.length < 100) {
              console.log('Generic category detected, searching for all related options...');
              
              // Search for options that match the familyId but may have different concernId values
              const genericOptionsQuery = query(
                collection(db, 'lookupOptions'),
                where('familyId', '==', data.familyId)
              );
              const genericOptionsSnapshot = await getDocs(genericOptionsQuery);
              console.log('Found generic options by familyId:', genericOptionsSnapshot.docs.length);
              
              // Also search by familyName
              const genericNameOptionsQuery = query(
                collection(db, 'lookupOptions'),
                where('familyId', '==', data.familyName)
              );
              const genericNameOptionsSnapshot = await getDocs(genericNameOptionsQuery);
              console.log('Found generic options by familyName:', genericNameOptionsSnapshot.docs.length);
              
              // Additional search: look for options where familyId might be set to the familyName
              const additionalGenericQuery = query(
                collection(db, 'lookupOptions'),
                where('familyId', '==', data.familyName)
              );
              const additionalGenericSnapshot = await getDocs(additionalGenericQuery);
              console.log('Found additional generic options by familyName:', additionalGenericSnapshot.docs.length);
              
              // Search for options that might have the LUFGENERIC concernId
              const genericConcernQuery = query(
                collection(db, 'lookupOptions'),
                where('concernId', '==', 'LUFGENERIC')
              );
              const genericConcernSnapshot = await getDocs(genericConcernQuery);
              console.log('Found generic options by concernId LUFGENERIC:', genericConcernSnapshot.docs.length);
              
              // Combine all results, avoiding duplicates
              const allExistingIds = new Set(allOptions.map(doc => doc.id));
              const genericOptions = [
                ...genericOptionsSnapshot.docs, 
                ...genericNameOptionsSnapshot.docs, 
                ...additionalGenericSnapshot.docs,
                ...genericConcernSnapshot.docs
              ].filter(doc => !allExistingIds.has(doc.id));
              
              allOptions = [...allOptions, ...genericOptions];
              console.log('Total options after generic search:', allOptions.length);
            }
            
            console.log('Total options found:', allOptions.length);
            
            // Determine category type based on available data
            const hasLevels = data.level0 && data.level1 && data.level2;
            
            if (hasLevels) {
              // Type 2 category - organize options by level and order
              const level1Options = allOptions
                .filter(doc => doc.data().level === 1)
                .sort((a, b) => (a.data().order || 0) - (b.data().order || 0));
              const level2Options = allOptions
                .filter(doc => doc.data().level === 2)
                .sort((a, b) => (a.data().order || 0) - (b.data().order || 0));
              const level3Options = allOptions
                .filter(doc => doc.data().level === 3)
                .sort((a, b) => (a.data().order || 0) - (b.data().order || 0));
              
              console.log(`Level options for ${data.familyName}:`, {
                level1: level1Options.length,
                level2: level2Options.length,
                level3: level3Options.length
              });
              
              // Create items array with proper structure using order from database
              const items = [];
              
              // Get all unique order values from all levels
              const allOrders = new Set([
                ...level1Options.map(doc => doc.data().order || 0),
                ...level2Options.map(doc => doc.data().order || 0),
                ...level3Options.map(doc => doc.data().order || 0)
              ]);
              
              // Sort orders and create items
              const sortedOrders = Array.from(allOrders).sort((a, b) => a - b);
              
              console.log(`Total unique orders for ${data.familyName}:`, sortedOrders.length);
              
              for (const order of sortedOrders) {
                const level1Option = level1Options.find(doc => doc.data().order === order);
                const level2Option = level2Options.find(doc => doc.data().order === order);
                const level3Option = level3Options.find(doc => doc.data().order === order);
                
                // Create item even if some levels are missing
                const item = {
                  id: `item-${order}`,
                  order: order,
                  value1: level1Option?.data().value || '',
                  value2: level2Option?.data().value || '',
                  value3: level3Option?.data().value || ''
                };
                
                // Only add item if it has at least one value
                if (item.value1 || item.value2 || item.value3) {
                  items.push(item);
                }
              }

              console.log(`Created ${items.length} items for ${data.familyName}`);

              genericCategories.push({
                id: doc.id,
                title: data.familyName,
                type: 'type2',
                characteristic1: data.level0 || 'Merkmal 1',
                characteristic2: data.level1 || 'Merkmal 2',
                characteristic3: data.level2 || 'Merkmal 3',
                items: items, // Remove the filter - show all items
                createdAt: data.createdAt?.toDate() || new Date(),
                updatedAt: data.updatedAt?.toDate() || new Date(),
                concernId: data.concernId
              });
            } else {
              // Type 1 category
              const contentOption = allOptions.find(doc => doc.data().level === 1);
              genericCategories.push({
                id: doc.id,
                title: data.familyName,
                type: 'type1',
                content: contentOption?.data().value || 'Kein Inhalt verfügbar',
                contentType: 'text',
                createdAt: data.createdAt?.toDate() || new Date(),
                updatedAt: data.updatedAt?.toDate() || new Date(),
                concernId: data.concernId
              });
            }
          } catch (optionError) {
            console.error('Error processing options for generic category:', data.familyName, optionError);
          }
        }

        console.log('Total categories loaded:', concernCategories.length + genericCategories.length);
        console.log('Concern categories:', concernCategories.length);
        console.log('Generic categories:', genericCategories.length);

        // Combine both types
        setExtendedCategories([...concernCategories, ...genericCategories]);
        
        setCategoriesLoading(false);
        
        toast({
          title: 'Kategorien geladen',
          description: `${concernCategories.length + genericCategories.length} Kategorien aus der Datenbank geladen`,
        });
        
      } catch (error) {
        console.error('Error loading categories from Firestore:', error);
        
        // Detaillierte Fehlerbehandlung
        let errorMessage = 'Kategorien konnten nicht aus der Datenbank geladen werden';
        
        if (error instanceof Error) {
          if (error.message.includes('permission-denied') || error.message.includes('Missing or insufficient permissions')) {
            errorMessage = 'Keine Berechtigung zum Laden der Kategorien aus der Datenbank';
          } else if (error.message.includes('unavailable')) {
            errorMessage = 'Datenbank ist derzeit nicht verfügbar';
          } else if (error.message.includes('unauthenticated')) {
            errorMessage = 'Sie sind nicht angemeldet';
          } else if (error.message.includes('indexes')) {
            errorMessage = 'Datenbank-Indexe fehlen. Bitte kontaktieren Sie den Administrator.';
          } else {
            errorMessage = `Fehler: ${error.message}`;
          }
        }
        
        setCategoriesLoading(false);
        setCategoriesLoadError(errorMessage);
        
        toast({
          title: 'Fehler beim Laden der Kategorien',
          description: errorMessage,
          variant: 'destructive',
        });
      }
    };

    if (user?.concernID) {
      loadCategoriesFromFirestore();
    } else if (user && !user.concernID) {
      // Retry after a short delay if user exists but concernID is missing
      const retryTimer = setTimeout(() => {
        if (user?.concernID) {
          loadCategoriesFromFirestore();
        }
      }, 1000);
      
      return () => clearTimeout(retryTimer);
    }
  }, [user?.concernID, user]);

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
  const handleCreateCategoryType1 = async () => {
    if (!newCategoryType1.title.trim()) {
      toast({
        title: 'Titel ist erforderlich',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Get concernId from user context
      const concernId = user?.concernID || 'default-concern';
      
      // Create lookupFamilies document for Type 1
      const familyData = {
        concernId: concernId,
        familyId: newCategoryType1.title,
        familyName: newCategoryType1.title,
        level0: 'Information',
        level1: 'Content',
        level2: 'Type',
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1
      };

      // Save to Firestore
      const familyRef = await addDoc(collection(db, 'lookupFamilies'), {
        ...familyData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Convert table data to CSV if needed
      let finalContent = newCategoryType1.content;
      if (newCategoryType1.contentType === 'table' && newCategoryType1.tableInputMethod === 'direct') {
        finalContent = convertTableToCSV();
      }

      // Create lookupOptions document for the content
      await addDoc(collection(db, 'lookupOptions'), {
        concernId: concernId,
        familyId: newCategoryType1.title,
        key: 'Content',
        level: 1,
        order: 1,
        parent_Type: 'Information',
        value: finalContent,
        valueNumber: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      const newCategory: CategoryType1 = {
        id: familyRef.id, // Use Firestore document ID
        title: newCategoryType1.title,
        type: 'type1',
        content: newCategoryType1.content,
        contentType: newCategoryType1.contentType,
        createdAt: new Date(),
        updatedAt: new Date(),
        concernId: concernId,
      };

      setExtendedCategories(prev => [...prev, newCategory]);
      
      // Reset form
      setNewCategoryType1({
        title: '',
        content: '',
        contentType: 'text',
        tableInputMethod: 'direct',
        tableHeaders: ['', '', ''],
        tableData: [['', '', '']],
        tableColumns: 3
      });
      
      setSelectedCategoryType(null);
      setShowCategoryModal(false);
      
      toast({
        title: 'Kategorie Typ 1 erfolgreich erstellt',
        description: `${newCategory.title} wurde in Firestore gespeichert`,
      });
      
    } catch (error) {
      console.error('Error saving to Firestore:', error);
      
      // Detaillierte Fehlerbehandlung
      let errorMessage = 'Kategorie konnte nicht in der Datenbank gespeichert werden';
      
      if (error instanceof Error) {
        if (error.message.includes('permission-denied') || error.message.includes('Missing or insufficient permissions')) {
          errorMessage = 'Keine Berechtigung zum Speichern in der Datenbank';
        } else if (error.message.includes('unavailable')) {
          errorMessage = 'Datenbank ist derzeit nicht verfügbar';
        } else if (error.message.includes('unauthenticated')) {
          errorMessage = 'Sie sind nicht angemeldet';
        } else {
          errorMessage = `Fehler: ${error.message}`;
        }
      }
      
      toast({
        title: 'Fehler beim Speichern',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  // AI Import Handler Functions
  const handleAIImportClick = () => {
    aiFileInputRef.current?.click();
  };

  const handleAIFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['.pdf', '.csv', '.xlsx', '.xls', '.json', '.txt', '.xml'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowedTypes.includes(fileExtension)) {
      toast({
        title: 'Ungültiger Dateityp',
        description: 'Erlaubte Formate: PDF, CSV, XLSX, XLS, JSON, TXT, XML',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (15 MB)
    const maxSize = 15 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: 'Datei zu groß',
        description: 'Maximale Dateigröße: 15 MB',
        variant: 'destructive',
      });
      return;
    }

    setAiImportFile(file);
    setAiError(null);
    await handleAIFileUpload(file);
  };

  const handleAIFileUpload = async (file: File) => {
    if (!user?.uid) {
      toast({
        title: 'Fehler',
        description: 'Bitte melden Sie sich an',
        variant: 'destructive',
      });
      return;
    }

    try {
      setAiImportState('uploading');

      // Upload file to Storage
      const timestamp = Date.now();
      const fileName = `${timestamp}-${file.name}`;
      const storagePath = `kategorien/${user.uid}/${fileName}`;
      const storageRef = ref(storage, storagePath);

      console.log('Uploading file:', { storagePath, uid: user.uid, fileName });

      const uploadTask = uploadBytesResumable(storageRef, file);

      await new Promise<void>((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            // Progress can be tracked here if needed
          },
          (error) => {
            reject(error);
          },
          async () => {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            resolve();
          }
        );
      });

      setAiImportState('analyzing');

      // Call Cloud Function for analysis
      const aiCategory2Import = httpsCallable<{ filePath: string; projectId?: string; userId: string }, ImportAnalysisResponse>(functions, 'aiCategory2Import');
      
      const result = await aiCategory2Import({
        filePath: storagePath,
        userId: user.uid,
        projectId: user.concernID,
      });

      const analysis = result.data;
      setAiJobId(analysis.jobId);
      setAiPreview(analysis.preview);
      setAiImportState('preview');
      
      toast({
        title: 'Analyse abgeschlossen',
        description: `${analysis.stats.familiesCount} Familien, ${analysis.stats.optionsCount} Optionen erkannt`,
      });
    } catch (error: any) {
      console.error('AI Import error:', error);
      setAiImportState('error');
      const errorMessage = error.message || 'Unbekannter Fehler';
      setAiError({
        type: 'AI_ERROR',
        message: errorMessage,
        details: error.details,
      });
      toast({
        title: 'Fehler beim Import',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  const handleAICommit = async () => {
    if (!aiJobId || !aiPreview) return;

    if (!canCreateCategories && !canEditCategories) {
      toast({
        title: 'Keine Berechtigung',
        description: 'Sie haben keine Berechtigung zum Erstellen oder Bearbeiten von Kategorien',
        variant: 'destructive',
      });
      return;
    }

    if (!aiCategoryName.trim()) {
      toast({
        title: 'Kategorie-Name erforderlich',
        description: 'Bitte geben Sie einen Namen für die Kategorie ein',
        variant: 'destructive',
      });
      return;
    }

    try {
      setAiImportState('validating');

      const aiCategory2Commit = httpsCallable<CommitRequest, { committedCounts: { familiesCreated: number; optionsCreated: number; optionsUpdated: number } }>(functions, 'aiCategory2Commit');

      const result = await aiCategory2Commit({
        jobId: aiJobId,
        applyMode: aiUpdateExisting ? 'upsert' : 'insertOnly',
        concernID: user?.concernID,
        categoryName: aiCategoryName.trim(),
      });

      toast({
        title: 'Import erfolgreich',
        description: `Familien erstellt: ${result.data.committedCounts.familiesCreated}, Optionen erstellt: ${result.data.committedCounts.optionsCreated}, Optionen aktualisiert: ${result.data.committedCounts.optionsUpdated}`,
      });

      // Reset states
      setAiImportState('idle');
      setAiPreview(null);
      setAiJobId(null);
      setAiUpdateExisting(false);
      setAiCategoryName('');
      setShowCategoryModal(false);
      setSelectedCategoryType(null);

      // Reload categories
      if (user?.concernID) {
        // Trigger reload (you may need to adjust this based on your reload logic)
        window.location.reload(); // Simple reload, or use your existing reload function
      }
    } catch (error: any) {
      console.error('AI Commit error:', error);
      setAiImportState('error');
      setAiError({
        type: 'COMMIT_ERROR',
        message: error.message || 'Unbekannter Fehler',
        details: error.details,
      });
      toast({
        title: 'Fehler beim Speichern',
        description: error.message || 'Unbekannter Fehler',
        variant: 'destructive',
      });
    }
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
        concernId: concernId,
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
      
      // Detaillierte Fehlerbehandlung
      let errorMessage = 'Kategorie konnte nicht in der Datenbank gespeichert werden';
      
      if (error instanceof Error) {
        if (error.message.includes('permission-denied') || error.message.includes('Missing or insufficient permissions')) {
          errorMessage = 'Keine Berechtigung zum Speichern in der Datenbank';
        } else if (error.message.includes('unavailable')) {
          errorMessage = 'Datenbank ist derzeit nicht verfügbar';
        } else if (error.message.includes('unauthenticated')) {
          errorMessage = 'Sie sind nicht angemeldet';
        } else {
          errorMessage = `Fehler: ${error.message}`;
        }
      }
      
      toast({
        title: 'Fehler beim Speichern',
        description: errorMessage,
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
            setNewCategoryType1({ 
          title: '', 
          content: '', 
          contentType: 'text',
          tableInputMethod: 'direct',
          tableHeaders: ['', '', ''],
          tableData: [['', '', '']],
          tableColumns: 3
        });
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

  // Neue Funktion für das Klicken auf Kategorie-Karten
  const handleCategoryClick = (category: ExtendedCategory) => {
    if (category.concernId === 'LUFGENERIC') {
      // Für generische Kategorien: Zeige Klon-Dialog
      setSelectedCategoryForUpload(category);
      setShowUploadDialog(true);
    } else {
      // Für concern-spezifische Kategorien: Zeige normalen Upload-Dialog
      setSelectedCategoryForUpload(category);
      setShowUploadDialog(true);
    }
  };

  // Funktion zum Klonen einer generischen Kategorie
  const handleCloneGenericCategory = async (genericCategory: ExtendedCategory) => {
    if (!user?.concernID) {
      toast({
        title: 'Fehler beim Klonen',
        description: 'Kein Concern ID verfügbar',
        variant: 'destructive',
      });
      return;
    }

    setIsCloning(true);

    try {
      // Erstelle eine neue Kategorie basierend auf der generischen
      const clonedCategory: ExtendedCategory = {
        ...genericCategory,
        id: `cloned-${Date.now()}`,
        concernId: user.concernID,
        createdAt: new Date(),
        updatedAt: new Date(),
        title: `${genericCategory.title} (Kopie)`,
      };

      // Speichere in Firestore: lookupFamilies
      const familyData = {
        concernId: user.concernID,
        familyId: clonedCategory.title,
        familyName: clonedCategory.title,
        level0: clonedCategory.type === 'type2' ? clonedCategory.characteristic1 : 'Information',
        level1: clonedCategory.type === 'type2' ? clonedCategory.characteristic2 : 'Content',
        level2: clonedCategory.type === 'type2' ? clonedCategory.characteristic3 : 'Type',
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1
      };

      const familyRef = await addDoc(collection(db, 'lookupFamilies'), {
        ...familyData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Speichere in Firestore: lookupOptions
      if (clonedCategory.type === 'type1') {
        // Typ 1: Einfache Kategorie
        await addDoc(collection(db, 'lookupOptions'), {
          concernId: user.concernID,
          familyId: clonedCategory.title,
          key: 'Content',
          level: 1,
          order: 1,
          parent_Type: 'Information',
          value: clonedCategory.content,
          valueNumber: null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      } else {
        // Typ 2: Komplexe Kategorie mit Items
        for (const item of clonedCategory.items) {
          // Level 1 Option
          await addDoc(collection(db, 'lookupOptions'), {
            concernId: user.concernID,
            familyId: clonedCategory.title,
            key: clonedCategory.characteristic1,
            level: 1,
            order: item.order || 1,
            parent_Type: 'Information',
            value: item.value1,
            valueNumber: null,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });

          // Level 2 Option
          await addDoc(collection(db, 'lookupOptions'), {
            concernId: user.concernID,
            familyId: clonedCategory.title,
            key: clonedCategory.characteristic2,
            level: 2,
            order: item.order || 1,
            parent_Type: item.value1,
            value: item.value2,
            valueNumber: null,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });

          // Level 3 Option
          await addDoc(collection(db, 'lookupOptions'), {
            concernId: user.concernID,
            familyId: clonedCategory.title,
            key: clonedCategory.characteristic3,
            level: 3,
            order: item.order || 1,
            parent_Type: item.value2,
            value: item.value3,
            valueNumber: null,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        }
      }

      // Aktualisiere die lokale Liste mit der neuen ID aus Firestore
      const finalClonedCategory = {
        ...clonedCategory,
        id: familyRef.id
      };

      setExtendedCategories(prev => [...prev, finalClonedCategory]);

      toast({
        title: 'Kategorie erfolgreich geklont',
        description: `${finalClonedCategory.title} wurde in Ihren Concern kopiert und in der Datenbank gespeichert`,
      });

    } catch (error) {
      console.error('Error cloning generic category:', error);
      toast({
        title: 'Fehler beim Klonen',
        description: 'Die Kategorie konnte nicht in der Datenbank gespeichert werden',
        variant: 'destructive',
      });
    } finally {
      setIsCloning(false);
    }
  };

  // Funktion zum Löschen einer Kategorie
  const handleDeleteCategory = async (category: Category | ExtendedCategory) => {
    if ('type' in category) {
      // ExtendedCategory - lösche aus Firestore und lokaler Liste
      setIsDeleting(true);
      
      try {
        // Lösche alle lookupOptions für diese Kategorie
        const optionsQuery = query(
          collection(db, 'lookupOptions'),
          where('familyId', '==', category.title)
        );
        const optionsSnapshot = await getDocs(optionsQuery);
        
        console.log(`Found ${optionsSnapshot.docs.length} options to delete for category: ${category.title}`);
        
        // Lösche alle gefundenen Options
        const deletePromises = optionsSnapshot.docs.map(doc => 
          deleteDoc(doc.ref)
        );
        await Promise.all(deletePromises);
        
        console.log('All options deleted successfully');
        
        // Lösche die Kategorie aus lookupFamilies
        const familyQuery = query(
          collection(db, 'lookupFamilies'),
          where('familyName', '==', category.title),
          where('concernId', '==', category.concernId)
        );
        const familySnapshot = await getDocs(familyQuery);
        
        if (familySnapshot.docs.length > 0) {
          await deleteDoc(familySnapshot.docs[0].ref);
          console.log('Family document deleted successfully');
        }
        
        // Entferne aus der lokalen Liste
        setExtendedCategories(prev => prev.filter(cat => cat.id !== category.id));
        
        toast({
          title: 'Kategorie erfolgreich gelöscht',
          description: `${category.title} wurde aus der Datenbank und der lokalen Liste entfernt`,
        });
        
      } catch (error) {
        console.error('Error deleting category from database:', error);
        toast({
          title: 'Fehler beim Löschen aus der Datenbank',
          description: 'Die Kategorie wurde nur lokal entfernt',
          variant: 'destructive',
        });
        
        // Fallback: Entferne nur aus der lokalen Liste
        setExtendedCategories(prev => prev.filter(cat => cat.id !== category.id));
      } finally {
        setIsDeleting(false);
      }
    } else {
      // Category - verwende die bestehende Logik (lokale Kategorien)
      const confirmDelete = window.confirm('Sind Sie sicher, dass Sie diese lokale Kategorie löschen möchten?');
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
    }
  };

  // Sortier-Funktion für die Bearbeitungstabelle
  const handleSortTable = (column: 'order' | 'value1' | 'value2' | 'value3') => {
    if (editSortColumn === column) {
      // Wenn die gleiche Spalte geklickt wird, ändere die Richtung
      setEditSortDirection(editSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Neue Spalte, setze auf aufsteigend
      setEditSortColumn(column);
      setEditSortDirection('asc');
    }
  };

  // Sortierte Items für die Bearbeitungstabelle mit stabiler Sortierung
  const getSortedItems = () => {
    if (!editingCategoryData || !editSortColumn || editingCategoryData.type !== 'type2') {
      return editingCategoryData?.type === 'type2' ? editingCategoryData.items : [];
    }

    return [...editingCategoryData.items].sort((a, b) => {
      const aValue = a[editSortColumn];
      const bValue = b[editSortColumn];
      
      // Handle different data types
      if (editSortColumn === 'order') {
        // For order column, use numeric comparison
        const aNum = typeof aValue === 'number' ? aValue : 0;
        const bNum = typeof bValue === 'number' ? bValue : 0;
        
        if (editSortDirection === 'asc') {
          return aNum - bNum;
        } else {
          return bNum - aNum;
        }
      } else {
        // For other columns, use string comparison with stable fallback
        const aStr = String(aValue || '');
        const bStr = String(bValue || '');
        
        if (aStr === bStr) {
          // Bei gleichen Werten: Behalte die ursprüngliche Reihenfolge bei
          return (a.order || 0) - (b.order || 0);
        }
        
        // Numerische Werte erkennen und entsprechend sortieren
        const aNum = parseFloat(aStr);
        const bNum = parseFloat(bStr);
        
        if (!isNaN(aNum) && !isNaN(bNum)) {
          // Beide sind numerische Werte
          if (editSortDirection === 'asc') {
            return aNum - bNum;
          } else {
            return bNum - aNum;
          }
        } else {
          // String-Vergleich für nicht-numerische Werte
          if (editSortDirection === 'asc') {
            return aStr.localeCompare(bStr);
          } else {
            return bStr.localeCompare(aStr);
          }
        }
      }
    });
  };

  // Funktion zum Speichern der bearbeiteten Kategorie
  const handleSaveEditedCategory = async () => {
    if (!editingCategoryData) return;

    try {
      // Hier würde die Logik zum Speichern in Firestore implementiert
      // Für jetzt aktualisieren wir nur den lokalen State
      
      // Aktualisiere die Kategorie in der lokalen Liste
      setExtendedCategories(prev => 
        prev.map(cat => 
          cat.id === editingCategoryData.id ? editingCategoryData : cat
        )
      );

      // Schließe den Bearbeitungsmodus
      setIsEditingCategory(false);
      setEditingCategoryData(null);

      toast({
        title: 'Kategorie aktualisiert',
        description: `${editingCategoryData.title} wurde erfolgreich bearbeitet`,
      });

    } catch (error) {
      console.error('Error saving edited category:', error);
      toast({
        title: 'Fehler beim Speichern',
        description: 'Die Kategorie konnte nicht gespeichert werden',
        variant: 'destructive',
      });
    }
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
        title="📦 Kategorien & Materialgruppen"
        showBackButton={!!onBack}
        onBack={onBack}
        onOpenMessaging={onOpenMessaging}
      >
        {canCreateCategories && (
          <Button 
            onClick={() => setShowCategoryModal(true)}
            className="bg-gradient-to-r from-[#058bc0] to-[#0470a0] hover:from-[#0470a0] hover:to-[#035c80] text-white font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105"
            aria-label="Neue Kategorie erstellen"
          >
            <Plus className="h-5 w-5 mr-2" />
            ✨ Neue Kategorie
          </Button>
        )}
      </AppHeader>



      {/* Kategorie-Erstellungs-Modal */}
      <Dialog open={showCategoryModal} onOpenChange={setShowCategoryModal}>
        <DialogContent 
          className="max-w-4xl max-h-[90vh] relative mx-auto bg-white border-4 border-purple-500 shadow-2xl" 
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
          <DialogHeader className="dialog-header cursor-move bg-gradient-to-r from-purple-500 to-purple-600 text-white px-6 py-4 -m-6 mb-6 rounded-t-lg">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <span className="text-3xl">📂</span>
              Neue Kategorie erstellen
            </DialogTitle>
          </DialogHeader>
          
          {!selectedCategoryType ? (
            // Kategorietyp-Auswahl
            <div className="space-y-6 p-2">
              <div className="text-center bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg border border-purple-200">
                <p className="text-gray-700 font-semibold mb-2">Wählen Sie den Typ der Kategorie aus:</p>
                <p className="text-sm text-gray-600">Unterschiedliche Kategorietypen für verschiedene Anforderungen</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Kategorie Typ 1 */}
                <Card 
                  className="cursor-pointer hover:shadow-2xl transition-all border-3 border-blue-300 hover:border-blue-500 hover:scale-105 transform"
                  onClick={() => setSelectedCategoryType('type1')}
                  role="button"
                  tabIndex={0}
                  aria-label="Kategorie Typ 1 auswählen - Einfache Kategorie für mobile App-Benutzer"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedCategoryType('type1');
                    }
                  }}
                >
                  <CardHeader className="text-center bg-gradient-to-br from-blue-50 to-cyan-50">
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                      <Type className="w-10 h-10 text-white" />
                    </div>
                    <CardTitle className="text-xl font-bold text-gray-800">📋 Kategorie Typ 1</CardTitle>
                    <p className="text-sm text-gray-600 mt-2">Einfache Kategorie für mobile App-Benutzer</p>
                  </CardHeader>
                  <CardContent className="bg-white">
                    <ul className="text-sm text-gray-700 space-y-2">
                      <li className="flex items-center gap-2">✓ Titel der Kategorie</li>
                      <li className="flex items-center gap-2">✓ Text oder Excel-ähnliche Tabelle</li>
                      <li className="flex items-center gap-2">✓ Für Informationszwecke</li>
                    </ul>
                  </CardContent>
                </Card>

                {/* Kategorie Typ 2 */}
                <Card 
                  className="cursor-pointer hover:shadow-2xl transition-all border-3 border-green-300 hover:border-green-500 hover:scale-105 transform"
                  onClick={() => setSelectedCategoryType('type2')}
                  role="button"
                  tabIndex={0}
                  aria-label="Kategorie Typ 2 auswählen - Erweiterte Kategorie mit Datenbank-Integration"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedCategoryType('type2');
                    }
                  }}
                >
                  <CardHeader className="text-center bg-gradient-to-br from-green-50 to-emerald-50">
                    <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                      <Database className="w-10 h-10 text-white" />
                    </div>
                    <CardTitle className="text-xl font-bold text-gray-800">📊 Kategorie Typ 2</CardTitle>
                    <p className="text-sm text-gray-600 mt-2">Komplexe Kategorie mit drei Merkmalen</p>
                  </CardHeader>
                  <CardContent className="bg-white">
                    <ul className="text-sm text-gray-700 space-y-2">
                      <li className="flex items-center gap-2">✓ Titel der Kategorie</li>
                      <li className="flex items-center gap-2">✓ Drei definierte Merkmale</li>
                      <li className="flex items-center gap-2">✓ Mehrere Einträge möglich</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : selectedCategoryType === 'type1' ? (
            // Formular für Kategorie Typ 1
            <div className="space-y-6 p-2">
              <div className="flex items-center gap-2 mb-4 bg-gradient-to-r from-blue-50 to-cyan-50 p-3 rounded-lg border-2 border-blue-300">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedCategoryType(null)}
                  className="border-2 border-gray-300 hover:border-blue-500 hover:bg-blue-50 transition-all"
                >
                  ← Zurück zur Auswahl
                </Button>
                <div className="flex items-center gap-2 ml-auto">
                  <Type className="w-5 h-5 text-blue-600" />
                  <span className="font-bold text-blue-700">📋 Kategorie Typ 1</span>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="type1-title" className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    📝 Titel der Kategorie *
                  </Label>
                  <Input
                    id="type1-title"
                    placeholder="z.B. Sicherheitshinweise, Arbeitsanweisungen"
                    value={newCategoryType1.title}
                    onChange={(e) => setNewCategoryType1(prev => ({ ...prev, title: e.target.value }))}
                    className="border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <Label htmlFor="type1-content-type" className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    📄 Inhaltstyp
                  </Label>
                  <Select 
                    value={newCategoryType1.contentType} 
                    onValueChange={(value: 'text' | 'table' | 'file') => 
                      setNewCategoryType1(prev => ({ ...prev, contentType: value }))
                    }
                  >
                    <SelectTrigger className="border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">📝 Text</SelectItem>
                      <SelectItem value="table">📊 Tabelle (manuell/CSV)</SelectItem>
                      <SelectItem value="file">📎 Datei hochladen</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="type1-content" className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    {newCategoryType1.contentType === 'text' ? '📝' : newCategoryType1.contentType === 'file' ? '📎' : '📊'} Inhalt *
                  </Label>
                  {newCategoryType1.contentType === 'text' ? (
                    <Textarea
                      id="type1-content"
                      placeholder="Geben Sie den Inhalt ein..."
                      value={newCategoryType1.content}
                      onChange={(e) => setNewCategoryType1(prev => ({ ...prev, content: e.target.value }))}
                      rows={6}
                      className="border-2 border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    />
                  ) : newCategoryType1.contentType === 'file' ? (
                    <div className="space-y-4">
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gradient-to-br from-blue-50 to-cyan-50 hover:border-blue-400 transition-all">
                        <input
                          type="file"
                          id="file-upload-type1"
                          accept=".pdf,.csv,.txt,.jpg,.jpeg,.png,.doc,.docx"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            
                            // Show loading state
                            const reader = new FileReader();
                            
                            reader.onload = async (event) => {
                              const fileUrl = event.target?.result as string;
                              
                              // Store file info
                              setNewCategoryType1(prev => ({
                                ...prev,
                                uploadedFile: {
                                  name: file.name,
                                  url: fileUrl,
                                  type: file.type,
                                  size: file.size
                                }
                              }));
                              
                              // Try to parse CSV files
                              if (file.name.endsWith('.csv')) {
                                try {
                                  const text = await file.text();
                                  const lines = text.split('\n').filter(l => l.trim());
                                  if (lines.length > 0) {
                                    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
                                    const rows = lines.slice(1).map(line => 
                                      line.split(',').map(cell => cell.trim().replace(/"/g, ''))
                                    );
                                    setNewCategoryType1(prev => ({
                                      ...prev,
                                      parsedFileData: { headers, rows }
                                    }));
                                  }
                                } catch (error) {
                                  console.error('CSV parsing error:', error);
                                }
                              }
                            };
                            
                            reader.readAsDataURL(file);
                          }}
                          className="hidden"
                        />
                        <label htmlFor="file-upload-type1" className="cursor-pointer">
                          <div className="flex flex-col items-center gap-3">
                            <Upload className="h-12 w-12 text-blue-500" />
                            <div>
                              <p className="font-semibold text-gray-700">Datei hochladen</p>
                              <p className="text-sm text-gray-500">PDF, CSV, Bilder, Text, Dokumente</p>
                              <p className="text-xs text-gray-400 mt-1">Hinweis: Für Excel bitte als CSV exportieren</p>
                            </div>
                            <Button type="button" variant="outline" className="pointer-events-none">
                              📁 Datei auswählen
                            </Button>
                          </div>
                        </label>
                      </div>
                      
                      {/* Display uploaded file */}
                      {newCategoryType1.uploadedFile && (
                        <div className="bg-white border-2 border-blue-300 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="text-3xl">
                                {newCategoryType1.uploadedFile.type.includes('pdf') ? '📄' :
                                 newCategoryType1.uploadedFile.type.includes('csv') ? '📊' :
                                 newCategoryType1.uploadedFile.type.includes('excel') || newCategoryType1.uploadedFile.type.includes('sheet') ? '📗' :
                                 newCategoryType1.uploadedFile.type.includes('image') ? '🖼️' :
                                 newCategoryType1.uploadedFile.type.includes('word') ? '📘' : '📎'}
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900">{newCategoryType1.uploadedFile.name}</p>
                                <p className="text-xs text-gray-500">
                                  {(newCategoryType1.uploadedFile.size / 1024).toFixed(1)} KB
                                </p>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setNewCategoryType1(prev => ({ 
                                ...prev, 
                                uploadedFile: null,
                                parsedFileData: null 
                              }))}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              aria-label={`Datei "${newCategoryType1.uploadedFile?.name || 'Datei'}" entfernen`}
                            >
                              🗑️ Entfernen
                            </Button>
                          </div>
                          
                          {/* Show parsed data preview for CSV/Excel */}
                          {newCategoryType1.parsedFileData && (
                            <div className="mt-4">
                              <div className="flex items-center justify-between mb-2">
                                <Label className="font-semibold text-gray-700">📊 Erkannte Tabellendaten:</Label>
                                <Badge variant="secondary">{newCategoryType1.parsedFileData.rows.length} Zeilen</Badge>
                              </div>
                              <div className="max-h-64 overflow-auto border rounded-lg">
                                <Table>
                                  <TableHeader>
                                    <TableRow className="bg-gray-100">
                                      {newCategoryType1.parsedFileData.headers.map((header, idx) => (
                                        <TableHead key={idx} className="font-bold">{header}</TableHead>
                                      ))}
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {newCategoryType1.parsedFileData.rows.slice(0, 10).map((row, rowIdx) => (
                                      <TableRow key={rowIdx}>
                                        {row.map((cell, cellIdx) => (
                                          <TableCell key={cellIdx} className="text-sm">{cell}</TableCell>
                                        ))}
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                                {newCategoryType1.parsedFileData.rows.length > 10 && (
                                  <div className="text-center py-2 bg-gray-50 text-sm text-gray-600">
                                    ... und {newCategoryType1.parsedFileData.rows.length - 10} weitere Zeilen
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                          
                          {/* Show preview for other file types */}
                          {!newCategoryType1.parsedFileData && newCategoryType1.uploadedFile.type.includes('image') && (
                            <div className="mt-4">
                              <Label className="font-semibold text-gray-700 mb-2 block">🖼️ Bildvorschau:</Label>
                              <img 
                                src={newCategoryType1.uploadedFile.url} 
                                alt={newCategoryType1.uploadedFile.name}
                                className="max-h-64 mx-auto rounded-lg shadow-md"
                              />
                            </div>
                          )}
                          
                          {!newCategoryType1.parsedFileData && newCategoryType1.uploadedFile.type.includes('pdf') && (
                            <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                              <p className="text-sm text-gray-700">
                                📄 <strong>PDF-Datei hochgeladen.</strong> Die Datei wird als Referenz gespeichert und kann von Benutzern heruntergeladen werden.
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : newCategoryType1.contentType === 'table' ? (
                    <div className="space-y-4">
                      <div className="flex gap-4 mb-4">
                        <Button
                          type="button"
                          variant={newCategoryType1.tableInputMethod === 'direct' ? 'default' : 'outline'}
                          onClick={() => setNewCategoryType1(prev => ({ ...prev, tableInputMethod: 'direct' }))}
                          className="flex-1"
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Direkte Eingabe
                        </Button>
                        <Button
                          type="button"
                          variant={newCategoryType1.tableInputMethod === 'csv' ? 'default' : 'outline'}
                          onClick={() => setNewCategoryType1(prev => ({ ...prev, tableInputMethod: 'csv' }))}
                          className="flex-1"
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          CSV-Upload
                        </Button>
                      </div>

                      {newCategoryType1.tableInputMethod === 'direct' ? (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-gray-600">Tabellendaten direkt eingeben</p>
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  const newRow = Array(newCategoryType1.tableColumns || 3).fill('');
                                  setNewCategoryType1(prev => ({
                                    ...prev,
                                    tableData: [...(prev.tableData || []), newRow]
                                  }));
                                }}
                              >
                                <Plus className="w-4 h-4 mr-1" />
                                Zeile hinzufügen
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setNewCategoryType1(prev => ({
                                    ...prev,
                                    tableColumns: (prev.tableColumns || 3) + 1
                                  }));
                                  // Add new column to all existing rows
                                  setNewCategoryType1(prev => {
                                    const updatedData = (prev.tableData || []).map(row => [...row, '']);
                                    const updatedHeaders = [...(prev.tableHeaders || []), ''];
                                    return {
                                      ...prev,
                                      tableData: updatedData,
                                      tableHeaders: updatedHeaders
                                    };
                                  });
                                }}
                              >
                                <Plus className="w-4 h-4 mr-1" />
                                Spalte hinzufügen
                              </Button>
                            </div>
                          </div>

                          {/* Spalten-Header */}
                          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${newCategoryType1.tableColumns || 3}, 1fr)` }}>
                            {Array.from({ length: newCategoryType1.tableColumns || 3 }, (_, colIndex) => (
                              <div key={colIndex} className="space-y-2">
                                <Input
                                  placeholder={`Spalte ${colIndex + 1}`}
                                  value={newCategoryType1.tableHeaders?.[colIndex] || ''}
                                  onChange={(e) => {
                                    const newHeaders = [...(newCategoryType1.tableHeaders || Array(newCategoryType1.tableColumns || 3).fill(''))];
                                    newHeaders[colIndex] = e.target.value;
                                    setNewCategoryType1(prev => ({
                                      ...prev,
                                      tableHeaders: newHeaders
                                    }));
                                  }}
                                  className="text-sm font-medium"
                                />
                              </div>
                            ))}
                          </div>

                          {/* Tabellendaten */}
                          <div className="space-y-2 max-h-96 overflow-y-auto border rounded-lg p-4 bg-gray-50">
                            {(newCategoryType1.tableData || []).map((row, rowIndex) => (
                              <div 
                                key={rowIndex} 
                                className="grid gap-2 border border-gray-200 hover:border-blue-300 rounded p-2 transition-all bg-white hover:shadow-sm" 
                                style={{ gridTemplateColumns: `40px repeat(${newCategoryType1.tableColumns || 3}, 1fr) 40px` }}
                              >
                                {/* Zeilennummer */}
                                <div className="flex items-center justify-center">
                                  <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-1 rounded-full min-w-[24px] text-center">
                                    {rowIndex + 1}
                                  </span>
                                </div>
                                
                                {/* Tabellendaten */}
                                {Array.from({ length: newCategoryType1.tableColumns || 3 }, (_, colIndex) => (
                                  <div key={colIndex} className="flex items-center gap-1">
                                    <Input
                                      placeholder={`${rowIndex + 1}-${colIndex + 1}`}
                                      value={row[colIndex] || ''}
                                      onChange={(e) => {
                                        const newData = [...(newCategoryType1.tableData || [])];
                                        if (!newData[rowIndex]) {
                                          newData[rowIndex] = Array(newCategoryType1.tableColumns || 3).fill('');
                                        }
                                        newData[rowIndex][colIndex] = e.target.value;
                                        setNewCategoryType1(prev => ({
                                          ...prev,
                                          tableData: newData
                                        }));
                                      }}
                                      className="text-sm h-8"
                                    />
                                  </div>
                                ))}
                                
                                {/* Entfernen-Button */}
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    const newData = newCategoryType1.tableData?.filter((_, index) => index !== rowIndex) || [];
                                    setNewCategoryType1(prev => ({
                                      ...prev,
                                      tableData: newData
                                    }));
                                  }}
                                  className="text-red-600 hover:text-red-700 p-1 h-6 w-6"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            ))}
                          </div>

                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <span>
                              {newCategoryType1.tableData?.length || 0} Zeilen × {newCategoryType1.tableColumns || 3} Spalten
                            </span>
                            <span>
                              Daten werden automatisch als CSV gespeichert
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors cursor-pointer"
                               onDragOver={(e) => {
                                 e.preventDefault();
                                 e.currentTarget.classList.add('border-blue-400', 'bg-blue-50');
                               }}
                               onDragLeave={(e) => {
                                 e.preventDefault();
                                 e.currentTarget.classList.remove('border-blue-400', 'bg-blue-50');
                               }}
                               onDrop={(e) => {
                                 e.preventDefault();
                                 e.currentTarget.classList.remove('border-blue-400', 'bg-blue-50');
                                 const files = e.dataTransfer.files;
                                 if (files.length > 0) {
                                   const file = files[0];
                                   if (file.name.toLowerCase().endsWith('.csv')) {
                                     handleCSVUpload(file);
                                   } else {
                                     toast({
                                       title: 'Ungültiger Dateityp',
                                       description: 'Bitte wählen Sie eine CSV-Datei aus.',
                                       variant: 'destructive',
                                     });
                                   }
                                 }
                               }}
                               onClick={() => document.getElementById('csv-upload')?.click()}
                          >
                            <input
                              ref={(input) => {
                                if (input) {
                                  input.onchange = (e) => {
                                    const target = e.target as HTMLInputElement;
                                    const file = target.files?.[0];
                                    if (file && file.name.toLowerCase().endsWith('.csv')) {
                                      handleCSVUpload(file);
                                    } else if (file) {
                                      toast({
                                        title: 'Ungültiger Dateityp',
                                        description: 'Bitte wählen Sie eine CSV-Datei aus.',
                                        variant: 'destructive',
                                      });
                                    }
                                    // Reset input value to allow re-uploading the same file
                                    target.value = '';
                                  };
                                }
                              }}
                              type="file"
                              id="csv-upload"
                              accept=".csv"
                              className="hidden"
                            />
                            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                            <p className="text-sm font-medium text-gray-600">
                              CSV-Datei auswählen
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              Klicken Sie hier oder ziehen Sie eine CSV-Datei hierher
                            </p>
                          </div>
                          
                          <div className="text-center">
                            <p className="text-sm text-gray-600">Oder geben Sie CSV-Daten direkt ein:</p>
                            <Textarea
                              id="type1-content"
                              placeholder="Spalte1,Spalte2,Spalte3&#10;Wert1,Wert2,Wert3&#10;Wert4,Wert5,Wert6"
                              value={newCategoryType1.content}
                              onChange={(e) => setNewCategoryType1(prev => ({ ...prev, content: e.target.value }))}
                              rows={6}
                              className="mt-2"
                            />
                            <p className="text-xs text-gray-500 mt-1">Verwenden Sie Kommas als Trennzeichen und Zeilenumbrüche für neue Zeilen</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t-2 border-gray-200 mt-6">
                <Button 
                  variant="outline" 
                  onClick={closeCategoryModal}
                  className="border-2 border-gray-300 hover:border-red-400 hover:bg-red-50 hover:text-red-700 transition-all"
                >
                  ❌ Abbrechen
                </Button>
                <Button 
                  onClick={handleCreateCategoryType1}
                  className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold shadow-md hover:shadow-lg transition-all hover:scale-105"
                >
                  <Save className="w-4 h-4 mr-2" />
                  ✅ Kategorie erstellen
                </Button>
              </div>
            </div>
          ) : (
            // Formular für Kategorie Typ 2
            <div className="space-y-6 p-2">
              <div className="flex items-center gap-2 mb-4 bg-gradient-to-r from-green-50 to-emerald-50 p-3 rounded-lg border-2 border-green-300">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedCategoryType(null)}
                  className="border-2 border-gray-300 hover:border-green-500 hover:bg-green-50 transition-all"
                >
                  ← Zurück zur Auswahl
                </Button>
                <div className="flex items-center gap-2 ml-auto">
                  <Database className="w-5 h-5 text-green-600" />
                  <span className="font-bold text-green-700">📊 Kategorie Typ 2</span>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="type2-title" className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                    📝 Titel der Kategorie *
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="type2-title"
                      placeholder="z.B. Kabel, Schrauben, Werkzeuge"
                      value={newCategoryType2.title}
                      onChange={(e) => setNewCategoryType2(prev => ({ ...prev, title: e.target.value }))}
                      className="flex-1 border-2 border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAIImportClick}
                      className="bg-purple-50 hover:bg-purple-100 border-purple-200"
                      disabled={aiImportState === 'uploading' || aiImportState === 'analyzing' || aiImportState === 'validating'}
                    >
                      {aiImportState === 'uploading' || aiImportState === 'analyzing' || aiImportState === 'validating' ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          {aiImportState === 'uploading' && 'Wird hochgeladen...'}
                          {aiImportState === 'analyzing' && 'Wird analysiert...'}
                          {aiImportState === 'validating' && 'Validierung...'}
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          AI-Import
                        </>
                      )}
                    </Button>
                  </div>
                  <input
                    ref={aiFileInputRef}
                    type="file"
                    accept=".pdf,.csv,.xlsx,.xls,.json,.txt,.xml"
                    onChange={handleAIFileSelect}
                    className="hidden"
                  />
                </div>

                {/* AI Import Preview Section */}
                {aiImportState === 'preview' && aiPreview && (
                  <div className="space-y-4 border-2 border-purple-200 rounded-lg p-4 bg-purple-50">
                    {/* Category Name Input - Prominent at the top */}
                    <div className="bg-white rounded-lg p-4 border-2 border-purple-300">
                      <Label htmlFor="ai-category-name" className="text-base font-bold text-purple-900">Kategorie-Name eingeben *</Label>
                      <Input
                        id="ai-category-name"
                        placeholder="Name für diese Kategorie (z.B. GAEB Test X81 Electro)"
                        value={aiCategoryName}
                        onChange={(e) => setAiCategoryName(e.target.value)}
                        className="mt-2 text-lg font-semibold"
                      />
                      <p className="text-xs text-gray-500 mt-1">Dieser Name wird für alle Einträge aus der Datei verwendet</p>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <Label className="text-lg font-semibold">Vorschau der erkannten Daten</Label>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant={aiPreviewViewMode === 'table' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setAiPreviewViewMode('table')}
                        >
                          <TableIcon className="w-4 h-4 mr-2" />
                          Tabelle
                        </Button>
                        <Button
                          type="button"
                          variant={aiPreviewViewMode === 'json' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setAiPreviewViewMode('json')}
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          JSON anzeigen
                        </Button>
                      </div>
                    </div>

                    {aiPreviewViewMode === 'table' ? (
                      <div className="space-y-4">
                        <div className="text-sm text-gray-600">
                          <strong>Kategorie:</strong> {aiPreview.category.title}
                          {aiPreview.category.notes && <div className="mt-1">{aiPreview.category.notes}</div>}
                        </div>
                        {aiPreview.warnings && aiPreview.warnings.length > 0 && (
                          <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                            <div className="font-semibold text-yellow-800 mb-2">Warnungen:</div>
                            <ul className="list-disc list-inside text-sm text-yellow-700">
                              {aiPreview.warnings.map((warning, idx) => (
                                <li key={idx}>{warning}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {/* Group options by familyID */}
                        {Object.entries(
                          aiPreview.options.reduce((acc, opt) => {
                            if (!acc[opt.familyID]) acc[opt.familyID] = [];
                            acc[opt.familyID].push(opt);
                            return acc;
                          }, {} as Record<string, typeof aiPreview.options>)
                        ).map(([familyID, options]) => (
                          <div key={familyID} className="border rounded-lg overflow-hidden">
                            <div className="bg-gray-50 px-4 py-2 font-semibold border-b">
                              {familyID} ({options.length} Optionen)
                            </div>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Key</TableHead>
                                  <TableHead>Label</TableHead>
                                  <TableHead>Order</TableHead>
                                  <TableHead>Attributes</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {options
                                  .sort((a, b) => (a.order || 0) - (b.order || 0))
                                  .map((opt, idx) => (
                                    <TableRow key={idx}>
                                      <TableCell className="font-mono text-xs">{opt.key}</TableCell>
                                      <TableCell>{opt.label}</TableCell>
                                      <TableCell>{opt.order || '-'}</TableCell>
                                      <TableCell className="text-xs">
                                        {opt.attributes ? JSON.stringify(opt.attributes) : '-'}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                              </TableBody>
                            </Table>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <pre className="bg-white p-4 rounded border overflow-auto max-h-96 text-xs">
                        {JSON.stringify(aiPreview, null, 2)}
                      </pre>
                    )}

                    <div className="flex items-center gap-3 pt-2 border-t">
                      <Label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={aiUpdateExisting}
                          onChange={(e) => setAiUpdateExisting(e.target.checked)}
                          className="w-4 h-4"
                        />
                        <span>Vorhandene Einträge gleichen familyID aktualisieren</span>
                      </Label>
                    </div>
                  </div>
                )}

                {/* AI Import Error Display */}
                {aiImportState === 'error' && aiError && (
                  <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                    <div className="font-semibold text-red-800 mb-2">Fehler beim Import:</div>
                    <div className="text-sm text-red-700">{aiError.message}</div>
                    {aiError.details && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs text-red-600">Details anzeigen</summary>
                        <pre className="mt-2 text-xs bg-white p-2 rounded overflow-auto">{aiError.details}</pre>
                      </details>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="type2-char1" className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                      🏷️ Merkmal 1 *
                    </Label>
                    <Input
                      id="type2-char1"
                      placeholder="z.B. Kabeltyp (NYM)"
                      value={newCategoryType2.characteristic1}
                      onChange={(e) => setNewCategoryType2(prev => ({ ...prev, characteristic1: e.target.value }))}
                      className="border-2 border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                    />
                  </div>
                  <div>
                    <Label htmlFor="type2-char2" className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                      🏷️ Merkmal 2 *
                    </Label>
                    <Input
                      id="type2-char2"
                      placeholder="z.B. Anzahl Adern"
                      value={newCategoryType2.characteristic2}
                      onChange={(e) => setNewCategoryType2(prev => ({ ...prev, characteristic2: e.target.value }))}
                      className="border-2 border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                    />
                  </div>
                  <div>
                    <Label htmlFor="type2-char3" className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                      🏷️ Merkmal 3 *
                    </Label>
                    <Input
                      id="type2-char3"
                      placeholder="z.B. Querschnitt (mm²)"
                      value={newCategoryType2.characteristic3}
                      onChange={(e) => setNewCategoryType2(prev => ({ ...prev, characteristic3: e.target.value }))}
                      className="border-2 border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
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

              <div className="flex justify-end gap-3 pt-6 border-t-2 border-gray-200 mt-6">
                <Button 
                  variant="outline" 
                  onClick={closeCategoryModal}
                  className="border-2 border-gray-300 hover:border-red-400 hover:bg-red-50 hover:text-red-700 transition-all"
                >
                  ❌ Abbrechen
                </Button>
                {aiImportState === 'preview' && aiPreview ? (
                  <Button 
                    onClick={handleAICommit}
                    disabled={!aiCategoryName.trim()}
                    className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-bold shadow-md hover:shadow-lg transition-all hover:scale-105 disabled:opacity-50"
                  >
                    {aiCategoryName.trim() ? (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        ✨ Übernehmen
                      </>
                    ) : (
                      'Bitte Kategorie-Name eingeben'
                    )}
                  </Button>
                ) : (
                  <Button 
                    onClick={handleCreateCategoryType2}
                    className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold shadow-md hover:shadow-lg transition-all hover:scale-105"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    ✅ Kategorie erstellen
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Upload Dialog für Kategorien */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-blue-600" />
              Kategorie bearbeiten
            </DialogTitle>
          </DialogHeader>
          
          {selectedCategoryForUpload && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  {selectedCategoryForUpload.type === 'type1' ? (
                    <Type className="w-8 h-8 text-blue-600" />
                  ) : (
                    <Database className="w-8 h-8 text-green-600" />
                  )}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {selectedCategoryForUpload.title}
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  {selectedCategoryForUpload.type === 'type1' 
                    ? 'Einfache Kategorie für mobile App-Benutzer'
                    : 'Komplexe Kategorie mit drei Merkmalen'
                  }
                </p>
              </div>

              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white text-sm font-bold">i</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-blue-900 mb-1">
                      {selectedCategoryForUpload.concernId === 'LUFGENERIC' ? 'Kategorie klonen' : 'Kategorie bearbeiten'}
                    </p>
                    <p className="text-sm text-blue-700">
                      {selectedCategoryForUpload.concernId === 'LUFGENERIC' 
                        ? 'Diese generische Kategorie kann nicht direkt bearbeitet werden. Sie können sie jedoch in Ihren Concern klonen, um sie anzupassen.'
                        : 'Um diese Kategorie zu bearbeiten, muss sie zuerst in den Bearbeitungsmodus hochgeladen werden. Möchten Sie fortfahren?'
                      }
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowUploadDialog(false);
                    setShowCloneConfirmation(true);
                  }}
                  className="flex-1"
                  disabled={isCloning}
                >
                  Abbrechen
                </Button>
                <Button
                  onClick={() => {
                    if (selectedCategoryForUpload.concernId === 'LUFGENERIC') {
                      // Für generische Kategorien: Zeige Klon-Bestätigung
                      setShowCloneConfirmation(true);
                    } else {
                      // Für concern-spezifische Kategorien: Bearbeiten
                      setEditingCategoryData(selectedCategoryForUpload);
                      setIsEditingCategory(true);
                      setShowUploadDialog(false);
                      
                      toast({
                        title: 'Kategorie geladen',
                        description: `${selectedCategoryForUpload.title} ist jetzt im Bearbeitungsmodus`,
                      });
                    }
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  disabled={isCloning}
                >
                  {selectedCategoryForUpload.concernId === 'LUFGENERIC' ? (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      Kategorie klonen
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Hochladen & Bearbeiten
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Bearbeitungsformular für Kategorien */}
      <Dialog open={isEditingCategory} onOpenChange={setIsEditingCategory}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5 text-blue-600" />
              {editingCategoryData?.concernId === 'LUFGENERIC' ? 'Kategorie anzeigen (schreibgeschützt)' : 'Kategorie bearbeiten'}: {editingCategoryData?.title}
            </DialogTitle>
          </DialogHeader>
          
          {editingCategoryData && (
            <div className="space-y-6">
              {/* Warnung für generische Kategorien */}
              {editingCategoryData.concernId === 'LUFGENERIC' && (
                <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-yellow-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-white text-sm font-bold">!</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-yellow-900 mb-1">
                        Generische Kategorie (schreibgeschützt)
                      </p>
                      <p className="text-sm text-yellow-700">
                        Diese Kategorie ist generisch und kann nicht bearbeitet werden. Sie können sie jedoch in Ihren Concern klonen, um sie anzupassen.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Kategorie-Titel */}
              <div>
                <Label htmlFor="edit-title" className="text-sm font-medium text-gray-700">
                  Kategorie-Titel
                </Label>
                <Input
                  id="edit-title"
                  value={editingCategoryData.title}
                  onChange={(e) => setEditingCategoryData({
                    ...editingCategoryData,
                    title: e.target.value
                  })}
                  className="mt-1"
                  placeholder="Titel der Kategorie"
                  disabled={editingCategoryData.concernId === 'LUFGENERIC'}
                />
              </div>

              {/* Kategorie-spezifische Felder */}
              {editingCategoryData.type === 'type1' ? (
                // Typ 1: Einfache Kategorie
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="edit-content-type" className="text-sm font-medium text-gray-700">
                      Inhaltstyp
                    </Label>
                    <Select
                      value={editingCategoryData.contentType}
                      onValueChange={(value: 'text' | 'table') => setEditingCategoryData({
                        ...editingCategoryData,
                        contentType: value
                      })}
                      disabled={editingCategoryData.concernId === 'LUFGENERIC'}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Text</SelectItem>
                        <SelectItem value="table">Tabelle</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="edit-content" className="text-sm font-medium text-gray-700">
                      Inhalt
                    </Label>
                    {editingCategoryData.contentType === 'text' ? (
                      <Textarea
                        id="edit-content"
                        value={editingCategoryData.content}
                        onChange={(e) => setEditingCategoryData({
                          ...editingCategoryData,
                          content: e.target.value
                        })}
                        className="mt-1 min-h-[120px]"
                        placeholder="Inhalt der Kategorie"
                        disabled={editingCategoryData.concernId === 'LUFGENERIC'}
                      />
                    ) : (
                      <div className="mt-1 p-4 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
                        <div className="text-center text-gray-500">
                          <TableIcon className="w-8 h-8 mx-auto mb-2" />
                          <p>Tabellen-Ansicht für Typ 1 Kategorien</p>
                          <p className="text-sm">Hier würde eine Tabellen-Ansicht angezeigt werden</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                // Typ 2: Komplexe Kategorie
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="edit-char1" className="text-sm font-medium text-gray-700">
                        Merkmal 1
                      </Label>
                      <Input
                        id="edit-char1"
                        value={editingCategoryData.characteristic1}
                        onChange={(e) => setEditingCategoryData({
                          ...editingCategoryData,
                          characteristic1: e.target.value
                        })}
                        className="mt-1"
                        placeholder="z.B. Kabeltyp"
                        disabled={editingCategoryData.concernId === 'LUFGENERIC'}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-char2" className="text-sm font-medium text-gray-700">
                        Merkmal 2
                      </Label>
                      <Input
                        id="edit-char2"
                        value={editingCategoryData.characteristic2}
                        onChange={(e) => setEditingCategoryData({
                          ...editingCategoryData,
                          characteristic2: e.target.value
                        })}
                        className="mt-1"
                        placeholder="z.B. Anzahl Kerne"
                        disabled={editingCategoryData.concernId === 'LUFGENERIC'}
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-char3" className="text-sm font-medium text-gray-700">
                        Merkmal 3
                      </Label>
                      <Input
                        id="edit-char3"
                        value={editingCategoryData.characteristic3}
                        onChange={(e) => setEditingCategoryData({
                          ...editingCategoryData,
                          characteristic3: e.target.value
                        })}
                        className="mt-1"
                        placeholder="z.B. Kerndicke"
                        disabled={editingCategoryData.concernId === 'LUFGENERIC'}
                      />
                    </div>
                  </div>

                  {/* Einträge bearbeiten - Excel-ähnliche Tabelle */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-sm font-medium text-gray-700">
                        Einträge ({editingCategoryData.items.length})
                      </Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const newItem = {
                            id: `temp-${Date.now()}`,
                            value1: '',
                            value2: '',
                            value3: ''
                          };
                          setEditingCategoryData({
                            ...editingCategoryData,
                            items: [...editingCategoryData.items, newItem]
                          });
                        }}
                        disabled={editingCategoryData.concernId === 'LUFGENERIC'}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Zeile hinzufügen
                      </Button>
                    </div>

                    {/* Excel-ähnliche Tabelle mit Scrollbar */}
                    <div className="border-2 border-gray-300 rounded-lg overflow-hidden bg-white">
                      {/* Sortierung zurücksetzen Option */}
                      {editSortColumn && (
                        <div className="bg-blue-50 border-b border-blue-200 p-2 flex items-center justify-between">
                          <span className="text-sm text-blue-700">
                            Sortiert nach: <strong>{editSortColumn === 'order' ? '#' : 
                              editSortColumn === 'value1' ? editingCategoryData.characteristic1 :
                              editSortColumn === 'value2' ? editingCategoryData.characteristic2 :
                              editingCategoryData.characteristic3}</strong> 
                            ({editSortDirection === 'asc' ? 'aufsteigend' : 'absteigend'})
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditSortColumn(null);
                              setEditSortDirection('asc');
                            }}
                            className="text-blue-600 hover:text-blue-700 h-6 px-2 text-xs"
                          >
                            Sortierung zurücksetzen
                          </Button>
                        </div>
                      )}
                      
                      <div className="overflow-x-auto">
                        <div className="min-w-full">
                                                     {/* Header - Fest positioniert mit Sortier-Funktionalität */}
                           <div className="sticky top-0 z-10 bg-gray-100 border-b-2 border-gray-300">
                             <div className="grid grid-cols-5 gap-0 min-w-[700px]">
                               <div 
                                 className="p-3 font-semibold text-gray-700 text-center border-r border-gray-300 bg-gray-200 cursor-pointer hover:bg-gray-300 transition-colors"
                                 onClick={() => handleSortTable('order')}
                               >
                                 <div className="flex items-center justify-center gap-1">
                                   #
                                   {editSortColumn === 'order' && (
                                     editSortDirection === 'asc' ? (
                                       <ArrowUp className="w-4 h-4 text-blue-600" />
                                     ) : (
                                       <ArrowDown className="w-4 h-4 text-blue-600" />
                                     )
                                   )}
                                 </div>
                               </div>
                               <div 
                                 className="p-3 font-semibold text-gray-700 text-center border-r border-gray-300 bg-gray-200 cursor-pointer hover:bg-gray-300 transition-colors"
                                 onClick={() => handleSortTable('value1')}
                               >
                                 <div className="flex items-center justify-center gap-1">
                                   {editingCategoryData.characteristic1}
                                   {editSortColumn === 'value1' && (
                                     editSortDirection === 'asc' ? (
                                       <ArrowUp className="w-4 h-4 text-blue-600" />
                                     ) : (
                                       <ArrowDown className="w-4 h-4 text-blue-600" />
                                     )
                                   )}
                                 </div>
                               </div>
                               <div 
                                 className="p-3 font-semibold text-gray-700 text-center border-r border-gray-300 bg-gray-200 cursor-pointer hover:bg-gray-300 transition-colors"
                                 onClick={() => handleSortTable('value2')}
                               >
                                 <div className="flex items-center justify-center gap-1">
                                   {editingCategoryData.characteristic2}
                                   {editSortColumn === 'value2' && (
                                     editSortDirection === 'asc' ? (
                                       <ArrowUp className="w-4 h-4 text-blue-600" />
                                     ) : (
                                       <ArrowDown className="w-4 h-4 text-blue-600" />
                                     )
                                   )}
                                 </div>
                               </div>
                               <div 
                                 className="p-3 font-semibold text-gray-700 text-center border-r border-gray-300 bg-gray-200 cursor-pointer hover:bg-gray-300 transition-colors"
                                 onClick={() => handleSortTable('value3')}
                               >
                                 <div className="flex items-center justify-center gap-1">
                                   {editingCategoryData.characteristic3}
                                   {editSortColumn === 'value3' && (
                                     editSortDirection === 'asc' ? (
                                       <ArrowUp className="w-4 h-4 text-blue-600" />
                                     ) : (
                                       <ArrowDown className="w-4 h-4 text-blue-600" />
                                     )
                                   )}
                                 </div>
                               </div>
                               <div className="p-3 font-semibold text-gray-700 text-center bg-gray-200">
                                 Aktion
                               </div>
                             </div>
                           </div>

                                                     {/* Body - Scrollbar */}
                           <div className="max-h-[400px] overflow-y-auto">
                             {getSortedItems().map((item, sortedIndex) => {
                               // Finde den ursprünglichen Index des Items in der unsortierten Liste
                               const originalIndex = editingCategoryData.items.findIndex(originalItem => originalItem.id === item.id);
                               
                               return (
                                 <div 
                                   key={item.id} 
                                   className={`grid grid-cols-5 gap-0 min-w-[700px] border-b border-gray-200 hover:bg-gray-50 ${
                                     sortedIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                                   }`}
                                 >
                                   {/* Zeilennummer */}
                                   <div className="p-3 text-center text-sm text-gray-500 border-r border-gray-200 bg-gray-100 font-mono">
                                     {item.order || sortedIndex + 1}
                                   </div>
                                   
                                   {/* Wert 1 */}
                                   <div className="p-2 border-r border-gray-200">
                                     <Input
                                       value={item.value1}
                                       onChange={(e) => {
                                         const newItems = [...editingCategoryData.items];
                                         newItems[originalIndex] = { ...item, value1: e.target.value };
                                         setEditingCategoryData({
                                           ...editingCategoryData,
                                           items: newItems
                                         });
                                       }}
                                       className="h-8 text-sm border-0 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-transparent"
                                       placeholder="Eingabe..."
                                       disabled={editingCategoryData.concernId === 'LUFGENERIC'}
                                     />
                                   </div>
                                   
                                   {/* Wert 2 */}
                                   <div className="p-2 border-r border-gray-200">
                                     <Input
                                       value={item.value2}
                                       onChange={(e) => {
                                         const newItems = [...editingCategoryData.items];
                                         newItems[originalIndex] = { ...item, value2: e.target.value };
                                         setEditingCategoryData({
                                           ...editingCategoryData,
                                           items: newItems
                                         });
                                       }}
                                       className="h-8 text-sm border-0 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-transparent"
                                       placeholder="Eingabe..."
                                       disabled={editingCategoryData.concernId === 'LUFGENERIC'}
                                     />
                                   </div>
                                   
                                   {/* Wert 3 */}
                                   <div className="p-2 border-r border-gray-200">
                                     <Input
                                       value={item.value3}
                                       onChange={(e) => {
                                         const newItems = [...editingCategoryData.items];
                                         newItems[originalIndex] = { ...item, value3: e.target.value };
                                         setEditingCategoryData({
                                           ...editingCategoryData,
                                           items: newItems
                                         });
                                       }}
                                       className="h-8 text-sm border-0 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-transparent"
                                       placeholder="Eingabe..."
                                       disabled={editingCategoryData.concernId === 'LUFGENERIC'}
                                     />
                                   </div>
                                   
                                   {/* Lösch-Button direkt in der Zeile */}
                                   <div className="p-2 flex items-center justify-center">
                                     <Button
                                       type="button"
                                       variant="outline"
                                       size="sm"
                                       onClick={() => {
                                         const newItems = editingCategoryData.items.filter((_, i) => i !== originalIndex);
                                         setEditingCategoryData({
                                           ...editingCategoryData,
                                           items: newItems
                                         });
                                       }}
                                       className="h-8 w-8 p-0 hover:bg-red-50 hover:border-red-300 hover:text-red-600"
                                       disabled={editingCategoryData.concernId === 'LUFGENERIC'}
                                     >
                                       <Trash2 className="w-4 h-4" />
                                     </Button>
                                   </div>
                                 </div>
                               );
                             })}
                             
                             {/* Leere Zeile am Ende für bessere Bearbeitung */}
                             <div className="grid grid-cols-5 gap-0 min-w-[700px] border-b border-gray-200 bg-blue-50">
                               <div className="p-3 text-center text-sm text-gray-400 border-r border-gray-200 bg-blue-100 font-mono">
                                 {editingCategoryData.items.length + 1}
                               </div>
                               <div className="p-2 border-r border-gray-200">
                                 <Input
                                   className="h-8 text-sm border-0 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-transparent"
                                   placeholder="Neue Zeile..."
                                   onKeyDown={(e) => {
                                     if (e.key === 'Enter') {
                                       const newItem = {
                                         id: `temp-${Date.now()}`,
                                         value1: e.currentTarget.value,
                                         value2: '',
                                         value3: ''
                                       };
                                       setEditingCategoryData({
                                         ...editingCategoryData,
                                         items: [...editingCategoryData.items, newItem]
                                       });
                                       e.currentTarget.value = '';
                                     }
                                   }}
                                   disabled={editingCategoryData.concernId === 'LUFGENERIC'}
                                 />
                               </div>
                               <div className="p-2 border-r border-gray-200">
                                 <Input
                                   className="h-8 text-sm border-0 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-transparent"
                                   placeholder="..."
                                   disabled={editingCategoryData.concernId === 'LUFGENERIC'}
                                 />
                               </div>
                               <div className="p-2 border-r border-gray-200">
                                 <Input
                                   className="h-8 text-sm border-0 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-transparent"
                                   placeholder="..."
                                   disabled={editingCategoryData.concernId === 'LUFGENERIC'}
                                 />
                               </div>
                               <div className="p-2 flex items-center justify-center">
                                 <div className="w-8 h-8"></div> {/* Platzhalter für Ausrichtung */}
                               </div>
                             </div>
                           </div>
                         </div>
                       </div>
                     </div>
                  </div>
                </div>
              )}

              {/* Aktions-Buttons */}
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditingCategory(false);
                    setEditingCategoryData(null);
                  }}
                  className="flex-1"
                >
                  {editingCategoryData?.concernId === 'LUFGENERIC' ? 'Schließen' : 'Abbrechen'}
                </Button>
                {editingCategoryData?.concernId !== 'LUFGENERIC' && (
                  <Button
                    onClick={handleSaveEditedCategory}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Änderungen speichern
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Main Content */}
      <div className="p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}

          {/* Loading and Error States */}
          {categoriesLoading && (
            <Card className="bg-blue-50 border-2 border-blue-200">
              <CardContent className="p-6 text-center">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="text-lg font-medium text-blue-800">Lade Kategorien...</span>
                </div>
                <p className="text-blue-600">Kategorien werden aus der Datenbank geladen</p>
              </CardContent>
            </Card>
          )}

          {categoriesLoadError && !categoriesLoading && (
            <Card className="bg-red-50 border-2 border-red-200">
              <CardContent className="p-6 text-center">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <AlertCircle className="h-8 w-8 text-red-600" />
                  <span className="text-lg font-medium text-red-800">Fehler beim Laden</span>
                </div>
                <p className="text-red-600 mb-4">{categoriesLoadError}</p>
                <Button
                  onClick={() => {
                    if (user?.concernID) {
                      const loadCategoriesFromFirestore = async () => {
                        setCategoriesLoading(true);
                        setCategoriesLoadError(null);
                        try {
                          // Load concern-specific categories
                          const concernQuery = query(
                            collection(db, 'lookupFamilies'),
                            where('concernId', '==', user.concernID)
                          );
                          
                          const concernSnapshot = await getDocs(concernQuery);
                          
                          // Load generic categories
                          const genericQuery = query(
                            collection(db, 'lookupFamilies'),
                            where('concernId', '==', 'LUFGENERIC')
                          );
                          
                          const genericSnapshot = await getDocs(genericQuery);
                          
                          // Process categories (simplified version)
                          const concernCategories: ExtendedCategory[] = [];
                          const genericCategories: ExtendedCategory[] = [];
                          
                          // Process concern categories
                          for (const doc of concernSnapshot.docs) {
                            const data = doc.data();
                            try {
                              const optionsQuery = query(
                                collection(db, 'lookupOptions'),
                                where('familyId', '==', data.familyId)
                              );
                              const optionsSnapshot = await getDocs(optionsQuery);
                              
                              const hasLevels = data.level0 && data.level1 && data.level2;
                              
                              if (hasLevels) {
                                const level1Options = optionsSnapshot.docs
                                  .filter(doc => doc.data().level === 1)
                                  .sort((a, b) => (a.data().order || 0) - (b.data().order || 0));
                                const level2Options = optionsSnapshot.docs
                                  .filter(doc => doc.data().level === 2)
                                  .sort((a, b) => (a.data().order || 0) - (b.data().order || 0));
                                const level3Options = optionsSnapshot.docs
                                  .filter(doc => doc.data().level === 3)
                                  .sort((a, b) => (a.data().order || 0) - (b.data().order || 0));
                                
                                // Create items array with proper structure using order from database
                                const items = [];
                                
                                // Get all unique order values from all levels
                                const allOrders = new Set([
                                  ...level1Options.map(doc => doc.data().order || 0),
                                  ...level2Options.map(doc => doc.data().order || 0),
                                  ...level3Options.map(doc => doc.data().order || 0)
                                ]);
                                
                                // Sort orders and create items
                                const sortedOrders = Array.from(allOrders).sort((a, b) => a - b);
                                
                                for (const order of sortedOrders) {
                                  const level1Option = level1Options.find(doc => doc.data().order === order);
                                  const level2Option = level2Options.find(doc => doc.data().order === order);
                                  const level3Option = level3Options.find(doc => doc.data().order === order);
                                  
                                  items.push({
                                    id: `item-${order}`,
                                    order: order,
                                    value1: level1Option?.data().value || '',
                                    value2: level2Option?.data().value || '',
                                    value3: level3Option?.data().value || ''
                                  });
                                }

                                concernCategories.push({
                                  id: doc.id,
                                  title: data.familyName,
                                  type: 'type2',
                                  characteristic1: data.level0 || 'Merkmal 1',
                                  characteristic2: data.level1 || 'Merkmal 2',
                                  characteristic3: data.level2 || 'Merkmal 3',
                                  items: items.filter(item => item.value1 || item.value2 || item.value3),
                                  createdAt: data.createdAt?.toDate() || new Date(),
                                  updatedAt: data.updatedAt?.toDate() || new Date(),
                                  concernId: data.concernId
                                });
                              } else {
                                const contentOption = optionsSnapshot.docs.find(doc => doc.data().level === 1);
                                concernCategories.push({
                                  id: doc.id,
                                  title: data.familyName,
                                  type: 'type1',
                                  content: contentOption?.data().value || 'Kein Inhalt verfügbar',
                                  contentType: 'text',
                                  createdAt: data.createdAt?.toDate() || new Date(),
                                  updatedAt: data.updatedAt?.toDate() || new Date(),
                                  concernId: data.concernId
                                });
                              }
                            } catch (optionError) {
                              console.error('Error processing options for category:', data.familyName, optionError);
                            }
                          }
                          
                          // Process generic categories (same logic)
                          for (const doc of genericSnapshot.docs) {
                            const data = doc.data();
                            try {
                              const optionsQuery = query(
                                collection(db, 'lookupOptions'),
                                where('familyId', '==', data.familyId)
                              );
                              const optionsSnapshot = await getDocs(optionsQuery);
                              
                              const hasLevels = data.level0 && data.level1 && data.level2;
                              
                              if (hasLevels) {
                                const level1Options = optionsSnapshot.docs
                                  .filter(doc => doc.data().level === 1)
                                  .sort((a, b) => (a.data().order || 0) - (b.data().order || 0));
                                const level2Options = optionsSnapshot.docs
                                  .filter(doc => doc.data().level === 2)
                                  .sort((a, b) => (a.data().order || 0) - (b.data().order || 0));
                                const level3Options = optionsSnapshot.docs
                                  .filter(doc => doc.data().level === 3)
                                  .sort((a, b) => (a.data().order || 0) - (b.data().order || 0));
                                
                                // Create items array with proper structure using order from database
                                const items = [];
                                
                                // Get all unique order values from all levels
                                const allOrders = new Set([
                                  ...level1Options.map(doc => doc.data().order || 0),
                                  ...level2Options.map(doc => doc.data().order || 0),
                                  ...level3Options.map(doc => doc.data().order || 0)
                                ]);
                                
                                // Sort orders and create items
                                const sortedOrders = Array.from(allOrders).sort((a, b) => a - b);
                                
                                for (const order of sortedOrders) {
                                  const level1Option = level1Options.find(doc => doc.data().order === order);
                                  const level2Option = level2Options.find(doc => doc.data().order === order);
                                  const level3Option = level3Options.find(doc => doc.data().order === order);
                                  
                                  items.push({
                                    id: `item-${order}`,
                                    order: order,
                                    value1: level1Option?.data().value || '',
                                    value2: level2Option?.data().value || '',
                                    value3: level3Option?.data().value || ''
                                  });
                                }

                                genericCategories.push({
                                  id: doc.id,
                                  title: data.familyName,
                                  type: 'type2',
                                  characteristic1: data.level0 || 'Merkmal 1',
                                  characteristic2: data.level1 || 'Merkmal 2',
                                  characteristic3: data.level2 || 'Merkmal 3',
                                  items: items.filter(item => item.value1 || item.value2 || item.value3),
                                  createdAt: data.createdAt?.toDate() || new Date(),
                                  updatedAt: data.updatedAt?.toDate() || new Date(),
                                  concernId: data.concernId
                                });
                              } else {
                                const contentOption = optionsSnapshot.docs.find(doc => doc.data().level === 1);
                                genericCategories.push({
                                  id: doc.id,
                                  title: data.familyName,
                                  type: 'type1',
                                  content: contentOption?.data().value || 'Kein Inhalt verfügbar',
                                  contentType: 'text',
                                  createdAt: data.createdAt?.toDate() || new Date(),
                                  updatedAt: data.updatedAt?.toDate() || new Date(),
                                  concernId: data.concernId
                                });
                              }
                            } catch (optionError) {
                              console.error('Error processing options for generic category:', data.familyName, optionError);
                            }
                          }
                          
                          setExtendedCategories([...concernCategories, ...genericCategories]);
                          setCategoriesLoading(false);
                          
                          toast({
                            title: 'Kategorien erfolgreich geladen',
                            description: `${concernCategories.length + genericCategories.length} Kategorien geladen`,
                          });
                          
                        } catch (error) {
                          console.error('Error retrying category load:', error);
                          setCategoriesLoading(false);
                          setCategoriesLoadError('Fehler beim erneuten Laden der Kategorien');
                        }
                      };
                      
                      loadCategoriesFromFirestore();
                    }
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Erneut versuchen
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="tradetrackr-card bg-gradient-to-br from-[#058bc0] to-[#0470a0] text-white shadow-lg hover:shadow-2xl transition-all hover:scale-105">
              <CardHeader className="pb-1 pt-3">
                <CardTitle className="text-sm font-medium text-white/90 flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Gesamt
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="text-2xl font-bold text-white">{filteredCategories.length}</div>
                <p className="text-xs text-white/80">Kategorien</p>
              </CardContent>
            </Card>
            <Card className="tradetrackr-card bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg hover:shadow-2xl transition-all hover:scale-105">
              <CardHeader className="pb-1 pt-3">
                <CardTitle className="text-sm font-medium text-white/90 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Mit Inhalt
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="text-2xl font-bold text-white">{filteredCategories.filter(c => c.items.length > 0).length}</div>
                <p className="text-xs text-white/80">Befüllt</p>
              </CardContent>
            </Card>
            <Card className="tradetrackr-card bg-gradient-to-br from-gray-500 to-gray-600 text-white shadow-lg hover:shadow-2xl transition-all hover:scale-105">
              <CardHeader className="pb-1 pt-3">
                <CardTitle className="text-sm font-medium text-white/90 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Leer
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="text-2xl font-bold text-white">{filteredCategories.filter(c => c.items.length === 0).length}</div>
                <p className="text-xs text-white/80">Ohne Items</p>
              </CardContent>
            </Card>
            <Card className="tradetrackr-card bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg hover:shadow-2xl transition-all hover:scale-105">
              <CardHeader className="pb-1 pt-3">
                <CardTitle className="text-sm font-medium text-white/90 flex items-center gap-2">
                  <Hash className="h-4 w-4" />
                  Items
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="text-2xl font-bold text-white">{filteredCategories.reduce((sum, c) => sum + c.items.length, 0)}</div>
                <p className="text-xs text-white/80">Gesamt</p>
              </CardContent>
            </Card>
          </div>

          {/* Controls Card */}
          <Card className="tradetrackr-card border-2 border-[#058bc0] shadow-xl overflow-hidden mb-6">
            <CardHeader className="bg-gradient-to-r from-[#058bc0] to-[#0470a0] text-white px-6 pt-4 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <span className="text-2xl">🔍</span>
                  Filter & Suche
                  <Badge className="ml-3 bg-white/20 text-white font-semibold border-0">
                    {filteredCategories.length} Kategorien
                  </Badge>
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={handleExcelImport}
                    size="sm"
                    className="h-8 px-3 border-white text-white hover:bg-white/20 transition-all"
                  >
                    <Upload className="h-4 w-4 mr-1" />
                    📥 Import
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleExcelExport}
                    size="sm"
                    className="h-8 px-3 border-white text-white hover:bg-white/20 transition-all"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    📤 Export
                  </Button>
                  <Button
                    variant={viewMode === 'table' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('table')}
                    className={`h-8 px-3 transition-all ${viewMode === 'table' ? 'bg-white text-[#058bc0] hover:bg-white/90' : 'border-white text-white hover:bg-white/20'}`}
                  >
                    <TableIcon className="h-4 w-4 mr-1" />
                    Tabelle
                  </Button>
                  <Button
                    variant={viewMode === 'cards' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setViewMode('cards')}
                    className={`h-8 px-3 transition-all ${viewMode === 'cards' ? 'bg-white text-[#058bc0] hover:bg-white/90' : 'border-white text-white hover:bg-white/20'}`}
                  >
                    <Package className="h-4 w-4 mr-1" />
                    Karten
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="bg-gradient-to-br from-blue-50 to-cyan-50 p-6 space-y-4">
              {/* Search and Filters */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">🔎</div>
                  <Input
                    placeholder="Nach Kategoriename oder Artikeln suchen..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 border-2 border-gray-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/20 shadow-sm"
                  />
                </div>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg z-10 pointer-events-none">🏷️</div>
                  <Select value={statusFilter} onValueChange={(value: 'all' | 'populated' | 'empty') => setStatusFilter(value)}>
                    <SelectTrigger className="pl-10 border-2 border-gray-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/20 shadow-sm bg-white">
                      <SelectValue placeholder="Status auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">🎯 Alle Kategorien</SelectItem>
                      <SelectItem value="populated">✅ Mit Inhalt</SelectItem>
                      <SelectItem value="empty">📭 Leer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Clear Filters */}
              {(searchTerm || statusFilter !== 'all') && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearFilters}
                    className="text-xs h-8 px-3 border-2 border-red-300 hover:border-red-500 hover:bg-red-50 transition-all"
                  >
                    <X className="h-3 w-3 mr-1" />
                    ❌ Alle Filter zurücksetzen
                  </Button>
                </div>
              )}
              

            </CardContent>
          </Card>

          {/* Extended Categories Section */}
          {extendedCategories.length > 0 && !categoriesLoading && (
            <>
              {/* Concern-Specific Categories */}
              {extendedCategories.filter(cat => cat.concernId && cat.concernId !== 'LUFGENERIC').length > 0 && (
                <Card className="tradetrackr-card border-2 border-[#058bc0] shadow-xl overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-[#058bc0] to-[#0470a0] text-white px-6 py-4">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <Building className="w-5 h-5" />
                      🏢 Concern-spezifische Kategorien ({extendedCategories.filter(cat => cat.concernId && cat.concernId !== 'LUFGENERIC').length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="bg-gradient-to-br from-blue-50 to-cyan-50 p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {extendedCategories
                        .filter(cat => cat.concernId && cat.concernId !== 'LUFGENERIC')
                        .map((category) => (
                        <Card 
                          key={category.id} 
                          className="border-2 border-blue-300 hover:border-[#058bc0] bg-white hover:shadow-2xl transition-all cursor-pointer hover:scale-105"
                          onClick={() => handleCategoryClick(category)}
                        >
                          <CardHeader className="pb-3 bg-gradient-to-br from-blue-50 to-cyan-50 border-b-2 border-blue-200">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {category.type === 'type1' ? (
                                  <div className="p-2 bg-blue-500 rounded-lg">
                                    <Type className="w-4 h-4 text-white" />
                                  </div>
                                ) : (
                                  <div className="p-2 bg-green-500 rounded-lg">
                                    <Database className="w-4 h-4 text-white" />
                                  </div>
                                )}
                                <CardTitle className="text-sm font-bold text-gray-900">
                                  {category.title}
                                </CardTitle>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge className={category.type === 'type1' ? 'bg-blue-100 text-blue-800 border-0' : 'bg-green-100 text-green-800 border-0'}>
                                  {category.type === 'type1' ? '📝 Typ 1' : '🗂️ Typ 2'}
                                </Badge>
                                {/* Lösch-Button */}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCategoryToDelete(category);
                                    setShowDeleteConfirmation(true);
                                  }}
                                  className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-100 rounded-full"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3 pt-3">
                            {category.type === 'type1' ? (
                              <div>
                                <p className="text-xs text-gray-600 mb-2 font-semibold flex items-center gap-1">
                                  <span>📋</span>
                                  Inhaltstyp: {category.contentType === 'text' ? '📝 Text' : '📊 Tabelle'}
                                </p>
                                <div className="text-sm text-gray-800 bg-gradient-to-br from-gray-50 to-gray-100 p-3 rounded-lg border border-gray-200">
                                  {category.content.substring(0, 100)}
                                  {category.content.length > 100 && '...'}
                                </div>
                              </div>
                            ) : (
                              <div>
                                <div className="grid grid-cols-3 gap-2 text-xs">
                                  <div className="text-center p-2 bg-gradient-to-br from-blue-50 to-cyan-50 rounded border border-blue-200">
                                    <div className="font-semibold text-gray-900">{category.characteristic1}</div>
                                    <div className="text-gray-600 text-xs mt-1">{category.items.length} Einträge</div>
                                  </div>
                                  <div className="text-center p-2 bg-gradient-to-br from-green-50 to-emerald-50 rounded border border-green-200">
                                    <div className="font-semibold text-gray-900">{category.characteristic2}</div>
                                  </div>
                                  <div className="text-center p-2 bg-gradient-to-br from-purple-50 to-pink-50 rounded border border-purple-200">
                                    <div className="font-semibold text-gray-900">{category.characteristic3}</div>
                                  </div>
                                </div>
                              </div>
                            )}
                            <div className="flex justify-between items-center text-xs bg-gray-50 p-2 rounded border border-gray-200">
                              <span className="text-gray-600 flex items-center gap-1">
                                <span>📅</span>
                                Erstellt: {category.createdAt.toLocaleDateString('de-DE')}
                              </span>
                              <span className="text-gray-600 flex items-center gap-1">
                                <span>🔄</span>
                                {category.updatedAt.toLocaleDateString('de-DE')}
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Generic Categories */}
              {extendedCategories.filter(cat => cat.concernId === 'LUFGENERIC').length > 0 && (
                <Card className="tradetrackr-card border-2 border-purple-500 shadow-xl overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-6 py-4">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <Package className="w-5 h-5" />
                      🌍 Generische Kategorien ({extendedCategories.filter(cat => cat.concernId === 'LUFGENERIC').length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="bg-gradient-to-br from-purple-50 to-pink-50 p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {extendedCategories
                        .filter(cat => cat.concernId === 'LUFGENERIC')
                        .map((category) => (
                        <Card key={category.id} className="border-2 border-purple-300 hover:border-purple-500 bg-white hover:shadow-2xl transition-all cursor-pointer hover:scale-105"
                          onClick={() => handleCategoryClick(category)}
                        >
                          <CardHeader className="pb-3 bg-gradient-to-br from-purple-50 to-pink-50 border-b-2 border-purple-200">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {category.type === 'type1' ? (
                                  <div className="p-2 bg-blue-500 rounded-lg">
                                    <Type className="w-4 h-4 text-white" />
                                  </div>
                                ) : (
                                  <div className="p-2 bg-green-500 rounded-lg">
                                    <Database className="w-4 h-4 text-white" />
                                  </div>
                                )}
                                <CardTitle className="text-sm font-bold text-gray-900">
                                  {category.title}
                                </CardTitle>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge className={category.type === 'type1' ? 'bg-blue-100 text-blue-800 border-0' : 'bg-green-100 text-green-800 border-0'}>
                                  {category.type === 'type1' ? '📝 Typ 1' : '🗂️ Typ 2'}
                                </Badge>
                                <Badge className="bg-purple-100 text-purple-800 border-0">
                                  🌍 Generisch
                                </Badge>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3 pt-3">
                            {category.type === 'type1' ? (
                              <div>
                                <p className="text-xs text-gray-600 mb-2 font-semibold flex items-center gap-1">
                                  <span>📋</span>
                                  Inhaltstyp: {category.contentType === 'text' ? '📝 Text' : '📊 Tabelle'}
                                </p>
                                <div className="text-sm text-gray-800 bg-gradient-to-br from-gray-50 to-gray-100 p-3 rounded-lg border border-gray-200">
                                  {category.content.substring(0, 100)}
                                  {category.content.length > 100 && '...'}
                                </div>
                              </div>
                            ) : (
                              <div>
                                <div className="grid grid-cols-3 gap-2 text-xs">
                                  <div className="text-center p-2 bg-gradient-to-br from-blue-50 to-cyan-50 rounded border border-blue-200">
                                    <div className="font-semibold text-gray-900">{category.characteristic1}</div>
                                    <div className="text-gray-600 text-xs mt-1">{category.items.length} Einträge</div>
                                  </div>
                                  <div className="text-center p-2 bg-gradient-to-br from-green-50 to-emerald-50 rounded border border-green-200">
                                    <div className="font-semibold text-gray-900">{category.characteristic2}</div>
                                  </div>
                                  <div className="text-center p-2 bg-gradient-to-br from-purple-50 to-pink-50 rounded border border-purple-200">
                                    <div className="font-semibold text-gray-900">{category.characteristic3}</div>
                                  </div>
                                </div>
                              </div>
                            )}
                            <div className="flex justify-between items-center text-xs bg-gray-50 p-2 rounded border border-gray-200">
                              <span className="text-gray-600 flex items-center gap-1">
                                <span>📅</span>
                                Erstellt: {category.createdAt.toLocaleDateString('de-DE')}
                              </span>
                              <span className="text-gray-600 flex items-center gap-1">
                                <span>🔄</span>
                                {category.updatedAt.toLocaleDateString('de-DE')}
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
            )}



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

      {/* Quick Action Sidebar */}

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

      {/* Klon-Bestätigungsdialog */}
      <Dialog open={showCloneConfirmation} onOpenChange={setShowCloneConfirmation}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Copy className="w-5 h-5 text-blue-600" />
              Kategorie klonen bestätigen
            </DialogTitle>
          </DialogHeader>
          
          {selectedCategoryForUpload && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Copy className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {selectedCategoryForUpload.title}
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Möchten Sie diese generische Kategorie wirklich in Ihren Concern klonen?
                </p>
              </div>

              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white text-sm font-bold">i</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-blue-900 mb-1">
                      Was passiert beim Klonen?
                    </p>
                    <p className="text-sm text-blue-700">
                      Die Kategorie wird mit allen Einträgen in Ihren Concern kopiert. Sie können die geklonte Version dann nach Belieben anpassen.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCloneConfirmation(false);
                    setShowUploadDialog(false);
                  }}
                  className="flex-1"
                  disabled={isCloning}
                >
                  Abbrechen
                </Button>
                <Button
                  onClick={() => {
                    handleCloneGenericCategory(selectedCategoryForUpload);
                    setShowCloneConfirmation(false);
                    setShowUploadDialog(false);
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  disabled={isCloning}
                >
                  {isCloning ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Klone...
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      Ja, klonen
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Lösch-Bestätigungsdialog */}
      <Dialog open={showDeleteConfirmation} onOpenChange={setShowDeleteConfirmation}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-600" />
              Kategorie löschen bestätigen
            </DialogTitle>
          </DialogHeader>
          
          {categoryToDelete && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="w-8 h-8 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {categoryToDelete.title}
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Sind Sie sicher, dass Sie diese Kategorie wirklich löschen möchten?
                </p>
              </div>

              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white text-sm font-bold">!</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-red-900 mb-1">
                      Achtung: Diese Aktion kann nicht rückgängig gemacht werden!
                    </p>
                    <p className="text-sm text-red-700">
                      Alle Einträge und Daten dieser Kategorie werden permanent gelöscht.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDeleteConfirmation(false);
                    setCategoryToDelete(null);
                  }}
                  className="flex-1"
                  disabled={isDeleting}
                >
                  Abbrechen
                </Button>
                <Button
                  onClick={() => {
                    if (categoryToDelete) {
                      handleDeleteCategory(categoryToDelete);
                      setShowDeleteConfirmation(false);
                      setCategoryToDelete(null);
                    }
                  }}
                  className="flex-1 bg-red-600 hover:bg-red-700"
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Lösche...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Ja, löschen
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Categories;
