# TradeTrackr Webportal - VPS Deployment Guide

Vollständige Anleitung zum Deployen des gebauten Webportals auf einen VPS-Server.

## 📋 Voraussetzungen

### 1. VPS-Server
- ✅ Linux-Server (Ubuntu 20.04+ empfohlen)
- ✅ Root-Zugang oder sudo-Berechtigung
- ✅ Mindestens 1GB RAM, 10GB Speicher
- ✅ Öffentliche IP-Adresse
- ✅ Domain-Name (optional, aber empfohlen)

### 2. Lokale Umgebung
- ✅ Build erfolgreich erstellt (`npm run build`)
- ✅ SSH-Zugang zum VPS
- ✅ SCP oder SFTP-Client installiert

## 🚀 Deployment-Schritte

### Schritt 1: Build lokal erstellen

```bash
# Im Projektverzeichnis
cd C:\Users\david\OneDrive\Apps\TradrTrackr\trades-manage-projectCurrent

# Build erstellen
npm run build

# Build-Verzeichnis prüfen
# Das Build-Verzeichnis sollte jetzt unter dist/ existieren
ls dist/
```

**Wichtig:** Das `dist/` Verzeichnis enthält alle statischen Dateien für das Webportal.

### Schritt 2: Webserver auf VPS installieren

#### Option A: Nginx (Empfohlen)

```bash
# SSH zum VPS verbinden
ssh root@your-vps-ip

# Nginx installieren
sudo apt update
sudo apt install nginx -y

# Nginx starten
sudo systemctl start nginx
sudo systemctl enable nginx

# Status prüfen
sudo systemctl status nginx
```

#### Option B: Apache

```bash
# Apache installieren
sudo apt update
sudo apt install apache2 -y

# Apache starten
sudo systemctl start apache2
sudo systemctl enable apache2
```

### Schritt 3: Verzeichnis-Berechtigungen einrichten

**WICHTIG:** Bevor Sie Dateien hochladen, müssen die Berechtigungen korrekt gesetzt sein:

```bash
# Auf VPS ausführen
sudo mkdir -p /var/www/tradetrackr
sudo chown -R www-data:www-data /var/www/tradetrackr
sudo chmod -R 755 /var/www/tradetrackr
```

**Alternative:** Wenn Sie als root hochladen möchten, können Sie auch:

```bash
# Verzeichnis dem root-Benutzer geben (weniger sicher)
sudo chown -R root:root /var/www/tradetrackr
sudo chmod -R 755 /var/www/tradetrackr
```

### Schritt 4: Build-Dateien auf VPS kopieren

#### Option A: Mit SCP (von Windows) - Mit Permission-Fix

**Problem:** Wenn Sie "Permission denied" erhalten, liegt das daran, dass das Verzeichnis dem `www-data`-Benutzer gehört.

**Lösung 1: Temporäres Verzeichnis verwenden (Empfohlen)**

```powershell
# 1. Temporäres Verzeichnis erstellen
ssh root@your-vps-ip "mkdir -p /tmp/tradetrackr-deploy"

# 2. Dateien hochladen
scp -r dist/* root@your-vps-ip:/tmp/tradetrackr-deploy/

# 3. Mit sudo verschieben und Berechtigungen setzen
ssh root@your-vps-ip "sudo rm -rf /var/www/tradetrackr/* && sudo cp -r /tmp/tradetrackr-deploy/* /var/www/tradetrackr/ && sudo chown -R www-data:www-data /var/www/tradetrackr && sudo chmod -R 755 /var/www/tradetrackr && rm -rf /tmp/tradetrackr-deploy"
```

**Lösung 2: Berechtigungen vorher setzen**

```bash
# Auf VPS ausführen (einmalig)
sudo chown -R root:root /var/www/tradetrackr
sudo chmod -R 777 /var/www/tradetrackr  # Temporär für Upload
```

Dann normal hochladen:
```powershell
scp -r dist/* root@your-vps-ip:/var/www/tradetrackr/
```

Danach Berechtigungen wieder korrekt setzen:
```bash
# Auf VPS
sudo chown -R www-data:www-data /var/www/tradetrackr
sudo chmod -R 755 /var/www/tradetrackr
```

**Lösung 3: WinSCP verwenden (GUI-Tool)**
- Download: https://winscp.net/
- Verbinden Sie sich als root
- Dateien hochladen
- Dann auf VPS: `sudo chown -R www-data:www-data /var/www/tradetrackr`

