#!/usr/bin/env bash
set -euo pipefail

archive="${1:-}"

if [[ -z "$archive" ]]; then
  echo "Usage: bash docs/ai-agent-migration/import-ai-agent-state.sh ~/Downloads/ai-agent-migration-YYYYMMDD-HHMMSS.zip" >&2
  exit 2
fi

if [[ ! -f "$archive" ]]; then
  echo "Archive not found: $archive" >&2
  exit 2
fi

if ! command -v unzip >/dev/null 2>&1; then
  echo "unzip is required but was not found." >&2
  exit 2
fi

stamp="$(date +%Y%m%d-%H%M%S)"
tmpdir="$(mktemp -d "${TMPDIR:-/tmp}/ai-agent-migration.XXXXXX")"
backup_root="$HOME/ai-agent-migration-backup/$stamp"

cleanup() {
  rm -rf "$tmpdir"
}
trap cleanup EXIT

unzip -q "$archive" -d "$tmpdir"

if find "$tmpdir" \( -iname 'auth.json' -o -iname 'credentials.json' -o -iname 'secrets.json' -o -iname '.dev.vars' -o -iname '.env' \) | grep -q .; then
  echo "Refusing to import: archive contains a sensitive credential-like file." >&2
  find "$tmpdir" \( -iname 'auth.json' -o -iname 'credentials.json' -o -iname 'secrets.json' -o -iname '.dev.vars' -o -iname '.env' \) >&2
  exit 1
fi

copy_tree_contents() {
  local source_root="$1"
  local target_root="$2"
  local label="$3"

  if [[ ! -d "$source_root" ]]; then
    return 0
  fi

  mkdir -p "$target_root"
  mkdir -p "$backup_root/$label"

  shopt -s dotglob nullglob
  local item
  for item in "$source_root"/*; do
    local name
    name="$(basename "$item")"
    local target="$target_root/$name"

    if [[ -e "$target" ]]; then
      cp -a "$target" "$backup_root/$label/"
    fi

    if command -v rsync >/dev/null 2>&1; then
      if [[ -d "$item" ]]; then
        mkdir -p "$target"
        rsync -a "$item/" "$target/"
      else
        rsync -a "$item" "$target"
      fi
    else
      cp -a "$item" "$target_root/"
    fi
  done
  shopt -u dotglob nullglob
}

copy_tree_contents "$tmpdir/codex" "$HOME/.codex" "codex"
copy_tree_contents "$tmpdir/claude" "$HOME/.claude" "claude"

echo "Imported AI agent state from:"
echo "  $archive"
echo ""
echo "Existing files, if any, were backed up under:"
echo "  $backup_root"
echo ""
echo "Next checks:"
echo "  codex resume --all"
echo "  codex resume --last --all"
echo "  claude"
echo ""
echo "Sign in again on this Mac. auth.json and credential files were intentionally not imported."

