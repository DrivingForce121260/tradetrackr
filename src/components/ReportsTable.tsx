import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Report } from '@/services/firestoreService';

interface ReportsTableProps {
  reports: Report[];
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  onSortColumn: (column: string) => void;
  onViewReport: (report: Report) => void;
}

const ReportsTable: React.FC<ReportsTableProps> = ({
  reports,
  sortBy,
  sortOrder,
  onSortColumn,
  onViewReport
}) => {
  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800">Akzeptiert</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800">Abgelehnt</Badge>;
      default:
        return <Badge className="bg-blue-100 text-blue-800">Eingereicht</Badge>;
    }
  };

  // Get sort icon for column
  const getSortIcon = (column: string) => {
    if (sortBy !== column) {
      return <ArrowUpDown className="h-5 w-5" />;
    }
    return sortOrder === 'asc' ? <ArrowUp className="h-5 w-5" /> : <ArrowDown className="h-5 w-5" />;
  };

  if (reports.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        Keine Berichte gefunden
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50">
            <TableHead 
              onClick={() => onSortColumn('reportNumber')} 
              className="font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 select-none"
            >
              <div className="flex items-center gap-1">
                Berichtsnummer {getSortIcon('reportNumber')}
              </div>
            </TableHead>
            <TableHead 
              onClick={() => onSortColumn('employee')} 
              className="font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 select-none"
            >
              <div className="flex items-center gap-1">
                Mitarbeiter {getSortIcon('employee')}
              </div>
            </TableHead>
            <TableHead 
              onClick={() => onSortColumn('customer')} 
              className="font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 select-none"
            >
              <div className="flex items-center gap-1">
                Kunde {getSortIcon('customer')}
              </div>
            </TableHead>
            <TableHead 
              onClick={() => onSortColumn('projectNumber')} 
              className="font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 select-none"
            >
              <div className="flex items-center gap-1">
                Projektnummer {getSortIcon('projectNumber')}
              </div>
            </TableHead>
            <TableHead 
              onClick={() => onSortColumn('workDate')} 
              className="font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 select-none"
            >
              <div className="flex items-center gap-1">
                Datum {getSortIcon('workDate')}
              </div>
            </TableHead>
            <TableHead 
              onClick={() => onSortColumn('totalHours')} 
              className="font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 select-none"
            >
              <div className="flex items-center gap-1">
                Stunden {getSortIcon('totalHours')}
              </div>
            </TableHead>
            <TableHead className="font-semibold text-gray-900">Status</TableHead>
            <TableHead className="font-semibold text-gray-900">Aktionen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reports.map((report) => (
            <TableRow 
              key={report.id} 
              className="hover:bg-gray-50 cursor-pointer"
              onClick={() => onViewReport(report)}
            >
              <TableCell className="font-medium">
                {report.reportNumber || 'Nicht verfügbar'}
              </TableCell>
              <TableCell>
                {report.employee || 'Unbekannt'}
              </TableCell>
              <TableCell>
                {report.customer || 'Unbekannt'}
              </TableCell>
              <TableCell>
                {report.projectNumber || 'Nicht verfügbar'}
              </TableCell>
              <TableCell>
                {report.workDate ? new Date(report.workDate).toLocaleDateString('de-DE') : 'Nicht verfügbar'}
              </TableCell>
              <TableCell>
                {report.totalHours ? `${report.totalHours}h` : '0h'}
              </TableCell>
              <TableCell>{getStatusBadge(report.status)}</TableCell>
                          <TableCell>
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation(); // Verhindert, dass der Row-Click ausgelö¶st wird
                  onViewReport(report);
                }}
                className="h-8 px-3"
              >
                <Eye className="h-4 w-4 mr-1" />
                Anzeigen
              </Button>
            </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default ReportsTable;

