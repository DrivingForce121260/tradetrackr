import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Calendar, Clock, MapPin, User, Building } from 'lucide-react';
import { Report } from '@/services/firestoreService';

interface ReportsCardsProps {
  reports: Report[];
  onViewReport: (report: Report) => void;
}

const ReportsCards: React.FC<ReportsCardsProps> = ({ reports, onViewReport }) => {
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

  if (reports.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        Keine Berichte gefunden
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {reports.map((report) => (
        <Card 
          key={report.id} 
          className="hover:shadow-lg transition-shadow cursor-pointer"
          onClick={() => onViewReport(report)}
        >
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardTitle className="text-lg">{report.reportNumber || 'Nicht verfügbar'}</CardTitle>
                <p className="text-sm text-gray-600">{report.projectNumber || 'Nicht verfügbar'}</p>
              </div>
              {getStatusBadge(report.status)}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <User className="h-4 w-4" />
              <span>{report.employee || 'Unbekannt'}</span>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Building className="h-4 w-4" />
              <span>{report.customer || 'Unbekannt'}</span>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="h-4 w-4" />
              <span>{report.workDate ? new Date(report.workDate).toLocaleDateString('de-DE') : 'Nicht verfügbar'}</span>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock className="h-4 w-4" />
              <span>{report.totalHours ? `${report.totalHours} Stunden` : '0 Stunden'}</span>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <MapPin className="h-4 w-4" />
              <span className="truncate">{report.workLocation || 'Nicht verfügbar'}</span>
            </div>
            
            <div className="pt-2">
              <p className="text-sm text-gray-700 line-clamp-2">
                {report.workDescription || 'Keine Beschreibung verfügbar'}
              </p>
            </div>
            
            <div className="pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation(); // Verhindert, dass der Card-Click ausgelöst wird
                  onViewReport(report);
                }}
                className="w-full"
              >
                <Eye className="h-4 w-4 mr-2" />
                Details anzeigen
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default ReportsCards;

