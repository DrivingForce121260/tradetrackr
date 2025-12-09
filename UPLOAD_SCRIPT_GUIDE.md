# Script auf Server hochladen - Anleitung

## Methode 1: SCP (Secure Copy) - Empfohlen

**Von Ihrem lokalen Windows-Rechner:**

```powershell
# Navigieren Sie zum Projekt-Verzeichnis
cd C:\Users\david\OneDrive\Apps\TradrTrackr\trades-manage-projectCurrent

# Script auf Server hochladen (ersetzen Sie USERNAME und SERVER_IP)
scp fix-nginx-401.sh USERNAME@SERVER_IP:/tmp/fix-nginx-401.sh

# Beispiel:
# scp fix-nginx-401.sh root@tradetrackr.de:/tmp/fix-nginx-401.sh
```

**Dann auf dem Server ausführen:**
```bash
ssh USERNAME@SERVER_IP
sudo chmod +x /tmp/fix-nginx-401.sh
sudo /tmp/fix-nginx-401.sh
```

## Methode 2: PowerShell mit SSH

**Direkt aus PowerShell:**

```powershell
# Script-Inhalt auf Server kopieren
$scriptContent = Get-Content fix-nginx-401.sh -Raw
ssh USERNAME@SERVER_IP "echo '$scriptContent' > /tmp/fix-nginx-401.sh && chmod +x /tmp/fix-nginx-401.sh && sudo /tmp/fix-nginx-401.sh"
```

## Methode 3: Manuell kopieren und einfügen

**Schritt 1: Script-Inhalt anzeigen**
```powershell
Get-Content fix-nginx-401.sh
```

**Schritt 2: Auf Server verbinden**
```powershell
ssh USERNAME@SERVER_IP
```

**Schritt 3: Script erstellen**
```bash
sudo nano /tmp/fix-nginx-401.sh
```

**Schritt 4: Inhalt einfügen**
- Kopieren Sie den gesamten Inhalt von `fix-nginx-401.sh`
- Fügen Sie ihn in nano ein (Rechtsklick oder Strg+Shift+V)
- Speichern: `Ctrl+O`, dann `Enter`
- Beenden: `Ctrl+X`

**Schritt 5: Ausführen**
```bash
sudo chmod +x /tmp/fix-nginx-401.sh
sudo /tmp/fix-nginx-401.sh
```

## Methode 4: WinSCP (GUI-Tool)

1. **WinSCP installieren** (falls nicht vorhanden): https://winscp.net/
2. **Verbinden** mit Ihrem Server
3. **Script-Datei** (`fix-nginx-401.sh`) von lokalem Rechner auf Server ziehen (Drag & Drop)
4. **Rechtsklick** auf die Datei → Properties → Execute-Berechtigung setzen
5. **Terminal öffnen** in WinSCP und ausführen:
   ```bash
   sudo /path/to/fix-nginx-401.sh
   ```

## Methode 5: Direkt die Befehle ausführen (ohne Script)

Wenn Sie keinen Zugriff auf das Script haben, können Sie die Befehle direkt ausführen:

**Auf dem Server:**

```bash
# 1. Backup erstellen
sudo cp /etc/nginx/sites-available/tradetrackr /etc/nginx/sites-available/tradetrackr.backup

# 2. Authentifizierung entfernen
sudo sed -i '/auth_basic/d' /etc/nginx/sites-available/tradetrackr
sudo sed -i '/auth_basic_user_file/d' /etc/nginx/sites-available/tradetrackr

# 3. Dateiberechtigungen setzen
sudo chown -R www-data:www-data /var/www/tradetrackr
sudo chmod -R 755 /var/www/tradetrackr

# 4. Testen
sudo nginx -t

# 5. Neu laden (nur wenn Test erfolgreich)
sudo systemctl reload nginx
```

## Schnellste Methode (Empfohlen)

**Wenn Sie bereits SSH-Zugriff haben:**

```powershell
# In PowerShell auf Ihrem Windows-Rechner:
scp fix-nginx-401.sh root@tradetrackr.de:/tmp/

# Dann auf Server verbinden und ausführen:
ssh root@tradetrackr.de
sudo chmod +x /tmp/fix-nginx-401.sh
sudo /tmp/fix-nginx-401.sh
```

## Troubleshooting

### Problem: "scp: command not found"

**Lösung:** Verwenden Sie PowerShell's `scp` oder installieren Sie OpenSSH:
```powershell
# In PowerShell (Windows 10+)
scp fix-nginx-401.sh USERNAME@SERVER_IP:/tmp/
```

### Problem: "Permission denied"

**Lösung:** Stellen Sie sicher, dass Sie die richtigen Berechtigungen haben:
```bash
# Auf dem Server
sudo chmod 755 /tmp/fix-nginx-401.sh
sudo /tmp/fix-nginx-401.sh
```

### Problem: "No such file or directory"

**Lösung:** Prüfen Sie den Pfad:
```bash
# Auf dem Server
ls -la /tmp/fix-nginx-401.sh
pwd
```

## Alternative: Nginx-Konfiguration direkt aktualisieren

Wenn Sie das Script nicht hochladen können, können Sie die Nginx-Konfiguration direkt bearbeiten:

```bash
# Auf dem Server
sudo nano /etc/nginx/sites-available/tradetrackr

# Entfernen Sie alle Zeilen, die enthalten:
# auth_basic
# auth_basic_user_file

# Speichern (Ctrl+O) und beenden (Ctrl+X)

# Testen und neu laden
sudo nginx -t && sudo systemctl reload nginx
```





