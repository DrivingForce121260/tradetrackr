/**
 * Email Detail Drawer Component
 * Displays full email details in a side drawer
 */

import React, { useEffect, useState } from 'react';
import { useEmailDetails, useEmailActions, useAttachmentDownload } from '@/hooks/useEmailIntelligence';
import { useAuth } from '@/contexts/AuthContext';
import { EmailSummaryStatus } from '@/types/email';
import { 
  getCategoryColor, 
  getCategoryLabel,
  getStatusLabel,
} from '@/services/emailIntelligenceService';
import { useToast } from '@/hooks/use-toast';
import { 
  X, 
  Calendar, 
  User, 
  Mail, 
  Paperclip,
  Download,
  AlertCircle,
  Loader2,
  Package,
} from 'lucide-react';

interface EmailDetailDrawerProps {
  emailId: string;
  onClose: () => void;
}

const EmailDetailDrawer: React.FC<EmailDetailDrawerProps> = ({ emailId, onClose }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { email, attachments, loading } = useEmailDetails(emailId);
  const { updateStatus, assignToUser } = useEmailActions();
  const { downloadAttachment, downloadAll, downloading } = useAttachmentDownload();
  const [selectedStatus, setSelectedStatus] = useState<EmailSummaryStatus>('open');

  useEffect(() => {
    // Close drawer on Escape key
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const handleStatusChange = async (status: EmailSummaryStatus) => {
    try {
      await updateStatus(emailId, status);
      setSelectedStatus(status);
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handleAssignToMe = async () => {
    try {
      await assignToUser(emailId, user?.uid || null);
      toast({
        title: '✅ Zugewiesen',
        description: 'E-Mail wurde Ihnen zugewiesen',
      });
    } catch (error) {
      console.error('Failed to assign email:', error);
      toast({
        title: '❌ Fehler',
        description: 'Zuweisung fehlgeschlagen',
        variant: 'destructive',
      });
    }
  };

  const handleDownloadAttachment = async (attachmentId: string, fileName: string) => {
    try {
      await downloadAttachment(attachmentId, fileName);
      toast({
        title: '✅ Download gestartet',
        description: fileName,
      });
    } catch (error) {
      console.error('Download failed:', error);
      toast({
        title: '❌ Download fehlgeschlagen',
        description: 'Bitte versuchen Sie es später erneut',
        variant: 'destructive',
      });
    }
  };

  const handleDownloadAll = async () => {
    try {
      const attachmentIds = attachments.map(a => a.id);
      await downloadAll(attachmentIds, email?.subject || 'email');
      toast({
        title: '✅ Downloads gestartet',
        description: `${attachments.length} Anhang${attachments.length > 1 ? 'e' : ''} wird heruntergeladen`,
      });
    } catch (error) {
      console.error('Batch download failed:', error);
      toast({
        title: '❌ Download fehlgeschlagen',
        description: 'Bitte versuchen Sie es später erneut',
        variant: 'destructive',
      });
    }
  };

  if (loading || !email) {
    return (
      <div className="fixed inset-y-0 right-0 w-full md:w-2/3 lg:w-1/2 bg-white shadow-xl z-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#058bc0]"></div>
      </div>
    );
  }

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 w-full md:w-2/3 lg:w-1/2 bg-white shadow-xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <Mail className="w-5 h-5 text-[#058bc0]" />
            <h2 className="text-lg font-bold text-gray-900">E-Mail Details</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {/* Category & Status */}
          <div className="flex items-center space-x-2 mb-4">
            {email.category && (
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getCategoryColor(email.category)}`}>
                {getCategoryLabel(email.category)}
              </span>
            )}
            {email.categoryConfidence && (
              <span className="text-xs text-gray-500">
                ({Math.round(email.categoryConfidence * 100)}% Sicherheit)
              </span>
            )}
          </div>

          {/* Subject */}
          <h3 className="text-xl font-bold text-gray-900 mb-4">
            {email.subject}
          </h3>

          {/* Meta Info */}
          <div className="space-y-2 mb-6 text-sm">
            <div className="flex items-start space-x-2">
              <User className="w-4 h-4 text-gray-500 mt-0.5" />
              <div>
                <span className="text-gray-600">Von:</span>{' '}
                <span className="text-gray-900 font-medium">{email.from}</span>
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <Mail className="w-4 h-4 text-gray-500 mt-0.5" />
              <div>
                <span className="text-gray-600">An:</span>{' '}
                <span className="text-gray-900">{email.to.join(', ')}</span>
              </div>
            </div>
            {email.cc.length > 0 && (
              <div className="flex items-start space-x-2">
                <Mail className="w-4 h-4 text-gray-500 mt-0.5" />
                <div>
                  <span className="text-gray-600">CC:</span>{' '}
                  <span className="text-gray-900">{email.cc.join(', ')}</span>
                </div>
              </div>
            )}
            <div className="flex items-start space-x-2">
              <Calendar className="w-4 h-4 text-gray-500 mt-0.5" />
              <div>
                <span className="text-gray-600">Empfangen:</span>{' '}
                <span className="text-gray-900">
                  {new Date(email.receivedAt).toLocaleDateString('de-DE', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Attachments */}
          {attachments.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Paperclip className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">
                    Anhänge ({attachments.length})
                  </span>
                </div>
                <button
                  onClick={handleDownloadAll}
                  disabled={downloading === 'all'}
                  className="flex items-center space-x-1 text-xs px-3 py-1 bg-[#058bc0] text-white rounded-lg hover:bg-[#046a8f] transition-colors disabled:opacity-50"
                >
                  {downloading === 'all' ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Package className="w-3 h-3" />
                  )}
                  <span>Alle herunterladen</span>
                </button>
              </div>
              <div className="space-y-2">
                {attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-[#058bc0] transition-colors"
                  >
                    <div className="flex items-center space-x-3 flex-1">
                      <div className="p-2 bg-white rounded border border-gray-200">
                        <Paperclip className="w-4 h-4 text-[#058bc0]" />
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">
                          {attachment.fileName}
                        </div>
                        <div className="text-xs text-gray-500">
                          {attachment.mimeType}
                          {attachment.docType && (
                            <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                              {attachment.docType}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDownloadAttachment(attachment.id, attachment.fileName)}
                      disabled={downloading === attachment.id}
                      className="p-2 hover:bg-[#058bc0] hover:text-white text-[#058bc0] rounded-lg transition-colors disabled:opacity-50"
                      title={`${attachment.fileName} herunterladen`}
                    >
                      {downloading === attachment.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Email Body */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Nachricht:</h4>
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              {email.bodyHtml ? (
                <div 
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: email.bodyHtml }}
                />
              ) : (
                <div className="whitespace-pre-wrap text-sm text-gray-700">
                  {email.bodyText}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="border-t border-gray-200 pt-6">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Aktionen:</h4>
            
            {/* Status Change */}
            <div className="mb-4">
              <label className="block text-sm text-gray-600 mb-2">Status ändern:</label>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleStatusChange('open')}
                  className="flex-1 px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg hover:bg-yellow-200 font-medium transition-colors"
                >
                  Offen
                </button>
                <button
                  onClick={() => handleStatusChange('in_progress')}
                  className="flex-1 px-4 py-2 bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200 font-medium transition-colors"
                >
                  In Bearbeitung
                </button>
                <button
                  onClick={() => handleStatusChange('done')}
                  className="flex-1 px-4 py-2 bg-green-100 text-green-800 rounded-lg hover:bg-green-200 font-medium transition-colors"
                >
                  Erledigt
                </button>
              </div>
            </div>

            {/* Assign to Me */}
            <button
              onClick={handleAssignToMe}
              className="w-full px-4 py-2 bg-[#058bc0] text-white rounded-lg hover:bg-[#046a8f] font-medium transition-colors"
            >
              Mir zuweisen
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default EmailDetailDrawer;

