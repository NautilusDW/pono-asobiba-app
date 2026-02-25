#!/usr/bin/env python3
"""
Phase 2: Feedback & Analysis
=============================
タスク完了後に行動ログを振り返り、成功/失敗要因を分析して MEMORY.md に蓄積する。

RLマッピング:
  - エピソード完了後の「一貫性フィードバック (Hindsight Feedback)」を担う。
  - ログ全体から報酬シグナルを逆算し、各アクションの有効性を推定する。

使い方:
  python scripts/analyze.py --task "タスク名" --result success
  python scripts/analyze.py --task "タスク名" --result failure --reason "テストが通らなかった"
"""

import json
import argparse
import sys
from datetime import datetime, timezone
from pathlib import Path
from collections import Counter

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
ANALYSIS_LOG = LOG_DIR / "analysis_log.jsonl"

# --- Analysis Heuristics -----------------------------------------------------

# ツール使用パターンと、そのパターンが成功に寄与しやすいかの定義
POSITIVE_PATTERNS = {
    "test_first": {
        "description": "テストを先に書いてから実装した (TDD)",
        "detector": lambda actions: _detect_test_first(actions),
    },
    "read_before_edit": {
        "description": "編集前にファイルを読んで理解した",
        "detector": lambda actions: _detect_read_before_edit(actions),
    },
    "incremental_validation": {
        "description": "小さな単位で検証しながら進めた",
        "detector": lambda actions: _detect_incremental_validation(actions),
    },
    "error_recovery": {
        "description": "エラー発生後に別のアプローチに切り替えた",
        "detector": lambda actions: _detect_error_recovery(actions),
    },
    "exploration_first": {
        "description": "実装前にコードベースを探索した",
        "detector": lambda actions: _detect_exploration_first(actions),
    },
}

NEGATIVE_PATTERNS = {
    "blind_edit": {
        "description": "ファイルを読まずに編集しようとした",
        "detector": lambda actions: _detect_blind_edit(actions),
    },
    "repeated_errors": {
        "description": "同じエラーを繰り返した",
        "detector": lambda actions: _detect_repeated_errors(actions),
    },
    "no_testing": {
        "description": "テストを一切実行しなかった",
        "detector": lambda actions: _detect_no_testing(actions),
    },
}


# --- Pattern Detectors -------------------------------------------------------

def _detect_test_first(actions: list[dict]) -> bool:
    """テスト関連のアクションが編集アクションより先にあるか。"""
    first_test_idx = None
    first_edit_idx = None
    for i, a in enumerate(actions):
        name = a.get("tool_name", "")
        inp = a.get("tool_input_summary", "")
        if name == "Bash" and ("test" in inp.lower() or "pytest" in inp.lower()):
            if first_test_idx is None:
                first_test_idx = i
        if name in ("Edit", "Write"):
            if first_edit_idx is None:
                first_edit_idx = i
    if first_test_idx is not None and first_edit_idx is not None:
        return first_test_idx < first_edit_idx
    return False


def _detect_read_before_edit(actions: list[dict]) -> bool:
    """Edit の前に同じファイルの Read があるか。"""
    read_files = set()
    for a in actions:
        name = a.get("tool_name", "")
        inp = a.get("tool_input_summary", "")
        if name == "Read":
            # ファイルパスを簡易抽出
            read_files.add(inp[:100])
        if name == "Edit":
            # Read 済みファイルがあれば OK
            if read_files:
                return True
    return False


def _detect_incremental_validation(actions: list[dict]) -> bool:
    """Bash (テスト/ビルド) が複数回あり、Edit/Write と交互に実行されているか。"""
    bash_count = 0
    edit_count = 0
    alternations = 0
    last_type = None
    for a in actions:
        name = a.get("tool_name", "")
        if name == "Bash":
            bash_count += 1
            if last_type == "edit":
                alternations += 1
            last_type = "bash"
        elif name in ("Edit", "Write"):
            edit_count += 1
            if last_type == "bash":
                alternations += 1
            last_type = "edit"
    return alternations >= 2


