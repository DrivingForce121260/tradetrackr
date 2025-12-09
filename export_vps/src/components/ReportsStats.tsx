import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Clock, CheckCircle, XCircle } from 'lucide-react';
import { Report } from '@/services/firestoreService';

interface ReportsStatsProps {
  reports: Report[];
  user: any;
  hasPermission: (permission: string) => boolean;
}

const ReportsStats: React.FC<ReportsStatsProps> = ({ reports, user, hasPermission }) => {
  // Calculate statistics
  const statistics = {
    total: reports.length,
    pending: reports.filter(r => r.status === 'pending').length,
    approved: reports.filter(r => r.status === 'approved').length,
    rejected: reports.filter(r => r.status === 'rejected').length,
    totalHours: reports.reduce((sum, r) => sum + (r.totalHours || 0), 0),
    averageHours: reports.length > 0 ? reports.reduce((sum, r) => sum + (r.totalHours || 0), 0) / reports.length : 0
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      <Card className="tradetrackr-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-700">
            {hasPermission('view_own_reports') && !hasPermission('view_all_reports') ? 'Meine Berichte' : 'Gesamt Berichte'}
          </CardTitle>
          <FileText className="h-5 w-5 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-gray-900">
            {hasPermission('view_own_reports') && !hasPermission('view_all_reports')
              ? reports.filter(report => report.employee === user?.displayName || report.mitarbeiterID === user?.uid).length
              : reports.length
            }
          </div>
        </CardContent>
      </Card>
      
      <Card className="tradetrackr-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-700">Eingereicht</CardTitle>
          <Clock className="h-5 w-5 text-yellow-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-gray-900">
            {hasPermission('view_own_reports') && !hasPermission('view_all_reports')
              ? reports.filter(report => report.status === 'pending' && (report.employee === user?.displayName || report.mitarbeiterID === user?.uid)).length
              : reports.filter(report => report.status === 'pending').length
            }
          </div>
        </CardContent>
      </Card>
      
      <Card className="tradetrackr-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-700">Akzeptiert</CardTitle>
          <CheckCircle className="h-5 w-5 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-gray-900">
            {hasPermission('view_own_reports') && !hasPermission('view_all_reports')
              ? reports.filter(report => report.status === 'approved' && (report.employee === user?.displayName || report.mitarbeiterID === user?.uid)).length
              : reports.filter(report => report.status === 'approved').length
            }
          </div>
        </CardContent>
      </Card>
      
      <Card className="tradetrackr-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-700">Abgelehnt</CardTitle>
          <XCircle className="h-5 w-5 text-red-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-gray-900">
            {hasPermission('view_own_reports') && !hasPermission('view_all_reports')
              ? reports.filter(report => report.status === 'rejected' && (report.employee === user?.displayName || report.mitarbeiterID === user?.uid)).length
              : reports.filter(report => report.status === 'rejected').length
            }
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportsStats;

