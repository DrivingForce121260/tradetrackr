import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { listTemplates } from '@/services/reportService';
import type { ReportTemplate } from '@/types/reporting';
import AppHeader from '@/components/AppHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, BarChart3, Clock, ArrowLeft } from 'lucide-react';

interface ReportsListProps {
  onBack: () => void;
  onNavigate: (page: string) => void;
  onOpenMessaging?: () => void;
}

const ReportsList: React.FC<ReportsListProps> = ({ onBack, onNavigate, onOpenMessaging }) => {
  const { user } = useAuth();
  const [items, setItems] = useState<ReportTemplate[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const rows = await listTemplates((user as any).concernID);
        setItems(rows);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  return (
    <div className="min-h-screen tradetrackr-gradient-blue">
      <AppHeader 
        title="Report-Vorlagen" 
        showBackButton={true} 
        onBack={onBack}
        onOpenMessaging={onOpenMessaging}
      />
      
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-0">
                  Report-Vorlagen
                </h1>
                <p className="text-gray-600 mb-0">
                  Erstellen und verwalten Sie benutzerdefinierte Berichte
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => onNavigate('reports-scheduler')}
                  title="Geplante Berichte"
                >
                  <Clock className="h-5 w-5 mr-2" />
                  Planung
                </Button>
                <Button
                  onClick={() => onNavigate('reports-builder')}
                  className="bg-[#058bc0] hover:bg-[#047aa0] text-white"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Neue Vorlage
                </Button>
              </div>
            </div>
          </div>

          {/* Templates Card */}
          <Card>
            <CardHeader>
              <CardTitle>
                Vorlagen ({items.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-gray-500">Lade Vorlagen...</div>
              ) : items.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Keine Vorlagen vorhanden. Erstellen Sie eine neue Vorlage, um zu beginnen.
                </div>
              ) : (
                <div className="grid gap-3">
                  {items.map((t) => (
                    <div 
                      key={t.id} 
                      className="rounded-lg border border-gray-200 bg-white p-4 flex items-center justify-between hover:shadow-md transition-shadow"
                    >
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900 mb-1">{t.name || 'Unbenannte Vorlage'}</div>
                        <div className="text-sm text-gray-500">
                          Dataset: <span className="font-medium">{t.dataset}</span> · 
                          Felder: <span className="font-medium">{t.fields?.length || 0}</span> · 
                          Visualisierung: <span className="font-medium">{t.visualization}</span>
                        </div>
                        {t.lastRun && (
                          <div className="text-xs text-gray-400 mt-1">
                            Letzte Ausführung: {new Date(t.lastRun).toLocaleDateString('de-DE')}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onNavigate(`reports-builder:${t.id}`)}
                        >
                          Öffnen
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ReportsList;


