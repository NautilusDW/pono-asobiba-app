param(
    [string]$InputVdc2 = "tools/voicepeak/voicepeak_user_dict.vdc2",
    [string]$OutputCsv = "tools/voicepeak/voicepeak_user_dict.csv"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Resolve-PathForWrite {
    param([string]$Path)

    if ([System.IO.Path]::IsPathRooted($Path)) {
        return $Path
    }

    return [System.IO.Path]::GetFullPath((Join-Path (Get-Location) $Path))
}

function Convert-Vdc2PosToLabel {
    param([string]$PosId)

    # Inverse of Convert-PosLabelToVdc2 in the forward script.
    # Map VOICEPEAK internal pos identifiers back to the Japanese CSV labels.
    # Build Japanese labels from char codes to keep this script ASCII-only
    # (Windows PowerShell 5.1 cannot parse UTF-8 source without BOM that contains
    # non-ASCII characters).
    $labelMeishi    = ([char]0x540D) + ([char]0x8A5E)                   # noun
    $labelDoushi    = ([char]0x52D5) + ([char]0x8A5E)                   # verb
    $labelKeiyoushi = ([char]0x5F62) + ([char]0x5BB9) + ([char]0x8A5E) # adjective
    $labelFukushi   = ([char]0x526F) + ([char]0x8A5E)                   # adverb

    if ([string]::IsNullOrWhiteSpace($PosId)) {
        return $labelMeishi
    }
    switch ($PosId.Trim()) {
        "Japanese_Futsuu_meishi" { return $labelMeishi }
        "Japanese_Doushi"        { return $labelDoushi }
        "Japanese_Keiyoushi"     { return $labelKeiyoushi }
        "Japanese_Fukushi"       { return $labelFukushi }
        default                  { return $labelMeishi }
    }
}

function ConvertTo-CsvField {
    param([AllowNull()][string]$Value)

    if ($null -eq $Value) { return "" }
    # Quote field if it contains comma, double quote, CR, or LF.
    if ($Value -match '[",\r\n]') {
        $escaped = $Value.Replace('"', '""')
        return ('"{0}"' -f $escaped)
    }
    return $Value
}

$inputPath = Resolve-PathForWrite $InputVdc2
$outputPath = Resolve-PathForWrite $OutputCsv

if (-not (Test-Path -LiteralPath $inputPath)) {
    throw "Input VDC2 not found: $inputPath"
}

# Read raw bytes and decode as UTF-8 (the VDC2 file is UTF-8 JSON, BOM tolerated).
$rawBytes = [System.IO.File]::ReadAllBytes($inputPath)
$utf8 = New-Object System.Text.UTF8Encoding($false)
$jsonText = $utf8.GetString($rawBytes)
if ($jsonText.Length -gt 0 -and [int][char]$jsonText[0] -eq 0xFEFF) {
    $jsonText = $jsonText.Substring(1)
}

$entries = ConvertFrom-Json -InputObject $jsonText
if ($null -eq $entries) {
    throw "VDC2 parsed to null: $inputPath"
}

# ConvertFrom-Json returns a single object if the JSON is a 1-element array (PS5.1 quirk).
$entryArray = @($entries)

$lines = New-Object "System.Collections.Generic.List[string]"
# Build the CSV header from char codes to keep this script ASCII-only
# (Windows PowerShell 5.1 cannot parse UTF-8 source without BOM containing non-ASCII).
# Header: tango,yomi,accent-kakuichi,hinshi,mora-pitch (in Japanese)
$colTango   = ([char]0x5358) + ([char]0x8A9E)                                                     # tango (word/surface)
$colYomi    = ([char]0x8AAD) + ([char]0x307F)                                                     # yomi (reading)
$colAccent  = ([char]0x30A2) + ([char]0x30AF) + ([char]0x30BB) + ([char]0x30F3) + ([char]0x30C8) + ([char]0x6838) + ([char]0x4F4D) + ([char]0x7F6E) # accent core position
$colHinshi  = ([char]0x54C1) + ([char]0x8A5E)                                                     # hinshi (part of speech)
$colMora    = ([char]0x30E2) + ([char]0x30FC) + ([char]0x30E9) + ([char]0x97F3) + ([char]0x9AD8) # mora pitch
$lines.Add("$colTango,$colYomi,$colAccent,$colHinshi,$colMora")

for ($i = 0; $i -lt $entryArray.Count; $i++) {
    $entry = $entryArray[$i]
    $sur = if ($entry.PSObject.Properties['sur']) { [string]$entry.sur } else { "" }
    $pron = if ($entry.PSObject.Properties['pron']) { [string]$entry.pron } else { "" }
    $accentType = if ($entry.PSObject.Properties['accentType']) { [int]$entry.accentType } else { 0 }
    $posId = if ($entry.PSObject.Properties['pos']) { [string]$entry.pos } else { "" }

    $posLabel = Convert-Vdc2PosToLabel $posId

    $overwriteText = ""
    if ($entry.PSObject.Properties['overwriteAccents']) {
        $arr = @($entry.overwriteAccents)
        if ($arr.Count -gt 0) {
            $overwriteText = ($arr -join ';')
        }
    }

    $row = @(
        (ConvertTo-CsvField $sur),
        (ConvertTo-CsvField $pron),
        ([string]$accentType),
        (ConvertTo-CsvField $posLabel),
        (ConvertTo-CsvField $overwriteText)
    ) -join ','
    $lines.Add($row)
}

$outputDir = Split-Path -Parent $outputPath
if (-not [string]::IsNullOrWhiteSpace($outputDir)) {
    New-Item -ItemType Directory -Force -Path $outputDir | Out-Null
}

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
# Use CRLF for CSV (Excel-friendly, matches PowerShell CSV convention).
[System.IO.File]::WriteAllText($outputPath, (($lines -join "`r`n") + "`r`n"), $utf8NoBom)

Write-Host ("Wrote {0} entries to {1}" -f $entryArray.Count, $outputPath)
