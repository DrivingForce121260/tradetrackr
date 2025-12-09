# TradeTrackr Webportal - Quick Update Script
# Einfaches Script zum Deployen von Updates auf den VPS

param(
    [Parameter(Mandatory=$true)]
    [string]$VpsHost,
    
    [Parameter(Mandatory=$false)]
    [string]$VpsUser = "root",
    
    [Parameter(Mandatory=$false)]
    [string]$VpsPath = "/var/www/tradetrackr"
)

Write-Host "=========================================" -ForegroundColor Green
Write-Host "TradeTrackr Webportal - Quick Update" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""

# 1. Build erstellen
Write-Host "Step 1: Building application..." -ForegroundColor Cyan
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed! Aborting." -ForegroundColor Red
    exit 1
}

Write-Host "✓ Build completed" -ForegroundColor Green
Write-Host ""

# 2. Dateien hochladen (in temporäres Verzeichnis, dann mit sudo verschieben)
Write-Host "Step 2: Uploading files to VPS..." -ForegroundColor Cyan
Write-Host "Target: ${VpsUser}@${VpsHost}:${VpsPath}" -ForegroundColor Gray

# Temporäres Verzeichnis auf VPS erstellen
$tempPath = "/tmp/tradetrackr-deploy-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
ssh "${VpsUser}@${VpsHost}" "mkdir -p ${tempPath}" 2>&1 | Out-Null

# Dateien in temporäres Verzeichnis hochladen
scp -r dist/* "${VpsUser}@${VpsHost}:${tempPath}/"

if ($LASTEXITCODE -ne 0) {
    Write-Host "Upload failed! Aborting." -ForegroundColor Red
    exit 1
}

Write-Host "✓ Files uploaded to temp directory" -ForegroundColor Green

# Dateien mit sudo ins Zielverzeichnis verschieben
Write-Host "Step 2.5: Moving files to target directory..." -ForegroundColor Cyan
ssh "${VpsUser}@${VpsHost}" "sudo rm -rf ${VpsPath}/* && sudo cp -r ${tempPath}/* ${VpsPath}/ && sudo chown -R www-data:www-data ${VpsPath} && sudo chmod -R 755 ${VpsPath} && rm -rf ${tempPath}"

if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to move files! Please check permissions manually." -ForegroundColor Red
    Write-Host "Temp directory: ${tempPath}" -ForegroundColor Yellow
    exit 1
}

Write-Host "✓ Files moved and permissions set" -ForegroundColor Green
Write-Host ""

# 3. Nginx neu laden (optional, falls nötig)
Write-Host "Step 3: Reloading Nginx..." -ForegroundColor Cyan
ssh "${VpsUser}@${VpsHost}" "sudo systemctl reload nginx" 2>&1 | Out-Null

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Nginx reloaded" -ForegroundColor Green
} else {
    Write-Host "⚠ Nginx reload failed (may not be critical)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Green
Write-Host "Update completed successfully!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Your updated portal is now live at:" -ForegroundColor Cyan
Write-Host "  http://${VpsHost}" -ForegroundColor White
Write-Host "  https://${VpsHost}" -ForegroundColor White

