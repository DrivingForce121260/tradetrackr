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
import QuickActionButtons from './QuickActionButtons';

const CustomerManagement: React.FC<CustomerManagementProps> = ({ onBack, onNavigate, onOpenMessaging }) => {
  const { user, hasPermission } = useAuth();
  const { t } = useLanguage();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [sortBy, setSortBy] = useState<string>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Undo functionality
  const [deletedCustomer, setDeletedCustomer] = useState<Customer | null>(null);
  const [showUndo, setShowUndo] = useState(false);
  
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
        description: "Sie kö¶nnen jetzt zum Projektformular zurückkehren.",
      });
    }
  }, []);

  // Load customers from projects in localStorage
  useEffect(() => {
    const loadCustomersFromProjects = () => {
      try {
        // Lade Projekte aus localStorage
        const savedProjects = localStorage.getItem('projects');
        if (savedProjects) {
          const projects = JSON.parse(savedProjects);
          
          // Extrahiere eindeutige Kunden aus den Projekten
          const uniqueCustomers = new Map<string, Customer>();
          
          projects.forEach((project: any) => {
            if (project.customerName && project.customerName.trim()) {
              const customerKey = project.customerName.toLowerCase().trim();
              
              if (!uniqueCustomers.has(customerKey)) {
                uniqueCustomers.set(customerKey, {
                  id: `customer_${Date.now()}_${Math.random()}`, // Generiere eindeutige ID
                  name: project.customerName.trim(),
                  company: project.customerName.trim(),
                  email: '', // Nicht in Projekten verfügbar
                  phone: '', // Nicht in Projekten verfügbar
                  address: '', // Nicht in Projekten verfügbar
                  city: '', // Nicht in Projekten verfügbar
                  postalCode: '', // Nicht in Projekten verfügbar
                  contactPerson: '', // Nicht in Projekten verfügbar
                  notes: `Automatisch aus Projekt ${project.projectNumber || project.id} extrahiert`,
                  status: 'active' as const,
                  createdAt: new Date(),
                  updatedAt: new Date()
                });
              }
            }
          });
          
          const customersArray = Array.from(uniqueCustomers.values());
          setCustomers(customersArray);
          

        } else {

          setCustomers([]);
        }
      } catch (error) {

        setCustomers([]);
      }
    };

    loadCustomersFromProjects();

    // Listen for storage changes (wenn Projekte aktualisiert werden)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'projects') {

        loadCustomersFromProjects();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Auto-open create form for quick actions using QuickAction context
  useEffect(() => {
    if (isQuickAction && quickActionType === 'customer') {
      setShowForm(true);
    }
  }, [isQuickAction, quickActionType]);

  // Kunden werden jetzt automatisch aus Projekten extrahiert, nicht mehr manuell gespeichert

  // Funktion zum manuellen Neuladen der Kunden aus Projekten
  const reloadCustomersFromProjects = () => {
    try {
      const savedProjects = localStorage.getItem('projects');
      if (savedProjects) {
        const projects = JSON.parse(savedProjects);
        
        // Extrahiere eindeutige Kunden aus den Projekten
        const uniqueCustomers = new Map<string, Customer>();
        
        projects.forEach((project: any) => {
          if (project.customerName && project.customerName.trim()) {
            const customerKey = project.customerName.toLowerCase().trim();
            
            if (!uniqueCustomers.has(customerKey)) {
              uniqueCustomers.set(customerKey, {
                id: `customer_${Date.now()}_${Math.random()}`,
                name: project.customerName.trim(),
                company: project.customerName.trim(),
                email: '',
                phone: '',
                address: '',
                city: '',
                postalCode: '',
                contactPerson: '',
                notes: `Automatisch aus Projekt ${project.projectNumber || project.id} extrahiert`,
                status: 'active' as const,
                createdAt: new Date(),
                updatedAt: new Date()
              });
            }
          }
        });
        
        const customersArray = Array.from(uniqueCustomers.values());
        setCustomers(customersArray);
        
        toast({
          title: "Kunden aktualisiert",
          description: `${customersArray.length} Kunden aus Projekten geladen`,
        });
        

      } else {
        toast({
          title: "Keine Projekte gefunden",
          description: "Keine Projekte im localStorage verfügbar",
          variant: "destructive",
        });
      }
    } catch (error) {

      toast({
        title: "Fehler",
        description: "Fehler beim Neuladen der Kunden",
        variant: "destructive",
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
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
      
      setCustomers(prev => prev.map(customer => 
        customer.id === editingCustomer.id ? updatedCustomer : customer
      ));
      
      toast({
        title: "Erfolg",
        description: t('customer.customerUpdated'),
      });
    } else {
      // Create new customer
      const newCustomer: Customer = {
        ...formData,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      setCustomers(prev => [newCustomer, ...prev]);
      
      toast({
        title: "Erfolg",
        description: t('customer.customerCreated'),
      });

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
                    Sie kö¶nnen nach dem Erstellen des Kunden zum Projektformular zurückkehren.
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
            
            <Card>
              <CardHeader>
                <CardTitle>Kundendetails</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">{t('customer.customerName')} *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="company">{t('customer.company')}</Label>
                      <Input
                        id="company"
                        value={formData.company}
                        onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">{t('customer.email')}</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">{t('customer.phone')}</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="contactPerson">{t('customer.contactPerson')}</Label>
                      <Input
                        id="contactPerson"
                        value={formData.contactPerson}
                        onChange={(e) => setFormData(prev => ({ ...prev, contactPerson: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="status">{t('customer.status')}</Label>
                      <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value as 'active' | 'inactive' }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">{t('customer.statusActive')}</SelectItem>
                          <SelectItem value="inactive">{t('customer.statusInactive')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  {/* Address Section */}
                  <div className="border-t pt-4">
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                      <MapPin className="h-5 w-5 mr-2" />
                      {t('customer.address')}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-2">
                        <Label htmlFor="address">{t('customer.address')}</Label>
                        <Input
                          id="address"
                          value={formData.address}
                          onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="city">{t('customer.city')}</Label>
                        <Input
                          id="city"
                          value={formData.city}
                          onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="postalCode">{t('customer.postalCode')}</Label>
                        <Input
                          id="postalCode"
                          value={formData.postalCode}
                          onChange={(e) => setFormData(prev => ({ ...prev, postalCode: e.target.value }))}
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="notes">{t('customer.notes')}</Label>
                    <textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={3}
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <Button type="submit" className="flex items-center gap-2">
                      <Save className="h-5 w-5" />
                      {editingCustomer ? t('action.update') : t('action.create')}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => {
                        setShowForm(false);
                        resetForm();
                      }}
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

  return (
    <div className="min-h-screen tradetrackr-gradient-blue">
      <AppHeader 
        title="Kundenverwaltung" 
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
                  Kundenverwaltung
                </h1>
                <p className="text-gray-600">
                  Verwalten Sie Kunden, Kontaktdaten und Projekte
                </p>
                {!canManageCustomers && (
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-sm text-blue-700">
                      <Eye className="h-5 w-5 inline mr-1" />
                      Sie haben nur Lesezugriff auf Kundendaten.
                    </p>
                  </div>
                )}
              </div>
              {canManageCustomers && (
                <Button 
                  onClick={() => setShowForm(true)}
                  className="bg-[#058bc0] hover:bg-[#047aa0] text-white"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Neuer Kunde
                </Button>
              )}
            </div>
          </div>



          {/* Controls Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  {t('customer.title')} ({customers.length})
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={reloadCustomersFromProjects}
                    className="h-8 px-3 border-blue-500 text-blue-600 hover:bg-blue-50"
                    title="Kunden aus Projekten neu laden"
                  >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Neu laden
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

              {/* Undo Button */}
              {showUndo && (
                <Card className="mb-4 border-green-200 bg-green-50">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-green-800">
                        {t('action.deleteSuccess')}
                      </span>
                      <Button
                        onClick={handleUndo}
                        variant="outline"
                        size="sm"
                        className="border-green-300 text-green-700 hover:bg-green-100"
                      >
                        {t('action.undo')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Search and Filters */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    placeholder="Nach Namen, Firma, E-Mail oder Kontaktperson suchen..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status auswö¤hlen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Status</SelectItem>
                    <SelectItem value="active">Aktiv</SelectItem>
                    <SelectItem value="inactive">Inaktiv</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sortieren nach" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">Datum</SelectItem>
                    <SelectItem value="name">Kundenname</SelectItem>
                    <SelectItem value="company">Firma</SelectItem>
                    <SelectItem value="email">E-Mail</SelectItem>
                    <SelectItem value="status">Status</SelectItem>
                    <SelectItem value="city">Stadt</SelectItem>
                  </SelectContent>
                </Select>
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
                    className="text-xs h-8 px-3"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Alle Filter zurücksetzen
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
                          {sortedCustomers.map((customer) => (
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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {sortedCustomers.map((customer) => (
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
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Action Buttons */}
      <QuickActionButtons onNavigate={onNavigate} hasPermission={hasPermission} currentPage="customers" />
    </div>
  );
};

export default CustomerManagement; 
