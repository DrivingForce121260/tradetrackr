# 401 Unauthorized Fehler beheben - Server-Konfiguration

## Problem
Der Nginx-Server gibt `401 Unauthorized` zurück, was verhindert, dass die Seite geladen wird.

## Ursache
Die Nginx-Konfiguration auf dem Server erfordert möglicherweise Authentifizierung oder hat falsche Berechtigungen.

## Lösung

### Schritt 1: Nginx-Konfiguration aktualisieren

**Auf dem Server ausführen:**

```bash
# 1. Backup der aktuellen Konfiguration
sudo cp /etc/nginx/sites-available/tradetrackr /etc/nginx/sites-available/tradetrackr.backup

# 2. Neue Konfiguration hochladen (von lokalem Rechner)
# Verwenden Sie die Datei nginx-tradetrackr.conf aus diesem Projekt

# 3. Oder manuell erstellen:
sudo nano /etc/nginx/sites-available/tradetrackr
```

**Kopieren Sie den Inhalt von `nginx-tradetrackr.conf` in die Datei.**

### Schritt 2: Konfiguration testen

```bash
# Testen Sie die Nginx-Konfiguration
sudo nginx -t
```

**Erwartete Ausgabe:**
```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

### Schritt 3: Nginx neu laden

```bash
sudo systemctl reload nginx
# oder
sudo service nginx reload
```

### Schritt 4: Dateiberechtigungen prüfen

```bash
# Stellen Sie sicher, dass die Dateien lesbar sind
sudo chown -R www-data:www-data /var/www/tradetrackr
sudo chmod -R 755 /var/www/tradetrackr

# Prüfen Sie, ob index.html existiert und lesbar ist
ls -la /var/www/tradetrackr/index.html
cat /var/www/tradetrackr/index.html | head -5
```

**Erwartete Ausgabe:**
```
-rw-r--r-- 1 www-data www-data 1234 Nov 16 15:00 /var/www/tradetrackr/index.html
<!DOCTYPE html>
<html lang="de">
  <head>
    <meta charset="UTF-8" />
```

### Schritt 5: Nginx-Logs prüfen

```bash
# Fehler-Log prüfen
sudo tail -f /var/log/nginx/tradetrackr-error.log

# Access-Log prüfen
sudo tail -f /var/log/nginx/tradetrackr-access.log
```

### Schritt 6: Prüfen Sie, ob andere Konfigurationen die Authentifizierung erfordern

```bash
# Prüfen Sie die Haupt-Nginx-Konfiguration
sudo grep -r "auth_basic" /etc/nginx/
sudo grep -r "401" /etc/nginx/

# Wenn auth_basic gefunden wird, kommentieren Sie es aus oder entfernen Sie es
```

## Wichtige Punkte in der Konfiguration

### 1. Keine Authentifizierung
Die Konfiguration enthält **keine** `auth_basic` Direktiven, die 401-Fehler verursachen könnten.

### 2. Korrekte Dateiberechtigungen
- `www-data:www-data` als Besitzer
- `755` Berechtigungen für Verzeichnisse
- `644` Berechtigungen für Dateien

### 3. SPA-Routing
```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

### 4. Kein Cache für index.html
```nginx
location = /index.html {
    add_header Cache-Control "no-cache, no-store, must-revalidate";
}
```

## Troubleshooting

### Problem: 401 Fehler bleibt bestehen

**Lösung 1: Prüfen Sie die Haupt-Nginx-Konfiguration**
```bash
sudo nano /etc/nginx/nginx.conf
# Stellen Sie sicher, dass keine globalen auth_basic Direktiven vorhanden sind
```

**Lösung 2: Prüfen Sie andere Site-Konfigurationen**
```bash
ls -la /etc/nginx/sites-enabled/
# Prüfen Sie, ob andere Konfigurationen die Domain überschreiben
```

**Lösung 3: Prüfen Sie Firewall-Regeln**
```bash
sudo ufw status
# Stellen Sie sicher, dass Port 80 und 443 offen sind
```

### Problem: Dateien werden nicht gefunden

**Lösung:**
```bash
# Prüfen Sie den root-Pfad
sudo nginx -T | grep root

# Stellen Sie sicher, dass der Pfad korrekt ist
ls -la /var/www/tradetrackr/
```

### Problem: Permission Denied

**Lösung:**
```bash
# Setzen Sie die Berechtigungen neu
sudo chown -R www-data:www-data /var/www/tradetrackr
sudo find /var/www/tradetrackr -type d -exec chmod 755 {} \;
sudo find /var/www/tradetrackr -type f -exec chmod 644 {} \;
```

## Verifikation

Nach der Konfiguration:

1. **Testen Sie die Seite:**
   ```bash
   curl -I http://tradetrackr.de
   ```

   **Erwartete Ausgabe:**
   ```
   HTTP/1.1 200 OK
   Server: nginx/1.24.0
   Content-Type: text/html
   ```

2. **Prüfen Sie im Browser:**
   - Öffnen Sie `https://tradetrackr.de`
   - Entwicklertools → Network Tab
   - Status sollte `200 OK` sein, nicht `401`

3. **Prüfen Sie die HTML-Antwort:**
   ```bash
   curl http://tradetrackr.de | head -5
   ```

   **Sollte beginnen mit:**
   ```
   <!DOCTYPE html>
   <html lang="de">
   ```

## Schnelllösung (wenn Sie SSH-Zugriff haben)

```bash
# Führen Sie diese Befehle auf dem Server aus:

# 1. Backup
sudo cp /etc/nginx/sites-available/tradetrackr /etc/nginx/sites-available/tradetrackr.backup

# 2. Entfernen Sie alle auth_basic Direktiven
sudo sed -i '/auth_basic/d' /etc/nginx/sites-available/tradetrackr

# 3. Stellen Sie sicher, dass die Dateien lesbar sind
sudo chown -R www-data:www-data /var/www/tradetrackr
sudo chmod -R 755 /var/www/tradetrackr

# 4. Testen und neu laden
sudo nginx -t && sudo systemctl reload nginx
```

## Kontakt

Wenn das Problem weiterhin besteht, sammeln Sie:
- Nginx error log: `sudo tail -50 /var/log/nginx/tradetrackr-error.log`
- Nginx config: `sudo cat /etc/nginx/sites-available/tradetrackr`
- Dateiberechtigungen: `ls -la /var/www/tradetrackr/`





