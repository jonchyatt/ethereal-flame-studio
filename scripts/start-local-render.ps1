# Ethereal Flame Studio - Local Render Setup Script
# Run this script to start all services needed for local rendering with Cloudflare Tunnel

$ErrorActionPreference = "Stop"
$ProjectDir = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $ProjectDir

Write-Host "=== Ethereal Flame Studio - Local Render Setup ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check Docker
Write-Host "[1/5] Checking Docker..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version 2>&1
    if ($LASTEXITCODE -ne 0) { throw "Docker not responding" }
    Write-Host "  Docker OK: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "  ERROR: Docker not available. Please start Docker Desktop first." -ForegroundColor Red
    Write-Host "  Press any key to exit..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

# Step 2: Start Redis
Write-Host "[2/5] Starting Redis..." -ForegroundColor Yellow
$redisRunning = docker ps --filter "name=ethereal-redis" --format "{{.Names}}" 2>&1
if ($redisRunning -eq "ethereal-redis") {
    Write-Host "  Redis already running" -ForegroundColor Green
} else {
    # Try to start existing container or create new one
    $result = docker start ethereal-redis 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  Creating new Redis container..." -ForegroundColor Gray
        docker run -d --name ethereal-redis -p 6379:6379 redis:7-alpine 2>&1 | Out-Null
    }
    Write-Host "  Redis started on port 6379" -ForegroundColor Green
}

# Step 3: Verify Redis connection
Write-Host "[3/5] Verifying Redis connection..." -ForegroundColor Yellow
Start-Sleep -Seconds 2
$redisPing = docker exec ethereal-redis redis-cli ping 2>&1
if ($redisPing -eq "PONG") {
    Write-Host "  Redis responding: PONG" -ForegroundColor Green
} else {
    Write-Host "  WARNING: Redis may not be ready yet" -ForegroundColor Yellow
}

# Step 4: Check for Cloudflare Tunnel Token
Write-Host "[4/5] Checking Cloudflare Tunnel..." -ForegroundColor Yellow
$envFile = Join-Path $ProjectDir ".env"
$hasTunnelToken = $false
if (Test-Path $envFile) {
    $envContent = Get-Content $envFile -Raw
    if ($envContent -match "CLOUDFLARE_TUNNEL_TOKEN=.+") {
        $hasTunnelToken = $true
    }
}

if (-not $hasTunnelToken) {
    Write-Host ""
    Write-Host "  Cloudflare Tunnel token not configured." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  To set up the tunnel:" -ForegroundColor Cyan
    Write-Host "  1. Go to: https://one.dash.cloudflare.com/ -> Zero Trust -> Networks -> Tunnels"
    Write-Host "  2. Create a new tunnel named 'ethereal-flame-local'"
    Write-Host "  3. Select 'Docker' as connector type"
    Write-Host "  4. Copy the tunnel token"
    Write-Host "  5. Add to .env: CLOUDFLARE_TUNNEL_TOKEN=<your-token>"
    Write-Host ""
    Write-Host "  Configure tunnel routes in Cloudflare dashboard:"
    Write-Host "    - render.whatamiappreciatingnow.com -> http://host.docker.internal:3000"
    Write-Host ""

    $response = Read-Host "Do you want to start without the tunnel? (y/n)"
    if ($response -ne "y") {
        exit 0
    }
} else {
    Write-Host "  Cloudflare Tunnel token found" -ForegroundColor Green
    Write-Host "  Starting cloudflared container..." -ForegroundColor Gray

    # Read token from .env
    $token = ($envContent | Select-String -Pattern "CLOUDFLARE_TUNNEL_TOKEN=(.+)" | ForEach-Object { $_.Matches.Groups[1].Value }).Trim()

    # Stop existing if running
    docker stop ethereal-cloudflared 2>$null | Out-Null
    docker rm ethereal-cloudflared 2>$null | Out-Null

    # Start cloudflared
    docker run -d --name ethereal-cloudflared `
        -e TUNNEL_TOKEN=$token `
        --add-host=host.docker.internal:host-gateway `
        cloudflare/cloudflared:latest tunnel run 2>&1 | Out-Null

    if ($LASTEXITCODE -eq 0) {
        Write-Host "  Cloudflared started" -ForegroundColor Green
    } else {
        Write-Host "  WARNING: Failed to start cloudflared" -ForegroundColor Yellow
    }
}

# Step 5: Start Next.js dev server
Write-Host "[5/5] Starting Next.js dev server..." -ForegroundColor Yellow

# Check if already running on port 3000
$port3000 = netstat -ano | Select-String ":3000.*LISTENING"
if ($port3000) {
    Write-Host "  Dev server already running on port 3000" -ForegroundColor Green
} else {
    Write-Host "  Starting npm run dev in new window..." -ForegroundColor Gray
    Start-Process -FilePath "cmd" -ArgumentList "/k npm run dev" -WorkingDirectory $ProjectDir
    Write-Host "  Dev server starting..." -ForegroundColor Green
}

Write-Host ""
Write-Host "=== Setup Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Services running:" -ForegroundColor White
Write-Host "  - Redis:        localhost:6379" -ForegroundColor Gray
Write-Host "  - Next.js:      http://localhost:3000" -ForegroundColor Gray
if ($hasTunnelToken) {
    Write-Host "  - Tunnel:       https://render.whatamiappreciatingnow.com -> localhost:3000" -ForegroundColor Gray
}
Write-Host ""
Write-Host "To test locally: http://localhost:3000" -ForegroundColor Green
Write-Host ""
