#!/usr/bin/env python3
"""
Phase 1: Observation (Transcript-Based)
========================================
Claude Code のトランスクリプト JSONL を直接解析し、
全ツール呼び出しを構造化ログとして抽出する。

方式:
  旧: PostToolUse フック (セッション中に設定が読み込まれない問題あり)
  新: ~/.claude/projects/ に保存されるトランスクリプトを直接パースする

使い方:
  # 最新トランスクリプトから自動抽出
  python scripts/observe.py

  # 特定のトランスクリプトを指定
  python scripts/observe.py --transcript /path/to/session.jsonl

  # PostToolUse フック経由 (stdin から読み取り、従来互換)
  python scripts/observe.py --hook
"""

import json
import sys
import os
import glob
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

# プロジェクトパスからトランスクリプトディレクトリを推定
# D:\AppDevelopment\storyboard generator → d--AppDevelopment-storyboard-generator
_project_path = str(PROJECT_ROOT).replace("\\", "/")
# ドライブレター小文字化 + パス区切り正規化 + スペース→ハイフン
_drive, _rest = _project_path.split(":/", 1) if ":/" in _project_path else ("", _project_path)
_project_key = (_drive.lower() + "--" + _rest.replace("/", "-").replace(" ", "-")) if _drive else _project_path.replace("/", "-").replace(" ", "-")
CLAUDE_HOME = Path.home() / ".claude"
TRANSCRIPT_DIR = CLAUDE_HOME / "projects" / _project_key

ERROR_INDICATORS = [
    "error", "Error", "ERROR",
    "failed", "Failed", "FAILED",
    "traceback", "Traceback",
    "exception", "Exception",
]

SKIP_TOOLS = {"TodoWrite", "TodoRead", "AskUserQuestion"}

MAX_LOG_LINES = 500


# --- Helpers -----------------------------------------------------------------

def detect_error(result_text: str) -> dict:
    if not result_text:
        return {"has_error": False, "error_type": None, "error_snippet": None}
    for indicator in ERROR_INDICATORS:
        if indicator in result_text:
            idx = result_text.find(indicator)
            start = max(0, idx - 50)
            end = min(len(result_text), idx + 200)
            snippet = result_text[start:end].strip()
            return {"has_error": True, "error_type": indicator, "error_snippet": snippet}
    return {"has_error": False, "error_type": None, "error_snippet": None}


def truncate_string(s: str, max_len: int = 500) -> str:
    if not s or len(s) <= max_len:
        return s or ""
    return s[:max_len] + f"... [truncated, total {len(s)} chars]"


def rotate_log_if_needed(log_path: Path, max_lines: int = MAX_LOG_LINES):
    if not log_path.exists():
        return
    try:
        lines = log_path.read_text(encoding="utf-8").strip().split("\n")
        if len(lines) > max_lines:
            keep = lines[-max_lines:]
            log_path.write_text("\n".join(keep) + "\n", encoding="utf-8")
    except Exception:
        pass


# --- Transcript Parsing ------------------------------------------------------

def find_latest_transcript() -> Path | None:
    """このプロジェクトの最新トランスクリプトファイルを見つける。"""
    if not TRANSCRIPT_DIR.exists():
        print(f"[observe] Transcript dir not found: {TRANSCRIPT_DIR}", file=sys.stderr)
        return None

    # ディレクトリ直下の .jsonl ファイル（サブディレクトリのは除外）
    candidates = [
        f for f in TRANSCRIPT_DIR.glob("*.jsonl")
        if f.is_file()
    ]

    if not candidates:
        print(f"[observe] No transcript files found in {TRANSCRIPT_DIR}", file=sys.stderr)
        return None

    # 最終更新日時が最も新しいものを選択
    latest = max(candidates, key=lambda f: f.stat().st_mtime)
    return latest


