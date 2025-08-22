import React, { useState, useEffect } from 'react';
import { BarChart3, Users, Calendar, DollarSign, TrendingUp, Clock, ChevronLeft } from 'lucide-react';
import { Project, ProjectDashboardProps } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface DashboardProps extends ProjectDashboardProps {
  onBack?: () => void;
  onNavigate?: (page: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ projects, onBack, onNavigate }) => {



  const getStatusBadge = (status: string) => {
    const variants = {
      planning: 'secondary',
      'in-progress': 'default',
      completed: 'default',
      'on-hold': 'destructive'
    } as const;
    return <Badge variant={variants[status as keyof typeof variants] || 'default'}>{status}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const variants = {
      low: 'default',
      medium: 'secondary',
      high: 'destructive'
    } as const;
    return <Badge variant={variants[priority as keyof typeof variants] || 'default'}>{priority}</Badge>;
  };

  return (
    <div className="min-h-screen tradetrackr-gradient-blue p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header with back button */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            {onBack && (
              <Button
                variant="outline"
                onClick={onBack}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Zurück
              </Button>
            )}
            <div>
              <h1 className="text-3xl font-bold text-white">Projekt Dashboard</h1>
              <p className="text-blue-100">Übersicht über alle Projekte</p>
            </div>
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={() => onNavigate?.('projects')}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              Alle Projekte
            </Button>
            <Button
              onClick={() => onNavigate?.('new-project')}
              className="bg-white text-blue-600 hover:bg-gray-100"
            >
              Neues Projekt
            </Button>
          </div>
        </div>





        {/* Recent Projects Table */}
        <Card className="bg-white/10 border-white/20 text-white">
          <CardHeader>
            <CardTitle>Letzte Projekte</CardTitle>
          </CardHeader>
          <CardContent>
            {projects.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="border-white/20">
                    <TableHead className="text-white">Projekt</TableHead>
                    <TableHead className="text-white">Kunde</TableHead>
                    <TableHead className="text-white">Status</TableHead>
                    <TableHead className="text-white">Prioritö¤t</TableHead>
                    <TableHead className="text-white">Budget</TableHead>
                    <TableHead className="text-white">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.slice(0, 5).map((project) => (
                    <TableRow key={project.id} className="border-white/20">
                      <TableCell className="font-medium text-white">{project.title}</TableCell>
                      <TableCell className="text-white">{project.client}</TableCell>
                      <TableCell>{getStatusBadge(project.status)}</TableCell>
                      <TableCell>{getPriorityBadge(project.priority)}</TableCell>
                      <TableCell className="text-white">â‚¬{parseFloat(project.budget).toLocaleString()}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onNavigate?.(`project/${project.id}`)}
                            className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                          >
                            Anzeigen
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8">
                <p className="text-blue-200 mb-4">Keine Projekte gefunden</p>
                <Button
                  onClick={() => onNavigate?.('new-project')}
                  className="bg-white text-blue-600 hover:bg-gray-100"
                >
                  Erstes Projekt erstellen
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
