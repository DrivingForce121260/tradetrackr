# ============================================================================
# TradeTrackr Web-Portal - Vollständiges Backup Script
# ============================================================================
# Erstellt ein vollständiges Backup aller wichtigen Dateien des Web-Portals
# ============================================================================

param(
    [string]$BackupPath = "C:\Users\david\OneDrive\Apps\TradeTrackrTester\backups",
    [switch]$Compress = $true,
    [switch]$IncludeNodeModules = $false,
    [switch]$IncludeDist = $false,
    [switch]$Verbose = $false
)

# Farben für Output
function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

# Prüfe ob wir im richtigen Verzeichnis sind
$projectRoot = "C:\Users\david\OneDrive\Apps\TradrTrackr\trades-manage-projectCurrent"
if (-not (Test-Path $projectRoot)) {
    Write-ColorOutput "❌ Projekt-Verzeichnis nicht gefunden: $projectRoot" "Red"
    exit 1
}

Set-Location $projectRoot

# Erstelle Backup-Verzeichnis mit Timestamp
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$backupDir = Join-Path $BackupPath "tradetrackr-webportal-backup-$timestamp"
$backupInfoFile = Join-Path $backupDir "BACKUP_INFO.txt"

Write-ColorOutput "`nTradeTrackr Web-Portal Backup" "Cyan"
Write-ColorOutput "=" * 60 "Cyan"
Write-ColorOutput "Quelle: $projectRoot" "Yellow"
Write-ColorOutput "Ziel: $backupDir" "Yellow"
Write-ColorOutput ""

# Erstelle Backup-Verzeichnis
try {
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
    Write-ColorOutput "✅ Backup-Verzeichnis erstellt: $backupDir" "Green"
} catch {
    Write-ColorOutput "❌ Fehler beim Erstellen des Backup-Verzeichnisses: $_" "Red"
    exit 1
}

# Backup-Info sammeln
$backupInfo = @"
================================================================================
TradeTrackr Web-Portal - Vollständiges Backup
================================================================================
Erstellt am: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
Quell-Verzeichnis: $projectRoot
Ziel-Verzeichnis: $backupDir
Backup-Typ: Vollständig (Web-Portal)

================================================================================
INHALT DES BACKUPS
================================================================================
"@

$backupInfo += "`nVerzeichnisse:`n"
$backupInfo += "- src/ (Source-Code)`n"
$backupInfo += "- public/ (Statische Assets)`n"
$backupInfo += "- functions/ (Cloud Functions)`n"
$backupInfo += "- assets/ (Assets)`n"
$backupInfo += "- scripts/ (Scripts)`n"
$backupInfo += "- android/ (Android-Konfiguration)`n"

$backupInfo += "`nKonfigurationsdateien:`n"
$backupInfo += "- package.json, package-lock.json`n"
$backupInfo += "- vite.config.ts, tsconfig.json`n"
$backupInfo += "- firebase.json, firestore.rules, firestore.indexes.json`n"
$backupInfo += "- storage.rules`n"
$backupInfo += "- tailwind.config.ts, postcss.config.js`n"
$backupInfo += "- eslint.config.js, jest.config.ts`n"
$backupInfo += "- components.json, app.json`n"
$backupInfo += "- eas.json`n"

$backupInfo += "`nDokumentation:`n"
$backupInfo += "- Alle *.md Dateien`n"

$backupInfo += "`nAUSGESCHLOSSEN:`n"
if (-not $IncludeNodeModules) {
    $backupInfo += "- node_modules/ (kann mit 'npm install' wiederhergestellt werden)`n"
}
if (-not $IncludeDist) {
    $backupInfo += "- dist/, build/ (Build-Artefakte)`n"
}
$backupInfo += "- .expo/, .git/`n"
$backupInfo += "- APK-Dateien`n"
$backupInfo += "- Backup-Verzeichnisse`n"

$backupInfo += "`n================================================================================`n"

# Funktion zum Kopieren von Verzeichnissen
function Copy-Directory {
    param(
        [string]$Source,
        [string]$Destination,
        [string]$Description
    )
    
    if (Test-Path $Source) {
        try {
            $destPath = Join-Path $backupDir $Destination
            New-Item -ItemType Directory -Path (Split-Path $destPath -Parent) -Force | Out-Null
            Copy-Item -Path $Source -Destination $destPath -Recurse -Force
            Write-ColorOutput "  ✅ $Description" "Green"
            return $true
        } catch {
            Write-ColorOutput "  ⚠️  Fehler beim Kopieren von $Description : $_" "Yellow"
            return $false
        }
    } else {
        Write-ColorOutput "  ⚠️  Nicht gefunden: $Description" "Yellow"
        return $false
    }
}

