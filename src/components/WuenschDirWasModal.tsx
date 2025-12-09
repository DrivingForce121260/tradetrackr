/**
 * Wünsch-dir-was Modal Component
 * Complete feature request flow with free-text and AI-guided paths
 */

import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { saveFeatureRequest, extractTitle } from '@/lib/featureRequests';
import {
  FeatureRequestDialogStep,
  AISummarizeInput,
  AISummarizeOutput,
} from '@/types/featureRequests';
import { httpsCallable } from 'firebase/functions';
import { functionsEU } from '@/config/firebase';
import { 
  Loader2, 
  Sparkles, 
  ArrowLeft, 
  CheckCircle2, 
  Wand2, 
  PenTool, 
  Zap, 
  Star,
  ChevronRight,
  Sparkle,
  Lightbulb,
  Rocket
} from 'lucide-react';

export interface WuenschDirWasModalProps {
  isOpen: boolean;
  onClose: () => void;
  route: string;
  module?: string;
  entityId?: string;
}

type ModalMode = 'select' | 'free' | 'ai' | 'confirm';

// AI Dialog Questions (German)
const AI_QUESTIONS = [
  {
    id: 'bereich',
    question: 'Für welchen Bereich von TradeTrackr ist der Wunsch?',
    placeholder: 'z.B. Zeiterfassung, Projekte, Dokumente, Rechnungen...',
    type: 'dropdown' as const,
    options: [
      'Zeiterfassung',
      'Projekte',
      'Dokumente',
      'Rechnungen',
      'KI',
      'Dashboard',
      'Berichte',
      'Sonstiges'
    ]
  },
  {
    id: 'problem',
    question: 'Was soll konkret verbessert oder automatisiert werden?',
    placeholder: 'Beschreibe das Problem oder die gewünschte Verbesserung...',
    type: 'text' as const,
  },
  {
    id: 'zielgruppe',
    question: 'Wer nutzt diese Funktion hauptsächlich?',
    placeholder: 'z.B. alle Mitarbeiter, Projektleiter, Büro, Admin...',
    type: 'text' as const,
  },
  {
    id: 'ort',
    question: 'Wo in TradeTrackr soll die Funktion verfügbar sein?',
    placeholder: 'z.B. im Dashboard, in Projekten, in der Zeiterfassung...',
    type: 'text' as const,
  },
  {
    id: 'eingaben',
    question: 'Welche Eingaben soll der Nutzer machen können/müssen?',
    placeholder: 'Beschreibe die benötigten Eingabefelder oder Aktionen...',
    type: 'text' as const,
  },
  {
    id: 'ergebnis',
    question: 'Was soll als Ergebnis herauskommen?',
    placeholder: 'Was passiert nach der Eingabe? Was wird angezeigt oder erstellt?',
    type: 'text' as const,
  },
  {
    id: 'haeufigkeit',
    question: 'Wie häufig würdest du diese Funktion nutzen?',
    placeholder: 'täglich, mehrmals pro Woche, selten...',
    type: 'text' as const,
  },
  {
    id: 'wichtigkeit',
    question: 'Wie wichtig ist der Wunsch für deinen Alltag?',
    placeholder: 'sehr wichtig, wichtig, nice-to-have...',
    type: 'text' as const,
  },
  {
    id: 'workarounds',
    question: 'Gibt es heute einen Workaround oder anderes Tool dafür?',
    placeholder: 'Beschreibe, wie du es aktuell löst...',
    type: 'text' as const,
  },
  {
    id: 'extras',
    question: 'Gibt es besondere Fälle oder Bedingungen, die beachtet werden sollen?',
    placeholder: 'z.B. mobile Nutzung, Offline-Funktion, Integrationen...',
    type: 'text' as const,
  },
];