#### Option B: Mit Git (Empfohlen für Updates)

```bash
# Auf VPS
sudo mkdir -p /var/www/tradetrackr
cd /var/www/tradetrackr

# Git Repository klonen (wenn vorhanden)
git clone <your-repo-url> .

# Build lokal auf VPS
npm install
npm run build

# Oder nur dist/ Verzeichnis kopieren
```

#### Option C: Mit rsync (für Updates)

```bash
# Von lokalem Rechner
rsync -avz --delete dist/ root@your-vps-ip:/var/www/tradetrackr/
```

### Schritt 4: Nginx konfigurieren

```bash
# Nginx Konfiguration erstellen
sudo nano /etc/nginx/sites-available/tradetrackr
```

**Nginx-Konfiguration:**

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    
    # Root-Verzeichnis
    root /var/www/tradetrackr;
    index index.html;

    # Gzip-Kompression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # SPA Routing - alle Routen zu index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Statische Assets cachen
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # API-Proxy (falls nötig)
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Konfiguration aktivieren:**

```bash
# Symlink erstellen
sudo ln -s /etc/nginx/sites-available/tradetrackr /etc/nginx/sites-enabled/

# Standard-Konfiguration entfernen (optional)
sudo rm /etc/nginx/sites-enabled/default

# Nginx-Konfiguration testen
sudo nginx -t

# Nginx neu laden
sudo systemctl reload nginx
```

### Schritt 5: Apache konfigurieren (Alternative)

```bash
# Apache Virtual Host erstellen
sudo nano /etc/apache2/sites-available/tradetrackr.conf
```

**Apache-Konfiguration:**

```apache
<VirtualHost *:80>
    ServerName your-domain.com
    ServerAlias www.your-domain.com
    
    DocumentRoot /var/www/tradetrackr
    
    <Directory /var/www/tradetrackr>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
        
        # SPA Routing
        RewriteEngine On
        RewriteBase /
        RewriteRule ^index\.html$ - [L]
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule . /index.html [L]
    </Directory>
    
    # Gzip-Kompression
    <IfModule mod_deflate.c>
        AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript application/json
    </IfModule>
    
    # Caching
    <IfModule mod_expires.c>
        ExpiresActive On
        ExpiresByType image/jpg "access plus 1 year"
        ExpiresByType image/jpeg "access plus 1 year"
        ExpiresByType image/gif "access plus 1 year"
        ExpiresByType image/png "access plus 1 year"
        ExpiresByType text/css "access plus 1 year"
        ExpiresByType application/javascript "access plus 1 year"
    </IfModule>
</VirtualHost>
```

**Konfiguration aktivieren:**

```bash
# Site aktivieren
sudo a2ensite tradetrackr.conf

# Apache-Module aktivieren
sudo a2enmod rewrite
sudo a2enmod expires
sudo a2enmod deflate

# Apache neu laden
sudo systemctl reload apache2
```

### Schritt 6: SSL-Zertifikat einrichten (Let's Encrypt)

```bash
# Certbot installieren
sudo apt install certbot python3-certbot-nginx -y

# SSL-Zertifikat erstellen (Nginx)
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Oder für Apache
sudo apt install python3-certbot-apache -y
sudo certbot --apache -d your-domain.com -d www.your-domain.com

# Auto-Renewal testen
sudo certbot renew --dry-run
```

**Nginx wird automatisch auf HTTPS umgestellt.**

### Schritt 7: Firewall konfigurieren

```bash
# UFW installieren (falls nicht vorhanden)
sudo apt install ufw -y

# Firewall-Regeln
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS

# Firewall aktivieren
sudo ufw enable

# Status prüfen
sudo ufw status
```

### Schritt 8: Verifizierung

1. **HTTP testen:**
   ```
   http://your-vps-ip
   http://your-domain.com
   ```

2. **HTTPS testen:**
   ```
   https://your-domain.com
   ```

3. **Routing testen:**
   - Navigieren Sie zu verschiedenen Seiten
   - Prüfen Sie, ob alle Routen funktionieren
   - Prüfen Sie die Browser-Konsole auf Fehler

## 🔄 Updates deployen

### Automatisches Update-Script

Erstellen Sie `deploy-to-vps.sh`:

