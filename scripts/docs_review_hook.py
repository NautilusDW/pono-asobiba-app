#!/usr/bin/env python3
"""docs_review_hook.py - コード変更時に docs 見直しを促すフック

2 モードで動作:
  --mark   PostToolUse (Write|Edit) から呼ばれる。
           stdin の hook input JSON を読み、対象パスにマッチしたら
           sentinel ファイル `.claude/.docs-review-pending` を作成する。
  --check  Stop から呼ばれる。
           sentinel が存在すれば削除して、Claude に「docs を見直してください」
           と促す JSON ({systemMessage, decision: block, reason}) を stdout に出す。
           sentinel が無ければ何も出さない (= 通常通り Stop)。

対象パス: writing/, sw.js, scripts/ (本スクリプト自身は除外)
docs 更新候補: docs/STORY_OPENING_ENDING.md / memory/*.md / CLAUDE.md / README*

Hook 自体が失敗してもユーザー体験を壊さないため、全例外を握り潰す。
"""
from __future__ import annotations

import json
import os
import re
import sys
from pathlib import Path

# Windows コンソールは既定 cp932 で日本語 print が UnicodeEncodeError を投げ、
# 外側 try/except が握り潰してしまうので強制 UTF-8 化 (Python 3.7+)。
try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass

REPO_ROOT = Path(__file__).resolve().parent.parent
SENTINEL = REPO_ROOT / ".claude" / ".docs-review-pending"
# /scripts/ 配下を編集しても発火するかは「自分自身は除外」ルールでガード済み

# トリガパターン (forward slash で正規化したパスに対して match)
TRIGGER_PATTERNS = [
    r"writing/[^/]+\.(html|js|css)$",
    r"(^|/)sw\.js$",
    r"/scripts/(?!docs_review_hook\.py$)[^/]+\.(py|js|sh)$",
]

# Hook が docs を見直したかを判断するために sentinel を作らないパス
EXCLUDE_PATTERNS = [
    r"docs_review_hook\.py$",      # 自分自身
    r"\.claude/\.docs-review-",    # sentinel 自体
]


def _normalize(path: str) -> str:
    return path.replace("\\", "/")


def _matches_trigger(path: str) -> bool:
    p = _normalize(path)
    for ex in EXCLUDE_PATTERNS:
        if re.search(ex, p):
            return False
    for tp in TRIGGER_PATTERNS:
        if re.search(tp, p):
            return True
    return False


def cmd_mark() -> int:
    """PostToolUse から呼ばれる。対象パス変更を検出して sentinel を作る。"""
    try:
        raw = sys.stdin.read()
        if not raw.strip():
            return 0
        d = json.loads(raw)
        fp = (d.get("tool_input", {}) or {}).get("file_path") \
             or (d.get("tool_response", {}) or {}).get("filePath") \
             or ""
        if not fp:
            return 0
        if _matches_trigger(fp):
            SENTINEL.parent.mkdir(parents=True, exist_ok=True)
            SENTINEL.touch()
    except Exception:
        # ユーザー体験を壊さないため例外は無音
        pass
    return 0


def cmd_check() -> int:
    """Stop から呼ばれる。sentinel があれば Claude に docs 見直しを促す。"""
    try:
        if not SENTINEL.exists():
            return 0
        # 一度だけ反応するよう sentinel は即削除
        try:
            SENTINEL.unlink()
        except Exception:
            pass
        msg = (
            "writing/ や sw.js, scripts/ のコード変更を検出しました。"
            "物語フローやキャラ設定が変わった場合は、関連 docs を更新してください:\n"
            "- docs/STORY_OPENING_ENDING.md (物語フロー / クライマックス Beat)\n"
            "- C:/Users/surfe/.claude/projects/d--AppDevelopment-pono-asobiba-app/memory/*.md (キャラ設定 / ベスト プラクティス)\n"
            "- CLAUDE.md / MEMORY.md (プロジェクト方針)\n\n"
            "ドキュメント更新が不要だと判断した場合は、その理由を 1 行で述べてから続行してください。"
        )
        out = {
            "decision": "block",
            "reason": msg,
            "systemMessage": "📝 コード変更を検出 — docs 見直しチェック中",
        }
        print(json.dumps(out, ensure_ascii=False))
    except Exception:
        pass
    return 0


def main() -> int:
    if len(sys.argv) < 2:
        return 0
    mode = sys.argv[1]
    if mode == "--mark":
        return cmd_mark()
    if mode == "--check":
        return cmd_check()
    return 0


if __name__ == "__main__":
    sys.exit(main())
