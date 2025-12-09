import React, { useEffect, useMemo, useState } from 'react';
import AppHeader from '@/components/AppHeader';
import { useAuth } from '@/contexts/AuthContext';
import { templateService } from '@/services/templateService';
import { Template } from '@/types/templates';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Edit, Eye, Copy, CheckCircle2, XCircle, FileText } from 'lucide-react';

interface TemplateListProps {
	onBack?: () => void;
	onEditTemplate?: (id: string) => void;
	onOpenMessaging?: () => void;
}

const TemplateList: React.FC<TemplateListProps> = ({ onBack, onEditTemplate, onOpenMessaging }) => {
	const { user } = useAuth();
	const concernID = user?.concernID || '';
	const canEdit = user?.role === 'admin' || user?.role === 'office';
	const [templates, setTemplates] = useState<Template[]>([]);
	const [filter, setFilter] = useState('');
	const [isLoading, setIsLoading] = useState(true);

	const load = async () => {
		if (!concernID) return;
		setIsLoading(true);
		try {
			const list = await templateService.list(concernID);
			setTemplates(list);
		} catch (error) {
			console.error('Fehler beim Laden der Vorlagen:', error);
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		load();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [concernID]);

	const filtered = useMemo(() => {
		const f = filter.toLowerCase();
		return templates.filter((t) =>
			[t.name, t.type, t.locale, t.version?.toString(), t.useFor].some((x) => String(x).toLowerCase().includes(f))
		);
	}, [templates, filter]);

	const handleDuplicate = async (id: string) => {
		if (!user?.uid) return;
		try {
			await templateService.duplicate(id, user.uid);
			await load();
		} catch (error) {
			console.error('Fehler beim Duplizieren:', error);
		}
	};

	const handleActive = async (id: string, active: boolean) => {
		try {
			await templateService.setActive(id, active);
			await load();
		} catch (error) {
			console.error('Fehler beim Aktivieren/Deaktivieren:', error);
		}
	};

	const formatDate = (dateString?: string) => {
		if (!dateString) return '-';
		try {
			const date = new Date(dateString);
			return date.toLocaleDateString('de-DE', { 
				year: 'numeric', 
				month: '2-digit', 
				day: '2-digit' 
			});
		} catch {
			return dateString.split('T')[0];
		}
	};

	return (
		<div className="min-h-screen tradetrackr-gradient-blue">
			<AppHeader 
				title="Vorlagen" 
				showBackButton 
				onBack={onBack}
				onOpenMessaging={onOpenMessaging}
			/>
			<main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
				{/* Header Section */}
				<div className="mb-6">
					<div className="flex items-center justify-between flex-wrap gap-4">
						<div>
							<h1 className="text-3xl font-bold text-gray-900 mb-2">
								Vorlagen-Verwaltung
							</h1>
							<p className="text-gray-600">
								Erstellen und verwalten Sie Dokumentenvorlagen für Berichte und andere Dokumente
							</p>
						</div>
						{canEdit && (
							<Button 
								onClick={() => onEditTemplate && onEditTemplate('new')}
								className="bg-[#058bc0] hover:bg-[#047aa0] text-white"
							>
								<Plus className="h-5 w-5 mr-2" />
								Neue Vorlage
							</Button>
						)}
					</div>
				</div>

				{/* Search and Filter */}
				<Card className="mb-6 shadow-lg border-2">
					<CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg">
						<CardTitle className="flex items-center gap-2">
							<FileText className="h-5 w-5" />
							Vorlagen durchsuchen
						</CardTitle>
					</CardHeader>
					<CardContent className="pt-6">
						<div className="relative">
							<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
							<Input 
								placeholder="Nach Name, Typ, Locale oder Version suchen..." 
								value={filter} 
								onChange={(e) => setFilter(e.target.value)}
								className="pl-10"
							/>
						</div>
						{filter && (
							<div className="mt-2 text-sm text-gray-600">
								{filtered.length} von {templates.length} Vorlagen gefunden
							</div>
						)}
					</CardContent>
				</Card>

				{/* Templates Table */}
				<Card className="shadow-lg border-2">
					<CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg">
						<CardTitle className="flex items-center justify-between">
							<span className="flex items-center gap-2">
								<FileText className="h-5 w-5" />
								Vorlagen ({filtered.length})
							</span>
						</CardTitle>
					</CardHeader>
					<CardContent className="p-0">
						{isLoading ? (
							<div className="py-12 text-center">
								<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
								<p className="mt-4 text-gray-600">Lade Vorlagen...</p>
							</div>
						) : filtered.length === 0 ? (
							<div className="py-12 text-center">
								<FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
								<p className="text-gray-600 text-lg mb-2">
									{filter ? 'Keine Vorlagen gefunden' : 'Keine Vorlagen vorhanden'}
								</p>
								{!filter && canEdit && (
									<Button 
										onClick={() => onEditTemplate && onEditTemplate('new')}
										className="mt-4 bg-[#058bc0] hover:bg-[#047aa0] text-white"
									>
										<Plus className="h-5 w-5 mr-2" />
										Erste Vorlage erstellen
									</Button>
								)}
							</div>
						) : (
							<div className="overflow-x-auto">
								<Table>
									<TableHeader>
										<TableRow className="bg-gray-100">
											<TableHead className="font-semibold">Name</TableHead>
											<TableHead className="font-semibold">Typ</TableHead>
											<TableHead className="font-semibold">Verwendung</TableHead>
											<TableHead className="font-semibold">Sprache</TableHead>
											<TableHead className="font-semibold">Status</TableHead>
											<TableHead className="font-semibold">Version</TableHead>
											<TableHead className="font-semibold">Aktualisiert</TableHead>
											<TableHead className="text-right font-semibold">Aktionen</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{filtered.map((t) => (
											<TableRow key={t.id} className="hover:bg-gray-50">
												<TableCell className="font-medium">{t.name || '-'}</TableCell>
												<TableCell>
													<Badge variant="outline">{t.type || '-'}</Badge>
												</TableCell>
												<TableCell>{t.useFor || '-'}</TableCell>
												<TableCell>
													<Badge variant="secondary">{t.locale || '-'}</Badge>
												</TableCell>
												<TableCell>
													{t.active ? (
														<Badge className="bg-green-500 text-white flex items-center gap-1 w-fit">
															<CheckCircle2 className="h-3 w-3" />
															Aktiv
														</Badge>
													) : (
														<Badge variant="outline" className="flex items-center gap-1 w-fit">
															<XCircle className="h-3 w-3" />
															Inaktiv
														</Badge>
													)}
												</TableCell>
												<TableCell>
													<Badge variant="secondary">{t.version || '-'}</Badge>
												</TableCell>
												<TableCell className="text-gray-600">
													{formatDate(t.updatedAt)}
												</TableCell>
												<TableCell className="text-right">
													<div className="flex gap-2 justify-end">
														<Button 
															size="sm" 
															variant="outline" 
															onClick={() => onEditTemplate && onEditTemplate(t.id)}
															aria-label="Bearbeiten"
														>
															<Edit className="h-4 w-4 mr-1" />
															Bearbeiten
														</Button>
														<Button 
															size="sm" 
															variant="outline" 
															onClick={() => window.open(`/preview/template/${t.id}`, '_blank')}
															aria-label="Vorschau"
														>
															<Eye className="h-4 w-4 mr-1" />
															Vorschau
														</Button>
														{canEdit && (
															<>
																<Button 
																	size="sm" 
																	variant="outline" 
																	onClick={() => handleDuplicate(t.id)}
																	aria-label="Duplizieren"
																>
																	<Copy className="h-4 w-4 mr-1" />
																	Duplizieren
																</Button>
																<Button 
																	size="sm" 
																	variant={t.active ? "outline" : "default"}
																	onClick={() => handleActive(t.id, !t.active)}
																	className={t.active ? "" : "bg-[#058bc0] hover:bg-[#047aa0] text-white"}
																	aria-label={t.active ? "Deaktivieren" : "Aktivieren"}
																>
																	{t.active ? (
																		<>
																			<XCircle className="h-4 w-4 mr-1" />
																			Deaktivieren
																		</>
																	) : (
																		<>
																			<CheckCircle2 className="h-4 w-4 mr-1" />
																			Aktivieren
																		</>
																	)}
																</Button>
															</>
														)}
													</div>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</div>
						)}
					</CardContent>
				</Card>
			</main>
		</div>
	);
};

export default TemplateList;
