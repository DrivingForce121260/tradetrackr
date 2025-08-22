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
import { Building, Users, Calendar, MapPin, Phone, Mail, Edit, Save, X, Shield, AlertCircle, ClipboardList, Package, FolderOpen, FileText, CheckSquare, BarChart3, Plus } from 'lucide-react';
import AppHeader from './AppHeader';
import QuickActionButtons from './QuickActionButtons';

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

  // Prüfen, ob der Benutzer Administrator ist
  const isAdmin = hasPermission('admin') || user?.role === 'admin' || user?.rechte >= 10;

  useEffect(() => {
    loadConcernData();
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

      // Concern-Daten neu laden, um sicherzustellen, dass alle ö„nderungen übernommen wurden
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
                  <p>Sie haben keine Berechtigung, auf die Concern-Verwaltung zuzugreifen. Nur Administratoren kö¶nnen Unternehmensdaten bearbeiten.</p>
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
        title="Concern-Verwaltung"
        showBackButton={true}
        onBack={onBack}
        onOpenMessaging={onOpenMessaging}
      />
      
      <div className="p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Page Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Concern-Verwaltung</h1>
              <p className="text-gray-600">Verwalten Sie die zentralen Unternehmensdaten</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                <Shield className="h-3 w-3 mr-1" />
                Administrator
              </Badge>
              {!isEditing && (
                <Button onClick={handleEdit} className="bg-blue-600 hover:bg-blue-700">
                  <Edit className="h-5 w-5 mr-2" />
                  Bearbeiten
                </Button>
              )}
            </div>
          </div>

          {/* Concern Information Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5 text-blue-600" />
                Unternehmensdaten
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="concernName">Unternehmensname *</Label>
                  {isEditing ? (
                    <Input
                      id="concernName"
                      value={editData.concernName || ''}
                      onChange={(e) => handleInputChange('concernName', e.target.value)}
                      placeholder="Unternehmensname eingeben"
                      required
                    />
                  ) : (
                    <p className="text-gray-900 font-medium">{concern.concernName}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="concernEmail">E-Mail-Adresse *</Label>
                  {isEditing ? (
                    <Input
                      id="concernEmail"
                      type="email"
                      value={editData.concernEmail || ''}
                      onChange={(e) => handleInputChange('concernEmail', e.target.value)}
                      placeholder="info@unternehmen.de"
                      required
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <Mail className="h-5 w-5 text-gray-500" />
                      <p className="text-gray-900">{concern.concernEmail}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="concernTel">Telefonnummer</Label>
                  {isEditing ? (
                    <Input
                      id="concernTel"
                      type="tel"
                      value={editData.concernTel || ''}
                      onChange={(e) => handleInputChange('concernTel', e.target.value)}
                      placeholder="+49 123 456789"
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <Phone className="h-5 w-5 text-gray-500" />
                      <p className="text-gray-900">{concern.concernTel || 'Nicht angegeben'}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Mitglieder</Label>
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-gray-500" />
                    <p className="text-gray-900 font-medium">{concern.members}</p>
                    <Badge variant="secondary">Aktive Benutzer</Badge>
                  </div>
                </div>
              </div>

              {/* Address */}
              <div className="space-y-2">
                <Label htmlFor="concernAddress">Unternehmensadresse *</Label>
                {isEditing ? (
                  <Textarea
                    id="concernAddress"
                    value={editData.concernAddress || ''}
                    onChange={(e) => handleInputChange('concernAddress', e.target.value)}
                    placeholder="Vollstö¤ndige Unternehmensadresse eingeben"
                    rows={3}
                    required
                  />
                ) : (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-5 w-5 text-gray-500 mt-1" />
                    <p className="text-gray-900">{concern.concernAddress}</p>
                  </div>
                )}
              </div>

              <Separator />

              {/* Metadata Information */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Concern ID</Label>
                  <p className="text-gray-600 font-mono text-sm">{concern.uid}</p>
                </div>
                <div className="space-y-2">
                  <Label>Erstellt am</Label>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-gray-500" />
                    <p className="text-gray-600">
                      {concern.dateCreated instanceof Date 
                        ? concern.dateCreated.toLocaleDateString('de-DE')
                        : concern.dateCreated?.toDate ? concern.dateCreated.toDate().toLocaleDateString('de-DE')
                        : new Date().toLocaleDateString('de-DE')
                      }
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Letzte Aktualisierung</Label>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-gray-500" />
                    <p className="text-gray-600">
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
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button variant="outline" onClick={handleCancel}>
                    <X className="h-5 w-5 mr-2" />
                    Abbrechen
                  </Button>
                  <Button 
                    onClick={handleSave} 
                    disabled={isSaving}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Save className="h-5 w-5 mr-2" />
                    {isSaving ? 'Speichern...' : 'Speichern'}
                  </Button>
                </div>
              )}
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
                    <strong>Zentrale Verwaltung:</strong> Alle ö„nderungen an den Unternehmensdaten werden automatisch für alle Benutzer des Concerns übernommen.
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <Shield className="h-5 w-5 mt-0.5" />
                  <p className="text-sm">
                    <strong>Administrator-Zugriff:</strong> Nur Benutzer mit Administrator-Rechten kö¶nnen diese Daten bearbeiten.
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <Users className="h-5 w-5 mt-0.5" />
                  <p className="text-sm">
                    <strong>Echtzeit-Updates:</strong> ö„nderungen werden sofort in der gesamten Anwendung sichtbar.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Action Buttons - Konsistent mit anderen Seiten */}
        <QuickActionButtons onNavigate={onNavigate || (() => {})} hasPermission={hasPermission} currentPage="concern-management" />
      </div>
    </div>
  );
};

export default ConcernManagement;
