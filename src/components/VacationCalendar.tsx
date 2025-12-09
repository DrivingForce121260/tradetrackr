import React, { useEffect, useMemo, useState, useCallback } from 'react';
import AppHeader from '@/components/AppHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { PersonnelService } from '@/services/personnelService';
import { Personnel } from '@/types/personnel';
import { getAllLeaveRequests, Leave } from '@/services/timeAdminService';
import AutoCompleteInput from './AutoCompleteInput';
import { useAutocomplete } from '@/hooks/useAutocomplete';
import { 
  Calendar, 
  Search, 
  X, 
  User, 
  Plane, 
  Heart, 
  AlertCircle, 
  Clock,
  ChevronLeft,
  ChevronRight,
  Filter
} from 'lucide-react';
import { cn } from '@/lib/utils';

type ViewMode = 'month' | '3months' | '6months' | 'year';

interface LeaveDay {
  date: Date;
  leave: Leave | null;
  vacationRequest: Personnel['vacationRequests'][0] | null;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getDaysInRange(startDate: Date, endDate: Date): Date[] {
  const days: Date[] = [];
  const current = new Date(startDate);
  while (current <= endDate) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return days;
}

function getMonthsInRange(startDate: Date, count: number): Date[] {
  const months: Date[] = [];
  const current = new Date(startDate);
  for (let i = 0; i < count; i++) {
    months.push(new Date(current));
    current.setMonth(current.getMonth() + 1);
  }
  return months;
}

// Calculate German public holidays for a given year
function getGermanHolidays(year: number): Date[] {
  const holidays: Date[] = [];
  
  // Fixed holidays
  holidays.push(new Date(year, 0, 1));   // Neujahr
  holidays.push(new Date(year, 4, 1));   // Tag der Arbeit
  holidays.push(new Date(year, 9, 3));   // Tag der Deutschen Einheit
  holidays.push(new Date(year, 11, 25)); // 1. Weihnachtstag
  holidays.push(new Date(year, 11, 26)); // 2. Weihnachtstag
  
  // Calculate Easter Sunday (Gauss algorithm)
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  const easter = new Date(year, month, day);
  
  // Variable holidays based on Easter
  const karfreitag = new Date(easter);
  karfreitag.setDate(easter.getDate() - 2);
  holidays.push(karfreitag); // Karfreitag
  
  const ostermontag = new Date(easter);
  ostermontag.setDate(easter.getDate() + 1);
  holidays.push(ostermontag); // Ostermontag
  
  const christiHimmelfahrt = new Date(easter);
  christiHimmelfahrt.setDate(easter.getDate() + 39);
  holidays.push(christiHimmelfahrt); // Christi Himmelfahrt
  
  const pfingstmontag = new Date(easter);
  pfingstmontag.setDate(easter.getDate() + 50);
  holidays.push(pfingstmontag); // Pfingstmontag
  
  return holidays;
}

// Check if a date is a public holiday
function isPublicHoliday(date: Date, holidays: Date[]): boolean {
  const dateYear = date.getFullYear();
  const dateMonth = date.getMonth();
  const dateDay = date.getDate();
  
  return holidays.some(h => {
    const hYear = h.getFullYear();
    const hMonth = h.getMonth();
    const hDay = h.getDate();
    return hYear === dateYear && hMonth === dateMonth && hDay === dateDay;
  });
}

// Check if a date is a weekend
function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6; // Sunday or Saturday
}

