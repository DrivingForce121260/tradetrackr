import React, { useEffect, useMemo, useState } from 'react';
import AppHeader from '@/components/AppHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { PersonnelService } from '@/services/personnelService';
import { Personnel } from '@/types/personnel';
import { db } from '@/config/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { Mail, Download, Users, FileText } from 'lucide-react';

const PersonnelOverview: React.FC<{ onBack?: () => void; onNavigate?: (p: string)=>void; onOpenMessaging?: () => void }>= ({ onBack, onNavigate, onOpenMessaging }) => {
  const { user, hasPermission } = useAuth();
  const { toast } = useToast();
  const concernID = (user as any)?.concernID || (user as any)?.ConcernID;
  const [service, setService] = useState<PersonnelService | null>(null);
  const [list, setList] = useState<Personnel[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [q, setQ] = useState('');
  const [role, setRole] = useState('all');
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(()=>{ if (concernID) setService(new PersonnelService(concernID)); }, [concernID]);

  // Lade alle Benutzer aus der users Collection und konvertiere zu Personnel
  useEffect(() => {
    const loadAllUsers = async () => {
      if (!concernID) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        const q1 = query(collection(db, 'users'), where('ConcernID', '==', concernID));
        const q2 = query(collection(db, 'users'), where('concernID', '==', concernID));
        
        const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
        
        const usersList: any[] = [];
        const processedIds = new Set<string>();
        
        [...snap1.docs, ...snap2.docs].forEach(d => {
          if (processedIds.has(d.id)) return;
          processedIds.add(d.id);
          
          const data: any = d.data();
          const displayName = `${data.vorname || ''} ${data.nachname || ''}`.trim() || data.displayName || data.email || d.id;
          
          usersList.push({
            id: d.id,
            displayName,
            role: data.role || 'employee',
            email: data.email || '',
            ...data
          });
        });
        
        setAllUsers(usersList);
        
        // Konvertiere users zu Personnel-Format und lade zusätzliche Daten aus personnel Collection
        const personnelList: Personnel[] = await Promise.all(usersList.map(async (u) => {
          // Versuche zusätzliche Daten aus personnel Collection zu laden
          let personnelData: Personnel | null = null;
          if (service) {
            try {
              personnelData = await service.get(u.id);
            } catch (error) {
              // Wenn kein Eintrag in personnel existiert, erstelle einen neuen
              console.log(`Keine Personnel-Daten für ${u.id}, verwende User-Daten`);
            }
          }
          
          return {
            id: u.id,
            concernID: concernID,
            displayName: u.displayName,
            role: u.role || 'employee',
            department: personnelData?.department || u.department,
            currentProjectId: personnelData?.currentProjectId,
            vacationBalance: personnelData?.vacationBalance || 0,
            vacationRequests: personnelData?.vacationRequests || [],
            qualifications: personnelData?.qualifications || [],
            serviceHistory: personnelData?.serviceHistory || [],
            createdAt: personnelData?.createdAt || u.dateCreated || new Date(),
            updatedAt: personnelData?.updatedAt || new Date()
          } as Personnel;
        }));
        
        setList(personnelList);
      } catch (error) {
        console.error('Fehler beim Laden der Benutzer:', error);
        setAllUsers([]);
        setList([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadAllUsers();
  }, [concernID, service]);

  const filtered = useMemo(()=>{
    const s = q.toLowerCase();
    return list.filter(e => {
      // Such-Filter
      const matchesSearch = !s || 
        e.displayName?.toLowerCase().includes(s) || 
        e.role?.toLowerCase().includes(s) ||
        e.email?.toLowerCase().includes(s);
      // Rollen-Filter (mit Normalisierung)
      const normalizeRole = (r: string) => {
        if (r === 'service_technician' || r === 'field') return 'field';
        if (r === 'manager' || r === 'foreman') return 'foreman';
        if (r === 'office' || r === 'büro') return 'office';
        if (r === 'admin' || r === 'administrator') return 'admin';
        return r;
      };
      const matchesRole = role === 'all' || 
        e.role === role || 
        normalizeRole(e.role || '') === role ||
        (role === 'foreman' && (e.role === 'manager' || e.role === 'foreman')) ||
        (role === 'field' && (e.role === 'service_technician' || e.role === 'field'));
      // Mitarbeiter-Filter (wenn Mitarbeiter ausgewählt, nur diese anzeigen)
      const matchesEmployee = selectedEmployees.length === 0 || selectedEmployees.includes(e.id);
      return matchesSearch && matchesRole && matchesEmployee;
    });
  }, [list, q, role, selectedEmployees]);

  const exportCSV = () => {
    const rows = [['Name','Rolle','Projekt','Urlaubskonto','Nächste Abwesenheit']].concat(
      filtered.map(e => [e.displayName||'', e.role||'', e.currentProjectId||'', String(e.vacationBalance||0), '-'])
    );
    const csv = rows.map(r=>r.map(x=>`"${String(x).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'personnel.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const stats = useMemo(() => {
    // Verwende alle Mitarbeiter für Statistiken, nicht nur gefilterte
    const total = list.length;
    const byRole = list.reduce((acc, p) => {
      const r = p.role || 'employee';
      // Normalisiere Rollen-Namen
      const normalizedRole = r === 'service_technician' || r === 'field' ? 'field' :
                            r === 'manager' || r === 'foreman' ? 'foreman' :
                            r === 'office' || r === 'büro' ? 'office' :
                            r === 'admin' || r === 'administrator' ? 'admin' :
                            r === 'employee' || r === 'mitarbeiter' ? 'employee' : r;
      acc[normalizedRole] = (acc[normalizedRole] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const avgVacation = total > 0 ? list.reduce((sum, p) => sum + (p.vacationBalance || 0), 0) / total : 0;
    return { total, byRole, avgVacation };
  }, [list]);

  return (
    <div className="min-h-screen tradetrackr-gradient-blue">
      <AppHeader title="👥 Personalübersicht" showBackButton onBack={onBack} onOpenMessaging={onOpenMessaging}>
        <Button 
          onClick={exportCSV}
          className="bg-gradient-to-r from-[#058bc0] to-[#0470a0] hover:from-[#0470a0] hover:to-[#035c80] text-white font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105"
        >
          📥 CSV Export
        </Button>
      </AppHeader>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="tradetrackr-card bg-gradient-to-br from-[#058bc0] to-[#0470a0] text-white shadow-lg hover:shadow-2xl transition-all hover:scale-105">
            <CardHeader className="pb-1 pt-3">
              <CardTitle className="text-sm font-medium text-white/90">👥 Gesamt</CardTitle>
            </CardHeader>
            <CardContent className="pb-3">
              <div className="text-2xl font-bold text-white">{stats.total}</div>
              <p className="text-xs text-white/80">Mitarbeiter</p>
            </CardContent>
          </Card>
          <Card className="tradetrackr-card bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg hover:shadow-2xl transition-all hover:scale-105">
            <CardHeader className="pb-1 pt-3">
              <CardTitle className="text-sm font-medium text-white/90">👔 Admin</CardTitle>
            </CardHeader>
            <CardContent className="pb-3">
              <div className="text-2xl font-bold text-white">{stats.byRole.admin || 0}</div>
              <p className="text-xs text-white/80">Administratoren</p>
            </CardContent>
          </Card>
          <Card className="tradetrackr-card bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg hover:shadow-2xl transition-all hover:scale-105">
            <CardHeader className="pb-1 pt-3">
              <CardTitle className="text-sm font-medium text-white/90">💼 Office</CardTitle>
            </CardHeader>
            <CardContent className="pb-3">
              <div className="text-2xl font-bold text-white">{stats.byRole.office || 0}</div>
              <p className="text-xs text-white/80">Büro</p>
            </CardContent>
          </Card>
          <Card className="tradetrackr-card bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg hover:shadow-2xl transition-all hover:scale-105">
            <CardHeader className="pb-1 pt-3">
              <CardTitle className="text-sm font-medium text-white/90">⛑️ Vorarbeiter</CardTitle>
            </CardHeader>
            <CardContent className="pb-3">
              <div className="text-2xl font-bold text-white">{stats.byRole.foreman || stats.byRole.manager || 0}</div>
              <p className="text-xs text-white/80">Vorarbeiter</p>
            </CardContent>
          </Card>
        </div>
        
        {/* Loading State */}
        {isLoading && (
          <Card className="tradetrackr-card mb-6">
            <CardContent className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#058bc0] mx-auto mb-4"></div>
              <p className="text-gray-600">Mitarbeiter werden geladen...</p>
            </CardContent>
          </Card>
        )}

        {/* Filter & Search Card */}
        <Card className="tradetrackr-card mb-6 border-2 border-[#058bc0] shadow-xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-[#058bc0] to-[#0470a0] text-white px-6 pt-4 pb-4">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <span className="text-2xl">🔍</span>
              Filter & Suche
            </CardTitle>
          </CardHeader>
          <CardContent className="bg-gradient-to-br from-blue-50 to-cyan-50 p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">🔎</div>
                <Input 
                  placeholder="Mitarbeiter suchen..." 
                  value={q} 
                  onChange={e=>setQ(e.target.value)} 
                  className="pl-10 border-2 border-gray-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/20 shadow-sm"
                />
              </div>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg z-10 pointer-events-none">👤</div>
                <Select value={role} onValueChange={(v:any)=>setRole(v)}>
                  <SelectTrigger className="pl-10 border-2 border-gray-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/20 shadow-sm bg-white">
                    <SelectValue placeholder="Rolle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">🎯 Alle Rollen</SelectItem>
                    <SelectItem value="admin">👔 Admin</SelectItem>
                    <SelectItem value="office">💼 Office</SelectItem>
                    <SelectItem value="foreman">⛑️ Vorarbeiter</SelectItem>
                    <SelectItem value="manager">⛑️ Manager</SelectItem>
                    <SelectItem value="field">🔧 Monteur</SelectItem>
                    <SelectItem value="service_technician">🔧 Service-Techniker</SelectItem>
                    <SelectItem value="employee">👷 Mitarbeiter</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-3">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-2">
                  👥 Mitarbeiter (Mehrfachauswahl möglich)
                </label>
                <div className="border-2 border-gray-300 rounded-lg p-3 bg-white max-h-48 overflow-y-auto">
                  {allUsers.length === 0 ? (
                    <div className="text-sm text-gray-500 text-center py-4">Keine Mitarbeiter verfügbar</div>
                  ) : (
                    <div className="space-y-2">
                      {allUsers.map((emp: any) => {
                        const isSelected = selectedEmployees.includes(emp.id);
                        
                        return (
                          <div
                            key={emp.id}
                            onClick={() => {
                              if (isSelected) {
                                setSelectedEmployees(prev => prev.filter(id => id !== emp.id));
                              } else {
                                setSelectedEmployees(prev => [...prev, emp.id]);
                              }
                            }}
                            className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-all ${
                              isSelected 
                                ? 'bg-blue-100 border-2 border-[#058bc0]' 
                                : 'bg-gray-50 border-2 border-transparent hover:bg-blue-50 hover:border-blue-200'
                            }`}
                          >
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                              isSelected 
                                ? 'bg-[#058bc0] border-[#058bc0]' 
                                : 'bg-white border-gray-300'
                            }`}>
                              {isSelected && <span className="text-white text-xs">✓</span>}
                            </div>
                            <span className="flex-1 text-sm font-medium text-gray-700">
                              {emp.displayName || emp.id}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                {selectedEmployees.length > 0 && (
                  <div className="mt-4 space-y-3">
                    <div className="flex flex-wrap gap-2 items-center">
                      <span className="text-sm font-semibold text-gray-700">
                        {selectedEmployees.length} {selectedEmployees.length === 1 ? 'Mitarbeiter' : 'Mitarbeiter'} ausgewählt:
                      </span>
                      {selectedEmployees.map(empId => {
                        const emp = allUsers.find(e => e.id === empId);
                        return (
                          <span key={empId} className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                            {emp?.displayName || empId}
                            <button
                              onClick={() => setSelectedEmployees(prev => prev.filter(id => id !== empId))}
                              className="ml-1 text-blue-500 hover:text-blue-700 font-bold"
                            >
                              ×
                            </button>
                          </span>
                        );
                      })}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedEmployees([])}
                        className="border-2 border-gray-300 hover:border-red-500 hover:bg-red-50"
                      >
                        ❌ Auswahl aufheben
                      </Button>
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => {
                          const selectedData = filtered.filter(e => selectedEmployees.includes(e.id));
                          const rows = [['Name','Rolle','E-Mail','Projekt','Urlaubskonto']].concat(
                            selectedData.map(e => [
                              e.displayName||'', 
                              e.role||'', 
                              allUsers.find(u => u.id === e.id)?.email || '',
                              e.currentProjectId||'', 
                              String(e.vacationBalance||0)
                            ])
                          );
                          const csv = rows.map(r=>r.map(x=>`"${String(x).replace(/"/g,'""')}"`).join(',')).join('\n');
                          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url; 
                          a.download = `personnel_selected_${selectedEmployees.length}.csv`; 
                          a.click();
                          URL.revokeObjectURL(url);
                          toast({
                            title: 'Export erfolgreich',
                            description: `${selectedEmployees.length} Mitarbeiter wurden exportiert.`,
                          });
                        }}
                        className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Ausgewählte exportieren
                      </Button>
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => {
                          const selectedEmails = selectedEmployees
                            .map(id => allUsers.find(u => u.id === id)?.email)
                            .filter(Boolean);
                          if (selectedEmails.length === 0) {
                            toast({
                              title: 'Keine E-Mails',
                              description: 'Keine E-Mail-Adressen für die ausgewählten Mitarbeiter gefunden.',
                              variant: 'destructive',
                            });
                            return;
                          }
                          const mailtoLink = `mailto:?bcc=${selectedEmails.join(',')}`;
                          window.location.href = mailtoLink;
                          toast({
                            title: 'E-Mail vorbereitet',
                            description: `E-Mail-Client wird mit ${selectedEmails.length} Empfängern geöffnet.`,
                          });
                        }}
                        className="bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white"
                      >
                        <Mail className="h-4 w-4 mr-2" />
                        E-Mail an Ausgewählte
                      </Button>
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => {
                          if (onNavigate) {
                            // Navigiere zu den Details des ersten ausgewählten Mitarbeiters
                            onNavigate(`employee:${selectedEmployees[0]}`);
                          }
                        }}
                        disabled={selectedEmployees.length !== 1}
                        className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white disabled:opacity-50"
                      >
                        <Users className="h-4 w-4 mr-2" />
                        Details anzeigen
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Personnel Table Card */}
        <Card className="tradetrackr-card shadow-xl border-2 border-gray-300 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white px-6 pt-4 pb-4">
            <CardTitle className="text-lg font-bold flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl">📋</span>
                Mitarbeiterliste
              </div>
              <div className="px-4 py-1 rounded-full text-sm font-semibold bg-white/20">
                {filtered.length} {filtered.length === 1 ? 'Mitarbeiter' : 'Mitarbeiter'}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-100 border-b-2 border-gray-200">
                  <tr className="text-left text-gray-700 font-semibold">
                    <th className="py-3 px-4">👤 Name</th>
                    <th className="py-3 px-4">🏷️ Rolle</th>
                    <th className="py-3 px-4">📁 Aktuelles Projekt</th>
                    <th className="py-3 px-4">🏖️ Urlaubskonto</th>
                    <th className="py-3 px-4">⚙️ Aktionen</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((e, idx) => (
                    <tr 
                      key={e.id} 
                      className={`border-t hover:bg-blue-50 cursor-pointer transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                      onClick={()=>onNavigate && onNavigate(`employee:${e.id}`)}
                    >
                      <td className="py-3 px-4 font-medium text-gray-900">{e.displayName}</td>
                      <td className="py-3 px-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          e.role === 'admin' || e.role === 'administrator' ? 'bg-purple-100 text-purple-800' :
                          e.role === 'office' || e.role === 'büro' ? 'bg-blue-100 text-blue-800' :
                          e.role === 'foreman' || e.role === 'manager' ? 'bg-green-100 text-green-800' :
                          e.role === 'field' || e.role === 'service_technician' ? 'bg-orange-100 text-orange-800' :
                          e.role === 'employee' || e.role === 'mitarbeiter' ? 'bg-gray-100 text-gray-800' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {e.role === 'service_technician' ? 'Monteur' :
                           e.role === 'manager' ? 'Vorarbeiter' :
                           e.role === 'employee' ? 'Mitarbeiter' :
                           e.role === 'administrator' ? 'Admin' :
                           e.role || '-'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-700">{e.currentProjectId || '-'}</td>
                      <td className="py-3 px-4">
                        <span className={`font-semibold ${
                          (e.vacationBalance ?? 0) > 15 ? 'text-green-600' :
                          (e.vacationBalance ?? 0) > 5 ? 'text-amber-600' :
                          'text-red-600'
                        }`}>
                          {e.vacationBalance ?? 0} Tage
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="border-2 border-gray-300 hover:border-[#058bc0] hover:bg-blue-50 transition-all"
                          onClick={(evt) => { evt.stopPropagation(); onNavigate && onNavigate(`employee:${e.id}`); }}
                        >
                          👁️ Details
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-gray-400">
                        <div className="text-4xl mb-2">👥</div>
                        <div className="text-sm">Keine Mitarbeiter gefunden</div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Quick Action Sidebar */}
    </div>
  );
};

export default PersonnelOverview;


