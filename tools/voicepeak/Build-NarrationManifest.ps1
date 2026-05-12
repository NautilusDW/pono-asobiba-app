#Requires -Version 5.1
<#
.SYNOPSIS
    Generate / refresh assets/tts/manifest.json entries for placed Quizland WAV files.

.DESCRIPTION
    Wraps tools/voicepeak/_build_narration_manifest.py.

    Scans assets/tts/quiz/ for q###_*.wav files, derives category and idx for
    each Q### number from docs/quizland-voicevox-order/ORDER-FULL.md, and
    upserts entries into assets/tts/manifest.json keyed as
    "quizland:<category>:<idx>:<slot>" with file path "quiz/q###_<slot>.wav".

    Idempotent: existing entries are preserved (never overwritten); duplicate
    keys produce warnings only.

    kurumi_dai{1-5}mon.wav files are intentionally NOT registered in the
    Narration manifest (they are played via SE_PATHS in quizland/index.html);
    if such files exist under assets/tts/quiz/ they are skipped with a notice.

.PARAMETER Manifest
    Path to manifest.json. Default: assets/tts/manifest.json.

.PARAMETER QuizDir
    Path to wav directory. Default: assets/tts/quiz/.

.PARAMETER DryRun
    Do not write manifest.json; show what would change.

.PARAMETER Verbose
    Forwarded to the Python helper for verbose logging.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File tools\voicepeak\Build-NarrationManifest.ps1

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File tools\voicepeak\Build-NarrationManifest.ps1 -DryRun -Verbose

.NOTES
    ASCII-only source for Windows PowerShell 5.1 compatibility.
    Author: pono-asobiba-app voicepeak tooling
#>
[CmdletBinding()]
param(
    [string]$Manifest,
    [string]$QuizDir,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

# Resolve repo root from script location: <root>/tools/voicepeak/Build-NarrationManifest.ps1
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot  = (Resolve-Path (Join-Path $ScriptDir "..\..")).Path

if (-not $Manifest) {
    $Manifest = Join-Path $RepoRoot "assets\tts\manifest.json"
}
if (-not $QuizDir) {
    $QuizDir = Join-Path $RepoRoot "assets\tts\quiz"
}

$PyScript = Join-Path $ScriptDir "_build_narration_manifest.py"
if (-not (Test-Path -LiteralPath $PyScript)) {
    throw "Python helper not found: $PyScript"
}

# Locate python (py launcher first, then python). Both common on Windows.
$PythonExe = $null
foreach ($cand in @("py", "python")) {
    $cmd = Get-Command $cand -ErrorAction SilentlyContinue
    if ($cmd) {
        $PythonExe = $cmd.Source
        if ($cand -eq "py") { $PythonArgs = @("-3") } else { $PythonArgs = @() }
        break
    }
}
if (-not $PythonExe) {
    throw "Python interpreter not found (need 'py' or 'python' on PATH)."
}

$argList = @($PythonArgs + @($PyScript, "--manifest", $Manifest, "--quiz-dir", $QuizDir))
if ($DryRun) { $argList += "--dry-run" }
if ($VerbosePreference -eq "Continue") { $argList += "--verbose" }

Write-Host "[Build-NarrationManifest] python helper: $PyScript"
Write-Host "[Build-NarrationManifest] manifest     : $Manifest"
Write-Host "[Build-NarrationManifest] quiz dir     : $QuizDir"
if ($DryRun) { Write-Host "[Build-NarrationManifest] dry-run mode (no writes)" }

& $PythonExe @argList
$exit = $LASTEXITCODE
if ($exit -ne 0) {
    throw "Python helper exited with code $exit"
}
Write-Host "[Build-NarrationManifest] done."