def _detect_error_recovery(actions: list[dict]) -> bool:
    """エラー後にアプローチを変えているか（異なるツールや入力に切り替え）。"""
    for i, a in enumerate(actions):
        if a.get("has_error") and i + 1 < len(actions):
            next_a = actions[i + 1]
            # 同じツール・同じ入力でなければリカバリとみなす
            if (next_a.get("tool_name") != a.get("tool_name") or
                    next_a.get("tool_input_summary") != a.get("tool_input_summary")):
                return True
    return False


def _detect_exploration_first(actions: list[dict]) -> bool:
    """最初の数アクションが探索系（Read, Glob, Grep）か。"""
    explore_tools = {"Read", "Glob", "Grep", "Task"}
    first_n = actions[:5]
    if not first_n:
        return False
    explore_count = sum(1 for a in first_n if a.get("tool_name") in explore_tools)
    return explore_count >= 3


def _detect_blind_edit(actions: list[dict]) -> bool:
    """Read なしで Edit が発生しているか。"""
    has_read = False
    for a in actions:
        if a.get("tool_name") == "Read":
            has_read = True
        if a.get("tool_name") == "Edit" and not has_read:
            return True
    return False


def _detect_repeated_errors(actions: list[dict]) -> bool:
    """同じエラータイプが3回以上出現しているか。"""
    error_types = [a.get("error_type") for a in actions if a.get("has_error") and a.get("error_type")]
    counter = Counter(error_types)
    return any(v >= 3 for v in counter.values())


def _detect_no_testing(actions: list[dict]) -> bool:
    """テスト実行が一切ないか。"""
    for a in actions:
        inp = a.get("tool_input_summary", "").lower()
        if a.get("tool_name") == "Bash" and ("test" in inp or "pytest" in inp or "jest" in inp or "npm run test" in inp):
            return False
    return True


# --- Core Analysis -----------------------------------------------------------

def load_session_actions(session_id: str = None) -> list[dict]:
    """アクションログから指定セッション（または全体）のログを読み込む。"""
    if not ACTION_LOG.exists():
        return []

    actions = []
    for line in ACTION_LOG.read_text(encoding="utf-8").strip().split("\n"):
        if not line.strip():
            continue
        try:
            entry = json.loads(line)
            if session_id is None or entry.get("session_id") == session_id:
                actions.append(entry)
        except json.JSONDecodeError:
            continue
    return actions


def analyze_actions(actions: list[dict], task_result: str) -> dict:
    """アクションリストを分析し、成功/失敗要因を抽出する。"""
    if not actions:
        return {
            "positive_patterns": [],
            "negative_patterns": [],
            "effective_actions": [],
            "tool_usage": {},
            "error_count": 0,
            "total_actions": 0,
            "summary": "行動ログが空のため分析できません。",
        }

    # ツール使用統計
    tool_counter = Counter(a.get("tool_name", "unknown") for a in actions)
    error_count = sum(1 for a in actions if a.get("has_error"))

    # パターン検出
    detected_positive = []
    for key, pattern in POSITIVE_PATTERNS.items():
        if pattern["detector"](actions):
            detected_positive.append({
                "pattern": key,
                "description": pattern["description"],
            })

    detected_negative = []
    for key, pattern in NEGATIVE_PATTERNS.items():
        if pattern["detector"](actions):
            detected_negative.append({
                "pattern": key,
                "description": pattern["description"],
            })

    # 有効/非有効パターンの判定（結果に応じて重み付けを変える）
    if task_result == "success":
        effective = detected_positive
        ineffective = detected_negative
        summary_parts = [f"成功タスク: {len(effective)}個の有効パターンを検出。"]
        if ineffective:
            summary_parts.append(f"改善余地: {len(ineffective)}個の非効率パターンあり。")
    else:
        effective = []
        ineffective = detected_positive + detected_negative  # 失敗時は全パターンを再評価
        summary_parts = [f"失敗タスク: エラー{error_count}件。"]
        if detected_negative:
            summary_parts.append(f"失敗要因候補: {', '.join(p['description'] for p in detected_negative)}")

    return {
        "positive_patterns": [p["description"] for p in detected_positive],
        "negative_patterns": [p["description"] for p in detected_negative],
        "effective_actions": [p["description"] for p in effective],
        "tool_usage": dict(tool_counter),
        "error_count": error_count,
        "total_actions": len(actions),
        "summary": " ".join(summary_parts),
    }


