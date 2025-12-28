'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Clock, User, FileText, Mail, Lock, Edit, Plus, Loader2 } from 'lucide-react';
import { getOfferHistory } from '@/services/offerHistoryService';
import { OfferHistoryEntry, HISTORY_EVENT_LABELS, normalizeTimestamp } from '@/types/offerHistory';

interface OfferHistoryPanelProps {
	offerId: string;
	offerNumber: string;
	onClose: () => void;
}

const eventIcons: Record<string, React.ReactNode> = {
	CREATED: <Plus className="h-4 w-4 text-green-600" />,
	UPDATED: <Edit className="h-4 w-4 text-blue-600" />,
	PDF_GENERATED: <FileText className="h-4 w-4 text-purple-600" />,
	SENT: <Mail className="h-4 w-4 text-indigo-600" />,
	FINALIZED: <Lock className="h-4 w-4 text-amber-600" />,
};

const eventColors: Record<string, string> = {
	CREATED: 'bg-green-100 border-green-300',
	UPDATED: 'bg-blue-100 border-blue-300',
	PDF_GENERATED: 'bg-purple-100 border-purple-300',
	SENT: 'bg-indigo-100 border-indigo-300',
	FINALIZED: 'bg-amber-100 border-amber-300',
};

export function OfferHistoryPanel({ offerId, offerNumber, onClose }: OfferHistoryPanelProps) {
	const [history, setHistory] = useState<OfferHistoryEntry[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		loadHistory();
	}, [offerId]);

	async function loadHistory() {
		setLoading(true);
		setError(null);
		try {
			const entries = await getOfferHistory(offerId);
			setHistory(entries);
		} catch (err: any) {
			console.error('Error loading offer history:', err);
			setError('Verlauf konnte nicht geladen werden');
		} finally {
			setLoading(false);
		}
	}

	function formatDate(timestamp: any): string {
		const date = normalizeTimestamp(timestamp);
		return date.toLocaleDateString('de-DE', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric',
		});
	}

	function formatTime(timestamp: any): string {
		const date = normalizeTimestamp(timestamp);
		return date.toLocaleTimeString('de-DE', {
			hour: '2-digit',
			minute: '2-digit',
		});
	}

	return (
		<Card className="border-2 border-blue-200 shadow-lg">
			<CardHeader className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-t-lg flex flex-row items-center justify-between">
				<CardTitle className="flex items-center gap-2 text-lg">
					<Clock className="h-5 w-5" />
					Verlauf: Angebot {offerNumber}
				</CardTitle>
				<Button 
					variant="ghost" 
					size="sm" 
					onClick={onClose}
					className="text-white hover:bg-white/20"
				>
					<X className="h-5 w-5" />
				</Button>
			</CardHeader>
			<CardContent className="p-4 max-h-[500px] overflow-y-auto">
				{loading ? (
					<div className="flex items-center justify-center py-8">
						<Loader2 className="h-6 w-6 animate-spin text-blue-500" />
						<span className="ml-2 text-gray-600">Verlauf wird geladen...</span>
					</div>
				) : error ? (
					<div className="text-center py-8">
						<p className="text-red-500">{error}</p>
						<Button 
							variant="outline" 
							size="sm" 
							onClick={loadHistory}
							className="mt-4"
						>
							Erneut versuchen
						</Button>
					</div>
				) : history.length === 0 ? (
					<div className="text-center py-8 text-gray-500">
						<Clock className="h-10 w-10 mx-auto mb-3 opacity-50" />
						<p>Noch keine Verlaufseinträge vorhanden.</p>
					</div>
				) : (
					<div className="relative">
						{/* Timeline line */}
						<div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />
						
						<div className="space-y-4">
							{history.map((entry, idx) => (
								<div key={entry.id} className="relative pl-14">
									{/* Timeline dot */}
									<div className={`absolute left-4 w-5 h-5 rounded-full border-2 flex items-center justify-center ${eventColors[entry.type] || 'bg-gray-100 border-gray-300'}`}>
										{eventIcons[entry.type] || <Clock className="h-3 w-3 text-gray-500" />}
									</div>
									
									{/* Entry card */}
									<div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow">
										<div className="flex items-start justify-between gap-2">
											<div className="flex-1">
												<div className="font-semibold text-gray-900">
													{entry.summary || HISTORY_EVENT_LABELS[entry.type]}
												</div>
												
												{/* Changes list */}
												{entry.changes && entry.changes.length > 0 && (
													<ul className="mt-2 text-sm text-gray-600 space-y-1">
														{entry.changes.map((change, i) => (
															<li key={i} className="flex items-center gap-2">
																<span className="text-gray-400">•</span>
																<span className="font-medium">{change.fieldLabel || change.field}:</span>
																{change.from !== undefined && (
																	<span className="line-through text-red-400">{String(change.from)}</span>
																)}
																{change.to !== undefined && (
																	<span className="text-green-600">→ {String(change.to)}</span>
																)}
															</li>
														))}
													</ul>
												)}
											</div>
											
											{/* Timestamp & user */}
											<div className="text-right text-xs text-gray-500 flex-shrink-0">
												<div className="font-medium">{formatDate(entry.at)}</div>
												<div>{formatTime(entry.at)} Uhr</div>
												<div className="mt-1 flex items-center justify-end gap-1">
													<User className="h-3 w-3" />
													<span>{entry.byUserName || 'Unbekannt'}</span>
												</div>
											</div>
										</div>
									</div>
								</div>
							))}
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
}

export default OfferHistoryPanel;

