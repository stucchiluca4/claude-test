@echo off
setlocal enabledelayedexpansion
title Workout Companion AI - Avvio locale
echo ============================================================
echo   WORKOUT COMPANION AI - Avvio in locale (Windows)
echo ============================================================
echo.

REM --- 1. Controlla che Git e Node.js siano installati ---
where git >nul 2>nul
if errorlevel 1 (
  echo [X] Git non trovato. Scaricalo da: https://git-scm.com/download/win
  echo     Installa con avanti-avanti-fine, poi rilancia questo file.
  pause
  exit /b 1
)
where node >nul 2>nul
if errorlevel 1 (
  echo [X] Node.js non trovato. Scarica la versione LTS da: https://nodejs.org
  echo     Installa con avanti-avanti-fine, poi rilancia questo file.
  pause
  exit /b 1
)
echo [OK] Git e Node.js trovati.

REM --- 2. Scarica o aggiorna il progetto ---
if not exist "%USERPROFILE%\workout-companion-ai-app" (
  echo [..] Scarico il progetto da GitHub ^(potrebbe chiederti il login GitHub^)...
  git clone -b claude/workout-companion-ai-4j9xa8 https://github.com/stucchiluca4/claude-test.git "%USERPROFILE%\workout-companion-ai-app"
  if errorlevel 1 ( echo [X] Download fallito. Controlla la connessione o il login GitHub. & pause & exit /b 1 )
) else (
  echo [..] Aggiorno il progetto all'ultima versione...
  cd /d "%USERPROFILE%\workout-companion-ai-app"
  git pull
)
cd /d "%USERPROFILE%\workout-companion-ai-app\workout-companion-ai"

REM --- 3. Chiedi le chiavi Supabase (solo la prima volta) ---
if not exist "apps\web\.env.local" (
  echo.
  echo   Servono le 2 chiavi di Supabase ^(Project Settings -^> API^):
  set /p SURL="  Incolla il Project URL (https://....supabase.co): "
  set /p SKEY="  Incolla la chiave anon public: "
  (
    echo NEXT_PUBLIC_SUPABASE_URL=!SURL!
    echo NEXT_PUBLIC_SUPABASE_ANON_KEY=!SKEY!
    echo NEXT_PUBLIC_APP_URL=http://localhost:3000
  ) > "apps\web\.env.local"
  echo [OK] Chiavi salvate in apps\web\.env.local
)

REM --- 4. Installa le dipendenze (solo la prima volta e' lento) ---
echo [..] Installo le dipendenze ^(la prima volta serve qualche minuto^)...
call npm install --no-audit --no-fund
if errorlevel 1 ( echo [X] Installazione fallita. & pause & exit /b 1 )

REM --- 5. Avvia e apri il browser ---
echo.
echo [OK] Avvio il sito su http://localhost:3000 ...
echo      Lascia APERTA questa finestra. Per fermare: CTRL+C.
start "" http://localhost:3000
call npm run dev:web
pause
