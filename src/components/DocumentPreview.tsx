import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { documentService, FirebaseDocument } from '@/services/documentService';
import ProjectBadge from '@/components/documents/ProjectBadge';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { FileText, Calendar, User } from 'lucide-react';

interface DocumentPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: FirebaseDocument & { projectId?: string };  // Add projectId support
}

interface CommentItem {
  id: string;
  userId: string;
  userEmail: string;
  comment: string;
  x: number;
  y: number;
  timestamp?: any;
  isEdited?: boolean;
}

const DocumentPreview: React.FC<DocumentPreviewProps> = ({ open, onOpenChange, document }) => {
  const { user } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [newComment, setNewComment] = useState('');
  const [pendingPos, setPendingPos] = useState<{ x: number; y: number } | null>(null);
  
  // Project information
  const [projectInfo, setProjectInfo] = useState<{
    name: string;
    type: 'external' | 'internal';
    category?: string;
  } | null>(null);
  const [loadingProject, setLoadingProject] = useState(false);

  const isImage = useMemo(() => document.fileType === 'image' || (document.mimeType || '').startsWith('image/'), [document]);
  const isPdf = useMemo(() => document.fileExtension?.toLowerCase() === 'pdf' || (document.mimeType || '').includes('pdf'), [document]);

  // Load comments
  useEffect(() => {
    if (!open) return;
    (async () => {
      const list = await documentService.listComments(document.documentId);
      setComments(list as any);
    })();
  }, [open, document.documentId]);

  // Load project information
  useEffect(() => {
    if (!open || !document.projectId) return;
    
    const loadProject = async () => {
      setLoadingProject(true);
      try {
        const projectRef = doc(db, 'projects', document.projectId);
        const projectSnap = await getDoc(projectRef);
        
        if (projectSnap.exists()) {
          const projectData = projectSnap.data();
          setProjectInfo({
            name: projectData.projectName || 'Unknown Project',
            type: projectData.type || 'external',
            category: projectData.internalCategory
          });
        }
      } catch (error) {
        console.error('Error loading project:', error);
      } finally {
        setLoadingProject(false);
      }
    };
    
    loadProject();
  }, [open, document.projectId]);

  const handleCanvasClick = (e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setPendingPos({ x, y });
  };

  const addSticky = async () => {
    if (!user || !pendingPos || !newComment.trim()) return;
    await documentService.addComment(document.documentId, user.uid, user.email || '', { comment: newComment.trim(), x: pendingPos.x, y: pendingPos.y });
    const list = await documentService.listComments(document.documentId);
    setComments(list as any);
    setNewComment('');
    setPendingPos(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        {/* Document Header */}
        <DialogHeader className="border-b pb-4 mb-4">
          <DialogTitle className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <span className="text-xl font-bold">{document.displayName}</span>
              </div>
              
              {/* Document metadata */}
              <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 mt-2">
                {document.category && (
                  <Badge variant="outline" className="font-medium">
                    {document.category}
                  </Badge>
                )}
                
                {document.uploadDate && (
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-3 h-3" />
                    <span>{new Date(document.uploadDate.seconds * 1000).toLocaleDateString('de-DE')}</span>
                  </div>
                )}
                
                {document.uploadedByEmail && (
                  <div className="flex items-center space-x-1">
                    <User className="w-3 h-3" />
                    <span>{document.uploadedByEmail}</span>
                  </div>
                )}
              </div>
              
              {/* Project Information */}
              {document.projectId && (
                <div className="mt-3 p-3 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border-l-4 border-blue-500">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-semibold text-gray-700">Projekt:</span>
                    {loadingProject ? (
                      <Badge variant="secondary">Laden...</Badge>
                    ) : projectInfo ? (
                      <ProjectBadge
                        projectName={projectInfo.name}
                        projectType={projectInfo.type}
                        internalCategory={projectInfo.category}
                      />
                    ) : (
                      <Badge variant="outline">{document.projectId}</Badge>
                    )}
                  </div>
                </div>
              )}
              
              {document.description && (
                <p className="text-sm text-gray-600 mt-2">{document.description}</p>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-4">
          <div className="flex-1">
            <div
              ref={containerRef}
              className="relative border rounded overflow-hidden"
              style={{ height: 600 }}
              onClick={handleCanvasClick}
            >
              {isImage && (
                <img src={document.downloadUrl} alt={document.displayName} className="w-full h-full object-contain" />
              )}
              {isPdf && (
                <iframe title="pdf" src={document.downloadUrl} className="w-full h-full" />
              )}

              {comments.map((c) => (
                <div
                  key={c.id}
                  className="absolute"
                  style={{ left: `${c.x * 100}%`, top: `${c.y * 100}%`, transform: 'translate(-10px, -10px)' }}
                >
                  <Badge variant="secondary">{c.userEmail?.split('@')[0] || 'user'}</Badge>
                </div>
              ))}

              {pendingPos && (
                <div
                  className="absolute"
                  style={{ left: `${pendingPos.x * 100}%`, top: `${pendingPos.y * 100}%`, transform: 'translate(-10px, -10px)' }}
                >
                  <Badge>Neu</Badge>
                </div>
              )}
            </div>
          </div>
          <div className="w-80 space-y-3">
            <div>
              <div className="text-sm text-gray-600">Kommentare</div>
              <div className="space-y-2 max-h-[540px] overflow-auto mt-2">
                {comments.map((c) => (
                  <div key={c.id} className="border rounded p-2">
                    <div className="text-xs text-gray-500">{c.userEmail}</div>
                    <div className="text-sm whitespace-pre-wrap">{c.comment}</div>
                  </div>
                ))}
                {comments.length === 0 && <div className="text-sm text-gray-500">Keine Kommentare</div>}
              </div>
            </div>

            <div className="space-y-2">
              <Textarea
                placeholder={pendingPos ? 'Kommentar zu markierter Stelle...' : 'Klicken Sie in die Vorschau, um eine Stelle zu markieren'}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                disabled={!pendingPos}
                rows={4}
              />
              <div className="flex gap-2">
                <Button onClick={addSticky} disabled={!pendingPos || !newComment.trim()}>Hinzufügen</Button>
                <Button variant="outline" onClick={() => { setPendingPos(null); setNewComment(''); }}>Abbrechen</Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DocumentPreview;





