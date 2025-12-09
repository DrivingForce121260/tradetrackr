import React, { useEffect } from 'react';
import MultiStepForm, { FormStep } from './MultiStepForm';
import { Card, CardContent } from '@/components/ui/card';
import { FormInput, FormTextarea, FormSelect } from '@/components/ui/form-input';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ExtendedProject } from '@/types/project';
import { useFormValidation, validationRules } from '@/hooks/use-form-validation';
import AutoCompleteInput from './AutoCompleteInput';
import { useAutocomplete } from '@/hooks/useAutocomplete';
import { Building2, User, FolderOpen, Plus, X } from 'lucide-react';
import { customerService } from '@/services/firestoreService';
import { useAuth } from '@/contexts/AuthContext';
import { Customer } from '@/types';
import { Button } from '@/components/ui/button';
import { CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { generateInternalProjectNumber, generateExternalProjectNumber } from '@/utils/projectNumberGenerator';

interface ProjectMultiStepFormProps {
  onSubmit: (data: ExtendedProject) => Promise<void>;
  onCancel: () => void;
  initialData?: Partial<ExtendedProject>;
  editingProject?: ExtendedProject | null;
}

const ProjectMultiStepForm: React.FC<ProjectMultiStepFormProps> = ({
  onSubmit,
  onCancel,
  initialData = {},
  editingProject,
}) => {
  const { user } = useAuth();
  const [customers, setCustomers] = React.useState<Customer[]>([]);
  const [customersLoaded, setCustomersLoaded] = React.useState(false);
  
  // Customer creation modal state (for inline customer creation)
  const [showCustomerModal, setShowCustomerModal] = React.useState(false);
  const [newCustomerData, setNewCustomerData] = React.useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postalCode: '',
    contactPerson: '',
    notes: '',
    status: 'active' as 'active' | 'inactive'
  });
  
  // Use refs to preserve closures when component is cloned
  const setNewCustomerDataRef = React.useRef(setNewCustomerData);
  const newCustomerDataRef = React.useRef(newCustomerData);
  
  // Update refs when state changes
  React.useEffect(() => {
    setNewCustomerDataRef.current = setNewCustomerData;
    newCustomerDataRef.current = newCustomerData;
  }, [setNewCustomerData, newCustomerData]);

  // Load customers from Firestore - always fetch fresh data when component mounts
  React.useEffect(() => {
    const loadCustomers = async () => {
      if (!user?.concernID) return;
      
      try {
        // Always invalidate cache and fetch fresh data from Firestore
        console.log('🔄 [ProjectMultiStepForm] Invalidating cache and fetching fresh customers...');
        const { cacheService } = await import('@/services/cacheService');
        await cacheService.invalidate('customers', user.concernID);
        
        // Load fresh data from Firestore (skip cache)
        const customersData = await customerService.getAll(user.concernID, true);
        console.log('📋 [ProjectMultiStepForm] Loaded customers:', customersData?.length || 0, customersData);
        
        if (customersData && Array.isArray(customersData)) {
          // Filter out any invalid customers and ensure they have concernID
          const validCustomers = customersData.filter(c => {
            const hasConcernID = c.concernID === user.concernID;
            const hasName = c.name && c.name.trim().length > 0;
            const hasCompany = c.company && c.company.trim().length > 0;
            return hasConcernID && (hasName || hasCompany);
          });
          
          console.log('📋 [ProjectMultiStepForm] Valid customers after filtering:', validCustomers.length);
          setCustomers(validCustomers);
          
          // Update localStorage with fresh data
          localStorage.setItem('customers', JSON.stringify(validCustomers));
          console.log('✅ [ProjectMultiStepForm] Customers saved to localStorage');
          
          // Debug: Log customer details
          validCustomers.forEach((c, idx) => {
            console.log(`📋 [ProjectMultiStepForm] Customer ${idx}:`, {
              id: c.id,
              concernID: c.concernID,
              name: c.name,
              company: c.company,
              hasName: !!c.name,
              hasCompany: !!c.company
            });
          });
        } else {
          console.warn('⚠️ [ProjectMultiStepForm] Invalid customers data format:', customersData);
          setCustomers([]);
        }
        
        setCustomersLoaded(true);
      } catch (error) {
        console.error('❌ [ProjectMultiStepForm] Error loading customers:', error);
        // Fallback to localStorage
        const savedCustomers = localStorage.getItem('customers');
        if (savedCustomers) {
          try {
            const parsed = JSON.parse(savedCustomers);
            // Filter by concernID even from localStorage
            const filtered = parsed.filter((c: Customer) => c.concernID === user.concernID);
            setCustomers(filtered);
            setCustomersLoaded(true);
          } catch (parseError) {
            console.error('Error parsing saved customers:', parseError);
            setCustomers([]);
            setCustomersLoaded(true);
          }
        } else {
          setCustomers([]);
          setCustomersLoaded(true);
        }
      }
    };

    loadCustomers();
  }, [user?.concernID]);

  // Form validation hook - sync with formData from MultiStepForm
  const {
    getFieldProps,
    isValid: isFormValid,
    setValues: setValidationValues,
  } = useFormValidation({
    initialValues: {
      name: editingProject?.name || initialData.name || '',
      projectNumber: editingProject?.projectNumber || initialData.projectNumber || '',
      customerName: editingProject?.customerName || initialData.customerName || '',
      customerEmail: editingProject?.customerEmail || initialData.customerEmail || '',
    },
    validationRules: {
      name: [
        validationRules.required('Der Projektname ist erforderlich'),
        validationRules.minLength(3, 'Der Projektname muss mindestens 3 Zeichen lang sein'),
        validationRules.maxLength(100, 'Der Projektname darf maximal 100 Zeichen lang sein'),
      ],
      projectNumber: [
        validationRules.required('Die Projektnummer ist erforderlich'),
        validationRules.minLength(2, 'Die Projektnummer muss mindestens 2 Zeichen lang sein'),
        validationRules.maxLength(50, 'Die Projektnummer darf maximal 50 Zeichen lang sein'),
      ],
      customerName: [
        validationRules.required('Der Kundenname ist erforderlich'),
        validationRules.minLength(2, 'Der Kundenname muss mindestens 2 Zeichen lang sein'),
      ],
      customerEmail: [
        validationRules.email('Bitte geben Sie eine gültige E-Mail-Adresse ein'),
      ],
    },
    onSubmit: async () => {},
    validateOnBlur: true,
    validateOnChange: false,
  });


  // Step 1: Basic Information
  const Step1BasicInfo: React.FC<{
    formData: Record<string, any>;
    updateFormData: (data: Record<string, any>) => void;
  }> = ({ formData, updateFormData }) => {
    const isInternalProject = formData.isInternal === true;
    const isProjectNumberReadOnly = isInternalProject && !editingProject;
    
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormInput
            label="Projektname *"
            tooltip="Geben Sie einen aussagekräftigen Namen für das Projekt ein."
            placeholder="Projektname eingeben"
            maxLength={100}
            showCharCount={true}
            value={formData.name || ''}
            onChange={(e) => {
              const value = e.target.value;
              updateFormData({ name: value });
            }}
            onBlur={() => {
              const value = formData.name || '';
              setValidationValues((prev: any) => ({ ...prev, name: value }));
            }}
            error={getFieldProps('name').error}
            touched={getFieldProps('name').touched}
            isValid={getFieldProps('name').isValid}
            helperText="Ein aussagekräftiger Name hilft bei der Identifikation"
          />
          <div>
            <FormInput
              label="Projektnummer *"
              tooltip={
                isInternalProject 
                  ? "Für interne Projekte wird die Projektnummer automatisch generiert (ConcernID + Abkürzung)."
                  : "Die Projektnummer wird automatisch generiert, kann aber angepasst werden."
              }
              placeholder="Projektnummer eingeben"
              maxLength={50}
              showCharCount={true}
            value={formData.projectNumber || ''}
            onChange={(e) => {
              if (!isProjectNumberReadOnly) {
                const value = e.target.value;
                updateFormData({ projectNumber: value });
              }
            }}
              onBlur={() => {
                const value = formData.projectNumber || '';
                setValidationValues((prev: any) => ({ ...prev, projectNumber: value }));
              }}
              error={getFieldProps('projectNumber').error}
              touched={getFieldProps('projectNumber').touched}
              isValid={getFieldProps('projectNumber').isValid}
              helperText={
                isInternalProject 
                  ? "Automatisch generiert für interne Projekte"
                  : "Automatisch generiert, kann aber angepasst werden"
              }
              readOnly={isProjectNumberReadOnly}
              className={isProjectNumberReadOnly ? "bg-gray-100 cursor-not-allowed" : ""}
            />
            {isInternalProject && (
              <p className="text-xs text-blue-600 mt-1">
                ℹ️ Die Projektnummer wird automatisch aus der ConcernID und einer Abkürzung des Projektnamens generiert.
              </p>
            )}
          </div>
        </div>
        <div>
          <Label htmlFor="description">Beschreibung *</Label>
          <Textarea
            id="description"
            name="description"
            value={formData.description || ''}
            onChange={(e) => {
              const value = e.target.value;
              updateFormData({ description: value });
            }}
            rows={4}
            placeholder="Beschreiben Sie das Projekt..."
            required
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="status">Status *</Label>
            <Select
              value={formData.status || 'planned'}
              onValueChange={(value) => updateFormData({ status: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="planned">Geplant</SelectItem>
                <SelectItem value="active">Aktiv</SelectItem>
                <SelectItem value="completed">Abgeschlossen</SelectItem>
                <SelectItem value="archived">Archiviert</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="category">Kategorie</Label>
            <Select
              value={formData.category || undefined}
              onValueChange={(value) => updateFormData({ category: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Kategorie auswählen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Wartung">Wartung</SelectItem>
                <SelectItem value="Reparatur">Reparatur</SelectItem>
                <SelectItem value="Installation">Installation</SelectItem>
                <SelectItem value="Reklamation">Reklamation</SelectItem>
                <SelectItem value="Notdienst">Notdienst</SelectItem>
                <SelectItem value="Sonstiges">Sonstiges</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* Internal Project Toggle */}
        <div className="pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1">
              <Label htmlFor="isInternal" className="text-base font-semibold flex items-center gap-2">
                <Building2 className="h-5 w-5 text-gray-600" />
                Internes Projekt
              </Label>
              <p className="text-sm text-gray-600 mt-1">
                Aktivieren Sie diese Option, wenn es sich um ein internes Organisationsprojekt handelt (z.B. Personal, Finanzen, IT).
              </p>
            </div>
            <Switch
              id="isInternal"
              checked={formData.isInternal || false}
              onCheckedChange={(checked) => {
                updateFormData({ 
                  isInternal: checked,
                  internalCategory: checked ? formData.internalCategory : undefined // Clear category if unchecked
                });
              }}
            />
          </div>
          
          {/* Internal Category Select - Only show if internal is checked */}
          {formData.isInternal && (
            <div className="mt-4">
              <Label htmlFor="internalCategory">Interne Kategorie *</Label>
              <Select 
                value={formData.internalCategory || undefined}
                onValueChange={(value) => {
                  updateFormData({ 
                    internalCategory: value as 'personnel' | 'finance' | 'training' | 'admin' | 'compliance' | 'it'
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Interne Kategorie auswählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="personnel">Personal</SelectItem>
                  <SelectItem value="finance">Finanzen</SelectItem>
                  <SelectItem value="training">Schulung</SelectItem>
                  <SelectItem value="admin">Administration</SelectItem>
                  <SelectItem value="compliance">Compliance</SelectItem>
                  <SelectItem value="it">IT</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                Wählen Sie die Kategorie für das interne Projekt aus.
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Step 2: Customer Information
  const Step2CustomerInfo: React.FC<{
    formData: Record<string, any>;
    updateFormData: (data: Record<string, any>) => void;
    customers?: Customer[];
    customersLoaded?: boolean;
    showCustomerModal?: boolean;
    setShowCustomerModal?: (show: boolean) => void;
    newCustomerData?: any;
    setNewCustomerData?: (data: any) => void;
    setCustomers?: (customers: Customer[]) => void;
    setValidationValues?: (values: any) => void;
  }> = ({ 
    formData, 
    updateFormData, 
    customers: propCustomers, 
    customersLoaded: propCustomersLoaded,
    showCustomerModal: propShowCustomerModal,
    setShowCustomerModal: propSetShowCustomerModal,
    newCustomerData: propNewCustomerData,
    setNewCustomerData: propSetNewCustomerData,
    setCustomers: propSetCustomers,
    setValidationValues: propSetValidationValues
  }) => {
    // Use props if provided, otherwise use state from parent scope
    const customersList = propCustomers !== undefined ? propCustomers : customers;
    const isCustomersLoaded = propCustomersLoaded !== undefined ? propCustomersLoaded : customersLoaded;
    const showCustomerModalValue = propShowCustomerModal !== undefined ? propShowCustomerModal : showCustomerModal;
    const setShowCustomerModalValue = propSetShowCustomerModal || setShowCustomerModal;
    // CRITICAL: Use refs to preserve closures when component is cloned via React.cloneElement
    // Refs always point to the latest state setter, even when component is cloned
    const setNewCustomerDataToUse = React.useCallback((updater: any) => {
      if (typeof updater === 'function') {
        setNewCustomerDataRef.current(updater);
      } else {
        setNewCustomerDataRef.current(updater);
      }
    }, []);
    // Use prop version if provided, otherwise use current state (not ref, as ref is not reactive)
    const newCustomerDataToUse = propNewCustomerData !== undefined ? propNewCustomerData : newCustomerData;
    const setCustomersValue = propSetCustomers || setCustomers;
    const setValidationValuesValue = propSetValidationValues || setValidationValues;
    return (
      <div className="space-y-4">
        {/* Inline Customer Creation Form - shown when "+ Neue Kunde" is clicked */}
        {showCustomerModalValue && (
          <Card className="border-2 border-blue-400 bg-blue-50 mb-4">
            <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-bold text-white">Neuen Kunden erstellen</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCustomerModalValue(false)}
                  className="text-white hover:bg-white/20 h-6 w-6 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                if (!newCustomerDataToUse.name.trim()) {
                  toast({
                    title: "Fehler",
                    description: "Der Kundenname ist erforderlich.",
                    variant: "destructive"
                  });
                  return;
                }
                
                try {
                  const customerData = {
                    ...newCustomerDataToUse,
                    concernID: user?.concernID || '',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                  };
                  
                  const firestoreId = await customerService.create(customerData);
                  
                  // Reload customers list
                  const { cacheService } = await import('@/services/cacheService');
                  await cacheService.invalidate('customers', user?.concernID || '');
                  const updatedCustomers = await customerService.getAll(user?.concernID || '', true);
                  const formattedCustomers = updatedCustomers.map((c: any) => ({
                    id: c.id || c.uid || '',
                    name: c.name || '',
                    company: c.company || '',
                    email: c.email || '',
                    phone: c.phone || '',
                    address: c.address || '',
                    city: c.city || '',
                    postalCode: c.postalCode || '',
                    hasName: !!c.name,
                    hasCompany: !!c.company
                  }));
                  setCustomersValue(formattedCustomers);
                  
                  // Update localStorage
                  localStorage.setItem('customers', JSON.stringify(updatedCustomers));
                  
                  // Select the newly created customer in the form
                  const newCustomer = updatedCustomers.find((c: any) => (c.id || c.uid) === firestoreId);
                  if (newCustomer) {
                    const customerDisplayName = (newCustomer.name || newCustomer.company || '').trim();
                    updateFormData({
                      customerName: customerDisplayName,
                      customerEmail: newCustomer.email || formData.customerEmail || '',
                      customerPhone: newCustomer.phone || formData.customerPhone || '',
                      customerAddress: newCustomer.address || formData.customerAddress || '',
                      city: newCustomer.city || formData.city || '',
                      postalCode: newCustomer.postalCode || formData.postalCode || ''
                    });
                    setValidationValuesValue((prev: any) => ({ ...prev, customerName: customerDisplayName }));
                    if (newCustomer.email) {
                      setValidationValuesValue((prev: any) => ({ ...prev, customerEmail: newCustomer.email }));
                    }
                  }
                  
                  toast({
                    title: "Erfolg",
                    description: "Kunde wurde erfolgreich erstellt und im Projektformular ausgewählt."
                  });
                  
                  // Reset form and close inline form
                  setNewCustomerDataToUse({
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
                  setShowCustomerModalValue(false);
                } catch (error) {
                  console.error('Error creating customer:', error);
                  toast({
                    title: "Fehler",
                    description: "Kunde konnte nicht erstellt werden.",
                    variant: "destructive"
                  });
                }
              }} className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="inline-customer-name" className="text-sm font-semibold">Name *</Label>
                    <Input
                      id="inline-customer-name"
                      value={newCustomerDataToUse.name}
                      onChange={(e) => setNewCustomerDataToUse(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Kundenname"
                      required
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="inline-customer-company" className="text-sm font-semibold">Firma</Label>
                    <Input
                      id="inline-customer-company"
                      value={newCustomerDataToUse.company}
                      onChange={(e) => setNewCustomerDataToUse(prev => ({ ...prev, company: e.target.value }))}
                      placeholder="Firmenname"
                      className="mt-1"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="inline-customer-email" className="text-sm font-semibold">E-Mail</Label>
                    <Input
                      id="inline-customer-email"
                      type="email"
                      value={newCustomerDataToUse.email}
                      onChange={(e) => setNewCustomerDataToUse(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="email@beispiel.de"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="inline-customer-phone" className="text-sm font-semibold">Telefon</Label>
                    <Input
                      id="inline-customer-phone"
                      value={newCustomerDataToUse.phone}
                      onChange={(e) => setNewCustomerDataToUse(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="+49 123 456789"
                      className="mt-1"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setNewCustomerDataToUse({
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
                      setShowCustomerModalValue(false);
                    }}
                  >
                    Abbrechen
                  </Button>
                  <Button 
                    type="submit" 
                    size="sm"
                    className="bg-gradient-to-r from-[#058bc0] to-[#0470a0] text-white"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Kunde erstellen
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Customer Name with Select Dropdown */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="customerName" className="block">
                Kundenname *
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  // Toggle inline customer form - don't close project form
                  setShowCustomerModalValue(!showCustomerModalValue);
                }}
                className="flex items-center gap-1 text-xs h-7 px-2"
              >
                <Plus className="h-3 w-3" />
                {showCustomerModalValue ? 'Abbrechen' : 'Neuer Kunde'}
              </Button>
            </div>
            <Select
              value={(formData.customerName?.trim() || '') || undefined}
              onValueChange={(value) => {
                // Find selected customer and auto-fill data
                const selectedCustomer = customersList.find(
                  c => {
                    const customerName = (c.name || c.company || '').trim();
                    return customerName === value.trim();
                  }
                );
                
                if (selectedCustomer) {
                  const customerDisplayName = (selectedCustomer.name || selectedCustomer.company || '').trim() || value;
                  updateFormData({
                    customerName: customerDisplayName,
                    customerEmail: selectedCustomer.email || formData.customerEmail || '',
                    customerPhone: selectedCustomer.phone || formData.customerPhone || '',
                    customerAddress: selectedCustomer.address || formData.customerAddress || '',
                    city: selectedCustomer.city || formData.city || '',
                    postalCode: selectedCustomer.postalCode || formData.postalCode || '',
                  });
                  setValidationValues((prev: any) => ({ ...prev, customerName: customerDisplayName }));
                  if (selectedCustomer.email) {
                    setValidationValues((prev: any) => ({ ...prev, customerEmail: selectedCustomer.email }));
                  }
                } else {
                  updateFormData({ customerName: value });
                  setValidationValues((prev: any) => ({ ...prev, customerName: value }));
                }
              }}
            >
              <SelectTrigger id="customerName" className={getFieldProps('customerName').error ? 'border-red-500' : ''}>
                <SelectValue placeholder="Kunde auswählen..." />
              </SelectTrigger>
              <SelectContent className="max-h-[300px] overflow-y-auto">
                {(() => {
                  console.log('📋 [Step2CustomerInfo] Rendering dropdown:', {
                    isCustomersLoaded,
                    customersListLength: customersList.length,
                    customersList
                  });
                  
                  if (!isCustomersLoaded) {
                    return (
                      <SelectItem value="loading" disabled>
                        Lade Kunden...
                      </SelectItem>
                    );
                  }
                  
                  // Filter and prepare customers
                  const validCustomers = [...customersList]
                    .filter(c => {
                      const hasName = c.name && c.name.trim() !== '';
                      const hasCompany = c.company && c.company.trim() !== '';
                      return hasName || hasCompany;
                    })
                    .sort((a, b) => {
                      const nameA = (a.name || a.company || '').toLowerCase().trim();
                      const nameB = (b.name || b.company || '').toLowerCase().trim();
                      return nameA.localeCompare(nameB, 'de');
                    });
                  
                  console.log('📋 [Step2CustomerInfo] Valid customers for dropdown:', validCustomers.length, validCustomers);
                  
                  if (validCustomers.length > 0) {
                    return (
                      <>
                        {validCustomers.map((customer) => {
                          const displayName = customer.name?.trim() || customer.company?.trim() || 'Unbekannt';
                          const selectValue = customer.name?.trim() || customer.company?.trim() || '';
                          
                          if (!selectValue) return null;
                          
                          return (
                            <SelectItem 
                              key={customer.id} 
                              value={selectValue}
                            >
                              {displayName}
                              {customer.company && customer.name && customer.company.trim() !== customer.name.trim() && ` (${customer.company})`}
                            </SelectItem>
                          );
                        })}
                        <SelectItem value="new-customer" className="text-blue-600 font-semibold border-t border-gray-200 mt-1 pt-1">
                          <div className="flex items-center gap-2">
                            <Plus className="h-4 w-4" />
                            Neuen Kunden erstellen...
                          </div>
                        </SelectItem>
                      </>
                    );
                  } else {
                    return (
                      <>
                        <SelectItem value="no-customers" disabled>
                          Keine Kunden gefunden. Bitte erstellen Sie zuerst einen Kunden.
                        </SelectItem>
                        <SelectItem value="new-customer" className="text-blue-600 font-semibold border-t border-gray-200 mt-1 pt-1">
                          <div className="flex items-center gap-2">
                            <Plus className="h-4 w-4" />
                            Neuen Kunden erstellen...
                          </div>
                        </SelectItem>
                      </>
                    );
                  }
                })()}
              </SelectContent>
            </Select>
            {getFieldProps('customerName').error && (
              <p className="text-sm text-red-600 mt-1">{getFieldProps('customerName').error}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Wählen Sie einen Kunden aus der Liste oder erstellen Sie einen neuen.
            </p>
          </div>
          <FormInput
            label="Kundenreferenz"
            tooltip="Optionale interne Referenznummer"
            placeholder="Kundenreferenz eingeben"
            value={formData.customerReference || ''}
            onChange={(e) => {
              const value = e.target.value;
              updateFormData({ customerReference: value });
            }}
            helperText="Optionale interne Referenz"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormInput
            label="Telefon"
            type="tel"
            tooltip="Telefonnummer für Kontaktaufnahme"
            placeholder="Telefonnummer eingeben"
            value={formData.customerPhone || ''}
            onChange={(e) => {
              const value = e.target.value;
              updateFormData({ customerPhone: value });
            }}
            helperText="Telefonnummer für Kontaktaufnahme"
          />
          <FormInput
            label="E-Mail"
            type="email"
            tooltip="E-Mail-Adresse für Benachrichtigungen"
            placeholder="E-Mail-Adresse eingeben"
            value={formData.customerEmail || ''}
            onChange={(e) => {
              const value = e.target.value;
              updateFormData({ customerEmail: value });
            }}
            onBlur={() => {
              const value = formData.customerEmail || '';
              setValidationValues((prev: any) => ({ ...prev, customerEmail: value }));
              setTimeout(() => {
                const props = getFieldProps('customerEmail');
                props.onChange(value);
                props.onBlur();
              }, 50);
            }}
            error={getFieldProps('customerEmail').error}
            touched={getFieldProps('customerEmail').touched}
            isValid={getFieldProps('customerEmail').isValid}
            helperText="E-Mail-Adresse für Benachrichtigungen"
          />
        </div>
        <div>
          <Label htmlFor="customerAddress">Kundenadresse</Label>
          <Input
            id="customerAddress"
            name="customerAddress"
            value={formData.customerAddress || ''}
            onChange={(e) => {
              const value = e.target.value;
              updateFormData({ customerAddress: value });
            }}
            placeholder="Straße und Hausnummer"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="city">Stadt</Label>
            <Input
              id="city"
              name="city"
              value={formData.city || ''}
              onChange={(e) => {
                const value = e.target.value;
                updateFormData({ city: value });
              }}
              placeholder="Stadt"
            />
          </div>
          <div>
            <Label htmlFor="postalCode">PLZ</Label>
            <Input
              id="postalCode"
              name="postalCode"
              value={formData.postalCode || ''}
              onChange={(e) => {
                const value = e.target.value;
                updateFormData({ postalCode: value });
              }}
              placeholder="Postleitzahl"
            />
          </div>
        </div>
      </div>
    );
  };

  // Step 3: Project Details
  const Step3ProjectDetails: React.FC<{
    formData: Record<string, any>;
    updateFormData: (data: Record<string, any>) => void;
  }> = ({ formData, updateFormData }) => {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="assignedManager">Projektmanager *</Label>
            <Input
              id="assignedManager"
              name="assignedManager"
              value={formData.assignedManager || ''}
              onChange={(e) => {
                const value = e.target.value;
                updateFormData({ assignedManager: value });
              }}
              placeholder="Name des Projektmanagers"
              required
            />
          </div>
          <div>
            <Label htmlFor="workLocation">Arbeitsort</Label>
            <Input
              id="workLocation"
              name="workLocation"
              value={formData.workLocation || ''}
              onChange={(e) => {
                const value = e.target.value;
                updateFormData({ workLocation: value });
              }}
              placeholder="Bezeichnung des Arbeitsorts"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="projectStartDate">Projektstart</Label>
            <Input
              id="projectStartDate"
              name="projectStartDate"
              type="date"
              value={formData.projectStartDate || ''}
              onChange={(e) => {
                const value = e.target.value;
                updateFormData({ projectStartDate: value });
              }}
            />
          </div>
          <div>
            <Label htmlFor="plannedEndDate">Geplantes Ende</Label>
            <Input
              id="plannedEndDate"
              name="plannedEndDate"
              type="date"
              value={formData.plannedEndDate || ''}
              onChange={(e) => {
                const value = e.target.value;
                updateFormData({ plannedEndDate: value });
              }}
            />
          </div>
        </div>
        <div>
          <Label htmlFor="workAddress">Arbeitsadresse</Label>
          <Input
            id="workAddress"
            name="workAddress"
            value={formData.workAddress || ''}
            onChange={(e) => {
              const value = e.target.value;
              updateFormData({ workAddress: value });
            }}
            placeholder="Straße und Hausnummer"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="workCity">Arbeitsstadt</Label>
            <Input
              id="workCity"
              name="workCity"
              value={formData.workCity || ''}
              onChange={(e) => {
                const value = e.target.value;
                updateFormData({ workCity: value });
              }}
              placeholder="Stadt"
            />
          </div>
          <div>
            <Label htmlFor="workPostalCode">Arbeits-PLZ</Label>
            <Input
              id="workPostalCode"
              name="workPostalCode"
              value={formData.workPostalCode || ''}
              onChange={(e) => {
                const value = e.target.value;
                updateFormData({ workPostalCode: value });
              }}
              placeholder="Postleitzahl"
            />
          </div>
        </div>
        <div>
          <Label htmlFor="workLocationNotes">Arbeitsort-Notizen</Label>
          <Textarea
            id="workLocationNotes"
            name="workLocationNotes"
            value={formData.workLocationNotes || ''}
            onChange={(e) => {
              const value = e.target.value;
              updateFormData({ workLocationNotes: value });
            }}
            rows={3}
            placeholder="Zusätzliche Informationen zum Arbeitsort..."
          />
        </div>
      </div>
    );
  };

  // Step 4: Additional Information
  const Step4AdditionalInfo: React.FC<{
    formData: Record<string, any>;
    updateFormData: (data: Record<string, any>) => void;
  }> = ({ formData, updateFormData }) => {
    return (
      <div className="space-y-4">
        <div>
          <Label htmlFor="notes">Projektnotizen</Label>
          <Textarea
            id="notes"
            name="notes"
            value={formData.notes || ''}
            onChange={(e) => {
              const value = e.target.value;
              updateFormData({ notes: value });
            }}
            rows={6}
            placeholder="Zusätzliche Notizen zum Projekt..."
          />
        </div>
        <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
          <p className="text-sm text-blue-800">
            <strong>Hinweis:</strong> Mitarbeiter und Materialgruppen können nach der Erstellung des Projekts zugewiesen werden.
          </p>
        </div>
      </div>
    );
  };

  // Summary Component
  const SummaryComponent: React.FC<{ formData: Record<string, any> }> = ({ formData }) => {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-4">
              <h4 className="font-semibold text-sm text-gray-600 mb-2">Grundinformationen</h4>
              <div className="space-y-1 text-sm">
                <p><strong>Projektname:</strong> {formData.name || '-'}</p>
                <p><strong>Projektnummer:</strong> {formData.projectNumber || '-'}</p>
                <p><strong>Status:</strong> <Badge>{formData.status || '-'}</Badge></p>
                <p><strong>Kategorie:</strong> {formData.category || '-'}</p>
                <p><strong>Projekttyp:</strong> {formData.isInternal ? <Badge variant="secondary">Intern</Badge> : <Badge variant="default">Extern</Badge>}</p>
                {formData.isInternal && formData.internalCategory && (
                  <p><strong>Interne Kategorie:</strong> {formData.internalCategory || '-'}</p>
                )}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <h4 className="font-semibold text-sm text-gray-600 mb-2">Kundeninformationen</h4>
              <div className="space-y-1 text-sm">
                <p><strong>Kunde:</strong> {formData.customerName || '-'}</p>
                <p><strong>E-Mail:</strong> {formData.customerEmail || '-'}</p>
                <p><strong>Telefon:</strong> {formData.customerPhone || '-'}</p>
                <p><strong>Adresse:</strong> {formData.customerAddress || '-'}</p>
              </div>
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardContent className="pt-4">
            <h4 className="font-semibold text-sm text-gray-600 mb-2">Projektdetails</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p><strong>Projektmanager:</strong> {formData.assignedManager || '-'}</p>
                <p><strong>Arbeitsort:</strong> {formData.workLocation || '-'}</p>
              </div>
              <div>
                <p><strong>Start:</strong> {formData.projectStartDate || '-'}</p>
                <p><strong>Ende:</strong> {formData.plannedEndDate || '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Define steps - components will receive formData and updateFormData from MultiStepForm
  const steps: FormStep[] = [
    {
      id: 'basic-info',
      title: 'Grundinformationen',
      description: 'Projektname, Nummer und grundlegende Details',
      component: (props: any) => <Step1BasicInfo {...props} />,
      validation: async () => {
        // Validation will be done using formData from MultiStepForm context
        return true; // Will be validated by MultiStepForm using the actual formData
      },
    },
    {
      id: 'customer-info',
      title: 'Kundeninformationen',
      description: 'Kontaktdaten und Adresse des Kunden',
      component: (props: any) => (
        <Step2CustomerInfo 
          {...props}
          customers={customers} 
          customersLoaded={customersLoaded}
          showCustomerModal={showCustomerModal}
          setShowCustomerModal={setShowCustomerModal}
          newCustomerData={newCustomerData}
          setNewCustomerData={setNewCustomerData}
          setCustomers={setCustomers}
          setValidationValues={setValidationValues}
        />
      ),
      validation: async () => {
        return true; // Will be validated by MultiStepForm using the actual formData
      },
    },
    {
      id: 'project-details',
      title: 'Projektdetails',
      description: 'Manager, Arbeitsort und Termine',
      component: (props: any) => <Step3ProjectDetails {...props} />,
      optional: true,
    },
    {
      id: 'additional-info',
      title: 'Zusätzliche Informationen',
      description: 'Notizen und weitere Details',
      component: (props: any) => <Step4AdditionalInfo {...props} />,
      optional: true,
    },
  ];

  return (
    <MultiStepForm
      steps={steps}
      onSubmit={async (data) => {
        const projectData: ExtendedProject = {
          id: editingProject?.id || Date.now().toString(),
          createdAt: editingProject?.createdAt || new Date().toISOString(),
          assignedEmployees: editingProject?.assignedEmployees || [],
          assignedMaterialGroups: editingProject?.assignedMaterialGroups || [],
          isInternal: data.isInternal || false, // Default: external project
          internalCategory: data.internalCategory || undefined,
          type: data.isInternal ? 'internal' : 'external', // Set type based on isInternal
          ...data,
        } as ExtendedProject;
        await onSubmit(projectData);
      }}
      onCancel={onCancel}
      initialData={editingProject || initialData}
      showProgress={true}
      showStepNumbers={true}
      submitLabel={editingProject ? 'Projekt aktualisieren' : 'Projekt erstellen'}
      summaryComponent={<SummaryComponent formData={editingProject || initialData} />}
    />
  );
};

export default ProjectMultiStepForm;

