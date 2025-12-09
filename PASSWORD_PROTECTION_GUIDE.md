# Password Protection Setup Guide

## Übersicht

Dieses Guide erklärt, wie Sie HTTP Basic Authentication für das TradeTrackr Web-Portal einrichten.

## Schnellstart

### Option 1: Automatisches Script (Empfohlen)

```bash
# Script hochladen
scp setup-password-protection.sh myvps@myvps:/tmp/

# Auf Server ausführen
ssh myvps@myvps
sudo chmod +x /tmp/setup-password-protection.sh
sudo /tmp/setup-password-protection.sh
```

Das Script führt Sie durch:
1. Installation von `htpasswd` (falls nicht vorhanden)
2. Erstellung/Update der Passwort-Datei
3. Konfiguration von Nginx
4. Test und Reload

### Option 2: Manuelle Einrichtung

#### Schritt 1: htpasswd installieren

```bash
sudo apt-get update
sudo apt-get install -y apache2-utils
```

#### Schritt 2: Passwort-Datei erstellen

```bash
# Ersten Benutzer erstellen
sudo htpasswd -c /etc/nginx/.htpasswd username

# Weitere Benutzer hinzufügen (ohne -c Flag!)
sudo htpasswd /etc/nginx/.htpasswd anotheruser
```

#### Schritt 3: Berechtigungen setzen

```bash
sudo chown root:www-data /etc/nginx/.htpasswd
sudo chmod 640 /etc/nginx/.htpasswd
```

#### Schritt 4: Nginx-Konfiguration anpassen

```bash
sudo nano /etc/nginx/sites-available/tradetrackr.de
```

**Fügen Sie nach `root /var/www/tradetrackr;` hinzu:**

```nginx
# Password protection
auth_basic "Restricted – TradeTrackr";
auth_basic_user_file /etc/nginx/.htpasswd;

# Allow ACME challenge without auth (for Let's Encrypt)
location ^~ /.well-known/acme-challenge/ {
    auth_basic off;
    root /var/www/tradetrackr;
}
```

**Wichtig:** Fügen Sie dies sowohl im HTTP (80) als auch im HTTPS (443) Server-Block hinzu!

#### Schritt 5: Testen und neu laden

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## Benutzer-Verwaltung

### Neuen Benutzer hinzufügen

```bash
sudo htpasswd /etc/nginx/.htpasswd newusername
```

### Passwort ändern

```bash
sudo htpasswd /etc/nginx/.htpasswd existingusername
```

### Benutzer entfernen

```bash
sudo htpasswd -D /etc/nginx/.htpasswd username
```

### Alle Benutzer anzeigen

```bash
cat /etc/nginx/.htpasswd | cut -d: -f1
```

## Sicherheit

### Best Practices

1. **Starke Passwörter verwenden**
   - Mindestens 12 Zeichen
   - Mix aus Groß-/Kleinbuchstaben, Zahlen und Sonderzeichen

2. **Regelmäßig Passwörter ändern**
   ```bash
   sudo htpasswd /etc/nginx/.htpasswd username
   ```

3. **Berechtigungen prüfen**
   ```bash
   ls -la /etc/nginx/.htpasswd
   # Sollte zeigen: -rw-r----- root www-data
   ```

4. **HTTPS verwenden**
   - HTTP Basic Auth sendet Passwörter Base64-kodiert (nicht verschlüsselt!)
   - Daher immer HTTPS verwenden

5. **Regelmäßige Backups**
   ```bash
   sudo cp /etc/nginx/.htpasswd /etc/nginx/.htpasswd.backup
   ```

## Troubleshooting

### Problem: 401 Fehler auch mit korrekten Credentials

**Lösung:**
```bash
# Prüfen Sie die Passwort-Datei
sudo cat /etc/nginx/.htpasswd

# Prüfen Sie die Berechtigungen
sudo ls -la /etc/nginx/.htpasswd

# Testen Sie die Authentifizierung
curl -u username:password https://tradetrackr.de
```

### Problem: Let's Encrypt kann nicht erneuern

**Lösung:** Stellen Sie sicher, dass der ACME-Challenge-Pfad ohne Auth ist:
```nginx
location ^~ /.well-known/acme-challenge/ {
    auth_basic off;
    root /var/www/tradetrackr;
}
```

### Problem: Passwort-Datei nicht gefunden

**Lösung:**
```bash
# Prüfen Sie den Pfad in der Nginx-Konfiguration
sudo grep auth_basic_user_file /etc/nginx/sites-available/tradetrackr.de

# Erstellen Sie die Datei neu
sudo htpasswd -c /etc/nginx/.htpasswd username
```

## Temporär deaktivieren

Falls Sie die Authentifizierung temporär deaktivieren möchten:

```bash
# Kommentieren Sie die auth_basic Zeilen aus
sudo nano /etc/nginx/sites-available/tradetrackr.de

# Oder entfernen Sie sie temporär
sudo sed -i 's/^    auth_basic/#    auth_basic/' /etc/nginx/sites-available/tradetrackr.de
sudo sed -i 's/^    auth_basic_user_file/#    auth_basic_user_file/' /etc/nginx/sites-available/tradetrackr.de

sudo nginx -t && sudo systemctl reload nginx
```

## Verifikation

### Test ohne Credentials (sollte 401 zurückgeben)

```bash
curl -I https://tradetrackr.de
# Erwartet: HTTP/2 401
```

### Test mit Credentials (sollte 200 zurückgeben)

```bash
curl -u username:password -I https://tradetrackr.de
# Erwartet: HTTP/2 200
```

### Im Browser testen

1. Öffnen Sie `https://tradetrackr.de`
2. Ein Login-Dialog sollte erscheinen
3. Geben Sie Benutzername und Passwort ein
4. Die Seite sollte laden

## Wichtige Hinweise

⚠️ **HTTP Basic Auth ist nicht sehr sicher:**
- Passwörter werden Base64-kodiert (nicht verschlüsselt) übertragen
- **Immer HTTPS verwenden!**
- Für Produktionsumgebungen sollten Sie später eine richtige Authentifizierung implementieren

✅ **Für Staging/Entwicklung ist es ausreichend:**
- Einfach einzurichten
- Schnell zu konfigurieren
- Ausreichend für temporären Schutz





