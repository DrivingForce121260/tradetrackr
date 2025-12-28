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
import { Paperclip, Send, X, FileText, Mail, Loader2, CheckCircle, ExternalLink } from 'lucide-react';
import { openMailtoUrl, copyToClipboard } from '@/utils/mailto';

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
	const [pdfStatus, setPdfStatus] = useState<'idle' | 'loading' | 'success' | 'error' | 'skipped'>('idle');
	const [pdfError, setPdfError] = useState<string | null>(null);

	useEffect(() => {
		if (user) {
			setService(new EmailService(user));
		}
	}, [user]);

	// Reset state when modal opens
	useEffect(() => {
		if (open) {
			setAttachments([]);
			setPdfStatus('idle');
			setPdfError(null);
			// Pre-fill recipient from document data if available
			if (documentData?.client?.billingAddress?.email) {
				setRecipient(documentData.client.billingAddress.email);
			} else if (documentData?.offer?.clientSnapshot?.billingAddress?.email) {
				setRecipient(documentData.offer.clientSnapshot.billingAddress.email);
			}
			// Pre-fill subject with document info
			const docNum = documentData?.offer?.number || documentData?.invoice?.number || documentId;
			if (docNum) {
				const docLabel = documentType === 'offer' ? 'Angebot' : documentType === 'invoice' ? 'Rechnung' : 'Auftrag';
				setSubject(`${docLabel} ${docNum}`);
			}
		}
	}, [open, documentData, documentId, documentType]);

	// Auto-generate PDF attachment if needed
	// Note: PDF generation is currently disabled due to missing templates/infrastructure
	// Users can send emails without PDF attachments for now
	useEffect(() => {
		const checkPdfAvailability = async () => {
			if (!includePdf || !user?.concernID || !documentId) return;
			
			// For now, skip PDF generation as it requires server-side infrastructure
			// that may not be fully configured (templates, Cloud Functions)
			setPdfStatus('skipped');
			setPdfError('PDF-Anhang momentan nicht verfügbar. E-Mail wird ohne Anhang gesendet.');
		};
		
		if (open && includePdf && pdfStatus === 'idle') {
			checkPdfAvailability();
		}
	}, [open, includePdf, user, documentId, documentType, documentData, pdfStatus]);

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

	// Build email body with document details
	const buildEmailBody = (): string => {
		if (body.trim()) return body;
		
		// Generate default body based on document type
		const docNum = documentData?.offer?.number || documentData?.invoice?.number || documentId;
		const clientName = documentData?.offer?.clientSnapshot?.name || 
			documentData?.client?.name || 
			documentData?.clientSnapshot?.name || 
			'';
		
		const docLabel = documentType === 'offer' ? 'Angebot' : documentType === 'invoice' ? 'Rechnung' : 'Auftrag';
		
		let generatedBody = `Sehr geehrte Damen und Herren,\n\n`;
		if (clientName) {
			generatedBody = `Sehr geehrte/r ${clientName},\n\n`;
		}
		
		generatedBody += `anbei erhalten Sie ${documentType === 'offer' ? 'unser' : 'Ihre'} ${docLabel}`;
		if (docNum) generatedBody += ` Nr. ${docNum}`;
		generatedBody += '.\n\n';
		
		// Add offer/invoice details if available
		if (documentData?.offer?.totals?.grandTotalGross) {
			generatedBody += `Gesamtbetrag: ${documentData.offer.totals.grandTotalGross.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €\n\n`;
		}
		
		if (documentType === 'offer') {
			generatedBody += 'Wir freuen uns auf Ihre Rückmeldung und stehen für Rückfragen gerne zur Verfügung.\n\n';
		} else if (documentType === 'invoice') {
			generatedBody += 'Bitte überweisen Sie den Betrag innerhalb der angegebenen Zahlungsfrist.\n\n';
		}
		
		generatedBody += 'Mit freundlichen Grüßen\n';
		generatedBody += user?.displayName || user?.vorname || 'Ihr Team';
		
		return generatedBody;
	};

	// Handle opening in user's email client
	const handleOpenInEmailClient = async () => {
		if (!recipient.trim()) {
			toast({ title: 'Fehler', description: 'Bitte geben Sie eine E-Mail-Adresse ein', variant: 'destructive' });
			return;
		}

		const emailSubject = subject.trim() || `${config.label} ${documentData?.offer?.number || documentData?.invoice?.number || documentId}`;
		const emailBody = buildEmailBody();

		try {
			// Build mailto URL directly without Re: prefix (this is not a reply)
			const sanitizedBody = emailBody.trim();
			const MAX_MAILTO_BODY_LEN = 1800;
			const bodyTruncated = sanitizedBody.length > MAX_MAILTO_BODY_LEN;
			const mailtoBody = bodyTruncated 
				? 'E-Mail-Text wurde in die Zwischenablage kopiert. Bitte hier einfügen.'
				: sanitizedBody;
			
			// Build mailto URL manually to avoid Re: prefix
			const params = [
				`subject=${encodeURIComponent(emailSubject)}`,
				`body=${encodeURIComponent(mailtoBody)}`,
			];
			const mailtoUrl = `mailto:${encodeURIComponent(recipient.trim())}?${params.join('&')}`;

			// If body was truncated, copy full text to clipboard
			if (bodyTruncated) {
				const copied = await copyToClipboard(sanitizedBody);
				if (copied) {
					toast({
						title: '📋 Text wurde kopiert',
						description: 'Der vollständige E-Mail-Text wurde in die Zwischenablage kopiert.',
					});
				}
			}

			// Open email client
			openMailtoUrl(mailtoUrl);

			toast({
				title: '✅ E-Mail-Client geöffnet',
				description: 'Ihre Standard-E-Mail-Anwendung wurde geöffnet. Bitte fügen Sie ggf. das PDF manuell als Anhang hinzu.',
			});

			onOpenChange(false);
			if (onSent) onSent();
		} catch (error: any) {
			console.error('Open email client error:', error);
			toast({
				title: 'Fehler',
				description: error.message || 'E-Mail-Client konnte nicht geöffnet werden',
				variant: 'destructive',
			});
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
				body: body || buildEmailBody(),
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
			// If server-side sending fails, offer to open in email client
			toast({
				title: 'Server-Versand fehlgeschlagen',
				description: 'Möchten Sie die E-Mail stattdessen in Ihrem E-Mail-Client öffnen?',
				variant: 'destructive',
			});
		} finally {
			setLoading(false);
		}
	};

	// Document type config for visual styling
	const docTypeConfig: Record<EmailDocumentType, { icon: string; color: string; gradient: string; label: string }> = {
		invoice: { icon: '🧾', color: 'emerald', gradient: 'from-emerald-500 to-teal-600', label: 'Rechnung' },
		offer: { icon: '📝', color: 'blue', gradient: 'from-blue-500 to-indigo-600', label: 'Angebot' },
		order: { icon: '📋', color: 'purple', gradient: 'from-purple-500 to-violet-600', label: 'Auftrag' },
		report: { icon: '📊', color: 'amber', gradient: 'from-amber-500 to-orange-600', label: 'Bericht' },
	};
	const config = docTypeConfig[documentType] || docTypeConfig.offer;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden p-0 border-0 shadow-2xl rounded-2xl">
				{/* Header with gradient */}
				<div className={`bg-gradient-to-r ${config.gradient} px-6 py-5 text-white`}>
					<DialogHeader>
						<div className="flex items-center gap-3">
							<div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-2xl backdrop-blur-sm">
								{config.icon}
							</div>
							<div>
								<DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
									<Mail className="h-5 w-5" />
									E-Mail senden
								</DialogTitle>
								<DialogDescription className="text-white/80 mt-1">
									{config.label} per E-Mail versenden
								</DialogDescription>
							</div>
						</div>
					</DialogHeader>
				</div>

				{/* Content */}
				<div className="p-6 space-y-5 overflow-y-auto max-h-[60vh] bg-gradient-to-b from-gray-50 to-white">
					{/* Recipient Field */}
					<div className="space-y-2">
						<Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
							<span className="text-lg">📧</span> Empfänger
						</Label>
						<Input
							type="email"
							value={recipient}
							onChange={(e) => setRecipient(e.target.value)}
							placeholder="kunde@beispiel.de"
							required
							className="h-12 text-base border-2 border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 rounded-xl font-medium"
						/>
					</div>

					{/* Template Selection */}
					<div className="space-y-2">
						<Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
							<span className="text-lg">📄</span> Template (optional)
						</Label>
						<Select value={selectedTemplateId} onValueChange={handleTemplateChange}>
							<SelectTrigger className="h-12 border-2 border-gray-200 focus:border-blue-400 rounded-xl font-medium">
								<SelectValue placeholder="Kein Template" />
							</SelectTrigger>
							<SelectContent className="rounded-xl border-2 border-gray-200">
								<SelectItem value="__none__" className="font-medium">Kein Template</SelectItem>
								{templates.map((t) => (
									<SelectItem key={t.id} value={t.id} className="font-medium">
										{t.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{/* Subject Field */}
					<div className="space-y-2">
						<Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
							<span className="text-lg">✏️</span> Betreff
						</Label>
						<Input
							value={subject}
							onChange={(e) => setSubject(e.target.value)}
							placeholder={`Ihr ${config.label} von TradeTrackr`}
							required
							className="h-12 text-base border-2 border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 rounded-xl font-medium"
						/>
					</div>

					{/* Message Body */}
					<div className="space-y-2">
						<Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
							<span className="text-lg">💬</span> Nachricht
							<span className="text-xs font-normal text-gray-400">(optional, wird durch Template überschrieben)</span>
						</Label>
						<Textarea
							value={body}
							onChange={(e) => setBody(e.target.value)}
							rows={5}
							placeholder="Guten Tag,

anbei erhalten Sie Ihr Dokument.

Mit freundlichen Grüßen"
							className="border-2 border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 rounded-xl font-medium resize-none"
						/>
					</div>

					{/* Attachments */}
					<div className="space-y-3">
						<Label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
							<span className="text-lg">📎</span> Anhänge
						</Label>
						<div className={`bg-white border-2 border-dashed rounded-xl p-4 transition-colors ${
							pdfStatus === 'error' ? 'border-red-300 bg-red-50/50' : 
							pdfStatus === 'success' ? 'border-emerald-300 bg-emerald-50/50' : 
							'border-gray-300'
						}`}>
							{/* PDF Status: Loading */}
							{pdfStatus === 'loading' && (
								<div className="flex flex-col items-center justify-center py-6">
									<div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center mb-4 animate-pulse">
										<FileText className="h-8 w-8 text-blue-500" />
									</div>
									<div className="flex items-center gap-2 text-blue-600 font-medium">
										<Loader2 className="h-5 w-5 animate-spin" />
										<span>PDF wird generiert...</span>
									</div>
									<p className="text-sm text-gray-500 mt-2">Dies kann einige Sekunden dauern</p>
								</div>
							)}

							{/* PDF Status: Success */}
							{pdfStatus === 'success' && attachments.length > 0 && (
								<div className="space-y-2">
									{attachments.map((att, idx) => (
										<div 
											key={idx} 
											className="flex items-center justify-between bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-200 rounded-xl px-4 py-3"
										>
											<div className="flex items-center gap-3">
												<div className="w-12 h-12 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl flex items-center justify-center shadow-md">
													<FileText className="h-6 w-6 text-white" />
												</div>
												<div>
													<div className="font-bold text-gray-900">{att.name}</div>
													<div className="text-sm text-emerald-600 flex items-center gap-1">
														<CheckCircle className="h-4 w-4" />
														PDF bereit zum Versand
													</div>
												</div>
											</div>
											<Button
												variant="ghost"
												size="sm"
												onClick={() => {
													setAttachments(attachments.filter((_, i) => i !== idx));
													setPdfStatus('skipped');
												}}
												className="text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
											>
												<X className="h-5 w-5" />
											</Button>
										</div>
									))}
								</div>
							)}

							{/* PDF Status: Error */}
							{pdfStatus === 'error' && (
								<div className="flex flex-col items-center justify-center py-4">
									<div className="w-14 h-14 bg-gradient-to-br from-red-100 to-rose-100 rounded-2xl flex items-center justify-center mb-3">
										<X className="h-7 w-7 text-red-500" />
									</div>
									<p className="text-red-600 font-medium text-center">PDF-Generierung fehlgeschlagen</p>
									<p className="text-sm text-gray-500 mt-1 text-center max-w-xs">{pdfError}</p>
									<div className="flex gap-2 mt-4">
										<Button
											variant="outline"
											size="sm"
											onClick={() => {
												setPdfStatus('idle');
												setAttachments([]);
											}}
											className="border-2 border-blue-300 text-blue-600 hover:bg-blue-50"
										>
											<Loader2 className="h-4 w-4 mr-1" /> Erneut versuchen
										</Button>
										<Button
											variant="outline"
											size="sm"
											onClick={() => setPdfStatus('skipped')}
											className="border-2 border-gray-300 text-gray-600 hover:bg-gray-50"
										>
											Ohne PDF fortfahren
										</Button>
									</div>
								</div>
							)}

							{/* PDF Status: Skipped (no template or user opted out) */}
							{(pdfStatus === 'skipped' || pdfStatus === 'idle') && attachments.length === 0 && pdfStatus !== 'loading' && pdfStatus !== 'error' && (
								<div className="flex flex-col items-center justify-center py-4">
									<div className="w-14 h-14 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mb-3">
										<FileText className="h-7 w-7 text-gray-400" />
									</div>
									<p className="text-gray-500 font-medium">Kein PDF-Anhang</p>
									{pdfError && <p className="text-sm text-amber-600 mt-1">{pdfError}</p>}
									<p className="text-sm text-gray-400 mt-1">E-Mail wird ohne Anhang gesendet</p>
									{pdfStatus === 'skipped' && (
										<Button
											variant="outline"
											size="sm"
											onClick={() => setPdfStatus('idle')}
											className="mt-3 border-2 border-blue-300 text-blue-600 hover:bg-blue-50"
										>
											<FileText className="h-4 w-4 mr-1" /> PDF generieren
										</Button>
									)}
								</div>
							)}
						</div>
					</div>
				</div>

				{/* Footer with Actions */}
				<div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 border-t-2 border-gray-200">
					{/* Info hint about email client */}
					<div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl">
						<p className="text-sm text-blue-700">
							<strong>💡 Tipp:</strong> Klicken Sie auf "Im E-Mail-Client öffnen", um die E-Mail in Ihrer bevorzugten E-Mail-Anwendung (Outlook, Thunderbird, etc.) zu öffnen. Dort können Sie das PDF manuell als Anhang hinzufügen.
						</p>
					</div>
					
					<div className="flex items-center justify-between">
						<div className="text-sm flex items-center gap-3">
							{pdfStatus === 'success' && attachments.length > 0 && (
								<div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
									<CheckCircle className="h-4 w-4" />
									<span className="font-medium">{attachments.length} PDF bereit</span>
								</div>
							)}
							{pdfStatus === 'loading' && (
								<div className="flex items-center gap-2 text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200">
									<Loader2 className="h-4 w-4 animate-spin" />
									<span className="font-medium">PDF wird erstellt...</span>
								</div>
							)}
							{(pdfStatus === 'skipped' || pdfStatus === 'error') && (
								<div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200">
									<FileText className="h-4 w-4" />
									<span className="font-medium">PDF manuell anhängen</span>
								</div>
							)}
						</div>
						<div className="flex items-center gap-3">
							<Button 
								variant="outline" 
								onClick={() => onOpenChange(false)} 
								disabled={loading}
								className="px-5 py-2.5 font-semibold border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-100 rounded-xl"
							>
								<X className="h-4 w-4 mr-2" />
								Abbrechen
							</Button>
							
							{/* Primary action: Open in email client */}
							<Button 
								onClick={handleOpenInEmailClient} 
								disabled={!recipient.trim()} 
								className={`px-6 py-2.5 font-bold text-white rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 bg-gradient-to-r ${config.gradient}`}
							>
								<ExternalLink className="h-4 w-4 mr-2" />
								Im E-Mail-Client öffnen
							</Button>
						</div>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
};