const VacationCalendar: React.FC<{ onBack?: () => void; onOpenMessaging?: () => void }> = ({ 
  onBack, 
  onOpenMessaging 
}) => {
  const { user } = useAuth();
  const concernID = (user as any)?.concernID || (user as any)?.ConcernID;
  const [service, setService] = useState<PersonnelService | null>(null);
  const [personnelList, setPersonnelList] = useState<Personnel[]>([]);
  const [leaveList, setLeaveList] = useState<Leave[]>([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (concernID) {
      setService(new PersonnelService(concernID));
    }
  }, [concernID]);

  const loadData = useCallback(async () => {
    if (!service || !concernID) return;
    setIsLoading(true);
    try {
      const [personnel, leave] = await Promise.all([
        service.list({ role: roleFilter === 'all' ? undefined : roleFilter }),
        getAllLeaveRequests(concernID)
      ]);
      setPersonnelList(personnel);
      setLeaveList(leave);
    } catch (error) {
      console.error('Fehler beim Laden der Daten:', error);
    } finally {
      setIsLoading(false);
    }
  }, [service, concernID, roleFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter employees based on search and selection
  const filteredEmployees = useMemo(() => {
    let filtered = personnelList;

    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(emp => 
        emp.displayName?.toLowerCase().includes(term) ||
        emp.role?.toLowerCase().includes(term) ||
        emp.department?.toLowerCase().includes(term)
      );
    }

    // Filter by selected employees
    if (selectedEmployeeIds.length > 0) {
      filtered = filtered.filter(emp => selectedEmployeeIds.includes(emp.id));
    }

    return filtered;
  }, [personnelList, searchTerm, selectedEmployeeIds]);

  // Autocomplete for employee search
  const employeeAutocomplete = useAutocomplete({
    data: personnelList,
    getLabel: (emp) => emp.displayName || '',
    getValue: (emp) => emp.id,
    getDescription: (emp) => `${emp.role || 'Keine Rolle'}${emp.department ? ` • ${emp.department}` : ''}`,
    getIcon: () => <User className="h-4 w-4" />,
  });

  // Get leave data for a specific date and employee
  const getLeaveForDate = useCallback((employeeId: string, date: Date): LeaveDay => {
    const employee = personnelList.find(e => e.id === employeeId);
    if (!employee) {
      return { date, leave: null, vacationRequest: null };
    }

    // Check Leave collection (from timeAdminService)
    // Note: Leave.uid might be Firebase Auth uid, not Personnel.id
    // We try both employeeId and any potential uid mapping
    const leave = leaveList.find(l => {
      const start = l.startDate?.toDate ? l.startDate.toDate() : new Date(l.startDate);
      const end = l.endDate?.toDate ? l.endDate.toDate() : new Date(l.endDate);
      // Try matching by uid (could be Firebase Auth uid or Personnel id)
      return (l.uid === employeeId || l.uid === (employee as any).uid) && 
             start <= date && end >= date;
    });

    // Check VacationRequests (from Personnel)
    const vacationRequest = employee?.vacationRequests?.find(r => {
      const start = r.start instanceof Date ? r.start : new Date(r.start);
      const end = r.end instanceof Date ? r.end : new Date(r.end);
      return start <= date && end >= date;
    }) || null;

    return {
      date,
      leave: leave || null,
      vacationRequest: vacationRequest || null,
    };
  }, [leaveList, personnelList]);

  // Get color for leave type - Increased contrast
  const getLeaveColor = (leaveDay: LeaveDay): string => {
    if (leaveDay.leave) {
      switch (leaveDay.leave.type) {
        case 'vacation':
          return leaveDay.leave.status === 'approved' 
            ? 'bg-green-600' 
            : leaveDay.leave.status === 'requested'
            ? 'bg-amber-500'
            : leaveDay.leave.status === 'rejected'
            ? 'bg-red-400'
            : 'bg-gray-400';
        case 'sick':
          return 'bg-red-600';
        case 'unpaid':
          return 'bg-orange-500';
        case 'other':
          return 'bg-purple-500';
        default:
          return '';
      }
    }
    if (leaveDay.vacationRequest) {
      switch (leaveDay.vacationRequest.status) {
        case 'approved':
          return 'bg-green-600';
        case 'requested':
          return 'bg-amber-500';
        case 'rejected':
          return 'bg-red-400';
        case 'cancelled':
          return 'bg-gray-400';
        default:
          return '';
      }
    }
    return '';
  };

  // Get icon for leave type
  const getLeaveIcon = (leaveDay: LeaveDay) => {
    if (leaveDay.leave) {
      switch (leaveDay.leave.type) {
        case 'vacation':
          return <Plane className="h-3 w-3" />;
        case 'sick':
          return <Heart className="h-3 w-3" />;
        case 'unpaid':
          return <AlertCircle className="h-3 w-3" />;
        case 'other':
          return <Clock className="h-3 w-3" />;
      }
    }
    if (leaveDay.vacationRequest) {
      return <Plane className="h-3 w-3" />;
    }
    return null;
  };

  // Get tooltip text for leave
  const getLeaveTooltip = (leaveDay: LeaveDay, employee: Personnel): string => {
    if (leaveDay.leave) {
      const typeMap: Record<string, string> = {
        vacation: 'Urlaub',
        sick: 'Krank',
        unpaid: 'Unbezahlt',
        other: 'Sonstiges',
      };
      return `${typeMap[leaveDay.leave.type] || leaveDay.leave.type} - ${leaveDay.leave.status}`;
    }
    if (leaveDay.vacationRequest) {
      return `Urlaub - ${leaveDay.vacationRequest.status}`;
    }
    return '';
  };

  // Calculate public holidays for the current year range
  const publicHolidays = useMemo(() => {
    const years = new Set<number>();
    const startDate = new Date(year, month, 1);
    let endDate: Date;
    
    switch (viewMode) {
      case 'month':
        endDate = new Date(year, month + 1, 0);
        break;
      case '3months':
        endDate = new Date(year, month + 3, 0);
        break;
      case '6months':
        endDate = new Date(year, month + 6, 0);
        break;
      case 'year':
        endDate = new Date(year, month + 12, 0);
        break;
      default:
        endDate = new Date(year, month + 1, 0);
    }
    
    // Collect all years in the range
    const current = new Date(startDate);
    while (current <= endDate) {
      years.add(current.getFullYear());
      current.setFullYear(current.getFullYear() + 1);
    }
    
    // Get holidays for all years in range
    const allHolidays: Date[] = [];
    years.forEach(y => {
      allHolidays.push(...getGermanHolidays(y));
    });
    
    return allHolidays;
  }, [year, month, viewMode]);

  // Calculate date range based on view mode
  const getDateRange = useMemo(() => {
    const startDate = new Date(year, month, 1);
    
    switch (viewMode) {
      case 'month': {
        const endDate = new Date(year, month + 1, 0);
        return getDaysInRange(startDate, endDate);
      }
      case '3months': {
        const endDate = new Date(year, month + 3, 0);
        return getDaysInRange(startDate, endDate);
      }
      case '6months': {
        const endDate = new Date(year, month + 6, 0);
        return getDaysInRange(startDate, endDate);
      }
      case 'year': {
        const endDate = new Date(year, month + 12, 0);
        return getDaysInRange(startDate, endDate);
      }
      default:
        return [];
    }
  }, [year, month, viewMode]);

  // Navigate months
  const navigateMonth = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      if (month === 0) {
        setMonth(11);
        setYear(year - 1);
      } else {
        setMonth(month - 1);
      }
    } else {
      if (month === 11) {
        setMonth(0);
        setYear(year + 1);
      } else {
        setMonth(month + 1);
      }
    }
  };

  // Handle employee selection from autocomplete
  const handleEmployeeSelect = (employeeId: string) => {
    setSelectedEmployeeIds(prev => 
      prev.includes(employeeId) 
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
    setSearchTerm('');
  };

  // Clear employee selection
  const clearSelection = () => {
    setSelectedEmployeeIds([]);
    setSearchTerm('');
  };

  return (
    <div className="min-h-screen tradetrackr-gradient-blue">
      <AppHeader 
        title="Urlaubskalender" 
        showBackButton 
        onBack={onBack} 
        onOpenMessaging={onOpenMessaging} 
      />
      <main className="max-w-[95vw] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Controls */}
        <Card className="mb-6 shadow-lg border-2">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Kalender-Einstellungen
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              {/* Year Selector */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Jahr</label>
                <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Jahr" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 5 }, (_, i) => year - 2 + i).map(y => (
                      <SelectItem key={y} value={String(y)}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Month Selector */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Monat</label>
                <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Monat" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, m) => (
                      <SelectItem key={m} value={String(m)}>
                        {new Date(2000, m, 1).toLocaleString('de-DE', { month: 'long' })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* View Mode */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Ansicht</label>
                <Select value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Ansicht" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="month">1 Monat</SelectItem>
                    <SelectItem value="3months">3 Monate</SelectItem>
                    <SelectItem value="6months">6 Monate</SelectItem>
                    <SelectItem value="year">1 Jahr</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Role Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Rolle</label>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Rolle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="office">Office</SelectItem>
                    <SelectItem value="foreman">Vorarbeiter</SelectItem>
                    <SelectItem value="field">Monteur</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Employee Search */}
            <div className="space-y-2 mb-4">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Search className="h-4 w-4" />
                Mitarbeiter suchen
              </label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <AutoCompleteInput
                    value={searchTerm}
                    onChange={setSearchTerm}
                    onSelect={(employeeId) => handleEmployeeSelect(employeeId)}
                    options={employeeAutocomplete.options}
                    filterFn={employeeAutocomplete.filterFn}
                    placeholder="Mitarbeiter suchen..."
                    getLabel={employeeAutocomplete.getLabel}
                    getDescription={employeeAutocomplete.getDescription}
                    getIcon={employeeAutocomplete.getIcon}
                  />
                </div>
                {selectedEmployeeIds.length > 0 && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={clearSelection}
                    aria-label="Auswahl löschen"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {selectedEmployeeIds.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedEmployeeIds.map(id => {
                    const emp = personnelList.find(e => e.id === id);
                    return emp ? (
                      <Badge key={id} variant="secondary" className="flex items-center gap-1">
                        {emp.displayName}
                        <button
                          onClick={() => setSelectedEmployeeIds(prev => prev.filter(eid => eid !== id))}
                          className="ml-1 hover:text-red-600"
                          aria-label={`${emp.displayName} entfernen`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ) : null;
                  })}
                </div>
              )}
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => navigateMonth('prev')}
                className="flex items-center gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Vorheriger Monat
              </Button>
              <div className="text-sm font-medium text-gray-700">
                {new Date(year, month, 1).toLocaleString('de-DE', { month: 'long', year: 'numeric' })}
              </div>
              <Button
                variant="outline"
                onClick={() => navigateMonth('next')}
                className="flex items-center gap-2"
              >
                Nächster Monat
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Calendar */}
        {isLoading ? (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Lade Kalender...</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-lg border-2">
            <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg">
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  {viewMode === 'month' && 'Monatliche Übersicht'}
                  {viewMode === '3months' && '3-Monats-Übersicht'}
                  {viewMode === '6months' && '6-Monats-Übersicht'}
                  {viewMode === 'year' && 'Jahresübersicht'}
                </span>
                <div className="flex items-center gap-4 text-sm flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-600 rounded border border-green-700"></div>
                    <span className="font-medium">Urlaub (genehmigt)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-amber-500 rounded border border-amber-600"></div>
                    <span className="font-medium">Urlaub (beantragt)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-red-600 rounded border border-red-700"></div>
                    <span className="font-medium">Krank</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-yellow-200 border-2 border-yellow-500 rounded"></div>
                    <span className="font-medium">Wochenende / Feiertag</span>
                  </div>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <div className="min-w-full inline-block">
                  <table className="min-w-full text-xs border-collapse">
                    <thead className="bg-gray-200 sticky top-0 z-10 border-b-2 border-gray-400">
                      <tr>
                        <th className="py-3 px-4 text-left font-bold text-gray-900 border-r-2 border-gray-400 sticky left-0 bg-gray-200 z-20 min-w-[200px]">
                          Mitarbeiter
                        </th>
                        {getDateRange.map((date, idx) => {
                          const isFirstOfMonth = date.getDate() === 1;
                          const isWeekendDay = isWeekend(date);
                          const isHoliday = isPublicHoliday(date, publicHolidays);
                          const isNonWorkingDay = isWeekendDay || isHoliday;
                          return (
                            <th
                              key={idx}
                              className={cn(
                                "py-2 px-1 text-center font-semibold border-r-2 min-w-[32px]",
                                isFirstOfMonth && "bg-blue-200 border-l-2 border-l-blue-600",
                                isNonWorkingDay && "bg-yellow-200 border-yellow-500",
                                !isNonWorkingDay && !isFirstOfMonth && "border-gray-400"
                              )}
                              title={date.toLocaleDateString('de-DE', { 
                                weekday: 'long', 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                              }) + (isHoliday ? ' (Feiertag)' : '')}
                            >
                              <div className="flex flex-col items-center">
                                {isFirstOfMonth && (
                                  <div className="text-[10px] font-bold text-blue-600 mb-1">
                                    {date.toLocaleDateString('de-DE', { month: 'short' })}
                                  </div>
                                )}
                                <div className={cn(
                                  "text-xs font-semibold",
                                  isNonWorkingDay ? "text-yellow-900" : "text-gray-800"
                                )}>
                                  {date.getDate()}
                                </div>
                                <div className={cn(
                                  "text-[10px] mt-0.5 font-semibold",
                                  isNonWorkingDay ? "text-yellow-900" : "text-gray-600"
                                )}>
                                  {date.toLocaleDateString('de-DE', { weekday: 'short' })}
                                </div>
                              </div>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEmployees.length === 0 ? (
                        <tr>
                          <td colSpan={getDateRange.length + 1} className="py-8 text-center text-gray-500">
                            Keine Mitarbeiter gefunden
                          </td>
                        </tr>
                      ) : (
                        filteredEmployees.map((employee) => (
                          <tr key={employee.id} className="border-t-2 border-gray-300 hover:bg-gray-100 transition-colors">
                            <td className="py-2 px-4 text-left whitespace-nowrap sticky left-0 bg-white z-10 border-r-2 border-gray-300 font-semibold">
                              <div className="flex flex-col">
                                <span className="font-bold text-gray-900">{employee.displayName}</span>
                                {employee.role && (
                                  <span className="text-xs text-gray-700 font-medium">{employee.role}</span>
                                )}
                              </div>
                            </td>
                            {getDateRange.map((date, idx) => {
                              const leaveDay = getLeaveForDate(employee.id, date);
                              const hasLeave = !!leaveDay.leave || !!leaveDay.vacationRequest;
                              const isWeekendDay = isWeekend(date);
                              const isHoliday = isPublicHoliday(date, publicHolidays);
                              const isNonWorkingDay = isWeekendDay || isHoliday;
                              
                              return (
                                <td
                                  key={idx}
                                  className={cn(
                                    "h-8 w-8 p-0 border-r-2 border-b-2 relative group",
                                    hasLeave && getLeaveColor(leaveDay),
                                    hasLeave && "border-gray-700",
                                    isNonWorkingDay && !hasLeave && "bg-yellow-200 border-yellow-500"
                                  )}
                                  title={hasLeave 
                                    ? getLeaveTooltip(leaveDay, employee) 
                                    : isHoliday 
                                    ? 'Feiertag' 
                                    : isWeekendDay 
                                    ? 'Wochenende' 
                                    : ''}
                                >
                                  {hasLeave && (
                                    <div className="absolute inset-0 flex items-center justify-center text-white">
                                      {getLeaveIcon(leaveDay)}
                                    </div>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default VacationCalendar;