def save_analysis_to_memory(task_name: str, task_result: str, analysis: dict, reason: str = ""):
    """分析結果を MEMORY.md に構造化フォーマットで追記する。"""
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    effective_str = ", ".join(analysis["effective_actions"]) if analysis["effective_actions"] else "特になし"
    positive_str = ", ".join(analysis["positive_patterns"]) if analysis["positive_patterns"] else "なし"
    negative_str = ", ".join(analysis["negative_patterns"]) if analysis["negative_patterns"] else "なし"

    entry = f"""
### {timestamp} - {task_name}
- **タスク**: {task_name}
- **結果**: {"成功" if task_result == "success" else "失敗"}
- **理由**: {reason if reason else "N/A"}
- **総アクション数**: {analysis["total_actions"]}
- **エラー数**: {analysis["error_count"]}
- **検出された良いパターン**: {positive_str}
- **検出された悪いパターン**: {negative_str}
- **有効だったアクション**: {effective_str}
- **ツール使用統計**: {json.dumps(analysis["tool_usage"], ensure_ascii=False)}
- **サマリ**: {analysis["summary"]}
"""

    marker = "## Task Analysis History"
    try:
        if MEMORY_FILE.exists():
            content = MEMORY_FILE.read_text(encoding="utf-8")
        else:
            content = ""

        if marker not in content:
            content += f"\n{marker}\n"

        parts = content.split(marker, 1)
        content = parts[0] + marker + "\n" + entry + (parts[1] if len(parts) > 1 else "")
        MEMORY_FILE.write_text(content, encoding="utf-8")
    except Exception as e:
        print(f"[analyze] Warning: Failed to update MEMORY.md: {e}", file=sys.stderr)

    # 分析ログにも保存
    log_entry = {
        "timestamp": timestamp,
        "task_name": task_name,
        "task_result": task_result,
        "reason": reason,
        "analysis": analysis,
    }
    try:
        LOG_DIR.mkdir(parents=True, exist_ok=True)
        with open(ANALYSIS_LOG, "a", encoding="utf-8") as f:
            f.write(json.dumps(log_entry, ensure_ascii=False) + "\n")
    except Exception as e:
        print(f"[analyze] Warning: Failed to write analysis log: {e}", file=sys.stderr)


def clear_action_log():
    """分析完了後にアクションログをクリアする（次のエピソードに備える）。"""
    if ACTION_LOG.exists():
        # バックアップしてからクリア
        backup = ACTION_LOG.with_suffix(f".{datetime.now().strftime('%Y%m%d%H%M%S')}.bak")
        try:
            ACTION_LOG.rename(backup)
        except Exception:
            # バックアップ失敗時は単にクリア
            ACTION_LOG.write_text("", encoding="utf-8")


# --- CLI Entry Point ---------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Phase 2: タスク完了後のフィードバック分析")
    parser.add_argument("--task", required=True, help="タスク名")
    parser.add_argument("--result", required=True, choices=["success", "failure"], help="タスクの結果")
    parser.add_argument("--reason", default="", help="失敗理由など補足情報")
    parser.add_argument("--session-id", default=None, help="分析対象のセッションID")
    parser.add_argument("--keep-log", action="store_true", help="分析後もアクションログを残す")
    args = parser.parse_args()

    print(f"[analyze] Analyzing task: {args.task} (result: {args.result})")

    # ログ読み込み
    actions = load_session_actions(args.session_id)
    print(f"[analyze] Loaded {len(actions)} actions from log")

    # 分析
    analysis = analyze_actions(actions, args.result)

    # 結果を表示
    print(f"[analyze] Summary: {analysis['summary']}")
    print(f"[analyze] Positive patterns: {analysis['positive_patterns']}")
    print(f"[analyze] Negative patterns: {analysis['negative_patterns']}")
    print(f"[analyze] Tool usage: {analysis['tool_usage']}")

    # MEMORY.md に保存
    save_analysis_to_memory(args.task, args.result, analysis, args.reason)
    print(f"[analyze] Results saved to MEMORY.md")

    # ログクリア
    if not args.keep_log:
        clear_action_log()
        print(f"[analyze] Action log cleared for next episode")

    return analysis


if __name__ == "__main__":
    main()
