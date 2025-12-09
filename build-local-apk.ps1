# TradeTrackr Mobile App - Local Production APK Build Script
# PowerShell Script für Windows - Lokaler Build

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TradeTrackr Local Production APK Build" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Prüfe ob wir im richtigen Verzeichnis sind
if (-not (Test-Path "android")) {
    Write-Host "❌ android/ Verzeichnis nicht gefunden!" -ForegroundColor Red
    Write-Host "Bitte führen Sie dieses Script im Projekt-Root aus." -ForegroundColor Yellow
    exit 1
}

# Prüfe ob Release Keystore existiert
if (-not (Test-Path "android\app\release.keystore")) {
    Write-Host "⚠️  Release Keystore nicht gefunden!" -ForegroundColor Yellow
    Write-Host "Erstelle Release Keystore..." -ForegroundColor Yellow
    
    $keystorePath = "android\app\release.keystore"
    $keytool = "$env:JAVA_HOME\bin\keytool.exe"
    
    if (-not (Test-Path $keytool)) {
        Write-Host "❌ keytool nicht gefunden. Bitte JAVA_HOME setzen oder JDK installieren." -ForegroundColor Red
        exit 1
    }
    
    & $keytool -genkeypair -v -storetype PKCS12 -keystore $keystorePath -alias tradetrackr-release -keyalg RSA -keysize 2048 -validity 10000 -storepass tradetrackr2024 -keypass tradetrackr2024 -dname "CN=TradeTrackr, OU=Mobile, O=TradeTrackr, L=City, ST=State, C=DE"
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Keystore-Erstellung fehlgeschlagen" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✅ Release Keystore erstellt" -ForegroundColor Green
}

# Prüfe Environment Variables
Write-Host "Prüfe Environment Variables..." -ForegroundColor Yellow
$envFile = ".env"
$requiredVars = @(
    "EXPO_PUBLIC_FIREBASE_API_KEY",
    "EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN",
    "EXPO_PUBLIC_FIREBASE_PROJECT_ID",
    "EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET",
    "EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
    "EXPO_PUBLIC_FIREBASE_APP_ID"
)

$missingVars = @()
if (Test-Path $envFile) {
    Write-Host "✅ .env Datei gefunden" -ForegroundColor Green
    $envContent = Get-Content $envFile
    foreach ($var in $requiredVars) {
        $found = $envContent | Where-Object { $_ -match "^$var=" }
        if (-not $found) {
            $missingVars += $var
        }
    }
} else {
    Write-Host "⚠️  Keine .env Datei gefunden" -ForegroundColor Yellow
    $missingVars = $requiredVars
}

if ($missingVars.Count -gt 0) {
    Write-Host ""
    Write-Host "⚠️  Fehlende Environment Variables:" -ForegroundColor Yellow
    foreach ($var in $missingVars) {
        Write-Host "  - $var" -ForegroundColor Yellow
    }
    Write-Host ""
    Write-Host "Bitte erstellen Sie eine .env Datei mit allen erforderlichen Variablen." -ForegroundColor Yellow
    Write-Host ""
    $continue = Read-Host "Möchten Sie trotzdem fortfahren? (j/n)"
    if ($continue -ne "j" -and $continue -ne "J" -and $continue -ne "y" -and $continue -ne "Y") {
        exit 1
    }
} else {
    Write-Host "✅ Alle Environment Variables gefunden" -ForegroundColor Green
}
Write-Host ""

# Prüfe Android SDK
Write-Host "Prüfe Android SDK..." -ForegroundColor Yellow
$androidHome = $env:ANDROID_HOME
if (-not $androidHome) {
    $androidHome = "$env:LOCALAPPDATA\Android\Sdk"
}

if (-not (Test-Path $androidHome)) {
    Write-Host "⚠️  Android SDK nicht gefunden unter: $androidHome" -ForegroundColor Yellow
    Write-Host "Bitte setzen Sie ANDROID_HOME oder installieren Sie Android Studio." -ForegroundColor Yellow
    Write-Host ""
    $continue = Read-Host "Möchten Sie trotzdem fortfahren? (j/n)"
    if ($continue -ne "j" -and $continue -ne "J" -and $continue -ne "y" -and $continue -ne "Y") {
        exit 1
    }
} else {
    Write-Host "✅ Android SDK gefunden: $androidHome" -ForegroundColor Green
}
Write-Host ""

