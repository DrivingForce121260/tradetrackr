import React, { useEffect, useMemo, useState } from 'react';
import AppHeader from '@/components/AppHeader';
import { useAuth } from '@/contexts/AuthContext';
import { templateService } from '@/services/templateService';
import { Template } from '@/types/templates';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
	Save, 
	X, 
	Upload, 
	Eye, 
	FileText, 
	Palette, 
	Globe, 
	Type, 
	Code, 
	Image,
	CheckCircle2,
	AlertCircle,
	ArrowLeft
} from 'lucide-react';

interface TemplateEditorProps {
	templateId?: string; // 'new' or existing id
	onBack?: () => void;
	onOpenMessaging?: () => void;
}

const SAMPLE_DATA: any = {
	client: { name: 'Muster GmbH', address: 'Hauptstr. 1, 10115 Berlin', email: 'kunde@example.com' },
	invoice: { number: '2025-0001', issueDate: '2025-10-30', dueDate: '2025-11-30', total: 1234.56 },
	offer: { number: 'A-2025-001' },
	order: { number: 'O-2025-001' },
};

const DEFAULT_HTML = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: Arial, sans-serif; color: #111; padding: 20px; }
    h1 { color: var(--primary, #058bc0); }
    .footer { color: #666; font-size: 12px; margin-top: 24px; border-top:1px solid #eee; padding-top: 8px; }
  </style>
  <title>{{document.title}}</title>
</head>
<body>
  <img src="{{branding.logoUrl}}" alt="Logo" style="height: 40px;" />
  <h1>{{document.title}} {{invoice.number}}</h1>
  <div>{{client.name}}</div>
  <div>{{client.address}}</div>
  <div>Summe: {{invoice.total}}</div>
  <div class="footer">{{branding.footerText}}</div>
</body>
</html>`;

const TemplateEditor: React.FC<TemplateEditorProps> = ({ templateId, onBack, onOpenMessaging }) => {
	const { user } = useAuth();
	const { toast } = useToast();
	const concernID = user?.concernID || '';
	const canEdit = user?.role === 'admin' || user?.role === 'office';
	const isNew = !templateId || templateId === 'new';

	const [model, setModel] = useState<Partial<Template>>({
		name: '',
		type: 'pdf',
		locale: 'de',
		htmlBody: DEFAULT_HTML,
		placeholders: ['client.name', 'invoice.number'],
		colorPrimary: '#058bc0',
		footerText: 'Rechtlicher Hinweis...',
		active: false,
	});
	const [logoFile, setLogoFile] = useState<File | null>(null);
	const [saving, setSaving] = useState(false);
	const [loading, setLoading] = useState(false);
	const [logoUploading, setLogoUploading] = useState(false);

	useEffect(() => {
		const load = async () => {
			if (isNew || !templateId) return;
			setLoading(true);
			try {
				const t = await templateService.get(templateId);
				if (t) setModel(t);
			} catch (error) {
				console.error('Fehler beim Laden der Vorlage:', error);
				toast({
					title: 'Fehler',
					description: 'Vorlage konnte nicht geladen werden',
					variant: 'destructive',
				});
			} finally {
				setLoading(false);
			}
		};
		load();
	}, [isNew, templateId, toast]);

	const mergedPreviewHtml = useMemo(() => {
		const html = model.htmlBody || '';
		const branding = {
			logoUrl: model.logoUrl || '',
			footerText: model.footerText || '',
			colorPrimary: model.colorPrimary || '#058bc0',
		};
		const data = { ...SAMPLE_DATA, branding, document: { title: model.type === 'pdf' ? 'Dokument' : 'E-Mail' } };
		// Very simple placeholder replacement {{path.to.key}}
		return html.replace(/\{\{([^}]+)\}\}/g, (_, key: string) => {
			const path = key.trim().split('.');
			let cur: any = data;
			for (const p of path) cur = cur?.[p];
			if (cur === undefined || cur === null) return '';
			return String(cur);
		});
	}, [model]);

	const handleUploadLogo = async () => {
		if (!logoFile || !concernID) return;
		setLogoUploading(true);
		try {
			const url = await templateService.uploadLogo(concernID, logoFile);
			setModel((m) => ({ ...m, logoUrl: url }));
			toast({
				title: 'Erfolg',
				description: 'Logo erfolgreich hochgeladen',
				variant: 'default',
			});
			setLogoFile(null);
		} catch (error) {
			console.error('Fehler beim Hochladen des Logos:', error);
			toast({
				title: 'Fehler',
				description: 'Logo konnte nicht hochgeladen werden',
				variant: 'destructive',
			});
		} finally {
			setLogoUploading(false);
		}
	};

	const handleSave = async () => {
		if (!concernID || !user?.uid) return;
		if (!model.name?.trim()) {
			toast({
				title: 'Validierungsfehler',
				description: 'Bitte geben Sie einen Namen für die Vorlage ein',
				variant: 'destructive',
			});
			return;
		}
		setSaving(true);
		try {
			if (isNew) {
				const id = await templateService.create({
					concernID,
					userUid: user.uid,
					data: {
						concernID,
						name: model.name || 'Unbenannt',
						type: (model.type as any) || 'pdf',
						locale: (model.locale as any) || 'de',
						htmlBody: model.htmlBody || DEFAULT_HTML,
						placeholders: model.placeholders || [],
						logoUrl: model.logoUrl,
						colorPrimary: model.colorPrimary,
						footerText: model.footerText,
						useFor: (model as any).useFor || 'invoice',
						active: Boolean(model.active),
					},
				});
				toast({
					title: 'Erfolg',
					description: 'Vorlage erfolgreich erstellt',
					variant: 'default',
				});
				if (onBack) onBack();
			} else {
				await templateService.update(templateId!, user.uid, {
					name: model.name,
					locale: model.locale as any,
					colorPrimary: model.colorPrimary,
					footerText: model.footerText,
					htmlBody: model.htmlBody,
					logoUrl: model.logoUrl,
					placeholders: model.placeholders,
					useFor: (model as any).useFor,
				});
				toast({
					title: 'Erfolg',
					description: 'Vorlage erfolgreich aktualisiert',
					variant: 'default',
				});
				if (onBack) onBack();
			}
		} catch (error) {
			console.error('Fehler beim Speichern:', error);
			toast({
				title: 'Fehler',
				description: 'Vorlage konnte nicht gespeichert werden',
				variant: 'destructive',
			});
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="min-h-screen tradetrackr-gradient-blue">
			<AppHeader 
				title={isNew ? "Neue Vorlage erstellen" : "Vorlage bearbeiten"} 
				showBackButton 
				onBack={onBack}
				onOpenMessaging={onOpenMessaging}
			/>
			<main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
				{loading ? (
					<Card>
						<CardContent className="py-12 text-center">
							<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
							<p className="mt-4 text-gray-600">Lade Vorlage...</p>
						</CardContent>
					</Card>
				) : (
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
						{/* Editor Section */}
						<div className="space-y-6">
							<Card className="shadow-lg border-2">
								<CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg">
									<CardTitle className="flex items-center gap-2">
										<FileText className="h-5 w-5" />
										Vorlagen-Einstellungen
									</CardTitle>
								</CardHeader>
								<CardContent className="pt-6 space-y-6">
									{/* Basic Information */}
									<div className="space-y-4">
										<h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
											<Type className="h-5 w-5 text-blue-600" />
											Grundinformationen
										</h3>
										<div className="space-y-3">
											<div>
												<Label htmlFor="name" className="text-sm font-medium">
													Name der Vorlage <span className="text-red-500">*</span>
												</Label>
												<Input 
													id="name"
													value={model.name || ''} 
													onChange={(e) => setModel({ ...model, name: e.target.value })}
													placeholder="z.B. Rechnung Standard"
													className="mt-1"
												/>
											</div>
											<div className="grid grid-cols-3 gap-3">
												<div>
													<Label className="text-sm font-medium flex items-center gap-1">
														<FileText className="h-4 w-4" />
														Typ
													</Label>
													<Select 
														value={(model.type as any) || 'pdf'} 
														onValueChange={(v) => setModel({ ...model, type: v as any })}
													>
														<SelectTrigger className="mt-1">
															<SelectValue placeholder="Typ" />
														</SelectTrigger>
														<SelectContent>
															<SelectItem value="pdf">PDF</SelectItem>
															<SelectItem value="email">E-Mail</SelectItem>
														</SelectContent>
													</Select>
												</div>
												<div>
													<Label className="text-sm font-medium flex items-center gap-1">
														<Globe className="h-4 w-4" />
														Sprache
													</Label>
													<Select 
														value={(model.locale as any) || 'de'} 
														onValueChange={(v) => setModel({ ...model, locale: v as any })}
													>
														<SelectTrigger className="mt-1">
															<SelectValue placeholder="Sprache" />
														</SelectTrigger>
														<SelectContent>
															<SelectItem value="de">Deutsch</SelectItem>
															<SelectItem value="en">Englisch</SelectItem>
														</SelectContent>
													</Select>
												</div>
												<div>
													<Label className="text-sm font-medium">Verwendung</Label>
													<Select 
														value={(model as any).useFor || 'invoice'} 
														onValueChange={(v) => setModel({ ...model, useFor: v as any })}
													>
														<SelectTrigger className="mt-1">
															<SelectValue placeholder="Verwendung" />
														</SelectTrigger>
														<SelectContent>
															<SelectItem value="invoice">Rechnung</SelectItem>
															<SelectItem value="offer">Angebot</SelectItem>
															<SelectItem value="order">Auftrag</SelectItem>
															<SelectItem value="report">Bericht</SelectItem>
														</SelectContent>
													</Select>
												</div>
											</div>
										</div>
									</div>

									{/* Branding */}
									<div className="space-y-4">
										<h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
											<Palette className="h-5 w-5 text-blue-600" />
											Branding
										</h3>
										<div className="grid grid-cols-2 gap-3">
											<div>
												<Label htmlFor="colorPrimary" className="text-sm font-medium flex items-center gap-1">
													<Palette className="h-4 w-4" />
													Primärfarbe
												</Label>
												<div className="flex gap-2 mt-1">
													<Input 
														id="colorPrimary"
														type="color" 
														value={model.colorPrimary || '#058bc0'} 
														onChange={(e) => setModel({ ...model, colorPrimary: e.target.value })}
														className="w-20 h-10"
													/>
													<Input 
														value={model.colorPrimary || '#058bc0'} 
														onChange={(e) => setModel({ ...model, colorPrimary: e.target.value })}
														placeholder="#058bc0"
														className="flex-1"
													/>
												</div>
											</div>
											<div>
												<Label htmlFor="footerText" className="text-sm font-medium">
													Fußzeilentext
												</Label>
												<Input 
													id="footerText"
													value={model.footerText || ''} 
													onChange={(e) => setModel({ ...model, footerText: e.target.value })}
													placeholder="Rechtlicher Hinweis..."
													className="mt-1"
												/>
											</div>
										</div>
										<div>
											<Label className="text-sm font-medium flex items-center gap-1 mb-2">
												<Image className="h-4 w-4" />
												Logo
											</Label>
											<div className="flex items-center gap-3">
												<Input 
													type="file" 
													accept="image/*"
													onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
													className="flex-1"
												/>
												<Button 
													variant="outline" 
													onClick={handleUploadLogo} 
													disabled={!logoFile || logoUploading}
													className="flex items-center gap-2"
												>
													{logoUploading ? (
														<>
															<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
															Hochladen...
														</>
													) : (
														<>
															<Upload className="h-4 w-4" />
															Hochladen
														</>
													)}
												</Button>
												{model.logoUrl && (
													<a 
														className="text-blue-600 hover:text-blue-800 flex items-center gap-1" 
														href={model.logoUrl} 
														target="_blank" 
														rel="noreferrer"
													>
														<Eye className="h-4 w-4" />
														Ansehen
													</a>
												)}
											</div>
										</div>
									</div>

									{/* HTML Editor */}
									<div className="space-y-4">
										<div className="flex items-center justify-between">
											<Label className="text-lg font-semibold text-gray-900 flex items-center gap-2">
												<Code className="h-5 w-5 text-blue-600" />
												HTML-Vorlage
											</Label>
											<Badge variant="outline" className="text-xs">
												Verwenden Sie {'{{'}placeholder{'}}'} für Variablen
											</Badge>
										</div>
										<Textarea
											className="w-full h-[420px] font-mono text-sm border-2"
											value={model.htmlBody || ''}
											onChange={(e) => setModel({ ...model, htmlBody: e.target.value })}
											placeholder="HTML-Code hier eingeben..."
										/>
									</div>

									{/* Actions */}
									<div className="flex gap-3 pt-4 border-t">
										<Button 
											onClick={onBack} 
											variant="outline"
											className="flex items-center gap-2"
										>
											<ArrowLeft className="h-4 w-4" />
											Abbrechen
										</Button>
										{canEdit && (
											<Button 
												onClick={handleSave} 
												disabled={saving || !model.name?.trim()}
												className="bg-[#058bc0] hover:bg-[#047aa0] text-white flex items-center gap-2 flex-1"
											>
												{saving ? (
													<>
														<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
														Speichern...
													</>
												) : (
													<>
														<Save className="h-4 w-4" />
														{isNew ? 'Vorlage erstellen' : 'Änderungen speichern'}
													</>
												)}
											</Button>
										)}
									</div>
								</CardContent>
							</Card>
						</div>

						{/* Preview Section */}
						<div className="space-y-6">
							<Card className="shadow-lg border-2 sticky top-6">
								<CardHeader className="bg-gradient-to-r from-green-600 to-green-700 text-white rounded-t-lg">
									<CardTitle className="flex items-center gap-2">
										<Eye className="h-5 w-5" />
										Live-Vorschau
									</CardTitle>
								</CardHeader>
								<CardContent className="p-0">
									<div className="relative">
										<iframe 
											title="preview" 
											className="w-full h-[700px] border-0" 
											srcDoc={mergedPreviewHtml}
											sandbox="allow-same-origin"
										/>
										<div className="absolute top-2 right-2">
											<Badge className="bg-green-500 text-white">
												<CheckCircle2 className="h-3 w-3 mr-1" />
												Live
											</Badge>
										</div>
									</div>
								</CardContent>
							</Card>

							{/* Placeholders Info */}
							<Card className="shadow-lg border-2">
								<CardHeader className="bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-t-lg">
									<CardTitle className="flex items-center gap-2">
										<Code className="h-5 w-5" />
										Verfügbare Platzhalter
									</CardTitle>
								</CardHeader>
								<CardContent className="pt-6">
									<div className="space-y-2 text-sm">
										<div className="font-semibold text-gray-900 mb-3">Kundeninformationen:</div>
										<div className="grid grid-cols-1 gap-2">
											<code className="bg-gray-100 px-2 py-1 rounded">client.name</code>
											<code className="bg-gray-100 px-2 py-1 rounded">client.address</code>
											<code className="bg-gray-100 px-2 py-1 rounded">client.email</code>
										</div>
										<div className="font-semibold text-gray-900 mt-4 mb-3">Dokumentinformationen:</div>
										<div className="grid grid-cols-1 gap-2">
											<code className="bg-gray-100 px-2 py-1 rounded">invoice.number</code>
											<code className="bg-gray-100 px-2 py-1 rounded">invoice.total</code>
											<code className="bg-gray-100 px-2 py-1 rounded">invoice.issueDate</code>
											<code className="bg-gray-100 px-2 py-1 rounded">invoice.dueDate</code>
										</div>
										<div className="font-semibold text-gray-900 mt-4 mb-3">Branding:</div>
										<div className="grid grid-cols-1 gap-2">
											<code className="bg-gray-100 px-2 py-1 rounded">branding.logoUrl</code>
											<code className="bg-gray-100 px-2 py-1 rounded">branding.footerText</code>
											<code className="bg-gray-100 px-2 py-1 rounded">branding.colorPrimary</code>
										</div>
									</div>
								</CardContent>
							</Card>
						</div>
					</div>
				)}
			</main>
		</div>
	);
};

export default TemplateEditor;
