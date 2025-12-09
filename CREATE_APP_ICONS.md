# App-Icon Erstellung für TradeTrackr

## Logo-Datei
Das neue Logo befindet sich unter:
- `assets/tradetrackr_logo_blue_toolbox.gif`
- `public/tradetrackr_logo_blue_toolbox.gif`

## Android App-Icons erstellen

Android benötigt PNG-Icons in verschiedenen Größen. Das GIF muss zu PNG konvertiert werden.

### Option 1: Online Tool verwenden
1. Gehen Sie zu https://www.appicon.co/ oder https://icon.kitchen/
2. Laden Sie `assets/tradetrackr_logo_blue_toolbox.gif` hoch
3. Wählen Sie "Android" aus
4. Laden Sie die generierten Icons herunter
5. Kopieren Sie die Icons in die entsprechenden `mipmap-*` Ordner:
   - `android/app/src/main/res/mipmap-mdpi/ic_launcher.png` (48x48)
   - `android/app/src/main/res/mipmap-hdpi/ic_launcher.png` (72x72)
   - `android/app/src/main/res/mipmap-xhdpi/ic_launcher.png` (96x96)
   - `android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png` (144x144)
   - `android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png` (192x192)
   - Gleiche Größen für `ic_launcher_round.png`

### Option 2: ImageMagick verwenden (falls installiert)
```powershell
# Konvertiere GIF zu PNG (erstes Frame)
magick "assets\tradetrackr_logo_blue_toolbox.gif[0]" -resize 192x192 "android\app\src\main\res\mipmap-xxxhdpi\ic_launcher.png"
magick "assets\tradetrackr_logo_blue_toolbox.gif[0]" -resize 144x144 "android\app\src\main\res\mipmap-xxhdpi\ic_launcher.png"
magick "assets\tradetrackr_logo_blue_toolbox.gif[0]" -resize 96x96 "android\app\src\main\res\mipmap-xhdpi\ic_launcher.png"
magick "assets\tradetrackr_logo_blue_toolbox.gif[0]" -resize 72x72 "android\app\src\main\res\mipmap-hdpi\ic_launcher.png"
magick "assets\tradetrackr_logo_blue_toolbox.gif[0]" -resize 48x48 "android\app\src\main\res\mipmap-mdpi\ic_launcher.png"

# Runde Icons (gleiche Größen)
magick "assets\tradetrackr_logo_blue_toolbox.gif[0]" -resize 192x192 -background none -gravity center -extent 192x192 -alpha set -channel A -evaluate multiply 0.0 +channel -draw "circle 96,96 96,0" -alpha off -compose CopyOpacity -composite "android\app\src\main\res\mipmap-xxxhdpi\ic_launcher_round.png"
```

### Option 3: Expo Icon Generator (empfohlen)
```bash
npx expo install @expo/image-utils
npx expo prebuild --clean
```

Dann in `app.json` hinzufügen:
```json
{
  "expo": {
    "icon": "./assets/tradetrackr_logo_blue_toolbox.gif"
  }
}
```

## Webportal Favicon

Das Favicon wird automatisch aus `/tradetrackr_logo_blue_toolbox.gif` geladen (bereits in `index.html` konfiguriert).

## Status

✅ Logo-Dateien kopiert:
- `assets/tradetrackr_logo_blue_toolbox.gif` (für Mobile App)
- `public/tradetrackr_logo_blue_toolbox.gif` (für Webportal)

✅ Alle Code-Verwendungen aktualisiert:
- LoginScreen.tsx
- LandingPage.tsx
- LoginForm.tsx
- RegisterForm.tsx
- DesktopSidebar.tsx
- index.html (Favicon)

⏳ Noch zu tun:
- Android App-Icons erstellen (siehe oben)
- Optional: iOS App-Icons erstellen (falls iOS unterstützt wird)