# Prüfe Gradle
Write-Host "Prüfe Gradle..." -ForegroundColor Yellow
$gradleWrapper = "android\gradlew.bat"
if (-not (Test-Path $gradleWrapper)) {
    Write-Host "❌ Gradle Wrapper nicht gefunden!" -ForegroundColor Red
    Write-Host "Bitte führen Sie 'npx expo prebuild' aus, um Android-Projekt zu generieren." -ForegroundColor Yellow
    exit 1
}
Write-Host "✅ Gradle Wrapper gefunden" -ForegroundColor Green
Write-Host ""

# Setze Production Environment
$env:EXPO_PUBLIC_ENV = "production"
$env:EXPO_PUBLIC_FEATURE_DEBUG_SCREEN = "false"

Write-Host "Environment gesetzt:" -ForegroundColor Cyan
Write-Host "  EXPO_PUBLIC_ENV=production" -ForegroundColor White
Write-Host "  EXPO_PUBLIC_FEATURE_DEBUG_SCREEN=false" -ForegroundColor White
Write-Host ""

# Optionen
Write-Host "Build-Optionen:" -ForegroundColor Cyan
Write-Host "  1. Release APK (Production, signiert)" -ForegroundColor White
Write-Host "  2. Debug APK (für Testing)" -ForegroundColor White
Write-Host ""
$choice = Read-Host "Wählen Sie eine Option (1-2)"

$buildType = switch ($choice) {
    "1" { "assembleRelease" }
    "2" { "assembleDebug" }
    default { 
        Write-Host "Ungültige Auswahl, verwende Release" -ForegroundColor Yellow
        "assembleRelease"
    }
}

Write-Host ""
Write-Host "Starte lokalen Build..." -ForegroundColor Cyan
Write-Host "Dies kann einige Minuten dauern..." -ForegroundColor Yellow
Write-Host ""

# Wechsle ins android Verzeichnis und starte Build
Push-Location android

try {
    # Clean Build
    Write-Host "Bereinige vorherige Builds..." -ForegroundColor Yellow
    & .\gradlew.bat clean
    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠️  Clean fehlgeschlagen, aber fortfahren..." -ForegroundColor Yellow
    }
    
    Write-Host ""
    Write-Host "Baue APK..." -ForegroundColor Yellow
    
    # Build APK
    & .\gradlew.bat $buildType
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "✅ Build erfolgreich!" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
        Write-Host ""
        
        # Finde APK
        $apkPath = "app\build\outputs\apk\release\app-release.apk"
        if ($buildType -eq "assembleDebug") {
            $apkPath = "app\build\outputs\apk\debug\app-debug.apk"
        }
        
        if (Test-Path $apkPath) {
            $fullPath = (Resolve-Path $apkPath).Path
            $fileInfo = Get-Item $fullPath
            $sizeMB = [math]::Round($fileInfo.Length / 1MB, 2)
            
            Write-Host "APK erstellt:" -ForegroundColor Cyan
            Write-Host "  Pfad: $fullPath" -ForegroundColor White
            Write-Host "  Größe: $sizeMB MB" -ForegroundColor White
            Write-Host ""
            
            # Kopiere APK ins Root-Verzeichnis mit Timestamp
            $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
            $buildTypeName = if ($buildType -eq "assembleRelease") { "Release" } else { "Debug" }
            $destPath = "..\TradeTrackr-Mobile-v1.0-$buildTypeName-$timestamp.apk"
            Copy-Item $fullPath $destPath
            Write-Host "APK kopiert nach: $destPath" -ForegroundColor Green
        } else {
            Write-Host "⚠️  APK nicht gefunden unter: $apkPath" -ForegroundColor Yellow
        }
    } else {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Red
        Write-Host "❌ Build fehlgeschlagen!" -ForegroundColor Red
        Write-Host "========================================" -ForegroundColor Red
        Write-Host ""
        Write-Host "Prüfen Sie die Fehlermeldungen oben." -ForegroundColor Yellow
        exit 1
    }
} finally {
    Pop-Location
}

Write-Host ""
Write-Host "Build abgeschlossen!" -ForegroundColor Green






