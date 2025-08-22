import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/contexts/AuthContext';
import { useMessaging } from '@/contexts/MessagingContext';
import { LogOut, ArrowLeft, MessageSquare, User, Mail, Phone, Building, MapPin, Calendar, Shield, Eye, EyeOff, Hash, Key, Clock, Target, TrendingUp, Briefcase } from 'lucide-react';
import { userService, concernService } from '@/services/firestoreService';
import { User as FirestoreUser, Concern } from '@/services/firestoreService';

interface AppHeaderProps {
  showBackButton?: boolean;
  onBack?: () => void;
  title?: string;
  children?: React.ReactNode;
  onOpenMessaging?: () => void;
}

const AppHeader: React.FC<AppHeaderProps> = ({ 
  showBackButton = false, 
  onBack, 
  title,
  children,
  onOpenMessaging
}) => {
  const { user, logout, canUseMessaging } = useAuth();
  const { unreadCount } = useMessaging();
  const [showUserDetails, setShowUserDetails] = useState(false);
  const [showSensitiveData, setShowSensitiveData] = useState(false);
  const [currentUserData, setCurrentUserData] = useState<FirestoreUser | null>(null);
  const [isLoadingUserData, setIsLoadingUserData] = useState(false);
  const [concernData, setConcernData] = useState<Concern | null>(null);
  const [isLoadingConcernData, setIsLoadingConcernData] = useState(false);

  // Aktuelle Benutzerdaten aus Firestore laden
  useEffect(() => {
    const loadCurrentUserData = async () => {
      if (!user?.uid) return;
      
      try {
        setIsLoadingUserData(true);

        
        const firestoreUser = await userService.get(user.uid);
        
        if (firestoreUser) {

          setCurrentUserData(firestoreUser);
        } else {

          setCurrentUserData(null);
        }
      } catch (error) {

        setCurrentUserData(null);
      } finally {
        setIsLoadingUserData(false);
      }
    };

    loadCurrentUserData();
  }, [user?.uid]);

  // Concern-Daten aus Firestore laden
  useEffect(() => {
    const loadConcernData = async () => {
      if (!user?.concernID) return;
      
      try {
        setIsLoadingConcernData(true);

        
        const concern = await concernService.get(user.concernID);
        
        if (concern) {

          setConcernData(concern);
        } else {

          setConcernData(null);
        }
      } catch (error) {

        setConcernData(null);
      } finally {
        setIsLoadingConcernData(false);
      }
    };

    loadConcernData();
  }, [user?.concernID]);

  const handleLogout = () => {
    logout();
    // Automatischer Refresh um das Nachrichtenfenster zu schlieöŸen
    window.location.reload();
  };

  const getRoleDisplayName = (role: string) => {
    const roleNames = {
      admin: 'Administrator',
      manager: 'Manager',
      user: 'Benutzer',
      field_worker: 'AuöŸendienst-Mitarbeiter',
      auftraggeber: 'Auftraggeber',
      employee: 'Mitarbeiter'
    };
    return roleNames[role as keyof typeof roleNames] || role;
  };

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return 'Nicht angegeben';
    try {
      if (date instanceof Date) {
        return date.toLocaleDateString('de-DE');
      }
      return new Date(date).toLocaleDateString('de-DE');
    } catch {
      return String(date);
    }
  };

  const formatDateTime = (date: Date | string | undefined) => {
    if (!date) return 'Nicht angegeben';
    try {
      if (date instanceof Date) {
        return date.toLocaleString('de-DE');
      }
      return new Date(date).toLocaleString('de-DE');
    } catch {
      return String(date);
    }
  };

  const getPermissionLevel = (rechte: number) => {
    if (rechte >= 10) return { level: 'Vollzugriff', color: 'bg-red-100 text-red-800' };
    if (rechte >= 7) return { level: 'Erweiterte Rechte', color: 'bg-orange-100 text-orange-800' };
    if (rechte >= 5) return { level: 'Standardrechte', color: 'bg-blue-100 text-blue-800' };
    if (rechte >= 3) return { level: 'Eingeschrö¤nkte Rechte', color: 'bg-yellow-100 text-yellow-800' };
    return { level: 'Minimale Rechte', color: 'bg-gray-100 text-gray-800' };
  };

  return (
    <>
      <header className="tradetrackr-header sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-3">
            {/* Left side - Logo and navigation */}
            <div className="flex items-center space-x-4">
              {showBackButton && onBack && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onBack}
                  className="mr-2 hover:bg-gray-100"
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Zurück
                </Button>
              )}
              
              <div className="flex items-center space-x-3">
                {/* Optimized Logo */}
                <div className="flex items-center bg-gradient-to-r from-[#058bc0] to-[#0066cc] p-2 rounded-lg shadow-sm">
                  <img 
                    src="/TradeTrackrLogo.jpg" 
                    alt="TradeTrackr Logo" 
                    className="h-12 w-12 object-contain rounded-md bg-white/90 p-1"
                  />
                </div>
                
                {/* Brand name and page title */}
                <div className="flex flex-col">
                  <h1 className="text-xl font-bold text-[#058bc0] leading-tight">
                    TradeTrackr
                  </h1>
                  {title && (
                    <span className="text-sm text-gray-600 leading-tight">
                      {title}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Center content (for search, actions, etc.) */}
            <div className="flex-1 max-w-2xl mx-8">
              {children}
            </div>

            {/* Right side - User info and actions */}
            <div className="flex items-center space-x-4">
              {user && (
                <>
                  {/* Clickable User Info */}
                  <div 
                    className="text-right hidden sm:block cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
                    onClick={() => setShowUserDetails(true)}
                    title="Klicken Sie für Benutzerdetails"
                  >
                    <p className="text-sm font-medium text-gray-900">
                      {currentUserData ? `${currentUserData.vorname} ${currentUserData.nachname}` : `${user.vorname} ${user.nachname}`}
                    </p>
                    <p className="text-xs text-gray-500">
                      {currentUserData ? getRoleDisplayName(currentUserData.role || '') : getRoleDisplayName(user.role || '')}
                    </p>
                    {isLoadingUserData && (
                      <div className="text-xs text-blue-500">Lade...</div>
                    )}
                  </div>
                  
                  {/* Messaging Button */}
                  {onOpenMessaging && canUseMessaging() && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onOpenMessaging}
                      className="bg-cyan-50 border-cyan-200 text-cyan-700 hover:bg-cyan-100 hover:border-cyan-300 relative"
                      title="Messaging ö¶ffnen"
                    >
                      <MessageSquare className="h-4 w-4 mr-1" />
                      <span className="hidden sm:inline">Messaging</span>
                      
                      {/* Unread Messages Badge */}
                      {unreadCount > 0 && (
                        <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                          {unreadCount}
                        </div>
                      )}
                    </Button>
                  )}
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleLogout}
                    className="hover:bg-red-50 hover:text-red-700 hover:border-red-200"
                  >
                    <LogOut className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">Abmelden</span>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* User Details Modal */}
      <Dialog open={showUserDetails} onOpenChange={setShowUserDetails}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-blue-600" />
              Benutzerdetails - {currentUserData ? `${currentUserData.vorname} ${currentUserData.nachname}` : `${user?.vorname} ${user?.nachname}`}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Persö¶nliche Informationen
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Vorname</label>
                  <p className="text-gray-900">{currentUserData?.vorname || user?.vorname || 'Nicht angegeben'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Nachname</label>
                  <p className="text-gray-900">{currentUserData?.nachname || user?.nachname || 'Nicht angegeben'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">E-Mail</label>
                  <p className="text-gray-900 flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {currentUserData?.email || user?.email || 'Nicht angegeben'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Telefon</label>
                  <p className="text-gray-900 flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {currentUserData?.tel || user?.tel || 'Nicht angegeben'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Geburtsdatum</label>
                  <p className="text-gray-900">{formatDate(currentUserData?.dateOfBirth || user?.dateOfBirth)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Startdatum</label>
                  <p className="text-gray-900">{formatDate(currentUserData?.startDate || user?.startDate)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Display Name</label>
                  <p className="text-gray-900">{currentUserData?.displayName || user?.displayName || 'Nicht gesetzt'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Adresse</label>
                  <p className="text-gray-900 flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {currentUserData?.address || user?.address || 'Nicht angegeben'}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Role and Permissions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Rolle & Berechtigungen
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Rolle</label>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-sm">
                        {getRoleDisplayName(currentUserData?.role || user?.role || '')}
                      </Badge>
                      <span className="text-xs text-gray-500">({currentUserData?.role || user?.role || 'unbekannt'})</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Berechtigungsstufe</label>
                    <div className="flex items-center gap-2 mt-1">
                      {(currentUserData?.rechte !== undefined || user?.rechte !== undefined) && (
                        <Badge className={getPermissionLevel(currentUserData?.rechte || user?.rechte || 0).color}>
                          {currentUserData?.rechte || user?.rechte || 0} - {getPermissionLevel(currentUserData?.rechte || user?.rechte || 0).level}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Mitarbeiter-ID</label>
                    <p className="text-gray-900 font-mono text-sm">{currentUserData?.mitarbeiterID || user?.mitarbeiterID || 'Nicht verfügbar'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Pass-PIN</label>
                    <p className="text-gray-900 font-mono text-sm">{currentUserData?.passpin || user?.passpin || 'Nicht gesetzt'}</p>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Konto Status</label>
                  <p className="text-gray-900">
                    {(currentUserData?.isActive !== undefined ? currentUserData.isActive : user?.isActive) ? (
                      <Badge variant="default" className="bg-green-100 text-green-800">Aktiv</Badge>
                    ) : (
                      <Badge variant="destructive">Inaktiv</Badge>
                    )}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Company Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building className="h-4 w-4" />
                  Unternehmensinformationen (aus Concern Collection)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Unternehmensname</label>
                    <p className="text-gray-900">
                      {concernData ? concernData.concernName : (isLoadingConcernData ? 'Lade...' : 'Nicht verfügbar')}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Unternehmens-E-Mail</label>
                    <p className="text-gray-900">
                      {concernData ? concernData.concernEmail : (isLoadingConcernData ? 'Lade...' : 'Nicht verfügbar')}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Unternehmens-Telefon</label>
                    <p className="text-gray-900">
                      {concernData ? concernData.concernTel : (isLoadingConcernData ? 'Lade...' : 'Nicht verfügbar')}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Unternehmens-Adresse</label>
                    <p className="text-gray-900">
                      {concernData ? concernData.concernAddress : (isLoadingConcernData ? 'Lade...' : 'Nicht verfügbar')}
                    </p>
                  </div>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-blue-800 text-sm">
                    Diese Informationen werden zentral in der Concern Collection gespeichert und sind für alle Benutzer verfügbar.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Account Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Kontoinformationen
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Erstellt am</label>
                  <p className="text-gray-900">{formatDateTime(currentUserData?.dateCreated || user?.dateCreated)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Letzte Aktivitö¤t</label>
                  <p className="text-gray-900">{formatDateTime(currentUserData?.lastSync || user?.lastSync)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">E-Mail Status</label>
                  <p className="text-gray-900">
                    <Badge variant="default" className="bg-green-100 text-green-800">Aktiv</Badge>
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Authentifizierung</label>
                  <p className="text-gray-900">
                    <Badge variant="default" className="bg-blue-100 text-blue-800">Firebase Auth</Badge>
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Verification Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  Verifizierungsinformationen
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Verifizierungscode gesendet</label>
                    <p className="text-gray-900">
                      {(currentUserData?.verificationCodeSent !== undefined ? currentUserData.verificationCodeSent : user?.verificationCodeSent) ? (
                        <Badge variant="default" className="bg-green-100 text-green-800">Ja</Badge>
                      ) : (
                        <Badge variant="secondary">Nein</Badge>
                      )}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Verifizierungscode</label>
                    <p className="text-gray-900 font-mono text-sm">{currentUserData?.verificationCode || user?.verificationCode || 'Nicht gesetzt'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Code gesendet am</label>
                    <p className="text-gray-900">{currentUserData?.verificationCodeSentAt || user?.verificationCodeSentAt || 'Nicht gesendet'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Code gültig bis</label>
                    <p className="text-gray-900">{currentUserData?.verificationCodeDate ? formatDate(currentUserData.verificationCodeDate) : (user?.verificationCodeDate ? formatDate(user.verificationCodeDate) : 'Nicht gesetzt')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end pt-4 border-t">
            <Button onClick={() => setShowUserDetails(false)}>
              SchlieöŸen
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AppHeader;