def extract_tool_calls_from_transcript(transcript_path: Path) -> list[dict]:
    """
    トランスクリプト JSONL からツール呼び出しと結果を抽出する。

    トランスクリプトの構造:
    - type=assistant の message.content に type=tool_use エントリがある
    - type=tool_result の message.content に対応する結果がある
    """
    tool_uses = {}   # tool_use_id -> {name, input, timestamp}
    tool_results = {}  # tool_use_id -> result_text
    actions = []

    lines = transcript_path.read_text(encoding="utf-8").strip().split("\n")

    for line in lines:
        if not line.strip():
            continue
        try:
            entry = json.loads(line)
        except json.JSONDecodeError:
            continue

        entry_type = entry.get("type", "")
        timestamp = entry.get("timestamp", "")
        session_id = entry.get("sessionId", "unknown")
        message = entry.get("message", {})
        content_blocks = message.get("content", [])

        if not isinstance(content_blocks, list):
            continue

        for block in content_blocks:
            if not isinstance(block, dict):
                continue

            # ツール呼び出し
            if block.get("type") == "tool_use":
                tool_id = block.get("id", "")
                tool_uses[tool_id] = {
                    "name": block.get("name", "unknown"),
                    "input": block.get("input", {}),
                    "timestamp": timestamp,
                    "session_id": session_id,
                }

            # ツール結果
            if block.get("type") == "tool_result":
                tool_id = block.get("tool_use_id", "")
                result_content = block.get("content", "")
                if isinstance(result_content, list):
                    # content が配列の場合、テキスト部分を結合
                    parts = []
                    for item in result_content:
                        if isinstance(item, dict) and item.get("type") == "text":
                            parts.append(item.get("text", ""))
                        elif isinstance(item, str):
                            parts.append(item)
                    result_content = "\n".join(parts)
                elif isinstance(result_content, dict):
                    result_content = json.dumps(result_content, ensure_ascii=False)
                tool_results[tool_id] = str(result_content)

    # tool_use と tool_result をマッチングしてアクションリストを構築
    for tool_id, use_info in tool_uses.items():
        tool_name = use_info["name"]

        if tool_name in SKIP_TOOLS:
            continue

        tool_input = use_info["input"]
        result_text = tool_results.get(tool_id, "")
        error_info = detect_error(result_text)

        actions.append({
            "timestamp": use_info["timestamp"],
            "session_id": use_info["session_id"],
            "tool_name": tool_name,
            "tool_input_summary": truncate_string(
                json.dumps(tool_input, ensure_ascii=False), 300
            ),
            "result_summary": truncate_string(result_text, 300),
            "has_error": error_info["has_error"],
            "error_type": error_info["error_type"],
            "error_snippet": error_info["error_snippet"],
        })

    return actions


def save_actions_to_log(actions: list[dict]):
    """抽出したアクションを action_log.jsonl に保存する。"""
    LOG_DIR.mkdir(parents=True, exist_ok=True)

    with open(ACTION_LOG, "w", encoding="utf-8") as f:
        for action in actions:
            f.write(json.dumps(action, ensure_ascii=False) + "\n")

    rotate_log_if_needed(ACTION_LOG)


# --- Hook Mode (従来互換) ----------------------------------------------------

def run_hook_mode():
    """PostToolUse フック経由で stdin からデータを受け取るモード。"""
    LOG_DIR.mkdir(parents=True, exist_ok=True)

    raw = ""
    try:
        raw = sys.stdin.read()
        if not raw.strip():
            return
        data = json.loads(raw)
    except (json.JSONDecodeError, Exception) as e:
        print(f"[observe] Failed to parse hook input: {e}", file=sys.stderr)
        return

    tool_name = data.get("tool_name", "unknown")
    if tool_name in SKIP_TOOLS:
        return

    tool_input = data.get("tool_input", {})
    raw_response = data.get("tool_response", data.get("tool_result", ""))
    if isinstance(raw_response, (dict, list)):
        tool_result = json.dumps(raw_response, ensure_ascii=False)
    else:
        tool_result = str(raw_response) if raw_response is not None else ""

    session_id = data.get("session_id", "unknown")
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    error_info = detect_error(tool_result)

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

    with open(ACTION_LOG, "a", encoding="utf-8") as f:
        f.write(json.dumps(log_entry, ensure_ascii=False) + "\n")

    rotate_log_if_needed(ACTION_LOG)
    print(f"[observe] Logged: {tool_name}")


# --- Main --------------------------------------------------------------------

def main():
    import argparse

    parser = argparse.ArgumentParser(
        description="Phase 1: トランスクリプトからツール呼び出しを抽出"
    )
    parser.add_argument(
        "--transcript", type=str, default=None,
        help="解析対象のトランスクリプトファイルパス (省略時は最新を自動検出)"
    )
    parser.add_argument(
        "--hook", action="store_true",
        help="PostToolUse フックモード (stdin から読み取り)"
    )
    args = parser.parse_args()

    # フックモード
    if args.hook:
        run_hook_mode()
        return

    # トランスクリプト解析モード（メイン）
    if args.transcript:
        transcript_path = Path(args.transcript)
    else:
        transcript_path = find_latest_transcript()

    if not transcript_path or not transcript_path.exists():
        print("[observe] No transcript found. No actions to extract.")
        return

    print(f"[observe] Parsing transcript: {transcript_path.name}")
    actions = extract_tool_calls_from_transcript(transcript_path)
    print(f"[observe] Extracted {len(actions)} tool calls")

    if actions:
        save_actions_to_log(actions)
        print(f"[observe] Saved to {ACTION_LOG}")

        error_count = sum(1 for a in actions if a["has_error"])
        if error_count:
            print(f"[observe] Detected {error_count} errors")
    else:
        print("[observe] No tool calls found in transcript.")


if __name__ == "__main__":
    main()
