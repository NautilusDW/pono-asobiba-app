param(
  [string]$RepoRoot = ".",
  [switch]$Execute,
  [switch]$IncludeDirty,
  [int]$MinAgeDays = 0,
  [switch]$SkipSize
)

$ErrorActionPreference = "Stop"

function Normalize-FullPath {
  param([Parameter(Mandatory = $true)][string]$Path)
  return ([System.IO.Path]::GetFullPath($Path)).TrimEnd([char[]]@('\', '/'))
}

function Get-DirectorySizeBytes {
  param([Parameter(Mandatory = $true)][string]$Path)

  $total = 0L
  Get-ChildItem -LiteralPath $Path -Recurse -Force -File -ErrorAction SilentlyContinue |
    ForEach-Object { $total += $_.Length }
  return $total
}

function Get-GitWorktrees {
  param([Parameter(Mandatory = $true)][string]$RepoRoot)

  $lines = & git -C $RepoRoot worktree list --porcelain
  if ($LASTEXITCODE -ne 0) {
    throw "git worktree list failed. Is this path inside a Git repository?"
  }

  $items = @()
  $current = $null

  foreach ($line in $lines) {
    if ([string]::IsNullOrWhiteSpace($line)) {
      continue
    }

    if ($line.StartsWith("worktree ")) {
      if ($null -ne $current) {
        $items += [pscustomobject]$current
      }

      $current = [ordered]@{
        Path = $line.Substring("worktree ".Length)
        Head = ""
        Branch = ""
        Detached = $false
        Locked = $false
        LockReason = ""
      }
      continue
    }

    if ($null -eq $current) {
      continue
    }

    if ($line.StartsWith("HEAD ")) {
      $current.Head = $line.Substring("HEAD ".Length)
    } elseif ($line.StartsWith("branch ")) {
      $current.Branch = $line.Substring("branch ".Length)
    } elseif ($line -eq "detached") {
      $current.Detached = $true
    } elseif ($line.StartsWith("locked")) {
      $current.Locked = $true
      if ($line.Length -gt "locked".Length) {
        $current.LockReason = $line.Substring("locked".Length).Trim()
      }
    }
  }

  if ($null -ne $current) {
    $items += [pscustomobject]$current
  }

  return $items
}

function Test-WorktreeDirty {
  param([Parameter(Mandatory = $true)][string]$Path)

  $statusOutput = & git -C $Path status --porcelain --untracked-files=normal 2>$null
  if ($LASTEXITCODE -ne 0) {
    return $true
  }

  $statusLines = @($statusOutput | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
  return $statusLines.Count -gt 0
}

if ($MinAgeDays -lt 0) {
  throw "-MinAgeDays must be 0 or greater."
}

$repoProbeRoot = Normalize-FullPath $RepoRoot
$repoTop = (& git -C $repoProbeRoot rev-parse --show-toplevel)
if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($repoTop)) {
  throw "Could not resolve the Git repository root from: $RepoRoot"
}

$repoRootFull = Normalize-FullPath $repoTop
$worktreeRoot = Join-Path $repoRootFull ".claude\worktrees"
$worktreeRootFull = Normalize-FullPath $worktreeRoot
$worktreeRootPrefix = $worktreeRootFull + [System.IO.Path]::DirectorySeparatorChar

Write-Host "Repository: $repoRootFull"
Write-Host "Claude worktree root: $worktreeRootFull"
if ($Execute) {
  Write-Host "Mode: EXECUTE"
} else {
  Write-Host "Mode: DRY RUN"
}
Write-Host ""

if (-not (Test-Path -LiteralPath $worktreeRootFull)) {
  Write-Host "No .claude\worktrees directory found. Nothing to clean."
  exit 0
}

$cutoff = (Get-Date).AddDays(-1 * $MinAgeDays)
$worktrees = @(Get-GitWorktrees -RepoRoot $repoRootFull)
$targets = @()

foreach ($worktree in $worktrees) {
  $pathFull = Normalize-FullPath $worktree.Path

  if (-not $pathFull.StartsWith($worktreeRootPrefix, [StringComparison]::OrdinalIgnoreCase)) {
    continue
  }

  if (-not (Test-Path -LiteralPath $pathFull)) {
    continue
  }

  $item = Get-Item -LiteralPath $pathFull
  $dirty = Test-WorktreeDirty -Path $pathFull
  $skipReason = ""

  if ($dirty -and -not $IncludeDirty) {
    $skipReason = "dirty"
  } elseif ($MinAgeDays -gt 0 -and $item.LastWriteTime -gt $cutoff) {
    $skipReason = "recent"
  }

  $sizeBytes = 0L
  if (-not $SkipSize) {
    $sizeBytes = Get-DirectorySizeBytes -Path $pathFull
  }

  $action = "remove"
  if (-not [string]::IsNullOrWhiteSpace($skipReason)) {
    $action = "skip:$skipReason"
  }

  $targets += [pscustomobject]@{
    Action = $action
    SizeGB = if ($SkipSize) { "" } else { "{0:N2}" -f ($sizeBytes / 1GB) }
    Dirty = $dirty
    Locked = [bool]$worktree.Locked
    LastWrite = $item.LastWriteTime.ToString("yyyy-MM-dd HH:mm:ss")
    Branch = $worktree.Branch
    Path = $pathFull
    SizeBytes = $sizeBytes
  }
}

if ($targets.Count -eq 0) {
  Write-Host "No registered Git worktrees under .claude\worktrees were found."
  Write-Host "Running this script will not touch folders that Git does not know as worktrees."
  exit 0
}

$table = $targets |
  Sort-Object Action, LastWrite, Path |
  Select-Object Action, SizeGB, Dirty, Locked, LastWrite, Branch, Path |
  Format-Table -AutoSize |
  Out-String -Width 260
Write-Host $table

$removable = @($targets | Where-Object { $_.Action -eq "remove" })
$reclaimableBytes = 0L
foreach ($target in $removable) {
  $reclaimableBytes += $target.SizeBytes
}

if (-not $SkipSize) {
  Write-Host ("Estimated reclaimable space: {0:N2} GB" -f ($reclaimableBytes / 1GB))
}
Write-Host ("Removable worktrees: {0}" -f $removable.Count)
Write-Host ""

if (-not $Execute) {
  Write-Host "Dry run only. Re-run with -Execute to remove the rows marked 'remove'."
  Write-Host "Dirty worktrees are skipped unless you add -IncludeDirty."
  exit 0
}

if ($removable.Count -eq 0) {
  Write-Host "No removable worktrees. Nothing was deleted."
  exit 0
}

foreach ($target in $removable) {
  Write-Host "Removing: $($target.Path)"
  $args = @(
    "-C",
    $repoRootFull,
    "worktree",
    "remove",
    "--force",
    "--force",
    $target.Path
  )
  & git @args
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to remove worktree: $($target.Path)"
  }
}

& git -C $repoRootFull worktree prune
if ($LASTEXITCODE -ne 0) {
  throw "git worktree prune failed."
}

Write-Host ""
Write-Host "Done."
