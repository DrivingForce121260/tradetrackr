/**
 * Email Reply Composer Component
 * UI for editing and sending AI-generated email replies
 */

import React, { useState, useEffect } from 'react';
import { EmailReply } from '@/types/email';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { httpsCallable } from 'firebase/functions';
import { functionsEU } from '@/config/firebase';
import { doc, onSnapshot, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { 
  X, 
  Send, 
  Save, 
  Loader2,
  AlertCircle,
  Sparkles,
  Mail,
  User,
  ExternalLink,
  Copy,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { buildMailtoUrl, copyToClipboard, openMailtoUrl } from '@/utils/mailto';

interface EmailReplyComposerProps {
  replyId: string;
  onClose: () => void;
  onSent?: () => void;
}

const EmailReplyComposer: React.FC<EmailReplyComposerProps> = ({ 
  replyId, 
  onClose,
  onSent,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const concernId = user?.concernID || user?.ConcernID || '';

  // State
  const [reply, setReply] = useState<EmailReply | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [copying, setCopying] = useState(false);

  // Form state
  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [subject, setSubject] = useState('');
  const [bodyText, setBodyText] = useState('');

  // Load reply data and listen for updates
  useEffect(() => {
    if (!replyId) return;

    const replyRef = doc(db, 'emailReplies', replyId);
    
    const unsubscribe = onSnapshot(
      replyRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          const replyData: EmailReply = {
            id: snapshot.id,
            concernId: data.concernId,
            emailId: data.emailId,
            accountId: data.accountId,
            provider: data.provider,
            threadId: data.threadId,
            providerMessageId: data.providerMessageId,
            providerDraftId: data.providerDraftId,
            providerSentId: data.providerSentId,
            to: data.to || [],
            cc: data.cc || [],
            bcc: data.bcc || [],
            subject: data.subject || '',
            bodyText: data.bodyText || '',
            bodyHtml: data.bodyHtml,
            status: data.status,
            lastError: data.lastError,
            generatedBy: data.generatedBy,
            createdBy: data.createdBy,
            updatedBy: data.updatedBy,
            createdAt: data.createdAt?.toDate(),
            updatedAt: data.updatedAt?.toDate(),
            history: (data.history || []).map((h: any) => ({
              at: h.at?.toDate(),
              by: h.by,
              action: h.action,
              note: h.note,
            })),
          };

          setReply(replyData);
          
          // Initialize form fields
          setTo(replyData.to.join(', '));
          setCc(replyData.cc.join(', '));
          setBcc(replyData.bcc.join(', '));
          setSubject(replyData.subject);
          setBodyText(replyData.bodyText);
          
          setLoading(false);
        } else {
          toast({
            title: '❌ Fehler',
            description: 'Antwort nicht gefunden',
            variant: 'destructive',
          });
          onClose();
        }
      },
      (error) => {
        // Error handling - no content logged
        toast({
          title: '❌ Fehler',
          description: 'Antwort konnte nicht geladen werden',
          variant: 'destructive',
        });
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [replyId, onClose, toast]);

  // Handle save (update Firestore)
  const handleSave = async () => {
    if (!reply || !user) return;

    setSaving(true);
    try {
      const replyRef = doc(db, 'emailReplies', replyId);
      
      await updateDoc(replyRef, {
        to: to.split(',').map(e => e.trim()).filter(e => e),
        cc: cc.split(',').map(e => e.trim()).filter(e => e),
        bcc: bcc.split(',').map(e => e.trim()).filter(e => e),
        subject,
        bodyText,
        status: 'edited',
        updatedBy: user.uid,
        updatedAt: Timestamp.now(),
        history: [
          ...(reply.history || []),
          {
            at: Timestamp.now(),
            by: user.uid,
            action: 'edited',
            note: 'Manuell bearbeitet',
          },
        ],
      });

      toast({
        title: '✅ Gespeichert',
        description: 'Änderungen wurden gespeichert',
      });
    } catch (error: any) {
      // Error handling - no draft content logged
      toast({
        title: '❌ Fehler',
        description: `Speichern fehlgeschlagen: ${error.message}`,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // Handle send (backend - disabled for IMAP)
  const handleSend = async () => {
    if (!reply || !user) return;

    // Validate
    if (!to.trim()) {
      toast({
        title: '❌ Fehler',
        description: 'Empfänger (An) fehlt',
        variant: 'destructive',
      });
      return;
    }

    if (!subject.trim()) {
      toast({
        title: '❌ Fehler',
        description: 'Betreff fehlt',
        variant: 'destructive',
      });
      return;
    }

    if (!bodyText.trim()) {
      toast({
        title: '❌ Fehler',
        description: 'Nachrichtentext fehlt',
        variant: 'destructive',
      });
      return;
    }

    // Save first
    await handleSave();

    setSending(true);
    try {
      const sendReplyFunction = httpsCallable(functionsEU, 'sendEmailReply');
      await sendReplyFunction({
        concernId,
        replyId,
      });

      toast({
        title: '✅ Gesendet',
        description: 'E-Mail wurde erfolgreich gesendet',
      });

      if (onSent) {
        onSent();
      }
      
      onClose();
    } catch (error: any) {
      // Error handling - no email content logged
      toast({
        title: '❌ Senden fehlgeschlagen',
        description: error.message || 'Bitte versuchen Sie es später erneut',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  // Handle open in email client (mailto)
  const handleOpenInEmailClient = async () => {
    if (!reply) return;

    // Validate
    if (!to.trim()) {
      toast({
        title: '❌ Fehler',
        description: 'Empfänger (An) fehlt',
        variant: 'destructive',
      });
      return;
    }

    if (!subject.trim()) {
      toast({
        title: '❌ Fehler',
        description: 'Betreff fehlt',
        variant: 'destructive',
      });
      return;
    }

    if (!bodyText.trim()) {
      toast({
        title: '❌ Fehler',
        description: 'Nachrichtentext fehlt',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Build mailto URL
      const result = buildMailtoUrl({
        to: to.split(',').map(e => e.trim()).filter(e => e),
        subject: subject,
        body: bodyText,
        cc: cc.split(',').map(e => e.trim()).filter(e => e),
        bcc: bcc.split(',').map(e => e.trim()).filter(e => e),
      });

      // If body was truncated, copy full text to clipboard
      if (result.bodyTruncated) {
        const copied = await copyToClipboard(result.fullBody);
        if (copied) {
          toast({
            title: '📋 Antwort wurde in die Zwischenablage kopiert',
            description: 'Der vollständige Text wurde kopiert. Bitte in Ihren E-Mail-Client einfügen.',
          });
        } else {
          toast({
            title: '⚠️ Kopieren fehlgeschlagen',
            description: 'Bitte kopieren Sie den Text manuell aus dem Editor.',
            variant: 'destructive',
          });
        }
      }

      // Open email client
      openMailtoUrl(result.url);

      toast({
        title: '✅ E-Mail-Client geöffnet',
        description: 'Ihre Standard-E-Mail-Anwendung wurde geöffnet',
      });

      // Close the composer modal after opening email client
      onClose();
    } catch (error: any) {
      // Error handling - no content logged
      toast({
        title: '❌ Fehler',
        description: error.message || 'E-Mail-Client konnte nicht geöffnet werden',
        variant: 'destructive',
      });
    }
  };

  // Handle copy to clipboard
  const handleCopyToClipboard = async () => {
    if (!bodyText.trim()) {
      toast({
        title: '❌ Fehler',
        description: 'Kein Text zum Kopieren vorhanden',
        variant: 'destructive',
      });
      return;
    }

    setCopying(true);
    try {
      const copied = await copyToClipboard(bodyText);
      if (copied) {
        toast({
          title: '✅ Kopiert',
          description: 'Antworttext wurde in die Zwischenablage kopiert',
        });
      } else {
        toast({
          title: '❌ Kopieren fehlgeschlagen',
          description: 'Bitte versuchen Sie es erneut oder kopieren Sie manuell',
          variant: 'destructive',
        });
      }
    } catch (error) {
      // Error handling - no content logged
      toast({
        title: '❌ Kopieren fehlgeschlagen',
        description: 'Ein Fehler ist aufgetreten',
        variant: 'destructive',
      });
    } finally {
      setCopying(false);
    }
  };

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !sending) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose, sending]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
        <div className="bg-white rounded-lg p-8 flex items-center space-x-3">
          <Loader2 className="w-6 h-6 animate-spin text-[#058bc0]" />
          <span className="text-gray-700">Lade Antwort...</span>
        </div>
      </div>
    );
  }

  if (!reply) {
    return null;
  }

  const getStatusBadge = () => {
    const statusConfig = {
      draft: { label: 'Entwurf', color: 'bg-gray-100 text-gray-800' },
      generated: { label: 'KI-Generiert', color: 'bg-blue-100 text-blue-800' },
      edited: { label: 'Bearbeitet', color: 'bg-yellow-100 text-yellow-800' },
      sending: { label: 'Wird gesendet...', color: 'bg-orange-100 text-orange-800' },
      sent: { label: 'Gesendet', color: 'bg-green-100 text-green-800' },
      send_failed: { label: 'Fehler', color: 'bg-red-100 text-red-800' },
    };

    const config = statusConfig[reply.status] || statusConfig.draft;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const canEdit = ['draft', 'generated', 'edited', 'send_failed'].includes(reply.status);
  const canSend = canEdit && !sending && !saving;

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-50"
        onClick={canEdit && !sending ? onClose : undefined}
      />

      {/* Composer Modal */}
      <div className="fixed inset-4 md:inset-10 lg:inset-20 bg-white rounded-lg shadow-2xl z-50 flex flex-col max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Mail className="w-5 h-5 text-[#058bc0]" />
            <h2 className="text-lg font-bold text-gray-900">E-Mail Antwort</h2>
            {getStatusBadge()}
            {reply.generatedBy && (
              <Badge className="bg-purple-100 text-purple-800">
                <Sparkles className="w-3 h-3 mr-1" />
                KI-Unterstützt
              </Badge>
            )}
          </div>
          <button
            onClick={onClose}
            disabled={sending}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Error Display */}
        {reply.lastError && (
          <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800">Fehler beim Senden</p>
              <p className="text-sm text-red-700 mt-1">{reply.lastError}</p>
            </div>
          </div>
        )}

        {/* Form */}
        <div className="flex-1 overflow-auto p-6 space-y-4">
          {/* To */}
          <div>
            <Label htmlFor="to" className="text-sm font-medium text-gray-700">
              An <span className="text-red-500">*</span>
            </Label>
            <Input
              id="to"
              type="text"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              disabled={!canEdit}
              placeholder="empfaenger@example.com, weitere@example.com"
              className="mt-1"
            />
            <p className="text-xs text-gray-500 mt-1">
              Mehrere Empfänger mit Komma trennen
            </p>
          </div>

          {/* Cc */}
          <div>
            <Label htmlFor="cc" className="text-sm font-medium text-gray-700">
              Cc
            </Label>
            <Input
              id="cc"
              type="text"
              value={cc}
              onChange={(e) => setCc(e.target.value)}
              disabled={!canEdit}
              placeholder="cc@example.com"
              className="mt-1"
            />
          </div>

          {/* Bcc */}
          <div>
            <Label htmlFor="bcc" className="text-sm font-medium text-gray-700">
              Bcc
            </Label>
            <Input
              id="bcc"
              type="text"
              value={bcc}
              onChange={(e) => setBcc(e.target.value)}
              disabled={!canEdit}
              placeholder="bcc@example.com"
              className="mt-1"
            />
          </div>

          {/* Subject */}
          <div>
            <Label htmlFor="subject" className="text-sm font-medium text-gray-700">
              Betreff <span className="text-red-500">*</span>
            </Label>
            <Input
              id="subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={!canEdit}
              placeholder="Re: ..."
              className="mt-1"
            />
          </div>

          {/* Body */}
          <div className="flex-1">
            <Label htmlFor="bodyText" className="text-sm font-medium text-gray-700">
              Nachricht <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="bodyText"
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
              disabled={!canEdit}
              placeholder="Ihre Nachricht..."
              className="mt-1 min-h-[300px] font-mono text-sm"
            />
          </div>

          {/* History */}
          {reply.history && reply.history.length > 0 && (
            <div className="pt-4 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Verlauf</h3>
              <div className="space-y-2">
                {reply.history.map((entry, index) => (
                  <div key={index} className="text-xs text-gray-600 flex items-start space-x-2">
                    <span className="font-medium">
                      {entry.action === 'generated' && '🤖 Generiert'}
                      {entry.action === 'edited' && '✏️ Bearbeitet'}
                      {entry.action === 'sent' && '✅ Gesendet'}
                      {entry.action === 'failed' && '❌ Fehler'}
                    </span>
                    <span>
                      {entry.at?.toLocaleString('de-DE')}
                      {entry.note && ` - ${entry.note}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col space-y-3 p-4 border-t border-gray-200 bg-gray-50">
          {/* Info Text */}
          <div className="text-sm text-gray-600">
            {reply.provider === 'gmail' && '📧 Gmail-Konto (Backend-Versand verfügbar)'}
            {reply.provider === 'm365' && '📧 Microsoft 365-Konto (Backend-Versand verfügbar)'}
            {reply.provider === 'imap' && '📧 IMAP-Konto (nur E-Mail-Client-Versand)'}
          </div>

          {/* Primary Actions Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={sending}
              >
                Abbrechen
              </Button>
              {canEdit && (
                <Button
                  variant="outline"
                  onClick={handleSave}
                  disabled={saving || sending}
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Speichern...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Speichern
                    </>
                  )}
                </Button>
              )}
            </div>

            <div className="flex items-center space-x-2">
              {/* Copy to Clipboard Button */}
              <Button
                variant="outline"
                onClick={handleCopyToClipboard}
                disabled={copying || !bodyText.trim()}
                title="Antwort in Zwischenablage kopieren"
              >
                {copying ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Kopiere...
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Antwort kopieren
                  </>
                )}
              </Button>

              {/* Open in Email Client Button (Primary for IMAP, Secondary for Gmail/M365) */}
              <Button
                onClick={handleOpenInEmailClient}
                disabled={!canEdit || !to.trim() || !subject.trim() || !bodyText.trim()}
                className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Im E-Mail-Client öffnen
              </Button>

              {/* Backend Send Button (only for Gmail/M365) */}
              {(reply.provider === 'gmail' || reply.provider === 'm365') && (
                <Button
                  onClick={handleSend}
                  disabled={!canSend}
                  className="bg-[#058bc0] hover:bg-[#047299]"
                >
                  {sending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Wird gesendet...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Direkt senden
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default EmailReplyComposer;





