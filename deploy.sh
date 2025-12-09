#!/bin/bash

# ============================================
# TradeTrackr Deployment Script
# ============================================
# Deploys all Firebase components in correct order
# ============================================

set -e  # Exit on error

echo "============================================"
echo "TradeTrackr Deployment"
echo "============================================"
echo ""

# Check if firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI ist nicht installiert!"
    echo "   Installieren Sie mit: npm install -g firebase-tools"
    exit 1
fi

echo "✅ Firebase CLI gefunden"
echo ""

# Check if logged in
firebase projects:list &> /dev/null || {
    echo "❌ Nicht bei Firebase angemeldet!"
    echo "   Führen Sie aus: firebase login"
    exit 1
}

echo "✅ Bei Firebase angemeldet"
echo ""

# Get current project
CURRENT_PROJECT=$(firebase use 2>/dev/null || echo "none")
echo "📦 Aktuelles Projekt: $CURRENT_PROJECT"
echo ""

# Confirm deployment
read -p "Möchten Sie mit dem Deployment fortfahren? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Deployment abgebrochen"
    exit 1
fi

echo ""
echo "============================================"
echo "1. Deploying Firestore Rules"
echo "============================================"
firebase deploy --only firestore:rules

echo ""
echo "============================================"
echo "2. Deploying Firestore Indexes"
echo "============================================"
firebase deploy --only firestore:indexes

echo ""
echo "============================================"
echo "3. Deploying Storage Rules"
echo "============================================"
firebase deploy --only storage

echo ""
echo "============================================"
echo "4. Building & Deploying Cloud Functions"
echo "============================================"
cd functions
npm install
npm run build
cd ..
firebase deploy --only functions

echo ""
echo "============================================"
echo "✅ Deployment erfolgreich abgeschlossen!"
echo "============================================"
echo ""
echo "Nächste Schritte:"
echo "1. Testen Sie die Field App mit der konfigurierten Firebase-Instanz"
echo "2. Prüfen Sie Cloud Functions Logs: firebase functions:log"
echo "3. Setzen Sie Custom Claims für Benutzer (siehe functions/README.md)"
echo "4. Konfigurieren Sie LLM API Keys für KI-Funktionalität"
echo ""
echo "Dokumentation: siehe README.md und functions/README.md"
echo "============================================"








