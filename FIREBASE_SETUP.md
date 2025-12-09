# 🔥 Firebase Setup für TradeTrackr Field App

## ⚠️ WICHTIG: Echte Firebase-Credentials eintragen!

Die App verwendet aktuell **Demo-Werte** und zeigt deshalb den Fehler:
```
Firebase: Error (auth/api-key-not-valid. please-pass-a-valid-api-key.)
```

### 📋 Schritt-für-Schritt Anleitung

#### 1️⃣ Firebase Console öffnen

1. Gehen Sie zu: https://console.firebase.google.com
2. Wählen Sie Ihr **TradeTrackr-Projekt** aus (oder erstellen Sie ein neues)

#### 2️⃣ Firebase-Config kopieren

1. Klicken Sie auf **⚙️ Project Settings** (Zahnrad-Symbol oben links)
2. Scrollen Sie zu **"Your apps"**
3. Wählen Sie Ihre **Web App** aus (oder erstellen Sie eine neue)
4. Klicken Sie auf **"SDK setup and configuration"**
5. Wählen Sie **"Config"** (nicht npm)
6. Kopieren Sie die Werte aus dem `firebaseConfig`-Objekt:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abc123def456ghi789"
};
```

#### 3️⃣ .env Datei aktualisieren

Öffnen Sie die `.env` Datei im Projekt-Root und ersetzen Sie die Platzhalter:

```bash
# Vorher (DEMO - funktioniert NICHT):
EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX

# Nachher (ECHT):
EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSyC_IHR_ECHTER_KEY_HIER
```

Tragen Sie **alle 6 Firebase-Werte** ein:
- ✅ `EXPO_PUBLIC_FIREBASE_API_KEY`
- ✅ `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
- ✅ `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
- ✅ `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`
- ✅ `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- ✅ `EXPO_PUBLIC_FIREBASE_APP_ID`

#### 4️⃣ App NEU BAUEN

**WICHTIG:** Die `.env` Werte werden beim Build eingebaut!

```powershell
# Terminal öffnen im Projekt-Verzeichnis

# Production APK bauen
cd android
.\gradlew.bat assembleRelease

# Oder zurück ins Root und:
cd ..
cd android
.\gradlew.bat assembleRelease
```

#### 5️⃣ Neue APK installieren

```powershell
# APK installieren (ersetzt alte Version)
adb install -r "android\app\build\outputs\apk\release\app-release.apk"
```

---

## ✅ Checkliste

- [ ] Firebase Console geöffnet
- [ ] Projekt ausgewählt (oder neu erstellt)
- [ ] Web App Config kopiert
- [ ] `.env` Datei mit echten Werten aktualisiert
- [ ] **Alle 6 Firebase-Variablen** eingetragen
- [ ] App **NEU GEBAUT** (wichtig!)
- [ ] Neue APK installiert
- [ ] App gestartet
- [ ] Login funktioniert ✨

---

## 🔍 Problembehebung

### Fehler: "api-key-not-valid"
- ❌ `.env` Datei nicht aktualisiert
- ❌ App nicht neu gebaut nach `.env` Änderung
- ❌ Falscher API Key (von anderem Projekt)

### Fehler: Umgebungsvariablen nicht gelesen
- ❌ Datei heißt nicht `.env` (mit Punkt am Anfang!)
- ❌ Datei nicht im Projekt-Root
- ❌ App nicht neu gebaut

### Verifizierung
Nach dem Neubauen sollte die App:
1. ✅ Starten ohne Crash
2. ✅ Login-Screen anzeigen
3. ✅ Mit echten Credentials einloggen können
4. ✅ KEINE Firebase-Fehlermeldung mehr zeigen

---

## 📱 Fertig!

Sobald die echten Firebase-Credentials eingetragen und die App neu gebaut ist, funktioniert:
- ✅ Login mit Email/Password
- ✅ Firestore-Zugriff (Projekte, Tasks, etc.)
- ✅ Firebase Storage (Fotos)
- ✅ Alle App-Features

**Viel Erfolg! 🚀**








