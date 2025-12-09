import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Save, Lock, AlertCircle, Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

// Gesetzliche Aufbewahrungsfristen (Deutschland)
const LEGAL_RETENTION = {
	'invoices': { years: 10, reason: 'HGB §147, AO §147 - Geschäftsbriefe, Buchungsbelege', locked: true },
	'projects': { years: 10, reason: 'HGB §147 - Geschäftsunterlagen, Verträge', locked: true },
	'personnel': { years: 10, reason: 'Sozialversicherungsunterlagen, Lohnabrechnungen', locked: true },
	'timeEntries': { years: 6, reason: 'Arbeitszeiterfassung nach BAG-Urteil', locked: true },
	'clients': { years: 10, reason: 'Geschäftsbeziehungen, Verträge', locked: true },
	'auditLogs': { years: 2, reason: 'DSGVO Art. 5 - Integrität und Vertraulichkeit', locked: false },
	'materials': { years: 5, reason: 'Betriebliche Unterlagen', locked: false },
	'tasks': { years: 3, reason: 'Interne Dokumentation', locked: false },
};

const MODULES = Object.keys(LEGAL_RETENTION);

const RetentionSettings: React.FC = () => {
	const { user, hasPermission } = useAuth();
	const { toast } = useToast();
	const [rules, setRules] = useState<Record<string, number>>({});
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);

	const canEdit = hasPermission('admin');

	useEffect(() => { (async () => {
		if (!user?.concernID) return;
		const snap = await getDoc(doc(db, 'systemConfig', 'retentionRules'));
		if (snap.exists()) {
			setRules((snap.data() as any).rules || {});
		} else {
			const defaults: Record<string, number> = {};
			MODULES.forEach(m => { 
				defaults[m] = LEGAL_RETENTION[m as keyof typeof LEGAL_RETENTION]?.years || 5; 
			});
			setRules(defaults);
		}
		setLoading(false);
	})(); }, [user?.concernID]);

	const save = async () => {
		if (!user?.concernID || !canEdit) return;
		setSaving(true);
		try {
			await setDoc(doc(db, 'systemConfig', 'retentionRules'), { rules, updatedAt: new Date(), updatedBy: user.uid }, { merge: true });
			toast({ title: 'Gespeichert', description: 'Aufbewahrungsrichtlinien aktualisiert.' });
		} catch (e: any) {
			toast({ title: 'Fehler', description: e.message, variant: 'destructive' });
		} finally {
			setSaving(false);
		}
	};

	const getModuleName = (key: string): string => {
		const names: Record<string, string> = {
			'invoices': 'Rechnungen',
			'projects': 'Projekte',
			'personnel': 'Personal',
			'timeEntries': 'Zeiterfassung',
			'clients': 'Kunden',
			'auditLogs': 'Audit-Logs',
			'materials': 'Material',
			'tasks': 'Aufgaben'
		};
		return names[key] || key;
	};

	const getModuleEmoji = (key: string): string => {
		const emojis: Record<string, string> = {
			'invoices': '💶',
			'projects': '📁',
			'personnel': '👥',
			'timeEntries': '⏱️',
			'clients': '🏢',
			'auditLogs': '📋',
			'materials': '📦',
			'tasks': '✅'
		};
		return emojis[key] || '📄';
	};

	if (loading) return (
		<Card className="tradetrackr-card">
			<CardContent className="p-8 text-center">
				<div className="animate-spin rounded-full h-12 w-12 border-b-4 border-[#058bc0] mx-auto mb-4"></div>
				<p className="text-gray-600 font-medium">Lade Aufbewahrungsrichtlinien...</p>
			</CardContent>
		</Card>
	);

	return (
		<Card className="tradetrackr-card border-2 border-[#058bc0] shadow-xl overflow-hidden">
			<CardHeader className="bg-gradient-to-r from-[#058bc0] to-[#0470a0] text-white px-6 py-4">
				<CardTitle className="text-lg font-bold flex items-center gap-2">
					<span className="text-2xl">🗄️</span>
					Aufbewahrungsrichtlinien (DSGVO & HGB)
				</CardTitle>
			</CardHeader>
			<CardContent className="bg-gradient-to-br from-blue-50 to-cyan-50 p-6 space-y-6">
				{/* Information Box */}
				<div className="p-4 bg-gradient-to-br from-yellow-100 to-orange-100 rounded-lg border-2 border-yellow-400 shadow-sm">
					<div className="flex items-start gap-3">
						<AlertCircle className="h-5 w-5 text-yellow-800 mt-0.5" />
						<div>
							<p className="text-sm text-yellow-900 font-semibold mb-2">⚖️ Gesetzliche Aufbewahrungsfristen beachten!</p>
							<p className="text-xs text-yellow-800">
								Bestimmte Datentypen unterliegen gesetzlichen Aufbewahrungsfristen nach HGB und AO. 
								Diese sind mit 🔒 markiert und können nicht geändert werden.
							</p>
						</div>
					</div>
				</div>

				{/* Locked (Legal) Retention Periods */}
				<div className="space-y-3">
					<div className="flex items-center gap-2 mb-3">
						<Lock className="h-4 w-4 text-red-600" />
						<h3 className="font-semibold text-gray-900">🔒 Gesetzlich vorgeschrieben</h3>
					</div>
					{MODULES.filter(m => LEGAL_RETENTION[m as keyof typeof LEGAL_RETENTION]?.locked).map(m => {
						const info = LEGAL_RETENTION[m as keyof typeof LEGAL_RETENTION];
						return (
							<div key={m} className="p-4 bg-white rounded-lg border-2 border-red-200 shadow-sm">
								<div className="flex items-center justify-between mb-2">
									<div className="flex items-center gap-2">
										<span className="text-xl">{getModuleEmoji(m)}</span>
										<Label className="font-semibold text-gray-900">{getModuleName(m)}</Label>
										<Badge className="bg-red-100 text-red-800 border-0">
											<Lock className="h-3 w-3 mr-1" />
											Gesetzlich
										</Badge>
									</div>
									<div className="flex items-center gap-3">
										<Input
											type="number"
											value={info.years}
											disabled={true}
											className="w-20 text-center font-bold border-2 border-red-300 bg-red-50"
										/>
										<span className="text-sm text-gray-600 font-medium min-w-[50px]">Jahre</span>
									</div>
								</div>
								<div className="flex items-start gap-2 mt-2 p-2 bg-red-50 rounded">
									<Info className="h-4 w-4 text-red-600 mt-0.5" />
									<p className="text-xs text-red-800">{info.reason}</p>
								</div>
							</div>
						);
					})}
				</div>

				{/* Configurable Retention Periods */}
				<div className="space-y-3">
					<div className="flex items-center gap-2 mb-3">
						<h3 className="font-semibold text-gray-900">⚙️ Anpassbar</h3>
					</div>
					{MODULES.filter(m => !LEGAL_RETENTION[m as keyof typeof LEGAL_RETENTION]?.locked).map(m => {
						const info = LEGAL_RETENTION[m as keyof typeof LEGAL_RETENTION];
						return (
							<div key={m} className="p-4 bg-white rounded-lg border-2 border-gray-200 shadow-sm hover:shadow-md transition-all">
								<div className="flex items-center justify-between mb-2">
									<div className="flex items-center gap-2">
										<span className="text-xl">{getModuleEmoji(m)}</span>
										<Label className="font-semibold text-gray-900">{getModuleName(m)}</Label>
										<Badge className="bg-green-100 text-green-800 border-0">
											✏️ Editierbar
										</Badge>
									</div>
									<div className="flex items-center gap-3">
										<Input
											type="number"
											min="1"
											max="100"
											value={rules[m] || info?.years || 5}
											onChange={e => setRules({ ...rules, [m]: Number(e.target.value) })}
											disabled={!canEdit}
											className="w-20 text-center font-bold border-2 border-gray-300 focus:border-[#058bc0] focus:ring-2 focus:ring-[#058bc0]/20"
										/>
										<span className="text-sm text-gray-600 font-medium min-w-[50px]">Jahre</span>
									</div>
								</div>
								{info?.reason && (
									<div className="flex items-start gap-2 mt-2 p-2 bg-blue-50 rounded">
										<Info className="h-4 w-4 text-blue-600 mt-0.5" />
										<p className="text-xs text-blue-800">{info.reason}</p>
									</div>
								)}
							</div>
						);
					})}
				</div>

				{canEdit && (
					<div className="pt-4 flex justify-end border-t-2 border-gray-300">
						<Button 
							onClick={save} 
							disabled={saving}
							className="bg-gradient-to-r from-[#058bc0] to-[#0470a0] hover:from-[#0470a0] hover:to-[#035c80] text-white font-semibold shadow-lg hover:shadow-xl transition-all hover:scale-105"
							aria-label="Aufbewahrungsrichtlinien speichern"
						>
							<Save className="h-4 w-4 mr-2" /> 
							{saving ? '💾 Speichern...' : '✅ Speichern'}
						</Button>
					</div>
				)}
				
				{!canEdit && (
					<div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
						<p className="text-sm text-blue-800 flex items-center gap-2">
							<Lock className="h-4 w-4" />
							Nur Administratoren können die Aufbewahrungsrichtlinien ändern.
						</p>
					</div>
				)}
			</CardContent>
		</Card>
	);
};

export default RetentionSettings;

