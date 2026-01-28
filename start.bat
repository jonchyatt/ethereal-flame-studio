@echo off
REM ============================================================================
REM start.bat - Ethereal Flame Studio Quick Start
REM
REM Starts the development server for local preview.
REM Also starts Docker services if Docker Desktop is running.
REM
REM Access at: http://localhost:3000
REM ============================================================================
echo Starting Ethereal Flame Studio...
echo.

REM Start Docker services
docker-compose up -d 2>nul
if errorlevel 1 (
    echo Docker not running. Starting dev server only...
) else (
    echo Docker services started.
)

echo.
echo Starting development server...
echo.
echo Access at: http://localhost:3000
echo.
npm run dev
