# TradeTrackr - Complete Backup Script
# Erstellt ein vollständiges Backup des Projekts

param(
    [Parameter(Mandatory=$false)]
    [string]$BackupPath = ".\backups"
)

$ErrorActionPreference = "Stop"

# Farben für Output
function Write-Success { Write-Host $args -ForegroundColor Green }
function Write-Info { Write-Host $args -ForegroundColor Cyan }
function Write-Warning { Write-Host $args -ForegroundColor Yellow }
function Write-Error { Write-Host $args -ForegroundColor Red }

# Timestamp für Backup-Verzeichnis
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupDir = Join-Path $BackupPath "backup-$timestamp"

Write-Host "=========================================" -ForegroundColor Green
Write-Host "TradeTrackr - Complete Backup" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""

# Backup-Verzeichnis erstellen
Write-Info "Creating backup directory: $backupDir"
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
New-Item -ItemType Directory -Path "$backupDir\src" -Force | Out-Null
New-Item -ItemType Directory -Path "$backupDir\functions" -Force | Out-Null
New-Item -ItemType Directory -Path "$backupDir\config" -Force | Out-Null
New-Item -ItemType Directory -Path "$backupDir\docs" -Force | Out-Null

# 1. Source Code
Write-Info "Backing up source code..."
Copy-Item -Path ".\src" -Destination "$backupDir\src" -Recurse -Force
Write-Success "Source code backed up"

# 2. Functions
Write-Info "Backing up Cloud Functions..."
if (Test-Path ".\functions") {
    Copy-Item -Path ".\functions" -Destination "$backupDir\functions" -Recurse -Force
    Write-Success "Cloud Functions backed up"
} else {
    Write-Warning "Functions directory not found"
}

# 3. Configuration Files
Write-Info "Backing up configuration files..."
$configFiles = @(
    "package.json",
    "package-lock.json",
    "tsconfig.json",
    "vite.config.ts",
    "tailwind.config.js",
    "postcss.config.js",
    "firebase.json",
    ".firebaserc",
    "firestore.rules",
    "firestore.indexes.json",
    "storage.rules",
    ".env.example",
    ".gitignore"
)

foreach ($file in $configFiles) {
    if (Test-Path ".\$file") {
        Copy-Item -Path ".\$file" -Destination "$backupDir\" -Force
    }
}
Write-Success "Configuration files backed up"

# 4. Documentation
Write-Info "Backing up documentation..."
$docFiles = Get-ChildItem -Path "." -Filter "*.md" -File
foreach ($doc in $docFiles) {
    Copy-Item -Path $doc.FullName -Destination "$backupDir\docs\" -Force
}
Write-Success "Documentation backed up ($($docFiles.Count) files)"

# 5. Scripts
Write-Info "Backing up scripts..."
$scripts = @()
$scripts += Get-ChildItem -Path "." -Filter "*.ps1" -File -ErrorAction SilentlyContinue
$scripts += Get-ChildItem -Path "." -Filter "*.sh" -File -ErrorAction SilentlyContinue
foreach ($script in $scripts) {
    Copy-Item -Path $script.FullName -Destination "$backupDir\" -Force
}
$scriptCount = if ($scripts) { $scripts.Count } else { 0 }
Write-Success "Scripts backed up ($scriptCount files)"

# 6. Assets
Write-Info "Backing up assets..."
if (Test-Path ".\assets") {
    Copy-Item -Path ".\assets" -Destination "$backupDir\assets" -Recurse -Force
    Write-Success "Assets backed up"
} else {
    Write-Warning "Assets directory not found"
}

# 7. Public files
Write-Info "Backing up public files..."
if (Test-Path ".\public") {
    Copy-Item -Path ".\public" -Destination "$backupDir\public" -Recurse -Force
    Write-Success "Public files backed up"
} else {
    Write-Warning "Public directory not found"
}

# 8. Build output (falls vorhanden)
Write-Info "Backing up build output..."
if (Test-Path ".\dist") {
    Copy-Item -Path ".\dist" -Destination "$backupDir\dist" -Recurse -Force
    Write-Success "Build output backed up"
} else {
    Write-Warning "Build output not found (run 'npm run build' first)"
}

# 9. Node modules Info (package-lock.json bereits kopiert)
Write-Info "Creating dependency list..."
if (Test-Path ".\package.json") {
    $packageJson = Get-Content ".\package.json" | ConvertFrom-Json
    $dependencies = @{
        dependencies = $packageJson.dependencies
        devDependencies = $packageJson.devDependencies
    }
    $dependencies | ConvertTo-Json -Depth 10 | Out-File "$backupDir\dependencies.json"
    Write-Success "Dependencies list created"
}

# 10. Backup Info File
Write-Info "Creating backup info file..."
$backupInfo = @{
    timestamp = $timestamp
    date = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    version = if (Test-Path ".\package.json") { (Get-Content ".\package.json" | ConvertFrom-Json).version } else { "unknown" }
    gitCommit = if (Get-Command git -ErrorAction SilentlyContinue) {
        try { git rev-parse HEAD } catch { "unknown" }
    } else { "git not available" }
    gitBranch = if (Get-Command git -ErrorAction SilentlyContinue) {
        try { git rev-parse --abbrev-ref HEAD } catch { "unknown" }
    } else { "git not available" }
    filesBackedUp = (Get-ChildItem -Path $backupDir -Recurse -File).Count
    totalSize = "{0:N2} MB" -f ((Get-ChildItem -Path $backupDir -Recurse -File | Measure-Object -Property Length -Sum).Sum / 1MB)
}

$backupInfo | ConvertTo-Json | Out-File "$backupDir\backup-info.json"
Write-Success "Backup info file created"

# Zusammenfassung
Write-Host ""
Write-Host "=========================================" -ForegroundColor Green
Write-Host "Backup completed successfully!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Green
Write-Host ""
Write-Info "Backup location: $backupDir"
Write-Info "Files backed up: $($backupInfo.filesBackedUp)"
Write-Info "Total size: $($backupInfo.totalSize)"
Write-Host ""
Write-Success "Backup ready for restoration!"

