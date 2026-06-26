#!/usr/bin/env bash
# pono-asobiba-app git hooks installer
#
# scripts/hooks/ 配下の hook ファイルを .git/hooks/ にコピーする。
# .git/hooks/ は git 管理外なので、 clone 直後 / hook 更新時にこのスクリプトを叩く必要がある。
# 関連: AGENTS.md §11.1

set -e

# このスクリプトの 1 つ上をリポジトリ root とみなす
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "$script_dir/.." && pwd)"

if [ ! -d "$repo_root/.git" ]; then
    echo "Error: '$repo_root' is not a git repository root" >&2
    exit 1
fi

hooks_src="$repo_root/scripts/hooks"
hooks_dst="$repo_root/.git/hooks"

if [ ! -d "$hooks_src" ]; then
    echo "Error: '$hooks_src' does not exist" >&2
    exit 1
fi

installed=0
for src in "$hooks_src"/*; do
    [ -f "$src" ] || continue
    name="$(basename "$src")"
    # .sh 拡張子があれば剥がす (例: pre-push.sh -> pre-push)
    dst_name="${name%.sh}"
    dst="$hooks_dst/$dst_name"
    cp "$src" "$dst"
    chmod +x "$dst"
    echo "installed: $dst"
    installed=$((installed + 1))
done

echo ""
if [ "$installed" -eq 0 ]; then
    echo "Warning: '$hooks_src' に hook ファイルが見つかりませんでした (0 件 install)。" >&2
    exit 0
fi
echo "Done. $installed hook(s) updated under .git/hooks/."
echo "既存の pre-commit (機密ファイル / 3MB 超画像 / Image2 違反 block) は維持されます。"
