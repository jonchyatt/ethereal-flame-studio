# chrome-auto-allow.ps1 — Auto-approve Chrome debugging consent dialogs
#
# 1. Creates Windows Firewall rule for Chrome debug port (prevents the firewall popup)
# 2. Watches for Chrome/Windows consent dialogs and auto-clicks Allow/OK
#
# Usage:
#   powershell -ExecutionPolicy Bypass -WindowStyle Hidden -File chrome-auto-allow.ps1
#   powershell -ExecutionPolicy Bypass -File chrome-auto-allow.ps1 -Port 9222

param(
    [int]$Port = 9222,
    [int]$PollSeconds = 3
)

# ---------------------------------------------------------------------------
# Step 1: Ensure firewall rule exists (prevents the Windows Firewall dialog)
# ---------------------------------------------------------------------------

$ruleName = "Chrome CDP Port $Port"
$existing = netsh advfirewall firewall show rule name="$ruleName" 2>$null

if (-not $existing -or $existing -match 'No rules match') {
    Write-Host "[Auto-Allow] Creating firewall rule for port $Port..."
    netsh advfirewall firewall add rule `
        name="$ruleName" `
        dir=in `
        action=allow `
        protocol=TCP `
        localport=$Port | Out-Null
    Write-Host "[Auto-Allow] Firewall rule created."
} else {
    Write-Host "[Auto-Allow] Firewall rule already exists."
}

# ---------------------------------------------------------------------------
# Step 2: Watch for consent dialogs via UI Automation
# ---------------------------------------------------------------------------

Write-Host "[Auto-Allow] Watching for Chrome consent dialogs (poll every ${PollSeconds}s)..."

Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes

$windowType = [System.Windows.Automation.ControlType]::Window
$buttonType = [System.Windows.Automation.ControlType]::Button

$windowCondition = New-Object System.Windows.Automation.PropertyCondition(
    [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
    $windowType
)
$buttonCondition = New-Object System.Windows.Automation.PropertyCondition(
    [System.Windows.Automation.AutomationElement]::ControlTypeProperty,
    $buttonType
)

# Dialog title patterns to match
$titlePatterns = @(
    'Windows.*Firewall',
    'Security Alert',
    'Chrome.*Debug',
    'DevTools',
    'Allow.*Chrome',
    'Remote Debugging'
)
$titleRegex = ($titlePatterns -join '|')

# Button name patterns to click
$buttonRegex = '^Allow$|Allow access|^OK$|^Yes$|^Accept$'

while ($true) {
    try {
        $root = [System.Windows.Automation.AutomationElement]::RootElement
        $windows = $root.FindAll(
            [System.Windows.Automation.TreeScope]::Children,
            $windowCondition
        )

        foreach ($window in $windows) {
            $title = $window.Current.Name

            if ($title -match $titleRegex) {
                Write-Host "[Auto-Allow] Found dialog: '$title'"

                $buttons = $window.FindAll(
                    [System.Windows.Automation.TreeScope]::Descendants,
                    $buttonCondition
                )

                foreach ($button in $buttons) {
                    $btnName = $button.Current.Name
                    if ($btnName -match $buttonRegex) {
                        try {
                            $invoke = $button.GetCurrentPattern(
                                [System.Windows.Automation.InvokePattern]::Pattern
                            )
                            $invoke.Invoke()
                            Write-Host "[Auto-Allow] Clicked '$btnName' in '$title' at $(Get-Date -Format 'HH:mm:ss')"
                        } catch {
                            Write-Host "[Auto-Allow] Failed to click '$btnName': $_"
                        }
                    }
                }
            }
        }
    } catch {
        # UI Automation throws if elements disappear mid-scan — safe to ignore
    }

    Start-Sleep -Seconds $PollSeconds
}
