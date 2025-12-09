import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Plus, Save, Edit, Trash2, Search, ArrowLeft, User, Building, Mail, Phone, MapPin, Eye, Table as TableIcon, Package, X, ArrowUpDown, ArrowUp, ArrowDown, FolderOpen, CheckSquare, BarChart3, ClipboardList, FileText, RefreshCw, Archive } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import AppHeader from './AppHeader';

import { Customer, CustomerManagementProps } from '@/types';
import { useQuickAction } from '@/contexts/QuickActionContext';
import { useFormValidation, validationRules } from '@/hooks/use-form-validation';
import { customerService } from '@/services/firestoreService';
import { FormInput, FormTextarea, FormSelect } from '@/components/ui/form-input';
import { FormErrorSummary } from '@/components/ui/form-error-summary';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { useTabletLayout } from '@/hooks/useTabletLayout';
import { PullToRefreshIndicator } from '@/components/ui/PullToRefreshIndicator';
import { useResponsiveViewMode } from '@/hooks/use-responsive-view-mode';
import { cn } from '@/lib/utils';

const CustomerManagement: React.FC<CustomerManagementProps> = ({ onBack, onNavigate, onOpenMessaging }) => {
  const { user, hasPermission } = useAuth();
  const { t } = useLanguage();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [viewMode, setViewMode, isMobile] = useResponsiveViewMode('table');
  const [sortBy, setSortBy] = useState<string>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Undo functionality
  const [deletedCustomer, setDeletedCustomer] = useState<Customer | null>(null);
  const [showUndo, setShowUndo] = useState(false);
  
  // Infinite scroll state
  const [displayedCustomersCount, setDisplayedCustomersCount] = useState(20);
  const itemsPerPage = 20;
  
  // Tablet layout
  const { isTablet, isTwoColumn } = useTabletLayout();
  
  // Pull-to-refresh - reload from Firestore
  const handleRefresh = async () => {
    if (!user?.concernID) return;
    
    try {
      // Invalidate cache and reload from Firestore
      const { cacheService } = await import('@/services/cacheService');
      await cacheService.invalidate('customers', user.concernID);
      
      const customersData = await customerService.getAll(user.concernID, true);
      
      if (customersData && Array.isArray(customersData)) {
        const validCustomers = customersData.filter(c => {
          const hasConcernID = c.concernID === user.concernID;
          const hasName = c.name && c.name.trim().length > 0;
          const hasCompany = c.company && c.company.trim().length > 0;
          return hasConcernID && (hasName || hasCompany);
        });
        
        // Sort alphabetically
        validCustomers.sort((a, b) => {
          const nameA = (a.name || a.company || '').toLowerCase();
          const nameB = (b.name || b.company || '').toLowerCase();
          return nameA.localeCompare(nameB);
        });
        
        setCustomers(validCustomers);
        localStorage.setItem('customers', JSON.stringify(validCustomers));
        
        toast({
          title: "Aktualisiert",
          description: `${validCustomers.length} Kunden geladen.`,
        });
      }
    } catch (error) {
      console.error('Error refreshing customers:', error);
      toast({
        title: "Fehler",
        description: "Kunden konnten nicht aktualisiert werden.",
        variant: "destructive"
      });
    }
  };
  
  const { isRefreshing, pullDistance, canRefresh, containerProps } = usePullToRefresh({
    onRefresh: handleRefresh,
    threshold: 80,
    enabled: isMobile,
  });
  
  const [formData, setFormData] = useState<Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>>({
    name: '',
    company: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postalCode: '',
    contactPerson: '',
    notes: '',
    status: 'active'
  });

  // Form validation hook for critical fields
  const {
    values: validationValues,
    errors: validationErrors,
    touched: validationTouched,
    isValid: isFormValid,
    allErrors: formAllErrors,
    getFieldProps,
    handleSubmit: handleFormSubmit,
    reset: resetValidation,
    setValues: setValidationValues,
  } = useFormValidation({
    initialValues: {
      name: formData.name || '',
      company: formData.company || '',
      email: formData.email || '',
      phone: formData.phone || '',
      contactPerson: formData.contactPerson || '',
    },
    validationRules: {
      name: [
        validationRules.required('Der Name ist erforderlich'),
        validationRules.minLength(2, 'Der Name muss mindestens 2 Zeichen lang sein'),
        validationRules.maxLength(100, 'Der Name darf maximal 100 Zeichen lang sein'),
      ],
      company: [
        validationRules.minLength(2, 'Der Firmenname muss mindestens 2 Zeichen lang sein'),
        validationRules.maxLength(100, 'Der Firmenname darf maximal 100 Zeichen lang sein'),
      ],
      email: [
        validationRules.email('Bitte geben Sie eine gültige E-Mail-Adresse ein'),
      ],
      phone: [
        validationRules.phone('Bitte geben Sie eine gültige Telefonnummer ein'),
      ],
      contactPerson: [
        validationRules.maxLength(100, 'Der Ansprechpartner darf maximal 100 Zeichen lang sein'),
      ],
    },
    onSubmit: async (values) => {
      // Validation passed, continue with form submission
      // The actual submit is handled by the form's onSubmit handler
    },
    validateOnBlur: true,
    validateOnChange: false,
  });

  // Sync formData with validation values
  useEffect(() => {
    setValidationValues({
      name: formData.name || '',
      company: formData.company || '',
      email: formData.email || '',
      phone: formData.phone || '',
      contactPerson: formData.contactPerson || '',
    });
  }, [formData, setValidationValues]);

  // Check permissions
  const canManageCustomers = hasPermission('create_customer') || hasPermission('edit_customer') || hasPermission('delete_customer');
  const canViewCustomers = hasPermission('view_customers');

  const { isQuickAction, quickActionType } = useQuickAction();

  // Check if we should return to project form after customer creation
  useEffect(() => {
    const returnToProjectForm = localStorage.getItem('returnToProjectForm');
    if (returnToProjectForm === 'true') {
      // Show a message that we can return to the project form
      toast({
        title: "Kunde erfolgreich erstellt",
        description: "Sie können jetzt zum Projektformular zurückkehren.",
      });
    }
  }, []);

  // Load customers from Firestore (same source as project forms)
  useEffect(() => {
    const loadCustomersFromFirestore = async () => {
      if (!user?.concernID) {
        setCustomers([]);
        return;
      }
      
      try {
        console.log('🔄 [CustomerManagement] Loading customers from Firestore...');
        
        // Always invalidate cache and fetch fresh data
        const { cacheService } = await import('@/services/cacheService');
        await cacheService.invalidate('customers', user.concernID);
        
        // Load fresh data from Firestore (skip cache)
        const customersData = await customerService.getAll(user.concernID, true);
        console.log('📋 [CustomerManagement] Loaded customers:', customersData?.length || 0);
        
        if (customersData && Array.isArray(customersData)) {
          // Filter out any invalid customers and ensure they have concernID
          const validCustomers = customersData.filter(c => {
            const hasConcernID = c.concernID === user.concernID;
            const hasName = c.name && c.name.trim().length > 0;
            const hasCompany = c.company && c.company.trim().length > 0;
            return hasConcernID && (hasName || hasCompany);
          });
          
          // Sort alphabetically by name
          validCustomers.sort((a, b) => {
            const nameA = (a.name || a.company || '').toLowerCase();
            const nameB = (b.name || b.company || '').toLowerCase();
            return nameA.localeCompare(nameB);
          });
          
          console.log('📋 [CustomerManagement] Valid customers after filtering:', validCustomers.length);
          setCustomers(validCustomers);
          
          // Update localStorage with fresh data
          localStorage.setItem('customers', JSON.stringify(validCustomers));
          console.log('✅ [CustomerManagement] Customers saved to localStorage');
        } else {
          console.warn('⚠️ [CustomerManagement] Invalid customers data format:', customersData);
          setCustomers([]);
        }
      } catch (error) {
        console.error('❌ [CustomerManagement] Error loading customers from Firestore:', error);
        // Fallback to localStorage
        const savedCustomers = localStorage.getItem('customers');
        if (savedCustomers) {
          try {
            const parsed = JSON.parse(savedCustomers);
            // Filter by concernID even from localStorage
            const filtered = parsed.filter((c: Customer) => c.concernID === user?.concernID);
            setCustomers(filtered);
          } catch (parseError) {
            console.error('Error parsing saved customers:', parseError);
            setCustomers([]);
          }
        } else {
          setCustomers([]);
        }
      }
    };

    loadCustomersFromFirestore();
  }, [user?.concernID]);

  // Auto-open create form for quick actions using QuickAction context
  useEffect(() => {
    if (isQuickAction && quickActionType === 'customer') {
      setShowForm(true);
    }
  }, [isQuickAction, quickActionType]);

  // Funktion zum manuellen Neuladen der Kunden aus Firestore
  const reloadCustomersFromFirestore = async () => {
    if (!user?.concernID) return;
    
    try {
      // Invalidate cache and reload from Firestore
      const { cacheService } = await import('@/services/cacheService');
      await cacheService.invalidate('customers', user.concernID);
      
      const customersData = await customerService.getAll(user.concernID, true);
      
      if (customersData && Array.isArray(customersData)) {
        const validCustomers = customersData.filter(c => {
          const hasConcernID = c.concernID === user.concernID;
          const hasName = c.name && c.name.trim().length > 0;
          const hasCompany = c.company && c.company.trim().length > 0;
          return hasConcernID && (hasName || hasCompany);
        });
        
        // Sort alphabetically
        validCustomers.sort((a, b) => {
          const nameA = (a.name || a.company || '').toLowerCase();
          const nameB = (b.name || b.company || '').toLowerCase();
          return nameA.localeCompare(nameB);
        });
        
        setCustomers(validCustomers);
        localStorage.setItem('customers', JSON.stringify(validCustomers));
        
        toast({
          title: "Kunden aktualisiert",
          description: `${validCustomers.length} Kunden aus Firestore geladen.`,
        });
      }
    } catch (error) {
      console.error('Error reloading customers:', error);
      toast({
        title: "Fehler",
        description: "Kunden konnten nicht neu geladen werden.",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      company: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      postalCode: '',
      contactPerson: '',
      notes: '',
      status: 'active'
    });
    setEditingCustomer(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate critical fields first
    if (!isFormValid) {
      // Validation errors will be shown by FormErrorSummary
      return;
    }
    
    if (!formData.name.trim()) {
      toast({
        title: "Fehler",
        description: t('customer.nameRequired'),
        variant: "destructive",
      });
      return;
    }

    if (editingCustomer) {
      // Update existing customer
      const updatedCustomer: Customer = {
        ...editingCustomer,
        ...formData,
        updatedAt: new Date().toISOString()
      };
      
      // Update in Firestore if it has a Firestore ID (not a local ID)
      if (editingCustomer.id && !editingCustomer.id.startsWith('customer_')) {
        try {
          await customerService.update(editingCustomer.id, {
            ...formData,
            updatedAt: new Date().toISOString()
          });
          console.log('✅ [CustomerManagement] Customer updated in Firestore:', editingCustomer.id);
        } catch (error) {
          console.error('❌ [CustomerManagement] Error updating customer in Firestore:', error);
          toast({
            title: "Warnung",
            description: "Kunde wurde lokal aktualisiert, aber Firestore-Update fehlgeschlagen.",
            variant: "destructive",
          });
        }
      }
      
      setCustomers(prev => prev.map(customer => 
        customer.id === editingCustomer.id ? updatedCustomer : customer
      ));
      
      toast({
        title: "Erfolg",
        description: t('customer.customerUpdated'),
      });
    } else {
      // Create new customer
      try {
        // Save to Firestore first
        const customerData = {
          ...formData,
          concernID: user?.concernID || '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        const firestoreId = await customerService.create(customerData);
        console.log('✅ [CustomerManagement] Customer created in Firestore:', firestoreId);
        
        const newCustomer: Customer = {
          ...formData,
          id: firestoreId, // Use Firestore ID
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        setCustomers(prev => [newCustomer, ...prev]);
        
        toast({
          title: "Erfolg",
          description: t('customer.customerCreated'),
        });
      } catch (error) {
        console.error('❌ [CustomerManagement] Error creating customer in Firestore:', error);
        // Fallback: create locally only
        const newCustomer: Customer = {
          ...formData,
          id: Date.now().toString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        setCustomers(prev => [newCustomer, ...prev]);
        
        toast({
          title: "Warnung",
          description: "Kunde wurde lokal erstellt, aber Firestore-Speicherung fehlgeschlagen.",
          variant: "destructive",
        });
      }

      // Check if we should return to project form
      const returnToProjectForm = localStorage.getItem('returnToProjectForm');
      if (returnToProjectForm === 'true') {
        // Navigate back to project form
        if (onNavigate) {
          onNavigate('new-project');
        }
        // Clear the flag
        localStorage.removeItem('returnToProjectForm');
        localStorage.removeItem('projectFormData');
        return; // Don't close the form yet
      }
    }
    
    setShowForm(false);
    resetForm();
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      company: customer.company,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      city: customer.city,
      postalCode: customer.postalCode,
      contactPerson: customer.contactPerson,
      notes: customer.notes,
      status: customer.status
    });
    setShowForm(true);
  };

  const handleDelete = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return;

    // Show confirmation dialog
    if (!window.confirm(t('action.deleteConfirmMessage'))) {
      return;
    }

    // Store deleted customer for undo
    setDeletedCustomer(customer);
    setShowUndo(true);

    // Remove from customers
    setCustomers(prev => prev.filter(customer => customer.id !== customerId));
    
    toast({
      title: "Erfolg",
      description: t('action.deleteSuccess'),
    });

    // Auto-hide undo button after 5 seconds
    setTimeout(() => {
      setShowUndo(false);
      setDeletedCustomer(null);
    }, 5000);
  };

  const handleUndo = () => {
    if (deletedCustomer) {
      setCustomers(prev => [deletedCustomer, ...prev]);
      setShowUndo(false);
      setDeletedCustomer(null);
      
      toast({
        title: "Erfolg",
        description: t('action.undoSuccess'),
      });
    }
  };

  const handleSortColumn = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const getSortIcon = (column: string) => {
    if (sortBy !== column) {
      return <ArrowUpDown className="h-5 w-5 text-gray-400" />;
    }
    return sortOrder === 'asc' 
      ? <ArrowUp className="h-5 w-5 text-blue-600" />
      : <ArrowDown className="h-5 w-5 text-blue-600" />;
  };

  const getStatusBadge = (status: string) => {
    return (
      <Badge 
        variant={status === 'active' ? 'default' : 'secondary'}
        className={status === 'active' 
          ? 'bg-green-100 text-green-800 hover:bg-green-200' 
          : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
        }
      >
        {status === 'active' ? t('customer.statusActive') : t('customer.statusInactive')}
      </Badge>
    );
  };

  const filteredCustomers = customers.filter(customer =>
    (customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.contactPerson.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (statusFilter === 'all' || customer.status === statusFilter)
  );

  // Sort customers
  const sortedCustomers = [...filteredCustomers].sort((a, b) => {
    let aValue: any, bValue: any;
    
    switch (sortBy) {
      case 'name':
        aValue = a.name || '';
        bValue = b.name || '';
        break;
      case 'company':
        aValue = a.company || '';
        bValue = b.company || '';
        break;
      case 'email':
        aValue = a.email || '';
        bValue = b.email || '';
        break;
      case 'status':
        aValue = a.status || '';
        bValue = b.status || '';
        break;
      case 'city':
        aValue = a.city || '';
        bValue = b.city || '';
        break;
      case 'date':
      default:
        aValue = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        bValue = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        break;
    }

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortOrder === 'asc' 
        ? aValue.localeCompare(bValue, 'de-DE')
        : bValue.localeCompare(aValue, 'de-DE');
    } else {
      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    }
  });
  
  // Infinite scroll - initialized after sortedCustomers
  const hasMoreCustomers = displayedCustomersCount < sortedCustomers.length;
  const { isLoadingMore, sentinelRef } = useInfiniteScroll({
    hasMore: hasMoreCustomers,
    loading: false,
    onLoadMore: async () => {
      setDisplayedCustomersCount(prev => Math.min(prev + itemsPerPage, sortedCustomers.length));
    },
    enabled: isMobile || isTablet,
  });
  
  // Reset displayed count when filters change
  useEffect(() => {
    setDisplayedCustomersCount(itemsPerPage);
  }, [searchTerm, statusFilter, sortBy, sortOrder]);
  
  // Get displayed customers
  const displayedCustomers = sortedCustomers.slice(0, displayedCustomersCount);

  if (!canViewCustomers) {
    return (
      <div className="min-h-screen tradetrackr-gradient-blue">
        <AppHeader 
          title="Kundenverwaltung" 
          showBackButton={true} 
          onBack={onBack}
          onOpenMessaging={onOpenMessaging}
        />
        
        <div className="p-6">
          <div className="max-w-7xl mx-auto">
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <h2 className="text-xl font-semibold mb-4">{t('customer.accessDenied')}</h2>
              <p className="text-gray-600">{t('customer.noPermission')}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (showForm) {
    return (
      <div className="min-h-screen tradetrackr-gradient-blue">
        <AppHeader 
          title={editingCustomer ? "Kunde bearbeiten" : "Neuen Kunden hinzufügen"} 
          showBackButton={true} 
          onBack={() => setShowForm(false)}
          onOpenMessaging={onOpenMessaging}
        />
        
        {/* Show return to project form button if coming from there */}
        {localStorage.getItem('returnToProjectForm') === 'true' && (
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-blue-700">
                    Sie können nach dem Erstellen des Kunden zum Projektformular zurückkehren.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  if (onNavigate) {
                    onNavigate('new-project');
                  }
                  localStorage.removeItem('returnToProjectForm');
                  localStorage.removeItem('projectFormData');
                }}
                className="ml-4"
              >
                Zum Projektformular zurück
              </Button>
            </div>
          </div>
        )}
        
        <div className="p-6">
          <div className="max-w-4xl mx-auto">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">
                {editingCustomer ? "Kunde bearbeiten" : "Neuen Kunden hinzufügen"}
              </h1>
            </div>
            
            <Card className="border-2 border-blue-300 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">👤</span>
                  Kundendetails
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Error Summary */}
                  {formAllErrors.length > 0 && (
                    <FormErrorSummary
                      errors={formAllErrors}
                      title="Bitte korrigieren Sie die folgenden Fehler:"
                    />
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormInput
                      label={t('customer.customerName')}
                      tooltip="Geben Sie den Namen des Kunden ein. Der Name muss zwischen 2 und 100 Zeichen lang sein und ist erforderlich."
                      placeholder="Kundenname eingeben"
                      maxLength={100}
                      showCharCount={true}
                      value={formData.name}
                      onChange={(e) => {
                        const value = e.target.value;
                        setFormData(prev => ({ ...prev, name: value }));
                        getFieldProps('name').onChange(value);
                      }}
                      onBlur={getFieldProps('name').onBlur}
                      error={getFieldProps('name').error}
                      touched={getFieldProps('name').touched}
                      isValid={getFieldProps('name').isValid}
                      helperText="Name des Kunden (erforderlich)"
                    />
                    <FormInput
                      label={t('customer.company')}
                      tooltip="Geben Sie den Firmennamen ein (optional). Der Firmenname muss zwischen 2 und 100 Zeichen lang sein."
                      placeholder="Firmenname eingeben (optional)"
                      maxLength={100}
                      showCharCount={true}
                      value={formData.company}
                      onChange={(e) => {
                        const value = e.target.value;
                        setFormData(prev => ({ ...prev, company: value }));
                        getFieldProps('company').onChange(value);
                      }}
                      onBlur={getFieldProps('company').onBlur}
                      error={getFieldProps('company').error}
                      touched={getFieldProps('company').touched}
                      isValid={getFieldProps('company').isValid}
                      helperText="Firmenname (optional)"
                    />
                    <FormInput
                      label={t('customer.email')}
                      type="email"
                      tooltip="Geben Sie die E-Mail-Adresse des Kunden ein (optional). Beispiel: max.mustermann@example.com"
                      placeholder="E-Mail-Adresse eingeben (optional)"
                      value={formData.email}
                      onChange={(e) => {
                        const value = e.target.value;
                        setFormData(prev => ({ ...prev, email: value }));
                        getFieldProps('email').onChange(value);
                      }}
                      onBlur={getFieldProps('email').onBlur}
                      error={getFieldProps('email').error}
                      touched={getFieldProps('email').touched}
                      isValid={getFieldProps('email').isValid}
                      helperText="E-Mail-Adresse (optional)"
                    />
                    <FormInput
                      label={t('customer.phone')}
                      type="tel"
                      tooltip="Geben Sie die Telefonnummer des Kunden ein (optional). Format: +49 123 456789 oder 0123 456789"
                      placeholder="Telefonnummer eingeben (optional)"
                      value={formData.phone}
                      onChange={(e) => {
                        const value = e.target.value;
                        setFormData(prev => ({ ...prev, phone: value }));
                        getFieldProps('phone').onChange(value);
                      }}
                      onBlur={getFieldProps('phone').onBlur}
                      error={getFieldProps('phone').error}
                      touched={getFieldProps('phone').touched}
                      isValid={getFieldProps('phone').isValid}
                      helperText="Telefonnummer (optional)"
                    />
                    <FormInput
                      label={t('customer.contactPerson')}
                      tooltip="Geben Sie den Namen des Ansprechpartners ein (optional). Der Name darf maximal 100 Zeichen lang sein."
                      placeholder="Ansprechpartner eingeben (optional)"
                      maxLength={100}
                      showCharCount={true}
                      value={formData.contactPerson}
                      onChange={(e) => {
                        const value = e.target.value;
                        setFormData(prev => ({ ...prev, contactPerson: value }));
                        getFieldProps('contactPerson').onChange(value);
                      }}
                      onBlur={getFieldProps('contactPerson').onBlur}
                      error={getFieldProps('contactPerson').error}
                      touched={getFieldProps('contactPerson').touched}
                      isValid={getFieldProps('contactPerson').isValid}
                      helperText="Ansprechpartner (optional)"
                    />
                    <div>
                      <Label htmlFor="status" className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                        🎯 {t('customer.status')}
                      </Label>
                      <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value as 'active' | 'inactive' }))}>
                        <SelectTrigger className="border-2 border-gray-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">✅ {t('customer.statusActive')}</SelectItem>
                          <SelectItem value="inactive">❌ {t('customer.statusInactive')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  {/* Address Section */}
                  <div className="border-t-2 border-gray-200 pt-6 mt-6">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-800">
                      <MapPin className="h-5 w-5 text-[#058bc0]" />
                      📍 {t('customer.address')}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-2">
                        <Label htmlFor="address" className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                          🏠 {t('customer.address')}
                        </Label>
                        <Input
                          id="address"
                          value={formData.address}
                          onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                          className="border-2 border-gray-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/20"
                        />
                      </div>
                      <div>
                        <Label htmlFor="city" className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                          🏙️ {t('customer.city')}
                        </Label>
                        <Input
                          id="city"
                          value={formData.city}
                          onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                          className="border-2 border-gray-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/20"
                        />
                      </div>
                      <div>
                        <Label htmlFor="postalCode" className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                          📮 {t('customer.postalCode')}
                        </Label>
                        <Input
                          id="postalCode"
                          value={formData.postalCode}
                          onChange={(e) => setFormData(prev => ({ ...prev, postalCode: e.target.value }))}
                          className="border-2 border-gray-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/20"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="notes" className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                      📄 {t('customer.notes')}
                    </Label>
                    <textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-md focus:outline-none focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/20"
                      rows={3}
                    />
                  </div>
                  
                  <div className="flex gap-3 pt-6 border-t-2 border-gray-200">
                    <Button 
                      type="submit" 
                      disabled={!isFormValid}
                      className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold shadow-md hover:shadow-lg transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Save className="h-5 w-5" />
                      ✅ {editingCustomer ? t('action.update') : t('action.create')}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => {
                        setShowForm(false);
                        resetForm();
                        setEditingCustomer(null);
                        resetValidation();
                      }}
                      className="border-2 border-gray-300 hover:border-red-400 hover:bg-red-50 hover:text-red-700 transition-all"
                    >
                      {t('action.cancel')}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  const stats = {
    total: customers.length,
    active: customers.filter(c => c.status === 'active').length,
    inactive: customers.filter(c => c.status === 'inactive').length,
  };

  return (
    <div className="min-h-screen tradetrackr-gradient-blue">
      <AppHeader 
        title="👥 Kundenverwaltung" 
        showBackButton={true} 
        onBack={onBack}
        onOpenMessaging={onOpenMessaging}
      >
        {canManageCustomers && (
          <Button 
            onClick={() => setShowForm(true)}
            className="bg-gradient-to-r from-[#058bc0] to-[#0470a0] hover:from-[#0470a0] hover:to-[#035c80] text-white font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105"
          >
            <Plus className="h-5 w-5 mr-2" />
            ✨ Neuer Kunde
          </Button>
        )}
      </AppHeader>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Read-Only Notice */}
          {!canManageCustomers && (
            <Card className="border-2 border-blue-300 shadow-lg overflow-hidden">
              <CardContent className="bg-gradient-to-r from-blue-50 to-cyan-50 p-4">
                <div className="flex items-center gap-3">
                  <Eye className="h-6 w-6 text-blue-600" />
                  <p className="text-sm font-medium text-blue-800">
                    👁️ Sie haben nur Lesezugriff auf Kundendaten.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="tradetrackr-card bg-gradient-to-br from-[#058bc0] to-[#0470a0] text-white shadow-lg hover:shadow-2xl transition-all hover:scale-105">
              <CardHeader className="pb-1 pt-3">
                <CardTitle className="text-sm font-medium text-white/90 flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  Gesamt
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="text-2xl font-bold text-white">{stats.total}</div>
                <p className="text-xs text-white/80">Kunden</p>
              </CardContent>
            </Card>
            <Card className="tradetrackr-card bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg hover:shadow-2xl transition-all hover:scale-105">
              <CardHeader className="pb-1 pt-3">
                <CardTitle className="text-sm font-medium text-white/90 flex items-center gap-2">
                  <CheckSquare className="h-4 w-4" />
                  Aktiv
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="text-2xl font-bold text-white">{stats.active}</div>
                <p className="text-xs text-white/80">Aktive</p>
              </CardContent>
            </Card>
            <Card className="tradetrackr-card bg-gradient-to-br from-gray-500 to-gray-600 text-white shadow-lg hover:shadow-2xl transition-all hover:scale-105">
              <CardHeader className="pb-1 pt-3">
                <CardTitle className="text-sm font-medium text-white/90 flex items-center gap-2">
                  <Archive className="h-4 w-4" />
                  Inaktiv
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="text-2xl font-bold text-white">{stats.inactive}</div>
                <p className="text-xs text-white/80">Archiviert</p>
              </CardContent>
            </Card>
          </div>



          {/* Undo Button */}
          {showUndo && (
            <Card className="border-2 border-green-400 shadow-lg overflow-hidden">
              <CardContent className="bg-gradient-to-r from-green-50 to-emerald-50 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-green-800 flex items-center gap-2">
                    ✅ {t('action.deleteSuccess')}
                  </span>
                  <Button
                    onClick={handleUndo}
                    className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all"
                    size="sm"
                  >
                    ↶ {t('action.undo')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Controls Card */}
          <Card className="tradetrackr-card border-2 border-[#058bc0] shadow-xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-[#058bc0] to-[#0470a0] text-white px-6 pt-4 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <span className="text-2xl">🔍</span>
                  Filter & Suche
                  <Badge className="ml-3 bg-white/20 text-white font-semibold border-0">
                    {customers.length} Kunden
                  </Badge>
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={reloadCustomersFromFirestore}
                    className="h-8 px-3 border-white text-white hover:bg-white/20 transition-all"
                    title="Kunden aus Projekten neu laden"
                  >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    🔄 Neu laden
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">🔎</div>
                  <Input
                    placeholder="Nach Namen, Firma, E-Mail oder Kontaktperson suchen..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 border-2 border-gray-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/20 shadow-sm"
                  />
                </div>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg z-10 pointer-events-none">🏷️</div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="pl-10 border-2 border-gray-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/20 shadow-sm bg-white">
                      <SelectValue placeholder="Status auswählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">🎯 Alle Status</SelectItem>
                      <SelectItem value="active">✅ Aktiv</SelectItem>
                      <SelectItem value="inactive">📦 Inaktiv</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg z-10 pointer-events-none">🔢</div>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="pl-10 border-2 border-gray-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/20 shadow-sm bg-white">
                      <SelectValue placeholder="Sortieren nach" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date">📅 Datum</SelectItem>
                      <SelectItem value="name">👤 Kundenname</SelectItem>
                      <SelectItem value="company">🏢 Firma</SelectItem>
                      <SelectItem value="email">📧 E-Mail</SelectItem>
                      <SelectItem value="status">🏷️ Status</SelectItem>
                      <SelectItem value="city">🏙️ Stadt</SelectItem>
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
                    onClick={() => {
                      setSearchTerm('');
                      setStatusFilter('all');
                    }}
                    className="text-xs h-8 px-3 border-2 border-red-300 hover:border-red-500 hover:bg-red-50 transition-all"
                  >
                    <X className="h-3 w-3 mr-1" />
                    ❌ Alle Filter zurücksetzen
                  </Button>
                </div>
              )}

              {/* Customers List */}
              {sortedCustomers.length === 0 ? (
                <div className="text-center py-12">
                  <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <Search className="w-12 h-12 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Keine Kunden gefunden
                  </h3>
                  <p className="text-gray-500">
                    {searchTerm || statusFilter !== 'all' 
                      ? 'Versuchen Sie andere Suchbegriffe oder Filter.'
                      : 'Erstellen Sie Ihren ersten Kunden, um zu beginnen.'
                    }
                  </p>
                </div>
              ) : (
                <>


                  {/* Table View */}
                  {viewMode === 'table' && (
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-50">
                            <TableHead 
                              className="cursor-pointer hover:bg-gray-100"
                              onClick={() => handleSortColumn('name')}
                            >
                              <div className="flex items-center gap-2">
                                Kundenname
                                {getSortIcon('name')}
                              </div>
                            </TableHead>
                            <TableHead 
                              className="cursor-pointer hover:bg-gray-100"
                              onClick={() => handleSortColumn('company')}
                            >
                              <div className="flex items-center gap-2">
                                Firma
                                {getSortIcon('company')}
                              </div>
                            </TableHead>
                            <TableHead 
                              className="cursor-pointer hover:bg-gray-100"
                              onClick={() => handleSortColumn('contactPerson')}
                            >
                              <div className="flex items-center gap-2">
                                Kontaktperson
                                {getSortIcon('contactPerson')}
                              </div>
                            </TableHead>
                            <TableHead 
                              className="cursor-pointer hover:bg-gray-100"
                              onClick={() => handleSortColumn('email')}
                            >
                              <div className="flex items-center gap-2">
                                E-Mail
                                {getSortIcon('email')}
                              </div>
                            </TableHead>
                            <TableHead 
                              className="cursor-pointer hover:bg-gray-100"
                              onClick={() => handleSortColumn('phone')}
                            >
                              <div className="flex items-center gap-2">
                                Telefon
                                {getSortIcon('phone')}
                              </div>
                            </TableHead>
                            <TableHead 
                              className="cursor-pointer hover:bg-gray-100"
                              onClick={() => handleSortColumn('status')}
                            >
                              <div className="flex items-center gap-2">
                                Status
                                {getSortIcon('status')}
                              </div>
                            </TableHead>
                            <TableHead 
                              className="cursor-pointer hover:bg-gray-100"
                              onClick={() => handleSortColumn('city')}
                            >
                              <div className="flex items-center gap-2">
                                Stadt
                                {getSortIcon('city')}
                              </div>
                            </TableHead>
                            {canManageCustomers && <TableHead className="w-[100px]">Aktionen</TableHead>}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {displayedCustomers.map((customer) => (
                            <TableRow key={customer.id} className="hover:bg-gray-50">
                              <TableCell className="font-medium">{customer.name}</TableCell>
                              <TableCell>{customer.company || '-'}</TableCell>
                              <TableCell>{customer.contactPerson || '-'}</TableCell>
                              <TableCell>{customer.email || '-'}</TableCell>
                              <TableCell>{customer.phone || '-'}</TableCell>
                              <TableCell>
                                {getStatusBadge(customer.status)}
                              </TableCell>
                              <TableCell>{customer.city || '-'}</TableCell>
                              {canManageCustomers && (
                                <TableCell>
                                  <div className="flex gap-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleEdit(customer)}
                                      className="h-8 w-8 p-0"
                                    >
                                      <Edit className="h-5 w-5" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDelete(customer.id)}
                                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                                    >
                                      <Trash2 className="h-5 w-5" />
                                    </Button>
                                  </div>
                                </TableCell>
                              )}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  {/* Cards View */}
                  {viewMode === 'cards' && (
                    <div 
                      {...(isMobile ? containerProps : {})}
                      className={cn(
                        "grid gap-6",
                        isTwoColumn ? "grid-cols-2" : isTablet ? "grid-cols-2" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                      )}
                    >
                      {isMobile && (
                        <PullToRefreshIndicator
                          pullDistance={pullDistance}
                          threshold={80}
                          isRefreshing={isRefreshing}
                          canRefresh={canRefresh}
                        />
                      )}
                      {displayedCustomers.map((customer) => (
                        <Card key={customer.id} className="hover:shadow-lg transition-shadow">
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <div className="space-y-1">
                                <CardTitle className="text-lg font-semibold text-gray-900">
                                  {customer.name}
                                </CardTitle>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <Building className="h-5 w-5" />
                                  <span>{customer.company || 'Keine Firma'}</span>
                                </div>
                              </div>
                              {getStatusBadge(customer.status)}
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="space-y-2">
                              {customer.contactPerson && (
                                <div className="flex items-center gap-2 text-sm">
                                  <User className="h-5 w-5 text-gray-400" />
                                  <span className="font-medium">{customer.contactPerson}</span>
                                </div>
                              )}
                              {customer.email && (
                                <div className="flex items-center gap-2 text-sm">
                                  <Mail className="h-5 w-5 text-gray-400" />
                                  <span>{customer.email}</span>
                                </div>
                              )}
                              {customer.phone && (
                                <div className="flex items-center gap-2 text-sm">
                                  <Phone className="h-5 w-5 text-gray-400" />
                                  <span>{customer.phone}</span>
                                </div>
                              )}
                              {customer.city && (
                                <div className="flex items-center gap-2 text-sm">
                                  <MapPin className="h-5 w-5 text-gray-400" />
                                  <span>{customer.city}</span>
                                </div>
                              )}
                            </div>
                            {canManageCustomers && (
                              <div className="flex gap-2 pt-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEdit(customer)}
                                  className="flex-1"
                                >
                                  <Edit className="h-3 w-3 mr-1" />
                                  Bearbeiten
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDelete(customer.id)}
                                  className="text-red-600 hover:text-red-700"
                                  aria-label={`Kunde "${customer.name || customer.companyName || customer.id}" löschen`}
                                  title="Löschen"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                      {/* Infinite Scroll Sentinel */}
                      {(isMobile || isTablet) && (
                        <div ref={sentinelRef} className="h-10 flex items-center justify-center">
                          {isLoadingMore && (
                            <div className="flex items-center gap-2 text-gray-500">
                              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                              <span className="text-sm">Lade weitere Kunden...</span>
                            </div>
                          )}
                          {!hasMoreCustomers && displayedCustomers.length > 0 && (
                            <p className="text-sm text-gray-500 text-center py-4">
                              Alle Kunden geladen ({displayedCustomers.length} von {sortedCustomers.length})
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Action Sidebar */}
    </div>
  );
};

export default CustomerManagement; 
