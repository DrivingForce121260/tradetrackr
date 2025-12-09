#!/bin/bash

# TradeTrackr Webportal - VPS Deployment Script
# Bash Script zum automatischen Deployen auf VPS

set -e  # Exit on error

# Farben für Output
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Konfiguration (kann als Parameter übergeben werden)
VPS_HOST="${1:-your-vps-ip}"
VPS_USER="${2:-root}"
VPS_PATH="${3:-/var/www/tradetrackr}"
SKIP_BUILD="${4:-false}"

echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}TradeTrackr Webportal - VPS Deployment${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""

# Funktionen
print_success() {
    echo -e "${GREEN}$1${NC}"
}

print_info() {
    echo -e "${CYAN}$1${NC}"
}

print_warning() {
    echo -e "${YELLOW}$1${NC}"
}

print_error() {
    echo -e "${RED}$1${NC}"
}

# Prüfe SSH-Verbindung
test_ssh() {
    print_info "Testing SSH connection to ${VPS_USER}@${VPS_HOST}..."
    if ssh -o ConnectTimeout=5 -o BatchMode=yes "${VPS_USER}@${VPS_HOST}" "echo 'SSH OK'" > /dev/null 2>&1; then
        print_success "SSH connection successful!"
        return 0
    else
        print_error "SSH connection failed!"
        print_error "Please check:"
        print_error "  1. SSH key is set up (ssh-keygen -t rsa)"
        print_error "  2. SSH key is copied to server (ssh-copy-id ${VPS_USER}@${VPS_HOST})"
        print_error "  3. Server is reachable"
        exit 1
    fi
}

# Erstelle Build
build_application() {
    print_info "Building application..."
    
    if [ ! -f "package.json" ]; then
        print_error "package.json not found. Are you in the project root?"
        exit 1
    fi
    
    npm run build
    
    if [ $? -ne 0 ]; then
        print_error "Build failed!"
        exit 1
    fi
    
    if [ ! -d "dist" ]; then
        print_error "dist directory not found after build!"
        exit 1
    fi
    
    print_success "Build completed successfully!"
}

# Kopiere Dateien auf VPS
copy_to_vps() {
    print_info "Uploading files to VPS..."
    print_info "Target: ${VPS_USER}@${VPS_HOST}:${VPS_PATH}"
    
    # Erstelle Verzeichnis auf VPS falls nicht vorhanden
    ssh "${VPS_USER}@${VPS_HOST}" "mkdir -p ${VPS_PATH}" > /dev/null 2>&1
    
    # Kopiere Dateien mit rsync (falls verfügbar) oder scp
    if command -v rsync &> /dev/null; then
        print_info "Using rsync for faster transfer..."
        rsync -avz --delete dist/ "${VPS_USER}@${VPS_HOST}:${VPS_PATH}/"
    else
        print_info "Using scp for transfer..."
        scp -r dist/* "${VPS_USER}@${VPS_HOST}:${VPS_PATH}/"
    fi
    
    if [ $? -eq 0 ]; then
        print_success "Files uploaded successfully!"
    else
        print_error "Upload failed!"
        exit 1
    fi
}

# Lade Nginx neu
reload_nginx() {
    print_info "Reloading Nginx..."
    ssh "${VPS_USER}@${VPS_HOST}" "sudo systemctl reload nginx" > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        print_success "Nginx reloaded successfully!"
    else
        print_warning "Nginx reload failed. Please check manually."
    fi
}

# Hauptfunktion
main() {
    # Prüfungen
    test_ssh
    
    # Build erstellen
    if [ "$SKIP_BUILD" != "true" ]; then
        build_application
    else
        print_warning "Skipping build (SKIP_BUILD=true)"
    fi
    
    # Dateien hochladen
    copy_to_vps
    
    # Nginx neu laden
    reload_nginx
    
    echo ""
    print_success "========================================="
    print_success "Deployment completed successfully!"
    print_success "========================================="
    echo ""
    print_info "Your application should now be available at:"
    print_info "  http://${VPS_HOST}"
    print_info "  https://${VPS_HOST} (if SSL is configured)"
}

# Script ausführen
main







