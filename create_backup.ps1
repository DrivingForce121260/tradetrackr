# Backup-Skript für TradeTrackr Projekt
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$backupDir = "backup_$timestamp"

Write-Host "Erstelle Backup-Verzeichnis: $backupDir" -ForegroundColor Green
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

# Wichtige Verzeichnisse und Dateien kopieren
$itemsToBackup = @(
    "src",
    "functions",
    "public",
    "package.json",
    "package-lock.json",
    "tsconfig.json",
    "vite.config.ts",
    "tailwind.config.ts",
    "firestore.rules",
    "firestore.indexes.json",
    ".env.example",
    "*.md",
    "*.json"
)

Write-Host "Kopiere Dateien..." -ForegroundColor Yellow

foreach ($item in $itemsToBackup) {
    if (Test-Path $item) {
        Write-Host "  Kopiere: $item" -ForegroundColor Cyan
        Copy-Item -Path $item -Destination $backupDir -Recurse -Force
    }
}

# Kopiere auch alle Markdown-Dateien im Root
Get-ChildItem -Path . -Filter "*.md" -File | ForEach-Object {
    Copy-Item -Path $_.FullName -Destination $backupDir -Force
}

# Kopiere alle JSON-Dateien im Root (außer node_modules)
Get-ChildItem -Path . -Filter "*.json" -File | ForEach-Object {
    Copy-Item -Path $_.FullName -Destination $backupDir -Force
}

# Erstelle Backup-Info-Datei
$backupInfo = @"
TradeTrackr Projekt Backup
==========================
Erstellt am: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
Verzeichnis: $backupDir
Quellverzeichnis: $(Get-Location)

Enthaltene Verzeichnisse:
- src/ (Quellcode)
- functions/ (Firebase Functions)
- public/ (Öffentliche Dateien)

Enthaltene Dateien:
- package.json
- tsconfig.json
- vite.config.ts
- tailwind.config.ts
- firestore.rules
- Alle Markdown-Dokumentationen
- Alle JSON-Konfigurationsdateien

Hinweis: node_modules wird nicht gesichert (kann mit npm install wiederhergestellt werden)
"@

$backupInfo | Out-File -FilePath "$backupDir/BACKUP_INFO.txt" -Encoding UTF8

Write-Host ""
Write-Host "Backup erfolgreich erstellt!" -ForegroundColor Green
Write-Host "Verzeichnis: $backupDir" -ForegroundColor Green
Write-Host ""
Write-Host "Größe des Backups:" -ForegroundColor Yellow
$size = (Get-ChildItem -Path $backupDir -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
Write-Host "  $([math]::Round($size, 2)) MB" -ForegroundColor Cyan







