#Requires -Version 5.1
<#
.SYNOPSIS
    Expand VOICEPEAK unique-ized output WAV files into all q###_*.wav variants.

.DESCRIPTION
    The unique-ization pipeline (see _build_unique_csvs.py + DUPLICATE-ANALYSIS.md)
    feeds VOICEPEAK only the deduplicated speech list. VOICEPEAK exports one WAV
    per unique speech, named with sequential numbers (001.wav, 002.wav, ...) in
    the same order as the unique CSV.

    This script reads the unique CSV (to derive speech order -> sequential WAV)
    plus the expand JSON (speech -> [target wav names]), then COPIES each
    sequential WAV into all of its destination q###_*.wav names.

.PARAMETER InputDir
    Directory containing the VOICEPEAK output WAVs. Files MUST be named with
    a leading sequential number that matches the unique CSV row order.
    Default match patterns (in order): "001.wav", "0001.wav", any *.wav sorted
    naturally. Use -Pattern to override.

.PARAMETER UniqueCsv
    Path to the unique CSV (e.g. voicepeak_lines_unique_phase1_order_color.csv).
    The 2nd column (speech) drives the row order -> sequential WAV mapping.

.PARAMETER ExpandJson
    Path to the expand JSON (e.g. voicepeak_unique_expand_order_color_phase1.json).
    Maps each unique speech to a list of destination wav file names.

.PARAMETER OutputDir
    Destination directory for the expanded q###_*.wav files. Will be created
    if missing. Existing files with the same name are overwritten.

.PARAMETER Pattern
    Optional glob pattern overriding the WAV filename match in InputDir.
    Default: "*.wav".

.PARAMETER WhatIf
    Show what would be copied without performing the copy.

.EXAMPLE
    .\Expand-VoicepeakUniqueWavs.ps1 `
        -InputDir   "D:\voicepeak_out\order_color_p1" `
        -UniqueCsv  "tools\voicepeak\voicepeak_lines_unique_phase1_order_color.csv" `
        -ExpandJson "tools\voicepeak\voicepeak_unique_expand_order_color_phase1.json" `
        -OutputDir  "D:\voicepeak_expanded\order_color_p1"

.NOTES
    ASCII-only source for Windows PowerShell 5.1 compatibility.
    Author: pono-asobiba-app voicepeak tooling
#>
[CmdletBinding(SupportsShouldProcess = $true)]
param(
    [Parameter(Mandatory = $true)]
    [string]$InputDir,

    [Parameter(Mandatory = $true)]
    [string]$UniqueCsv,

    [Parameter(Mandatory = $true)]
    [string]$ExpandJson,

    [Parameter(Mandatory = $true)]
    [string]$OutputDir,

    [string]$Pattern = "*.wav"
)

$ErrorActionPreference = "Stop"

function Read-UniqueCsvSpeeches {
    param([string]$CsvPath)

    if (-not (Test-Path -LiteralPath $CsvPath)) {
        throw "Unique CSV not found: $CsvPath"
    }
    # CSV is UTF-8 (no BOM), CRLF, format: <speaker>,<speech>
    # speech may be wrapped in double quotes if it contains a comma.
    $bytes = [System.IO.File]::ReadAllBytes($CsvPath)
    $text  = [System.Text.Encoding]::UTF8.GetString($bytes)
    $lines = $text -split "`r`n"

    $speeches = New-Object System.Collections.Generic.List[string]
    foreach ($line in $lines) {
        if ([string]::IsNullOrEmpty($line)) { continue }
        $commaIdx = $line.IndexOf(',')
        if ($commaIdx -lt 0) {
            throw "Malformed CSV line (no comma): $line"
        }
        $body = $line.Substring($commaIdx + 1)
        if ($body.StartsWith('"') -and $body.EndsWith('"')) {
            $inner = $body.Substring(1, $body.Length - 2).Replace('""', '"')
            $speeches.Add($inner) | Out-Null
        } else {
            $speeches.Add($body) | Out-Null
        }
    }
    return ,$speeches.ToArray()
}

function Read-ExpandJson {
    param([string]$JsonPath)

    if (-not (Test-Path -LiteralPath $JsonPath)) {
        throw "Expand JSON not found: $JsonPath"
    }
    $raw = Get-Content -LiteralPath $JsonPath -Raw -Encoding UTF8
    return ConvertFrom-Json -InputObject $raw
}

