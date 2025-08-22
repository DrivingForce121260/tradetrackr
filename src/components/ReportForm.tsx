import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, X } from 'lucide-react';

interface ReportFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (reportData: any) => void;
  user: any;
}

const ReportForm: React.FC<ReportFormProps> = ({ open, onOpenChange, onSubmit, user }) => {
  const [formData, setFormData] = useState({
    customer: '',
    projectNumber: '',
    workLocation: '',
    workDate: new Date().toISOString().split('T')[0],
    totalHours: 8,
    workDescription: '',
    mitarbeiterID: user?.uid || '',
    projectReportNumber: '',
    reportData: '',
    reportDate: new Date().toISOString().split('T')[0],
    signatureReference: '',
    stadt: '',
    concernID: (user as any)?.concernID || '',
    activeprojectName: '',
    location: '',
    workLines: []
  });

  const handleProjectChange = (projectNumber: string) => {
    const projectData = {
      'PRJ-2024-001': { customer: 'München Immobilien GmbH', workLocation: 'München, MaximilianstraöŸe 1' },
      'PRJ-2024-002': { customer: 'Hamburg Wohnbau AG', workLocation: 'Hamburg, MusterstraöŸe 123' },
      'PRJ-2024-003': { customer: 'Berlin Shopping Center GmbH', workLocation: 'Berlin, Alexanderplatz 5' },
      'PRJ-2024-004': { customer: 'Frankfurt Krankenhaus Stiftung', workLocation: 'Frankfurt, HauptstraöŸe 42' },
      'PRJ-2024-005': { customer: 'Kö¶ln Schulamt', workLocation: 'Kö¶ln, SchulstraöŸe 10' }
    };

    const selectedProject = projectData[projectNumber as keyof typeof projectData];
    if (selectedProject) {
      setFormData(prev => ({
        ...prev,
        projectNumber,
        customer: selectedProject.customer,
        workLocation: selectedProject.workLocation
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.customer || !formData.projectNumber || !formData.workLocation || !formData.workDescription) {
      alert('Bitte füllen Sie alle Pflichtfelder aus.');
      return;
    }

    onSubmit(formData);
  };

  const resetForm = () => {
    setFormData({
      customer: '',
      projectNumber: '',
      workLocation: '',
      workDate: new Date().toISOString().split('T')[0],
      totalHours: 8,
      workDescription: '',
      mitarbeiterID: user?.uid || '',
      projectReportNumber: '',
      reportData: '',
      reportDate: new Date().toISOString().split('T')[0],
      signatureReference: '',
      stadt: '',
      concernID: (user as any)?.concernID || '',
      activeprojectName: '',
      location: '',
      workLines: []
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Neuen Bericht erstellen
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="projectNumber">Projektnummer *</Label>
              <Select value={formData.projectNumber} onValueChange={handleProjectChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Projekt auswö¤hlen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PRJ-2024-001">PRJ-2024-001 - München Immobilien GmbH</SelectItem>
                  <SelectItem value="PRJ-2024-002">PRJ-2024-002 - Hamburg Wohnbau AG</SelectItem>
                  <SelectItem value="PRJ-2024-003">PRJ-2024-003 - Berlin Shopping Center GmbH</SelectItem>
                  <SelectItem value="PRJ-2024-004">PRJ-2024-004 - Frankfurt Krankenhaus Stiftung</SelectItem>
                  <SelectItem value="PRJ-2024-005">PRJ-2024-005 - Kö¶ln Schulamt</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="workDate">Arbeitsdatum *</Label>
              <Input
                id="workDate"
                type="date"
                value={formData.workDate}
                onChange={(e) => setFormData(prev => ({ ...prev, workDate: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customer">Kunde</Label>
              <Input
                id="customer"
                value={formData.customer}
                onChange={(e) => setFormData(prev => ({ ...prev, customer: e.target.value }))}
                placeholder="Wird automatisch ausgefüllt"
                readOnly
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="totalHours">Stunden *</Label>
              <Input
                id="totalHours"
                type="number"
                min="0"
                step="0.5"
                value={formData.totalHours}
                onChange={(e) => setFormData(prev => ({ ...prev, totalHours: parseFloat(e.target.value) || 0 }))}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="workLocation">Arbeitsort</Label>
            <Input
              id="workLocation"
              value={formData.workLocation}
              onChange={(e) => setFormData(prev => ({ ...prev, workLocation: e.target.value }))}
              placeholder="Wird automatisch ausgefüllt"
              readOnly
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="workDescription">Arbeitsbeschreibung *</Label>
            <Textarea
              id="workDescription"
              value={formData.workDescription}
              onChange={(e) => setFormData(prev => ({ ...prev, workDescription: e.target.value }))}
              placeholder="Beschreiben Sie die durchgeführte Arbeit..."
              rows={4}
              required
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={resetForm}>
              <X className="h-4 w-4 mr-2" />
              Zurücksetzen
            </Button>
            <Button type="submit">
              <Plus className="h-4 w-4 mr-2" />
              Bericht erstellen
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ReportForm;

