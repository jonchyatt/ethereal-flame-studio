@echo off
REM ============================================================================
REM setup.bat - Ethereal Flame Studio First-Time Setup
REM
REM This script:
REM   1. Checks all required tools (Node.js, npm, Vercel CLI)
REM   2. Checks optional tools (Docker, Git)
REM   3. Installs npm dependencies if needed
REM   4. Creates .env from .env.example if needed
REM
REM Run this FIRST before deploy.bat or start.bat
REM ============================================================================
echo ========================================
echo   Ethereal Flame Studio - Setup Check
echo ========================================
echo.

set ERRORS=0

REM Check Node.js
echo Checking Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo   [X] Node.js NOT FOUND - Install from https://nodejs.org
    set ERRORS=1
) else (
    for /f "tokens=*" %%i in ('node --version') do echo   [OK] Node.js %%i
)

REM Check npm
echo Checking npm...
npm --version >nul 2>&1
if errorlevel 1 (
    echo   [X] npm NOT FOUND
    set ERRORS=1
) else (
    for /f "tokens=*" %%i in ('npm --version') do echo   [OK] npm %%i
)

REM Check Vercel CLI
echo Checking Vercel CLI...
vercel --version >nul 2>&1
if errorlevel 1 (
    echo   [X] Vercel CLI NOT FOUND - Run: npm install -g vercel
    set ERRORS=1
) else (
    for /f "tokens=*" %%i in ('vercel --version') do echo   [OK] Vercel %%i
)

REM Check Docker
echo Checking Docker...
docker --version >nul 2>&1
if errorlevel 1 (
    echo   [!] Docker NOT FOUND - Optional, needed for batch rendering
    echo       Install from https://docker.com
) else (
    for /f "tokens=*" %%i in ('docker --version') do echo   [OK] %%i
)

REM Check Docker running
docker info >nul 2>&1
if errorlevel 1 (
    echo   [!] Docker Desktop is not running
) else (
    echo   [OK] Docker Desktop is running
)

REM Check Git
echo Checking Git...
git --version >nul 2>&1
if errorlevel 1 (
    echo   [!] Git NOT FOUND - Optional but recommended
) else (
    for /f "tokens=*" %%i in ('git --version') do echo   [OK] %%i
)

echo.
echo ----------------------------------------

REM Check if node_modules exists
if not exist node_modules (
    echo.
    echo Installing dependencies...
    npm install
)

REM Check/create .env
if not exist .env (
    echo.
    echo Creating .env from template...
    copy .env.example .env
    echo.
    echo IMPORTANT: Edit .env with your settings before running!
)

echo.
if %ERRORS%==1 (
    echo [!] Some required tools are missing. Install them and run setup.bat again.
) else (
    echo [OK] All required tools installed!
    echo.
    echo Ready to go! Run one of:
    echo   - start.bat     : Start local development
    echo   - deploy.bat    : Deploy menu (Vercel/Docker options)
)
echo.
pause
