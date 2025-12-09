# TradeTrackr Mobile App - Production APK Build Script
# PowerShell Script für Windows

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TradeTrackr Production APK Build" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Prüfe ob EAS CLI installiert ist
Write-Host "Prüfe EAS CLI..." -ForegroundColor Yellow
$easInstalled = Get-Command eas -ErrorAction SilentlyContinue
if (-not $easInstalled) {
    Write-Host "❌ EAS CLI nicht gefunden!" -ForegroundColor Red
    Write-Host "Installiere mit: npm install -g eas-cli" -ForegroundColor Yellow
    exit 1
}
Write-Host "✅ EAS CLI gefunden" -ForegroundColor Green
Write-Host ""

# Prüfe Login-Status
Write-Host "Prüfe EAS Login-Status..." -ForegroundColor Yellow
$loginStatus = eas whoami 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Nicht bei EAS eingeloggt" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Bitte melden Sie sich an mit:" -ForegroundColor Yellow
    Write-Host "  eas login" -ForegroundColor Cyan
    Write-Host ""
    $login = Read-Host "Möchten Sie sich jetzt anmelden? (j/n)"
    if ($login -eq "j" -or $login -eq "J" -or $login -eq "y" -or $login -eq "Y") {
        eas login
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ Login fehlgeschlagen" -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "❌ Build abgebrochen - Login erforderlich" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "✅ Eingeloggt als: $loginStatus" -ForegroundColor Green
}
Write-Host ""

# Prüfe Environment Variables
Write-Host "Prüfe Environment Variables..." -ForegroundColor Yellow
$envFile = ".env"
if (Test-Path $envFile) {
    Write-Host "✅ .env Datei gefunden" -ForegroundColor Green
} else {
    Write-Host "⚠️  Keine .env Datei gefunden" -ForegroundColor Yellow
    Write-Host "Prüfe EAS Secrets..." -ForegroundColor Yellow
    $secrets = eas secret:list 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠️  Keine Secrets gefunden" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "WICHTIG: Für Production Build benötigen Sie:" -ForegroundColor Red
        Write-Host "  - EXPO_PUBLIC_FIREBASE_API_KEY" -ForegroundColor Yellow
        Write-Host "  - EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN" -ForegroundColor Yellow
        Write-Host "  - EXPO_PUBLIC_FIREBASE_PROJECT_ID" -ForegroundColor Yellow
        Write-Host "  - EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET" -ForegroundColor Yellow
        Write-Host "  - EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID" -ForegroundColor Yellow
        Write-Host "  - EXPO_PUBLIC_FIREBASE_APP_ID" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Setzen Sie diese mit:" -ForegroundColor Yellow
        Write-Host "  eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_API_KEY --value YOUR_VALUE" -ForegroundColor Cyan
        Write-Host ""
        $continue = Read-Host "Möchten Sie trotzdem fortfahren? (j/n)"
        if ($continue -ne "j" -and $continue -ne "J" -and $continue -ne "y" -and $continue -ne "Y") {
            exit 1
        }
    } else {
        Write-Host "✅ Secrets gefunden" -ForegroundColor Green
    }
}
Write-Host ""

# TypeScript Check
Write-Host "Führe TypeScript Check aus..." -ForegroundColor Yellow
npm run type-check
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ TypeScript Fehler gefunden!" -ForegroundColor Red
    Write-Host "Bitte beheben Sie die Fehler vor dem Build" -ForegroundColor Yellow
    exit 1
}
Write-Host "✅ TypeScript Check erfolgreich" -ForegroundColor Green
Write-Host ""

# Build-Optionen
Write-Host "Build-Optionen:" -ForegroundColor Cyan
Write-Host "  1. Production APK (production-apk Profil)" -ForegroundColor White
Write-Host "  2. Production APK (production Profil - für Store)" -ForegroundColor White
Write-Host "  3. Preview APK (preview Profil)" -ForegroundColor White
Write-Host ""
$choice = Read-Host "Wählen Sie eine Option (1-3)"

$profile = switch ($choice) {
    "1" { "production-apk" }
    "2" { "production" }
    "3" { "preview" }
    default { 
        Write-Host "Ungültige Auswahl, verwende production-apk" -ForegroundColor Yellow
        "production-apk"
    }
}

Write-Host ""
Write-Host "Starte Build mit Profil: $profile" -ForegroundColor Cyan
Write-Host "Dies kann einige Minuten dauern..." -ForegroundColor Yellow
Write-Host ""

# Starte Build
eas build --platform android --profile $profile --non-interactive

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "✅ Build erfolgreich gestartet!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Der Build läuft auf EAS Build Servers." -ForegroundColor Yellow
    Write-Host "Sie erhalten eine E-Mail, sobald der Build fertig ist." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Build-Status prüfen mit:" -ForegroundColor Cyan
    Write-Host "  eas build:list" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "❌ Build fehlgeschlagen!" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Prüfen Sie die Fehlermeldungen oben." -ForegroundColor Yellow
    exit 1
}