export const WuenschDirWasModal: React.FC<WuenschDirWasModalProps> = ({
  isOpen,
  onClose,
  route,
  module,
  entityId,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [mode, setMode] = useState<ModalMode>('select');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Free-text path state
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string>('');
  const [impactRating, setImpactRating] = useState<'low' | 'medium' | 'high' | ''>('');
  
  // AI-guided path state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [aiAnswers, setAiAnswers] = useState<FeatureRequestDialogStep[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [dropdownValue, setDropdownValue] = useState<string>(''); // For dropdown questions
  const [customText, setCustomText] = useState<string>(''); // For "Sonstiges" custom text
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  
  // Confirmation state
  const [aiSummary, setAiSummary] = useState<AISummarizeOutput | null>(null);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [editedUseCases, setEditedUseCases] = useState<string[]>([]);

  // Reset state when modal closes
  React.useEffect(() => {
    if (!isOpen) {
      setMode('select');
      setDescription('');
      setCategory('');
      setImpactRating('');
      setCurrentQuestionIndex(0);
      setAiAnswers([]);
      setCurrentAnswer('');
      setDropdownValue('');
      setCustomText('');
      setAiSummary(null);
      setEditedTitle('');
      setEditedDescription('');
      setEditedUseCases([]);
    }
  }, [isOpen]);

  // Handle free-text submission
  const handleFreeTextSubmit = useCallback(async () => {
    if (!description.trim() || !user) {
      toast({
        title: 'Fehler',
        description: 'Bitte beschreibe deinen Wunsch.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const title = extractTitle(description);
      
      await saveFeatureRequest({
        concernId: user.concernID || user.ConcernID || '',
        userId: user.uid,
        userEmail: user.email || undefined,
        userName: user.displayName || user.name || undefined,
        platform: 'web',
        route,
        module,
        entityId,
        requestType: 'free_text',
        title,
        description: description.trim(),
        category: category || undefined,
        impactSelfRating: impactRating || undefined,
        status: 'new',
        language: 'de',
      });

      toast({
        title: 'Vielen Dank!',
        description: 'Dein Wunsch wurde erfolgreich übermittelt.',
      });
      
      onClose();
    } catch (error: any) {
      console.error('Error saving feature request:', error);
      toast({
        title: 'Fehler',
        description: error.message || 'Fehler beim Speichern. Bitte versuche es erneut.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [description, category, impactRating, user, route, module, entityId, toast, onClose]);

  // Handle AI answer submission
  const handleAIAnswerSubmit = useCallback(() => {
    const currentQuestion = AI_QUESTIONS[currentQuestionIndex];
    let answerText = '';

    // Handle dropdown question
    if (currentQuestion.type === 'dropdown') {
      if (!dropdownValue) {
        toast({
          title: 'Bitte wähle eine Option',
          description: 'Wähle eine Option aus, bevor du fortfährst.',
          variant: 'destructive',
        });
        return;
      }
      answerText = dropdownValue;
      // If "Sonstiges" is selected, include custom text if provided
      if (dropdownValue === 'Sonstiges' && customText.trim()) {
        answerText = `${dropdownValue}: ${customText.trim()}`;
      }
    } else {
      // Handle text question
      if (!currentAnswer.trim()) {
        toast({
          title: 'Bitte antworte',
          description: 'Gib eine Antwort ein, bevor du fortfährst.',
          variant: 'destructive',
        });
        return;
      }
      answerText = currentAnswer.trim();
    }

    const newAnswer: FeatureRequestDialogStep = {
      question: currentQuestion.question,
      answer: answerText,
    };

    const updatedAnswers = [...aiAnswers, newAnswer];
    setAiAnswers(updatedAnswers);
    setCurrentAnswer('');
    setDropdownValue('');
    setCustomText('');

    // Move to next question or generate summary
    if (currentQuestionIndex < AI_QUESTIONS.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      // Last question answered, generate summary
      handleGenerateSummary(updatedAnswers);
    }
  }, [currentAnswer, dropdownValue, customText, currentQuestionIndex, aiAnswers, toast]);

  // Generate AI summary
  const handleGenerateSummary = useCallback(async (steps: FeatureRequestDialogStep[]) => {
    if (!user) return;

    setIsGeneratingSummary(true);
    try {
      const input: AISummarizeInput = {
        concernId: user.concernID || user.ConcernID || '',
        userId: user.uid,
        userEmail: user.email || undefined,
        route,
        module,
        entityId,
        steps,
        language: 'de',
      };

      // Call Cloud Function
      const summarizeFeatureRequestFn = httpsCallable<AISummarizeInput, AISummarizeOutput>(
        functionsEU,
        'summarizeFeatureRequest'
      );
      
      const result = await summarizeFeatureRequestFn(input);
      const summary = result.data;

      setAiSummary(summary);
      setEditedTitle(summary.title);
      setEditedDescription(summary.description);
      setEditedUseCases(summary.useCases || []);
      setMode('confirm');
    } catch (error: any) {
      console.error('Error generating summary:', error);
      toast({
        title: 'Fehler',
        description: 'Fehler beim Generieren der Zusammenfassung. Bitte versuche es erneut.',
        variant: 'destructive',
      });
      // Fallback: allow user to continue manually
      setMode('confirm');
      setAiSummary({
        title: extractTitle(steps.map(s => s.answer).join(' ')),
        description: steps.map(s => `${s.question}\n${s.answer}`).join('\n\n'),
        useCases: [],
      });
      setEditedTitle(extractTitle(steps.map(s => s.answer).join(' ')));
      setEditedDescription(steps.map(s => `${s.question}\n${s.answer}`).join('\n\n'));
      setEditedUseCases([]);
    } finally {
      setIsGeneratingSummary(false);
    }
  }, [user, route, module, entityId, toast]);

  // Handle final confirmation
  const handleConfirmSubmit = useCallback(async () => {
    if (!editedTitle.trim() || !editedDescription.trim() || !user) {
      toast({
        title: 'Fehler',
        description: 'Titel und Beschreibung sind erforderlich.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await saveFeatureRequest({
        concernId: user.concernID || user.ConcernID || '',
        userId: user.uid,
        userEmail: user.email || undefined,
        userName: user.displayName || user.name || undefined,
        platform: 'web',
        route,
        module,
        entityId,
        requestType: 'ai_guided',
        title: editedTitle.trim(),
        description: editedDescription.trim(),
        category: aiSummary?.category,
        impactSelfRating: aiSummary?.impactRating,
        aiDialogSteps: aiAnswers,
        aiGeneratedSummary: aiSummary ? JSON.stringify(aiSummary) : undefined,
        status: 'new',
        language: 'de',
      });

      toast({
        title: 'Vielen Dank!',
        description: 'Dein Wunsch wurde erfolgreich übermittelt.',
      });
      
      onClose();
    } catch (error: any) {
      console.error('Error saving feature request:', error);
      toast({
        title: 'Fehler',
        description: error.message || 'Fehler beim Speichern. Bitte versuche es erneut.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [editedTitle, editedDescription, aiSummary, aiAnswers, user, route, module, entityId, toast, onClose]);

  const currentQuestion = AI_QUESTIONS[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / AI_QUESTIONS.length) * 100;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 border-4 border-purple-400 shadow-2xl ring-4 ring-purple-200/50 rounded-xl">
        {/* Header with gradient */}
        <div className="relative bg-gradient-to-r from-purple-600 via-pink-500 to-orange-500 p-6 text-white border-b-4 border-purple-500">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 text-2xl font-bold">
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <Sparkles className="h-6 w-6 animate-pulse" />
                </div>
                <span className="drop-shadow-lg">Wünsch-dir-was</span>
              </DialogTitle>
              <DialogDescription className="text-white/90 mt-2 text-base">
                Deine Ideen machen TradeTrackr besser!
              </DialogDescription>
            </DialogHeader>
          </div>
        </div>

        <div className="p-6">

        {/* Mode: Select */}
        {mode === 'select' && (
          <>
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <p className="text-lg font-medium text-foreground">
                  Wie möchtest du deinen Wunsch einreichen?
                </p>
                <p className="text-sm text-muted-foreground">
                  Wähle den Weg, der dir am besten passt
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Direct Text Option */}
                <button
                  onClick={() => setMode('free')}
                  className="group relative p-6 rounded-xl border-4 border-purple-300 hover:border-purple-500 bg-gradient-to-br from-white to-purple-50/50 transition-all duration-300 hover:shadow-xl hover:scale-[1.02] text-left ring-2 ring-purple-100 hover:ring-purple-300"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
                      <PenTool className="h-6 w-6 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg mb-1 text-gray-900">Direkt beschreiben</h3>
                      <p className="text-sm text-gray-600 mb-3">
                        Gib deinen Wunsch schnell und direkt als Text ein
                      </p>
                      <div className="flex items-center text-purple-600 text-sm font-medium">
                        <span>Los geht's</span>
                        <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Sparkle className="h-5 w-5 text-purple-400 animate-pulse" />
                  </div>
                </button>

                {/* AI Guided Option */}
                <button
                  onClick={() => setMode('ai')}
                  className="group relative p-6 rounded-xl border-4 border-pink-300 hover:border-pink-500 bg-gradient-to-br from-white to-pink-50/50 transition-all duration-300 hover:shadow-xl hover:scale-[1.02] text-left ring-2 ring-pink-100 hover:ring-pink-300"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-pink-100 rounded-lg group-hover:bg-pink-200 transition-colors">
                      <Wand2 className="h-6 w-6 text-pink-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg mb-1 text-gray-900 flex items-center gap-2">
                        Mit KI konkretisieren
                        <span className="px-2 py-0.5 text-xs bg-gradient-to-r from-pink-500 to-orange-500 text-white rounded-full font-semibold">
                          KI
                        </span>
                      </h3>
                      <p className="text-sm text-gray-600 mb-3">
                        Lass dir von KI helfen, deinen Wunsch zu präzisieren
                      </p>
                      <div className="flex items-center text-pink-600 text-sm font-medium">
                        <span>KI starten</span>
                        <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Zap className="h-5 w-5 text-pink-400 animate-pulse" />
                  </div>
                </button>
              </div>
            </div>
            
            <DialogFooter className="mt-6">
              <Button variant="ghost" onClick={onClose} className="hover:bg-gray-100">
                Abbrechen
              </Button>
            </DialogFooter>
          </>
        )}

        {/* Mode: Free Text */}
        {mode === 'free' && (
          <>
            <div className="space-y-6 border-4 border-purple-300 rounded-xl p-6 bg-gradient-to-br from-purple-50/30 to-white ring-2 ring-purple-100">
              <div className="flex items-center gap-3 pb-3 border-b-4 border-purple-200">
                <PenTool className="h-5 w-5 text-purple-600" />
                <h3 className="text-lg font-semibold">Dein Wunsch</h3>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-base font-medium flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-yellow-500" />
                    Beschreibe deinen Wunsch
                  </Label>
                  <Textarea
                    id="description"
                    placeholder="Beschreibe deinen Wunsch oder Verbesserungsvorschlag... ✨"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={8}
                    className="resize-none text-base border-4 border-purple-200 focus:border-purple-500 transition-colors rounded-lg"
                  />
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <span className="font-medium">{description.length}</span> Zeichen
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category" className="text-sm font-medium flex items-center gap-2">
                      <Star className="h-4 w-4 text-yellow-500" />
                      Kategorie (optional)
                    </Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger id="category" className="border-4 border-purple-200 focus:border-purple-500">
                        <SelectValue placeholder="Wähle eine Kategorie" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Zeiterfassung">⏰ Zeiterfassung</SelectItem>
                        <SelectItem value="Projekte">📁 Projekte</SelectItem>
                        <SelectItem value="Dokumente">📄 Dokumente</SelectItem>
                        <SelectItem value="Rechnungen">💰 Rechnungen</SelectItem>
                        <SelectItem value="KI">🤖 KI</SelectItem>
                        <SelectItem value="Dashboard">📊 Dashboard</SelectItem>
                        <SelectItem value="Berichte">📈 Berichte</SelectItem>
                        <SelectItem value="Sonstiges">🔧 Sonstiges</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="impact" className="text-sm font-medium flex items-center gap-2">
                      <Rocket className="h-4 w-4 text-orange-500" />
                      Wichtigkeit (optional)
                    </Label>
                    <Select value={impactRating} onValueChange={(v) => setImpactRating(v as any)}>
                      <SelectTrigger id="impact" className="border-4 border-purple-200 focus:border-purple-500">
                        <SelectValue placeholder="Wähle Wichtigkeit" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">🟢 Niedrig</SelectItem>
                        <SelectItem value="medium">🟡 Mittel</SelectItem>
                        <SelectItem value="high">🔴 Hoch</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
            
            <DialogFooter className="mt-6 pt-4 border-t">
              <Button 
                variant="ghost" 
                onClick={() => setMode('select')}
                className="hover:bg-gray-100"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Zurück
              </Button>
              <Button 
                onClick={handleFreeTextSubmit} 
                disabled={isSubmitting || !description.trim()}
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Wird gesendet...
                  </>
                ) : (
                  <>
                    <Rocket className="mr-2 h-4 w-4" />
                    Wunsch senden
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}

        {/* Mode: AI Guided */}
        {mode === 'ai' && (
          <>
            {isGeneratingSummary ? (
              <div className="py-16 flex flex-col items-center justify-center space-y-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full blur-xl opacity-50 animate-pulse"></div>
                  <Loader2 className="h-12 w-12 animate-spin text-pink-600 relative z-10" />
                </div>
                <div className="text-center space-y-2">
                  <p className="text-lg font-semibold text-gray-900">KI generiert Zusammenfassung...</p>
                  <p className="text-sm text-muted-foreground">Das kann einen Moment dauern ✨</p>
                </div>
                <div className="w-full max-w-xs h-1 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-pink-500 to-purple-500 animate-pulse" style={{ width: '60%' }}></div>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-6 border-4 border-pink-300 rounded-xl p-6 bg-gradient-to-br from-pink-50/30 to-white ring-2 ring-pink-100">
                  {/* Progress Header */}
                  <div className="space-y-3 pb-4 border-b-4 border-pink-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Wand2 className="h-5 w-5 text-pink-600" />
                        <span className="text-sm font-medium text-gray-700">
                          Frage {currentQuestionIndex + 1} von {AI_QUESTIONS.length}
                        </span>
                      </div>
                      <span className="text-sm font-bold text-pink-600 bg-pink-50 px-3 py-1 rounded-full">
                        {Math.round(progress)}%
                      </span>
                    </div>
                    
                    {/* Enhanced Progress Bar */}
                    <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-pink-500 via-purple-500 to-orange-500 transition-all duration-500 ease-out rounded-full relative"
                        style={{ width: `${progress}%` }}
                      >
                        <div className="absolute inset-0 bg-white/30 animate-pulse"></div>
                      </div>
                      {/* Progress dots */}
                      <div className="absolute inset-0 flex items-center justify-between px-1">
                        {AI_QUESTIONS.map((_, idx) => (
                          <div
                            key={idx}
                            className={`h-1.5 w-1.5 rounded-full transition-all ${
                              idx <= currentQuestionIndex
                                ? 'bg-white shadow-lg scale-125'
                                : 'bg-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  {/* Question Card */}
                  <div className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-xl p-6 border-4 border-pink-300 ring-2 ring-pink-100 shadow-lg">
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-white rounded-lg shadow-sm">
                          <Lightbulb className="h-5 w-5 text-yellow-500" />
                        </div>
                        <div className="flex-1">
                          <Label htmlFor="ai-answer" className="text-lg font-bold text-gray-900 block mb-3">
                            {currentQuestion.question}
                          </Label>
                          
                          {/* Dropdown Question */}
                          {currentQuestion.type === 'dropdown' ? (
                            <div className="space-y-3">
                              <Select value={dropdownValue} onValueChange={setDropdownValue}>
                                <SelectTrigger 
                                  id="ai-dropdown" 
                                  className="border-4 border-pink-200 focus:border-pink-500 text-base h-12"
                                >
                                  <SelectValue placeholder="Wähle einen Bereich..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {currentQuestion.options?.map((option) => (
                                    <SelectItem key={option} value={option}>
                                      {option === 'Zeiterfassung' && '⏰ '}
                                      {option === 'Projekte' && '📁 '}
                                      {option === 'Dokumente' && '📄 '}
                                      {option === 'Rechnungen' && '💰 '}
                                      {option === 'KI' && '🤖 '}
                                      {option === 'Dashboard' && '📊 '}
                                      {option === 'Berichte' && '📈 '}
                                      {option === 'Sonstiges' && '🔧 '}
                                      {option}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              
                              {/* Show text input only if "Sonstiges" is selected */}
                              {dropdownValue === 'Sonstiges' && (
                                <div className="mt-3 space-y-2">
                                  <Label htmlFor="custom-text" className="text-sm font-medium text-gray-700">
                                    Bitte beschreibe den Bereich:
                                  </Label>
                                  <Textarea
                                    id="custom-text"
                                    placeholder="Beschreibe den Bereich, der nicht in der Liste ist..."
                                    value={customText}
                                    onChange={(e) => setCustomText(e.target.value)}
                                    rows={3}
                                    className="resize-none text-base border-4 border-pink-200 focus:border-pink-500 transition-colors bg-white rounded-lg"
                                    autoFocus
                                  />
                                </div>
                              )}
                            </div>
                          ) : (
                            /* Text Question */
                            <>
                              <Textarea
                                id="ai-answer"
                                placeholder={currentQuestion.placeholder}
                                value={currentAnswer}
                                onChange={(e) => setCurrentAnswer(e.target.value)}
                                rows={6}
                                className="resize-none text-base border-4 border-pink-200 focus:border-pink-500 transition-colors bg-white rounded-lg"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                                    handleAIAnswerSubmit();
                                  }
                                }}
                                autoFocus
                              />
                              <div className="flex items-center justify-between mt-2">
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                  <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">Strg</kbd>
                                  <span>+</span>
                                  <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">Enter</kbd>
                                  <span>zum Fortfahren</span>
                                </p>
                                <span className="text-xs text-muted-foreground font-medium">
                                  {currentAnswer.length} Zeichen
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <DialogFooter className="mt-6 pt-4 border-t-4 border-pink-200">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setMode('select');
                      setCurrentQuestionIndex(0);
                      setAiAnswers([]);
                      setCurrentAnswer('');
                      setDropdownValue('');
                      setCustomText('');
                    }}
                    className="hover:bg-gray-100 text-gray-600"
                  >
                    Abbrechen
                  </Button>
                  
                  {currentQuestionIndex > 0 && (
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setCurrentQuestionIndex(currentQuestionIndex - 1);
                        setAiAnswers(aiAnswers.slice(0, -1));
                        setCurrentAnswer('');
                        setDropdownValue('');
                        setCustomText('');
                      }}
                      className="hover:bg-gray-100"
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Zurück
                    </Button>
                  )}
                  
                  <Button
                    onClick={handleAIAnswerSubmit}
                    disabled={
                      currentQuestion.type === 'dropdown' 
                        ? !dropdownValue || (dropdownValue === 'Sonstiges' && !customText.trim())
                        : !currentAnswer.trim()
                    }
                    className="ml-auto bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
                  >
                    {currentQuestionIndex < AI_QUESTIONS.length - 1 ? (
                      <>
                        Weiter
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Zusammenfassung generieren
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </>
            )}
          </>
        )}

        {/* Mode: Confirm */}
        {mode === 'confirm' && (
          <>
            <div className="space-y-6 border-4 border-green-300 rounded-xl p-6 bg-gradient-to-br from-green-50/30 to-white ring-2 ring-green-100">
              {/* Success Header */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border-4 border-green-400 ring-2 ring-green-200 shadow-lg">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-green-900 mb-1">
                      ✨ KI-Zusammenfassung erstellt!
                    </p>
                    <p className="text-sm text-green-700">
                      Bitte überprüfe und passe die Zusammenfassung nach Bedarf an
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="confirm-title" className="text-base font-semibold flex items-center gap-2">
                    <Star className="h-4 w-4 text-yellow-500" />
                    Titel
                  </Label>
                  <Textarea
                    id="confirm-title"
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    rows={2}
                    className="resize-none border-4 border-green-200 focus:border-green-500 transition-colors rounded-lg"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirm-description" className="text-base font-semibold flex items-center gap-2">
                    <PenTool className="h-4 w-4 text-purple-500" />
                    Beschreibung
                  </Label>
                  <Textarea
                    id="confirm-description"
                    value={editedDescription}
                    onChange={(e) => setEditedDescription(e.target.value)}
                    rows={10}
                    className="resize-none border-4 border-green-200 focus:border-green-500 transition-colors rounded-lg"
                  />
                </div>
                
                {editedUseCases.length > 0 && (
                  <div className="space-y-3">
                    <Label className="text-base font-semibold flex items-center gap-2">
                      <Rocket className="h-4 w-4 text-orange-500" />
                      Use Cases
                    </Label>
                    <div className="space-y-3">
                      {editedUseCases.map((useCase, idx) => (
                        <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border-4 border-green-200 ring-1 ring-green-100">
                          <CheckCircle2 className="h-5 w-5 mt-0.5 text-green-500 flex-shrink-0" />
                          <Textarea
                            value={useCase}
                            onChange={(e) => {
                              const updated = [...editedUseCases];
                              updated[idx] = e.target.value;
                              setEditedUseCases(updated);
                            }}
                            rows={2}
                            className="resize-none border-0 bg-transparent focus:ring-2 focus:ring-purple-400 transition-all"
                            placeholder={`Use Case ${idx + 1}...`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <DialogFooter className="mt-6 pt-4 border-t">
              <Button 
                variant="ghost" 
                onClick={() => setMode('ai')}
                className="hover:bg-gray-100"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Zurück
              </Button>
              <Button 
                onClick={handleConfirmSubmit} 
                disabled={isSubmitting}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Wird gesendet...
                  </>
                ) : (
                  <>
                    <Rocket className="mr-2 h-4 w-4" />
                    Bestätigen & senden
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

