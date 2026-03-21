# warm-chrome-daemon.ps1 — Verify Chrome CDP is responding, then ensure jarvis-chrome PM2 process is live
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File warm-chrome-daemon.ps1

param(
    [int]$Port = 9222,
    [int]$MaxWaitSeconds = 30
)

Write-Host "[Warm] Waiting for Chrome on port $Port..."

$ready = $false
$elapsed = 0

while (-not $ready -and $elapsed -lt $MaxWaitSeconds) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:$Port/json/version" -TimeoutSec 3 -ErrorAction Stop
        $version = ($response.Content | ConvertFrom-Json).Browser
        Write-Host "[Warm] Chrome responding: $version"
        $ready = $true
    } catch {
        Write-Host "[Warm] Waiting... ($elapsed/$MaxWaitSeconds s)"
        Start-Sleep -Seconds 2
        $elapsed += 2
    }
}

if (-not $ready) {
    Write-Host "[ERROR] Chrome not responding on port $Port after $MaxWaitSeconds seconds."
    Write-Host "        Is Chrome running with --remote-debugging-port=$Port?"
    exit 1
}

# Check PM2 jarvis-chrome process
Write-Host "[Warm] Checking jarvis-chrome in PM2..."

try {
    $pm2Json = pm2 jlist 2>$null
    $processes = $pm2Json | ConvertFrom-Json -ErrorAction SilentlyContinue
    $chromeProc = $processes | Where-Object { $_.name -eq 'jarvis-chrome' }

    if ($chromeProc) {
        $status = $chromeProc.pm2_env.status
        if ($status -eq 'online') {
            Write-Host "[Warm] jarvis-chrome is online — restarting for fresh CDP connection..."
            pm2 restart jarvis-chrome 2>$null | Out-Null
        } else {
            Write-Host "[Warm] jarvis-chrome exists ($status) — starting..."
            pm2 start jarvis-chrome 2>$null | Out-Null
        }
    } else {
        Write-Host "[Warm] jarvis-chrome not registered in PM2. Run: pm2 start jarvis/ecosystem.config.js"
    }
} catch {
    Write-Host "[Warm] PM2 not available or no processes — jarvis-chrome will start with ecosystem.config.js"
}

Write-Host "[Warm] Done. Chrome daemon is warm."
