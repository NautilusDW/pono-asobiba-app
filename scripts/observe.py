#!/usr/bin/env python3
"""
Phase 1: Observation Hook (post_tool_use)
=========================================
Claude Code のツール実行後に自動トリガーされ、全行動を構造化ログとして記録する。

RLマッピング:
  - このスクリプトは「報酬モデル (Reward)」の入力データを収集する役割を担う。
  - 各ツール呼び出しを (state, action, result) のトランジションとして記録。

使い方:
  Claude Code の settings.json で post_tool_use hook として登録する。
  stdin から JSON 形式のツール実行情報を受け取る。
"""

import json
import sys
import os
from datetime import datetime, timezone
from pathlib import Path

# Windows コンソールの文字化け対策
if sys.stdout.encoding != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")
if sys.stderr.encoding != "utf-8":
    sys.stderr.reconfigure(encoding="utf-8")

# --- Configuration -----------------------------------------------------------

PROJECT_ROOT = Path(__file__).resolve().parent.parent
LOG_DIR = PROJECT_ROOT / "logs"
ACTION_LOG = LOG_DIR / "action_log.jsonl"
MEMORY_FILE = PROJECT_ROOT / "MEMORY.md"

# エラーとして扱うキーワード（結果文字列に含まれていたらエラーフラグを立てる）
ERROR_INDICATORS = [
    "error", "Error", "ERROR",
    "failed", "Failed", "FAILED",
    "traceback", "Traceback",
    "exception", "Exception",
    "denied", "Denied",
    "permission", "Permission",
]

# 記録対象外のツール（ノイズ削減）
SKIP_TOOLS = {"TodoWrite", "TodoRead"}

# ログファイルの最大行数（超えたら古いものを削除）
MAX_LOG_LINES = 500


# --- Helpers -----------------------------------------------------------------

def detect_error(result_text: str) -> dict:
    """結果テキストからエラー情報を抽出する。"""
    if not result_text:
        return {"has_error": False, "error_type": None, "error_snippet": None}

    for indicator in ERROR_INDICATORS:
        if indicator in result_text:
            # エラー箇所の前後を切り出し
            idx = result_text.find(indicator)
            start = max(0, idx - 50)
            end = min(len(result_text), idx + 200)
            snippet = result_text[start:end].strip()
            return {
                "has_error": True,
                "error_type": indicator,
                "error_snippet": snippet,
            }

    return {"has_error": False, "error_type": None, "error_snippet": None}


def truncate_string(s: str, max_len: int = 500) -> str:
    """長すぎる文字列を切り詰める。"""
    if not s or len(s) <= max_len:
        return s or ""
    return s[:max_len] + f"... [truncated, total {len(s)} chars]"


def rotate_log_if_needed(log_path: Path, max_lines: int = MAX_LOG_LINES):
    """ログが肥大化したら古い行を削除する。"""
    if not log_path.exists():
        return
    try:
        lines = log_path.read_text(encoding="utf-8").strip().split("\n")
        if len(lines) > max_lines:
            # 最新の max_lines 行だけ残す
            keep = lines[-max_lines:]
            log_path.write_text("\n".join(keep) + "\n", encoding="utf-8")
    except Exception:
        pass


def update_memory_error_section(error_info: dict, tool_name: str, timestamp: str):
    """エラー発生時に MEMORY.md のエラーセクションを更新する。"""
    if not error_info["has_error"]:
        return

    entry = (
        f"- **{timestamp}** | Tool: `{tool_name}` | "
        f"Type: `{error_info['error_type']}` | "
        f"Snippet: `{truncate_string(error_info['error_snippet'], 120)}`\n"
    )

    marker = "## Recent Errors"
    try:
        if MEMORY_FILE.exists():
            content = MEMORY_FILE.read_text(encoding="utf-8")
        else:
            content = ""

        if marker not in content:
            content += f"\n{marker}\n"

        # マーカーの直後にエントリを挿入
        parts = content.split(marker, 1)
        # 既存エラーエントリ数を制限（最新10件）
        existing = parts[1] if len(parts) > 1 else ""
        lines = [l for l in existing.strip().split("\n") if l.strip().startswith("- **")]
        lines = lines[:9]  # 最新9件 + 新規1件 = 10件
        new_section = "\n" + entry + "\n".join(lines) + "\n"
        content = parts[0] + marker + new_section

        MEMORY_FILE.write_text(content, encoding="utf-8")
    except Exception as e:
        print(f"[observe] Warning: Failed to update MEMORY.md: {e}", file=sys.stderr)


# --- Main --------------------------------------------------------------------

def main():
    """
    stdin から Claude Code のツール実行データ (JSON) を受け取り、
    構造化ログとして記録する。

    期待される入力フォーマット (Claude Code post_tool_use hook):
    {
      "tool_name": "Bash",
      "tool_input": { "command": "..." },
      "tool_result": "...",
      "session_id": "..."
    }
    """
    try:
        raw = sys.stdin.read()
        if not raw.strip():
            return

        data = json.loads(raw)
    except (json.JSONDecodeError, Exception) as e:
        print(f"[observe] Failed to parse input: {e}", file=sys.stderr)
        return

    tool_name = data.get("tool_name", "unknown")

    # ノイズの多いツールはスキップ
    if tool_name in SKIP_TOOLS:
        return

    tool_input = data.get("tool_input", {})
    tool_result = str(data.get("tool_result", ""))
    session_id = data.get("session_id", "unknown")

    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    # エラー検出
    error_info = detect_error(tool_result)

    # 構造化ログエントリ
    log_entry = {
        "timestamp": timestamp,
        "session_id": session_id,
        "tool_name": tool_name,
        "tool_input_summary": truncate_string(json.dumps(tool_input, ensure_ascii=False), 300),
        "result_summary": truncate_string(tool_result, 300),
        "has_error": error_info["has_error"],
        "error_type": error_info["error_type"],
        "error_snippet": error_info["error_snippet"],
    }

    # ログディレクトリ確保
    LOG_DIR.mkdir(parents=True, exist_ok=True)

    # JSONL に追記
    try:
        with open(ACTION_LOG, "a", encoding="utf-8") as f:
            f.write(json.dumps(log_entry, ensure_ascii=False) + "\n")
    except Exception as e:
        print(f"[observe] Failed to write log: {e}", file=sys.stderr)

    # ログローテーション
    rotate_log_if_needed(ACTION_LOG)

    # エラーの場合は MEMORY.md にも記録
    if error_info["has_error"]:
        update_memory_error_section(error_info, tool_name, timestamp)

    # 標準出力に簡易サマリを返す（Claude Code が読める）
    summary = f"[observe] Logged: {tool_name}"
    if error_info["has_error"]:
        summary += f" [ERROR: {error_info['error_type']}]"
    print(summary)


if __name__ == "__main__":
    main()
