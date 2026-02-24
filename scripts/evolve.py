#!/usr/bin/env python3
"""
Phase 3: Self-Evolution & Dynamic Difficulty Adjustment
=======================================================
蓄積された知見からスキルを抽出して CLAUDE.md に組み込み、
成功率に基づいてタスク指示の難易度（抽象度）を調整する。

RLマッピング:
  - スキル抽出: 方策 (Policy) の事前知識を更新する。
  - 難易度調整: 環境 (Environment) のカリキュラムを動的に変更する。

使い方:
  python scripts/evolve.py                    # スキル抽出 + 難易度調整の両方を実行
  python scripts/evolve.py --extract-only     # スキル抽出のみ
  python scripts/evolve.py --difficulty-only  # 難易度調整のみ
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
ANALYSIS_LOG = LOG_DIR / "analysis_log.jsonl"
MEMORY_FILE = PROJECT_ROOT / "MEMORY.md"
CLAUDE_FILE = PROJECT_ROOT / "CLAUDE.md"
DIFFICULTY_STATE_FILE = LOG_DIR / "difficulty_state.json"

# 難易度レベル定義
DIFFICULTY_LEVELS = {
    1: {
        "name": "具体的指示 (Concrete)",
        "description": "具体的なファイルパス・行番号・変更内容を含む詳細な指示",
        "example": "src/utils/validator.py の42行目に、input が None の場合に ValueError を返す null チェックを追加してください。",
        "template": "{file_path} の {line_number} 行目に {specific_change} を追加してください。",
    },
    2: {
        "name": "ファイル指定 (File-Scoped)",
        "description": "対象ファイルは指定するが、具体的な変更は任せる指示",
        "example": "src/utils/validator.py のバリデーション関数にエラーハンドリングを追加してください。",
        "template": "{file_path} の {function_name} に {general_change} を追加してください。",
    },
    3: {
        "name": "機能指定 (Feature-Scoped)",
        "description": "対象機能は指定するが、ファイルの特定は任せる指示",
        "example": "バリデーション機能のエラーハンドリングを改善してください。",
        "template": "{feature_name} の {aspect} を改善してください。",
    },
    4: {
        "name": "目標指定 (Goal-Oriented)",
        "description": "達成目標のみ指定し、方法はすべて任せる指示",
        "example": "入力の堅牢性を高めてください。",
        "template": "{high_level_goal} を達成してください。",
    },
    5: {
        "name": "抽象指示 (Abstract)",
        "description": "非常に抽象的な指示で、問題の発見から解決まですべてを任せる",
        "example": "コード品質を向上させてください。",
        "template": "{abstract_objective}",
    },
}

# スキル抽出の最小出現回数（このパターンが N 回以上検出されたらスキルとして認定）
SKILL_THRESHOLD = 2

# 難易度調整のしきい値
HIGH_SUCCESS_RATE = 0.80
LOW_SUCCESS_RATE = 0.20

# 難易度計算に使う最近のタスク数
RECENT_TASK_WINDOW = 10


# --- Skill Extraction --------------------------------------------------------

def load_analysis_history() -> list[dict]:
    """分析ログ全体を読み込む。"""
    if not ANALYSIS_LOG.exists():
        return []

    entries = []
    for line in ANALYSIS_LOG.read_text(encoding="utf-8").strip().split("\n"):
        if not line.strip():
            continue
        try:
            entries.append(json.loads(line))
        except json.JSONDecodeError:
            continue
    return entries


def extract_skills(history: list[dict]) -> list[dict]:
    """
    分析履歴から繰り返し出現する成功パターンを「スキル」として抽出する。
    """
    # 成功タスクの positive_patterns を集計
    pattern_counter = Counter()
    pattern_contexts = {}  # パターン -> 出現したタスク名リスト

    for entry in history:
        if entry.get("task_result") != "success":
            continue
        analysis = entry.get("analysis", {})
        patterns = analysis.get("positive_patterns", [])
        for p in patterns:
            pattern_counter[p] += 1
            if p not in pattern_contexts:
                pattern_contexts[p] = []
            pattern_contexts[p].append(entry.get("task_name", "unknown"))

    # しきい値以上のパターンをスキルとして抽出
    skills = []
    for pattern, count in pattern_counter.most_common():
        if count >= SKILL_THRESHOLD:
            skills.append({
                "pattern": pattern,
                "frequency": count,
                "contexts": pattern_contexts[pattern][:5],  # 最新5件のコンテキスト
            })

    return skills


def generate_skill_rules(skills: list[dict]) -> str:
    """スキルリストから CLAUDE.md に追記するルール文を生成する。"""
    if not skills:
        return ""

    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    lines = [
        f"\n## Auto-Extracted Best Practices (Updated: {timestamp})",
        "",
        "以下のルールは過去のタスク実績から自動抽出されたベストプラクティスです。",
        "",
    ]

    for i, skill in enumerate(skills, 1):
        freq = skill["frequency"]
        contexts = ", ".join(skill["contexts"][:3])
        lines.append(f"{i}. **{skill['pattern']}** (検出回数: {freq}, 例: {contexts})")

    lines.append("")
    return "\n".join(lines)


def update_claude_md_with_skills(skills_text: str):
    """CLAUDE.md のスキルセクションを更新する（既存セクションがあれば置換）。"""
    if not skills_text:
        print("[evolve] No skills to extract. Skipping CLAUDE.md update.")
        return

    marker_start = "## Auto-Extracted Best Practices"
    marker_end = "## "  # 次のセクションの開始

    try:
        if CLAUDE_FILE.exists():
            content = CLAUDE_FILE.read_text(encoding="utf-8")
        else:
            content = "# CLAUDE.md - Project Intelligence\n"

        if marker_start in content:
            # 既存セクションを置換
            before = content.split(marker_start)[0]
            after_parts = content.split(marker_start, 1)[1]
            # 次のセクションを探す
            remaining_lines = after_parts.split("\n")
            next_section_idx = None
            for i, line in enumerate(remaining_lines):
                if i > 0 and line.startswith("## ") and not line.startswith("## Auto-Extracted"):
                    next_section_idx = i
                    break
            if next_section_idx is not None:
                after = "\n".join(remaining_lines[next_section_idx:])
                content = before + skills_text + "\n" + after
            else:
                content = before + skills_text
        else:
            content += "\n" + skills_text

        CLAUDE_FILE.write_text(content, encoding="utf-8")
        print(f"[evolve] Updated CLAUDE.md with {len(skills_text.splitlines())} lines of best practices")
    except Exception as e:
        print(f"[evolve] Error updating CLAUDE.md: {e}", file=sys.stderr)


# --- Dynamic Difficulty Adjustment -------------------------------------------

def calculate_success_rate(history: list[dict], window: int = RECENT_TASK_WINDOW) -> float:
    """直近 N タスクの成功率を計算する。"""
    recent = history[-window:] if len(history) >= window else history
    if not recent:
        return 0.5  # データなし → 中間値

    successes = sum(1 for e in recent if e.get("task_result") == "success")
    return successes / len(recent)


def load_difficulty_state() -> dict:
    """現在の難易度状態を読み込む。"""
    default = {
        "current_level": 3,
        "history": [],
        "last_updated": None,
    }
    if DIFFICULTY_STATE_FILE.exists():
        try:
            return json.loads(DIFFICULTY_STATE_FILE.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, Exception):
            return default
    return default


def save_difficulty_state(state: dict):
    """難易度状態を保存する。"""
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    DIFFICULTY_STATE_FILE.write_text(
        json.dumps(state, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def adjust_difficulty(history: list[dict]) -> dict:
    """
    成功率に基づいて難易度レベルを調整する。

    - 成功率 > 80%: レベルを1つ上げる（より抽象的な指示へ）
    - 成功率 < 20%: レベルを1つ下げる（より具体的な指示へ）
    - その他: レベル維持
    """
    state = load_difficulty_state()
    success_rate = calculate_success_rate(history)
    old_level = state["current_level"]

    if success_rate > HIGH_SUCCESS_RATE and old_level < 5:
        new_level = old_level + 1
        reason = f"成功率 {success_rate:.0%} > {HIGH_SUCCESS_RATE:.0%} → 難易度アップ"
    elif success_rate < LOW_SUCCESS_RATE and old_level > 1:
        new_level = old_level - 1
        reason = f"成功率 {success_rate:.0%} < {LOW_SUCCESS_RATE:.0%} → 難易度ダウン"
    else:
        new_level = old_level
        reason = f"成功率 {success_rate:.0%} → 難易度維持"

    state["current_level"] = new_level
    state["last_updated"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    state["history"].append({
        "timestamp": state["last_updated"],
        "success_rate": round(success_rate, 3),
        "old_level": old_level,
        "new_level": new_level,
        "reason": reason,
    })
    # 履歴は最新50件に制限
    state["history"] = state["history"][-50:]

    save_difficulty_state(state)

    level_info = DIFFICULTY_LEVELS[new_level]
    return {
        "success_rate": success_rate,
        "old_level": old_level,
        "new_level": new_level,
        "level_name": level_info["name"],
        "level_description": level_info["description"],
        "example_prompt": level_info["example"],
        "reason": reason,
    }


def update_claude_md_with_difficulty(difficulty_result: dict):
    """CLAUDE.md の難易度セクションを更新する。"""
    marker = "## Current Difficulty Level"

    section = f"""
