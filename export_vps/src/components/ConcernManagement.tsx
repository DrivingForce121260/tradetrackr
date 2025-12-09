import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { concernService } from '@/services/firestoreService';
import { Concern } from '@/services/firestoreService';
import { Building, Users, Calendar, MapPin, Phone, Mail, Edit, Save, X, Shield, AlertCircle, ClipboardList, Package, FolderOpen, FileText, CheckSquare, BarChart3, Plus, Sparkles } from 'lucide-react';
import AppHeader from './AppHeader';
import { fetchBrandingSettings, saveBrandingSettings, BrandingSettings } from '@/services/brandingService';

interface ConcernManagementProps {
  onBack?: () => void;
  onNavigate?: (page: string) => void;
  onOpenMessaging?: () => void;
}

const ConcernManagement: React.FC<ConcernManagementProps> = ({ 
  onBack, 
  onNavigate, 
  onOpenMessaging 
}) => {
  const { user, hasPermission } = useAuth();
  const { toast } = useToast();
  const [concern, setConcern] = useState<Concern | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editData, setEditData] = useState<Partial<Concern>>({});
  const [branding, setBranding] = useState<BrandingSettings | null>(null);
  const [brandingEdit, setBrandingEdit] = useState<BrandingSettings>({});
  const [brandingSaving, setBrandingSaving] = useState(false);
  const [brandingErrors, setBrandingErrors] = useState<{ json?: string; email?: string; logoUrl?: string; locale?: string }>({});

  // Prüfen, ob der Benutzer Administrator ist
  const isAdmin = hasPermission('admin') || user?.role === 'admin' || user?.rechte >= 10;

  useEffect(() => {
    loadConcernData();
    loadBranding();
  }, [user?.concernID]);

  const loadConcernData = async () => {
    if (!user?.concernID) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      
      const concernData = await concernService.get(user.concernID);
      
      if (concernData) {

        setConcern(concernData);
        setEditData(concernData);
      } else {

        toast({
          title: "Fehler",
          description: "Concern-Daten konnten nicht geladen werden.",
          variant: "destructive"
        });
      }
    } catch (error) {

      toast({
        title: "Fehler",
        description: "Fehler beim Laden der Concern-Daten.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadBranding = async () => {
    if (!user?.concernID) return;
    const b = await fetchBrandingSettings(user.concernID);
    if (b) {
      setBranding(b);
      setBrandingEdit(b);
    } else {
      setBrandingEdit({});
    }
  };

  const handleBrandingSave = async () => {
    if (!user?.concernID) return;
    // Basic validation
    const errors: typeof brandingErrors = {};
    if (brandingEdit.email && !/^\S+@\S+\.\S+$/.test(brandingEdit.email)) {
      errors.email = 'Ungültige E-Mail-Adresse';
    }
    if (brandingEdit.logoUrl && !/^https?:\/\//.test(brandingEdit.logoUrl)) {
      errors.logoUrl = 'Logo-URL muss mit http(s) beginnen';
    }
    if (brandingEdit.defaultLocale && !['de', 'en'].includes(brandingEdit.defaultLocale)) {
      errors.locale = 'Standard-Sprache muss "de" oder "en" sein';
    }
    setBrandingErrors(errors);
    if (Object.keys(errors).length > 0) {
      toast({ title: 'Validierungsfehler', description: 'Bitte Eingaben prüfen.', variant: 'destructive' });
      return;
    }
    try {
      setBrandingSaving(true);
      await saveBrandingSettings(user.concernID, brandingEdit);
      setBranding(brandingEdit);
      toast({ title: 'Gespeichert', description: 'Branding- und DATEV-Einstellungen aktualisiert.' });
    } catch (e) {
      toast({ title: 'Fehler', description: 'Speichern fehlgeschlagen.', variant: 'destructive' });
    } finally {
      setBrandingSaving(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditData(concern || {});
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditData(concern || {});
  };

  const handleSave = async () => {
    if (!concern?.uid || !editData) return;

    try {
      setIsSaving(true);

      
      await concernService.update(concern.uid, {
        ...editData,
        updateTime: new Date()
      });

      // Lokalen State aktualisieren
      setConcern(prev => prev ? { ...prev, ...editData, updateTime: new Date() } : null);
      setIsEditing(false);

      toast({
        title: "Erfolgreich gespeichert",
        description: "Die Unternehmensdaten wurden aktualisiert.",
      });

      // Concern-Daten neu laden, um sicherzustellen, dass alle Änderungen übernommen wurden
      await loadConcernData();

    } catch (error) {

      toast({
        title: "Fehler",
        description: "Die Unternehmensdaten konnten nicht gespeichert werden.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (field: keyof Concern, value: string | number) => {
    setEditData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Wenn der Benutzer kein Administrator ist, Zugriff verweigert
  if (!isAdmin) {
    return (
      <div className="min-h-screen tradetrackr-gradient-blue">
        <AppHeader 
          title="Concern-Verwaltung"
          showBackButton={true}
          onBack={onBack}
          onOpenMessaging={onOpenMessaging}
        />
        <div className="p-6">
          <div className="max-w-7xl mx-auto">
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-800">
                  <Shield className="h-5 w-5" />
                  Zugriff verweigert
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 text-red-700">
                  <AlertCircle className="h-5 w-5" />
                  <p>Sie haben keine Berechtigung, auf die Concern-Verwaltung zuzugreifen. Nur Administratoren können Unternehmensdaten bearbeiten.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen tradetrackr-gradient-blue">
        <AppHeader 
          title="Concern-Verwaltung"
          showBackButton={true}
          onBack={onBack}
          onOpenMessaging={onOpenMessaging}
        />
        <div className="p-6">
          <div className="max-w-7xl mx-auto">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-3 text-gray-600">Lade Unternehmensdaten...</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (!concern) {
    return (
      <div className="min-h-screen tradetrackr-gradient-blue">
        <AppHeader 
          title="Concern-Verwaltung"
          showBackButton={true}
          onBack={onBack}
          onOpenMessaging={onOpenMessaging}
        />
        <div className="p-6">
          <div className="max-w-7xl mx-auto">
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Keine Concern-Daten gefunden</h3>
                  <p className="text-gray-600 mb-4">
                    Für Ihre Concern ID konnten keine Daten gefunden werden.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen tradetrackr-gradient-blue">
      {/* Header */}
      <AppHeader 
        title="🏢 Concern-Verwaltung"
        showBackButton={true}
        onBack={onBack}
        onOpenMessaging={onOpenMessaging}
      >
        <div className="flex items-center gap-3">
          <Badge className="bg-white/20 text-white border-0 font-semibold">
            <Shield className="h-3 w-3 mr-1" />
            👑 Administrator
          </Badge>
          {!isEditing && (
            <Button 
              onClick={handleEdit} 
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105"
            >
              <Edit className="h-5 w-5 mr-2" />
              ✏️ Bearbeiten
            </Button>
          )}
        </div>
      </AppHeader>
      
      <div className="p-6">
        <div className="max-w-7xl mx-auto space-y-6">

          {/* Concern Information Card */}
          <Card className="tradetrackr-card border-2 border-[#058bc0] shadow-xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-[#058bc0] to-[#0470a0] text-white px-6 py-4">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Building className="h-5 w-5" />
                🏢 Unternehmensdaten
              </CardTitle>
            </CardHeader>
            <CardContent className="bg-gradient-to-br from-blue-50 to-cyan-50 p-6 space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="concernName" className="text-sm font-semibold text-gray-800 flex items-center gap-1">
                    <span className="text-base">🏢</span>
                    Unternehmensname *
                  </Label>
                  {isEditing ? (
                    <Input
                      id="concernName"
                      value={editData.concernName || ''}
                      onChange={(e) => handleInputChange('concernName', e.target.value)}
                      placeholder="Unternehmensname eingeben"
                      className="border-2 border-gray-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/20"
                      required
                    />
                  ) : (
                    <p className="text-gray-900 font-medium bg-white p-3 rounded-lg border-2 border-gray-200">{concern.concernName}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="concernEmail" className="text-sm font-semibold text-gray-800 flex items-center gap-1">
                    <span className="text-base">📧</span>
                    E-Mail-Adresse *
                  </Label>
                  {isEditing ? (
                    <Input
                      id="concernEmail"
                      type="email"
                      value={editData.concernEmail || ''}
                      onChange={(e) => handleInputChange('concernEmail', e.target.value)}
                      placeholder="info@unternehmen.de"
                      className="border-2 border-gray-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/20"
                      required
                    />
                  ) : (
                    <div className="flex items-center gap-2 bg-white p-3 rounded-lg border-2 border-gray-200">
                      <Mail className="h-5 w-5 text-gray-500" />
                      <p className="text-gray-900">{concern.concernEmail}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="concernTel" className="text-sm font-semibold text-gray-800 flex items-center gap-1">
                    <span className="text-base">📞</span>
                    Telefonnummer
                  </Label>
                  {isEditing ? (
                    <Input
                      id="concernTel"
                      type="tel"
                      value={editData.concernTel || ''}
                      onChange={(e) => handleInputChange('concernTel', e.target.value)}
                      placeholder="+49 123 456789"
                      className="border-2 border-gray-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/20"
                    />
                  ) : (
                    <div className="flex items-center gap-2 bg-white p-3 rounded-lg border-2 border-gray-200">
                      <Phone className="h-5 w-5 text-gray-500" />
                      <p className="text-gray-900">{concern.concernTel || 'Nicht angegeben'}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-800 flex items-center gap-1">
                    <span className="text-base">👥</span>
                    Mitglieder
                  </Label>
                  <div className="flex items-center gap-2 bg-white p-3 rounded-lg border-2 border-gray-200">
                    <Users className="h-5 w-5 text-gray-500" />
                    <p className="text-gray-900 font-medium">{concern.members}</p>
                    <Badge className="bg-green-100 text-green-800 border-0">✅ Aktive Benutzer</Badge>
                  </div>
                </div>
              </div>

              {/* Address */}
              <div className="space-y-2">
                <Label htmlFor="concernAddress" className="text-sm font-semibold text-gray-800 flex items-center gap-1">
                  <span className="text-base">📍</span>
                  Unternehmensadresse *
                </Label>
                {isEditing ? (
                  <Textarea
                    id="concernAddress"
                    value={editData.concernAddress || ''}
                    onChange={(e) => handleInputChange('concernAddress', e.target.value)}
                    placeholder="Vollständige Unternehmensadresse eingeben"
                    rows={3}
                    className="border-2 border-gray-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/20"
                    required
                  />
                ) : (
                  <div className="flex items-start gap-2 bg-white p-3 rounded-lg border-2 border-gray-200">
                    <MapPin className="h-5 w-5 text-gray-500 mt-1" />
                    <p className="text-gray-900">{concern.concernAddress}</p>
                  </div>
                )}
              </div>

              <Separator />

              {/* Metadata Information */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-white/50 rounded-lg border-2 border-gray-200">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-800 flex items-center gap-1">
                    <span className="text-base">🔑</span>
                    Concern ID
                  </Label>
                  <p className="text-gray-700 font-mono text-sm bg-white p-2 rounded border border-gray-300">{concern.uid}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-800 flex items-center gap-1">
                    <span className="text-base">📅</span>
                    Erstellt am
                  </Label>
                  <div className="flex items-center gap-2 bg-white p-2 rounded border border-gray-300">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <p className="text-gray-700 text-sm">
                      {concern.dateCreated instanceof Date 
                        ? concern.dateCreated.toLocaleDateString('de-DE')
                        : concern.dateCreated?.toDate ? concern.dateCreated.toDate().toLocaleDateString('de-DE')
                        : new Date().toLocaleDateString('de-DE')
                      }
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-800 flex items-center gap-1">
                    <span className="text-base">🔄</span>
                    Letzte Aktualisierung
                  </Label>
                  <div className="flex items-center gap-2 bg-white p-2 rounded border border-gray-300">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <p className="text-gray-700 text-sm">
                      {concern.updateTime instanceof Date 
                        ? concern.updateTime.toLocaleDateString('de-DE')
                        : concern.updateTime?.toDate ? concern.updateTime.toDate().toLocaleDateString('de-DE')
                        : new Date().toLocaleDateString('de-DE')
                      }
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              {isEditing && (
                <div className="flex justify-end gap-3 pt-4 border-t-2 border-gray-300">
                  <Button 
                    variant="outline" 
                    onClick={handleCancel}
                    className="border-2 border-gray-300 hover:bg-gray-100 font-semibold"
                  >
                    ❌ Abbrechen
                  </Button>
                  <Button 
                    onClick={handleSave} 
                    disabled={isSaving}
                    className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105"
                  >
                    {isSaving ? '💾 Speichern...' : '✅ Speichern'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Branding & DATEV Settings */}
          <Card className="tradetrackr-card border-2 border-purple-500 shadow-xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-6 py-4">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                🎨 Branding & DATEV
              </CardTitle>
            </CardHeader>
            <CardContent className="bg-gradient-to-br from-purple-50 to-pink-50 p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-800 flex items-center gap-1">
                    <span className="text-base">🏢</span>
                    Firmenname
                  </Label>
                  <Input 
                    value={brandingEdit.companyName || ''} 
                    onChange={e => setBrandingEdit({ ...brandingEdit, companyName: e.target.value })}
                    className="border-2 border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-800 flex items-center gap-1">
                    <span className="text-base">📧</span>
                    E-Mail
                  </Label>
                  <Input 
                    placeholder="info@firma.de" 
                    value={brandingEdit.email || ''} 
                    onChange={e => setBrandingEdit({ ...brandingEdit, email: e.target.value })}
                    className="border-2 border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                  />
                  {brandingErrors.email && (<p className="text-red-600 text-sm mt-1 font-semibold">⚠️ {brandingErrors.email}</p>)}
                </div>
                <div className="md:col-span-2 space-y-2">
                  <Label className="text-sm font-semibold text-gray-800 flex items-center gap-1">
                    <span className="text-base">📍</span>
                    Adresse
                  </Label>
                  <Input 
                    placeholder="Straße Hausnr., PLZ Ort, Land" 
                    value={brandingEdit.address || ''} 
                    onChange={e => setBrandingEdit({ ...brandingEdit, address: e.target.value })}
                    className="border-2 border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-800 flex items-center gap-1">
                    <span className="text-base">📞</span>
                    Telefon
                  </Label>
                  <Input 
                    placeholder="+49 ..." 
                    value={brandingEdit.phone || ''} 
                    onChange={e => setBrandingEdit({ ...brandingEdit, phone: e.target.value })}
                    className="border-2 border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-800 flex items-center gap-1">
                    <span className="text-base">🖼️</span>
                    Logo URL
                  </Label>
                  <Input 
                    placeholder="https://.../logo.png" 
                    value={brandingEdit.logoUrl || ''} 
                    onChange={e => setBrandingEdit({ ...brandingEdit, logoUrl: e.target.value })}
                    className="border-2 border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                  />
                  {brandingErrors.logoUrl && (<p className="text-red-600 text-sm mt-1 font-semibold">⚠️ {brandingErrors.logoUrl}</p>)}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-800 flex items-center gap-1">
                    <span className="text-base">🌍</span>
                    Standard-Sprache
                  </Label>
                  <Input 
                    placeholder="de oder en" 
                    value={brandingEdit.defaultLocale || ''} 
                    onChange={e => setBrandingEdit({ ...brandingEdit, defaultLocale: (e.target.value as any) })}
                    className="border-2 border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                  />
                  {brandingErrors.locale && (<p className="text-red-600 text-sm mt-1 font-semibold">⚠️ {brandingErrors.locale}</p>)}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-800 flex items-center gap-1">
                    <span className="text-base">💼</span>
                    DATEV Gegenkonto
                  </Label>
                  <Input 
                    placeholder="z. B. 8400" 
                    value={brandingEdit.datevContraAccount || ''} 
                    onChange={e => setBrandingEdit({ ...brandingEdit, datevContraAccount: e.target.value })}
                    className="border-2 border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <Label className="text-sm font-semibold text-gray-800 flex items-center gap-1">
                    <span className="text-base">📊</span>
                    USt-Kontenmapping (JSON)
                  </Label>
                  <Textarea 
                    placeholder={'{\n  "DE19": "8400",\n  "DE7": "8300",\n  "DE0": "8195"\n}'} 
                    value={JSON.stringify(brandingEdit.taxAccountMapping || {}, null, 2)} 
                    onChange={e => {
                      try {
                        const val = JSON.parse(e.target.value || '{}');
                        setBrandingEdit({ ...brandingEdit, taxAccountMapping: val });
                        setBrandingErrors(prev => ({ ...prev, json: undefined }));
                      } catch {
                        setBrandingErrors(prev => ({ ...prev, json: 'Ungültiges JSON' }));
                      }
                    }}
                    className="border-2 border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 font-mono text-sm min-h-[120px]"
                  />
                  {brandingErrors.json && (<p className="text-red-600 text-sm mt-1 font-semibold">⚠️ {brandingErrors.json}</p>)}
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <Button 
                  variant="outline"
                  onClick={loadBranding}
                  disabled={brandingSaving}
                  className="border-2 border-gray-300 hover:bg-gray-100 font-semibold"
                >
                  ❌ Abbrechen
                </Button>
                <Button 
                  onClick={handleBrandingSave} 
                  disabled={brandingSaving}
                  className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105"
                >
                  {brandingSaving ? '💾 Speichern...' : '✅ Speichern'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Information Card */}
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-blue-800">Wichtige Informationen</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-blue-700">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 mt-0.5" />
                  <p className="text-sm">
                    <strong>Zentrale Verwaltung:</strong> Alle Änderungen an den Unternehmensdaten werden automatisch für alle Benutzer des Concerns übernommen.
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <Shield className="h-5 w-5 mt-0.5" />
                  <p className="text-sm">
                    <strong>Administrator-Zugriff:</strong> Nur Benutzer mit Administrator-Rechten können diese Daten bearbeiten.
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <Users className="h-5 w-5 mt-0.5" />
                  <p className="text-sm">
                    <strong>Echtzeit-Updates:</strong> Änderungen werden sofort in der gesamten Anwendung sichtbar.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Action Sidebar - Konsistent mit anderen Seiten */}
      </div>
    </div>
  );
};

export default ConcernManagement;
