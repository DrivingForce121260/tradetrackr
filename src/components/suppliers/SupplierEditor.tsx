/**
 * SupplierEditor - Create and edit suppliers (Lieferanten)
 * 
 * UI pattern matches OfferEditor:
 * - Gradient cards for sections
 * - Read-only banner for archived suppliers
 * - Consistent action buttons
 * - Keyboard shortcuts (Ctrl+S, ESC)
 * - Dirty form confirmation
 * - Duplicate detection on create
 * - Status change confirmation for archive
 * 
 * German labels throughout
 */

import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Lock, Building2, Phone, MapPin, CreditCard, FileText, Loader2, AlertTriangle, Upload } from 'lucide-react';
import { SupplierService } from '@/services/supplierService';
import {
  Supplier,
  SupplierCreateInput,
  SupplierStatus,
  SUPPLIER_STATUS_LABELS,
  SUPPLIER_STATUS_COLORS,
} from '@/types/suppliers';
import { useToast } from '@/hooks/use-toast';

interface SupplierEditorProps {
  existingSupplier?: Supplier;
  onSaved?: (supplierId: string) => void;
  onCancel?: () => void;
  onOpenSupplier?: (supplier: Supplier) => void; // For opening duplicate
}

const SupplierEditor: React.FC<SupplierEditorProps> = ({
  existingSupplier,
  onSaved,
  onCancel,
  onOpenSupplier,
}) => {
  const { user } = useAuth();
  const concernID = user?.concernID || user?.ConcernID;
  const { toast } = useToast();

  // Read-only mode for archived suppliers
  const isReadOnly = existingSupplier?.status === 'archived';

  // Form state
  const [name, setName] = useState('');
  const [legalForm, setLegalForm] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('Deutschland');
  const [vatId, setVatId] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [iban, setIban] = useState('');
  const [bic, setBic] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [defaultExpenseAccount, setDefaultExpenseAccount] = useState('');
  const [status, setStatus] = useState<SupplierStatus>('active');
  const [notes, setNotes] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Dialog states
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [duplicateSupplier, setDuplicateSupplier] = useState<Supplier | null>(null);
  const [pendingStatusChange, setPendingStatusChange] = useState<SupplierStatus | null>(null);

  // Track original values for dirty detection
  const originalValuesRef = useRef<Record<string, string>>({});
  const [isDirty, setIsDirty] = useState(false);

  const supplierService = useMemo(() => {
    if (!concernID) return null;
    return new SupplierService(concernID);
  }, [concernID]);

  // Load existing supplier data
  useEffect(() => {
    if (existingSupplier) {
      const values = {
        name: existingSupplier.name || '',
        legalForm: existingSupplier.legalForm || '',
        contactPerson: existingSupplier.contactPerson || '',
        email: existingSupplier.email || '',
        phone: existingSupplier.phone || '',
        website: existingSupplier.website || '',
        addressLine1: existingSupplier.addressLine1 || '',
        addressLine2: existingSupplier.addressLine2 || '',
        postalCode: existingSupplier.postalCode || '',
        city: existingSupplier.city || '',
        country: existingSupplier.country || 'Deutschland',
        vatId: existingSupplier.vatId || '',
        taxNumber: existingSupplier.taxNumber || '',
        iban: existingSupplier.iban || '',
        bic: existingSupplier.bic || '',
        paymentTerms: existingSupplier.paymentTerms || '',
        defaultExpenseAccount: existingSupplier.defaultExpenseAccount || '',
        status: existingSupplier.status || 'active',
        notes: existingSupplier.notes || '',
      };
      
      setName(values.name);
      setLegalForm(values.legalForm);
      setContactPerson(values.contactPerson);
      setEmail(values.email);
      setPhone(values.phone);
      setWebsite(values.website);
      setAddressLine1(values.addressLine1);
      setAddressLine2(values.addressLine2);
      setPostalCode(values.postalCode);
      setCity(values.city);
      setCountry(values.country);
      setVatId(values.vatId);
      setTaxNumber(values.taxNumber);
      setIban(values.iban);
      setBic(values.bic);
      setPaymentTerms(values.paymentTerms);
      setDefaultExpenseAccount(values.defaultExpenseAccount);
      setStatus(values.status as SupplierStatus);
      setNotes(values.notes);
      
      originalValuesRef.current = values;
      setIsDirty(false);
    } else {
      originalValuesRef.current = {
        name: '',
        legalForm: '',
        contactPerson: '',
        email: '',
        phone: '',
        website: '',
        addressLine1: '',
        addressLine2: '',
        postalCode: '',
        city: '',
        country: 'Deutschland',
        vatId: '',
        taxNumber: '',
        iban: '',
        bic: '',
        paymentTerms: '',
        defaultExpenseAccount: '',
        status: 'active',
        notes: '',
      };
    }
  }, [existingSupplier]);

  // Check if form is dirty
  useEffect(() => {
    const currentValues = {
      name, legalForm, contactPerson, email, phone, website,
      addressLine1, addressLine2, postalCode, city, country,
      vatId, taxNumber, iban, bic, paymentTerms, defaultExpenseAccount,
      status, notes,
    };
    
    const orig = originalValuesRef.current;
    const dirty = Object.keys(currentValues).some(
      key => currentValues[key as keyof typeof currentValues] !== (orig[key] || '')
    );
    setIsDirty(dirty);
  }, [name, legalForm, contactPerson, email, phone, website, addressLine1, addressLine2,
      postalCode, city, country, vatId, taxNumber, iban, bic, paymentTerms,
      defaultExpenseAccount, status, notes]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S or Cmd+S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (!isReadOnly && !isSaving && name.trim()) {
          handleSave();
        }
      }
      
      // ESC to close (with dirty check)
      if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isReadOnly, isSaving, name, isDirty]);

  // Handle cancel with dirty check
  const handleCancel = useCallback(() => {
    if (isDirty && !isReadOnly) {
      setShowDiscardDialog(true);
    } else {
      onCancel?.();
    }
  }, [isDirty, isReadOnly, onCancel]);

  // Handle status change with archive confirmation
  const handleStatusChange = useCallback((newStatus: SupplierStatus) => {
    if (newStatus === 'archived') {
      setPendingStatusChange('archived');
      setShowArchiveDialog(true);
    } else {
      setStatus(newStatus);
    }
  }, []);

  const confirmArchive = useCallback(() => {
    if (pendingStatusChange) {
      setStatus(pendingStatusChange);
    }
    setShowArchiveDialog(false);
    setPendingStatusChange(null);
  }, [pendingStatusChange]);

  // Validate form
  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (!name.trim()) {
      errors.name = 'Name ist erforderlich';
    }

    // Optional: Validate VAT ID format (German: DE followed by 9 digits)
    if (vatId && !/^DE\d{9}$/i.test(vatId.replace(/\s/g, ''))) {
      errors.vatId = 'Format: DE123456789';
    }

    // Optional: Basic IBAN validation (DE has 22 chars)
    if (iban) {
      const cleanIban = iban.replace(/\s/g, '').toUpperCase();
      if (cleanIban.startsWith('DE') && cleanIban.length !== 22) {
        errors.iban = 'Deutsche IBAN muss 22 Zeichen haben';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async (forceCreate = false) => {
    if (isReadOnly) {
      console.warn('Attempted to save archived supplier - blocked');
      return;
    }

    if (!supplierService) {
      toast({
        title: 'Fehler',
        description: 'Service nicht verfügbar. Bitte laden Sie die Seite neu.',
        variant: 'destructive',
      });
      return;
    }

    if (!validate()) {
      toast({
        title: 'Validierungsfehler',
        description: 'Bitte korrigieren Sie die markierten Felder.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);

    try {
      const userSnapshot = {
        userId: user?.uid || '',
        name: user?.displayName || user?.vorname || user?.email || '',
      };

      const supplierData: SupplierCreateInput = {
        name: name.trim(),
        legalForm: legalForm.trim() || undefined,
        contactPerson: contactPerson.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        website: website.trim() || undefined,
        addressLine1: addressLine1.trim() || undefined,
        addressLine2: addressLine2.trim() || undefined,
        postalCode: postalCode.trim() || undefined,
        city: city.trim() || undefined,
        country: country.trim() || 'Deutschland',
        vatId: vatId.trim() || undefined,
        taxNumber: taxNumber.trim() || undefined,
        iban: iban.trim() || undefined,
        bic: bic.trim() || undefined,
        paymentTerms: paymentTerms.trim() || undefined,
        defaultExpenseAccount: defaultExpenseAccount.trim() || undefined,
        status,
        notes: notes.trim() || undefined,
      };

      let supplierId: string;

      if (existingSupplier?.id) {
        // Update existing supplier
        await supplierService.updateSupplier(existingSupplier.id, supplierData, userSnapshot);
        supplierId = existingSupplier.id;
        toast({
          title: '✅ Gespeichert',
          description: 'Lieferant wurde aktualisiert.',
        });
      } else {
        // Check for duplicates before creating (unless forced)
        if (!forceCreate) {
          const duplicate = await supplierService.checkForDuplicate(supplierData);
          if (duplicate) {
            setDuplicateSupplier(duplicate);
            setShowDuplicateDialog(true);
            setIsSaving(false);
            return;
          }
        }
        
        // Create new supplier
        supplierId = await supplierService.createSupplier(supplierData, userSnapshot);
        toast({
          title: '✅ Erstellt',
          description: 'Neuer Lieferant wurde angelegt.',
        });
      }

      if (onSaved) {
        onSaved(supplierId);
      }
    } catch (error) {
      console.error('Error saving supplier:', error);
      
      let errorMessage = 'Lieferant konnte nicht gespeichert werden.';
      if (error instanceof Error) {
        if (error.message === 'SUPPLIER_ARCHIVED') {
          errorMessage = 'Archivierte Lieferanten können nicht bearbeitet werden.';
        } else if (error.message === 'SUPPLIER_NAME_REQUIRED') {
          errorMessage = 'Firmenname ist erforderlich.';
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: 'Fehler',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle duplicate dialog actions
  const handleOpenDuplicate = () => {
    if (duplicateSupplier && onOpenSupplier) {
      onOpenSupplier(duplicateSupplier);
    }
    setShowDuplicateDialog(false);
    setDuplicateSupplier(null);
  };

  const handleForceCreate = () => {
    setShowDuplicateDialog(false);
    setDuplicateSupplier(null);
    handleSave(true); // Force create
  };

  // Input styling helpers
  const inputClass = (hasError?: boolean) => {
    const base = 'font-semibold h-11';
    const borderColor = hasError
      ? 'border-red-400 focus:border-red-500 focus:ring-red-500/30'
      : 'border-blue-300 focus:border-[#058bc0] focus:ring-[#058bc0]/30';
    const bgColor = isReadOnly ? 'bg-gray-100' : 'bg-white';
    return `${base} border-2 ${borderColor} focus:ring-2 ${bgColor}`;
  };

  const statusColors = SUPPLIER_STATUS_COLORS[status];

  return (
    <div className="space-y-6">
      {/* Read-Only Banner for Archived Suppliers (matching Kunden notice pattern) */}
      {isReadOnly && (
        <Card className="border-2 border-amber-300 shadow-lg overflow-hidden">
          <CardContent className="bg-gradient-to-r from-amber-50 to-yellow-50 p-4">
            <div className="flex items-center gap-3">
              <Lock className="h-6 w-6 text-amber-600" />
              <div>
                <p className="text-sm font-medium text-amber-800">
                  🔒 Dieser Lieferant ist archiviert und schreibgeschützt.
                </p>
                <p className="text-xs text-amber-700 mt-1">
                  Um Änderungen vorzunehmen, muss der Status zuerst auf „Aktiv" oder „Inaktiv" geändert werden.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dirty State Notice */}
      {isDirty && !isReadOnly && (
        <Card className="border-2 border-orange-300 shadow-lg overflow-hidden">
          <CardContent className="bg-gradient-to-r from-orange-50 to-amber-50 p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-orange-800 flex items-center gap-2">
                ⚠️ Ungespeicherte Änderungen vorhanden
              </span>
              <span className="text-xs text-orange-600">
                <kbd className="px-1 py-0.5 bg-white rounded border text-xs">Ctrl+S</kbd> zum Speichern
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Section 1: Stammdaten (Basic Info) - matching Kunden CardHeader style */}
      <Card className="border-2 border-blue-300 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">🏢</span>
            Stammdaten
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <Label className="text-sm font-semibold text-gray-900 flex items-center gap-2">🏢 Firmenname *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isReadOnly}
                placeholder="z.B. Mustermann GmbH"
                className={inputClass(!!validationErrors.name)}
              />
              {validationErrors.name && (
                <p className="text-red-500 text-sm mt-1">{validationErrors.name}</p>
              )}
            </div>
            <div>
              <Label className="text-sm font-semibold text-gray-900 flex items-center gap-2">📄 Rechtsform</Label>
              <Select value={legalForm} onValueChange={setLegalForm} disabled={isReadOnly}>
                <SelectTrigger className={inputClass()}>
                  <SelectValue placeholder="Rechtsform wählen" />
                </SelectTrigger>
                <SelectContent className="bg-white border-2 border-blue-300">
                  <SelectItem value="GmbH">GmbH</SelectItem>
                  <SelectItem value="AG">AG</SelectItem>
                  <SelectItem value="UG">UG (haftungsbeschränkt)</SelectItem>
                  <SelectItem value="OHG">OHG</SelectItem>
                  <SelectItem value="KG">KG</SelectItem>
                  <SelectItem value="GbR">GbR</SelectItem>
                  <SelectItem value="e.K.">e.K.</SelectItem>
                  <SelectItem value="Einzelunternehmen">Einzelunternehmen</SelectItem>
                  <SelectItem value="Sonstige">Sonstige</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-semibold text-gray-900 flex items-center gap-2">👤 Ansprechpartner</Label>
              <Input
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                disabled={isReadOnly}
                placeholder="z.B. Max Mustermann"
                className={inputClass()}
              />
            </div>
            <div>
              <Label className="text-sm font-semibold text-gray-900 flex items-center gap-2">🎯 Status</Label>
              <Select 
                value={status} 
                onValueChange={(v) => handleStatusChange(v as SupplierStatus)} 
                disabled={isReadOnly}
              >
                <SelectTrigger className={inputClass()}>
                  <SelectValue placeholder="Status wählen" />
                </SelectTrigger>
                <SelectContent className="bg-white border-2 border-blue-300">
                  <SelectItem value="active">Aktiv</SelectItem>
                  <SelectItem value="inactive">Inaktiv</SelectItem>
                  <SelectItem value="archived">
                    <span className="flex items-center gap-2">
                      <Lock className="h-3 w-3" />
                      Archiviert (schreibgeschützt)
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Kontakt (Contact) */}
      <Card className="border-2 border-green-300 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-600 text-white">
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">📞</span>
            Kontakt
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label className="text-sm font-semibold text-gray-900 flex items-center gap-2">📱 Telefon</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={isReadOnly}
                placeholder="z.B. +49 123 456789"
                className={inputClass()}
              />
            </div>
            <div>
              <Label className="text-sm font-semibold text-gray-900 flex items-center gap-2">📧 E-Mail</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isReadOnly}
                placeholder="z.B. info@beispiel.de"
                className={inputClass()}
              />
            </div>
            <div>
              <Label className="text-sm font-semibold text-gray-900 flex items-center gap-2">🌐 Website</Label>
              <Input
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                disabled={isReadOnly}
                placeholder="z.B. www.beispiel.de"
                className={inputClass()}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 3: Adresse (Address) */}
      <Card className="border-2 border-amber-300 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">📍</span>
            Adresse
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label className="text-sm font-semibold text-gray-900 flex items-center gap-2">🏠 Straße / Hausnummer</Label>
              <Input
                value={addressLine1}
                onChange={(e) => setAddressLine1(e.target.value)}
                disabled={isReadOnly}
                placeholder="z.B. Musterstraße 123"
                className={inputClass()}
              />
            </div>
            <div className="md:col-span-2">
              <Label className="text-sm font-semibold text-gray-900 flex items-center gap-2">🏠 Adresszusatz</Label>
              <Input
                value={addressLine2}
                onChange={(e) => setAddressLine2(e.target.value)}
                disabled={isReadOnly}
                placeholder="z.B. Gebäude A, 2. OG"
                className={inputClass()}
              />
            </div>
            <div>
              <Label className="text-sm font-semibold text-gray-900 flex items-center gap-2">📮 PLZ</Label>
              <Input
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                disabled={isReadOnly}
                placeholder="z.B. 12345"
                className={inputClass()}
              />
            </div>
            <div>
              <Label className="text-sm font-semibold text-gray-900 flex items-center gap-2">🏙️ Ort</Label>
              <Input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                disabled={isReadOnly}
                placeholder="z.B. Berlin"
                className={inputClass()}
              />
            </div>
            <div>
              <Label className="text-sm font-semibold text-gray-900 flex items-center gap-2">🌍 Land</Label>
              <Input
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                disabled={isReadOnly}
                placeholder="z.B. Deutschland"
                className={inputClass()}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 4: Steuer & Bank (Tax & Banking) */}
      <Card className="border-2 border-purple-300 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white">
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">💳</span>
            Steuer & Bankverbindung
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-semibold text-gray-900 flex items-center gap-2">🔖 USt-IdNr.</Label>
              <Input
                value={vatId}
                onChange={(e) => setVatId(e.target.value)}
                disabled={isReadOnly}
                placeholder="z.B. DE123456789"
                className={inputClass(!!validationErrors.vatId)}
              />
              {validationErrors.vatId && (
                <p className="text-amber-600 text-sm mt-1">{validationErrors.vatId}</p>
              )}
            </div>
            <div>
              <Label className="text-sm font-semibold text-gray-900 flex items-center gap-2">📋 Steuernummer</Label>
              <Input
                value={taxNumber}
                onChange={(e) => setTaxNumber(e.target.value)}
                disabled={isReadOnly}
                placeholder="z.B. 123/456/78901"
                className={inputClass()}
              />
            </div>
            <div className="md:col-span-2">
              <Label className="text-sm font-semibold text-gray-900 flex items-center gap-2">🏦 IBAN</Label>
              <Input
                value={iban}
                onChange={(e) => setIban(e.target.value)}
                disabled={isReadOnly}
                placeholder="z.B. DE89 3704 0044 0532 0130 00"
                className={inputClass(!!validationErrors.iban)}
              />
              {validationErrors.iban && (
                <p className="text-amber-600 text-sm mt-1">{validationErrors.iban}</p>
              )}
            </div>
            <div>
              <Label className="text-sm font-semibold text-gray-900 flex items-center gap-2">🔢 BIC</Label>
              <Input
                value={bic}
                onChange={(e) => setBic(e.target.value)}
                disabled={isReadOnly}
                placeholder="z.B. COBADEFFXXX"
                className={inputClass()}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 5: Konditionen & DATEV */}
      <Card className="border-2 border-cyan-300 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-cyan-500 to-teal-600 text-white">
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">📋</span>
            Konditionen & DATEV
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-semibold text-gray-900 flex items-center gap-2">💰 Zahlungsziel</Label>
              <Select value={paymentTerms} onValueChange={setPaymentTerms} disabled={isReadOnly}>
                <SelectTrigger className={inputClass()}>
                  <SelectValue placeholder="Zahlungsziel wählen" />
                </SelectTrigger>
                <SelectContent className="bg-white border-2 border-cyan-300">
                  <SelectItem value="sofort">Sofort</SelectItem>
                  <SelectItem value="7 Tage netto">7 Tage netto</SelectItem>
                  <SelectItem value="14 Tage netto">14 Tage netto</SelectItem>
                  <SelectItem value="30 Tage netto">30 Tage netto</SelectItem>
                  <SelectItem value="14 Tage 2% Skonto, 30 Tage netto">14 Tage 2% Skonto, 30 Tage netto</SelectItem>
                  <SelectItem value="Vorkasse">Vorkasse</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-semibold text-gray-900 flex items-center gap-2">📊 Standard-Aufwandskonto (DATEV)</Label>
              <Input
                value={defaultExpenseAccount}
                onChange={(e) => setDefaultExpenseAccount(e.target.value)}
                disabled={isReadOnly}
                placeholder="z.B. 3400"
                className={inputClass()}
              />
              <p className="text-xs text-gray-500 mt-1">Für DATEV-Export verwendetes Konto</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 6: Notizen */}
      <Card className="border-2 border-gray-300 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-gray-500 to-gray-600 text-white">
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">📝</span>
            Notizen
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={isReadOnly}
            placeholder="Interne Notizen zu diesem Lieferanten..."
            className={`${inputClass()} min-h-[100px] resize-y`}
          />
        </CardContent>
      </Card>

      {/* Optional: CSV Import Placeholder */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          disabled
          className="border-dashed border-2 border-gray-300 text-gray-400 cursor-not-allowed"
          title="CSV-Import kommt in einer zukünftigen Version"
        >
          <Upload className="h-4 w-4 mr-2" />
          CSV-Import (kommt bald)
        </Button>
      </div>

      {/* Action Buttons (matching Kunden form pattern) */}
      <div className="flex gap-3 pt-6 border-t-2 border-gray-200">
        <Button
          onClick={() => handleSave()}
          disabled={isSaving || !name.trim() || isReadOnly}
          className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold shadow-md hover:shadow-lg transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Wird gespeichert...
            </>
          ) : (
            <>
              <span className="text-lg">{existingSupplier ? '💾' : '✨'}</span>
              ✅ {existingSupplier ? 'Speichern' : 'Lieferant erstellen'}
            </>
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleCancel}
          className="border-2 border-gray-300 hover:border-red-400 hover:bg-red-50 hover:text-red-700 transition-all"
        >
          {isReadOnly ? 'Schließen' : 'Abbrechen'}
        </Button>
      </div>

      {/* Discard Changes Dialog */}
      <AlertDialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Änderungen verwerfen?</AlertDialogTitle>
            <AlertDialogDescription>
              Sie haben ungespeicherte Änderungen. Möchten Sie diese wirklich verwerfen?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowDiscardDialog(false);
                onCancel?.();
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Änderungen verwerfen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Archive Confirmation Dialog */}
      <AlertDialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Lieferant archivieren?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Nach dem Archivieren ist dieser Lieferant <strong>schreibgeschützt</strong> und 
              kann nicht mehr bearbeitet werden. Sie können den Status später wieder ändern.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingStatusChange(null)}>
              Abbrechen
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmArchive}
              className="bg-amber-600 hover:bg-amber-700"
            >
              Archivieren
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Duplicate Detection Dialog */}
      <Dialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Möglicher Duplikat-Treffer gefunden
            </DialogTitle>
            <DialogDescription>
              Es existiert bereits ein ähnlicher Lieferant:
            </DialogDescription>
          </DialogHeader>
          
          {duplicateSupplier && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 my-4">
              <p className="font-semibold text-gray-900">{duplicateSupplier.name}</p>
              {duplicateSupplier.vatId && (
                <p className="text-sm text-gray-600">USt-IdNr.: {duplicateSupplier.vatId}</p>
              )}
              {duplicateSupplier.city && (
                <p className="text-sm text-gray-600">Ort: {duplicateSupplier.city}</p>
              )}
            </div>
          )}
          
          <p className="text-sm text-gray-600">
            Möchten Sie den bestehenden Lieferanten öffnen oder trotzdem einen neuen anlegen?
          </p>
          
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setShowDuplicateDialog(false);
                setDuplicateSupplier(null);
              }}
            >
              Abbrechen
            </Button>
            <Button
              variant="outline"
              onClick={handleForceCreate}
            >
              Trotzdem neu anlegen
            </Button>
            <Button
              onClick={handleOpenDuplicate}
              className="bg-[#058bc0] hover:bg-[#0470a0]"
            >
              Bestehenden öffnen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SupplierEditor;
