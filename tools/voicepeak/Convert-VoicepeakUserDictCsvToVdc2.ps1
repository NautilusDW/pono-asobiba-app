param(
    [string]$InputCsv = "tools/voicepeak/voicepeak_user_dict.csv",
    [string]$OutputVdc2 = "tools/voicepeak/voicepeak_user_dict.vdc2",
    [int]$DefaultPriority = 5
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

function ConvertTo-JsonEscapedString {
    param([AllowNull()][string]$Text)

    if ($null -eq $Text) {
        return "null"
    }

    $builder = New-Object System.Text.StringBuilder
    [void]$builder.Append('"')

    foreach ($char in $Text.ToCharArray()) {
        $code = [int][char]$char
        switch ($code) {
            34 { [void]$builder.Append('\"'); break }
            92 { [void]$builder.Append('\\'); break }
            8 { [void]$builder.Append('\b'); break }
            9 { [void]$builder.Append('\t'); break }
            10 { [void]$builder.Append('\n'); break }
            12 { [void]$builder.Append('\f'); break }
            13 { [void]$builder.Append('\r'); break }
            default {
                if (($code -lt 0x20) -or ($code -gt 0x7E)) {
                    [void]$builder.Append(('\u{0:x4}' -f $code))
                } else {
                    [void]$builder.Append($char)
                }
            }
        }
    }

    [void]$builder.Append('"')
    return $builder.ToString()
}

function Add-JsonPropertyLine {
    param(
        [System.Collections.Generic.List[string]]$Lines,
        [string]$Name,
        $Value,
        [bool]$TrailingComma
    )

    $suffix = if ($TrailingComma) { "," } else { "" }
    if ($Value -is [int]) {
        $Lines.Add(('    {0}: {1}{2}' -f (ConvertTo-JsonEscapedString $Name), $Value, $suffix))
    } elseif ($Value -is [System.Array]) {
        # Array of integers (overwriteAccents)
        $joined = ($Value -join ', ')
        $Lines.Add(('    {0}: [{1}]{2}' -f (ConvertTo-JsonEscapedString $Name), $joined, $suffix))
    } else {
        $Lines.Add(('    {0}: {1}{2}' -f (ConvertTo-JsonEscapedString $Name), (ConvertTo-JsonEscapedString ([string]$Value)), $suffix))
    }
}

function Convert-PosLabelToVdc2 {
    param([string]$Label)

    # VOICEPEAK GUI only exposes noun categories: 普通名詞 + 固有名詞:{一般,人名,姓,名,地域}.
    # No 動詞/形容詞/副詞 dropdown exists, so those labels are not representable in VDC2.
    # Only Japanese_Futsuu_meishi is empirically verified (all entries in test.vdc2).
    # Build Japanese label literals from char codes so the script stays ASCII-only
    # (Windows PowerShell 5.1 cannot parse UTF-8 source files without BOM if they
    # contain non-ASCII characters).
    $labelMeishi       = ([char]0x540D) + ([char]0x8A5E)                                 # noun
    $labelFutsuuMeishi = ([char]0x666E) + ([char]0x901A) + ([char]0x540D) + ([char]0x8A5E) # common noun

    if ([string]::IsNullOrWhiteSpace($Label)) {
        return "Japanese_Futsuu_meishi"
    }
    $trimmed = $Label.Trim()
    if ($trimmed -eq $labelMeishi)        { return "Japanese_Futsuu_meishi" }
    if ($trimmed -eq $labelFutsuuMeishi)  { return "Japanese_Futsuu_meishi" }
    return "Japanese_Futsuu_meishi"
}

$inputPath = Resolve-PathForWrite $InputCsv
$outputPath = Resolve-PathForWrite $OutputVdc2

if (-not (Test-Path -LiteralPath $inputPath)) {
    throw "Input CSV not found: $inputPath"
}

$rows = @(Import-Csv -LiteralPath $inputPath -Encoding UTF8)
if ($rows.Count -eq 0) {
    throw "Input CSV has no dictionary rows: $inputPath"
}

$lines = New-Object "System.Collections.Generic.List[string]"
$warnings = New-Object "System.Collections.Generic.List[string]"
$lines.Add("[")

for ($i = 0; $i -lt $rows.Count; $i++) {
    $row = $rows[$i]
    $columns = @($row.PSObject.Properties)
    if ($columns.Count -lt 4) {
        throw "Row $($i + 2): expected at least 4 CSV columns, got $($columns.Count)"
    }

    # Column order: surface, pronunciation, accent type, part of speech, overwriteAccents (optional, ; separated).
    # Keep this script ASCII-only so Windows PowerShell 5.1 can parse it as UTF-8 without BOM.
    $surface = [string]$columns[0].Value
    $pronunciation = [string]$columns[1].Value
    $accentTypeText = [string]$columns[2].Value
    $posLabel = [string]$columns[3].Value
    $overwriteText = if ($columns.Count -ge 5) { [string]$columns[4].Value } else { "" }

    if ([string]::IsNullOrWhiteSpace($surface)) {
        throw "Row $($i + 2): surface is empty"
    }
    if ([string]::IsNullOrWhiteSpace($pronunciation)) {
        throw "Row $($i + 2): pronunciation is empty for '$surface'"
    }

    $accentType = 0
    if (-not [int]::TryParse($accentTypeText, [ref]$accentType)) {
        throw "Row $($i + 2): accent type must be an integer for '$surface': '$accentTypeText'"
    }

    $posValue = Convert-PosLabelToVdc2 $posLabel

    $overwriteArray = $null
    if (-not [string]::IsNullOrWhiteSpace($overwriteText)) {
        $tokens = $overwriteText.Split(';')
        $intList = New-Object "System.Collections.Generic.List[int]"
        foreach ($tok in $tokens) {
            $trimmed = $tok.Trim()
            if ([string]::IsNullOrWhiteSpace($trimmed)) { continue }
            $value = 0
            if (-not [int]::TryParse($trimmed, [ref]$value)) {
                throw "Row $($i + 2): overwriteAccents must be ;-separated integers for '$surface': '$overwriteText'"
            }
            $intList.Add($value)
        }
        if ($intList.Count -gt 0) {
            $overwriteArray = $intList.ToArray()
        }
    }

    $lines.Add("  {")
    Add-JsonPropertyLine $lines "sur" $surface $true
    Add-JsonPropertyLine $lines "pron" $pronunciation $true
    Add-JsonPropertyLine $lines "pos" $posValue $true
    Add-JsonPropertyLine $lines "priority" $DefaultPriority $true
    if ($null -ne $overwriteArray) {
        Add-JsonPropertyLine $lines "accentType" $accentType $true
        Add-JsonPropertyLine $lines "overwriteAccents" $overwriteArray $true
    } else {
        Add-JsonPropertyLine $lines "accentType" $accentType $true
    }
    Add-JsonPropertyLine $lines "lang" "ja" $false

    if ($i -lt ($rows.Count - 1)) {
        $lines.Add("  },")
    } else {
        $lines.Add("  }")
    }
}

$lines.Add("]")

$outputDir = Split-Path -Parent $outputPath
if (-not [string]::IsNullOrWhiteSpace($outputDir)) {
    New-Item -ItemType Directory -Force -Path $outputDir | Out-Null
}

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($outputPath, (($lines -join "`n") + "`n"), $utf8NoBom)

Write-Host ("Wrote {0} entries to {1}" -f $rows.Count, $outputPath)
foreach ($warning in $warnings) {
    Write-Warning $warning
}
