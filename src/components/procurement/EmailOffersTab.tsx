/**
 * E-Mail-Angebote (KI) Tab
 * 
 * Displays procurement offers detected from emails via AI.
 * Part of the Beschaffung module.
 * 
 * Features:
 * - List of email-derived offers
 * - Status filtering
 * - Assign to Anfrage
 * - Link to project
 * - Reject/archive
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  subscribeToProcurementOffers,
  updateProcurementOfferStatus,
  linkOfferToRequest,
  linkOfferToProject,
  getEmailDetails,
} from '@/services/emailIntelligenceService';
import {
  ProcurementOffer,
  ProcurementOfferStatus,
  PROCUREMENT_OFFER_STATUS_LABELS,
  PROCUREMENT_OFFER_STATUS_COLORS,
} from '@/types/emailPipeline';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { 
  Mail, 
  MoreHorizontal, 
  CheckCircle2, 
  XCircle, 
  LinkIcon,
  FolderOpen,
  Archive,
  Eye,
  RefreshCw,
  Sparkles,
  Package,
} from 'lucide-react';

interface EmailOffersTabProps {
  onOpenRequest?: (requestId: string) => void;
  onOpenProject?: (projectId: string) => void;
}

export default function EmailOffersTab({ 
  onOpenRequest, 
  onOpenProject 
}: EmailOffersTabProps) {
  const { currentUser, userData } = useAuth();
  const { toast } = useToast();
  
  const [offers, setOffers] = useState<ProcurementOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'active' | 'all'>('active');
  const [selectedOffer, setSelectedOffer] = useState<ProcurementOffer | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectNotes, setRejectNotes] = useState('');
  const [emailDetails, setEmailDetails] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);
  
  const concernId = userData?.concernID || userData?.concernId;
  const uid = currentUser?.uid;
  
  // Subscribe to offers
  useEffect(() => {
    if (!concernId || !uid) {
      setLoading(false);
      return;
    }
    
    const statusesToFetch = statusFilter === 'active' 
      ? ['neu', 'in_pruefung'] as ProcurementOfferStatus[]
      : undefined;
    
    const unsubscribe = subscribeToProcurementOffers(
      concernId,
      uid,
      statusesToFetch,
      (fetchedOffers) => {
        setOffers(fetchedOffers);
        setLoading(false);
      }
    );
    
    return () => unsubscribe();
  }, [concernId, uid, statusFilter]);
  
  // Load email details when offer is selected
  useEffect(() => {
    if (selectedOffer?.sourceEmailId) {
      getEmailDetails(selectedOffer.sourceEmailId)
        .then(setEmailDetails)
        .catch(console.error);
    } else {
      setEmailDetails(null);
    }
  }, [selectedOffer?.sourceEmailId]);
  
  const handleOpenDetails = (offer: ProcurementOffer) => {
    setSelectedOffer(offer);
    setDetailsOpen(true);
  };
  
  const handleStatusChange = async (
    offer: ProcurementOffer, 
    newStatus: ProcurementOfferStatus,
    notes?: string
  ) => {
    if (!uid) return;
    
    setActionLoading(true);
    try {
      await updateProcurementOfferStatus(offer.id, uid, newStatus, notes);
      toast({
        title: 'Status aktualisiert',
        description: `Angebot auf "${PROCUREMENT_OFFER_STATUS_LABELS[newStatus]}" gesetzt.`,
      });
      setDetailsOpen(false);
      setRejectDialogOpen(false);
    } catch (error: any) {
      toast({
        title: 'Fehler',
        description: error.message || 'Status konnte nicht aktualisiert werden.',
        variant: 'destructive',
      });
    } finally {
      setActionLoading(false);
    }
  };
  
  const handleReject = async () => {
    if (!selectedOffer || !uid) return;
    await handleStatusChange(selectedOffer, 'abgelehnt', rejectNotes);
    setRejectNotes('');
  };
  
  const handleArchive = async (offer: ProcurementOffer) => {
    if (!uid) return;
    await handleStatusChange(offer, 'archiviert');
  };
  
  const formatDate = (date: Date | { toDate: () => Date }) => {
    const d = date instanceof Date ? date : date.toDate();
    return d.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };
  
  const getConfidenceColor = (confidence?: number) => {
    if (!confidence) return 'text-gray-500';
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };
  
  if (!concernId || !uid) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          Bitte melden Sie sich an, um E-Mail-Angebote zu sehen.
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Sparkles className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-lg">E-Mail-Angebote (KI)</CardTitle>
                <CardDescription>
                  Automatisch erkannte Lieferantenangebote aus E-Mails
                </CardDescription>
              </div>
            </div>
            
            <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <TabsList>
                <TabsTrigger value="active">Aktiv</TabsTrigger>
                <TabsTrigger value="all">Alle</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : offers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Keine E-Mail-Angebote vorhanden</p>
              <p className="text-sm mt-1">
                {statusFilter === 'active' 
                  ? 'Neue Angebote aus E-Mails werden hier automatisch angezeigt.'
                  : 'Es wurden noch keine Angebote aus E-Mails erkannt.'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Datum</TableHead>
                  <TableHead>Lieferant</TableHead>
                  <TableHead>Betreff / Zusammenfassung</TableHead>
                  <TableHead>Anfrage-Bezug</TableHead>
                  <TableHead>Projekt</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">KI-Konfidenz</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {offers.map((offer) => (
                  <TableRow 
                    key={offer.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleOpenDetails(offer)}
                  >
                    <TableCell className="font-medium">
                      {formatDate(offer.receivedAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">
                            {offer.supplierName || 'Unbekannt'}
                          </div>
                          <div className="text-xs text-muted-foreground truncate max-w-[150px]">
                            {offer.supplierEmail}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[250px]">
                        {offer.aiSummary && offer.aiSummary.length > 0 ? (
                          <ul className="text-sm space-y-0.5">
                            {offer.aiSummary.slice(0, 2).map((bullet, idx) => (
                              <li key={idx} className="truncate">
                                • {bullet}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <span className="text-muted-foreground text-sm">
                            Keine Zusammenfassung
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {offer.linkedRequestNumber ? (
                        <Badge 
                          variant="secondary"
                          className="cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenRequest?.(offer.linkedRequestId!);
                          }}
                        >
                          <LinkIcon className="h-3 w-3 mr-1" />
                          {offer.linkedRequestNumber}
                        </Badge>
                      ) : offer.extractedData?.requestNumber ? (
                        <span className="text-sm text-muted-foreground">
                          Ref: {offer.extractedData.requestNumber}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {offer.projectNumber ? (
                        <Badge 
                          variant="outline"
                          className="cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenProject?.(offer.projectId!);
                          }}
                        >
                          <FolderOpen className="h-3 w-3 mr-1" />
                          {offer.projectNumber}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        className={`${PROCUREMENT_OFFER_STATUS_COLORS[offer.status].bg} ${PROCUREMENT_OFFER_STATUS_COLORS[offer.status].text}`}
                      >
                        {PROCUREMENT_OFFER_STATUS_LABELS[offer.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={getConfidenceColor(offer.aiConfidence)}>
                        {offer.aiConfidence 
                          ? `${Math.round(offer.aiConfidence * 100)}%`
                          : '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenDetails(offer)}>
                            <Eye className="h-4 w-4 mr-2" />
                            Details anzeigen
                          </DropdownMenuItem>
                          {offer.status === 'neu' && (
                            <DropdownMenuItem 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStatusChange(offer, 'in_pruefung');
                              }}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              In Prüfung nehmen
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStatusChange(offer, 'uebernommen');
                            }}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />
                            Als Angebot übernehmen
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedOffer(offer);
                              setRejectDialogOpen(true);
                            }}
                            className="text-destructive"
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Ablehnen
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleArchive(offer);
                            }}
                          >
                            <Archive className="h-4 w-4 mr-2" />
                            Archivieren
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      
      {/* Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              E-Mail-Angebot Details
            </DialogTitle>
            <DialogDescription>
              {selectedOffer?.supplierName || selectedOffer?.supplierEmail}
            </DialogDescription>
          </DialogHeader>
          
          {selectedOffer && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4 pr-4">
                {/* Status */}
                <div className="flex items-center justify-between">
                  <Badge 
                    className={`${PROCUREMENT_OFFER_STATUS_COLORS[selectedOffer.status].bg} ${PROCUREMENT_OFFER_STATUS_COLORS[selectedOffer.status].text}`}
                  >
                    {PROCUREMENT_OFFER_STATUS_LABELS[selectedOffer.status]}
                  </Badge>
                  <span className={`text-sm ${getConfidenceColor(selectedOffer.aiConfidence)}`}>
                    KI-Konfidenz: {selectedOffer.aiConfidence 
                      ? `${Math.round(selectedOffer.aiConfidence * 100)}%`
                      : 'N/A'}
                  </span>
                </div>
                
                {/* AI Summary */}
                {selectedOffer.aiSummary && selectedOffer.aiSummary.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">KI-Zusammenfassung</h4>
                    <ul className="space-y-1 text-sm bg-muted p-3 rounded-md">
                      {selectedOffer.aiSummary.map((bullet, idx) => (
                        <li key={idx}>• {bullet}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {/* Extracted Data */}
                {selectedOffer.extractedData && (
                  <div>
                    <h4 className="font-medium mb-2">Extrahierte Daten</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {selectedOffer.extractedData.requestNumber && (
                        <>
                          <span className="text-muted-foreground">Anfrage-Nr:</span>
                          <span>{selectedOffer.extractedData.requestNumber}</span>
                        </>
                      )}
                      {selectedOffer.extractedData.orderNumber && (
                        <>
                          <span className="text-muted-foreground">Bestell-Nr:</span>
                          <span>{selectedOffer.extractedData.orderNumber}</span>
                        </>
                      )}
                      {selectedOffer.extractedData.totalNet && (
                        <>
                          <span className="text-muted-foreground">Netto:</span>
                          <span>{selectedOffer.extractedData.totalNet.toLocaleString('de-DE', { style: 'currency', currency: selectedOffer.extractedData.currency || 'EUR' })}</span>
                        </>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Email Preview */}
                {emailDetails && (
                  <div>
                    <h4 className="font-medium mb-2">E-Mail Vorschau</h4>
                    <div className="border rounded-md p-3 bg-background">
                      <div className="text-sm mb-2">
                        <span className="text-muted-foreground">Von: </span>
                        {emailDetails.from}
                      </div>
                      <div className="text-sm mb-2">
                        <span className="text-muted-foreground">Betreff: </span>
                        <strong>{emailDetails.subject}</strong>
                      </div>
                      <div className="text-sm text-muted-foreground mb-2">
                        {formatDate(emailDetails.receivedAt)}
                      </div>
                      <div className="text-sm border-t pt-2 whitespace-pre-wrap max-h-[200px] overflow-auto">
                        {emailDetails.bodyText?.substring(0, 1000)}
                        {emailDetails.bodyText?.length > 1000 && '...'}
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Attachments */}
                {selectedOffer.attachmentRefs && selectedOffer.attachmentRefs.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Anhänge</h4>
                    <ul className="space-y-1 text-sm">
                      {selectedOffer.attachmentRefs.map((att, idx) => (
                        <li key={idx} className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          {att.filename}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {/* Notes */}
                {selectedOffer.notes && (
                  <div>
                    <h4 className="font-medium mb-2">Notizen</h4>
                    <p className="text-sm bg-muted p-3 rounded-md">
                      {selectedOffer.notes}
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsOpen(false)}>
              Schließen
            </Button>
            {selectedOffer?.status === 'neu' && (
              <Button
                onClick={() => handleStatusChange(selectedOffer!, 'in_pruefung')}
                disabled={actionLoading}
              >
                In Prüfung nehmen
              </Button>
            )}
            {['neu', 'in_pruefung'].includes(selectedOffer?.status || '') && (
              <Button 
                variant="default"
                onClick={() => handleStatusChange(selectedOffer!, 'uebernommen')}
                disabled={actionLoading}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Als Angebot übernehmen
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Angebot ablehnen</DialogTitle>
            <DialogDescription>
              Geben Sie optional einen Grund für die Ablehnung an.
            </DialogDescription>
          </DialogHeader>
          
          <Textarea
            placeholder="Ablehnungsgrund (optional)..."
            value={rejectNotes}
            onChange={(e) => setRejectNotes(e.target.value)}
            rows={3}
          />
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleReject}
              disabled={actionLoading}
            >
              Ablehnen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}



