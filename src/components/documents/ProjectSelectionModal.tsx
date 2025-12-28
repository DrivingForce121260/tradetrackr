/**
 * Project Selection Modal for Document Management
 * 
 * Used when a document requires manual project selection:
 * - No project number found in document
 * - Multiple project numbers found (ambiguous)
 * - Project number found but doesn't exist in system
 */

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { X, AlertCircle, CheckCircle } from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { functionsEU } from '@/config/firebase';
import { useToast } from '@/hooks/useToast';

interface Project {
  id: string;
  projectNumber: string;
  projectName: string;
  customerName?: string;
}

interface ProjectSelectionModalProps {
  open: boolean;
  onClose: () => void;
  docId: string;
  documentName: string;
  detectedProjectNumbers?: string[];  // PN patterns found in document
  reason?: string;                    // Reason why manual selection is needed
  projects: Project[];                // Available projects to choose from
  onSuccess?: (projectId: string, designation: string) => void;
}

export default function ProjectSelectionModal({
  open,
  onClose,
  docId,
  documentName,
  detectedProjectNumbers = [],
  reason,
  projects,
  onSuccess
}: ProjectSelectionModalProps) {
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setSelectedProjectId('');
      setSearchTerm('');
      setIsSubmitting(false);
    }
  }, [open]);

  // Filter projects based on search
  const filteredProjects = projects.filter(p => 
    p.projectNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.projectName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.customerName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async () => {
    if (!selectedProjectId) {
      toast({
        title: '❌ Projekt erforderlich',
        description: 'Bitte wählen Sie ein Projekt aus.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Call Cloud Function to finalize project link
      const finalizeFunction = httpsCallable(functionsEU, 'finalizeDocumentProjectLink');
      const result = await finalizeFunction({
        docId,
        projectId: selectedProjectId
      });

      const data = result.data as {
        success: boolean;
        projectNumber: string;
        suffix: number;
        designation: string;
      };

      if (data.success) {
        toast({
          title: '✅ Projekt zugeordnet',
          description: `Dokumentbezeichnung: ${data.designation}`,
        });

        if (onSuccess) {
          onSuccess(selectedProjectId, data.designation);
        }

        onClose();
      }
    } catch (error: any) {
      console.error('[ProjectSelectionModal] Error:', error);
      
      let errorMessage = 'Fehler beim Zuordnen des Projekts';
      if (error.code === 'functions/not-found') {
        errorMessage = 'Dokument oder Projekt nicht gefunden';
      } else if (error.code === 'functions/resource-exhausted') {
        errorMessage = 'Maximale Dokumentanzahl pro Projekt erreicht (9999)';
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        title: '❌ Fehler',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-600" />
            Projektzuordnung erforderlich
          </DialogTitle>
          <DialogDescription>
            Dokument: <span className="font-semibold">{documentName}</span>
          </DialogDescription>
        </DialogHeader>

        {/* Reason for manual selection */}
        {reason && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-yellow-800">
              <strong>Hinweis:</strong> {reason}
            </p>
          </div>
        )}

        {/* Detected project numbers */}
        {detectedProjectNumbers.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-sm font-semibold text-blue-900 mb-2">
              Gefundene Projektnummern im Dokument:
            </p>
            <div className="flex flex-wrap gap-2">
              {detectedProjectNumbers.map((pn, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm font-mono bg-blue-100 text-blue-800 border border-blue-300"
                >
                  {pn}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Project search */}
        <div className="mb-4">
          <Label htmlFor="project-search">Projekt suchen</Label>
          <input
            id="project-search"
            type="text"
            placeholder="Projektnummer, Name oder Kunde..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Project list */}
        <div className="mb-6">
          <Label className="mb-2 block">Projekt auswählen ({filteredProjects.length} verfügbar)</Label>
          <div className="border border-gray-300 rounded-lg max-h-64 overflow-y-auto">
            {filteredProjects.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                Keine Projekte gefunden
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredProjects.map((project) => (
                  <button
                    key={project.id}
                    type="button"
                    onClick={() => setSelectedProjectId(project.id)}
                    className={`w-full text-left p-3 hover:bg-gray-50 transition-colors ${
                      selectedProjectId === project.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-mono text-sm font-semibold text-blue-600">
                          {project.projectNumber}
                        </div>
                        <div className="text-sm font-medium text-gray-900 mt-1">
                          {project.projectName}
                        </div>
                        {project.customerName && (
                          <div className="text-xs text-gray-500 mt-1">
                            Kunde: {project.customerName}
                          </div>
                        )}
                      </div>
                      {selectedProjectId === project.id && (
                        <CheckCircle className="h-5 w-5 text-blue-600 ml-2 flex-shrink-0" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isSubmitting}
          >
            <X className="h-4 w-4 mr-2" />
            Abbrechen
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!selectedProjectId || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Wird zugeordnet...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Projekt zuordnen
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}



