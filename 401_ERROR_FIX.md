# 401 Authorization Required - Lösung

## Problem
Das Web-Portal zeigt manchmal einen "401 Authorization Required" Fehler, aber nicht immer.

## Mögliche Ursachen

### 1. Webserver-Konfiguration (Apache/Nginx)
Der Webserver blockiert möglicherweise Anfragen ohne Authentifizierung.

### 2. Token-Ablauf
Firebase-Tokens können ablaufen und müssen erneuert werden.

### 3. Caching-Probleme
Veraltete Dateien im Browser-Cache können zu Authentifizierungsproblemen führen.

## Lösungen

### Lösung 1: Apache .htaccess Datei
Die Datei `public/.htaccess` wurde erstellt und sollte automatisch beim Build kopiert werden.

**Manuelle Installation:**
1. Kopieren Sie `public/.htaccess` nach `dist/.htaccess` nach dem Build
2. Oder kopieren Sie sie direkt auf den Server nach `/var/www/tradetrackr/.htaccess`

**Überprüfung:**
```bash
# Auf dem Server prüfen
ls -la /var/www/tradetrackr/.htaccess
```

### Lösung 2: Nginx-Konfiguration
Wenn Sie Nginx verwenden, verwenden Sie die `nginx.conf.example` als Vorlage.

**Installation:**
```bash
# Auf dem Server
sudo cp nginx.conf.example /etc/nginx/sites-available/tradetrackr
sudo ln -s /etc/nginx/sites-available/tradetrackr /etc/nginx/sites-enabled/
sudo nginx -t  # Testen
sudo systemctl reload nginx
```

### Lösung 3: Token-Refresh implementieren
Stellen Sie sicher, dass Firebase-Tokens automatisch erneuert werden.

**Überprüfung in `src/contexts/AuthContext.tsx`:**
- `onAuthStateChanged` sollte automatisch Token-Updates handhaben
- Firebase SDK erneuert Tokens automatisch

### Lösung 4: Build-Script anpassen
Stellen Sie sicher, dass `.htaccess` beim Build kopiert wird.

**In `vite.config.ts` ist `publicDir: 'public'` gesetzt**, was bedeutet, dass alle Dateien aus `public/` automatisch kopiert werden sollten.

**Manuelle Überprüfung nach Build:**
```bash
npm run build
ls -la dist/.htaccess  # Sollte existieren
```

### Lösung 5: Server-Logs prüfen
Überprüfen Sie die Server-Logs, um die genaue Ursache zu finden:

**Apache:**
```bash
sudo tail -f /var/log/apache2/error.log
sudo tail -f /var/log/apache2/access.log
```

**Nginx:**
```bash
sudo tail -f /var/log/nginx/tradetrackr-error.log
sudo tail -f /var/log/nginx/tradetrackr-access.log
```

### Lösung 6: Browser-Cache leeren
Manchmal hilft es, den Browser-Cache zu leeren:

1. **Chrome/Edge:** `Ctrl+Shift+Delete` → Cache leeren
2. **Firefox:** `Ctrl+Shift+Delete` → Cache leeren
3. **Hard Refresh:** `Ctrl+F5` oder `Ctrl+Shift+R`

### Lösung 7: Deployment-Script aktualisieren
Stellen Sie sicher, dass `.htaccess` beim Deployment kopiert wird.

**In `deploy-to-vps.sh` oder `deploy-to-vps.ps1`:**
```bash
# Nach dem Build, vor dem Upload
cp public/.htaccess dist/.htaccess
```

## Sofortmaßnahmen

1. **Prüfen Sie die Server-Konfiguration:**
   ```bash
   # Auf dem Server
   cat /var/www/tradetrackr/.htaccess
   ```

2. **Stellen Sie sicher, dass mod_rewrite aktiviert ist (Apache):**
   ```bash
   sudo a2enmod rewrite
   sudo systemctl restart apache2
   ```

3. **Testen Sie die Konfiguration:**
   ```bash
   # Apache
   sudo apache2ctl configtest
   
   # Nginx
   sudo nginx -t
   ```

4. **Überprüfen Sie die Dateiberechtigungen:**
   ```bash
   sudo chown -R www-data:www-data /var/www/tradetrackr
   sudo chmod -R 755 /var/www/tradetrackr
   ```

## Debugging

### Browser-Konsole prüfen
Öffnen Sie die Browser-Konsole (F12) und prüfen Sie:
- Netzwerk-Tab: Welche Anfragen schlagen fehl?
- Console-Tab: Gibt es JavaScript-Fehler?

### Firebase-Authentifizierung prüfen
```javascript
// In Browser-Konsole
import { auth } from './config/firebase';
auth.currentUser?.getIdToken().then(token => console.log('Token:', token));
```

## Prävention

1. **Automatisches Token-Refresh:** Firebase SDK erneuert Tokens automatisch
2. **Proper Error Handling:** Implementieren Sie Retry-Logik für 401-Fehler
3. **Monitoring:** Überwachen Sie Server-Logs regelmäßig

## Kontakt

Wenn das Problem weiterhin besteht, sammeln Sie:
- Server-Logs (letzte 100 Zeilen)
- Browser-Konsole-Ausgabe
- Netzwerk-Tab-Screenshot
- Server-Konfiguration (Apache/Nginx)