# Funktion zum Kopieren von Dateien
function Copy-Files {
    param(
        [string[]]$Patterns,
        [string]$Description
    )
    
    $copied = 0
    foreach ($pattern in $Patterns) {
        $files = Get-ChildItem -Path $projectRoot -Filter $pattern -ErrorAction SilentlyContinue
        foreach ($file in $files) {
            try {
                Copy-Item -Path $file.FullName -Destination (Join-Path $backupDir $file.Name) -Force
                $copied++
            } catch {
                Write-ColorOutput "  ⚠️  Fehler beim Kopieren von $($file.Name): $_" "Yellow"
            }
        }
    }
    
    if ($copied -gt 0) {
        Write-ColorOutput "  ✅ $Description ($copied Dateien)" "Green"
        return $true
    } else {
        Write-ColorOutput "  ⚠️  Keine Dateien gefunden: $Description" "Yellow"
        return $false
    }
}

Write-ColorOutput "`nKopiere Dateien..." "Cyan"

# 1. Source-Code Verzeichnisse
Write-ColorOutput "`nKopiere Verzeichnisse:" "Yellow"
Copy-Directory "src" "src" "Source-Code (src/)"
Copy-Directory "public" "public" "Öffentliche Assets (public/)"
Copy-Directory "functions" "functions" "Cloud Functions (functions/)"
Copy-Directory "assets" "assets" "Assets (assets/)"
Copy-Directory "scripts" "scripts" "Scripts (scripts/)"

# Android-Konfiguration (wichtig fuer Builds)
if (Test-Path "android") {
    Write-ColorOutput "  Kopiere Android-Konfiguration..." "Yellow"
    $androidBackup = Join-Path $backupDir "android"
    New-Item -ItemType Directory -Path $androidBackup -Force | Out-Null
    
    # Wichtige Android-Dateien kopieren
    $androidFiles = @(
        "android\build.gradle",
        "android\app\build.gradle",
        "android\app\src\main\AndroidManifest.xml",
        "android\gradle.properties",
        "android\settings.gradle",
        "android\gradlew",
        "android\gradlew.bat"
    )
    
    foreach ($file in $androidFiles) {
        if (Test-Path $file) {
            $dest = Join-Path $androidBackup (Split-Path $file -Leaf)
            Copy-Item -Path $file -Destination $dest -Force -ErrorAction SilentlyContinue
        }
    }
    Write-ColorOutput "  ✅ Android-Konfiguration kopiert" "Green"
}

# 2. Konfigurationsdateien
Write-ColorOutput "`nKopiere Konfigurationsdateien:" "Yellow"
Copy-Files @("package.json", "package-lock.json") "Package-Dateien"
Copy-Files @("vite.config.ts", "tsconfig.json", "tsconfig.app.json", "tsconfig.node.json") "TypeScript-Konfiguration"
Copy-Files @("firebase.json", "firestore.rules", "firestore.indexes.json", "storage.rules") "Firebase-Konfiguration"
Copy-Files @("tailwind.config.ts", "postcss.config.js") "Styling-Konfiguration"
Copy-Files @("eslint.config.js", "jest.config.ts") "Tool-Konfiguration"
Copy-Files @("components.json", "app.json", "eas.json") "App-Konfiguration"
Copy-Files @("index.html", "App.tsx") "Root-Dateien"

# 3. Dokumentation
Write-ColorOutput "`nKopiere Dokumentation:" "Yellow"
$mdFiles = Get-ChildItem -Path $projectRoot -Filter "*.md" -Recurse -ErrorAction SilentlyContinue | 
    Where-Object { 
        $_.FullName -notmatch "\\node_modules\\" -and 
        $_.FullName -notmatch "\\backup" -and
        $_.FullName -notmatch "\\dist\\" -and
        $_.FullName -notmatch "\\build\\"
    }
    
if ($mdFiles.Count -gt 0) {
    $docsDir = Join-Path $backupDir "docs"
    New-Item -ItemType Directory -Path $docsDir -Force | Out-Null
    
    foreach ($file in $mdFiles) {
        $relativePath = $file.FullName.Substring($projectRoot.Length + 1)
        $destPath = Join-Path $docsDir $relativePath
        $destDir = Split-Path $destPath -Parent
        New-Item -ItemType Directory -Path $destDir -Force | Out-Null
        Copy-Item -Path $file.FullName -Destination $destPath -Force -ErrorAction SilentlyContinue
    }
    Write-ColorOutput "  ✅ Dokumentation kopiert ($($mdFiles.Count) Dateien)" "Green"
} else {
    Write-ColorOutput "  ⚠️  Keine Dokumentationsdateien gefunden" "Yellow"
}

# 4. PowerShell Scripts
Write-ColorOutput "`nKopiere Scripts:" "Yellow"
$psScripts = Get-ChildItem -Path $projectRoot -Filter "*.ps1" -ErrorAction SilentlyContinue | 
    Where-Object { $_.FullName -notmatch "\\backup" }
    
