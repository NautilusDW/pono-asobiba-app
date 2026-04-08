# install_shortcut.ps1
# Creates a desktop shortcut for Clean Edges Studio.
#
# Usage:
#   Right-click -> "Run with PowerShell"
#   OR
#   powershell -ExecutionPolicy Bypass -File install_shortcut.ps1
#
# Re-run after moving the project to a different folder.

$ErrorActionPreference = "Stop"

# This script lives in scripts/Photoshop_script/
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Resolve-Path (Join-Path $scriptDir "..\..")
$guiScript = Join-Path $scriptDir "clean_edges_gui.py"

if (-not (Test-Path $guiScript)) {
    Write-Error "GUI script not found: $guiScript"
    exit 1
}

# Find pythonw.exe (no console window)
$pythonExe = $null
try {
    $pythonExe = (Get-Command pythonw.exe -ErrorAction Stop).Source
} catch {
    try {
        $pyPath = (Get-Command python.exe -ErrorAction Stop).Source
        $candidate = Join-Path (Split-Path $pyPath) "pythonw.exe"
        if (Test-Path $candidate) {
            $pythonExe = $candidate
        }
    } catch {
        # ignore
    }
}

if (-not $pythonExe) {
    Write-Error "pythonw.exe not found. Make sure Python is installed and on PATH."
    exit 1
}

Write-Host "Python: $pythonExe"
Write-Host "GUI:    $guiScript"
Write-Host "Root:   $($projectRoot.Path)"

# Resolve desktop (OneDrive-aware)
$desktop = [Environment]::GetFolderPath('Desktop')
$shortcutPath = Join-Path $desktop "Clean Edges Studio.lnk"

# Create .lnk via WScript.Shell COM
$wshShell = New-Object -ComObject WScript.Shell
$shortcut = $wshShell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $pythonExe
$shortcut.Arguments = "`"$guiScript`""
$shortcut.WorkingDirectory = $projectRoot.Path
$shortcut.WindowStyle = 1
$shortcut.IconLocation = "$pythonExe,0"
$shortcut.Description = "Clean Edges Studio - background removal, sprite split, AI naming"
$shortcut.Save()

Write-Host ""
Write-Host "Created: $shortcutPath" -ForegroundColor Green
Write-Host ""
Write-Host "Double-click 'Clean Edges Studio' on your desktop to launch."
