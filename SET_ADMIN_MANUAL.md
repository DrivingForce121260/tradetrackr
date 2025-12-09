# Admin-Rolle manuell in Firebase setzen

Der Benutzer `david@3d-systems.com` hat derzeit keine Admin-Rolle in Firestore. 

## Option 1: Manuell über Firebase Console (Empfohlen) ✅

### Schritt-für-Schritt Anleitung:

1. **Firebase Console öffnen:**
   - Gehen Sie zu: https://console.firebase.google.com/
   - Wählen Sie das Projekt: **reportingapp817**

2. **Zu Firestore navigieren:**
   - Klicken Sie in der linken Seitenleiste auf **"Firestore Database"**

3. **Benutzer finden:**
   - Öffnen Sie die Collection **"users"**
   - Suchen Sie nach dem Dokument mit der UID: **`IvLgYIT0jLgYnmgrqgSVkeoP2I53`**
   - Oder suchen Sie nach der E-Mail: **`david@3d-systems.com`**

4. **Admin-Rolle setzen:**
   - Öffnen Sie das Benutzerdokument
   - **Falls das Feld "role" existiert:**
     - Klicken Sie auf das Feld "role"
     - Ändern Sie den Wert zu: **`admin`** (kleingeschrieben!)
   - **Falls das Feld "role" nicht existiert:**
     - Klicken Sie auf "+ Feld hinzufügen"
     - Feldname: **`role`**
     - Typ: **`string`**
     - Wert: **`admin`**
   - Klicken Sie auf "Speichern"

5. **Fertig!**
   - Jetzt können Sie das Cleanup-Script ausführen

## Option 2: Via Script (falls Berechtigungen vorhanden)

```powershell
cd scripts
$env:ADMIN_EMAIL="david@3d-systems.com"
$env:ADMIN_PASSWORD="L8174822"
node set-admin-role.js
```

## Nach dem Setzen der Admin-Rolle

Führen Sie das Cleanup-Script aus:

```powershell
cd scripts
$env:ADMIN_EMAIL="david@3d-systems.com"
$env:ADMIN_PASSWORD="L8174822"
npm run cleanup-duplicates
```

## Alternative: Anderen Admin-Benutzer verwenden

Falls bereits ein anderer Benutzer Admin-Rechte hat, können Sie auch diesen verwenden. Mögliche Kandidaten:
- `anaconda@3d-systems.com`
- `dbullock@rep.de`

Versuchen Sie sich mit einem dieser Accounts einzuloggen und prüfen Sie ob er funktioniert.








