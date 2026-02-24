#!/usr/bin/env python3
"""
Self-Evolving Framework Orchestrator
=====================================
3つのフェーズを統合管理するメインエントリーポイント。

フェーズ1 (Observation):  自動（post_tool_use hook 経由）
フェーズ2 (Analysis):     タスク終了時に手動またはスクリプトで実行
フェーズ3 (Evolution):    分析蓄積後に手動またはスケジュールで実行

このスクリプトはフェーズ2 + 3 をまとめて実行するエントリーポイントを提供する。

使い方:
  # タスク完了時（分析 + 進化を一括実行）
  python scripts/orchestrator.py complete --task "機能Xの実装" --result success

  # 進化のみ（スキル抽出 + 難易度調整）
  python scripts/orchestrator.py evolve

  # ステータス確認
  python scripts/orchestrator.py status

  # ログのリセット
  python scripts/orchestrator.py reset
"""

import json
import argparse
import sys
from datetime import datetime, timezone
from pathlib import Path

# Windows コンソールの文字化け対策
if sys.stdout.encoding != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")
if sys.stderr.encoding != "utf-8":
    sys.stderr.reconfigure(encoding="utf-8")

PROJECT_ROOT = Path(__file__).resolve().parent.parent
LOG_DIR = PROJECT_ROOT / "logs"
ANALYSIS_LOG = LOG_DIR / "analysis_log.jsonl"
ACTION_LOG = LOG_DIR / "action_log.jsonl"
DIFFICULTY_STATE_FILE = LOG_DIR / "difficulty_state.json"
MEMORY_FILE = PROJECT_ROOT / "MEMORY.md"
CLAUDE_FILE = PROJECT_ROOT / "CLAUDE.md"

# フェーズ2, 3 のモジュールをインポート
sys.path.insert(0, str(Path(__file__).resolve().parent))
from analyze import load_session_actions, analyze_actions, save_analysis_to_memory, clear_action_log
from evolve import (
    load_analysis_history,
    extract_skills,
    generate_skill_rules,
    update_claude_md_with_skills,
    adjust_difficulty,
    update_claude_md_with_difficulty,
    DIFFICULTY_LEVELS,
)


def cmd_complete(args):
    """タスク完了: フェーズ2 (分析) + フェーズ3 (進化) を一括実行。"""
    print("=" * 60)
    print(f"  Self-Evolving Framework: Task Completion")
    print(f"  Task: {args.task}")
    print(f"  Result: {args.result}")
    print("=" * 60)

    # --- Phase 2: Analysis ---
    print("\n--- Phase 2: Feedback & Analysis ---")
    actions = load_session_actions(args.session_id)
    print(f"Loaded {len(actions)} actions from observation log")

    analysis = analyze_actions(actions, args.result)
    save_analysis_to_memory(args.task, args.result, analysis, args.reason)
    print(f"Analysis saved. Summary: {analysis['summary']}")

    if not args.keep_log:
        clear_action_log()
        print("Action log cleared for next episode.")

    # --- Phase 3: Evolution ---
    print("\n--- Phase 3: Self-Evolution ---")
    history = load_analysis_history()

    # スキル抽出
    skills = extract_skills(history)
    if skills:
        print(f"Extracted {len(skills)} recurring skill patterns:")
        for s in skills:
            print(f"  [{s['frequency']}x] {s['pattern']}")
        skills_text = generate_skill_rules(skills)
        update_claude_md_with_skills(skills_text)
    else:
        print("Not enough data for skill extraction yet.")

    # 難易度調整
    difficulty = adjust_difficulty(history)
    print(f"Success rate: {difficulty['success_rate']:.0%}")
    print(f"Difficulty: Lv.{difficulty['old_level']} -> Lv.{difficulty['new_level']} ({difficulty['level_name']})")
    update_claude_md_with_difficulty(difficulty)

    print("\n" + "=" * 60)
    print("  Evolution cycle complete!")
    print("=" * 60)


def cmd_evolve(args):
    """進化のみ実行: スキル抽出 + 難易度調整。"""
    print("--- Evolution Only ---")
    history = load_analysis_history()
    print(f"Loaded {len(history)} analysis entries")

    skills = extract_skills(history)
    if skills:
        skills_text = generate_skill_rules(skills)
        update_claude_md_with_skills(skills_text)
    else:
        print("No skills to extract yet.")

    difficulty = adjust_difficulty(history)
    update_claude_md_with_difficulty(difficulty)
    print(f"Level: {difficulty['new_level']} ({difficulty['level_name']})")


