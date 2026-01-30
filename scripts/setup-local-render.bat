@echo off
REM ============================================================================
REM Ethereal Flame Studio - Local Render Setup
REM One-command setup for local rendering with Docker
REM ============================================================================

echo.
echo ========================================
echo  Ethereal Flame Studio - Local Setup
echo ========================================
echo.

cd /d "%~dp0\.."

REM Check Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not running. Please start Docker Desktop first.
    pause
    exit /b 1
)
echo [OK] Docker is running

REM Check if Redis is already running
docker ps --filter "name=ethereal-redis" --format "{{.Names}}" | findstr /i "ethereal-redis" >nul
if errorlevel 1 (
    echo [INFO] Starting Redis...
    docker-compose up -d redis
) else (
    echo [OK] Redis already running
)

REM Create required directories
echo [INFO] Creating directories...
if not exist "jobs" mkdir jobs
if not exist "output" mkdir output
if not exist "data" mkdir data
if not exist "data\audio" mkdir data\audio
echo [OK] Directories created

REM Create .env file if it doesn't exist
if not exist ".env" (
    echo [INFO] Creating .env from template...
    copy ".env.example" ".env" >nul 2>&1
    if errorlevel 1 (
        echo [WARN] No .env.example found, creating minimal .env
        (
            echo # Ethereal Flame Studio Environment
            echo NODE_ENV=development
            echo.
            echo # Redis ^(for job queue^)
            echo REDIS_HOST=localhost
            echo REDIS_PORT=6379
            echo.
            echo # Output directories
            echo JOBS_DIR=./jobs
            echo OUTPUT_DIR=./output
            echo RENDER_OUTPUT_DIR=./output
            echo.
            echo # Optional: Whisper service
            echo WHISPER_SERVICE_URL=http://localhost:8001
            echo.
            echo # Optional: n8n webhook
            echo N8N_WEBHOOK_RENDER_URL=
            echo N8N_WEBHOOK_SECRET=
            echo.
            echo # Optional: Google Drive ^(configure rclone first^)
            echo GDRIVE_REMOTE=gdrive
            echo GDRIVE_OUTPUT_FOLDER=EtherealFlame/Renders
        ) > ".env"
    )
    echo [OK] .env created - edit with your settings
) else (
    echo [OK] .env exists
)

REM Check if FFmpeg is available
where ffmpeg >nul 2>&1
if errorlevel 1 (
    echo.
    echo [WARN] FFmpeg not found in PATH
    echo        Install FFmpeg: https://ffmpeg.org/download.html
    echo        Or use: winget install FFmpeg
    echo.
) else (
    echo [OK] FFmpeg found
)

REM Check if rclone is available
where rclone >nul 2>&1
if errorlevel 1 (
    echo.
    echo [INFO] rclone not found - Google Drive upload will be disabled
    echo        Install rclone: https://rclone.org/downloads/
    echo        Or use: winget install Rclone.Rclone
    echo.
) else (
    echo [OK] rclone found
    REM Check if gdrive remote is configured
    rclone listremotes | findstr /i "gdrive:" >nul
    if errorlevel 1 (
        echo [INFO] rclone gdrive remote not configured
        echo        Run: rclone config
        echo        Add a remote named "gdrive" for Google Drive
    ) else (
        echo [OK] rclone gdrive remote configured
    )
)

REM Install npm dependencies if needed
if not exist "node_modules" (
    echo [INFO] Installing npm dependencies...
    call npm install
) else (
    echo [OK] npm dependencies installed
)

echo.
echo ========================================
echo  Setup Complete!
echo ========================================
echo.
echo Next steps:
echo.
echo 1. Start the dev server:
echo    npm run dev
echo.
echo 2. Start the render worker (in another terminal):
echo    npm run worker
echo.
echo 3. Open http://localhost:3000 in your browser
echo.
echo Optional:
echo - Install FFmpeg for video encoding
echo - Install rclone and run "rclone config" for Google Drive
echo.

pause
