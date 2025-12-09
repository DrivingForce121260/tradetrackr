@echo off
REM TradeTrackr Email Duplicate Cleanup
REM Dieses Script bereinigt doppelte E-Mails aus Firestore

echo.
echo ============================================
echo  TradeTrackr Email Duplicate Cleanup
echo ============================================
echo.

REM Check if admin credentials are set
if "%ADMIN_EMAIL%"=="" (
    echo Fehler: ADMIN_EMAIL nicht gesetzt
    echo.
    echo Bitte setzen Sie die Admin-Zugangsdaten:
    echo   set ADMIN_EMAIL=admin@beispiel.de
    echo   set ADMIN_PASSWORD=IhrPasswort
    echo   run-cleanup.bat
    echo.
    pause
    exit /b 1
)

if "%ADMIN_PASSWORD%"=="" (
    echo Fehler: ADMIN_PASSWORD nicht gesetzt
    echo.
    echo Bitte setzen Sie die Admin-Zugangsdaten:
    echo   set ADMIN_EMAIL=admin@beispiel.de
    echo   set ADMIN_PASSWORD=IhrPasswort
    echo   run-cleanup.bat
    echo.
    pause
    exit /b 1
)

echo Admin-Email: %ADMIN_EMAIL%
echo.
echo Starte Cleanup...
echo.

node cleanup-email-duplicates.js

echo.
pause








