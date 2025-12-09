# TradeTrackr Webportal - VPS Deployment Script
# PowerShell Script zum automatischen Deployen auf VPS
# 
# Verwendung:
#   .\deploy-to-vps.ps1 -VpsHost "your-vps-ip"
#   .\deploy-to-vps.ps1 -VpsHost "your-vps-ip" -VpsUser "root" -VpsPath "/var/www/tradetrackr"
#   .\deploy-to-vps.ps1 -VpsHost "your-vps-ip" -SkipBuild  # Nur Upload, kein Build

param(
    [Parameter(Mandatory=$true)]
    [string]$VpsHost,
    
    [Parameter(Mandatory=$false)]
    [string]$VpsUser = "root",
    
    [Parameter(Mandatory=$false)]
    [string]$VpsPath = "/var/www/tradetrackr",
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipBuild
)

# Farben für Output
function Write-Success { Write-Host $args -ForegroundColor Green }
function Write-Info { Write-Host $args -ForegroundColor Cyan }
function Write-Warning { Write-Host $args -ForegroundColor Yellow }
function Write-Error { Write-Host $args -ForegroundColor Red }

# Prüfe ob SSH verfügbar ist
function Test-SSH {
    param([string]$Host, [string]$User)
    
    Write-Info "Testing SSH connection to ${User}@${Host}..."
    $result = ssh -o ConnectTimeout=5 -o BatchMode=yes "${User}@${Host}" "echo 'SSH OK'" 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "SSH connection successful!"
        return $true
    } else {
        Write-Error "SSH connection failed. Please check:"
        Write-Error "  1. SSH key is set up (ssh-keygen -t rsa)"
        Write-Error "  2. SSH key is copied to server (ssh-copy-id ${User}@${Host})"
        Write-Error "  3. Server is reachable"
        return $false
    }
}

# Prüfe ob SCP verfügbar ist
function Test-SCP {
    Write-Info "Checking if SCP is available..."
    $scpVersion = scp 2>&1
    if ($LASTEXITCODE -eq 0 -or $scpVersion -like "*usage*") {
        Write-Success "SCP is available"
        return $true
    } else {
        Write-Error "SCP is not available. Please install OpenSSH client."
        Write-Info "Install via: Add-WindowsCapability -Online -Name OpenSSH.Client~~~~0.0.1.0"
        return $false
    }
}

# Erstelle Build
function Build-Application {
    Write-Info "Building application..."
    
    if (-not (Test-Path "package.json")) {
        Write-Error "package.json not found. Are you in the project root?"
        exit 1
    }
    
    npm run build
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Build failed!"
        exit 1
    }
    
    if (-not (Test-Path "dist")) {
        Write-Error "dist directory not found after build!"
        exit 1
    }
    
    Write-Success "Build completed successfully!"
}

# Kopiere Dateien auf VPS
function Copy-ToVPS {
    param([string]$Host, [string]$User, [string]$Path)
    
    Write-Info "Uploading files to VPS..."
    Write-Info "Target: ${User}@${Host}:${Path}"
    
    # Erstelle Verzeichnis auf VPS falls nicht vorhanden
    ssh "${User}@${Host}" "mkdir -p ${Path}" 2>&1 | Out-Null
    
    # Kopiere Dateien
    scp -r dist/* "${User}@${Host}:${Path}/"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Files uploaded successfully!"
    } else {
        Write-Error "Upload failed!"
        exit 1
    }
}

# Lade Nginx neu
function Reload-Nginx {
    param([string]$Host, [string]$User)
    
    Write-Info "Reloading Nginx..."
    ssh "${User}@${Host}" "sudo systemctl reload nginx" 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Nginx reloaded successfully!"
    } else {
        Write-Warning "Nginx reload failed. Please check manually."
    }
}

# Hauptfunktion
function Main {
    Write-Success "========================================="
    Write-Success "TradeTrackr Webportal - VPS Deployment"
    Write-Success "========================================="
    Write-Info ""
    
    # Prüfungen
    if (-not (Test-SCP)) {
        exit 1
    }
    
    if (-not (Test-SSH -Host $VpsHost -User $VpsUser)) {
        exit 1
    }
    
    # Build erstellen
    if (-not $SkipBuild) {
        Build-Application
    } else {
        Write-Warning "Skipping build (--SkipBuild flag set)"
    }
    
    # Dateien hochladen
    Copy-ToVPS -Host $VpsHost -User $VpsUser -Path $VpsPath
    
    # Nginx neu laden
    Reload-Nginx -Host $VpsHost -User $VpsUser
    
    Write-Success ""
    Write-Success "========================================="
    Write-Success "Deployment completed successfully!"
    Write-Success "========================================="
    Write-Info ""
    Write-Info "Your application should now be available at:"
    Write-Info "  http://${VpsHost}"
    Write-Info "  https://${VpsHost} (if SSL is configured)"
}

# Script ausführen
Main

