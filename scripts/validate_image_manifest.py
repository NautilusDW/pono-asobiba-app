#!/usr/bin/env python3
"""
image_manifest.json の整合性検証 CLI.

Codex から受領した manifest が以下を満たすか検証:
1. 各 save_path がディスク上に実在する (orphans 検出)
2. 同じ save_path を持つエントリが重複していない (dupe 検出)
3. id と save_path のファイル名が一致している (整合性)
4. questions.js の choice text 全てが manifest の jp_labels で解決できる (gaps 検出)
5. usage / status が valid な値
6. 必須フィールドが全エントリに揃っている

違反があれば exit code 1。CI / マージ前で実行する想定。

Usage:
    python scripts/validate_image_manifest.py
    python scripts/validate_image_manifest.py --manifest <path>  # 別 manifest を指定
    python scripts/validate_image_manifest.py --json             # JSON でレポート出力
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_MANIFEST = ROOT / "quizland" / "data" / "_review" / "image_manifest.json"
QUESTIONS_JS = ROOT / "quizland" / "data" / "questions.js"

VALID_USAGE = {"choice", "stage"}
VALID_STATUS = {"generated", "planned", "deferred"}
REQUIRED_FIELDS = {"id", "save_path", "jp_labels", "usage", "source_sheet", "subject_detailed", "alternatives", "status"}


def load_manifest(path: Path) -> dict:
    if not path.exists():
        sys.exit(f"ERROR: manifest not found: {path}")
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def extract_choices_from_questions_js(path: Path) -> set[str]:
    """questions.js から全 choice text を抽出 (Japanese only)."""
    text = path.read_text(encoding="utf-8")
    choices: set[str] = set()
    for m in re.finditer(r"choices:\[([^\]]+)\]", text):
        for raw in m.group(1).split(","):
            c = raw.strip().strip("'\"")
            if c and not c.isdigit() and any(ord(ch) > 127 for ch in c):
                choices.add(c)
    return choices


def validate(manifest: dict) -> dict:
    """Return dict with violations grouped by category."""
    violations = defaultdict(list)
    images = manifest.get("images", [])
    if not isinstance(images, list):
        violations["schema"].append("manifest.images must be a list")
        return violations

    seen_paths: dict[str, list[str]] = defaultdict(list)
    seen_ids: dict[str, list[str]] = defaultdict(list)

    for i, entry in enumerate(images):
        loc = f"images[{i}] (id={entry.get('id', '<missing>')})"

        # Required fields
        missing = REQUIRED_FIELDS - set(entry.keys())
        if missing:
            violations["required_fields"].append(f"{loc}: missing {sorted(missing)}")
            continue

        # Type checks
        if not isinstance(entry["jp_labels"], list) or not entry["jp_labels"]:
            violations["jp_labels"].append(f"{loc}: must be non-empty list")
        if not isinstance(entry["usage"], list):
            violations["usage"].append(f"{loc}: must be list")
        elif any(u not in VALID_USAGE for u in entry["usage"]):
            violations["usage"].append(f"{loc}: invalid value (got {entry['usage']}, expected subset of {sorted(VALID_USAGE)})")
        if entry["status"] not in VALID_STATUS:
            violations["status"].append(f"{loc}: invalid status '{entry['status']}' (expected {sorted(VALID_STATUS)})")

        # ID / save_path consistency
        save_path = entry.get("save_path", "")
        if not isinstance(save_path, str) or not save_path:
            violations["save_path"].append(f"{loc}: empty save_path")
            continue
        seen_paths[save_path].append(entry.get("id", "?"))
        seen_ids[entry["id"]].append(save_path)

        expected_basename = Path(save_path).stem
        if entry["id"] != expected_basename:
            violations["id_path_mismatch"].append(
                f"{loc}: id='{entry['id']}' but save_path basename='{expected_basename}'"
            )

        # File existence (only for status == generated)
        if entry["status"] == "generated":
            full_path = ROOT / save_path
            if not full_path.exists():
                violations["orphan_manifest_entry"].append(f"{loc}: file not on disk: {save_path}")

        # alternatives must be list
        if not isinstance(entry.get("alternatives", []), list):
            violations["alternatives"].append(f"{loc}: must be list")

    # Duplicate save_paths
    for path, ids in seen_paths.items():
        if len(ids) > 1:
            violations["duplicate_save_path"].append(f"{path}: used by {ids}")

    # Duplicate ids
    for iid, paths in seen_ids.items():
        if len(paths) > 1:
            violations["duplicate_id"].append(f"id={iid}: appears in {paths}")

    # Gaps: questions.js choices not covered
    if QUESTIONS_JS.exists():
        all_jp_labels: set[str] = set()
        for entry in images:
            for label in entry.get("jp_labels", []):
                all_jp_labels.add(label)
        choices = extract_choices_from_questions_js(QUESTIONS_JS)
        unmapped = sorted(choices - all_jp_labels)
        if unmapped:
            violations["unmapped_choices"].extend(unmapped)

    return violations


def report_human(violations: dict) -> None:
    if not violations:
        print("[OK] manifest is valid - no violations.")
        return
    print(f"[FAIL] {sum(len(v) for v in violations.values())} violation(s) found:")
    print()
    for category, items in violations.items():
        print(f"  ## {category} ({len(items)})")
        for x in items[:50]:
            print(f"    - {x}")
        if len(items) > 50:
            print(f"    ... and {len(items) - 50} more")
        print()


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--manifest", default=str(DEFAULT_MANIFEST), help="manifest path")
    ap.add_argument("--json", action="store_true", help="output JSON report")
    args = ap.parse_args()

    manifest = load_manifest(Path(args.manifest))
    violations = validate(manifest)

    if args.json:
        print(json.dumps({k: v for k, v in violations.items()}, ensure_ascii=False, indent=2))
    else:
        report_human(violations)

    return 1 if violations else 0


if __name__ == "__main__":
    sys.exit(main())
