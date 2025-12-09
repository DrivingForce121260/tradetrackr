import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { EmailService } from '@/services/emailService';
import { templateService } from '@/services/templateService';
import { useToast } from '@/hooks/use-toast';
import type { SendEmailRequest, EmailDocumentType } from '@/types/email';
import type { Template } from '@/types/templates';
import { Paperclip } from 'lucide-react';

interface SendEmailModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	documentId: string;
	documentType: EmailDocumentType;
	documentData?: Record<string, any>; // For template placeholders
	onSent?: () => void;
}

export const SendEmailModal: React.FC<SendEmailModalProps> = ({
	open,
	onOpenChange,
	documentId,
	documentType,
	documentData = {},
	onSent,
}) => {
	const { user } = useAuth();
	const { toast } = useToast();
	const [service, setService] = useState<EmailService | null>(null);
	const [templates, setTemplates] = useState<Template[]>([]);
	const [loading, setLoading] = useState(false);
	const [recipient, setRecipient] = useState('');
	const [subject, setSubject] = useState('');
	const [body, setBody] = useState('');
	const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
	const [attachments, setAttachments] = useState<Array<{ name: string; url: string }>>([]);
	const [includePdf, setIncludePdf] = useState(true);

	useEffect(() => {
		if (user) {
			setService(new EmailService(user));
		}
	}, [user]);

	// Auto-generate PDF attachment if needed
	useEffect(() => {
		const generatePdfAttachment = async () => {
			if (!includePdf || !user?.concernID || !documentId || !documentData || attachments.length > 0) return;
			
			try {
				const { renderWithTemplate } = await import('@/services/renderService');
				const { templateService } = await import('@/services/templateService');
				
				const locale = 'de';
				const useFor = documentType === 'invoice' ? 'invoice' : documentType === 'offer' ? 'offer' : 'order';
				const active = await templateService.getActive(user.concernID, 'pdf', locale, useFor as any);
				
				if (active) {
					const data = { ...documentData, branding: {} } as any;
					const res = await renderWithTemplate({
						concernID: user.concernID,
						templateId: active.id,
						data,
						output: 'pdf',
					});
					
					// Extract filename from URL or generate
					const fileName = `${documentType}_${documentId}.pdf`;
					setAttachments([{ name: fileName, url: res.url }]);
				}
			} catch (error) {
				console.error('Error generating PDF attachment:', error);
			}
		};
		
		if (open && includePdf) {
			generatePdfAttachment();
		}
	}, [open, includePdf, user, documentId, documentType, documentData]);

	useEffect(() => {
		const loadTemplates = async () => {
			if (!user?.concernID) return;
			const ts = await templateService.list(user.concernID, 'email', 'de');
			setTemplates(ts.filter((t) => t.active && (!t.useFor || t.useFor === documentType)));
		};
		if (open) {
			loadTemplates();
		}
	}, [open, user, documentType]);

	const handleTemplateChange = async (templateId: string) => {
		// Behandle "__none__" wie kein Template
		const actualTemplateId = templateId === '__none__' ? '' : templateId;
		setSelectedTemplateId(actualTemplateId);
		const tmpl = templates.find((t) => t.id === actualTemplateId);
		if (tmpl) {
			setSubject(tmpl.name);
		}
	};

	const handleSend = async () => {
		if (!service || !user?.concernID || !recipient.trim()) {
			toast({ title: 'Fehler', description: 'Bitte geben Sie eine E-Mail-Adresse ein', variant: 'destructive' });
			return;
		}

		setLoading(true);
		try {
			const request: SendEmailRequest & { concernID: string; locale?: 'de' | 'en' } = {
				documentId,
				documentType,
				recipient: recipient.trim(),
				templateId: selectedTemplateId || undefined,
				subject: subject || undefined,
				body: body || undefined,
				attachments,
				customData: documentData,
				concernID: user.concernID,
				locale: 'de',
			};

			await service.sendEmail(request);
			toast({ title: 'Erfolg', description: 'E-Mail wurde gesendet' });
			onOpenChange(false);
			if (onSent) onSent();
			// Reset form
			setRecipient('');
			setSubject('');
			setBody('');
			setSelectedTemplateId('');
			setAttachments([]);
		} catch (error: any) {
			toast({
				title: 'Fehler',
				description: error.message || 'E-Mail konnte nicht gesendet werden',
				variant: 'destructive',
			});
		} finally {
			setLoading(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>E-Mail senden</DialogTitle>
					<DialogDescription>
						{documentType === 'invoice' && 'Rechnung per E-Mail versenden'}
						{documentType === 'offer' && 'Angebot per E-Mail versenden'}
						{documentType === 'order' && 'Auftrag per E-Mail versenden'}
						{documentType === 'report' && 'Bericht per E-Mail versenden'}
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-4">
					<div>
						<Label>Empfänger</Label>
						<Input
							type="email"
							value={recipient}
							onChange={(e) => setRecipient(e.target.value)}
							placeholder="email@example.com"
							required
						/>
					</div>

					<div>
						<Label>Template (optional)</Label>
						<Select value={selectedTemplateId} onValueChange={handleTemplateChange}>
							<SelectTrigger>
								<SelectValue placeholder="Kein Template" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="__none__">Kein Template</SelectItem>
								{templates.map((t) => (
									<SelectItem key={t.id} value={t.id}>
										{t.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div>
						<Label>Betreff</Label>
						<Input
							value={subject}
							onChange={(e) => setSubject(e.target.value)}
							placeholder="z.B. Ihre Rechnung #123"
							required
						/>
					</div>

					<div>
						<Label>Nachricht (optional, wird durch Template überschrieben)</Label>
						<Textarea
							value={body}
							onChange={(e) => setBody(e.target.value)}
							rows={6}
							placeholder="Optionale Nachricht..."
						/>
					</div>

					<div>
						<Label>Anhänge</Label>
						<div className="text-sm text-gray-600 mb-2">
							PDF wird automatisch generiert und angehängt (max. 10 MB)
						</div>
						{attachments.length > 0 && (
							<div className="space-y-1">
								{attachments.map((att, idx) => (
									<div key={idx} className="flex items-center gap-2 text-sm">
										<Paperclip className="h-4 w-4" />
										<span>{att.name}</span>
										<Button
											variant="ghost"
											size="sm"
											onClick={() => setAttachments(attachments.filter((_, i) => i !== idx))}
										>
											Entfernen
										</Button>
									</div>
								))}
							</div>
						)}
					</div>

					<div className="flex justify-end gap-2 pt-4">
						<Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
							Abbrechen
						</Button>
						<Button onClick={handleSend} disabled={loading} className="bg-[#058bc0] hover:bg-[#047aa0] text-white">
							{loading ? 'Wird gesendet...' : 'Senden'}
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
};

