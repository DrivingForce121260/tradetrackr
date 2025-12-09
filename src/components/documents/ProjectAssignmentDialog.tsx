/**
 * Project Assignment Dialog
 * Allows manual assignment of documents to projects
 * Shows suggested candidates with confidence scores
 */

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, AlertTriangle, Briefcase, Building2 } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useToast } from '@/hooks/use-toast';

interface ProjectAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: {
    id: string;
    originalFilename?: string;
    routeDecision?: {
      candidates?: Array<{projectId: string; projectName: string; confidence: number}>;
      reason?: string;
    };
  };
  externalProjects: Array<{id: string; projectName: string}>;
  internalProjects: Array<{id: string; projectName: string; internalCategory?: string}>;
  onAssigned: () => void;
}

export function ProjectAssignmentDialog({
  open,
  onOpenChange,
  document,
  externalProjects,
  internalProjects,
  onAssigned
}: ProjectAssignmentDialogProps) {
  const [assigning, setAssigning] = useState(false);
  const { toast } = useToast();

  const assignProject = async (projectId: string) => {
    setAssigning(true);
    try {
      const docRef = doc(db, 'documents', document.id);
      await updateDoc(docRef, {
        projectId,
        status: 'stored',
        routeDecision: {
          ruleId: 'manual-assignment',
          reason: 'Manually assigned by user',
          timestamp: new Date().toISOString()
        }
      });
      
      toast({
        title: '✅ Project Assigned',
        description: 'Document has been successfully assigned to the project'
      });
      
      onAssigned();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error assigning project:', error);
      toast({
        title: '❌ Assignment Failed',
        description: error.message || 'Failed to assign project',
        variant: 'destructive'
      });
    } finally {
      setAssigning(false);
    }
  };

  const candidates = document.routeDecision?.candidates || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            <span>Projekt zuordnen</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Document Info */}
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-4 rounded-lg border-l-4 border-blue-500">
            <p className="text-sm font-semibold text-gray-700 mb-1">Dokument:</p>
            <p className="text-sm text-gray-900 font-medium">{document.originalFilename || 'Unbekannt'}</p>
            {document.routeDecision?.reason && (
              <p className="text-xs text-gray-600 mt-2">
                <strong>Grund:</strong> {document.routeDecision.reason}
              </p>
            )}
          </div>

          {/* Suggested Projects (if any) */}
          {candidates.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-bold text-gray-900 flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>Vorgeschlagene Projekte:</span>
              </Label>
              <div className="space-y-2">
                {candidates.map(candidate => (
                  <Button
                    key={candidate.projectId}
                    variant="outline"
                    className="w-full justify-between h-auto py-3 hover:bg-blue-50 hover:border-blue-400"
                    onClick={() => assignProject(candidate.projectId)}
                    disabled={assigning}
                  >
                    <span className="flex items-center space-x-2">
                      <Briefcase className="w-4 h-4 text-indigo-600" />
                      <span className="font-medium">{candidate.projectName}</span>
                    </span>
                    <Badge className="bg-blue-100 text-blue-700 font-bold">
                      {Math.round(candidate.confidence * 100)}% Match
                    </Badge>
                  </Button>
                ))}
              </div>
            </div>
          )}

          <Separator />

          {/* Manual Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-bold text-gray-900">Oder manuell auswählen:</Label>
            <Select onValueChange={assignProject} disabled={assigning}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Projekt auswählen..." />
              </SelectTrigger>
              <SelectContent>
                {externalProjects.length > 0 && (
                  <>
                    <SelectGroup>
                      <SelectLabel className="flex items-center space-x-2 font-bold text-gray-700">
                        <Briefcase className="w-4 h-4" />
                        <span>Kundenprojekte</span>
                      </SelectLabel>
                      {externalProjects.map(p => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.projectName}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                    <SelectSeparator />
                  </>
                )}
                <SelectGroup>
                  <SelectLabel className="flex items-center space-x-2 font-bold text-gray-700">
                    <Building2 className="w-4 h-4" />
                    <span>Interne Projekte</span>
                  </SelectLabel>
                  {internalProjects.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.projectName}
                      {p.internalCategory && (
                        <span className="text-xs text-gray-500 ml-2">({p.internalCategory})</span>
                      )}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          {assigning && (
            <div className="text-center text-sm text-gray-600">
              Zuordnung läuft...
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ProjectAssignmentDialog;








