# claude-code-statusline installer (Windows)
# Usage: powershell -ExecutionPolicy Bypass -File install.ps1

$ErrorActionPreference = "Stop"

$settingsDir = "$env:USERPROFILE\.claude"
$settingsFile = "$settingsDir\settings.json"
$sourceDir = $PSScriptRoot
$defaultDest = $settingsDir

# Check Node.js
try {
    $nodeVersion = node -v
    Write-Host "Node.js $nodeVersion detected."
} catch {
    Write-Host "Error: Node.js is required but not installed." -ForegroundColor Red
    Write-Host "Install it from https://nodejs.org/"
    exit 1
}

# Ask where to install the script
Write-Host ""
Write-Host "Where should statusline.js be installed?"
$destDir = Read-Host "Path [$defaultDest]"
if ([string]::IsNullOrWhiteSpace($destDir)) {
    $destDir = $defaultDest
}

# Create destination dir if needed
if (-not (Test-Path $destDir)) {
    New-Item -ItemType Directory -Path $destDir | Out-Null
}

# Copy script
Copy-Item (Join-Path $sourceDir "statusline.js") (Join-Path $destDir "statusline.js")
$scriptPath = (Join-Path $destDir "statusline.js") -replace '\\', '/'
Write-Host "Installed statusline.js to $scriptPath"

# Create .claude dir if needed
if (-not (Test-Path $settingsDir)) {
    New-Item -ItemType Directory -Path $settingsDir | Out-Null
}

# Backup existing settings
if (Test-Path $settingsFile) {
    Copy-Item $settingsFile "$settingsFile.bak"
    Write-Host "Backed up existing settings to $settingsFile.bak"
}

# Read or create settings
$settings = @{}
if ((Test-Path $settingsFile) -and ((Get-Item $settingsFile).Length -gt 0)) {
    $settings = Get-Content $settingsFile -Raw | ConvertFrom-Json -AsHashtable

    # Check if statusLine already configured
    if ($settings.ContainsKey("statusLine")) {
        Write-Host ""
        Write-Host "Warning: statusLine is already configured in $settingsFile" -ForegroundColor Yellow
        Write-Host "Current command: $($settings.statusLine.command)"
        Write-Host ""
        $reply = Read-Host "Overwrite? (y/N)"
        if ($reply -ne "y" -and $reply -ne "Y") {
            Write-Host "Aborted. No changes made."
            exit 0
        }
    }
}

# Update settings
$settings["statusLine"] = @{
    type = "command"
    command = "node $scriptPath"
    padding = 0
}

$settings | ConvertTo-Json -Depth 10 | Set-Content $settingsFile -Encoding UTF8

Write-Host ""
Write-Host "Done! statusLine configured in $settingsFile" -ForegroundColor Green
Write-Host "Script: $scriptPath"
Write-Host ""
Write-Host "Restart Claude Code to see the statusline."