if ($psScripts.Count -gt 0) {
    $scriptsDir = Join-Path $backupDir "scripts-ps1"
    New-Item -ItemType Directory -Path $scriptsDir -Force | Out-Null
    
    foreach ($script in $psScripts) {
        Copy-Item -Path $script.FullName -Destination (Join-Path $scriptsDir $script.Name) -Force
    }
    Write-ColorOutput "  ✅ PowerShell-Scripts kopiert ($($psScripts.Count) Dateien)" "Green"
}

# 5. Weitere wichtige Dateien
Write-ColorOutput "`nKopiere weitere wichtige Dateien:" "Yellow"
Copy-Files @("*.json", "*.config.*") "Weitere Konfigurationsdateien" | Out-Null
Copy-Files @("*.csv") "CSV-Dateien" | Out-Null

# 6. Optional: node_modules (nur wenn explizit gewuenscht)
if ($IncludeNodeModules -and (Test-Path "node_modules")) {
    Write-ColorOutput "`nKopiere node_modules (kann lange dauern)..." "Yellow"
    Copy-Directory "node_modules" "node_modules" "Node Modules"
}

# 7. Optional: dist (nur wenn explizit gewuenscht)
if ($IncludeDist -and (Test-Path "dist")) {
    Write-ColorOutput "`nKopiere dist-Verzeichnis..." "Yellow"
    Copy-Directory "dist" "dist" "Build-Artefakte (dist/)"
}

# Berechne Backup-Groesse
Write-ColorOutput "`nBerechne Backup-Groesse..." "Cyan"
$backupSize = (Get-ChildItem -Path $backupDir -Recurse -ErrorAction SilentlyContinue | 
    Measure-Object -Property Length -Sum).Sum
$backupSizeMB = [math]::Round($backupSize / 1MB, 2)
$backupSizeGB = [math]::Round($backupSize / 1GB, 2)

$backupInfo += "`nBackup-Groesse: $backupSizeMB MB ($backupSizeGB GB)`n"
$backupInfo += "Anzahl Dateien: $((Get-ChildItem -Path $backupDir -Recurse -File -ErrorAction SilentlyContinue).Count)`n"

# Speichere Backup-Info
$backupInfo | Out-File -FilePath $backupInfoFile -Encoding UTF8

Write-ColorOutput "`n✅ Backup abgeschlossen!" "Green"
Write-ColorOutput "   Verzeichnis: $backupDir" "Yellow"
Write-ColorOutput "   Groesse: $backupSizeMB MB ($backupSizeGB GB)" "Yellow"
Write-ColorOutput "   Info-Datei: $backupInfoFile" "Yellow"

# Optional: Komprimieren
if ($Compress) {
    Write-ColorOutput "`nKomprimiere Backup..." "Cyan"
    $zipFile = "$backupDir.zip"
    
    try {
        # PowerShell 5.0+ Komprimierung
        Compress-Archive -Path $backupDir -DestinationPath $zipFile -Force -CompressionLevel Optimal
        $zipSize = (Get-Item $zipFile).Length / 1MB
        Write-ColorOutput "✅ Backup komprimiert: $zipFile ($([math]::Round($zipSize, 2)) MB)" "Green"
        
        # Frage ob Original-Verzeichnis geloescht werden soll
        Write-ColorOutput "`nTipp: Das komprimierte Backup ist verfuegbar unter: $zipFile" "Cyan"
    } catch {
        Write-ColorOutput "⚠️  Fehler beim Komprimieren: $_" "Yellow"
        Write-ColorOutput "   Backup-Verzeichnis bleibt erhalten: $backupDir" "Yellow"
    }
}

$separator = "=" * 60
Write-ColorOutput "`n$separator" "Cyan"
Write-ColorOutput "Backup erfolgreich erstellt!" "Green"
Write-ColorOutput "$separator" "Cyan"
Write-ColorOutput ""

# Zeige Backup-Zusammenfassung
Write-ColorOutput "BACKUP-ZUSAMMENFASSUNG" "Cyan"
$dashSeparator = "-" * 60
Write-ColorOutput "$dashSeparator" "Cyan"
Write-ColorOutput "Zeitpunkt: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" "White"
Write-ColorOutput "Quelle: $projectRoot" "White"
Write-ColorOutput "Ziel: $backupDir" "White"
Write-ColorOutput "Größe: $backupSizeMB MB" "White"
if ($Compress -and (Test-Path "$backupDir.zip")) {
    Write-ColorOutput "ZIP-Datei: $backupDir.zip" "White"
}
$dashSeparator = "-" * 60
Write-ColorOutput "$dashSeparator" "Cyan"
Write-ColorOutput ""

Set-Location $projectRoot

