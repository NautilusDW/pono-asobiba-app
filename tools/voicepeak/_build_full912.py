#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ORDER-FULL.md から speech 列を抽出して、
voicepeak_lines_full912.csv (912行) と
voicepeak_filename_map_full912.json (912エントリ) を生成する。

ファイル順序:
  1. ORDER-FULL.md の登場順 907 件
     - Q01_q → Q01_a → Q01_b → Q01_c → Q01_d → Q02_q → ...
     - Q160 補足版 (q160_a_alt, q160_b_alt) は Q160 通常版直後
     - Q181 は末尾
  2. くるみ第1〜5問目コール 5 件 (末尾)

CSV: 1列目='女の子', 2列目=speech, ヘッダなし, CRLF, UTF-8 BOMなし
"""
import re
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "docs" / "quizland-voicevox-order" / "ORDER-FULL.md"
OUT_CSV = ROOT / "tools" / "voicepeak" / "voicepeak_lines_full912.csv"
OUT_JSON = ROOT / "tools" / "voicepeak" / "voicepeak_filename_map_full912.json"

# テーブル行 (q001_q.wav etc) のパターン
# 例: | q001_q.wav | まんなかは なにいろ？ | まんなかは なにいろ？ |
ROW_RE = re.compile(r"^\|\s*(q\d{3}_[qabcd](?:_alt)?)\.wav\s*\|\s*([^|]*?)\s*\|\s*(.*?)\s*\|\s*$")

def main():
    text = SRC.read_text(encoding="utf-8")
    lines = text.splitlines()

    # 順序を保持しつつ、ファイル名 → speech のリストを構築
    # ただし Q160_alt 部分は ORDER-FULL.md 内で 2 度登場 (line 1628-1629 と 1825-1826)
    # → 重複排除のため filename を seen で管理
    entries = []  # list of (filename_without_wav, speech)
    seen = set()

    for ln in lines:
        m = ROW_RE.match(ln)
        if not m:
            continue
        fname = m.group(1)  # e.g. "q001_q" or "q160_a_alt"
        speech = m.group(3).strip()
        if not speech:
            continue
        if fname in seen:
            continue
        seen.add(fname)
        entries.append((fname, speech))

    # サニティ: 907 件期待
    expected = 907
    if len(entries) != expected:
        print(f"WARN: ORDER-FULL.md から {len(entries)} 件抽出 (期待 {expected})", file=sys.stderr)
        # Print missing ranges
        # Build expected list to compare
        expected_names = []
        for q in range(1, 182):
            for part in ("q", "a", "b", "c", "d"):
                expected_names.append(f"q{q:03d}_{part}")
                if q == 160 and part in ("a", "b"):
                    # alt は通常版の直後ではなく別位置で扱う
                    pass
        # alt
        # We'll just diff
        actual_set = set(e[0] for e in entries)
        expected_set = set(expected_names) | {"q160_a_alt", "q160_b_alt"}
        missing = expected_set - actual_set
        extra = actual_set - expected_set
        if missing:
            print(f"  欠落: {sorted(missing)[:20]}", file=sys.stderr)
        if extra:
            print(f"  余分: {sorted(extra)[:20]}", file=sys.stderr)
        sys.exit(1)

    # くるみ第1〜5問目コール 5 件を末尾に追加 (speech は短縮 + 漢数字統一: 2026-05-12)
    # ファイル名は kurumi_dai{N}mon (アラビア数字) のまま、 speech のみ漢数字 (第一問〜第五問) に変更。
    kurumi_calls = [
        ("kurumi_dai1mon", "第一問"),
        ("kurumi_dai2mon", "第二問"),
        ("kurumi_dai3mon", "第三問"),
        ("kurumi_dai4mon", "第四問"),
        ("kurumi_dai5mon", "第五問"),
    ]
    entries.extend(kurumi_calls)

    total = len(entries)
    if total != 912:
        print(f"ERROR: 合計 {total} 件 (期待 912)", file=sys.stderr)
        sys.exit(1)

    # CSV を CRLF + UTF-8 BOMなし で書き出し
    csv_lines = []
    for _, speech in entries:
        # 1列目固定: 女の子
        # speech 内にカンマや " が含まれるか確認
        if '"' in speech or "," in speech or "\n" in speech:
            esc = speech.replace('"', '""')
            csv_lines.append(f'女の子,"{esc}"')
        else:
            csv_lines.append(f'女の子,{speech}')

    OUT_CSV.write_bytes("\r\n".join(csv_lines).encode("utf-8") + b"\r\n")

    # JSON マッピング
    mapping = {}
    for idx, (fname, _) in enumerate(entries, start=1):
        mapping[f"{idx:03d}"] = fname
    OUT_JSON.write_text(
        json.dumps(mapping, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )

    print(f"OK: {OUT_CSV} ({total} 行)")
    print(f"OK: {OUT_JSON} ({total} entries)")
    # サンプル
    print("\n--- 先頭 5 ---")
    for idx in range(1, 6):
        k = f"{idx:03d}"
        fname = mapping[k]
        speech = entries[idx-1][1]
        print(f"  {k} | {fname} | {speech}")
    print("\n--- 末尾 10 ---")
    for idx in range(total - 9, total + 1):
        k = f"{idx:03d}"
        fname = mapping[k]
        speech = entries[idx-1][1]
        print(f"  {k} | {fname} | {speech}")

if __name__ == "__main__":
    main()
