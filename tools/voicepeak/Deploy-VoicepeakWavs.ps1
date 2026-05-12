#Requires -Version 5.1
<#
.SYNOPSIS
    Copy expanded VOICEPEAK q###_*.wav files into assets/tts/quiz/ and refresh
    assets/tts/manifest.json entries.

.DESCRIPTION
    1) Copies every q###_*.wav (and q###_*_alt.wav) under -InputDir to
       assets/tts/quiz/ (overwrite is the default since a re-deploy after
       audition fixes is the expected case).
    2) Invokes Build-NarrationManifest.ps1 to add corresponding entries to
       assets/tts/manifest.json (idempotent, existing entries preserved).

    Files NOT matching q###_<slot>.wav (e.g. kurumi_dai*mon.wav) are skipped
    by default; pass -IncludeNonQuestion to copy them anyway (still won't be
    registered in manifest because that name pattern is excluded by design).

.PARAMETER InputDir
    Directory containing expanded VOICEPEAK output (e.g.
    D:\AppDevelopment\pono-asobiba-app\tmp\quizland_NA\order_color_expanded\).

.PARAMETER QuizDir
    Destination directory. Default: assets/tts/quiz/.

.PARAMETER Manifest
    Manifest path. Default: assets/tts/manifest.json.

.PARAMETER NoOverwrite
    Refuse to overwrite existing wav files (default: overwrite).

.PARAMETER IncludeNonQuestion
    Also copy files that do not match q###_<slot>.wav. They will not be
    registered in the manifest (still skipped by builder), but will be present
    on disk under assets/tts/quiz/.

.PARAMETER SkipManifest
    Copy only; do not run Build-NarrationManifest.ps1.

.PARAMETER DryRun
    Show what would happen without copying or writing.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File tools\voicepeak\Deploy-VoicepeakWavs.ps1 `
        -InputDir "D:\AppDevelopment\pono-asobiba-app\tmp\quizland_NA\order_color_expanded"

.EXAMPLE
    # Dry-run with verbose
    powershell -ExecutionPolicy Bypass -File tools\voicepeak\Deploy-VoicepeakWavs.ps1 `
        -InputDir "D:\voicepeak_expanded\trivia_p1" -DryRun -Verbose

.NOTES
    ASCII-only source for Windows PowerShell 5.1 compatibility.
    Author: pono-asobiba-app voicepeak tooling
#>
[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [Parameter(Mandatory = $true)]
    [string]$InputDir,

    [string]$QuizDir,
    [string]$Manifest,
    [switch]$NoOverwrite,
    [switch]$IncludeNonQuestion,
    [switch]$SkipManifest,
    [switch]$DryRun
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot  = (Resolve-Path (Join-Path $ScriptDir "..\..")).Path

if (-not $QuizDir)  { $QuizDir  = Join-Path $RepoRoot "assets\tts\quiz" }
if (-not $Manifest) { $Manifest = Join-Path $RepoRoot "assets\tts\manifest.json" }

if (-not (Test-Path -LiteralPath $InputDir)) {
    throw "InputDir not found: $InputDir"
}
$InputDir = (Resolve-Path -LiteralPath $InputDir).Path

# Materialize $QuizDir as an absolute path even when the folder doesn't exist
# yet (we may need to mkdir it). Resolve-Path -ErrorAction SilentlyContinue
# returns $null in that case, so guard against null before .Path.
$_resolvedQuiz = Resolve-Path -LiteralPath $QuizDir -ErrorAction SilentlyContinue
if ($_resolvedQuiz) {
    $QuizDir = $_resolvedQuiz.Path
} elseif (-not [System.IO.Path]::IsPathRooted($QuizDir)) {
    # Convert relative path to absolute (anchored at current dir).
    $QuizDir = [System.IO.Path]::GetFullPath((Join-Path (Get-Location).Path $QuizDir))
}

if (-not (Test-Path -LiteralPath $QuizDir)) {
    if ($DryRun) {
        Write-Host "[Deploy] (dry-run) would create $QuizDir"
    } else {
        New-Item -ItemType Directory -Path $QuizDir -Force | Out-Null
        Write-Host "[Deploy] created $QuizDir"
    }
}

# Filename validation.
# Question wavs:    q###_q.wav  / q###_a.wav  / q###_b.wav  / q###_c.wav  / q###_d.wav
#                   plus alt:    q160_a_alt.wav / q160_b_alt.wav
$qPattern = '^q\d{3}_(q|[a-d](_alt)?)\.wav$'
# Kurumi calls (intentionally not registered in manifest):
$kurumiPattern = '^kurumi_dai[1-5]mon\.wav$'

$src = Get-ChildItem -LiteralPath $InputDir -File -Filter "*.wav" -ErrorAction Stop
if (-not $src -or $src.Count -eq 0) {
    Write-Warning "No *.wav files found under $InputDir"
}

$copied        = 0
$skippedNonQ   = 0
$skippedKurumi = 0
$wouldOverwrite = 0
$preservedExisting = 0

foreach ($f in $src) {
    $name = $f.Name
    $isQ      = ($name -match $qPattern)
    $isKurumi = ($name -match $kurumiPattern)

    if (-not $isQ) {
        if ($isKurumi) {
            $skippedKurumi++
            Write-Verbose "[Deploy] skip kurumi (SE-only path): $name"
            if (-not $IncludeNonQuestion) { continue }
        } else {
            $skippedNonQ++
            Write-Verbose "[Deploy] skip (non q###_*.wav): $name"
            if (-not $IncludeNonQuestion) { continue }
        }
    }

    $dst = Join-Path $QuizDir $name
    $exists = Test-Path -LiteralPath $dst
    if ($exists -and $NoOverwrite) {
        $preservedExisting++
        Write-Verbose "[Deploy] keep existing: $name"
        continue
    }
    if ($exists) { $wouldOverwrite++ }

    if ($DryRun) {
        $tag = if ($exists) { "OVERWRITE" } else { "COPY" }
        Write-Host ("  [{0}] {1}  ->  {2}" -f $tag, $name, $dst)
        $copied++
        continue
    }

    if ($PSCmdlet.ShouldProcess($dst, "Copy $name")) {
        Copy-Item -LiteralPath $f.FullName -Destination $dst -Force
        $copied++
    }
}

Write-Host ""
Write-Host ("[Deploy] copied              : {0}" -f $copied)
Write-Host ("[Deploy] overwritten (in copied) : {0}" -f $wouldOverwrite)
Write-Host ("[Deploy] preserved existing  : {0}" -f $preservedExisting)
Write-Host ("[Deploy] skipped kurumi_dai* : {0}" -f $skippedKurumi)
Write-Host ("[Deploy] skipped non-question: {0}" -f $skippedNonQ)

if ($SkipManifest) {
    Write-Host "[Deploy] -SkipManifest: not running Build-NarrationManifest.ps1"
    return
}

Write-Host ""
Write-Host "[Deploy] running Build-NarrationManifest.ps1 ..."
$builder = Join-Path $ScriptDir "Build-NarrationManifest.ps1"
if (-not (Test-Path -LiteralPath $builder)) {
    throw "Builder not found: $builder"
}
$buildArgs = @{
    Manifest = $Manifest
    QuizDir  = $QuizDir
}
if ($DryRun) { $buildArgs["DryRun"] = $true }
& $builder @buildArgs -Verbose:$VerbosePreference
$exit = $LASTEXITCODE
if ($exit -ne 0) {
    throw "Build-NarrationManifest.ps1 failed with exit code $exit"
}
Write-Host "[Deploy] done."
