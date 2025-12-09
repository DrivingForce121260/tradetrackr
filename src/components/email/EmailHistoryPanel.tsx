import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Mail, RefreshCw, AlertCircle, CheckCircle, XCircle, Clock } from 'lucide-react';
import { EmailService } from '@/services/emailService';
import { useAuth } from '@/contexts/AuthContext';
import type { EmailRecord } from '@/types/email';

interface EmailHistoryPanelProps {
	documentId: string;
	onResend?: (emailId: string) => void;
}

const statusColors: Record<string, string> = {
	sent: 'bg-blue-100 text-blue-700',
	delivered: 'bg-green-100 text-green-700',
	opened: 'bg-purple-100 text-purple-700',
	bounced: 'bg-red-100 text-red-700',
	failed: 'bg-gray-100 text-gray-700',
};

const statusIcons: Record<string, any> = {
	sent: <Mail className="h-3 w-3 mr-1" />,
	delivered: <CheckCircle className="h-3 w-3 mr-1" />,
	opened: <CheckCircle className="h-3 w-3 mr-1" />,
	bounced: <XCircle className="h-3 w-3 mr-1" />,
	failed: <AlertCircle className="h-3 w-3 mr-1" />,
};

export const EmailHistoryPanel: React.FC<EmailHistoryPanelProps> = ({ documentId, onResend }) => {
	const { user } = useAuth();
	const [service, setService] = useState<EmailService | null>(null);
	const [emails, setEmails] = useState<EmailRecord[]>([]);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		if (user) {
			setService(new EmailService(user));
		}
	}, [user]);

	useEffect(() => {
		const load = async () => {
			if (!service) return;
			setLoading(true);
			try {
				const items = await service.getEmailsByDocument(documentId);
				setEmails(items);
			} catch (error) {
				console.error('Error loading email history:', error);
			} finally {
				setLoading(false);
			}
		};
		load();
	}, [service, documentId]);

	const handleResend = async (emailId: string) => {
		if (!service || !onResend) return;
		try {
			await service.resendEmail(emailId);
			if (onResend) onResend(emailId);
			// Reload
			const items = await service.getEmailsByDocument(documentId);
			setEmails(items);
		} catch (error) {
			console.error('Error resending email:', error);
		}
	};

	if (emails.length === 0 && !loading) {
		return null;
	}

	return (
		<Card className="mt-4">
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Mail className="h-5 w-5" />
					E-Mail-Verlauf
				</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="border rounded">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Empfänger</TableHead>
								<TableHead>Betreff</TableHead>
								<TableHead>Status</TableHead>
								<TableHead>Gesendet</TableHead>
								<TableHead>Geöffnet</TableHead>
								<TableHead>Aktionen</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{emails.map((email) => (
								<TableRow key={email.id}>
									<TableCell>{email.recipient}</TableCell>
									<TableCell className="max-w-xs truncate">{email.subject}</TableCell>
									<TableCell>
										<Badge className={statusColors[email.status] || 'bg-gray-100'}>
											{statusIcons[email.status]}
											{email.status}
										</Badge>
									</TableCell>
									<TableCell>
										{email.sentAt.toLocaleString('de-DE', {
											day: '2-digit',
											month: '2-digit',
											year: 'numeric',
											hour: '2-digit',
											minute: '2-digit',
										})}
									</TableCell>
									<TableCell>
										{email.openedAt
											? email.openedAt.toLocaleString('de-DE', {
													day: '2-digit',
													month: '2-digit',
													year: 'numeric',
													hour: '2-digit',
													minute: '2-digit',
												})
											: '-'}
									</TableCell>
									<TableCell>
										{email.status === 'failed' || email.status === 'bounced' ? (
											<Button
												variant="ghost"
												size="sm"
												onClick={() => handleResend(email.id)}
											>
												Erneut senden
											</Button>
										) : null}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
				{emails.some((e) => e.bounceReason) && (
					<div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-sm">
						<strong>Bounce-Gründe:</strong>
						{emails.filter((e) => e.bounceReason).map((e) => (
							<div key={e.id} className="mt-1">
								{e.recipient}: {e.bounceReason}
							</div>
						))}
					</div>
				)}
			</CardContent>
		</Card>
	);
};













