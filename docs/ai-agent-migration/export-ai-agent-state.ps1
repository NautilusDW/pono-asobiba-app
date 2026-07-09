param(
  [string]$OutputPath = "",
  [switch]$SkipCodex,
  [switch]$SkipClaude,
  [switch]$IncludeGeneratedImages
)

$ErrorActionPreference = "Stop"

function Join-UserPath([string]$child) {
  return Join-Path $env:USERPROFILE $child
}

function Copy-ItemIfExists {
  param(
    [string]$Source,
    [string]$DestinationRoot
  )

  if (-not (Test-Path -LiteralPath $Source)) {
    return $false
  }

  $name = Split-Path -Leaf $Source
  $destination = Join-Path $DestinationRoot $name
  Copy-Item -LiteralPath $Source -Destination $destination -Recurse -Force
  return $true
}

function Add-ManifestLine {
  param([string]$Line)
  Add-Content -LiteralPath $script:ManifestPath -Encoding utf8 -Value $Line
}

function New-SafeZipArchive {
  param(
    [string]$SourceRoot,
    [string]$DestinationPath
  )

  Add-Type -AssemblyName System.IO.Compression

  $sourceFullPath = (Resolve-Path -LiteralPath $SourceRoot).Path.TrimEnd('\', '/')
  $fileStream = [System.IO.File]::Open(
    $DestinationPath,
    [System.IO.FileMode]::CreateNew,
    [System.IO.FileAccess]::ReadWrite,
    [System.IO.FileShare]::None
  )

  try {
    $zip = New-Object System.IO.Compression.ZipArchive(
      $fileStream,
      [System.IO.Compression.ZipArchiveMode]::Create,
      $false
    )

    try {
      $safeTimestamp = [DateTimeOffset]::Now
      $files = Get-ChildItem -LiteralPath $sourceFullPath -Recurse -Force -File

      foreach ($file in $files) {
        $relativePath = $file.FullName.Substring($sourceFullPath.Length).TrimStart('\', '/')
        $entryName = $relativePath.Replace('\', '/')
        $entry = $zip.CreateEntry($entryName, [System.IO.Compression.CompressionLevel]::Optimal)

        # ZIP timestamps must be representable in the ZIP date range. Some local
        # agent files can carry values that PowerShell's Compress-Archive cannot
        # convert, so store a safe export timestamp instead.
        $entry.LastWriteTime = $safeTimestamp

        $inputStream = [System.IO.File]::OpenRead($file.FullName)
        try {
          $entryStream = $entry.Open()
          try {
            $inputStream.CopyTo($entryStream)
          } finally {
            $entryStream.Dispose()
          }
        } finally {
          $inputStream.Dispose()
        }
      }
    } finally {
      $zip.Dispose()
    }
  } finally {
    $fileStream.Dispose()
  }
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
if ([string]::IsNullOrWhiteSpace($OutputPath)) {
  $OutputPath = Join-Path ([Environment]::GetFolderPath("Desktop")) "ai-agent-migration-$timestamp.zip"
}

$stageRoot = Join-Path $env:TEMP "ai-agent-migration-$timestamp"
if (Test-Path -LiteralPath $stageRoot) {
  Remove-Item -LiteralPath $stageRoot -Recurse -Force
}

New-Item -ItemType Directory -Force -Path $stageRoot | Out-Null
$script:ManifestPath = Join-Path $stageRoot "_MIGRATION_MANIFEST.txt"

Add-ManifestLine "AI agent migration export"
Add-ManifestLine "CreatedAt: $(Get-Date -Format o)"
Add-ManifestLine "SourceComputer: $env:COMPUTERNAME"
Add-ManifestLine "SourceUser: $env:USERNAME"
Add-ManifestLine ""
Add-ManifestLine "SECURITY:"
Add-ManifestLine "- auth.json is intentionally excluded."
Add-ManifestLine "- cache/log/sqlite runtime state is intentionally excluded."
Add-ManifestLine "- This archive still contains chat transcripts and local preferences. Do not upload it publicly."
Add-ManifestLine ""

$dangerousNames = @(
  "auth.json",
  "credentials.json",
  "secrets.json",
  ".dev.vars",
  ".env"
)

if (-not $SkipCodex) {
  $codexHome = Join-UserPath ".codex"
  $codexStage = Join-Path $stageRoot "codex"
  New-Item -ItemType Directory -Force -Path $codexStage | Out-Null
  Add-ManifestLine "CODEX:"

  $codexDirs = @(
    "sessions",
    "archived_sessions",
    "attachments",
    "skills",
    "plugins",
    "rules",
    "memories"
  )

  if ($IncludeGeneratedImages) {
    $codexDirs += "generated_images"
  }

  foreach ($dir in $codexDirs) {
    $source = Join-Path $codexHome $dir
    if (Copy-ItemIfExists -Source $source -DestinationRoot $codexStage) {
      Add-ManifestLine "- copied directory: .codex/$dir"
    }
  }

  $codexFiles = @(
    "config.toml",
    "AGENTS.md",
    "AGENTS.override.md",
    "requirements.toml",
    "history.jsonl",
    "session_index.jsonl",
    "models_cache.json"
  )

  foreach ($file in $codexFiles) {
    $source = Join-Path $codexHome $file
    if (Copy-ItemIfExists -Source $source -DestinationRoot $codexStage) {
      Add-ManifestLine "- copied file: .codex/$file"
    }
  }

  Add-ManifestLine "- excluded: .codex/auth.json, sqlite state, logs, cache, tmp, sandbox"
  Add-ManifestLine ""
}

if (-not $SkipClaude) {
  $claudeHome = Join-UserPath ".claude"
  $claudeStage = Join-Path $stageRoot "claude"
  New-Item -ItemType Directory -Force -Path $claudeStage | Out-Null
  Add-ManifestLine "CLAUDE:"

  $claudeDirs = @(
    "projects",
    "commands",
    "agents",
    "skills",
    "plugins",
    "hooks",
    "memory",
    "memories",
    "output-styles"
  )

  foreach ($dir in $claudeDirs) {
    $source = Join-Path $claudeHome $dir
    if (Copy-ItemIfExists -Source $source -DestinationRoot $claudeStage) {
      Add-ManifestLine "- copied directory: .claude/$dir"
    }
  }

  $claudeFiles = @(
    "settings.json",
    "settings.local.json",
    "CLAUDE.md",
    "CLAUDE.local.md"
  )

  foreach ($file in $claudeFiles) {
    $source = Join-Path $claudeHome $file
    if (Copy-ItemIfExists -Source $source -DestinationRoot $claudeStage) {
      Add-ManifestLine "- copied file: .claude/$file"
    }
  }

  Add-ManifestLine "- excluded: auth/credential/cache/log/tmp runtime state"
  Add-ManifestLine ""
}

foreach ($dangerous in $dangerousNames) {
  $found = Get-ChildItem -LiteralPath $stageRoot -Recurse -Force -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -ieq $dangerous }

  if ($found) {
    $paths = ($found | ForEach-Object { $_.FullName }) -join [Environment]::NewLine
    throw "Refusing to create archive because a sensitive file was staged: $dangerous`n$paths"
  }
}

if (Test-Path -LiteralPath $OutputPath) {
  Remove-Item -LiteralPath $OutputPath -Force
}

New-SafeZipArchive -SourceRoot $stageRoot -DestinationPath $OutputPath

$size = (Get-Item -LiteralPath $OutputPath).Length
Remove-Item -LiteralPath $stageRoot -Recurse -Force

Write-Host "Created: $OutputPath"
Write-Host ("Size: {0:N1} MB" -f ($size / 1MB))
Write-Host ""
Write-Host "Move this ZIP to the Mac, then run:"
Write-Host "  bash docs/ai-agent-migration/import-ai-agent-state.sh ~/Downloads/$(Split-Path -Leaf $OutputPath)"
Write-Host ""
Write-Host "Reminder: this archive contains chat transcripts. Do not upload it publicly."
