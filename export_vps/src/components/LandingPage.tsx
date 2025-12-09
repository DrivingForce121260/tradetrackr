import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Wrench, Users, FileText, BarChart3, Shield, Clock, X, CheckCircle, Calendar, MapPin, Clock as ClockIcon, Package, Settings, Database, MessageCircle, Scale, Mail, Phone, Building, User, Info, CreditCard, AlertTriangle, FileText as FileTextIcon, Brain, Sparkles, Zap } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';

import { LandingPageProps } from '@/types';

const LandingPage: React.FC<LandingPageProps> = () => {
  const { t } = useLanguage();
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);
  const [showDetailedInfo, setShowDetailedInfo] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const [showImpressum, setShowImpressum] = useState(false);
  const [showAGB, setShowAGB] = useState(false);
  const [showDatenschutz, setShowDatenschutz] = useState(false);
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [showUnderConstruction, setShowUnderConstruction] = useState(false);
  const [showCloudStorage, setShowCloudStorage] = useState(false);
  const [showTimeoutMessage, setShowTimeoutMessage] = useState(false);

  // Check for timeout parameter in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('timeout') === 'true') {
      setShowTimeoutMessage(true);
      // Clear the timeout parameter from URL after showing message
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const features = {
    projectManagement: {
      icon: FileText,
      details: {
        title: "Projektmanagement - Zentrale Verwaltung",
        features: [
          "Projekte erstellen und verwalten mit detaillierten Informationen",
          "Status-Tracking: Planung, In Bearbeitung, Abgeschlossen",
          "Projektzuweisung an Mitarbeiter und Teams",
          "Zeitplanung und Deadlines verwalten",
          "Projektnotizen und Dokumentation",
          "Filterung und Suche nach Projekten",
          "Projektarchivierung und -historie"
        ],
        benefits: [
          "Übersicht über alle laufenden Projekte",
          "Bessere Ressourcenplanung",
          "Schnelle Projektstatus-Updates",
          "Dokumentation aller Projektdetails"
        ]
      }
    },
    employeeManagement: {
      icon: Users,
      details: {
        title: "Mitarbeiterverwaltung - Teamorganisation",
        features: [
          "Benutzerprofile mit Rollen und Berechtigungen",
          "Rollenbasierte Zugriffskontrolle (Admin, Büro, Projektleiter, Mitarbeiter)",
          "Projektzuweisung an einzelne Mitarbeiter oder Teams",
          "Arbeitszeitverfolgung und -auswertung",
          "Mitarbeiterleistungsübersicht",
          "Kontaktdaten und Notizen verwalten",
          "Mitarbeiterarchivierung bei Kündigung"
        ],
        benefits: [
          "Sichere Zugriffskontrolle je nach Rolle",
          "Optimale Teamzusammenstellung",
          "Transparente Arbeitszeiterfassung",
          "Einfache Mitarbeiterverwaltung"
        ]
      }
    },
    reporting: {
      icon: BarChart3,
      details: {
        title: "Berichtswesen - Digitale Dokumentation",
        features: [
          "Arbeitsberichte mit Fotos und Dokumentation",
          "Automatische Zeiterfassung pro Projekt",
          "Materialverbrauch und -kosten erfassen",
          "Vorher-Nachher-Bilder für Projekte",
          "Digitale Unterschriften und Genehmigungen",
          "Berichtsvorlagen und -export",
          "Mobile Berichterstellung über App"
        ],
        benefits: [
          "Vollständige Projektdokumentation",
          "Nachweisbare Arbeitszeiten",
          "Professionelle Kundenberichte",
          "Mobile Erfassung vor Ort"
        ]
      }
    },
    roleBasedAccess: {
      icon: Shield,
      details: {
        title: "Rollenbasierte Zugriffe - Sicherheit",
        features: [
          "Fünf definierte Benutzerrollen mit spezifischen Berechtigungen",
          "Admin: Vollzugriff auf alle Funktionen und Benutzerverwaltung",
          "Büro: Projekt- und Kundenverwaltung, Berichtseinblick",
          "Projektleiter: Projektverwaltung, Kategorien, Berichte",
          "Mitarbeiter: Eigene Berichte, zugewiesene Projekte",
          "Auftraggeber: Projektfortschritt und Berichte für eigene Projekte",
          "Sichere Anmeldung mit Benutzername und Passwort",
          "Session-Management und automatische Abmeldung"
        ],
        benefits: [
          "Datenschutz durch rollenbasierte Zugriffe",
          "Klare Verantwortlichkeiten je Rolle",
          "Sichere Datenverwaltung",
          "Compliance mit DSGVO-Anforderungen",
          "Kundentransparenz durch Auftraggeber-Zugang"
        ]
      }
    },
    timeTracking: {
      icon: Clock,
      details: {
        title: "Zeiterfassung - Präzise Arbeitszeiten",
        features: [
          "Automatische Zeiterfassung pro Projekt",
          "Start- und Stopp-Funktion für Arbeitszeiten",
          "Pausenverwaltung und -berechnung",
          "Überstunden- und Mehrarbeitsberechnung",
          "Zeiterfassung über mobile App",
          "Zeitauswertung und -berichte",
          "Integration mit Lohnabrechnung"
        ],
        benefits: [
          "Prö¤zise Arbeitszeiterfassung",
          "Automatische Stundenberechnung",
          "Transparente Zeiterfassung",
          "Einfache Lohnabrechnung"
        ]
      }
    },
    materialManagement: {
      icon: Wrench,
      details: {
        title: "Materialverwaltung - Kategorisierung",
        features: [
          "Kategorien für Artikel und Komponenten erstellen",
          "Eigenschaften und Spezifikationen verwalten",
          "Materialbestand und -verbrauch tracken",
          "Preisverwaltung und -historie",
          "Lieferanteninformationen verwalten",
          "Materiallisten für Projekte",
          "Automatische Bestandsaktualisierung"
        ],
        benefits: [
          "Übersichtliche Materialkategorisierung",
          "Präzise Kostenkontrolle",
          "Optimale Bestandsverwaltung",
          "Schnelle Materialsuche"
        ]
      }
    },
    messaging: {
      icon: MessageCircle,
      details: {
        title: "Messaging - Interne Kommunikation",
        features: [
          "WhatsApp-ähnliche Chat-Funktionen",
          "Gruppennachrichten für Projektteams",
          "Direktnachrichten zwischen Mitarbeitern",
          "Datei- und Bildaustausch",
          "Nachrichtenverlauf und -archiv",
          "Online-Status und Lesebestätigungen",
          "Mobile und Desktop-Benachrichtigungen"
        ],
        benefits: [
          "Schnelle interne Kommunikation",
          "Verbesserte Teamkoordination",
          "Weniger E-Mails und Telefonate",
          "Projektspezifische Diskussionen"
        ]
      }
    },
    cloudStorage: {
      icon: Database,
      details: {
        title: "Cloud-Speicher - Skalierbare Datensicherung",
        features: [
          "2 GB kostenloser Speicher pro Lizenz automatisch inklusive",
          "Basic: 500 GB Standard (Regional) für €4,99/Monat",
          "Pro: 1 TB Standard + 1 TB Archiv für €13,49/Monat",
          "Enterprise: 1 TB Premium (Multi-Region) für €16,99/Monat",
          "Flexible Erweiterung mit 500 GB-Blöcken nach Bedarf",
          "EU-Datenresidenz und vollständige DSGVO-Compliance",
          "Lifecycle-Regeln für automatische Archivierung",
          "Dateiversionierung und Wiederherstellungsfunktionen",
          "99,95% Verfügbarkeits-SLA für Enterprise-Kunden",
          "Rollenbasierte Zugriffsrechte und Audit-Logs",
          "Nahtlose Integration in TradeTrackr-Plattform"
        ],
        benefits: [
          "Sichere und skalierbare Datenspeicherung in der EU",
          "Kostentransparenz durch einfache Preismodelle",
          "Professionelle Backup- und Archivierungsstrategien",
          "Betrieben auf Google Cloud Infrastructure",
          "Automatische Compliance mit deutschen Datenschutzgesetzen"
        ]
      }
    },
    crm: {
      icon: Building,
      details: {
        title: "CRM - Kundenbeziehungsmanagement",
        features: [
          "Kontenverwaltung für Unternehmen und Organisationen",
          "Kontaktverwaltung mit Rollen und Kommunikationspräferenzen",
          "Chancenverwaltung mit Verkaufspipeline und Stage-Tracking",
          "Angebotsverwaltung mit detaillierten Preislisten und Kalkulationen",
          "Aktivitätsverfolgung für alle Kundeninteraktionen",
          "Automatische Pipeline-Updates und Workflow-Trigger",
          "Mobile CRM-Funktionalität mit Offline-Support",
          "E-Mail- und Kalender-Integration",
          "Umsatzanalyse und Performance-Metriken",
          "Projektübergabe bei gewonnenen Chancen"
        ],
        benefits: [
          "Vollständige Übersicht über alle Kundenbeziehungen",
          "Strukturierte Verkaufsprozesse und Pipeline-Management",
          "Automatische Workflows für Angebote und Projektübergaben",
          "Mobile Verfügbarkeit für Produktivität unterwegs"
        ]
      }
    },
    ai: {
      icon: Brain,
      description: "Automatisierung mit künstlicher Intelligenz für intelligente Dokumentenverarbeitung, E-Mail-Analyse und zukünftige KI-Agenten",
      details: {
        title: "KI & Intelligente Agenten - Automatisierung mit künstlicher Intelligenz",
        features: [
          "Smart Inbox: KI-gestützte E-Mail-Analyse und -Kategorisierung",
          "Document AI: Automatische Dokumentenklassifizierung mit Gemini Vision (26 Dokumenttypen)",
          "Intelligente OCR: Texterkennung aus Bildern und gescannten Dokumenten",
          "Automatische Datenextraktion: KI extrahiert relevante Daten aus Dokumenten",
          "Projekt-Vorschläge: KI analysiert E-Mails und schlägt passende Projekte vor",
          "Material-Kategorisierung: Automatische Klassifizierung von Materialdokumenten",
          "Intelligentes Routing: Automatische Weiterleitung von Dokumenten basierend auf Inhalt",
          "Konfidenz-basierte Klassifizierung: KI rät nicht - nur sichere Entscheidungen",
          "Multi-Agent-System: Verschiedene KI-Agenten für spezifische Aufgaben",
          "Predictive Analytics: Vorhersage von Projektverläufen und Ressourcenbedarf"
        ],
        benefits: [
          "Zeitersparnis durch automatisierte Dokumentenverarbeitung",
          "Höhere Genauigkeit bei der Klassifizierung durch KI",
          "Intelligente E-Mail-Verwaltung ohne manuelle Sortierung",
          "Automatische Datenextraktion spart manuelle Eingabe"
        ],
        futureFeatures: [
          "Intelligente Workflow-Agenten: Automatische Projekt-Workflows basierend auf E-Mails",
          "Conversational AI: Chatbot für schnelle Fragen und Unterstützung",
          "Intelligente Berichtserstellung: KI erstellt automatisch Projektberichte",
          "Predictive Maintenance: Vorhersage von Wartungsbedarf für Materialien",
          "Design-Vorschläge: KI schlägt optimale Projektlayouts vor",
          "Automatische Kostenanalyse: KI analysiert Projekte und schlägt Optimierungen vor",
          "Intelligente Terminplanung: KI optimiert Ressourcenzuweisung automatisch",
          "Proaktive Problemerkennung: KI erkennt Probleme bevor sie kritisch werden"
        ]
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-indigo-50">
      {/* Header - Konsistent mit AppHeader */}
      <header className="sticky top-0 z-50 bg-gradient-to-r from-[#058bc0] via-[#0470a0] to-[#058bc0] shadow-xl border-b-4 border-[#046a90]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center py-3 sm:py-4 gap-3">
            {/* Logo - Vereinfacht */}
            <div className="flex items-center space-x-3 min-w-0">
              <img 
                src="/TTroundLogo.jpg" 
                alt="TradeTrackr Logo" 
                className="h-10 w-10 sm:h-12 sm:w-12 object-contain"
              />
              <h1 className="text-2xl sm:text-3xl font-extrabold leading-tight tracking-tight drop-shadow-lg bg-gradient-to-r from-orange-400 to-orange-500 bg-clip-text text-transparent whitespace-nowrap">
                TradeTrackr
              </h1>
            </div>
            
            {/* Navigation */}
            <nav className="flex flex-wrap items-center gap-3 lg:gap-6">
              <a 
                href="#features" 
                className="text-white/90 hover:text-white font-semibold transition-colors hover:scale-105 drop-shadow-md"
              >
                {t('nav.features')}
              </a>
              <button 
                onClick={() => setShowUnderConstruction(true)}
                className="text-white/90 hover:text-white font-semibold transition-colors hover:scale-105 drop-shadow-md"
              >
                {t('nav.screenshots')}
              </button>
              <button 
                onClick={() => setShowPricing(true)}
                className="text-white/90 hover:text-white font-semibold transition-colors hover:scale-105 drop-shadow-md"
              >
                Preise
              </button>
              <button 
                onClick={() => setShowCloudStorage(true)}
                className="text-white/90 hover:text-white font-semibold transition-colors hover:scale-105 drop-shadow-md"
              >
                Cloud-Speicher
              </button>
              <a 
                href="#contact" 
                className="text-white/90 hover:text-white font-semibold transition-colors hover:scale-105 drop-shadow-md"
              >
                {t('nav.contact')}
              </a>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section - Aufgepeppt */}
      <section className="py-16 sm:py-24 relative overflow-hidden">
        {/* Dekorative Hintergrund-Elemente */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-[#058bc0]/20 to-transparent rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-orange-400/20 to-transparent rounded-full blur-3xl"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-3 gap-12 items-center">
            <div className="lg:col-span-2">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 mb-6 leading-tight">
                {t('hero.title')}
                <span className="bg-gradient-to-r from-[#058bc0] via-[#0470a0] to-[#058bc0] bg-clip-text text-transparent"> {t('hero.title.highlight')}</span>
                <br />
                <span className="bg-gradient-to-r from-orange-400 to-orange-500 bg-clip-text text-transparent">{t('hero.title.brand')}</span>
              </h1>
              <p className="text-xl sm:text-2xl text-gray-700 mb-8 font-medium leading-relaxed">
                {t('hero.subtitle')}
              </p>
              <div className="flex flex-wrap gap-4">
                <Button 
                  size="lg" 
                  className="bg-gradient-to-r from-[#058bc0] via-[#0470a0] to-[#058bc0] hover:from-[#0470a0] hover:via-[#035c80] hover:to-[#0470a0] text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 relative overflow-hidden group"
                  onClick={() => setShowDetailedInfo(true)}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                  <span className="relative z-10">{t('hero.learnMore')}</span>
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  className="border-2 border-[#058bc0] text-[#058bc0] hover:bg-[#058bc0] hover:text-white font-semibold shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105"
                  onClick={() => setShowUnderConstruction(true)}
                >
                  {t('hero.viewDemo')}
                </Button>
              </div>
            </div>
            <div className="lg:col-span-1">
              {/* Timeout Message */}
              {showTimeoutMessage && (
                <Alert className="mb-6 border-amber-200 bg-amber-50">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800">
                    Ihre Sitzung wurde wegen Inaktivität beendet. Bitte melden Sie sich erneut an.
                  </AlertDescription>
                </Alert>
              )}

              {showRegisterForm ? (
                <RegisterForm 
                  onSuccess={() => setShowRegisterForm(false)}
                  onBack={() => setShowRegisterForm(false)}
                  onShowAGB={() => setShowAGB(true)}
                  onShowDatenschutz={() => setShowDatenschutz(true)}
                  startWithNewCustomer={true}
                />
              ) : (
                <LoginForm 
                  onNavigateToRegister={() => setShowRegisterForm(true)}
                />
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - Aufgepeppt */}
      <section id="features" className="py-20 bg-gradient-to-b from-white via-blue-50/30 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-4">
              <span className="bg-gradient-to-r from-[#058bc0] via-[#0470a0] to-[#058bc0] bg-clip-text text-transparent">
                {t('features.title')}
              </span>
            </h2>
            <p className="text-xl text-gray-700 font-medium max-w-2xl mx-auto">{t('features.subtitle')}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Object.entries(features).map(([key, feature]) => {
              const IconComponent = feature.icon;
              const titleKey = `feature.${key}.title`;
              const descriptionKey = `feature.${key}.description`;
              
              // Für KI-Feature: Verwende direkten Titel und Beschreibung
              const displayTitle = key === 'ai' ? 'KI' : t(titleKey);
              const displayDescription = key === 'ai' && feature.description 
                ? feature.description 
                : t(descriptionKey);
              
              return (
                <Card 
                  key={key}
                  className="tradetrackr-card cursor-pointer group transform hover:scale-105 border-2 border-gray-200 hover:border-[#058bc0] shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-white to-blue-50/30 overflow-hidden relative"
                  onClick={() => setSelectedFeature(key)}
                >
                  {/* Hover-Effekt Hintergrund */}
                  <div className="absolute inset-0 bg-gradient-to-br from-[#058bc0]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  
                  <CardHeader className="pb-4 relative z-10">
                    {/* Icon mit Gradient-Hintergrund */}
                    <div className="inline-flex items-center justify-center p-3 bg-gradient-to-br from-[#058bc0] to-[#0470a0] rounded-xl shadow-md mb-4 group-hover:scale-110 transition-transform duration-300">
                      <IconComponent className="h-8 w-8 text-white" />
                    </div>
                    <CardTitle className="text-gray-900 group-hover:text-[#058bc0] transition-colors font-bold text-lg mb-2">
                      {displayTitle}
                    </CardTitle>
                    <CardDescription className="text-gray-600 text-sm leading-relaxed">
                      {displayDescription}
                    </CardDescription>
                  </CardHeader>
                  
                  {/* Pfeil-Icon für mehr Info */}
                  <CardContent className="pt-0 relative z-10">
                    <div className="flex items-center gap-2 text-[#058bc0] font-semibold text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                      <span>Mehr erfahren</span>
                      <span className="group-hover:translate-x-1 transition-transform">→</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Feature Details Modal */}
      <Dialog open={selectedFeature !== null} onOpenChange={() => setSelectedFeature(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-gray-50 to-white border-4 border-[#058bc0] shadow-2xl">
          <DialogHeader className="bg-gradient-to-r from-[#058bc0] to-[#0066cc] text-white -mx-6 -mt-6 px-6 py-6 mb-6 rounded-t-lg">
            <DialogTitle className="flex items-center gap-3 text-3xl font-bold">
              {selectedFeature && (() => {
                const IconComponent = features[selectedFeature as keyof typeof features].icon;
                return (
                  <>
                    <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                      <IconComponent className="h-10 w-10 text-white" />
                    </div>
                    <span>{t(`feature.${selectedFeature}.details.title`)}</span>
                  </>
                );
              })()}
            </DialogTitle>
          </DialogHeader>
          
          {selectedFeature && (() => {
            const featureData = features[selectedFeature as keyof typeof features];
            const isAIFeature = selectedFeature === 'ai';
            
            return (
              <div className="space-y-6">
                {/* Features List */}
                <Card className="p-6 border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white shadow-lg">
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-gray-900">
                    <CheckCircle className="h-6 w-6 text-green-500" />
                    {isAIFeature ? 'Aktuelle KI-Funktionen' : t('modal.features.title')}
                  </h3>
                  <ul className="space-y-3">
                    {featureData.details.features.map((feature: string, index: number) => (
                      <li key={index} className="flex items-start gap-3 p-2 rounded-lg hover:bg-blue-50 transition-colors">
                        <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700 font-medium">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </Card>

                {/* Future Features (nur für KI) */}
                {isAIFeature && featureData.details.futureFeatures && (
                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-purple-600" />
                      Zukünftige KI-Agenten & Features
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Diese Features werden in zukünftigen Updates verfügbar sein:
                    </p>
                    <ul className="space-y-3">
                      {featureData.details.futureFeatures.map((feature: string, index: number) => (
                        <li key={index} className="flex items-start gap-3">
                          <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                          <span className="text-gray-700">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Benefits */}
                <Card className="p-6 border-2 border-green-200 bg-gradient-to-br from-green-50 to-white shadow-lg">
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-gray-900">
                    <CheckCircle className="h-6 w-6 text-green-500" />
                    {t('modal.benefits.title')}
                  </h3>
                  <ul className="space-y-3">
                    {featureData.details.benefits.map((benefit: string, index: number) => (
                      <li key={index} className="flex items-start gap-3 p-2 rounded-lg hover:bg-green-50 transition-colors">
                        <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700 font-medium">{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
                {/* Technical Details */}
                {!isAIFeature && (
                  <Card className="p-6 border-2 border-gray-200 bg-gradient-to-br from-gray-50 to-white shadow-lg">
                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-gray-900">
                      <Settings className="h-6 w-6 text-[#058bc0]" />
                      {t('modal.technical.title')}
                    </h3>
                    <ul className="space-y-3">
                      <li className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                        <CheckCircle className="h-5 w-5 text-[#058bc0] mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700 font-medium">
                          {t('tech.localStorage')}
                        </span>
                      </li>
                      <li className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                        <CheckCircle className="h-5 w-5 text-[#058bc0] mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700 font-medium">
                          {t('tech.gdpr')}
                        </span>
                      </li>
                      <li className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                        <CheckCircle className="h-5 w-5 text-[#058bc0] mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700 font-medium">
                          {t('tech.realtime')}
                        </span>
                      </li>
                      <li className="flex items-start gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                        <CheckCircle className="h-5 w-5 text-[#058bc0] mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700 font-medium">
                          {t('tech.mobile')}
                        </span>
                      </li>
                    </ul>
                  </Card>
                )}

                {/* KI Technical Details */}
                {isAIFeature && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Zap className="h-5 w-5 text-purple-600" />
                      KI-Technologie
                    </h3>
                    <ul className="space-y-3">
                      <li className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                        <span className="text-gray-700">
                          <strong>Google Gemini 2.0 Flash:</strong> Moderne Multimodal-KI für Text- und Bildanalyse
                        </span>
                      </li>
                      <li className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                        <span className="text-gray-700">
                          <strong>Vision API:</strong> OCR und Dokumentenanalyse direkt aus Bildern
                        </span>
                      </li>
                      <li className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                        <span className="text-gray-700">
                          <strong>Konfidenz-basiert:</strong> KI rät nicht - nur sichere Entscheidungen (≥85% Konfidenz)
                        </span>
                      </li>
                      <li className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                        <span className="text-gray-700">
                          <strong>EU-Datenresidenz:</strong> Alle KI-Verarbeitungen erfolgen in der EU
                        </span>
                      </li>
                      <li className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                        <span className="text-gray-700">
                          <strong>DSGVO-konform:</strong> Vollständige Compliance mit deutschen Datenschutzgesetzen
                        </span>
                      </li>
                    </ul>
                  </div>
                )}

                {/* Call to Action */}
                <div className="text-center pt-4 border-t">
                  <p className="text-gray-600 mb-4">
                    {t('modal.cta.title')}
                  </p>
                  <div className="flex gap-3 justify-center">
                    <Button 
                      className="bg-[#058bc0] hover:bg-[#047aa0]"
                      onClick={() => {
                        setSelectedFeature(null);
                        setShowRegisterForm(true);
                      }}
                    >
                      Jetzt anmelden
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => setSelectedFeature(null)}
                    >
                      {t('modal.cta.close')}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>



      {/* Detailed Information Modal */}
      <Dialog open={showDetailedInfo} onOpenChange={setShowDetailedInfo}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-3xl mb-6">
              <Package className="h-10 w-10 text-[#058bc0]" />
              TradeTrackr - Detaillierte Systeminformationen
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-8">
            {/* TradeTrackr Mobile App */}
            <section>
              <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <MapPin className="h-6 w-6 text-[#058bc0]" />
                TradeTrackr Mobile App
              </h3>
              <Card className="p-6 bg-gradient-to-br from-[#058bc0]/5 to-[#0066cc]/10 border-2 border-[#058bc0]/20">
                <div className="mb-6">
                  <p className="text-lg text-[#058bc0] text-center font-semibold bg-white/80 px-4 py-2 rounded-lg border border-[#058bc0]/20 shadow-sm">
                    Native iOS & Android Anwendung für die mobile Arbeit vor Ort
                  </p>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-lg mb-3 text-[#058bc0]">Mobile Kernfunktionen</h4>
                    <ul className="space-y-2 text-gray-600">
                      <li>• <strong>Projektverwaltung:</strong> Vollständige Projektübersicht, Status-Tracking und Projektzuweisungen</li>
                      <li>• <strong>Zeiterfassung:</strong> Präzise Arbeitszeiterfassung mit Start/Stopp, Pausenverwaltung und Überstundenberechnung</li>
                      <li>• <strong>Berichtserstellung:</strong> Umfassende Arbeitsberichte mit Foto-Integration, digitalen Unterschriften und automatischer Zeiterfassung</li>
                      <li>• <strong>Materialverwaltung:</strong> Kategorisierte Materialverwaltung mit Bestandstracking und Kostenkontrolle</li>
                      <li>• <strong>Offline-Funktionalität:</strong> Vollständige Nutzung ohne Internetverbindung mit automatischer Synchronisation</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg mb-3 text-[#058bc0]">Technische Features</h4>
                    <ul className="space-y-2 text-gray-600">
                      <li>• <strong>Cross-Platform:</strong> Native iOS und Android App mit einheitlicher Benutzeroberfläche</li>
                      <li>• <strong>Firebase-Integration:</strong> Cloud-basierte Datenspeicherung und Echtzeit-Synchronisation</li>
                      <li>• <strong>SQLite-Datenbank:</strong> Lokale Datenspeicherung für Offline-Nutzung</li>
                      <li>• <strong>Kamera & GPS:</strong> Fotoaufnahmen für Projekte und Standorterfassung</li>
                      <li>• <strong>Mehrsprachigkeit:</strong> Deutsche und englische Lokalisierung</li>
                    </ul>
                  </div>
                </div>
                <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h5 className="font-semibold text-blue-900 mb-2">Mobile Vorteile für Handwerker:</h5>
                  <ul className="text-sm text-blue-800 space-y-1">
                                          <li>• <strong>Vor-Ort-Arbeit:</strong> Vollständige Funktionalität direkt auf der Baustelle</li>
                      <li>• <strong>Echtzeit-Updates:</strong> Sofortige Synchronisation mit dem Büro und anderen Teammitgliedern</li>
                      <li>• <strong>Professionelle Berichte:</strong> Kundenberichte mit Fotos und digitalen Unterschriften</li>
                      <li>• <strong>Zeitersparnis:</strong> Automatisierte Zeiterfassung und Berichtserstellung</li>
                  </ul>
                </div>
              </Card>
            </section>

            {/* TradeTrackr Web Portal */}
            <section>
              <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Settings className="h-6 w-6 text-[#058bc0]" />
                TradeTrackr Web Portal
              </h3>
              <Card className="p-6 bg-gradient-to-br from-[#058bc0]/5 to-[#0066cc]/10 border-2 border-[#058bc0]/20">
                <div className="mb-6">
                  <p className="text-lg text-[#058bc0] text-center font-semibold bg-white/80 px-4 py-2 rounded-lg border border-[#058bc0]/20 shadow-sm">
                    Professionelle Web-basierte Verwaltungsplattform für die zentrale Verwaltung
                  </p>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-lg mb-3 text-[#058bc0]">Web Portal Kernfunktionen</h4>
                    <ul className="space-y-2 text-gray-600">
                      <li>• <strong>Zentrale Verwaltung:</strong> Übersicht über alle Projekte, Mitarbeiter und Materialien</li>
                      <li>• <strong>Detaillierte Berichte:</strong> Umfassende Analysen, Statistiken und Auswertungen</li>
                      <li>• <strong>Benutzerverwaltung:</strong> Rollenbasierte Zugriffskontrolle und Berechtigungen</li>
                      <li>• <strong>Projektkoordination:</strong> Planung, Zuweisung und Überwachung aller Projekte</li>
                      <li>• <strong>Datenexport:</strong> CSV/Excel Export und PDF-Berichtgenerierung</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg mb-3 text-[#058bc0]">Administrative Features</h4>
                    <ul className="space-y-2 text-gray-600">
                      <li>• <strong>Dashboard:</strong> Übersichtliche Darstellung aller wichtigen Kennzahlen</li>
                      <li>• <strong>Kundenverwaltung:</strong> Vollständige Kundendaten und Projektverfolgung</li>
                      <li>• <strong>Materialverwaltung:</strong> Bestandsverwaltung, Kategorisierung und Kostenkontrolle</li>
                      <li>• <strong>Zeiterfassung:</strong> Übersicht aller Arbeitszeiten und Auswertungen</li>
                      <li>• <strong>Integration:</strong> Nahtlose Verbindung mit der Mobile App</li>
                    </ul>
                  </div>
                </div>
                <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h5 className="font-semibold text-blue-900 mb-2">Web Portal Vorteile für das Büro:</h5>
                  <ul className="text-sm text-blue-800 space-y-1">
                                          <li>• <strong>Zentrale Übersicht:</strong> Alle Geschäftsprozesse an einem Ort</li>
                      <li>• <strong>Professionelle Berichte:</strong> Kundenberichte und interne Auswertungen</li>
                      <li>• <strong>Effiziente Verwaltung:</strong> Optimierte Arbeitsabläufe und Prozesse</li>
                      <li>• <strong>Datenanalyse:</strong> Umfassende Einblicke in die Geschäftsentwicklung</li>
                  </ul>
                </div>
              </Card>
            </section>

            {/* System Overview */}
            <section>
              <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Settings className="h-6 w-6 text-[#058bc0]" />
                Systemüberblick
              </h3>
              <div className="grid md:grid-cols-2 gap-6">
                <Card className="p-6">
                  <h4 className="font-semibold text-lg mb-3 text-[#058bc0]">Plattform & Technologie</h4>
                  <ul className="space-y-2 text-gray-600">
                    <li>• Web-basierte Anwendung (Browser)</li>
                    <li>• Mobile App für iOS und Android</li>
                    <li>• Cloud-basierte Datenspeicherung</li>
                    <li>• Offline-Funktionalität verfügbar</li>
                    <li>• Automatische Updates</li>
                  </ul>
                </Card>
                <Card className="p-6">
                  <h4 className="font-semibold text-lg mb-3 text-[#058bc0]">Systemvoraussetzungen</h4>
                  <ul className="space-y-2 text-gray-600">
                    <li>• Moderne Browser (Chrome, Firefox, Safari)</li>
                    <li>• Internetverbindung für Synchronisation</li>
                    <li>• Smartphone/Tablet für mobile Nutzung</li>
                    <li>• Kamera für Fotoaufnahmen</li>
                    <li>• GPS für Standorterfassung</li>
                  </ul>
                </Card>
              </div>
            </section>

            {/* Detailed Features */}
            <section>
              <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Package className="h-6 w-6 text-[#058bc0]" />
                Erweiterte Funktionsbereiche
              </h3>
              <div className="grid gap-6">
                
                {/* Data Management */}
                <Card className="p-6">
                  <h4 className="font-semibold text-xl mb-4 flex items-center gap-2">
                    <Database className="h-5 w-5 text-[#058bc0]" />
                    Datenverwaltung & Sicherheit
                  </h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h5 className="font-medium text-gray-900 mb-2">Datensicherheit</h5>
                      <ul className="text-sm text-gray-600 space-y-1">
                                              <li>• SSL-Verschlüsselung (256-Bit)</li>
                      <li>• DSGVO-konforme Datenhaltung</li>
                      <li>• Tägliche automatische Backups</li>
                      <li>• Rollenbasierte Zugriffskontrollen</li>
                      <li>• Audit-Logs für alle Änderungen</li>
                      </ul>
                    </div>
                    <div>
                      <h5 className="font-medium text-gray-900 mb-2">Datenexport & Import</h5>
                      <ul className="text-sm text-gray-600 space-y-1">
                                              <li>• CSV/Excel Export aller Daten</li>
                      <li>• PDF-Berichte automatisch generiert</li>
                      <li>• Datenimport aus bestehenden Systemen</li>
                      <li>• API-Schnittstellen verfügbar</li>
                      <li>• Vollständige Datenportabilität</li>
                      </ul>
                    </div>
                  </div>
                </Card>

                {/* Communication Features */}
                <Card className="p-6">
                  <h4 className="font-semibold text-xl mb-4 flex items-center gap-2">
                    <MessageCircle className="h-5 w-5 text-[#058bc0]" />
                    Kommunikation & Zusammenarbeit
                  </h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h5 className="font-medium text-gray-900 mb-2">Interne Kommunikation</h5>
                      <ul className="text-sm text-gray-600 space-y-1">
                                              <li>• Integriertes Nachrichtensystem</li>
                      <li>• Projektbezogene Kommunikation</li>
                      <li>• Dateiaustausch und -freigabe</li>
                      <li>• Benachrichtigungen und Alerts</li>
                      <li>• Team-Chat für Projekte</li>
                      </ul>
                    </div>
                    <div>
                      <h5 className="font-medium text-gray-900 mb-2">Externe Schnittstellen</h5>
                      <ul className="text-sm text-gray-600 space-y-1">
                                              <li>• E-Mail-Integration für Berichte</li>
                      <li>• WhatsApp Business API</li>
                      <li>• PDF-Versand an Kunden</li>
                      <li>• Kalendersynchronisation</li>
                      <li>• QR-Code-Generierung</li>
                      </ul>
                    </div>
                  </div>
                </Card>

                {/* Analytics & Reporting */}
                <Card className="p-6">
                  <h4 className="font-semibold text-xl mb-4 flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-[#058bc0]" />
                    Erweiterte Analyse & Reporting
                  </h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h5 className="font-medium text-gray-900 mb-2">Business Intelligence</h5>
                      <ul className="text-sm text-gray-600 space-y-1">
                                              <li>• Interaktive Dashboards</li>
                      <li>• KPI-Tracking und -Monitoring</li>
                      <li>• Projektrentabilitätsanalyse</li>
                      <li>• Mitarbeiterproduktivitätsberichte</li>
                      <li>• Kostenverfolgung und -optimierung</li>
                      </ul>
                    </div>
                    <div>
                      <h5 className="font-medium text-gray-900 mb-2">Automatische Berichte</h5>
                      <ul className="text-sm text-gray-600 space-y-1">
                                              <li>• Wöchentliche/Monatliche Zusammenfassungen</li>
                      <li>• Projektstatusberichte</li>
                      <li>• Arbeitszeitauswertungen</li>
                      <li>• Materialverbrauchsanalysen</li>
                      <li>• Kundenspezifische Berichte</li>
                      </ul>
                    </div>
                  </div>
                </Card>

                {/* Mobile Capabilities */}
                <Card className="p-6">
                  <h4 className="font-semibold text-xl mb-4 flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-[#058bc0]" />
                    Mobile Funktionen & Vor-Ort-Arbeit
                  </h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                                              <h5 className="font-medium text-gray-900 mb-2">Offline-Funktionalität</h5>
                      <ul className="text-sm text-gray-600 space-y-1">
                                              <li>• Vollständige Offline-Berichtserstellung</li>
                      <li>• Automatische Synchronisation</li>
                      <li>• Lokale Datenspeicherung</li>
                      <li>• Konfliktlösung bei Synchronisation</li>
                      <li>• Offline-Foto- und Dokumentaufnahme</li>
                      </ul>
                    </div>
                    <div>
                      <h5 className="font-medium text-gray-900 mb-2">Standort & Navigation</h5>
                      <ul className="text-sm text-gray-600 space-y-1">
                                              <li>• GPS-basierte Standorterfassung</li>
                      <li>• Automatische Fahrtenbuch-Führung</li>
                      <li>• Geofencing für Projektbereiche</li>
                      <li>• Routenoptimierung</li>
                      <li>• Standortbasierte Zeiterfassung</li>
                      </ul>
                    </div>
                  </div>
                </Card>

                {/* Integration & Customization */}
                <Card className="p-6">
                  <h4 className="font-semibold text-xl mb-4 flex items-center gap-2">
                    <Settings className="h-5 w-5 text-[#058bc0]" />
                    Integration & Anpassungen
                  </h4>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h5 className="font-medium text-gray-900 mb-2">System-Integration</h5>
                      <ul className="text-sm text-gray-600 space-y-1">
                                              <li>• ERP-System-Anbindung</li>
                      <li>• Buchhaltungssoftware-Integration</li>
                      <li>• CRM-System-Verbindung</li>
                      <li>• Kalender-Synchronisation</li>
                      <li>• E-Mail-System-Integration</li>
                      </ul>
                    </div>
                    <div>
                      <h5 className="font-medium text-gray-900 mb-2">Individualisierung</h5>
                      <ul className="text-sm text-gray-600 space-y-1">
                                              <li>• Firmenspezifische Anpassungen</li>
                      <li>• Custom Branding verfügbar</li>
                      <li>• Workflow-Anpassungen</li>
                      <li>• Benutzerdefinierte Felder</li>
                      <li>• Spezielle Berichtsvorlagen</li>
                      </ul>
                    </div>
                  </div>
                </Card>
              </div>
            </section>

            {/* Benefits Summary */}
            <section>
              <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <CheckCircle className="h-6 w-6 text-[#058bc0]" />
                Zusammenfassung der Vorteile
              </h3>
              <div className="grid md:grid-cols-3 gap-4">
                <Card className="p-4 bg-gradient-to-br from-[#058bc0]/5 to-[#058bc0]/10">
                  <h4 className="font-semibold mb-2 text-[#058bc0]">Effizienzsteigerung</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                                      <li>• 30% Zeitersparnis bei Verwaltung</li>
                  <li>• 50% schnellere Berichtserstellung</li>
                  <li>• Automatisierte Workflows</li>
                  </ul>
                </Card>
                <Card className="p-4 bg-gradient-to-br from-[#058bc0]/5 to-[#058bc0]/10">
                  <h4 className="font-semibold mb-2 text-[#058bc0]">Kostenreduzierung</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                                      <li>• Weniger Verwaltungsaufwand</li>
                  <li>• Reduzierte Papierkosten</li>
                  <li>• Optimierte Ressourcennutzung</li>
                  </ul>
                </Card>
                <Card className="p-4 bg-gradient-to-br from-[#058bc0]/5 to-[#058bc0]/10">
                                          <h4 className="font-semibold mb-2 text-[#058bc0]">Qualitätssteigerung</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                                      <li>• Vollständige Dokumentation</li>
                  <li>• Weniger Fehler durch Digitalisierung</li>
                  <li>• Professionelle Kundenberichte</li>
                  </ul>
                </Card>
              </div>
            </section>

            {/* Support & Training */}
            <section>
              <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Users className="h-6 w-6 text-[#058bc0]" />
                Support & Schulungen
              </h3>
              <div className="grid md:grid-cols-2 gap-6">
                <Card className="p-6">
                  <h4 className="font-semibold text-lg mb-3 text-[#058bc0]">Kundensupport</h4>
                  <ul className="space-y-2 text-gray-600">
                    <li>• 24/7 technischer Support</li>
                    <li>• Deutscher Kundendienst</li>
                    <li>• Video-Call Support verfügbar</li>
                    <li>• Umfangreiche Dokumentation</li>
                    <li>• Community-Forum</li>
                  </ul>
                </Card>
                <Card className="p-6">
                  <h4 className="font-semibold text-lg mb-3 text-[#058bc0]">Schulung & Einführung</h4>
                  <ul className="space-y-2 text-gray-600">
                    <li>• Kostenlose Einführungsschulung</li>
                    <li>• Online-Webinare regelmäßig</li>
                    <li>• Video-Tutorials verfügbar</li>
                    <li>• Vor-Ort-Schulungen möglich</li>
                    <li>• Zertifizierte Trainer</li>
                  </ul>
                </Card>
              </div>
            </section>
          </div>
        </DialogContent>
      </Dialog>

      {/* Pricing Modal */}
      <Dialog open={showPricing} onOpenChange={setShowPricing}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-gray-50 to-white border-4 border-[#058bc0] shadow-2xl">
          <DialogHeader className="bg-gradient-to-r from-[#058bc0] to-[#0066cc] text-white -mx-6 -mt-6 px-6 py-6 mb-6 rounded-t-lg">
            <DialogTitle className="flex items-center gap-3 text-3xl font-bold">
              <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                <CreditCard className="h-10 w-10 text-white" />
              </div>
              <span>TradeTrackr Preismodell</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-8">
            {/* Pricing Overview */}
            <section className="text-center">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Transparente und faire Preise
              </h3>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                Einfaches Lizenzmodell ohne versteckte Kosten. Bezahlen Sie nur für das, was Sie nutzen.
              </p>
            </section>

            {/* Main Pricing Cards */}
            <section>
              <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                {/* Monthly Plan */}
                <Card className="relative p-8 border-2 border-gray-300 rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 bg-gradient-to-br from-white to-gray-50">
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 mb-4">
                      <Calendar className="h-8 w-8 text-[#058bc0]" />
                    </div>
                    <h4 className="text-2xl font-bold text-gray-900 mb-4">Monatlich</h4>
                    <div className="mb-6">
                      <div className="flex items-baseline justify-center gap-2 mb-2">
                        <span className="text-5xl font-extrabold bg-gradient-to-r from-[#058bc0] to-[#0066cc] bg-clip-text text-transparent">19,00€</span>
                        <span className="text-xl text-gray-600 font-medium ml-2">netto</span>
                      </div>
                      <p className="text-sm text-gray-500 mt-2 font-medium">pro Benutzer / Monat</p>
                    </div>
                    
                    <div className="space-y-4 text-left mb-8">
                      <div className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">Mobile App Zugang</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">Browser-Anwendung inklusive</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">Alle Premium-Features</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">Cloud-Synchronisation</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">Support per E-Mail</span>
                      </div>
                    </div>
                    
                    <Button 
                      className="w-full bg-gradient-to-r from-[#058bc0] to-[#0066cc] hover:from-[#047aa0] hover:to-[#0056b3] text-white font-semibold py-6 text-lg shadow-lg hover:shadow-xl transition-all duration-300"
                      onClick={() => setShowUnderConstruction(true)}
                    >
                      Monatlich starten
                    </Button>
                  </div>
                </Card>

                {/* Yearly Plan - Recommended */}
                <Card className="relative p-8 border-4 border-[#058bc0] rounded-xl shadow-2xl bg-gradient-to-br from-[#058bc0]/10 via-blue-50 to-[#058bc0]/5 hover:shadow-3xl transition-all duration-300 hover:scale-105 transform">
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                    <Badge className="bg-gradient-to-r from-[#058bc0] to-[#0066cc] text-white px-5 py-1.5 shadow-lg text-sm font-bold">
                      ⭐ Empfohlen - 17% Ersparnis
                    </Badge>
                  </div>
                  
                  <div className="text-center pt-2">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-[#058bc0] to-[#0066cc] mb-4 shadow-lg">
                      <Zap className="h-10 w-10 text-white" />
                    </div>
                    <h4 className="text-3xl font-extrabold text-gray-900 mb-4">Jährlich</h4>
                    <div className="mb-6">
                      <div className="flex items-baseline justify-center gap-2 mb-2">
                        <span className="text-2xl text-gray-400 line-through font-medium">228€</span>
                        <span className="text-5xl font-extrabold bg-gradient-to-r from-[#058bc0] to-[#0066cc] bg-clip-text text-transparent">190€</span>
                      </div>
                      <span className="text-xl text-gray-600 font-medium">netto</span>
                      <p className="text-sm text-gray-500 mt-2 font-medium">pro Benutzer / Jahr</p>
                      <p className="text-sm font-bold text-green-600 mt-2 bg-green-50 px-3 py-1 rounded-full inline-block">
                        = nur 15,83€ pro Monat
                      </p>
                    </div>
                    
                    <div className="space-y-4 text-left mb-8">
                      <div className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">Mobile App Zugang</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">Browser-Anwendung inklusive</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">Alle Premium-Features</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">Cloud-Synchronisation</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">Prioritäts-Support</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                                                  <span className="text-gray-700 font-semibold">38€ Ersparnis pro Jahr</span>
                      </div>
                    </div>
                    
                    <Button 
                      className="w-full bg-gradient-to-r from-[#058bc0] via-[#0066cc] to-[#058bc0] hover:from-[#047aa0] hover:via-[#0056b3] hover:to-[#047aa0] text-white font-bold py-6 text-lg shadow-xl hover:shadow-2xl transition-all duration-300"
                      onClick={() => setShowUnderConstruction(true)}
                    >
                      Jährlich starten (Spare 38€) →
                    </Button>
                  </div>
                </Card>
              </div>
            </section>



            {/* Licensing Details */}
            <section>
              <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
                Lizenzdetails & Vorteile
              </h3>
              <div className="grid md:grid-cols-2 gap-6">
                <Card className="p-6">
                  <h4 className="font-semibold text-lg mb-3 text-[#058bc0] flex items-center gap-2">
                    <Wrench className="h-5 w-5" />
                    Was ist enthalten?
                  </h4>
                  <ul className="space-y-2 text-gray-600">
                    <li>• Eine Mobile App Lizenz pro Benutzer</li>
                    <li>• Browser-Zugang automatisch inklusive</li>
                    <li>• 2GB Cloud-Speicher pro Lizenz inklusive</li>
                    <li>• Unbegrenzte Projekte und Berichte</li>
                    <li>• Automatische Updates</li>
                    <li>• Offline-Funktionalität</li>
                  </ul>
                </Card>

                <Card className="p-6">
                  <h4 className="font-semibold text-lg mb-3 text-[#058bc0] flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Keine versteckten Kosten
                  </h4>
                  <ul className="space-y-2 text-gray-600">
                                        <li>• Keine Einrichtungsgebühren</li>
                    <li>• Keine Kosten für Updates</li>
                    <li>• 2GB Cloud-Speicher inklusive</li>
                    <li>• Monatlich kündbar (bei monatlicher Zahlung)</li>
                    <li>• 7 Tage kostenlos testen</li>
                    <li>• Spezielle Konditionen für größere Teams ab 25 Mitarbeitern</li>
                  </ul>
                </Card>
              </div>
            </section>

            {/* Pricing Examples */}
            <section>
              <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
                Preisbeispiele für Ihr Unternehmen
              </h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Card className="p-4 bg-gray-50">
                  <h5 className="font-semibold text-center mb-2">Einzelunternehmer</h5>
                  <p className="text-2xl font-bold text-center text-[#058bc0] mb-2">190€</p>
                  <p className="text-sm text-center text-gray-600">pro Jahr (1 Benutzer)</p>
                                        <p className="text-xs text-center text-gray-500 mt-1">€19,00 × 10 Monate (2 Monate geschenkt)</p>
                </Card>
                <Card className="p-4 bg-gray-50">
                  <h5 className="font-semibold text-center mb-2">Kleiner Betrieb</h5>
                  <p className="text-2xl font-bold text-center text-[#058bc0] mb-2">950€</p>
                  <p className="text-sm text-center text-gray-600">pro Jahr (5 Benutzer)</p>
                  <p className="text-xs text-center text-gray-500 mt-1">€19,00 × 5 Benutzer × 10 Monate</p>
                </Card>
                <Card className="p-4 bg-gray-50">
                  <h5 className="font-semibold text-center mb-2">Mittlerer Betrieb</h5>
                  <p className="text-2xl font-bold text-center text-[#058bc0] mb-2">1.900€</p>
                  <p className="text-sm text-center text-gray-600">pro Jahr (10 Benutzer)</p>
                  <p className="text-xs text-center text-gray-500 mt-1">€19,00 × 10 Benutzer × 10 Monate</p>
                </Card>
              </div>
                              <p className="text-center text-sm text-gray-500 mt-4">
                  Alle Preise zzgl. gesetzlicher MwSt. • Jährliche Abrechnung mit 2 Monaten Rabatt • Spezielle Konditionen für größere Teams ab 25 Mitarbeitern
                </p>
            </section>

            {/* Call to Action */}
            <section className="text-center bg-gradient-to-r from-[#058bc0]/10 to-[#0066cc]/10 rounded-xl p-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Bereit für TradeTrackr?
              </h3>
                              <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
                  Starten Sie noch heute mit Ihrer 7-tägigen kostenlosen Testversion. 
                  Keine Kreditkarte erforderlich.
                </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Button 
                  size="lg" 
                  className="bg-gradient-to-r from-[#058bc0] to-[#0066cc] hover:from-[#047aa0] hover:to-[#0056b3] text-white shadow-lg"
                  onClick={() => setShowUnderConstruction(true)}
                >
                  Kostenlos testen
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  className="border-[#058bc0] text-[#058bc0] hover:bg-[#058bc0] hover:text-white"
                  onClick={() => setShowUnderConstruction(true)}
                >
                  Demo vereinbaren
                </Button>
              </div>
            </section>
          </div>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="flex items-center bg-gradient-to-r from-[#058bc0] to-[#0066cc] p-1.5 rounded-lg">
                  <img 
                    src="/TTroundLogo.jpg" 
                    alt="TradeTrackr Logo" 
                    className="h-8 w-8 object-contain rounded bg-white/90 p-0.5"
                  />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">TradeTrackr</h3>
                </div>
              </div>
              <p className="text-gray-400">
                {t('footer.tagline')}
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">{t('footer.legal')}</h3>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <button 
                    onClick={() => setShowImpressum(true)}
                    className="hover:text-white cursor-pointer"
                  >
                    {t('footer.imprint')}
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => setShowAGB(true)}
                    className="hover:text-white cursor-pointer"
                  >
                    AGB
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => setShowDatenschutz(true)}
                    className="hover:text-white cursor-pointer"
                  >
                    {t('footer.privacy')}
                  </button>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">{t('footer.contact')}</h3>
              <ul className="space-y-2 text-gray-400">
                <li>support@tradetrackr.de</li>
                <li>+49 123 456 789</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">{t('footer.appDownload')}</h3>
              <div className="flex space-x-2">
                <Badge 
                  variant="outline" 
                  className="cursor-pointer hover:bg-gray-700"
                  onClick={() => setShowUnderConstruction(true)}
                >
                  App Store
                </Badge>
                <Badge 
                  variant="outline" 
                  className="cursor-pointer hover:bg-gray-700"
                  onClick={() => setShowUnderConstruction(true)}
                >
                  Google Play
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Impressum Modal */}
      <Dialog open={showImpressum} onOpenChange={setShowImpressum}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-gray-50 to-white border-4 border-[#058bc0] shadow-2xl">
          <DialogHeader className="bg-gradient-to-r from-[#058bc0] to-[#0066cc] text-white -mx-6 -mt-6 px-6 py-6 mb-6 rounded-t-lg">
            <DialogTitle className="flex items-center gap-3 text-3xl font-bold">
              <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                <Scale className="h-10 w-10 text-white" />
              </div>
              <span>Impressum</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-8">
            {/* Company Information */}
            <section>
              <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Building className="h-6 w-6 text-[#058bc0]" />
                Angaben gemäß § 5 TMG
              </h3>
              <Card className="p-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-lg mb-4 text-[#058bc0] flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Betreiber
                    </h4>
                    <div className="space-y-2 text-gray-700">
                      <p className="font-semibold">David Bullock</p>
                      <p>Carl-Loewe-Weg 15</p>
                      <p>37154 Northeim</p>
                      <p>Deutschland</p>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg mb-4 text-[#058bc0] flex items-center gap-2">
                      <Mail className="h-5 w-5" />
                      Kontakt
                    </h4>
                    <div className="space-y-2 text-gray-700">
                      <p className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-500" />
                        <a href="mailto:info@tradetrackr.de" className="text-[#058bc0] hover:underline">
                          info@tradetrackr.de
                        </a>
                      </p>
                      <p className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-500" />
                        <a href="tel:+4955519999" className="text-[#058bc0] hover:underline">
                          +49 (0) 5551 999-999
                        </a>
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            </section>

            {/* Legal Information */}
            <section>
              <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Scale className="h-6 w-6 text-[#058bc0]" />
                Rechtliche Hinweise
              </h3>
              <div className="grid md:grid-cols-2 gap-6">
                <Card className="p-6">
                  <h4 className="font-semibold text-lg mb-3 text-[#058bc0]">Umsatzsteuer-ID</h4>
                  <p className="text-gray-700 mb-4">
                    Umsatzsteuer-Identifikationsnummer gemäß § 27 a Umsatzsteuergesetz:
                  </p>
                  <p className="font-mono text-sm bg-gray-100 p-2 rounded">
                    DE123456789 <span className="text-gray-500">(Beispiel)</span>
                  </p>
                </Card>

                <Card className="p-6">
                  <h4 className="font-semibold text-lg mb-3 text-[#058bc0]">Berufsbezeichnung</h4>
                  <div className="text-gray-700 space-y-2">
                    <p>Software-Entwicklung</p>
                    <p>Digitale Handwerkerverwaltung</p>
                    <p>Cloud-basierte Softwarelösungen</p>
                  </div>
                </Card>
              </div>
            </section>

            {/* Liability Disclaimer */}
            <section>
              <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Shield className="h-6 w-6 text-[#058bc0]" />
                Haftungsausschluss
              </h3>
              <div className="space-y-6">
                <Card className="p-6">
                  <h4 className="font-semibold text-lg mb-3 text-[#058bc0]">Haftung für Inhalte</h4>
                  <p className="text-gray-700 leading-relaxed">
                    Als Diensteanbieter sind wir gemäß § 7 Abs.1 TMG für eigene Inhalte auf diesen Seiten nach den 
                    allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als Diensteanbieter jedoch nicht 
                    unter der Verpflichtung, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach 
                    Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen.
                  </p>
                </Card>

                <Card className="p-6">
                  <h4 className="font-semibold text-lg mb-3 text-[#058bc0]">Haftung für Links</h4>
                  <p className="text-gray-700 leading-relaxed">
                    Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben. 
                    Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der verlinkten 
                    Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich.
                  </p>
                </Card>

                <Card className="p-6">
                  <h4 className="font-semibold text-lg mb-3 text-[#058bc0]">Urheberrecht</h4>
                  <p className="text-gray-700 leading-relaxed">
                    Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen 
                    Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der 
                    Grenzen des Urheberrechtes bedürfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers.
                  </p>
                </Card>
              </div>
            </section>

            {/* Privacy Notice */}
            <section>
              <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Shield className="h-6 w-6 text-[#058bc0]" />
                Datenschutz
              </h3>
              <Card className="p-6">
                <p className="text-gray-700 leading-relaxed mb-4">
                  Die Betreiber dieser Seiten nehmen den Schutz Ihrer persönlichen Daten sehr ernst. Wir behandeln Ihre 
                  personenbezogenen Daten vertraulich und entsprechend der gesetzlichen Datenschutzvorschriften sowie 
                  dieser Datenschutzerklärung.
                </p>
                <p className="text-gray-700 leading-relaxed">
                  Detaillierte Informationen zum Umgang mit Nutzerdaten finden Sie in unserer Datenschutzerklärung, 
                  die Sie über den entsprechenden Link im Footer dieser Website erreichen können.
                </p>
              </Card>
            </section>

            {/* Technical Information */}
            <section>
              <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Settings className="h-6 w-6 text-[#058bc0]" />
                Technische Informationen
              </h3>
              <div className="grid md:grid-cols-2 gap-6">
                <Card className="p-6">
                  <h4 className="font-semibold text-lg mb-3 text-[#058bc0]">Hosting</h4>
                  <div className="text-gray-700 space-y-2">
                    <p>Diese Website wird gehostet durch:</p>
                    <p className="font-semibold">Cloud-Provider</p>
                    <p className="text-sm">Serverstandort: Deutschland/EU</p>
                    <p className="text-sm">DSGVO-konform</p>
                  </div>
                </Card>

                <Card className="p-6">
                  <h4 className="font-semibold text-lg mb-3 text-[#058bc0]">Technologie</h4>
                  <div className="text-gray-700 space-y-2">
                    <p>• React/TypeScript Frontend</p>
                    <p>• Cloud-basierte Infrastruktur</p>
                    <p>• SSL/TLS-Verschlüsselung</p>
                    <p>• HTTPS-Übertragung</p>
                  </div>
                </Card>
              </div>
            </section>

            {/* Last Updated */}
            <section className="text-center bg-gray-50 rounded-lg p-6">
              <p className="text-sm text-gray-600">
                <strong>Stand:</strong> Januar 2025
              </p>
              <p className="text-sm text-gray-600 mt-2">
                Dieses Impressum wurde zuletzt am {new Date().toLocaleDateString('de-DE')} überprüft.
              </p>
            </section>
          </div>
        </DialogContent>
      </Dialog>

      {/* AGB Modal */}
      <Dialog open={showAGB} onOpenChange={setShowAGB}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-gray-50 to-white border-4 border-[#058bc0] shadow-2xl">
          <DialogHeader className="bg-gradient-to-r from-[#058bc0] to-[#0066cc] text-white -mx-6 -mt-6 px-6 py-6 mb-6 rounded-t-lg">
            <DialogTitle className="flex items-center gap-3 text-3xl font-bold">
              <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                <FileTextIcon className="h-10 w-10 text-white" />
              </div>
              <span>Allgemeine Geschäftsbedingungen</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-8">

            {/* Introduction */}
            <section>
              <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Info className="h-6 w-6 text-[#058bc0]" />
                Einleitung
              </h3>
              <Card className="p-6">
                <p className="text-gray-700 leading-relaxed mb-4">
                  Diese Allgemeinen Geschäftsbedingungen (AGB) gelten für die Nutzung der Software "TradeTrackr" 
                  und alle damit verbundenen Dienstleistungen von David Bullock, Carl-Loewe-Weg 15, 37154 Northeim, Deutschland.
                </p>
                <p className="text-gray-700 leading-relaxed">
                  Durch die Nutzung unserer Software akzeptieren Sie diese Bedingungen vollständig. 
                  Falls Sie mit diesen Bedingungen nicht einverstanden sind, nutzen Sie bitte unsere Software nicht.
                </p>
              </Card>
            </section>

            {/* Service Description */}
            <section>
              <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Settings className="h-6 w-6 text-[#058bc0]" />
                Beschreibung der Leistungen
              </h3>
              <Card className="p-6">
                <h4 className="font-semibold text-lg mb-3 text-[#058bc0]">TradeTrackr Software</h4>
                <div className="text-gray-700 space-y-3">
                  <p>TradeTrackr ist eine cloud-basierte Softwarelösung für die Verwaltung von Handwerksbetrieben und deren Projekten. Die Software umfasst:</p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>Projektmanagement und -verfolgung</li>
                    <li>Mitarbeiter- und Kundenverwaltung</li>
                    <li>Materialgruppen- und Kategorienverwaltung</li>
                    <li>Berichtswesen und Dokumentation</li>
                    <li>Auftraggeber-Zugang für Projektverfolgung</li>
                    <li>Mobile Zugänglichkeit über Webbrowser</li>
                  </ul>
                </div>
              </Card>
            </section>

            {/* Registration and Account */}
            <section>
              <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <User className="h-6 w-6 text-[#058bc0]" />
                Registrierung und Nutzerkonto
              </h3>
              <div className="grid md:grid-cols-2 gap-6">
                <Card className="p-6">
                  <h4 className="font-semibold text-lg mb-3 text-[#058bc0]">Registrierung</h4>
                  <div className="text-gray-700 space-y-2">
                    <p>• Vollständige und korrekte Angaben bei der Registrierung</p>
                    <p>• Verpflichtung zur Geheimhaltung der Zugangsdaten</p>
                    <p>• Sofortige Benachrichtigung bei unbefugter Nutzung</p>
                    <p>• Ein Konto pro natürlicher Person</p>
                  </div>
                </Card>

                <Card className="p-6">
                  <h4 className="font-semibold text-lg mb-3 text-[#058bc0]">Nutzungsberechtigung</h4>
                  <div className="text-gray-700 space-y-2">
                    <p>• Nicht übertragbare Nutzungsrechte</p>
                    <p>• Keine Weitergabe an Dritte</p>
                    <p>• Einhaltung der geltenden Gesetze</p>
                    <p>• Verbot missbräuchlicher Nutzung</p>
                  </div>
                </Card>
              </div>
            </section>

            {/* Pricing and Payment */}
            <section>
              <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <CreditCard className="h-6 w-6 text-[#058bc0]" />
                Preise und Zahlungsbedingungen
              </h3>
              <div className="grid md:grid-cols-2 gap-6">
                <Card className="p-6">
                  <h4 className="font-semibold text-lg mb-3 text-[#058bc0]">Preismodell</h4>
                  <div className="text-gray-700 space-y-3">
                    <div>
                                              <p className="font-semibold">€19,00 pro Benutzer/Monat</p>
                      <p className="text-sm">• Flexibles Benutzer-Management</p>
                      <p className="text-sm">• Alle Funktionen inklusive</p>
                      <p className="text-sm">• Skalierbar nach Bedarf</p>
                    </div>
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm font-medium text-blue-800">Beispiel-Kalkulation:</p>
                                              <p className="text-sm text-blue-700">• 5 Benutzer = €95,00/Monat</p>
                        <p className="text-sm text-blue-700">• 10 Benutzer = €190,00/Monat</p>
                        <p className="text-sm text-blue-700">• 20 Benutzer = €380,00/Monat</p>
                    </div>
                  </div>
                </Card>

                <Card className="p-6">
                  <h4 className="font-semibold text-lg mb-3 text-[#058bc0]">Zahlungsbedingungen</h4>
                  <div className="text-gray-700 space-y-2">
                    <p>• Monatliche Abrechnung im Voraus</p>
                    <p>• €19,00 pro aktiven Benutzer pro Monat</p>
                    <p>• Zahlung per Kreditkarte oder SEPA-Lastschrift</p>
                    <p>• Automatische Verlängerung bei fehlender Kündigung</p>
                    <p>• Preisanpassungen mit 30 Tagen Vorankündigung</p>
                    <p>• Keine Rückerstattung bei vorzeitiger Kündigung</p>
                    <p>• Benutzer können jederzeit hinzugefügt oder entfernt werden</p>
                  </div>
                </Card>
              </div>
            </section>

            {/* Data Protection */}
            <section>
              <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Shield className="h-6 w-6 text-[#058bc0]" />
                Datenschutz und Datensicherheit
              </h3>
              <Card className="p-6">
                <h4 className="font-semibold text-lg mb-3 text-[#058bc0]">Datenschutz</h4>
                <div className="text-gray-700 space-y-3">
                  <p>Die Erhebung, Verarbeitung und Nutzung Ihrer personenbezogenen Daten erfolgt ausschließlich nach den Bestimmungen der DSGVO und des BDSG.</p>
                  <div className="space-y-2">
                    <p><strong>Datenverarbeitung:</strong> Alle Daten werden in Deutschland/EU verarbeitet</p>
                    <p><strong>Verschlüsselung:</strong> SSL/TLS-Verschlüsselung für alle Übertragungen</p>
                    <p><strong>Backup:</strong> Regelmäßige Sicherungskopien Ihrer Daten</p>
                    <p><strong>Zugriffskontrolle:</strong> Strenge Zugriffskontrollen und Authentifizierung</p>
                  </div>
                </div>
              </Card>
            </section>

            {/* Availability and Support */}
            <section>
              <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Clock className="h-6 w-6 text-[#058bc0]" />
                Verfügbarkeit und Support
              </h3>
              <div className="grid md:grid-cols-2 gap-6">
                <Card className="p-6">
                  <h4 className="font-semibold text-lg mb-3 text-[#058bc0]">Verfügbarkeit</h4>
                  <div className="text-gray-700 space-y-2">
                    <p>• Zielverfügbarkeit: 99,5% (außer Wartungszeiten)</p>
                    <p>• Geplante Wartungen: Nachts zwischen 02:00-04:00 Uhr</p>
                    <p>• Ungeplante Ausfälle: Sofortige Benachrichtigung</p>
                    <p>• Keine Haftung für Ausfälle höherer Gewalt</p>
                  </div>
                </Card>

                <Card className="p-6">
                  <h4 className="font-semibold text-lg mb-3 text-[#058bc0]">Support</h4>
                  <div className="text-gray-700 space-y-2">
                    <p>• E-Mail-Support: Mo-Fr 09:00-17:00 Uhr</p>
                    <p>• Enterprise-Kunden: Prioritäts-Support</p>
                    <p>• Dokumentation: Online verfügbar</p>
                    <p>• Schulungen: Auf Anfrage verfügbar</p>
                  </div>
                </Card>
              </div>
            </section>

            {/* Liability */}
            <section>
              <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <AlertTriangle className="h-6 w-6 text-[#058bc0]" />
                Haftung
              </h3>
              <Card className="p-6">
                <div className="text-gray-700 space-y-4">
                  <div>
                    <h4 className="font-semibold text-lg mb-2 text-[#058bc0]">Haftungsbeschrö¤nkung</h4>
                    <p>Wir haften nur für Vorsatz und grobe Fahrlässigkeit. Die Haftung für leichte Fahrlässigkeit ist ausgeschlossen, soweit es sich nicht um Schäden an Leben, Körper oder Gesundheit handelt.</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg mb-2 text-[#058bc0]">Haftungsumfang</h4>
                    <p>Die Haftung ist auf den Betrag der im Schadensfall gezahlten monatlichen Nutzungsgebühr (€19,00 × Anzahl aktiver Benutzer) begrenzt. Dies gilt nicht für Schäden aus der Verletzung von Leben, Körper oder Gesundheit.</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg mb-2 text-[#058bc0]">Datenverlust</h4>
                    <p>Wir empfehlen regelmäßige Backups Ihrer Daten. Wir übernehmen keine Haftung für Datenverluste, die durch technische Störungen oder höhere Gewalt entstehen.</p>
                  </div>
                </div>
              </Card>
            </section>

            {/* Termination */}
            <section>
              <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <X className="h-6 w-6 text-[#058bc0]" />
                Kündigung
              </h3>
              <Card className="p-6">
                <div className="text-gray-700 space-y-4">
                  <div>
                    <h4 className="font-semibold text-lg mb-2 text-[#058bc0]">Kündigungsfristen</h4>
                    <p>• Kündigung jederzeit mit 30 Tagen Frist zum Monatsende möglich</p>
                    <p>• Schriftliche Kündigung per E-Mail erforderlich</p>
                    <p>• Sofortige Kündigung bei Vertragsverletzung möglich</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg mb-2 text-[#058bc0]">Nach der Kündigung</h4>
                    <p>• Zugang wird zum Ende des Abrechnungszeitraums gesperrt</p>
                    <p>• Daten werden 30 Tage nach Kündigung gelöscht</p>
                    <p>• Export der Daten auf Anfrage möglich</p>
                  </div>
                </div>
              </Card>
            </section>

            {/* Final Provisions */}
            <section>
              <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Scale className="h-6 w-6 text-[#058bc0]" />
                Schlussbestimmungen
              </h3>
              <Card className="p-6">
                <div className="text-gray-700 space-y-4">
                  <div>
                    <h4 className="font-semibold text-lg mb-2 text-[#058bc0]">Änderungen der AGB</h4>
                    <p>Wir behalten uns vor, diese AGB jederzeit zu ändern. Änderungen werden 30 Tage vor Inkrafttreten per E-Mail angekündigt. Bei Widerspruch kann das Vertragsverhältnis gekündigt werden.</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg mb-2 text-[#058bc0]">Recht und Gerichtsstand</h4>
                    <p>Es gilt deutsches Recht. Gerichtsstand ist Northeim, Deutschland. Verbraucher können auch vor ihrem Wohnsitzgericht klagen.</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg mb-2 text-[#058bc0]">Salvatorische Klausel</h4>
                    <p>Sollten einzelne Bestimmungen unwirksam sein, bleibt der Vertrag im übrigen wirksam. Unwirksame Bestimmungen werden durch wirksame ersetzt, die dem wirtschaftlichen Zweck am nächsten kommen.</p>
                  </div>
                </div>
              </Card>
            </section>

            {/* Contact Information */}
            <section>
              <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Mail className="h-6 w-6 text-[#058bc0]" />
                Kontakt
              </h3>
              <Card className="p-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-lg mb-3 text-[#058bc0]">Anbieter</h4>
                    <div className="text-gray-700 space-y-1">
                      <p>David Bullock</p>
                      <p>Carl-Loewe-Weg 15</p>
                      <p>37154 Northeim</p>
                      <p>Deutschland</p>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg mb-3 text-[#058bc0]">Kontakt</h4>
                    <div className="text-gray-700 space-y-2">
                      <p className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-500" />
                        <a href="mailto:info@tradetrackr.de" className="text-[#058bc0] hover:underline">
                          info@tradetrackr.de
                        </a>
                      </p>
                      <p className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-gray-500" />
                        <a href="tel:+4955519999" className="text-[#058bc0] hover:underline">
                          +49 (0) 5551 999-999
                        </a>
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            </section>

            {/* Last Updated */}
            <section className="text-center bg-gray-50 rounded-lg p-6">
              <p className="text-sm text-gray-600">
                <strong>Stand:</strong> Januar 2025
              </p>
              <p className="text-sm text-gray-600 mt-2">
                Diese AGB wurden zuletzt am {new Date().toLocaleDateString('de-DE')} überprüft.
              </p>
            </section>

            {/* Datenschutz */}
            <section>
              <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Shield className="h-6 w-6 text-[#058bc0]" />
                Datenschutzerklärung
              </h3>
              <Card className="p-6">
                <div className="text-gray-700 space-y-6">
                  <div>
                    <h4 className="font-semibold text-lg mb-2 text-[#058bc0]">Verantwortlicher</h4>
                    <p>Verantwortlich für die Datenverarbeitung ist:</p>
                    <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                      <p>David Bullock</p>
                      <p>Carl-Loewe-Weg 15</p>
                      <p>37154 Northeim</p>
                      <p>Deutschland</p>
                      <p className="mt-2">
                        <strong>E-Mail:</strong> info@tradetrackr.de<br />
                        <strong>Telefon:</strong> +49 (0) 5551 999-999
                      </p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-lg mb-2 text-[#058bc0]">Erhobene Daten</h4>
                    <div className="space-y-2">
                      <p><strong>Registrierungsdaten:</strong></p>
                      <ul className="list-disc list-inside ml-4 space-y-1">
                        <li>Name und E-Mail-Adresse</li>
                        <li>Unternehmensinformationen</li>
                        <li>Benutzername und Passwort (verschlüsselt)</li>
                      </ul>
                      <p className="mt-3"><strong>Nutzungsdaten:</strong></p>
                      <ul className="list-disc list-inside ml-4 space-y-1">
                        <li>Projekt- und Arbeitsdaten</li>
                        <li>Zeiterfassungsdaten</li>
                        <li>Kommunikationsdaten innerhalb der Plattform</li>
                        <li>Technische Logs (IP-Adresse, Browser-Informationen)</li>
                      </ul>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-lg mb-2 text-[#058bc0]">Zweck der Datenverarbeitung</h4>
                    <div className="space-y-2">
                      <p>Ihre Daten werden für folgende Zwecke verarbeitet:</p>
                      <ul className="list-disc list-inside ml-4 space-y-1">
                        <li>Bereitstellung und Verwaltung Ihres Benutzerkontos</li>
                        <li>Durchführung der vertraglich vereinbarten Leistungen</li>
                        <li>Kommunikation mit Ihnen über den Service</li>
                        <li>Verbesserung und Optimierung der Software</li>
                        <li>Erfüllung gesetzlicher Verpflichtungen</li>
                      </ul>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-lg mb-2 text-[#058bc0]">Rechtsgrundlage</h4>
                    <div className="space-y-2">
                      <p>Die Verarbeitung erfolgt auf Grundlage von:</p>
                      <ul className="list-disc list-inside ml-4 space-y-1">
                        <li><strong>Art. 6 Abs. 1 lit. b DSGVO:</strong> Zur Erfüllung des Nutzungsvertrags</li>
                        <li><strong>Art. 6 Abs. 1 lit. f DSGVO:</strong> Für unsere berechtigten Interessen (Service-Optimierung, Sicherheit)</li>
                        <li><strong>Art. 6 Abs. 1 lit. c DSGVO:</strong> Zur Erfüllung gesetzlicher Verpflichtungen</li>
                      </ul>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-lg mb-2 text-[#058bc0]">Datenweitergabe</h4>
                    <div className="space-y-2">
                      <p>Eine Weitergabe Ihrer Daten erfolgt nur:</p>
                      <ul className="list-disc list-inside ml-4 space-y-1">
                        <li>An IT-Dienstleister für Hosting und Wartung (strikte Vertraulichkeit)</li>
                        <li>Bei gesetzlicher Verpflichtung oder behördlicher Anordnung</li>
                        <li>Mit Ihrer ausdrücklichen Einwilligung</li>
                      </ul>
                      <p className="mt-2 text-sm text-gray-600">
                        <strong>Hinweis:</strong> Wir geben keine Daten an Dritte zu Werbezwecken weiter.
                      </p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-lg mb-2 text-[#058bc0]">Speicherdauer</h4>
                    <div className="space-y-2">
                      <p>Ihre Daten werden gespeichert:</p>
                      <ul className="list-disc list-inside ml-4 space-y-1">
                        <li><strong>Wö¤hrend der Vertragslaufzeit</strong> und darüber hinaus für 30 Tage</li>
                        <li><strong>Buchungsdaten:</strong> 10 Jahre (gesetzliche Aufbewahrungspflicht)</li>
                        <li><strong>Log-Daten:</strong> 90 Tage für Sicherheitszwecke</li>
                      </ul>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-lg mb-2 text-[#058bc0]">Ihre Rechte</h4>
                    <div className="space-y-2">
                      <p>Sie haben folgende Rechte:</p>
                      <ul className="list-disc list-inside ml-4 space-y-1">
                                          <li><strong>Auskunft:</strong> Über die zu Ihrer Person gespeicherten Daten</li>
                  <li><strong>Berichtigung:</strong> Unrichtiger oder unvollständiger Daten</li>
                  <li><strong>Löschung:</strong> Ihrer personenbezogenen Daten</li>
                  <li><strong>Einschränkung:</strong> Der Verarbeitung Ihrer Daten</li>
                  <li><strong>Datenübertragbarkeit:</strong> Ihrer Daten in einem strukturierten Format</li>
                  <li><strong>Widerspruch:</strong> Gegen die Verarbeitung Ihrer Daten</li>
                      </ul>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-lg mb-2 text-[#058bc0]">Datensicherheit</h4>
                    <div className="space-y-2">
                      <p>Wir setzen technische und organisatorische Maßnahmen ein:</p>
                      <ul className="list-disc list-inside ml-4 space-y-1">
                        <li>Verschlüsselte Datenübertragung (HTTPS/TLS)</li>
                        <li>Verschlüsselte Datenspeicherung</li>
                        <li>Regelmäßige Sicherheitsupdates</li>
                        <li>Zugriffskontrollen und Authentifizierung</li>
                        <li>Regelmäßige Backups</li>
                      </ul>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-lg mb-2 text-[#058bc0]">Cookies und Tracking</h4>
                    <div className="space-y-2">
                      <p>Wir verwenden:</p>
                      <ul className="list-disc list-inside ml-4 space-y-1">
                        <li><strong>Notwendige Cookies:</strong> Für die Funktionalität der Anwendung</li>
                        <li><strong>Session-Cookies:</strong> Für die Benutzerauthentifizierung</li>
                        <li><strong>Analytics-Cookies:</strong> Nur mit Ihrer Einwilligung</li>
                      </ul>
                      <p className="mt-2 text-sm text-gray-600">
                        Sie können Cookies in Ihren Browser-Einstellungen verwalten.
                      </p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-lg mb-2 text-[#058bc0]">Kontakt zum Datenschutz</h4>
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p>Bei Fragen zum Datenschutz erreichen Sie uns unter:</p>
                      <p className="mt-2">
                        <strong>E-Mail:</strong> datenschutz@tradetrackr.de<br />
                        <strong>Postalisch:</strong> David Bullock, Carl-Loewe-Weg 15, 37154 Northeim
                      </p>
                      <p className="mt-2 text-sm text-gray-600">
                        Sie haben auch das Recht, sich bei der zuständigen Aufsichtsbehörde zu beschweren.
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            </section>
          </div>
        </DialogContent>
      </Dialog>

      {/* Datenschutz Modal */}
      <Dialog open={showDatenschutz} onOpenChange={setShowDatenschutz}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-gray-50 to-white border-4 border-[#058bc0] shadow-2xl">
          <DialogHeader className="bg-gradient-to-r from-[#058bc0] to-[#0066cc] text-white -mx-6 -mt-6 px-6 py-6 mb-6 rounded-t-lg">
            <DialogTitle className="flex items-center gap-3 text-3xl font-bold">
              <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                <Shield className="h-10 w-10 text-white" />
              </div>
              <span>Datenschutzerklärung</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-8">
            <div>
              <h4 className="font-semibold text-lg mb-2 text-[#058bc0]">Verantwortlicher</h4>
              <p>Verantwortlich für die Datenverarbeitung ist:</p>
              <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                <p>David Bullock</p>
                <p>Carl-Loewe-Weg 15</p>
                <p>37154 Northeim</p>
                <p>Deutschland</p>
                <p className="mt-2">
                  <strong>E-Mail:</strong> info@tradetrackr.de<br />
                  <strong>Telefon:</strong> +49 (0) 5551 999-999
                </p>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-lg mb-2 text-[#058bc0]">Erhobene Daten</h4>
              <div className="space-y-2">
                <p><strong>Registrierungsdaten:</strong></p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Name und E-Mail-Adresse</li>
                  <li>Unternehmensinformationen</li>
                  <li>Benutzername und Passwort (verschlüsselt)</li>
                </ul>
                <p className="mt-3"><strong>Nutzungsdaten:</strong></p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Projekt- und Arbeitsdaten</li>
                  <li>Zeiterfassungsdaten</li>
                  <li>Kommunikationsdaten innerhalb der Plattform</li>
                  <li>Technische Logs (IP-Adresse, Browser-Informationen)</li>
                </ul>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-lg mb-2 text-[#058bc0]">Zweck der Datenverarbeitung</h4>
              <div className="space-y-2">
                <p>Ihre Daten werden für folgende Zwecke verarbeitet:</p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Bereitstellung und Verwaltung Ihres Benutzerkontos</li>
                  <li>Durchführung der vertraglich vereinbarten Leistungen</li>
                  <li>Kommunikation mit Ihnen über den Service</li>
                  <li>Verbesserung und Optimierung der Software</li>
                  <li>Erfüllung gesetzlicher Verpflichtungen</li>
                </ul>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-lg mb-2 text-[#058bc0]">Rechtsgrundlage</h4>
              <div className="space-y-2">
                <p>Die Verarbeitung erfolgt auf Grundlage von:</p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li><strong>Art. 6 Abs. 1 lit. b DSGVO:</strong> Zur Erfüllung des Nutzungsvertrags</li>
                  <li><strong>Art. 6 Abs. 1 lit. f DSGVO:</strong> Für unsere berechtigten Interessen (Service-Optimierung, Sicherheit)</li>
                  <li><strong>Art. 6 Abs. 1 lit. c DSGVO:</strong> Zur Erfüllung gesetzlicher Verpflichtungen</li>
                </ul>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-lg mb-2 text-[#058bc0]">Datenweitergabe</h4>
              <div className="space-y-2">
                <p>Eine Weitergabe Ihrer Daten erfolgt nur:</p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>An IT-Dienstleister für Hosting und Wartung (strikte Vertraulichkeit)</li>
                  <li>Bei gesetzlicher Verpflichtung oder behördlicher Anordnung</li>
                  <li>Mit Ihrer ausdrücklichen Einwilligung</li>
                </ul>
                <p className="mt-2 text-sm text-gray-600">
                  <strong>Hinweis:</strong> Wir geben keine Daten an Dritte zu Werbezwecken weiter.
                </p>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-lg mb-2 text-[#058bc0]">Speicherdauer</h4>
              <div className="space-y-2">
                <p>Ihre Daten werden gespeichert:</p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li><strong>Wö¤hrend der Vertragslaufzeit</strong> und darüber hinaus für 30 Tage</li>
                  <li><strong>Buchungsdaten:</strong> 10 Jahre (gesetzliche Aufbewahrungspflicht)</li>
                  <li><strong>Log-Daten:</strong> 90 Tage für Sicherheitszwecke</li>
                </ul>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-lg mb-2 text-[#058bc0]">Ihre Rechte</h4>
              <div className="space-y-2">
                <p>Sie haben folgende Rechte:</p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li><strong>Auskunft:</strong> öber die zu Ihrer Person gespeicherten Daten</li>
                  <li><strong>Berichtigung:</strong> Unrichtiger oder unVollständiger Daten</li>
                  <li><strong>Löschung:</strong> Ihrer personenbezogenen Daten</li>
                  <li><strong>Einschrönkung:</strong> Der Verarbeitung Ihrer Daten</li>
                  <li><strong>Datenöbertragbarkeit:</strong> Ihrer Daten in einem strukturierten Format</li>
                  <li><strong>Widerspruch:</strong> Gegen die Verarbeitung Ihrer Daten</li>
                </ul>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-lg mb-2 text-[#058bc0]">Datensicherheit</h4>
              <div className="space-y-2">
                <p>Wir setzen technische und organisatorische Maßnahmen ein:</p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Verschlüsselte Datenübertragung (HTTPS/TLS)</li>
                  <li>Verschlüsselte Datenspeicherung</li>
                  <li>Regelmäßige Sicherheitsupdates</li>
                  <li>Zugriffskontrollen und Authentifizierung</li>
                  <li>Regelmäßige Backups</li>
                </ul>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-lg mb-2 text-[#058bc0]">Cookies und Tracking</h4>
              <div className="space-y-2">
                <p>Wir verwenden:</p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li><strong>Notwendige Cookies:</strong> Für die Funktionalität der Anwendung</li>
                  <li><strong>Session-Cookies:</strong> Für die Benutzerauthentifizierung</li>
                  <li><strong>Analytics-Cookies:</strong> Nur mit Ihrer Einwilligung</li>
                </ul>
                <p className="mt-2 text-sm text-gray-600">
                  Sie können Cookies in Ihren Browser-Einstellungen verwalten.
                </p>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-lg mb-2 text-[#058bc0]">Kontakt zum Datenschutz</h4>
              <div className="p-3 bg-blue-50 rounded-lg">
                <p>Bei Fragen zum Datenschutz erreichen Sie uns unter:</p>
                <p className="mt-2">
                  <strong>E-Mail:</strong> datenschutz@tradetrackr.de<br />
                  <strong>Postalisch:</strong> David Bullock, Carl-Loewe-Weg 15, 37154 Northeim
                </p>
                                  <p className="mt-2 text-sm text-gray-600">
                    Sie haben auch das Recht, sich bei der zuständigen Aufsichtsbehörde zu beschweren.
                  </p>
              </div>
            </div>

            {/* Last Updated */}
            <section className="text-center bg-gray-50 rounded-lg p-6">
              <p className="text-sm text-gray-600">
                <strong>Stand:</strong> Januar 2025
              </p>
                              <p className="text-sm text-gray-600 mt-2">
                  Diese Datenschutzerklärung wurde zuletzt am {new Date().toLocaleDateString('de-DE')} überprüft.
                </p>
            </section>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cloud Storage Pricing Modal */}
      <Dialog open={showCloudStorage} onOpenChange={setShowCloudStorage}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-gray-50 to-white border-4 border-[#058bc0] shadow-2xl">
          <DialogHeader className="bg-gradient-to-r from-[#058bc0] to-[#0066cc] text-white -mx-6 -mt-6 px-6 py-6 mb-6 rounded-t-lg">
            <DialogTitle className="flex items-center gap-3 text-3xl font-bold">
              <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                <Database className="h-10 w-10 text-white" />
              </div>
              <span>TradeTrackr Cloud-Speicher – Preise</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-8">
            {/* Header */}
            <div className="text-center">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Einfache, skalierbare Speicherpreise
              </h3>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                Jede Lizenz enthält <strong>+2 GB gratis</strong> für Berichte. Erweitern Sie jederzeit mit flexiblen 500‑GB‑Blöcken. EU‑freundlich, betrieben auf Google Cloud.
              </p>
            </div>

            {/* Warum TradeTrackr Cloud-Speicher die beste Wahl ist */}
            <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200">
              <div className="text-center mb-6">
                <h4 className="text-xl font-bold text-gray-900 mb-3">
                  TradeTrackr Cloud-Speicher – Unschlagbare Preise für Unternehmen
                </h4>
                <p className="text-gray-600 mb-4">
                  Unsere Preise sind jetzt noch wettbewerbsfähiger! Erhalten Sie professionellen Cloud-Speicher 
                  mit Enterprise-Features zu unschlagbaren Preisen – perfekt für Ihr Handwerksunternehmen.
                </p>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h5 className="font-semibold text-[#058bc0] mb-3">Mit TradeTrackr Cloud bekommen Sie:</h5>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 font-bold">✓</span>
                      <span className="text-gray-700">+2 GB kostenlos bei jeder Lizenz inklusive</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 font-bold">✓</span>
                      <span className="text-gray-700">Garantierte EU-Datenhaltung & DSGVO-Konformität</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 font-bold">✓</span>
                      <span className="text-gray-700">Business-SLA mit hoher Verfügbarkeit (99,9%)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 font-bold">✓</span>
                      <span className="text-gray-700">Nahtlose Integration in TradeTrackr</span>
                    </li>
                  </ul>
                </div>
                
                <div>
                  <h5 className="font-semibold text-[#058bc0] mb-3">Weitere Vorteile:</h5>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 font-bold">✓</span>
                      <span className="text-gray-700">Flexible Erweiterung in 500-GB-Schritten</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 font-bold">✓</span>
                      <span className="text-gray-700">Archiv-Option für kostengünstige Langzeitspeicherung</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 font-bold">✓</span>
                      <span className="text-gray-700">Ihre Projekte, Berichte und Teamdokumente direkt an einem Ort</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600 font-bold">✓</span>
                      <span className="text-gray-700">Professionelle Lösung für Handwerksbetriebe</span>
                    </li>
                  </ul>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-white rounded-lg border border-blue-200">
                <p className="text-center text-gray-700 font-medium">
                  <span className="text-[#058bc0] mr-2">💡</span>
                  Professioneller Cloud-Speicher zu unschlagbaren Preisen – perfekt für Handwerksbetriebe 
                  und Projektteams. Sichere, skalierbare und DSGVO-konforme Lösung direkt in TradeTrackr integriert.
                </p>
              </div>
            </Card>

            {/* Pricing Cards */}
            <div className="grid md:grid-cols-3 gap-6">
              {/* Basic */}
              <Card className="relative p-6 border-2 border-gray-300 rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 bg-gradient-to-br from-white to-gray-50">
                <div className="absolute -top-3 right-4">
                  <Badge className="bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0 shadow-lg px-3 py-1">
                    + 2 GB inklusive
                  </Badge>
                </div>
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 mb-4">
                    <Database className="h-8 w-8 text-[#058bc0]" />
                  </div>
                  <h4 className="text-2xl font-bold text-gray-900 mb-2">Basic</h4>
                  <p className="text-gray-600 font-medium">500 GB Standard (Regional) für den täglichen Einsatz</p>
                </div>
                
                <div className="text-center mb-6">
                  <div className="flex items-baseline justify-center gap-2 mb-2">
                    <span className="text-5xl font-extrabold bg-gradient-to-r from-[#058bc0] to-[#0066cc] bg-clip-text text-transparent">€4,99</span>
                    <span className="text-lg text-gray-600 font-medium">/ Monat</span>
                  </div>
                  <p className="text-sm text-gray-500">Unschlagbarer Preis</p>
                </div>
                
                <div className="space-y-3 text-left mb-6 min-h-[200px]">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700 font-medium">500 GB Standard (Regional)</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700 font-medium">Bis zu 5 % Coldline inbegriffen</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700 font-medium">EU-Datenresidenz, DSGVO-ready</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700 font-medium">Native TradeTrackr-Integration</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <Info className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-500">E-Mail-Support</span>
                  </div>
                </div>
                
                <Button 
                  className="w-full bg-gradient-to-r from-[#058bc0] to-[#0066cc] hover:from-[#047aa0] hover:to-[#0056b3] text-white font-semibold py-6 text-lg shadow-lg hover:shadow-xl transition-all duration-300"
                  onClick={() => setShowUnderConstruction(true)}
                >
                  Basic wählen
                </Button>
              </Card>

              {/* Pro - Recommended */}
              <Card className="relative p-6 border-4 border-[#058bc0] rounded-xl shadow-2xl bg-gradient-to-br from-[#058bc0]/10 via-blue-50 to-[#058bc0]/5 hover:shadow-3xl transition-all duration-300 hover:scale-105 transform">
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                  <Badge className="bg-gradient-to-r from-[#058bc0] to-[#0066cc] text-white px-5 py-1.5 shadow-lg text-sm font-bold">
                    ⭐ Empfohlen
                  </Badge>
                </div>
                <div className="absolute -top-3 right-4">
                  <Badge className="bg-gradient-to-r from-green-500 to-green-600 text-white border-0 shadow-lg px-3 py-1">
                    + 2 GB inklusive
                  </Badge>
                </div>
                
                <div className="text-center mb-6 pt-2">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-[#058bc0] to-[#0066cc] mb-4 shadow-lg">
                    <Zap className="h-10 w-10 text-white" />
                  </div>
                  <h4 className="text-3xl font-extrabold text-gray-900 mb-2">Pro</h4>
                  <p className="text-gray-700 font-semibold">1 TB Standard + 1 TB Archiv — bestes Preis‑Leistungs‑Verhältnis</p>
                </div>
                
                <div className="text-center mb-6">
                  <div className="flex items-baseline justify-center gap-2 mb-2">
                    <span className="text-5xl font-extrabold bg-gradient-to-r from-[#058bc0] to-[#0066cc] bg-clip-text text-transparent">€13,49</span>
                    <span className="text-lg text-gray-600 font-medium">/ Monat</span>
                  </div>
                  <p className="text-sm text-green-600 font-semibold">Bester Wert!</p>
                </div>
                
                <div className="space-y-3 text-left mb-6 min-h-[200px]">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700 font-medium">1 TB Standard (Regional)</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700 font-medium">+ 1 TB Archiv/Backup</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700 font-medium">Lifecycle-Regeln (Auto-Archivierung)</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700 font-medium">Dateiversionierung</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-[#058bc0] mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700 font-medium">Priorisierter E-Mail-Support</span>
                  </div>
                </div>
                
                <Button 
                  className="w-full bg-gradient-to-r from-[#058bc0] via-[#0066cc] to-[#058bc0] hover:from-[#047aa0] hover:via-[#0056b3] hover:to-[#047aa0] text-white font-bold py-6 text-lg shadow-xl hover:shadow-2xl transition-all duration-300 animate-pulse"
                  onClick={() => setShowUnderConstruction(true)}
                >
                  Pro wählen →
                </Button>
              </Card>

              {/* Enterprise */}
              <Card className="relative p-6 border-2 border-purple-300 rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 bg-gradient-to-br from-purple-50 via-white to-purple-50">
                <div className="absolute -top-3 right-4">
                  <Badge className="bg-gradient-to-r from-purple-500 to-purple-600 text-white border-0 shadow-lg px-3 py-1">
                    + 2 GB inklusive
                  </Badge>
                </div>
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-purple-100 to-purple-200 mb-4">
                    <Shield className="h-8 w-8 text-purple-600" />
                  </div>
                  <h4 className="text-2xl font-bold text-gray-900 mb-2">Enterprise</h4>
                  <p className="text-gray-600 font-medium">1 TB Premium (Multi‑Region) + 1 TB Archiv</p>
                </div>
                
                <div className="text-center mb-6">
                  <div className="flex items-baseline justify-center gap-2 mb-2">
                    <span className="text-5xl font-extrabold bg-gradient-to-r from-purple-600 to-purple-800 bg-clip-text text-transparent">€16,99</span>
                    <span className="text-lg text-gray-600 font-medium">/ Monat</span>
                  </div>
                  <p className="text-sm text-purple-600 font-semibold">Premium-Features</p>
                </div>
                
                <div className="space-y-3 text-left mb-6 min-h-[200px]">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700 font-medium">1 TB Premium (Multi-Region)</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700 font-medium">+ 1 TB Archiv/Backup</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700 font-medium">99,95 % Verfügbarkeits-SLA</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700 font-medium">Rollenbasierte Rechte & Audit-Logs</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-purple-500 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700 font-medium">Priorisierter Support & Onboarding</span>
                  </div>
                </div>
                
                <Button 
                  className="w-full bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-700 hover:to-purple-900 text-white font-semibold py-6 text-lg shadow-lg hover:shadow-xl transition-all duration-300"
                  onClick={() => setShowUnderConstruction(true)}
                >
                  Enterprise wählen
                </Button>
              </Card>
            </div>

            {/* Add-ons */}
            <Card className="p-6 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border-2 border-blue-300 shadow-xl">
              <h4 className="text-xl font-bold text-gray-900 mb-4 text-center flex items-center justify-center gap-2">
                <Package className="h-6 w-6 text-[#058bc0]" />
                Mehr Speicher nötig?
              </h4>
              <div className="flex flex-wrap justify-center gap-3 mb-4">
                <Badge className="px-4 py-2 text-sm bg-gradient-to-r from-blue-500 to-blue-600 text-white border-0 shadow-md">
                  + 500 GB Standard — €12,99
                </Badge>
                <Badge className="px-4 py-2 text-sm bg-gradient-to-r from-purple-500 to-purple-600 text-white border-0 shadow-md">
                  + 500 GB Premium — €16,99
                </Badge>
                <Badge className="px-4 py-2 text-sm bg-gradient-to-r from-green-500 to-green-600 text-white border-0 shadow-md">
                  + 500 GB Archiv — €4,99
                </Badge>
              </div>
              <div className="text-center text-sm text-gray-700 bg-white/50 p-4 rounded-lg border border-blue-200">
                <p className="font-medium">💡 Jede Lizenz enthält <strong className="text-[#058bc0]">2 GB gratis</strong>. Preise monatlich, zzgl. USt. Archiv-/Backup‑Speicher ist für seltene Zugriffe gedacht; Abruf/Egress kann je nach Nutzung zusätzliche Gebühren verursachen.</p>
              </div>
            </Card>

            {/* Footer */}
            <div className="text-center text-sm text-gray-500">
              <p>Preise in EUR; USt. nicht enthalten. Bereitgestellt über Google Cloud Storage. Regionen & Compliance‑Optionen lassen sich im Checkout festlegen.</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Under Construction Modal */}
      <Dialog open={showUnderConstruction} onOpenChange={setShowUnderConstruction}>
        <DialogContent className="max-w-md bg-gradient-to-br from-yellow-50 via-white to-orange-50 border-4 border-yellow-400 shadow-2xl">
          <DialogHeader className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white -mx-6 -mt-6 px-6 py-6 mb-6 rounded-t-lg">
            <DialogTitle className="flex items-center gap-3 text-2xl font-bold text-center justify-center">
              <div className="bg-white/20 p-3 rounded-full backdrop-blur-sm">
                <AlertTriangle className="h-8 w-8 text-white" />
              </div>
              <span>In Entwicklung</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="text-center py-6">
            <div className="mb-6">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-yellow-100 to-orange-100 mb-4">
                <Clock className="h-10 w-10 text-yellow-600" />
              </div>
            </div>
            <p className="text-gray-700 font-semibold text-lg mb-3">
              Diese Funktion wird derzeit entwickelt und ist bald verfügbar.
            </p>
            <p className="text-sm text-gray-600 mb-6">
              Wir arbeiten daran, Ihnen eine beeindruckende Demo und Screenshots zu präsentieren.
            </p>
            
            <Button 
              onClick={() => setShowUnderConstruction(false)}
              className="bg-gradient-to-r from-[#058bc0] to-[#0066cc] hover:from-[#047aa0] hover:to-[#0056b3] text-white font-semibold px-8 py-6 shadow-lg hover:shadow-xl transition-all duration-300"
            >
              Verstanden
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LandingPage;
