# Build APK After Changes Script
# Run this script to automatically build APK after each change session
# Usage: .\build-after-changes.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TradeTrackr - Auto Build nach Aenderungen" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if auto-build-apk.ps1 exists
if (-not (Test-Path "auto-build-apk.ps1")) {
    Write-Host "auto-build-apk.ps1 nicht gefunden!" -ForegroundColor Red
    exit 1
}

# Build APK
Write-Host "Starte automatischen APK Build..." -ForegroundColor Yellow
Write-Host ""

& .\auto-build-apk.ps1

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Build erfolgreich abgeschlossen!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "Build fehlgeschlagen!" -ForegroundColor Red
    exit 1
}
