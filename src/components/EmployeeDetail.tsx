import React, { useEffect, useState } from 'react';
import AppHeader from '@/components/AppHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { PersonnelService } from '@/services/personnelService';
import { Personnel } from '@/types/personnel';
import { db } from '@/config/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Briefcase, 
  Award, 
  FileText, 
  Clock,
  Building2,
  IdCard,
  CheckCircle,
  XCircle,
  Clock as ClockIcon,
  Download,
  Edit,
  Plus,
  Trash2
} from 'lucide-react';

const TABS = ['Profile','Vacation','Qualifications','Service History','Documents'] as const;

const EmployeeDetail: React.FC<{ empId: string; onBack?: ()=>void; onOpenMessaging?: ()=>void }>= ({ empId, onBack, onOpenMessaging }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const concernID = (user as any)?.concernID || (user as any)?.ConcernID;
  const [service, setService] = useState<PersonnelService | null>(null);
  const [emp, setEmp] = useState<Personnel | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [tab, setTab] = useState<typeof TABS[number]>('Profile');
  const [vacStart, setVacStart] = useState('');
  const [vacEnd, setVacEnd] = useState('');
  const [vacReason, setVacReason] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(()=>{ if (concernID) setService(new PersonnelService(concernID)); }, [concernID]);
  
  const load = async () => {
    if (!service || !empId) return;
    setIsLoading(true);
    try {
      // Lade Daten aus users Collection
      const userDocRef = doc(db, 'users', empId);
      const userDocSnap = await getDoc(userDocRef);
      
      if (userDocSnap.exists()) {
        const data = userDocSnap.data();
        const displayName = `${data.vorname || ''} ${data.nachname || ''}`.trim() || data.displayName || data.email || empId;
        
        setUserData({
          id: userDocSnap.id,
          displayName,
          email: data.email || '',
          phone: data.tel || '',
          vorname: data.vorname || '',
          nachname: data.nachname || '',
          role: data.role || 'employee',
          mitarbeiterID: data.mitarbeiterID || '',
          startDate: data.startDate || data.dateCreated || null,
          isActive: data.isActive !== undefined ? data.isActive : true,
          lastLogin: data.lastLogin || null,
          address: data.address || '',
          privateAddress: data.privateAddress || '',
          privateCity: data.privateCity || '',
          privatePostalCode: data.privatePostalCode || '',
          privateCountry: data.privateCountry || '',
          dateOfBirth: data.dateOfBirth || null,
          ...data
        });
      } else {
        toast({
          title: 'Fehler',
          description: 'Mitarbeiter nicht gefunden.',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }
      
      // Lade zusätzliche Daten aus personnel Collection
      let personnelData: Personnel | null = null;
      try {
        personnelData = await service.get(empId);
      } catch (error) {
        console.log(`Keine Personnel-Daten für ${empId}, erstelle Standard-Eintrag`);
      }
      
      // Kombiniere User-Daten mit Personnel-Daten
      const combinedUserData = {
        id: userDocSnap.id,
        displayName,
        email: data.email || '',
        phone: data.tel || '',
        vorname: data.vorname || '',
        nachname: data.nachname || '',
        role: data.role || 'employee',
        mitarbeiterID: data.mitarbeiterID || '',
        startDate: data.startDate || data.dateCreated || null,
        isActive: data.isActive !== undefined ? data.isActive : true,
        lastLogin: data.lastLogin || null,
        address: data.address || '',
        privateAddress: data.privateAddress || '',
        privateCity: data.privateCity || '',
        privatePostalCode: data.privatePostalCode || '',
        privateCountry: data.privateCountry || '',
        dateOfBirth: data.dateOfBirth || null,
        ...data
      };
      
      setEmp({
        id: empId,
        concernID: concernID,
        displayName: combinedUserData.displayName,
        role: combinedUserData.role,
        department: personnelData?.department,
        currentProjectId: personnelData?.currentProjectId,
        vacationBalance: personnelData?.vacationBalance ?? 0,
        vacationRequests: personnelData?.vacationRequests || [],
        qualifications: personnelData?.qualifications || [],
        serviceHistory: personnelData?.serviceHistory || [],
        createdAt: personnelData?.createdAt || combinedUserData.startDate || new Date(),
        updatedAt: personnelData?.updatedAt || new Date()
      });
      
      setUserData(combinedUserData);
    } catch (error) {
      console.error('Fehler beim Laden der Mitarbeiterdaten:', error);
      toast({
        title: 'Fehler',
        description: 'Mitarbeiterdaten konnten nicht geladen werden.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(()=>{ load(); }, [service, empId]);

  const requestVacation = async () => {
    if (!service || !vacStart || !vacEnd) {
      toast({
        title: 'Fehler',
        description: 'Bitte füllen Sie alle Felder aus.',
        variant: 'destructive',
      });
      return;
    }
    try {
      await service.requestVacation(empId, { 
        start: new Date(vacStart), 
        end: new Date(vacEnd), 
        reason: vacReason 
      });
      setVacStart(''); 
      setVacEnd('');
      setVacReason('');
      await load();
      toast({
        title: 'Erfolg',
        description: 'Urlaubsantrag wurde erfolgreich gestellt.',
      });
    } catch (error: any) {
      toast({
        title: 'Fehler',
        description: error.message || 'Urlaubsantrag konnte nicht gestellt werden.',
        variant: 'destructive',
      });
    }
  };

  const formatDate = (date: any) => {
    if (!date) return '-';
    try {
      return new Date(date).toLocaleDateString('de-DE', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    } catch {
      return '-';
    }
  };

  const formatDateTime = (date: any) => {
    if (!date) return '-';
    try {
      return new Date(date).toLocaleString('de-DE', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '-';
    }
  };

  const getRoleBadgeColor = (role: string) => {
    const normalizedRole = role?.toLowerCase() || '';
    if (normalizedRole === 'admin' || normalizedRole === 'administrator') {
      return 'bg-purple-100 text-purple-800 border-purple-300';
    }
    if (normalizedRole === 'office' || normalizedRole === 'büro') {
      return 'bg-blue-100 text-blue-800 border-blue-300';
    }
    if (normalizedRole === 'foreman' || normalizedRole === 'manager') {
      return 'bg-green-100 text-green-800 border-green-300';
    }
    if (normalizedRole === 'field' || normalizedRole === 'service_technician') {
      return 'bg-orange-100 text-orange-800 border-orange-300';
    }
    return 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const getRoleLabel = (role: string) => {
    const normalizedRole = role?.toLowerCase() || '';
    if (normalizedRole === 'service_technician') return 'Monteur';
    if (normalizedRole === 'manager') return 'Vorarbeiter';
    if (normalizedRole === 'employee') return 'Mitarbeiter';
    if (normalizedRole === 'administrator') return 'Admin';
    return role || 'Unbekannt';
  };

  const getVacationStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'requested':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getVacationStatusLabel = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return 'Genehmigt';
      case 'rejected':
        return 'Abgelehnt';
      case 'requested':
        return 'Angefragt';
      case 'cancelled':
        return 'Storniert';
      default:
        return status || 'Unbekannt';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen tradetrackr-gradient-blue">
        <AppHeader title="Mitarbeiterdetails" showBackButton onBack={onBack} onOpenMessaging={onOpenMessaging} />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="tradetrackr-card">
            <CardContent className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#058bc0] mx-auto mb-4"></div>
              <p className="text-gray-600">Mitarbeiterdaten werden geladen...</p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (!userData && !emp) {
    return (
      <div className="min-h-screen tradetrackr-gradient-blue">
        <AppHeader title="Mitarbeiterdetails" showBackButton onBack={onBack} onOpenMessaging={onOpenMessaging} />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="tradetrackr-card">
            <CardContent className="p-12 text-center">
              <div className="text-4xl mb-4">👤</div>
              <p className="text-gray-600 text-lg">Mitarbeiter nicht gefunden</p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const displayName = userData?.displayName || emp?.displayName || 'Unbekannt';
  const employeeRole = userData?.role || emp?.role || 'employee';

  return (
    <div className="min-h-screen tradetrackr-gradient-blue">
      <AppHeader 
        title={`👤 ${displayName}`} 
        showBackButton 
        onBack={onBack} 
        onOpenMessaging={onOpenMessaging}
      >
        <Button
          variant="outline"
          className="border-2 border-[#058bc0] text-[#058bc0] hover:bg-[#058bc0] hover:text-white"
        >
          <Edit className="h-4 w-4 mr-2" />
          Bearbeiten
        </Button>
      </AppHeader>
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Card with Key Info */}
        <Card className="tradetrackr-card mb-6 shadow-xl border-2 border-[#058bc0] overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-[#058bc0] to-[#0470a0] text-white px-6 pt-6 pb-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center text-4xl">
                  👤
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold text-white mb-2">{displayName}</CardTitle>
                  <div className="flex items-center gap-3 flex-wrap">
                    <Badge className={`${getRoleBadgeColor(employeeRole)} border-2 font-semibold px-3 py-1`}>
                      {getRoleLabel(employeeRole)}
                    </Badge>
                    {userData?.mitarbeiterID && (
                      <Badge variant="outline" className="bg-white/20 text-white border-white/30 px-3 py-1">
                        <IdCard className="h-3 w-3 mr-1 inline" />
                        ID: {userData.mitarbeiterID}
                      </Badge>
                    )}
                    {userData?.isActive !== false ? (
                      <Badge className="bg-green-500 text-white border-0 px-3 py-1">
                        <CheckCircle className="h-3 w-3 mr-1 inline" />
                        Aktiv
                      </Badge>
                    ) : (
                      <Badge className="bg-red-500 text-white border-0 px-3 py-1">
                        <XCircle className="h-3 w-3 mr-1 inline" />
                        Inaktiv
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="bg-gradient-to-br from-blue-50 to-cyan-50 p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {userData?.email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-[#058bc0]" />
                  <div>
                    <div className="text-xs text-gray-600">E-Mail</div>
                    <div className="font-medium text-gray-900">{userData.email}</div>
                  </div>
                </div>
              )}
              {userData?.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-[#058bc0]" />
                  <div>
                    <div className="text-xs text-gray-600">Telefon</div>
                    <div className="font-medium text-gray-900">{userData.phone}</div>
                  </div>
                </div>
              )}
              {userData?.startDate && (
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-[#058bc0]" />
                  <div>
                    <div className="text-xs text-gray-600">Seit</div>
                    <div className="font-medium text-gray-900">{formatDate(userData.startDate)}</div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof TABS[number])} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 bg-white border-2 border-gray-200 rounded-lg p-1">
            {TABS.map((t) => (
              <TabsTrigger 
                key={t} 
                value={t}
                className="data-[state=active]:bg-[#058bc0] data-[state=active]:text-white transition-all"
              >
                {t === 'Profile' && <User className="h-4 w-4 mr-2" />}
                {t === 'Vacation' && <Calendar className="h-4 w-4 mr-2" />}
                {t === 'Qualifications' && <Award className="h-4 w-4 mr-2" />}
                {t === 'Service History' && <Briefcase className="h-4 w-4 mr-2" />}
                {t === 'Documents' && <FileText className="h-4 w-4 mr-2" />}
                {t}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="Profile" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Personal Information */}
              <Card className="tradetrackr-card shadow-lg">
                <CardHeader className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white">
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Persönliche Informationen
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Vorname</div>
                      <div className="font-medium text-gray-900">{userData?.vorname || '-'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Nachname</div>
                      <div className="font-medium text-gray-900">{userData?.nachname || '-'}</div>
                    </div>
                    {userData?.dateOfBirth && (
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Geburtsdatum</div>
                        <div className="font-medium text-gray-900">{formatDate(userData.dateOfBirth)}</div>
                      </div>
                    )}
                    {userData?.mitarbeiterID && (
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Mitarbeiter-ID</div>
                        <div className="font-medium text-gray-900">{userData.mitarbeiterID}</div>
                      </div>
                    )}
                  </div>
                  
                  {(userData?.privateAddress || userData?.privateCity) && (
                    <div className="pt-4 border-t">
                      <div className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        Private Adresse
                      </div>
                      <div className="text-sm text-gray-900">
                        {userData.privateAddress && <div>{userData.privateAddress}</div>}
                        {(userData.privateCity || userData.privatePostalCode) && (
                          <div>
                            {userData.privatePostalCode} {userData.privateCity}
                            {userData.privateCountry && `, ${userData.privateCountry}`}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Employment Information */}
              <Card className="tradetrackr-card shadow-lg">
                <CardHeader className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white">
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5" />
                    Beschäftigungsinformationen
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="space-y-3">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Rolle</div>
                      <Badge className={`${getRoleBadgeColor(employeeRole)} border-2`}>
                        {getRoleLabel(employeeRole)}
                      </Badge>
                    </div>
                    {emp?.department && (
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Abteilung</div>
                        <div className="font-medium text-gray-900">{emp.department}</div>
                      </div>
                    )}
                    {userData?.startDate && (
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Startdatum</div>
                        <div className="font-medium text-gray-900">{formatDate(userData.startDate)}</div>
                      </div>
                    )}
                    {emp?.currentProjectId && (
                      <div>
                        <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          Aktuelles Projekt
                        </div>
                        <div className="font-medium text-gray-900">{emp.currentProjectId}</div>
                      </div>
                    )}
                    <div>
                      <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                        <ClockIcon className="h-3 w-3" />
                        Letzter Login
                      </div>
                      <div className="font-medium text-gray-900">
                        {userData?.lastLogin ? formatDateTime(userData.lastLogin) : 'Nie'}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Vacation Balance */}
              <Card className="tradetrackr-card shadow-lg md:col-span-2">
                <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-500 text-white">
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Urlaubskonto
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-gray-600 mb-1">Verfügbare Urlaubstage</div>
                      <div className={`text-4xl font-bold ${
                        (emp?.vacationBalance ?? 0) > 15 ? 'text-green-600' :
                        (emp?.vacationBalance ?? 0) > 5 ? 'text-amber-600' :
                        'text-red-600'
                      }`}>
                        {emp?.vacationBalance ?? 0}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-600">Tage</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Vacation Tab */}
          <TabsContent value="Vacation" className="space-y-6">
            <Card className="tradetrackr-card shadow-lg">
              <CardHeader className="bg-gradient-to-r from-green-500 to-emerald-500 text-white">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Urlaub beantragen
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Von</label>
                    <Input 
                      type="date" 
                      value={vacStart} 
                      onChange={e=>setVacStart(e.target.value)}
                      className="border-2 border-gray-300 focus:border-[#058bc0]"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Bis</label>
                    <Input 
                      type="date" 
                      value={vacEnd} 
                      onChange={e=>setVacEnd(e.target.value)}
                      className="border-2 border-gray-300 focus:border-[#058bc0]"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="text-sm font-medium text-gray-700 mb-2 block">Grund (optional)</label>
                    <Textarea 
                      value={vacReason} 
                      onChange={e=>setVacReason(e.target.value)}
                      placeholder="Grund für den Urlaub..."
                      rows={3}
                      className="border-2 border-gray-300 focus:border-[#058bc0]"
                    />
                  </div>
                </div>
                <Button 
                  onClick={requestVacation}
                  className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Urlaub beantragen
                </Button>
              </CardContent>
            </Card>

            <Card className="tradetrackr-card shadow-lg">
              <CardHeader className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Urlaubsanträge
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {emp?.vacationRequests && emp.vacationRequests.length > 0 ? (
                  <div className="space-y-3">
                    {emp.vacationRequests.slice().reverse().map(r => (
                      <div 
                        key={r.id} 
                        className="p-4 border-2 border-gray-200 rounded-lg bg-white hover:shadow-md transition-all"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <Calendar className="h-4 w-4 text-gray-500" />
                              <span className="font-medium text-gray-900">
                                {formatDate(r.start)} – {formatDate(r.end)}
                              </span>
                            </div>
                            {r.reason && (
                              <div className="text-sm text-gray-600 ml-7 mb-2">
                                {r.reason}
                              </div>
                            )}
                            <div className="text-xs text-gray-500 ml-7">
                              Gestellt am: {formatDateTime(r.createdAt)}
                            </div>
                          </div>
                          <Badge className={`${getVacationStatusColor(r.status)} border-2`}>
                            {getVacationStatusLabel(r.status)}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p>Keine Urlaubsanträge vorhanden</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Qualifications Tab */}
          <TabsContent value="Qualifications" className="space-y-6">
            <Card className="tradetrackr-card shadow-lg">
              <CardHeader className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white">
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Qualifikationen
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {emp?.qualifications && emp.qualifications.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {emp.qualifications.map((q, i) => (
                      <div 
                        key={i} 
                        className="p-4 border-2 border-gray-200 rounded-lg bg-white hover:shadow-md transition-all"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold text-gray-900">{q.title}</h4>
                          {q.expiryDate && (
                            <Badge className={
                              new Date(q.expiryDate as any) > new Date() 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }>
                              {new Date(q.expiryDate as any) > new Date() ? 'Gültig' : 'Abgelaufen'}
                            </Badge>
                          )}
                        </div>
                        {q.issuer && (
                          <div className="text-sm text-gray-600 mb-1">
                            <strong>Aussteller:</strong> {q.issuer}
                          </div>
                        )}
                        {q.issueDate && (
                          <div className="text-sm text-gray-600 mb-1">
                            <strong>Ausgestellt:</strong> {formatDate(q.issueDate)}
                          </div>
                        )}
                        {q.expiryDate && (
                          <div className="text-sm text-gray-600">
                            <strong>Gültig bis:</strong> {formatDate(q.expiryDate)}
                          </div>
                        )}
                        {q.documentURL && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="mt-2"
                            onClick={() => window.open(q.documentURL, '_blank')}
                          >
                            <Download className="h-3 w-3 mr-1" />
                            Dokument anzeigen
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <Award className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p>Keine Qualifikationen vorhanden</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Service History Tab */}
          <TabsContent value="Service History" className="space-y-6">
            <Card className="tradetrackr-card shadow-lg">
              <CardHeader className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5" />
                  Einsatzhistorie
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {emp?.serviceHistory && emp.serviceHistory.length > 0 ? (
                  <div className="space-y-4">
                    {emp.serviceHistory.map((s, i) => (
                      <div 
                        key={i} 
                        className="p-4 border-l-4 border-[#058bc0] bg-white rounded-r-lg hover:shadow-md transition-all"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900 mb-1">
                              Projekt: {s.projectId}
                            </div>
                            {s.role && (
                              <Badge variant="outline" className="mb-2">
                                {s.role}
                              </Badge>
                            )}
                            <div className="text-sm text-gray-600 flex items-center gap-2">
                              <Clock className="h-3 w-3" />
                              {formatDate(s.from)} – {s.to ? formatDate(s.to) : 'heute'}
                            </div>
                            {s.notes && (
                              <div className="text-sm text-gray-700 mt-2 p-2 bg-gray-50 rounded">
                                {s.notes}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <Briefcase className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p>Keine Einsatzhistorie vorhanden</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="Documents" className="space-y-6">
            <Card className="tradetrackr-card shadow-lg">
              <CardHeader className="bg-gradient-to-r from-gray-500 to-gray-600 text-white">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Dokumente
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="text-center py-12 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="mb-4">Upload und Verwaltung von Qualifikationsnachweisen folgen hier.</p>
                  <Button variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Dokument hochladen
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default EmployeeDetail;
