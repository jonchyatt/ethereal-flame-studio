@echo off
REM ============================================================================
REM deploy.bat - Ethereal Flame Studio Deployment Script
REM
REM Interactive menu for deploying the application:
REM   1. Vercel (production web UI)
REM   2. Docker (local rendering stack)
REM   3. Docker + Cloudflare Tunnel (remote access)
REM   4. Docker + Cloudflare + n8n (full automation)
REM   5. Stop all services
REM
REM Prerequisites:
REM   - Node.js and npm installed
REM   - Vercel CLI: npm install -g vercel
REM   - Docker Desktop (for options 2-4)
REM
REM Usage: Double-click or run from command prompt
REM ============================================================================
setlocal enabledelayedexpansion

echo ========================================
echo   Ethereal Flame Studio - Deployment
echo ========================================
echo.

:menu
echo What would you like to deploy?
echo.
echo   1. Web UI only (Vercel production)
echo   2. Full local stack (Docker services)
echo   3. Full stack + Remote access (Cloudflare)
echo   4. Everything (Full + Remote + n8n automation)
echo   5. Stop all services
echo   6. Exit
echo.
set /p choice="Enter choice (1-6): "

if "%choice%"=="1" goto vercel
if "%choice%"=="2" goto docker_basic
if "%choice%"=="3" goto docker_remote
if "%choice%"=="4" goto docker_all
if "%choice%"=="5" goto stop
if "%choice%"=="6" goto end

echo Invalid choice. Try again.
goto menu

:vercel
echo.
echo Deploying to Vercel production...
echo.
call vercel --prod
if errorlevel 1 (
    echo.
    echo ERROR: Vercel deployment failed. Make sure you're logged in: vercel login
) else (
    echo.
    echo SUCCESS: Web UI deployed to production!
)
echo.
pause
goto menu

:docker_basic
echo.
echo Starting Docker services (Redis, Render Worker, Whisper)...
echo.

REM Check if .env exists
if not exist .env (
    echo Creating .env from template...
    if exist .env.example (
        copy .env.example .env
        echo.
        echo IMPORTANT: Edit .env file with your settings before continuing!
        echo Opening .env in notepad...
        notepad .env
        pause
    ) else (
        echo Creating default .env...
        (
            echo REDIS_PASSWORD=ethereal-flame-2024
            echo NTFY_TOPIC=ethereal-flame-notifications
            echo GOOGLE_SHEETS_ID=
        ) > .env
    )
)

docker-compose up -d
if errorlevel 1 (
    echo.
    echo ERROR: Docker failed. Is Docker Desktop running?
) else (
    echo.
    echo SUCCESS: Services started!
    echo   - Redis: localhost:6379
    echo   - App: http://localhost:3000
    echo   - Batch UI: http://localhost:3000/batch
)
echo.
pause
goto menu

:docker_remote
echo.
echo Starting Docker services with Remote Access...
echo.

REM Check for Cloudflare token
findstr /C:"CLOUDFLARE_TUNNEL_TOKEN=" .env >nul 2>&1
if errorlevel 1 (
    echo.
    echo Cloudflare Tunnel token not found in .env
    echo.
    echo To get a token:
    echo   1. Go to https://one.dash.cloudflare.com
    echo   2. Create a tunnel
    echo   3. Copy the token
    echo.
    set /p cf_token="Enter your Cloudflare Tunnel token (or press Enter to skip): "
    if not "!cf_token!"=="" (
        echo CLOUDFLARE_TUNNEL_TOKEN=!cf_token!>> .env
    )
)

docker-compose --profile remote up -d
if errorlevel 1 (
    echo.
    echo ERROR: Docker failed. Is Docker Desktop running?
) else (
    echo.
    echo SUCCESS: Services started with remote access!
    echo   - Local: http://localhost:3000
    echo   - Remote: Check Cloudflare dashboard for URL
)
echo.
pause
goto menu

:docker_all
echo.
echo Starting ALL services (Full + Remote + n8n)...
echo.

REM Check .env exists
if not exist .env (
    echo Creating .env from template...
    copy .env.example .env 2>nul || (
        (
            echo REDIS_PASSWORD=ethereal-flame-2024
            echo NTFY_TOPIC=ethereal-flame-notifications
            echo CLOUDFLARE_TUNNEL_TOKEN=
            echo GOOGLE_SHEETS_ID=
        ) > .env
    )
    echo.
    echo IMPORTANT: Edit .env with your settings!
    notepad .env
    pause
)

docker-compose --profile remote --profile automation up -d
if errorlevel 1 (
    echo.
    echo ERROR: Docker failed. Is Docker Desktop running?
) else (
    echo.
    echo SUCCESS: All services started!
    echo   - App: http://localhost:3000
    echo   - Batch UI: http://localhost:3000/batch
    echo   - n8n: http://localhost:5678
    echo   - Remote: Check Cloudflare dashboard
    echo.
    echo Next: Configure n8n at http://localhost:5678
    echo See docs/N8N_SETUP.md for YouTube OAuth setup
)
echo.
pause
goto menu

:stop
echo.
echo Stopping all Docker services...
echo.
docker-compose --profile remote --profile automation down
echo.
echo All services stopped.
echo.
pause
goto menu

:end
echo.
echo Goodbye!
exit /b 0