## Current Difficulty Level

- **レベル**: {difficulty_result['new_level']} - {difficulty_result['level_name']}
- **説明**: {difficulty_result['level_description']}
- **直近の成功率**: {difficulty_result['success_rate']:.0%}
- **調整理由**: {difficulty_result['reason']}
- **指示の例**: {difficulty_result['example_prompt']}

> タスクを依頼する際は、上記レベルの抽象度でプロンプトを作成してください。
"""

    try:
        if CLAUDE_FILE.exists():
            content = CLAUDE_FILE.read_text(encoding="utf-8")
        else:
            content = "# CLAUDE.md - Project Intelligence\n"

        if marker in content:
            before = content.split(marker)[0]
            after_parts = content.split(marker, 1)[1]
            remaining_lines = after_parts.split("\n")
            next_section_idx = None
            for i, line in enumerate(remaining_lines):
                if i > 0 and line.startswith("## ") and not line.startswith("## Current Difficulty"):
                    next_section_idx = i
                    break
            if next_section_idx is not None:
                after = "\n".join(remaining_lines[next_section_idx:])
                content = before + section + "\n" + after
            else:
                content = before + section
        else:
            content += "\n" + section

        CLAUDE_FILE.write_text(content, encoding="utf-8")
        print(f"[evolve] Updated CLAUDE.md with difficulty level {difficulty_result['new_level']}")
    except Exception as e:
        print(f"[evolve] Error updating CLAUDE.md difficulty: {e}", file=sys.stderr)


# --- CLI Entry Point ---------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Phase 3: 自己進化と動的難易度調整")
    parser.add_argument("--extract-only", action="store_true", help="スキル抽出のみ実行")
    parser.add_argument("--difficulty-only", action="store_true", help="難易度調整のみ実行")
    args = parser.parse_args()

    run_extract = not args.difficulty_only
    run_difficulty = not args.extract_only

    # 分析履歴を読み込み
    history = load_analysis_history()
    print(f"[evolve] Loaded {len(history)} analysis entries")

    results = {}

    # --- スキル抽出 ---
    if run_extract:
        print("[evolve] === Skill Extraction ===")
        skills = extract_skills(history)
        if skills:
            print(f"[evolve] Extracted {len(skills)} skills:")
            for s in skills:
                print(f"  - {s['pattern']} (freq: {s['frequency']})")
            skills_text = generate_skill_rules(skills)
            update_claude_md_with_skills(skills_text)
        else:
            print("[evolve] No recurring patterns found yet. Need more task data.")
        results["skills"] = skills

    # --- 難易度調整 ---
    if run_difficulty:
        print("[evolve] === Difficulty Adjustment ===")
        difficulty_result = adjust_difficulty(history)
        print(f"[evolve] Success rate: {difficulty_result['success_rate']:.0%}")
        print(f"[evolve] Level: {difficulty_result['old_level']} -> {difficulty_result['new_level']} ({difficulty_result['level_name']})")
        print(f"[evolve] Reason: {difficulty_result['reason']}")
        update_claude_md_with_difficulty(difficulty_result)
        results["difficulty"] = difficulty_result

    print("[evolve] Evolution cycle complete.")
    return results


if __name__ == "__main__":
    main()
