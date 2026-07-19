#!/usr/bin/env python3
"""docs_review_hook.py - コード変更時に docs 同期を強制するフック

v2 (2026-04-25): ユーザー指示「変更したらドキュメントも一緒に変更するようにフック」
   旧版は Stop 時に「reminder」を出すだけで、Claude がチャット上で「更新済み」と嘘ついて
   変更ログ追記しただけで本文を放置するケースが頻発した。v2 では:
     - PostToolUse で「コード編集」と「ドキュメント編集」を**別々のセッションログ**に記録
     - Stop 時に両方を比較し、コード編集があるのに doc 編集が 0 なら **必ず block**
     - block 時の reason に「実際に編集されたコードファイル一覧」を含めて誤魔化しを防止
     - block 解除のためには docs/ 配下のファイルを実際に Edit/Write する必要がある
     - 例外として「コードのみ修正で物語影響なし」と Claude が明示宣言した場合は
       次ターン以降の発火を抑制 (`.claude/.docs-skip-once` を Claude 自身が touch する運用)

2 モード:
  --mark   PostToolUse (Write|Edit) から呼ばれる。
           stdin の hook input JSON から file_path を読み、
             - コード対象 (writing/, sw.js, scripts/) → セッション code ログに追記
             - docs/ や memory/ や CLAUDE.md / MEMORY.md → セッション doc ログに追記
  --check  Stop から呼ばれる。
           code ログが空なら通常通り Stop。
           code ログが非空かつ doc ログが空なら **block** (Claude を再起動して docs 更新を強制)。
           両方非空ならログをクリアして通常通り Stop (= 同期済みとみなす)。

セッションログは sentinel ディレクトリ内の単純な追記式テキスト:
  .claude/.docs-hook-state/code-edits.log
  .claude/.docs-hook-state/doc-edits.log

Hook 自体が失敗してもユーザー体験を壊さないため、全例外は握り潰す。
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
STATE_DIR = REPO_ROOT / ".claude" / ".docs-hook-state"
CODE_LOG = STATE_DIR / "code-edits.log"
DOC_LOG = STATE_DIR / "doc-edits.log"
SKIP_ONCE = REPO_ROOT / ".claude" / ".docs-skip-once"

# コード対象 (このパスを編集すると docs 更新が要求される)
CODE_PATTERNS = [
    r"writing/[^/]+\.(html|js|css)$",
    r"(^|/)sw\.js$",
    r"/scripts/(?!docs_review_hook\.py$)[^/]+\.(py|js|sh)$",
]

# ドキュメント対象 (このパスを編集すると「docs 同期済み」とみなす)
DOC_PATTERNS = [
    r"docs/[^/]+\.md$",
    r"docs/[^/]+/[^/]+\.md$",
    r"/memory/[^/]+\.md$",
    r"^memory/[^/]+\.md$",
    r"(^|/)CLAUDE\.md$",
    r"(^|/)MEMORY\.md$",
    r"(^|/)README[^/]*$",
]

# 自分自身や sentinel ファイルは無視
EXCLUDE_PATTERNS = [
    r"docs_review_hook\.py$",
    r"\.claude/\.docs-",
    r"\.claude/\.docs-hook-state/",
]


def _normalize(path: str) -> str:
    return path.replace("\\", "/")


def _classify(path: str) -> str:
    """path を 'code' / 'doc' / '' に分類。"""
    p = _normalize(path)
    for ex in EXCLUDE_PATTERNS:
        if re.search(ex, p):
            return ""
    for tp in CODE_PATTERNS:
        if re.search(tp, p):
            return "code"
    for tp in DOC_PATTERNS:
        if re.search(tp, p):
            return "doc"
    return ""


def _append_log(log: Path, path: str) -> None:
    log.parent.mkdir(parents=True, exist_ok=True)
    with log.open("a", encoding="utf-8") as f:
        f.write(path + "\n")


def _read_log(log: Path) -> list[str]:
    if not log.exists():
        return []
    try:
        lines = [ln.strip() for ln in log.read_text(encoding="utf-8").splitlines() if ln.strip()]
        # 重複除外、最新が後ろに来る順を維持
        seen = set()
        out = []
        for ln in lines:
            if ln not in seen:
                seen.add(ln)
                out.append(ln)
        return out
    except Exception:
        return []


def _clear_logs() -> None:
    for log in (CODE_LOG, DOC_LOG):
        try:
            if log.exists():
                log.unlink()
        except Exception:
            pass


def cmd_mark() -> int:
    """PostToolUse から呼ばれる。編集ファイルを code/doc に分類してログ追記。"""
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
        kind = _classify(fp)
        if kind == "code":
            _append_log(CODE_LOG, fp)
        elif kind == "doc":
            _append_log(DOC_LOG, fp)
    except Exception:
        pass
    return 0


def cmd_check() -> int:
    """Stop から呼ばれる。code 編集があるのに doc 編集が無ければ block。"""
    try:
        code_files = _read_log(CODE_LOG)
        doc_files = _read_log(DOC_LOG)

        # コード編集が無ければ通常通り Stop
        if not code_files:
            _clear_logs()
            return 0

        # 「今回はコードのみで OK」と明示された場合は skip
        if SKIP_ONCE.exists():
            try:
                SKIP_ONCE.unlink()
            except Exception:
                pass
            _clear_logs()
            return 0

        # コードもドキュメントも編集された → 同期済みとみなして通常 Stop
        if doc_files:
            _clear_logs()
            return 0

        # コード編集あり / ドキュメント編集なし → block
        code_list = "\n".join(["  - " + p for p in code_files[:10]])
        if len(code_files) > 10:
            code_list += f"\n  ... 他 {len(code_files) - 10} 件"

        msg = (
            "コードファイルを編集しましたが、関連ドキュメントが**同セッション内で**\n"
            "更新されていません。下記いずれかを行ってから次へ進んでください:\n\n"
            "**今回編集したコードファイル:**\n"
            f"{code_list}\n\n"
            "**選択肢 A — docs を更新する** (推奨):\n"
            "  - docs/STORY_OPENING_ENDING.md (物語フロー / Beat 構造を変更した場合)\n"
            "  - C:/Users/surfe/.claude/projects/d--AppDevelopment-pono-asobiba-app/memory/*.md\n"
            "  - CLAUDE.md / MEMORY.md (プロジェクト方針を変更した場合)\n"
            "  ⚠️ 単なる change-log 追記ではなく、**該当 Beat / セクションの本文も**\n"
            "    実態に合わせて書き換えること。\n\n"
            "**選択肢 B — docs 更新が不要な変更だと宣言する**:\n"
            "  バグ修正のみ・リファクタのみ等で物語フローやキャラ設定に影響しない場合、\n"
            "  ターミナル上で次のコマンドを 1 回実行してから続行:\n"
            "    touch .claude/.docs-skip-once\n"
            "  (同セッションの 1 回限り有効。次の Stop で自動消費される)\n\n"
            "Claude へ: 嘘で『更新しました』と言わず、実際に Edit/Write した上で続行してください。"
        )
        out = {
            "decision": "block",
            "reason": msg,
            "systemMessage": "📝 コード変更検出 — docs 同期未完 (block until updated)",
        }
        print(json.dumps(out, ensure_ascii=False))
        # logs はクリアしない (次の Stop でも block を続けるため)
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
