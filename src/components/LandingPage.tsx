import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Wrench, Users, FileText, BarChart3, Shield, Clock, X, CheckCircle, Calendar, MapPin, Clock as ClockIcon, Package, Settings, Database, MessageCircle, Scale, Mail, Phone, Building, User, Info, CreditCard, AlertTriangle, FileText as FileTextIcon } from 'lucide-react';
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
          "Vollstö¤ndige Projektdokumentation",
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
        title: "Zeiterfassung - Prö¤zise Arbeitszeiten",
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
          "Prö¤zise Kostenkontrolle",
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
          "WhatsApp-ö¤hnliche Chat-Funktionen",
          "Gruppennachrichten für Projektteams",
          "Direktnachrichten zwischen Mitarbeitern",
          "Datei- und Bildaustausch",
          "Nachrichtenverlauf und -archiv",
          "Online-Status und Lesebestö¤tigungen",
          "Mobile und Desktop-Benachrichtigungen"
        ],
        benefits: [
          "Schnelle interne Kommunikation",
          "Verbesserte Teamkoordination",
          "Weniger E-Mails und Telefonate",
          "Projektspezifische Diskussionen"
        ]
      }
    }
  };

  return (
    <div className="min-h-screen tradetrackr-gradient-blue">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-3">
            {/* Improved Logo Design */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center bg-gradient-to-r from-[#058bc0] to-[#0066cc] p-2 rounded-lg shadow-sm">
                <img 
                  src="/TradeTrackrLogo.jpg" 
                  alt="TradeTrackr Logo" 
                  className="h-12 w-12 object-contain rounded-md bg-white/90 p-1"
                />
              </div>
              <div>
                <h1 className="text-xl font-bold text-[#058bc0] leading-tight">
                  TradeTrackr
                </h1>
                <span className="text-sm text-gray-600 leading-tight">
                  Professionelle Handwerkerverwaltung
                </span>
              </div>
            </div>
            
            <nav className="hidden md:flex space-x-8">
              <a href="#features" className="text-gray-600 hover:text-[#058bc0] transition-colors">{t('nav.features')}</a>
              <button 
                onClick={() => setShowUnderConstruction(true)}
                className="text-gray-600 hover:text-[#058bc0] transition-colors"
              >
                {t('nav.screenshots')}
              </button>
              <button 
                onClick={() => setShowPricing(true)}
                className="text-gray-600 hover:text-[#058bc0] transition-colors"
              >
                Preise
              </button>
              <a href="#contact" className="text-gray-600 hover:text-[#058bc0] transition-colors">{t('nav.contact')}</a>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-12 items-center">
            <div className="lg:col-span-2">
              <h1 className="text-5xl font-bold text-gray-900 mb-6">
                {t('hero.title')}
                <span className="text-[#058bc0]"> {t('hero.title.highlight')}</span>
                <br />{t('hero.title.brand')}
              </h1>
              <p className="text-xl text-gray-600 mb-8">
                {t('hero.subtitle')}
              </p>
              <div className="flex flex-wrap gap-4">
                <Button 
                  size="lg" 
                  className="bg-[#058bc0] hover:bg-[#047aa0]"
                  onClick={() => setShowDetailedInfo(true)}
                >
                  {t('hero.learnMore')}
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  onClick={() => setShowUnderConstruction(true)}
                >
                  {t('hero.viewDemo')}
                </Button>
              </div>
            </div>
            <div className="lg:col-span-1">
              {showRegisterForm ? (
                <RegisterForm 
                  onSuccess={() => setShowRegisterForm(false)}
                  onBack={() => setShowRegisterForm(false)}
                  onShowAGB={() => setShowAGB(true)}
                  onShowDatenschutz={() => setShowDatenschutz(true)}
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

      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">{t('features.title')}</h2>
            <p className="text-lg text-gray-600">{t('features.subtitle')}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Object.entries(features).map(([key, feature]) => {
              const IconComponent = feature.icon;
              const titleKey = `feature.${key}.title`;
              const descriptionKey = `feature.${key}.description`;
              
              return (
                <Card 
                  key={key}
                  className="tradetrackr-card cursor-pointer group transform hover:scale-105 border-2 hover:border-[#058bc0]"
                  onClick={() => setSelectedFeature(key)}
                >
                  <CardHeader className="pb-4">
                    <IconComponent className="h-12 w-12 text-[#058bc0] mb-4 group-hover:scale-110 transition-transform" />
                    <CardTitle className="text-gray-900 group-hover:text-[#058bc0] transition-colors">{t(titleKey)}</CardTitle>
                    <CardDescription className="text-gray-600">
                      {t(descriptionKey)}
                    </CardDescription>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Feature Details Modal */}
      <Dialog open={selectedFeature !== null} onOpenChange={() => setSelectedFeature(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-2xl">
              {selectedFeature && (() => {
                const IconComponent = features[selectedFeature as keyof typeof features].icon;
                return (
                  <>
                    <IconComponent className="h-8 w-8 text-[#058bc0]" />
                    {t(`feature.${selectedFeature}.details.title`)}
                  </>
                );
              })()}
            </DialogTitle>
          </DialogHeader>
          
          {selectedFeature && (
            <div className="space-y-6">
              {/* Features List */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  {t('modal.features.title')}
                </h3>
                <ul className="space-y-3">
                  {[1, 2, 3, 4, 5, 6, 7].map((index) => (
                    <li key={index} className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-[#058bc0] rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-gray-700">
                        {t(`feature.${selectedFeature}.details.features.${index}`)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Benefits */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  {t('modal.benefits.title')}
                </h3>
                <ul className="space-y-3">
                  {[1, 2, 3, 4].map((index) => (
                    <li key={index} className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-[#058bc0] rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-gray-700">
                        {t(`feature.${selectedFeature}.details.benefits.${index}`)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Technical Details */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Settings className="h-5 w-5 text-gray-600" />
                  {t('modal.technical.title')}
                </h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-[#058bc0] rounded-full mt-2 flex-shrink-0"></div>
                    <span className="text-gray-700">
                      {t('tech.localStorage')}
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-[#058bc0] rounded-full mt-2 flex-shrink-0"></div>
                    <span className="text-gray-700">
                      {t('tech.gdpr')}
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-[#058bc0] rounded-full mt-2 flex-shrink-0"></div>
                    <span className="text-gray-700">
                      {t('tech.realtime')}
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-[#058bc0] rounded-full mt-2 flex-shrink-0"></div>
                    <span className="text-gray-700">
                      {t('tech.mobile')}
                    </span>
                  </li>
                </ul>
              </div>

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
                      // Scroll to login form
                      document.querySelector('.lg\\:col-span-1')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    {t('modal.cta.login')}
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
          )}
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
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-3xl mb-6">
              <CheckCircle className="h-10 w-10 text-[#058bc0]" />
              TradeTrackr Preismodell
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
                <Card className="relative p-8 border-2 border-gray-200 rounded-xl shadow-lg">
                  <div className="text-center">
                    <h4 className="text-2xl font-bold text-[#058bc0] mb-4">Monatlich</h4>
                    <div className="mb-6">
                      <span className="text-5xl font-bold text-gray-900">17,50€</span>
                      <span className="text-xl text-gray-600 ml-2">netto</span>
                      <p className="text-sm text-gray-500 mt-2">pro Benutzer / Monat</p>
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
                      className="w-full bg-[#058bc0] hover:bg-[#047aa0] text-white py-3"
                      onClick={() => setShowUnderConstruction(true)}
                    >
                      Monatlich starten
                    </Button>
                  </div>
                </Card>

                {/* Yearly Plan - Recommended */}
                <Card className="relative p-8 border-2 border-[#058bc0] rounded-xl shadow-xl bg-gradient-to-br from-[#058bc0]/5 to-[#058bc0]/10">
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-[#058bc0] text-white px-4 py-1">
                      Empfohlen - 17% Ersparnis
                    </Badge>
                  </div>
                  
                  <div className="text-center">
                    <h4 className="text-2xl font-bold text-[#058bc0] mb-4">Jö¤hrlich</h4>
                    <div className="mb-6">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <span className="text-2xl text-gray-400 line-through">210€</span>
                        <span className="text-5xl font-bold text-gray-900">175€</span>
                      </div>
                      <span className="text-xl text-gray-600">netto</span>
                      <p className="text-sm text-gray-500 mt-2">pro Benutzer / Jahr</p>
                                              <p className="text-sm font-semibold text-[#058bc0] mt-1">
                          = nur 14,58€ pro Monat
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
                        <span className="text-gray-700">Prioritö¤ts-Support</span>
                      </div>
                      <div className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700 font-semibold">30â‚¬ Ersparnis pro Jahr</span>
                      </div>
                    </div>
                    
                    <Button 
                      className="w-full bg-gradient-to-r from-[#058bc0] to-[#0066cc] hover:from-[#047aa0] hover:to-[#0056b3] text-white py-3 shadow-lg"
                      onClick={() => setShowUnderConstruction(true)}
                    >
                      Jö¤hrlich starten (Spare 30â‚¬)
                    </Button>
                  </div>
                </Card>
              </div>
            </section>

            {/* Storage Options */}
            <section>
              <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
                Zusö¤tzlicher Speicher
              </h3>
              <div className="max-w-3xl mx-auto">
                <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200">
                  <div className="text-center">
                    <div className="flex justify-center mb-4">
                      <div className="bg-[#058bc0] p-3 rounded-full">
                        <Database className="h-8 w-8 text-white" />
                      </div>
                    </div>
                                          <h4 className="text-xl font-bold text-gray-900 mb-2">50GB Storage-Blöcke</h4>
                    <div className="mb-4">
                                              <span className="text-3xl font-bold text-[#058bc0]">5€</span>
                      <span className="text-lg text-gray-600 ml-2">netto / Monat</span>
                    </div>
                    <p className="text-gray-600 mb-4">
                      Für Organisationen mit hö¶herem Speicherbedarf
                    </p>
                    <div className="grid md:grid-cols-2 gap-4 text-left">
                      <div>
                        <h5 className="font-semibold text-gray-900 mb-2">Inkludiert:</h5>
                        <ul className="text-sm text-gray-600 space-y-1">
                                                  <li>• 50GB zusätzlicher Cloud-Speicher</li>
                        <li>• Für die gesamte Organisation</li>
                        <li>• Automatische Backup-Funktionen</li>
                        <li>• Versionsverwaltung</li>
                        </ul>
                      </div>
                      <div>
                        <h5 className="font-semibold text-gray-900 mb-2">Ideal für:</h5>
                        <ul className="text-sm text-gray-600 space-y-1">
                                                  <li>• Umfangreiche Projektdokumentation</li>
                        <li>• Große Anzahl von Fotos/Videos</li>
                        <li>• Langzeitarchivierung</li>
                        <li>• Wachsende Unternehmen</li>
                        </ul>
                      </div>
                    </div>
                    <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-800">
                        <strong>Hinweis:</strong> Storage-Blöcke können jederzeit hinzugefügt oder entfernt werden. 
                        Abrechnung erfolgt anteilig zum Nutzungszeitraum.
                      </p>
                    </div>
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
                    <li>• Mengenrabatte ab 25 Benutzern verfügbar</li>
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
                  <p className="text-2xl font-bold text-center text-[#058bc0] mb-2">175€</p>
                  <p className="text-sm text-center text-gray-600">pro Jahr (1 Benutzer)</p>
                  <p className="text-xs text-center text-gray-500 mt-1">€17,50 × 10 Monate (2 Monate geschenkt)</p>
                </Card>
                <Card className="p-4 bg-gray-50">
                  <h5 className="font-semibold text-center mb-2">Kleiner Betrieb</h5>
                  <p className="text-2xl font-bold text-center text-[#058bc0] mb-2">875€</p>
                  <p className="text-sm text-center text-gray-600">pro Jahr (5 Benutzer)</p>
                  <p className="text-xs text-center text-gray-500 mt-1">€17,50 × 5 Benutzer × 10 Monate</p>
                </Card>
                <Card className="p-4 bg-gray-50">
                  <h5 className="font-semibold text-center mb-2">Mittlerer Betrieb</h5>
                  <p className="text-2xl font-bold text-center text-[#058bc0] mb-2">1.750€</p>
                  <p className="text-sm text-center text-gray-600">pro Jahr (10 Benutzer)</p>
                  <p className="text-xs text-center text-gray-500 mt-1">€17,50 × 10 Benutzer × 10 Monate</p>
                </Card>
              </div>
                              <p className="text-center text-sm text-gray-500 mt-4">
                  Alle Preise zzgl. gesetzlicher MwSt. • Jährliche Abrechnung mit 2 Monaten Rabatt • Mengenrabatte ab 25 Benutzern verfügbar
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
                    src="/TradeTrackrLogo.jpg" 
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-3xl mb-6">
              <Scale className="h-10 w-10 text-[#058bc0]" />
              Impressum
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
                    Umsatzsteuer-Identifikationsnummer gemö¤öŸ Â§ 27 a Umsatzsteuergesetz:
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
                    <p>Cloud-basierte Softwarelö¶sungen</p>
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
                    <p>â€¢ React/TypeScript Frontend</p>
                    <p>â€¢ Cloud-basierte Infrastruktur</p>
                    <p>â€¢ SSL/TLS-Verschlüsselung</p>
                    <p>â€¢ HTTPS-öbertragung</p>
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-3xl mb-6">
              <FileTextIcon className="h-10 w-10 text-[#058bc0]" />
              Allgemeine Geschö¤ftsbedingungen
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
                      <p className="font-semibold">â‚¬17,50 pro Benutzer/Monat</p>
                      <p className="text-sm">• Flexibles Benutzer-Management</p>
                      <p className="text-sm">• Alle Funktionen inklusive</p>
                      <p className="text-sm">• Skalierbar nach Bedarf</p>
                    </div>
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm font-medium text-blue-800">Beispiel-Kalkulation:</p>
                                              <p className="text-sm text-blue-700">• 5 Benutzer = €87,50/Monat</p>
                        <p className="text-sm text-blue-700">• 10 Benutzer = €175,00/Monat</p>
                        <p className="text-sm text-blue-700">• 20 Benutzer = €350,00/Monat</p>
                    </div>
                  </div>
                </Card>

                <Card className="p-6">
                  <h4 className="font-semibold text-lg mb-3 text-[#058bc0]">Zahlungsbedingungen</h4>
                  <div className="text-gray-700 space-y-2">
                    <p>• Monatliche Abrechnung im Voraus</p>
                    <p>• €17,50 pro aktiven Benutzer pro Monat</p>
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
                    <p>Die Haftung ist auf den Betrag der im Schadensfall gezahlten monatlichen Nutzungsgebühr (€17,50 × Anzahl aktiver Benutzer) begrenzt. Dies gilt nicht für Schäden aus der Verletzung von Leben, Körper oder Gesundheit.</p>
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
                    <h4 className="font-semibold text-lg mb-2 text-[#058bc0]">ö„nderungen der AGB</h4>
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
                Datenschutzerklö¤rung
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
                        <li>Bei gesetzlicher Verpflichtung oder behö¶rdlicher Anordnung</li>
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
                      <p>Wir setzen technische und organisatorische MaöŸnahmen ein:</p>
                      <ul className="list-disc list-inside ml-4 space-y-1">
                        <li>Verschlüsselte Datenübertragung (HTTPS/TLS)</li>
                        <li>Verschlüsselte Datenspeicherung</li>
                        <li>Regelmö¤öŸige Sicherheitsupdates</li>
                        <li>Zugriffskontrollen und Authentifizierung</li>
                        <li>Regelmö¤öŸige Backups</li>
                      </ul>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-lg mb-2 text-[#058bc0]">Cookies und Tracking</h4>
                    <div className="space-y-2">
                      <p>Wir verwenden:</p>
                      <ul className="list-disc list-inside ml-4 space-y-1">
                        <li><strong>Notwendige Cookies:</strong> Für die Funktionalitö¤t der Anwendung</li>
                        <li><strong>Session-Cookies:</strong> Für die Benutzerauthentifizierung</li>
                        <li><strong>Analytics-Cookies:</strong> Nur mit Ihrer Einwilligung</li>
                      </ul>
                      <p className="mt-2 text-sm text-gray-600">
                        Sie kö¶nnen Cookies in Ihren Browser-Einstellungen verwalten.
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
                        Sie haben auch das Recht, sich bei der zustö¤ndigen Aufsichtsbehö¶rde zu beschweren.
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
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-3xl mb-6">
              <Shield className="h-10 w-10 text-[#058bc0]" />
              Datenschutzerklö¤rung
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
                  <li>Bei gesetzlicher Verpflichtung oder behö¶rdlicher Anordnung</li>
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

      {/* Under Construction Modal */}
      <Dialog open={showUnderConstruction} onOpenChange={setShowUnderConstruction}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-xl text-center justify-center">
              <div className="bg-yellow-100 p-2 rounded-full">
                <AlertTriangle className="h-6 w-6 text-yellow-600" />
              </div>
              Under Construction
            </DialogTitle>
          </DialogHeader>
          
          <div className="text-center py-4">
            <p className="text-gray-600 mb-4">
              Diese Funktion wird derzeit entwickelt und ist bald verfügbar.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Wir arbeiten daran, Ihnen eine beeindruckende Demo und Screenshots zu präsentieren.
            </p>
            
            <Button 
              onClick={() => setShowUnderConstruction(false)}
              className="bg-[#058bc0] hover:bg-[#047aa0]"
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
