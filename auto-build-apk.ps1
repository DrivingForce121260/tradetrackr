# Auto-Build APK Script
# Automatically builds APK after changes
# Can be run manually or integrated into Git hooks

param(
    [switch]$Watch = $false,
    [switch]$Clean = $false
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TradeTrackr Auto APK Builder" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "android")) {
    Write-Host "android/ Verzeichnis nicht gefunden!" -ForegroundColor Red
    Write-Host "Bitte fuehren Sie dieses Script im Projekt-Root aus." -ForegroundColor Yellow
    exit 1
}

# Set environment variables
$env:EXPO_PUBLIC_ENV = "production"
$env:EXPO_PUBLIC_FEATURE_DEBUG_SCREEN = "false"

# Function to build APK
function Build-APK {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Yellow
    Write-Host "Starte APK Build..." -ForegroundColor Yellow
    Write-Host "Zeitpunkt: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
    Write-Host "========================================" -ForegroundColor Yellow
    Write-Host ""

    Push-Location android

    try {
        if ($Clean) {
            Write-Host "Bereinige vorherige Builds..." -ForegroundColor Yellow
            & .\gradlew.bat clean 2>&1 | Out-Null
        }

        Write-Host "Baue Release APK..." -ForegroundColor Yellow
        & .\gradlew.bat assembleRelease

        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "========================================" -ForegroundColor Green
            Write-Host "Build erfolgreich!" -ForegroundColor Green
            Write-Host "========================================" -ForegroundColor Green
            Write-Host ""

            # Find and copy APK
            $apkPath = "app\build\outputs\apk\release\app-release.apk"
            if (Test-Path $apkPath) {
                $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
                $destPath = "..\TradeTrackr-Mobile-v1.0-Release-$timestamp.apk"
                Copy-Item $apkPath $destPath -Force
                
                $fileInfo = Get-Item $destPath
                $sizeMB = [math]::Round($fileInfo.Length / 1MB, 2)
                
                Write-Host "APK erstellt:" -ForegroundColor Cyan
                Write-Host "  Pfad: $destPath" -ForegroundColor White
                Write-Host "  Groesse: $sizeMB MB" -ForegroundColor White
                Write-Host ""
                
                return $true
            } else {
                Write-Host "APK nicht gefunden unter: $apkPath" -ForegroundColor Yellow
                return $false
            }
        } else {
            Write-Host ""
            Write-Host "========================================" -ForegroundColor Red
            Write-Host "Build fehlgeschlagen!" -ForegroundColor Red
            Write-Host "========================================" -ForegroundColor Red
            Write-Host ""
            return $false
        }
    } catch {
        Write-Host ""
        Write-Host "Fehler beim Build: $_" -ForegroundColor Red
        return $false
    } finally {
        Pop-Location
    }
}

# Build APK now
$buildSuccess = Build-APK

if ($Watch) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "Watch-Modus aktiviert" -ForegroundColor Cyan
    Write-Host "Ueberwacht Aenderungen in src/ Verzeichnis" -ForegroundColor Cyan
    Write-Host "Druecken Sie Ctrl+C zum Beenden" -ForegroundColor Yellow
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""

    # Watch for changes in src directory
    $watcher = New-Object System.IO.FileSystemWatcher
    $watcher.Path = (Resolve-Path "src").Path
    $watcher.IncludeSubdirectories = $true
    $watcher.EnableRaisingEvents = $true

    $action = {
        $path = $Event.SourceEventArgs.FullPath
        $changeType = $Event.SourceEventArgs.ChangeType
        
        # Ignore temporary files
        if ($path -match '\.(tmp|log|swp|~)$') { return }
        
        Write-Host ""
        Write-Host "Aenderung erkannt: $changeType - $path" -ForegroundColor Yellow
        Write-Host "Starte Build in 2 Sekunden..." -ForegroundColor Gray
        
        Start-Sleep -Seconds 2
        Build-APK | Out-Null
    }

    Register-ObjectEvent -InputObject $watcher -EventName "Changed" -Action $action | Out-Null
    Register-ObjectEvent -InputObject $watcher -EventName "Created" -Action $action | Out-Null
    Register-ObjectEvent -InputObject $watcher -EventName "Deleted" -Action $action | Out-Null

    try {
        # Keep script running
        while ($true) {
            Start-Sleep -Seconds 1
        }
    } finally {
        $watcher.Dispose()
    }
} else {
    if ($buildSuccess) {
        Write-Host "Build abgeschlossen!" -ForegroundColor Green
        exit 0
    } else {
        Write-Host "Build fehlgeschlagen!" -ForegroundColor Red
        exit 1
    }
}
