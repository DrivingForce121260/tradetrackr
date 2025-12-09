// ============================================================================
// AUFMASS DIALOG - TradeTrackr Portal
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Loader2, FileText, Calculator, Calendar, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { GenerateAufmassRequest, GenerateAufmassResponse } from '@/types/aufmass';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/config/firebase';
import AufmassPreview from './AufmassPreview';

interface AufmassDialogProps {
  open: boolean;
  onClose: () => void;
  projects: Array<{ id: string; projectNumber: string; name: string }>;
  onSuccess: (response: GenerateAufmassResponse) => void;
}

const AufmassDialog: React.FC<AufmassDialogProps> = ({
  open,
  onClose,
  projects,
  onSuccess
}) => {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Form state
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [periodMode, setPeriodMode] = useState<'project' | 'custom'>('project');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  
  // Data sources
  const [includeItems, setIncludeItems] = useState(true);
  const [includeHours, setIncludeHours] = useState(true);
  const [includeMaterials, setIncludeMaterials] = useState(true);
  
  // Options
  const [aggregateBy, setAggregateBy] = useState<'positionUnit' | 'descriptionUnit'>('positionUnit');
  const [hideZeroQuantities, setHideZeroQuantities] = useState(true);
  const [csvAlso, setCsvAlso] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Filtered projects for search
  const filteredProjects = projects.filter(p => 
    p.projectNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setShowPreview(false);
      setIsGenerating(false);
    }
  }, [open]);

  const handleGenerate = async () => {
    // Validation
    if (!selectedProjectId) {
      toast({
        title: 'Fehler',
        description: 'Bitte wählen Sie ein Projekt aus',
        variant: 'destructive'
      });
      return;
    }

    if (!includeItems && !includeHours && !includeMaterials) {
      toast({
        title: 'Fehler',
        description: 'Bitte wählen Sie mindestens eine Datenquelle aus',
        variant: 'destructive'
      });
      return;
    }

    if (periodMode === 'custom') {
      if (!dateFrom || !dateTo) {
        toast({
          title: 'Fehler',
          description: 'Bitte geben Sie ein gültiges Datum ein',
          variant: 'destructive'
        });
        return;
      }

      if (new Date(dateFrom) > new Date(dateTo)) {
        toast({
          title: 'Fehler',
          description: 'Das "Von"-Datum muss vor dem "Bis"-Datum liegen',
          variant: 'destructive'
        });
        return;
      }
    }

    setIsGenerating(true);

    try {
      const request: GenerateAufmassRequest = {
        projectId: selectedProjectId,
        projectNumber: selectedProject?.projectNumber,
        range: {
          mode: periodMode,
          from: periodMode === 'custom' ? dateFrom : undefined,
          to: periodMode === 'custom' ? dateTo : undefined
        },
        sources: {
          items: includeItems,
          hours: includeHours,
          materials: includeMaterials
        },
        aggregateBy,
        hideZeroQuantities,
        csvAlso
      };

      const generateAufmass = httpsCallable<GenerateAufmassRequest, GenerateAufmassResponse>(
        functions,
        'generateAufmass'
      );

      const result = await generateAufmass(request);
      
      toast({
        title: 'Erfolg',
        description: `Aufmaß erstellt: ${result.data.fileName}`,
      });

      onSuccess(result.data);
      onClose();

    } catch (error: any) {
      console.error('Error generating Aufmaß:', error);
      toast({
        title: 'Fehler beim Erstellen des Aufmaßes',
        description: error.message || 'Ein unbekannter Fehler ist aufgetreten',
        variant: 'destructive'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePreview = () => {
    if (!selectedProjectId) {
      toast({
        title: 'Fehler',
        description: 'Bitte wählen Sie ein Projekt aus',
        variant: 'destructive'
      });
      return;
    }
    setShowPreview(true);
  };

  if (showPreview) {
    return (
      <AufmassPreview
        open={open}
        onClose={() => setShowPreview(false)}
        onGenerate={handleGenerate}
        projectId={selectedProjectId}
        projectNumber={selectedProject?.projectNumber || ''}
        range={{
          mode: periodMode,
          from: periodMode === 'custom' ? dateFrom : undefined,
          to: periodMode === 'custom' ? dateTo : undefined
        }}
        sources={{
          items: includeItems,
          hours: includeHours,
          materials: includeMaterials
        }}
        aggregateBy={aggregateBy}
        hideZeroQuantities={hideZeroQuantities}
        isGenerating={isGenerating}
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-blue-50 via-white to-cyan-50 border-4 border-[#058bc0] shadow-2xl">
        <DialogHeader className="bg-gradient-to-r from-[#058bc0] via-[#0470a0] to-[#058bc0] text-white -mx-6 -mt-6 px-6 py-6 mb-6 shadow-xl relative overflow-hidden">
          {/* Animated background decoration */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse"></div>
          
          <DialogTitle className="text-3xl font-bold flex items-center gap-4 relative z-10">
            <div className="bg-white/25 p-3 rounded-xl backdrop-blur-sm shadow-lg border-2 border-white/30">
              📐
            </div>
            <div className="flex-1">
              Aufmaß erstellen
              <div className="text-xs font-normal text-white/80 mt-1">
                Aggregieren Sie Ihre Berichte zu einem professionellen Aufmaß
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Project Selection */}
          <div className="space-y-3 p-5 bg-gradient-to-br from-blue-100 via-blue-50 to-white rounded-xl border-3 border-blue-300 shadow-lg hover:shadow-xl transition-all">
            <Label className="text-base font-bold text-gray-900 flex items-center gap-3">
              <span className="text-3xl">📁</span>
              <span className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
                Projekt auswählen *
              </span>
            </Label>
            <Input
              placeholder="Projekt suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mb-2 bg-white border-3 border-blue-300 focus:border-[#058bc0] focus:ring-4 focus:ring-[#058bc0]/30 text-gray-900 font-semibold shadow-md"
            />
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
              <SelectTrigger className="bg-white border-3 border-blue-300 focus:border-[#058bc0] focus:ring-4 focus:ring-[#058bc0]/30 text-gray-900 shadow-md font-semibold h-11">
                <SelectValue placeholder="Projekt auswählen..." />
              </SelectTrigger>
              <SelectContent className="bg-white border-2 border-blue-300">
                {filteredProjects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.projectNumber} - {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Period Selection */}
          <div className="space-y-3 p-5 bg-gradient-to-br from-purple-100 via-purple-50 to-white rounded-xl border-3 border-purple-300 shadow-lg hover:shadow-xl transition-all">
            <Label className="text-base font-bold text-gray-900 flex items-center gap-3">
              <span className="text-3xl">📅</span>
              <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                Zeitraum
              </span>
            </Label>
            <RadioGroup value={periodMode} onValueChange={(v) => setPeriodMode(v as 'project' | 'custom')}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="project" id="period-project" />
                <Label htmlFor="period-project" className="font-semibold cursor-pointer text-gray-900">
                  Gesamtes Projekt
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="custom" id="period-custom" />
                <Label htmlFor="period-custom" className="font-semibold cursor-pointer text-gray-900">
                  Benutzerdefiniert
                </Label>
              </div>
            </RadioGroup>

            {periodMode === 'custom' && (
              <div className="grid grid-cols-2 gap-4 pl-6">
                <div>
                  <Label htmlFor="date-from" className="font-semibold text-gray-900">Von</Label>
                  <Input
                    id="date-from"
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="bg-white border-3 border-purple-300 focus:border-purple-600 focus:ring-4 focus:ring-purple-500/30 text-gray-900 shadow-md"
                  />
                </div>
                <div>
                  <Label htmlFor="date-to" className="font-semibold text-gray-900">Bis</Label>
                  <Input
                    id="date-to"
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="bg-white border-3 border-purple-300 focus:border-purple-600 focus:ring-4 focus:ring-purple-500/30 text-gray-900 shadow-md"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Data Sources */}
          <div className="space-y-3 p-5 bg-gradient-to-br from-green-100 via-green-50 to-white rounded-xl border-3 border-green-300 shadow-lg hover:shadow-xl transition-all">
            <Label className="text-base font-bold text-gray-900 flex items-center gap-3">
              <span className="text-3xl">📊</span>
              <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                Datenquellen
              </span>
            </Label>
            <div className="space-y-2 pl-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="source-items"
                  checked={includeItems}
                  onCheckedChange={(checked) => setIncludeItems(checked as boolean)}
                />
                <Label htmlFor="source-items" className="font-semibold cursor-pointer text-gray-900">
                  📋 Leistungspositionen (items)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="source-hours"
                  checked={includeHours}
                  onCheckedChange={(checked) => setIncludeHours(checked as boolean)}
                />
                <Label htmlFor="source-hours" className="font-semibold cursor-pointer text-gray-900">
                  ⏰ Arbeitsstunden (hours)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="source-materials"
                  checked={includeMaterials}
                  onCheckedChange={(checked) => setIncludeMaterials(checked as boolean)}
                />
                <Label htmlFor="source-materials" className="font-semibold cursor-pointer text-gray-900">
                  🧱 Materialien (materials)
                </Label>
              </div>
            </div>
          </div>

          {/* Options */}
          <div className="space-y-3 p-5 bg-gradient-to-br from-orange-100 via-orange-50 to-white rounded-xl border-3 border-orange-300 shadow-lg hover:shadow-xl transition-all">
            <Label className="text-base font-bold text-gray-900 flex items-center gap-3">
              <span className="text-3xl">⚙️</span>
              <span className="bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                Optionen
              </span>
            </Label>
            
            <div className="space-y-3 pl-2">
              <div>
                <Label htmlFor="aggregate-by" className="font-semibold text-gray-900">Positionsaggregation</Label>
                <Select value={aggregateBy} onValueChange={(v) => setAggregateBy(v as any)}>
                  <SelectTrigger id="aggregate-by" className="mt-1 bg-white border-3 border-orange-300 focus:border-orange-600 focus:ring-4 focus:ring-orange-500/30 text-gray-900 shadow-md font-semibold h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-2 border-orange-300">
                    <SelectItem value="positionUnit">Position + Einheit</SelectItem>
                    <SelectItem value="descriptionUnit">Bezeichnung + Einheit</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="hide-zero"
                  checked={hideZeroQuantities}
                  onCheckedChange={(checked) => setHideZeroQuantities(checked as boolean)}
                />
                <Label htmlFor="hide-zero" className="font-semibold cursor-pointer text-gray-900">
                  🚫 Nullmengen ausblenden
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="csv-also"
                  checked={csvAlso}
                  onCheckedChange={(checked) => setCsvAlso(checked as boolean)}
                />
                <Label htmlFor="csv-also" className="font-semibold cursor-pointer text-gray-900">
                  📄 CSV zusätzlich erzeugen
                </Label>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex justify-end gap-3 pt-6 border-t-2 border-gray-300">
          <Button 
            variant="outline" 
            onClick={onClose} 
            disabled={isGenerating}
            className="border-3 border-gray-400 text-gray-700 hover:bg-gray-100 hover:border-gray-600 font-bold shadow-md hover:shadow-lg transition-all px-8 py-6 text-base"
          >
            <span className="text-xl mr-2">❌</span> Abbrechen
          </Button>
          <Button 
            variant="secondary" 
            onClick={handlePreview} 
            disabled={isGenerating || !selectedProjectId}
            className="border-3 border-blue-400 text-blue-700 hover:bg-blue-100 hover:border-blue-600 font-bold shadow-md hover:shadow-lg transition-all px-8 py-6 text-base"
          >
            <span className="text-xl mr-2">👁️</span> Vorschau
          </Button>
          <Button 
            onClick={handleGenerate} 
            disabled={isGenerating || !selectedProjectId}
            className="bg-gradient-to-r from-[#058bc0] via-[#0470a0] to-[#058bc0] hover:from-[#0470a0] hover:via-[#046a90] hover:to-[#0470a0] text-white font-bold shadow-xl hover:shadow-2xl transition-all hover:scale-110 px-10 py-6 text-base border-3 border-[#047ba8]"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                <span className="text-xl">⏳</span> Wird erstellt...
              </>
            ) : (
              <>
                <span className="text-xl mr-2">✨</span>
                Aufmaß generieren
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AufmassDialog;



