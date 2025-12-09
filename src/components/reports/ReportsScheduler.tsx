import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createSchedule, listTemplates } from '@/services/reportService';
import type { ReportSchedule, ReportTemplate } from '@/types/reporting';
import AppHeader from '@/components/AppHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Save, Clock, ArrowLeft, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ReportsSchedulerProps {
  onBack: () => void;
  onNavigate: (page: string) => void;
  onOpenMessaging?: () => void;
}

const ReportsScheduler: React.FC<ReportsSchedulerProps> = ({ onBack, onNavigate, onOpenMessaging }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [recipients, setRecipients] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      if (!user) return;
      setLoading(true);
      try {
        const rows = await listTemplates((user as any).concernID);
        setTemplates(rows);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const handleSave = async () => {
    if (!user || !selectedTemplate) {
      toast({
        title: 'Fehler',
        description: 'Bitte wählen Sie eine Vorlage aus.',
        variant: 'destructive',
      });
      return;
    }
    setSaving(true);
    try {
      const schedule: ReportSchedule & { createdBy: string; concernID: string } = {
        frequency,
        recipients: recipients.split(',').map((s) => s.trim()).filter(Boolean),
        active: true,
        createdBy: user.uid,
        concernID: (user as any).concernID,
      } as any;
      await createSchedule(selectedTemplate, schedule);
      toast({
        title: 'Erfolg',
        description: 'Planung wurde erfolgreich erstellt.',
      });
      onNavigate('reports-list');
    } catch (error) {
      toast({
        title: 'Fehler',
        description: 'Fehler beim Speichern der Planung.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen tradetrackr-gradient-blue">
      <AppHeader 
        title="Berichte planen" 
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
                  Berichte planen
                </h1>
                <p className="text-gray-600 mb-0">
                  Automatische Berichtsausführung und E-Mail-Versand konfigurieren
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => onNavigate('reports-list')}
                >
                  <ArrowLeft className="h-5 w-5 mr-2" />
                  Liste
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving || !selectedTemplate}
                  className="bg-[#058bc0] hover:bg-[#047aa0] text-white"
                >
                  <Save className="h-5 w-5 mr-2" />
                  {saving ? 'Speichere...' : 'Planung speichern'}
                </Button>
              </div>
            </div>
          </div>

          {/* Form Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Planung konfigurieren
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-gray-500">Lade Vorlagen...</div>
              ) : (
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="template">Vorlage</Label>
                      <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                        <SelectTrigger id="template">
                          <SelectValue placeholder="Bitte wählen" />
                        </SelectTrigger>
                        <SelectContent>
                          {templates.length === 0 ? (
                            <SelectItem value="__none__" disabled>Keine Vorlagen verfügbar</SelectItem>
                          ) : (
                            templates.map((t) => (
                              <SelectItem key={t.id} value={t.id || '__none__'}>
                                {t.name || 'Unbenannte Vorlage'}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="frequency">Häufigkeit</Label>
                      <Select value={frequency} onValueChange={(v) => setFrequency(v as any)}>
                        <SelectTrigger id="frequency">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Täglich</SelectItem>
                          <SelectItem value="weekly">Wöchentlich</SelectItem>
                          <SelectItem value="monthly">Monatlich</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="recipients" className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Empfänger (Komma-getrennt)
                      </Label>
                      <Textarea
                        id="recipients"
                        placeholder="a@example.com, b@example.com"
                        value={recipients}
                        onChange={(e) => setRecipients(e.target.value)}
                        className="min-h-[120px]"
                      />
                      <p className="text-xs text-gray-500">
                        Geben Sie E-Mail-Adressen durch Komma getrennt ein
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ReportsScheduler;


