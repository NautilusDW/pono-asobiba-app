#!/usr/bin/env python3
"""
Phase A 分析: questions.js の choice text のうち image_manifest.json で
解決できない 101 件を 3 カテゴリに分類する.

(a) reuseable: assets/images/ocean/, assets/images/word/, assets/images/quizland/illust/
    に既存ファイルがある (jp_labels 追加だけで OK、再生成不要)
(b) need_generation: 新規 Codex 生成が必要 (face_cry 等)
(c) abstract: 抽象概念 (うごけない 等)、テキストのみで成立、画像化不要

Output: quizland/data/_review/missing_labels_categorized.json
"""
from __future__ import annotations
import json
import re
import os
import sys
from pathlib import Path
from collections import defaultdict

ROOT = Path(__file__).resolve().parent.parent
QUESTIONS_JS = ROOT / "quizland" / "data" / "questions.js"
MANIFEST = ROOT / "quizland" / "data" / "_review" / "image_manifest.json"
OUT = ROOT / "quizland" / "data" / "_review" / "missing_labels_categorized.json"

# Concepts known to be available in ocean/ folder via the standard naming pattern
# (Folder + "/" + Folder + "_normal_1.png")
# We map common JP labels → folder hint for reuse search.
JP_TO_OCEAN_FOLDERS = {
    "うで": "Arm",
    "あし": "Foot_part",
    "て": "Palm",
    "ゆび": "Forearm",  # reuse forearm as fallback for finger
    "した": "Tongue",
    "は": "Teeth",
    "おなか": "Stomach_food",  # may not exist, will check
    "かみ": "Hair",
    "かた": "Shoulder",
    "コップ": "Cup",
    "とけい": "Clock",
    "ものさし": "Ruler",
    "おんどけい": "Thermometer",
    "かぜ": "Wind",
    "なみ": "Wave",
    "つなみ": "Tsunami",
    "じしん": "Earthquake",
    "たつまき": "Tornado",
    "おおあめ": "Heavy_rain",
    "はれ": "Sun",   # 晴 → Sun
    "あめ": "Rain",
    "ゆき": "Snow",
    "くも": "Cloud",
    "くもり": "Cloud",
    "にじ": "Rainbow",
    "かみなり": "Thunder",
    "さくら": "Cherry_blossom",
    "ばら": "Rose",
    "くさ": "Grass",
    "き": "Tree",
    "いし": "Stone",
    "つき": "Moon",
    "たいよう": "Sun",
    "ほし": "Star",
    "うちゅう": "Space",
    # More concepts to scan
}

# Truly need new generation (concepts unlikely to be in ocean/word)
KNOWN_NEED_GENERATION = {
    "face_cry": ["なく"],
    "face_disappointed": ["がっかり"],
    "kiri": ["きり"],
    "moya": ["もや"],
}

# Abstract concepts that are fine as text-only (no image needed)
ABSTRACT_CONCEPTS = {
    "うごけない", "こわいから", "おなじ", "0こ（ない）",
    "がら", "しもん", "じょうはつ", "こおる", "しずむ",
    "あき", "はる", "なつ", "ふゆ",  # seasons could be visual but text is fine
    # opposite adjectives are best-effort
    "あかい", "あおい",
    "あそぶ", "えがく", "かえる", "きく", "たべる", "はなす", "ならう", "よむ",
    "いい", "わるい", "やさしい", "きつい", "おもしろい", "かわいい", "きらい",
    "おおきい", "ちいさい", "おそい", "はやい", "つめたい", "まるい",
    "うえ", "した", "まえ", "うしろ", "ひだり", "みぎ", "みじかい",
    # numeric variants
    "10しょく", "10ぽん", "1じかんくらい", "3しょく", "3じかんくらい", "3ほん", "4ほん",
    "5しょく", "5じかんくらい", "5ほん", "6ほん", "6ぽん", "7しょく", "8ぽん",
}


def extract_unmapped_choices() -> dict:
    """Extract per-type unmapped JP choices from questions.js."""
    qjs = QUESTIONS_JS.read_text(encoding="utf-8")
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    mapped = set()
    for e in manifest["images"]:
        for label in e.get("jp_labels", []):
            # support both string and {label, context} formats
            if isinstance(label, str):
                mapped.add(label)
            elif isinstance(label, dict):
                mapped.add(label.get("label"))
    pattern = re.compile(r"\{\s*level:(\d+)[^}]*?type:'(\w+)'[^}]*?choices:\[([^\]]+)\]", re.DOTALL)
    by_type: dict[str, set[str]] = defaultdict(set)
    for m in pattern.finditer(qjs):
        qtype = m.group(2)
        choices = re.findall(r"'([^']+)'", m.group(3))
        for c in choices:
            if not any(ord(ch) > 127 for ch in c):
                continue
            if c in mapped:
                continue
            # numeric / longtext are not "missing image", skip
            if re.match(r"^\d+\s*[つ個本枚匹羽コこほん]?$", c.strip()):
                continue
            if len(c) >= 8 or (len(c) >= 5 and re.search(r"[ 　、]", c)):
                continue
            by_type[qtype].add(c)
    return {t: sorted(v) for t, v in by_type.items()}


def find_existing_reuse(label: str) -> list[str]:
    """Search ocean/, word/, illust/ folders for files matching the label."""
    candidates: list[str] = []
    # 1. JP_TO_OCEAN_FOLDERS hint
    folder_hint = JP_TO_OCEAN_FOLDERS.get(label)
    if folder_hint:
        ocean_dir = ROOT / "assets" / "images" / "ocean" / folder_hint
        if ocean_dir.is_dir():
            for f in ocean_dir.glob("*.png"):
                candidates.append(str(f.relative_to(ROOT)).replace("\\", "/"))
    # 2. word/ folder direct hit (romaji)
    # word/ uses romaji like ringo.png; we don't try to romanize here
    # 3. illust/choice/ direct hit (name as-is, unlikely)
    return candidates


def categorize(by_type: dict) -> dict:
    """Classify each missing label into (a)/(b)/(c)."""
    result = {
        "generated_at": "2026-05-05",
        "categories": {
            "reuseable": [],     # (a) 既存ファイルあり、jp_labels 追加で OK
            "need_generation": [],  # (b) 新規 Codex 生成必要
            "abstract": [],      # (c) 画像化不要 (テキストで成立)
        },
    }
    for qtype, labels in by_type.items():
        for label in labels:
            entry = {"choice_text": label, "question_type": qtype}
            if label in ABSTRACT_CONCEPTS:
                result["categories"]["abstract"].append(entry)
                continue
            reuse = find_existing_reuse(label)
            if reuse:
                entry["existing_files"] = reuse
                result["categories"]["reuseable"].append(entry)
            else:
                result["categories"]["need_generation"].append(entry)
    return result


def main() -> int:
    by_type = extract_unmapped_choices()
    total = sum(len(v) for v in by_type.values())
    print(f"Found {total} unique unmapped JP labels (after numeric/longtext exclusion)")
    print()
    for t, labels in sorted(by_type.items()):
        print(f"  [{t}] {len(labels)} unique")

    cat = categorize(by_type)
    print()
    print(f"Reuseable (a): {len(cat['categories']['reuseable'])}")
    print(f"Need generation (b): {len(cat['categories']['need_generation'])}")
    print(f"Abstract / text-only (c): {len(cat['categories']['abstract'])}")

    OUT.write_text(json.dumps(cat, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nWrote: {OUT.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
