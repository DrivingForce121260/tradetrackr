#!/bin/bash

# TradeTrackr Webportal - Fix VPS Permissions Script
# Führt auf dem VPS aus, um Berechtigungen zu korrigieren

VPS_PATH="${1:-/var/www/tradetrackr}"

echo "Fixing permissions for: ${VPS_PATH}"

# Verzeichnis erstellen falls nicht vorhanden
sudo mkdir -p "${VPS_PATH}"

# Besitzer auf www-data setzen (für Nginx)
sudo chown -R www-data:www-data "${VPS_PATH}"

# Berechtigungen setzen
sudo chmod -R 755 "${VPS_PATH}"

# Für Dateien zusätzlich Leserechte
sudo find "${VPS_PATH}" -type f -exec chmod 644 {} \;

# Für Verzeichnisse zusätzlich Ausführungsrechte
sudo find "${VPS_PATH}" -type d -exec chmod 755 {} \;

echo "✓ Permissions fixed!"
echo ""
echo "Current permissions:"
ls -la "${VPS_PATH}" | head -5







