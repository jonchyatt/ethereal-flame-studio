@echo off
REM ============================================================
REM Jarvis Local Startup — One-Click Launch
REM
REM Prerequisites:
REM   - Node.js installed
REM   - PM2 installed globally: npm install -g pm2
REM   - Cloudflare Tunnel configured (optional)
REM   - .env configured in project root
REM
REM Usage: Double-click this file or run from terminal
REM ============================================================

echo.
echo  ========================================
echo   Starting Jarvis Local Deployment
echo  ========================================
echo.

cd /d "%~dp0\.."
cd ..

REM Check PM2 is installed
where pm2 >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] PM2 not found. Install with: npm install -g pm2
    pause
    exit /b 1
)

REM Build Next.js if dist doesn't exist
if not exist ".next" (
    echo [BUILD] Building Next.js app...
    call npm run build
    if %errorlevel% neq 0 (
        echo [ERROR] Build failed
        pause
        exit /b 1
    )
)

REM Start PM2 processes
echo [START] Starting PM2 processes...
pm2 start jarvis/ecosystem.config.js

echo.
echo  ========================================
echo   Jarvis is running!
echo  ========================================
echo.
echo   Web UI:  http://localhost:3001
echo   Logs:    pm2 logs
echo   Stop:    pm2 stop all
echo   Status:  pm2 status
echo.

REM Optional: Start Cloudflare Tunnel
REM Uncomment and configure your tunnel name:
REM echo [TUNNEL] Starting Cloudflare Tunnel...
REM cloudflared tunnel run jarvis

pause
