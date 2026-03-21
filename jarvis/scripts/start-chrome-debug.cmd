@echo off
REM start-chrome-debug.cmd — Chrome MCP Desktop Setup (one-time launcher)
REM
REM Does three things:
REM   1. Starts the auto-allow PS1 watcher (firewall rule + consent dialog handler)
REM   2. Launches Chrome with --remote-debugging-port=9222
REM   3. Warms the chrome-cli daemon
REM
REM Usage: Run once on machine startup, or after Chrome closes.
REM        PM2 keeps the health monitor daemon alive after this.

setlocal
set CHROME_DEBUG_PORT=9222
set SCRIPT_DIR=%~dp0

REM --- Find Chrome ---
set CHROME_PATH=
for %%p in (
    "%ProgramFiles%\Google\Chrome\Application\chrome.exe"
    "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
    "%LocalAppData%\Google\Chrome\Application\chrome.exe"
) do (
    if exist %%~p set CHROME_PATH=%%~p
)

if "%CHROME_PATH%"=="" (
    echo [Chrome MCP] ERROR: Chrome not found. Install Chrome or set CHROME_PATH.
    pause
    exit /b 1
)

echo [Chrome MCP] Using: %CHROME_PATH%

REM --- Step 1: Start auto-allow watcher (background) ---
echo [Chrome MCP] Starting auto-allow watcher...
start /b powershell -ExecutionPolicy Bypass -WindowStyle Hidden -File "%SCRIPT_DIR%chrome-auto-allow.ps1" -Port %CHROME_DEBUG_PORT%

REM --- Step 2: Launch Chrome with remote debugging ---
REM Check if port is already responding
powershell -Command "try { $null = Invoke-WebRequest -Uri 'http://localhost:%CHROME_DEBUG_PORT%/json/version' -TimeoutSec 2 -ErrorAction Stop; Write-Host 'UP' } catch { Write-Host 'DOWN' }" > "%TEMP%\_chrome_check.txt" 2>nul
set /p CHROME_STATUS=<"%TEMP%\_chrome_check.txt"
del "%TEMP%\_chrome_check.txt" 2>nul

if "%CHROME_STATUS%"=="UP" (
    echo [Chrome MCP] Chrome already listening on port %CHROME_DEBUG_PORT% — skipping launch.
) else (
    REM Check if Chrome is running WITHOUT the debug port
    tasklist /FI "IMAGENAME eq chrome.exe" 2>nul | find /i "chrome.exe" >nul
    if not errorlevel 1 (
        echo [Chrome MCP] WARNING: Chrome is running but NOT on debug port %CHROME_DEBUG_PORT%.
        echo              Close all Chrome windows first, or this launch may be ignored.
        echo              Attempting launch anyway...
    )

    echo [Chrome MCP] Launching Chrome with --remote-debugging-port=%CHROME_DEBUG_PORT%...
    start "" "%CHROME_PATH%" ^
        --remote-debugging-port=%CHROME_DEBUG_PORT% ^
        --remote-allow-origins=* ^
        --restore-last-session ^
        --disable-background-timer-throttling ^
        --disable-backgrounding-occluded-windows ^
        --disable-renderer-backgrounding

    echo [Chrome MCP] Waiting for Chrome to initialize...
    timeout /t 4 /nobreak >nul
)

REM --- Step 3: Warm the daemon ---
echo [Chrome MCP] Warming daemon...
powershell -ExecutionPolicy Bypass -File "%SCRIPT_DIR%warm-chrome-daemon.ps1" -Port %CHROME_DEBUG_PORT%

echo.
echo  =============================================
echo   Chrome MCP Desktop Setup Complete
echo  =============================================
echo.
echo   Chrome CDP:    http://localhost:%CHROME_DEBUG_PORT%
echo   Auto-allow:    Running (background)
echo   Health daemon: jarvis-chrome via PM2
echo.
echo   Next: pm2 start jarvis/ecosystem.config.js
echo.
