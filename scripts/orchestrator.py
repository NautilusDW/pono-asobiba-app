#!/usr/bin/env python3
"""
Self-Evolving Framework Orchestrator
=====================================
3つのフェーズを統合管理するメインエントリーポイント。

フェーズ1 (Observation):  complete 実行時にトランスクリプトから自動抽出
フェーズ2 (Analysis):     タスク終了時に自動実行
フェーズ3 (Evolution):    分析後に自動実行

このスクリプトはフェーズ1 + 2 + 3 をまとめて実行するエントリーポイントを提供する。

使い方:
  # タスク完了時（分析 + 進化を一括実行）
  python scripts/orchestrator.py complete --task "機能Xの実装" --result success

  # 進化のみ（スキル抽出 + 難易度調整）
  python scripts/orchestrator.py evolve

  # ステータス確認
  python scripts/orchestrator.py status

  # MEMORY.md 圧縮（トピック別分離 + 行数圧縮）
  python scripts/orchestrator.py compress

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

# Auto-memory (Claude Code が自動で読み込む MEMORY.md)
_AUTO_MEMORY_DIR = (
    Path.home() / ".claude" / "projects"
    / "d--AppDevelopment-storyboard-generator" / "memory"
)
AUTO_MEMORY_FILE = _AUTO_MEMORY_DIR / "MEMORY.md"
MAX_MEMORY_LINES = 190  # 200行上限に余裕を持たせる

# フェーズ2, 3 のモジュールをインポート
sys.path.insert(0, str(Path(__file__).resolve().parent))
from observe import find_latest_transcript, extract_tool_calls_from_transcript, save_actions_to_log
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

    # --- Phase 1: Observation (トランスクリプトからログ抽出) ---
    print("\n--- Phase 1: Observation ---")
    transcript = find_latest_transcript()
    if transcript:
        print(f"Transcript: {transcript.name}")
        extracted = extract_tool_calls_from_transcript(transcript)
        print(f"Extracted {len(extracted)} tool calls from transcript")
        if extracted:
            save_actions_to_log(extracted)
    else:
        print("No transcript found. Using existing action log if available.")

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


def cmd_compress(args):
    """MEMORY.md をトピック別ファイルに分離し、200行以下に圧縮する。"""
    import re
    import shutil

    memory_file = AUTO_MEMORY_FILE
    memory_dir = _AUTO_MEMORY_DIR

    if not memory_file.exists():
        print(f"MEMORY.md not found: {memory_file}")
        return

    content = memory_file.read_text(encoding="utf-8")
    lines = content.split("\n")
    print(f"Current MEMORY.md: {len(lines)} lines")

    if len(lines) <= MAX_MEMORY_LINES and not args.force:
        print(f"Already under {MAX_MEMORY_LINES} lines. Use --force to compress anyway.")
        return

    # バックアップ
    backup = memory_dir / "MEMORY.md.bak"
    shutil.copy2(str(memory_file), str(backup))
    print(f"Backup saved: {backup}")

    # セクション単位でパース
    sections: list[dict] = []  # {title, lines, line_count}
    current_title = ""
    current_lines: list[str] = []

    for line in lines:
        if line.startswith("## "):
            if current_title or current_lines:
                sections.append({
                    "title": current_title,
                    "lines": current_lines,
                    "line_count": len(current_lines),
                })
            current_title = line
            current_lines = []
        else:
            current_lines.append(line)

    if current_title or current_lines:
        sections.append({
            "title": current_title,
            "lines": current_lines,
            "line_count": len(current_lines),
        })

    # トピック別分離マッピング
    topic_map = {
        "ai-image.md": [
            "AI画像生成", "参照画像システム", "デザイン参照検索",
            "スタイルREF", "構図REF",
        ],
        "video-gen.md": [
            "AI動画生成", "Airtable", "マスターデータ選択方式",
        ],
        "features.md": [
            "3D Shot Generator", "アノテーション", "ファイル管理",
            "マイルストーン", "ビジュアライゼーション", "TTS",
            "SUNO BGM", "Export System", "AI構成アシスト",
            "LP素材", "その他実装済み",
        ],
        "architecture.md": [
            "Architecture", "Key Files", "React Route",
            "Legacy Python", "base64外部化", "ストレージ管理",
            "Intelligence Data",
        ],
    }

    def match_topic(title: str) -> str | None:
        """セクションタイトルがどのトピックファイルに属するか判定"""
        for filename, keywords in topic_map.items():
            for kw in keywords:
                if kw in title:
                    return filename
        return None

    # 分離対象を振り分け
    keep_sections: list[dict] = []  # MEMORY.md に残す
    topic_sections: dict[str, list[dict]] = {}  # 分離先ファイル別

    for sec in sections:
        topic = match_topic(sec["title"])
        if topic and sec["line_count"] > 3:
            topic_sections.setdefault(topic, []).append(sec)
        else:
            keep_sections.append(sec)

    # トピックファイルに書き出し
    for filename, secs in topic_sections.items():
        topic_path = memory_dir / filename
        topic_content = f"# {filename.replace('.md', '').replace('-', ' ').title()} - 詳細メモ\n\n"
        topic_content += f"_MEMORY.md から分離された詳細情報。最終更新: {datetime.now().strftime('%Y-%m-%d')}_\n\n"
        for sec in secs:
            topic_content += sec["title"] + "\n"
            topic_content += "\n".join(sec["lines"]) + "\n"
        topic_path.write_text(topic_content.rstrip() + "\n", encoding="utf-8")
        total_lines = sum(s["line_count"] for s in secs)
        print(f"  {filename}: {len(secs)} sections, {total_lines} lines moved")

    # MEMORY.md を再構成（インデックス + 残りセクション）
    header = "# Storyboard Generator - Project Memory\n\n"

    # トピックファイルへのインデックス
    if topic_sections:
        header += "## Topic Files (詳細はこちら)\n"
        for filename in sorted(topic_sections.keys()):
            secs = topic_sections[filename]
            titles = ", ".join(s["title"].replace("## ", "") for s in secs[:3])
            if len(secs) > 3:
                titles += f" 他{len(secs)-3}件"
            header += f"- `memory/{filename}` — {titles}\n"
        header += "\n"

    # 残りセクションを書き出し（重複ヘッダーをスキップ）
    body = ""
    for sec in keep_sections:
        title = sec["title"]
        # トップレベルヘッダー # の重複を防ぐ
        if title.startswith("# ") and not title.startswith("## "):
            continue
        if title:
            body += title + "\n"
        body += "\n".join(sec["lines"]) + "\n"

    new_content = header + body

    # ステップB: まだ長い場合は行数圧縮
    new_lines = new_content.split("\n")
    if len(new_lines) > MAX_MEMORY_LINES:
        print(f"  Still {len(new_lines)} lines after topic separation. Compressing...")
        compressed = []
        in_code_block = False
        skip_until_section = False

        for line in new_lines:
            if line.startswith("```"):
                in_code_block = not in_code_block
                if in_code_block:
                    compressed.append("  (コード例省略)")
                    skip_until_section = True
                continue
            if in_code_block:
                continue
            if skip_until_section and not line.startswith("## "):
                continue
            skip_until_section = False
            compressed.append(line)

        new_content = "\n".join(compressed)

    # 末尾の空行を整理
    new_content = re.sub(r"\n{3,}", "\n\n", new_content).rstrip() + "\n"

    memory_file.write_text(new_content, encoding="utf-8")
    final_lines = len(new_content.split("\n"))
    print(f"\nMEMORY.md compressed: {len(lines)} -> {final_lines} lines")
    if final_lines <= MAX_MEMORY_LINES:
        print(f"Under {MAX_MEMORY_LINES} line limit.")
    else:
        print(f"WARNING: Still {final_lines} lines. Manual trimming may be needed.")


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

    # compress
    p_compress = subparsers.add_parser("compress", help="Compress MEMORY.md (topic separation + line reduction)")
    p_compress.add_argument("--force", action="store_true", help="Compress even if under limit")
    p_compress.set_defaults(func=cmd_compress)

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
