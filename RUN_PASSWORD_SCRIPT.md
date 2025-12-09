# Passwort-Script ausführen - Schritt für Schritt

## Schritt-für-Schritt Anleitung

### Schritt 1: Script hochladen (von Windows PowerShell)

```powershell
# Stellen Sie sicher, dass Sie im Projekt-Verzeichnis sind
cd C:\Users\david\OneDrive\Apps\TradrTrackr\trades-manage-projectCurrent

# Script auf Server hochladen
scp setup-password-protection.sh myvps@myvps:/tmp/setup-password-protection.sh
```

**Erwartete Ausgabe:**
```
setup-password-protection.sh    100%  XXXX  X.XKB/s   00:00
```

### Schritt 2: Mit Server verbinden

```powershell
# SSH-Verbindung zum Server
ssh myvps@myvps
```

**Oder direkt in einem neuen Terminal:**

```bash
ssh myvps@myvps
```

### Schritt 3: Script ausführbar machen

```bash
# Auf dem Server - Script ausführbar machen
sudo chmod +x /tmp/setup-password-protection.sh
```

### Schritt 4: Script ausführen

```bash
# Script mit sudo ausführen
sudo /tmp/setup-password-protection.sh
```

**Das Script wird Sie fragen:**
1. Benutzername eingeben
2. Passwort eingeben (zweimal zur Bestätigung)

### Schritt 5: Verifikation

```bash
# Testen Sie die Passwort-Authentifizierung
curl -I https://tradetrackr.de

# Sollte zurückgeben: HTTP/2 401 Unauthorized

# Test mit Credentials
curl -u username:password -I https://tradetrackr.de

# Sollte zurückgeben: HTTP/2 200 OK
```

## Komplette Befehlssequenz (Copy & Paste)

**In PowerShell (Windows):**

```powershell
# 1. Zum Projekt-Verzeichnis navigieren
cd C:\Users\david\OneDrive\Apps\TradrTrackr\trades-manage-projectCurrent

# 2. Script hochladen
scp setup-password-protection.sh myvps@myvps:/tmp/setup-password-protection.sh

# 3. Mit Server verbinden
ssh myvps@myvps
```

**Dann auf dem Server (nach SSH-Verbindung):**

```bash
# 4. Script ausführbar machen
sudo chmod +x /tmp/setup-password-protection.sh

# 5. Script ausführen
sudo /tmp/setup-password-protection.sh
```

## Was passiert während der Ausführung?

Das Script führt automatisch aus:

1. ✅ Prüft/installiert `htpasswd` Tool
2. ✅ Fragt nach Benutzername
3. ✅ Fragt nach Passwort (zweimal)
4. ✅ Erstellt/aktualisiert `/etc/nginx/.htpasswd`
5. ✅ Setzt Berechtigungen
6. ✅ Erstellt Backup der Nginx-Konfiguration
7. ✅ Fügt Authentifizierung zur Nginx-Konfiguration hinzu
8. ✅ Testet Nginx-Konfiguration
9. ✅ Lädt Nginx neu

## Beispiel-Ausgabe

```
=========================================
TradeTrackr - Password Protection Setup
=========================================

Step 1: Install htpasswd utility (if not installed)...
✓ htpasswd already installed

Step 2: Create or update password file...
Enter username: admin
New password: 
Re-type new password: 
Adding password for user admin
✓ Password file created

Step 3: Set proper permissions on password file...
✓ Permissions set

Step 4: Backup Nginx configuration...
✓ Backup created: /etc/nginx/sites-available/tradetrackr.de.backup.20251116_163045

Step 5: Add authentication to Nginx configuration...
✓ Authentication added to configuration
✓ ACME challenge path configured

Step 6: Test Nginx configuration...
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
✓ Nginx configuration is valid

Step 7: Reload Nginx...
✓ Nginx reloaded successfully

=========================================
Password protection setup completed!
=========================================

Summary:
  Password file: /etc/nginx/.htpasswd
  Users in file:
    - admin

To add more users later:
  sudo htpasswd /etc/nginx/.htpasswd username

Test the protection:
  curl -I https://tradetrackr.de
  (Should return 401 Unauthorized)
```

## Troubleshooting

### Problem: "scp: command not found"

**Lösung:** Verwenden Sie PowerShell's integriertes `scp` oder installieren Sie OpenSSH:
```powershell
# In PowerShell sollte scp verfügbar sein
# Falls nicht, verwenden Sie WinSCP oder kopieren Sie manuell
```

### Problem: "Permission denied"

**Lösung:** Stellen Sie sicher, dass Sie sudo verwenden:
```bash
sudo /tmp/setup-password-protection.sh
```

### Problem: "htpasswd: command not found"

**Lösung:** Das Script installiert es automatisch, aber falls es fehlschlägt:
```bash
sudo apt-get update
sudo apt-get install -y apache2-utils
```

## Nach der Einrichtung

### Weitere Benutzer hinzufügen

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