def cmd_status(args):
    """現在のフレームワーク状態を表示。"""
    print("=" * 60)
    print("  Self-Evolving Framework: Status")
    print("=" * 60)

    # アクションログ
    action_count = 0
    if ACTION_LOG.exists():
        action_count = sum(1 for line in ACTION_LOG.read_text(encoding="utf-8").strip().split("\n") if line.strip())
    print(f"\nPending actions in log: {action_count}")

    # 分析履歴
    history = load_analysis_history()
    print(f"Total analyzed tasks: {len(history)}")
    if history:
        successes = sum(1 for h in history if h.get("task_result") == "success")
        failures = len(history) - successes
        print(f"  Success: {successes}, Failure: {failures}")

        # 直近5タスク
        print("\nRecent tasks:")
        for entry in history[-5:]:
            result_mark = "OK" if entry.get("task_result") == "success" else "NG"
            print(f"  [{result_mark}] {entry.get('task_name', 'unknown')} ({entry.get('timestamp', '?')})")

    # 難易度
    if DIFFICULTY_STATE_FILE.exists():
        try:
            state = json.loads(DIFFICULTY_STATE_FILE.read_text(encoding="utf-8"))
            level = state.get("current_level", 3)
            level_info = DIFFICULTY_LEVELS.get(level, {})
            print(f"\nCurrent difficulty: Lv.{level} - {level_info.get('name', '?')}")
            print(f"  Description: {level_info.get('description', '?')}")
        except Exception:
            print("\nDifficulty state: not initialized")
    else:
        print("\nDifficulty state: not initialized (default Lv.3)")

    # スキル
    skills = extract_skills(history)
    if skills:
        print(f"\nExtracted skills ({len(skills)}):")
        for s in skills:
            print(f"  [{s['frequency']}x] {s['pattern']}")
    else:
        print("\nNo skills extracted yet.")

    print()


def cmd_reset(args):
    """ログと状態をリセットする。"""
    print("Resetting Self-Evolving Framework state...")

    files_to_clear = [ACTION_LOG, ANALYSIS_LOG, DIFFICULTY_STATE_FILE]
    for f in files_to_clear:
        if f.exists():
            f.unlink()
            print(f"  Deleted: {f.name}")

    # MEMORY.md のフレームワークセクションをクリア
    if MEMORY_FILE.exists():
        content = MEMORY_FILE.read_text(encoding="utf-8")
        sections_to_remove = ["## Recent Errors", "## Task Analysis History"]
        for section in sections_to_remove:
            if section in content:
                parts = content.split(section)
                before = parts[0]
                after = parts[1] if len(parts) > 1 else ""
                # 次のセクションを探して残す
                lines = after.split("\n")
                next_idx = None
                for i, line in enumerate(lines):
                    if i > 0 and line.startswith("## ") and line.strip() != section:
                        next_idx = i
                        break
                if next_idx is not None:
                    content = before + "\n".join(lines[next_idx:])
                else:
                    content = before
        MEMORY_FILE.write_text(content.rstrip() + "\n", encoding="utf-8")
        print("  Cleared framework sections from MEMORY.md")

    # CLAUDE.md のフレームワークセクションをクリア
    if CLAUDE_FILE.exists():
        content = CLAUDE_FILE.read_text(encoding="utf-8")
        sections_to_remove = ["## Auto-Extracted Best Practices", "## Current Difficulty Level"]
        for section in sections_to_remove:
            if section in content:
                parts = content.split(section)
                before = parts[0]
                after = parts[1] if len(parts) > 1 else ""
                lines = after.split("\n")
                next_idx = None
                for i, line in enumerate(lines):
                    if i > 0 and line.startswith("## ") and not line.startswith(section.split("(")[0].strip()):
                        next_idx = i
                        break
                if next_idx is not None:
                    content = before + "\n".join(lines[next_idx:])
                else:
                    content = before
        CLAUDE_FILE.write_text(content.rstrip() + "\n", encoding="utf-8")
        print("  Cleared framework sections from CLAUDE.md")

    print("Reset complete.")


# --- Main --------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Self-Evolving Framework Orchestrator",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python scripts/orchestrator.py complete --task "Add login feature" --result success
  python scripts/orchestrator.py complete --task "Fix bug #42" --result failure --reason "Test still failing"
  python scripts/orchestrator.py evolve
  python scripts/orchestrator.py status
  python scripts/orchestrator.py reset
        """,
    )
    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # complete
    p_complete = subparsers.add_parser("complete", help="Report task completion and run full evolution cycle")
    p_complete.add_argument("--task", required=True, help="Task name/description")
    p_complete.add_argument("--result", required=True, choices=["success", "failure"])
    p_complete.add_argument("--reason", default="", help="Additional context (failure reason, etc.)")
    p_complete.add_argument("--session-id", default=None, help="Filter actions by session ID")
    p_complete.add_argument("--keep-log", action="store_true", help="Keep action log after analysis")
    p_complete.set_defaults(func=cmd_complete)

    # evolve
    p_evolve = subparsers.add_parser("evolve", help="Run evolution cycle (skill extraction + difficulty adjustment)")
    p_evolve.set_defaults(func=cmd_evolve)

    # status
    p_status = subparsers.add_parser("status", help="Show current framework status")
    p_status.set_defaults(func=cmd_status)

    # reset
    p_reset = subparsers.add_parser("reset", help="Reset all logs and state")
    p_reset.set_defaults(func=cmd_reset)

    args = parser.parse_args()
    if not args.command:
        parser.print_help()
        sys.exit(1)

    args.func(args)


if __name__ == "__main__":
    main()