```bash
#!/bin/bash

# Konfiguration
VPS_USER="root"
VPS_HOST="your-vps-ip"
VPS_PATH="/var/www/tradetrackr"
LOCAL_DIST="./dist"

# Build erstellen
echo "Building application..."
npm run build

# Dateien hochladen
echo "Uploading files to VPS..."
rsync -avz --delete \
  --exclude '*.map' \
  $LOCAL_DIST/ $VPS_USER@$VPS_HOST:$VPS_PATH/

# Nginx neu laden
echo "Reloading Nginx..."
ssh $VPS_USER@$VPS_HOST "sudo systemctl reload nginx"

echo "Deployment complete!"
```

**Verwendung:**

```bash
chmod +x deploy-to-vps.sh
./deploy-to-vps.sh
```

### Windows PowerShell Script

Erstellen Sie `deploy-to-vps.ps1`:

```powershell
# Konfiguration
$VPS_HOST = "your-vps-ip"
$VPS_USER = "root"
$VPS_PATH = "/var/www/tradetrackr"
$LOCAL_DIST = ".\dist"

# Build erstellen
Write-Host "Building application..." -ForegroundColor Green
npm run build

# Dateien hochladen (mit WinSCP oder SCP)
Write-Host "Uploading files to VPS..." -ForegroundColor Green
scp -r "$LOCAL_DIST\*" "${VPS_USER}@${VPS_HOST}:${VPS_PATH}/"

# Nginx neu laden
Write-Host "Reloading Nginx..." -ForegroundColor Green
ssh "${VPS_USER}@${VPS_HOST}" "sudo systemctl reload nginx"

Write-Host "Deployment complete!" -ForegroundColor Green
```

## 🔧 Troubleshooting

### Problem: 404-Fehler bei Routen

**Lösung:** Stellen Sie sicher, dass die SPA-Routing-Konfiguration aktiv ist:

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

### Problem: Assets werden nicht geladen

**Lösung:** Prüfen Sie die Pfade in `dist/index.html`:

```bash
# Auf VPS
cat /var/www/tradetrackr/index.html | grep -E "(href|src)="
```

Falls Pfade mit `/` beginnen, sollten sie funktionieren.

### Problem: CORS-Fehler

**Lösung:** Falls Sie eine separate API haben, fügen Sie CORS-Header hinzu:

```nginx
location /api {
    proxy_pass http://localhost:3000;
    proxy_set_header Access-Control-Allow-Origin *;
    # ... weitere Proxy-Einstellungen
}
```

### Problem: Langsame Ladezeiten

**Lösung:** 
- Gzip-Kompression aktivieren
- Browser-Caching konfigurieren
- CDN verwenden (optional)

## 📊 Monitoring

### Logs prüfen

```bash
# Nginx Access Logs
sudo tail -f /var/log/nginx/access.log

# Nginx Error Logs
sudo tail -f /var/log/nginx/error.log

# Apache Logs
sudo tail -f /var/log/apache2/access.log
sudo tail -f /var/log/apache2/error.log
```

### Performance-Monitoring

```bash
# Server-Ressourcen
htop

# Disk-Space
df -h

# Nginx Status
sudo systemctl status nginx
```

## 🔒 Security Best Practices

1. **Firewall:** Nur notwendige Ports öffnen
2. **SSL:** Immer HTTPS verwenden
3. **Updates:** Regelmäßig System-Updates installieren
4. **Backups:** Regelmäßige Backups des `dist/` Verzeichnisses
5. **Rate Limiting:** Nginx Rate Limiting aktivieren (optional)

**Rate Limiting Beispiel:**

```nginx
# In nginx.conf oder server block
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

location /api {
    limit_req zone=api_limit burst=20;
    # ... weitere Einstellungen
}
```

## 📝 Checkliste

- [ ] Build erfolgreich erstellt (`npm run build`)
- [ ] Webserver installiert (Nginx/Apache)
- [ ] Build-Dateien auf VPS kopiert
- [ ] Webserver konfiguriert
- [ ] SSL-Zertifikat eingerichtet
- [ ] Firewall konfiguriert
- [ ] Domain auf VPS-IP zeigt
- [ ] HTTPS funktioniert
- [ ] Alle Routen funktionieren
- [ ] Assets werden korrekt geladen
- [ ] Monitoring eingerichtet

## 🆘 Support

Bei Problemen:

1. **Logs prüfen:** `/var/log/nginx/error.log` oder `/var/log/apache2/error.log`
2. **Nginx-Konfiguration testen:** `sudo nginx -t`
3. **Browser-Konsole prüfen:** F12 → Console
4. **Network-Tab prüfen:** F12 → Network

---

**Version:** 1.0.0  
**Stand:** 2025  
**Status:** Production-Ready ✅