function Get-SortedInputWavs {
    param(
        [string]$Dir,
        [string]$GlobPattern
    )
    if (-not (Test-Path -LiteralPath $Dir)) {
        throw "InputDir not found: $Dir"
    }
    $files = Get-ChildItem -LiteralPath $Dir -File -Filter $GlobPattern
    if ($null -eq $files -or $files.Count -eq 0) {
        throw "No files matching '$GlobPattern' in $Dir"
    }
    # Natural numeric sort by leading digits in name; fall back to name.
    $sorted = $files | Sort-Object @{
        Expression = {
            $name = $_.BaseName
            # Extract leading digit run
            $m = [regex]::Match($name, '^(\d+)')
            if ($m.Success) { [int]$m.Groups[1].Value } else { [int]::MaxValue }
        }
    }, Name
    return ,$sorted
}

# --- Main ---

Write-Host "[Expand-VoicepeakUniqueWavs]"
Write-Host "  InputDir   : $InputDir"
Write-Host "  UniqueCsv  : $UniqueCsv"
Write-Host "  ExpandJson : $ExpandJson"
Write-Host "  OutputDir  : $OutputDir"
Write-Host "  Pattern    : $Pattern"
Write-Host ""

$speeches = Read-UniqueCsvSpeeches -CsvPath $UniqueCsv
$expand   = Read-ExpandJson -JsonPath $ExpandJson
$wavs     = Get-SortedInputWavs -Dir $InputDir -GlobPattern $Pattern

Write-Host ("Unique speech count : {0}" -f $speeches.Count)
Write-Host ("Input wav count     : {0}" -f $wavs.Count)

if ($speeches.Count -ne $wavs.Count) {
    throw ("Speech count {0} does not match input wav count {1}. " -f `
           $speeches.Count, $wavs.Count) + `
          "Verify VOICEPEAK exported one wav per unique CSV row in order."
}

# Validate every speech in the unique CSV exists as a key in expand JSON
$expandProps = $expand.PSObject.Properties.Name
$expandSet   = New-Object System.Collections.Generic.HashSet[string]
foreach ($k in $expandProps) { [void]$expandSet.Add($k) }

$missing = @()
foreach ($sp in $speeches) {
    if (-not $expandSet.Contains($sp)) {
        $missing += $sp
    }
}
if ($missing.Count -gt 0) {
    throw ("{0} speech(es) from CSV are missing in expand JSON. " -f $missing.Count) + `
          ("First missing: '{0}'" -f $missing[0])
}

# Ensure output dir exists
if (-not (Test-Path -LiteralPath $OutputDir)) {
    if ($PSCmdlet.ShouldProcess($OutputDir, "Create output directory")) {
        New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
    }
}

$copyCount      = 0
$totalCopies    = 0
$writtenTargets = New-Object System.Collections.Generic.HashSet[string]

for ($i = 0; $i -lt $speeches.Count; $i++) {
    $speech = $speeches[$i]
    $srcWav = $wavs[$i].FullName
    $targets = $expand.$speech
    if ($null -eq $targets) {
        throw "No targets for speech: '$speech' (index $i)"
    }
    foreach ($tgtName in $targets) {
        $totalCopies++
        $dest = Join-Path -Path $OutputDir -ChildPath $tgtName
        if ($writtenTargets.Contains($tgtName)) {
            Write-Warning ("Duplicate target '{0}' - overwriting" -f $tgtName)
        }
        if ($PSCmdlet.ShouldProcess($dest, ("Copy from {0}" -f $srcWav))) {
            Copy-Item -LiteralPath $srcWav -Destination $dest -Force
            $copyCount++
            [void]$writtenTargets.Add($tgtName)
        }
    }
}

Write-Host ""
Write-Host "Done."
Write-Host ("  Source wavs        : {0}" -f $wavs.Count)
Write-Host ("  Target files (plan): {0}" -f $totalCopies)
Write-Host ("  Files copied       : {0}" -f $copyCount)
Write-Host ("  Unique destinations: {0}" -f $writtenTargets.Count)
