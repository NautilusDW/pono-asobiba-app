#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
voicepeak_lines_phase{1,2}_<category>.csv + kurumi CSV から
重複 speech を排除したユニーク化 CSV と展開マッピング JSON を生成する。

方針:
- カテゴリ × フェーズ単位で独立して unique 化 (試聴フローを変えないため)
- speech 本文は一切改変しない (1 byte 単位で完全一致による重複判定)
- 既存 phase1_*/phase2_*/kurumi_dai1_5 関連ファイルは温存 (touch しない)

出力:
- voicepeak_lines_unique_phase1_<category>.csv (9)
- voicepeak_lines_unique_phase2_<category>.csv (8)
- voicepeak_lines_unique_kurumi_dai1_5.csv (1)
- voicepeak_unique_expand_<category>_phase<N>.json (17 + 1 kurumi)
- DUPLICATE-ANALYSIS.md (1)
"""
from __future__ import annotations

import json
import re
from collections import OrderedDict, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT_DIR = ROOT / "tools" / "voicepeak"

CATEGORIES = [
    "order_color",
    "count_total",
    "shape_name",
    "number_sequence",
    "opposite",
    "weather",
    "body",
    "trivia",
]

PHASES = [1, 2]

# Phase 2 には number_sequence は含まれていないことがある (24 件は全部 phase1?)
# 実態に合わせて存在するものだけ処理する。

KURUMI_KEY = "kurumi_dai1_5"


def parse_csv(csv_path: Path) -> list[str]:
    """CSV の 2 列目 (speech) のみを行順で取り出す。

    フォーマット: '女の子,<speech>' or '女の子,"<speech with comma>"'
    UTF-8 (BOM なし) / CRLF。 末尾改行で空行が出る場合があるので無視。
    """
    raw = csv_path.read_bytes().decode("utf-8")
    speeches: list[str] = []
    for line in raw.split("\r\n"):
        if not line:
            continue
        # 先頭は固定 '女の子,'
        if not line.startswith("女の子,"):
            raise ValueError(f"想定外の行 in {csv_path.name}: {line!r}")
        body = line[len("女の子,"):]
        # ダブルクォート囲みなら復号
        if body.startswith('"') and body.endswith('"'):
            inner = body[1:-1].replace('""', '"')
            speeches.append(inner)
        else:
            speeches.append(body)
    return speeches


def parse_filename_map(json_path: Path) -> list[str]:
    """voicepeak_filename_map_*.json は OrderedDict として "001"→fname。
    CSV と同じ順序で fname (拡張子なし) のリストを返す。
    """
    obj = json.loads(json_path.read_text(encoding="utf-8"))
    # キーは "001"〜 ゼロ詰め 3 桁、 連番。 念のため数値ソート。
    keys = sorted(obj.keys(), key=lambda s: int(s))
    return [obj[k] for k in keys]


def write_csv(path: Path, speeches: list[str]) -> None:
    """既存 _build_phase12_by_category.py と同じフォーマット。"""
    csv_lines: list[str] = []
    for speech in speeches:
        if '"' in speech or "," in speech or "\n" in speech:
            esc = speech.replace('"', '""')
            csv_lines.append(f'女の子,"{esc}"')
        else:
            csv_lines.append(f"女の子,{speech}")
    path.write_bytes("\r\n".join(csv_lines).encode("utf-8") + b"\r\n")


def write_json(path: Path, obj) -> None:
    path.write_text(
        json.dumps(obj, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def collect_batch(csv_path: Path, json_path: Path) -> list[tuple[str, str]]:
    """1 バッチ (= 1 CSV) を (fname, speech) のタプル順序リストで返す。"""
    speeches = parse_csv(csv_path)
    fnames = parse_filename_map(json_path)
    if len(speeches) != len(fnames):
        raise ValueError(
            f"件数不一致: {csv_path.name} = {len(speeches)} vs "
            f"{json_path.name} = {len(fnames)}"
        )
    return list(zip(fnames, speeches))


def unique_ize(entries: list[tuple[str, str]]):
    """speech 重複を排除し、 (unique_speeches_in_order, expand_map) を返す。

    expand_map: OrderedDict speech -> [fname1.wav, fname2.wav, ...]
    最初に出現した speech は順序を維持。
    """
    expand: "OrderedDict[str, list[str]]" = OrderedDict()
    for fname, speech in entries:
        wav_name = f"{fname}.wav"
        if speech in expand:
            expand[speech].append(wav_name)
        else:
            expand[speech] = [wav_name]
    unique_speeches = list(expand.keys())
    return unique_speeches, expand


def main():
    # 1) 全バッチを走査して entries を収集
    # batches: list of dicts: {label, csv_in, json_in, entries, category, phase}
    batches = []

    for cat in CATEGORIES:
        for phase in PHASES:
            csv_in = OUT_DIR / f"voicepeak_lines_phase{phase}_{cat}.csv"
            json_in = OUT_DIR / f"voicepeak_filename_map_phase{phase}_{cat}.json"
            if not csv_in.exists() or not json_in.exists():
                # number_sequence の phase2 が無い等の可能性
                continue
            entries = collect_batch(csv_in, json_in)
            batches.append({
                "label": f"{cat}_phase{phase}",
                "category": cat,
                "phase": phase,
                "csv_in": csv_in,
                "json_in": json_in,
                "entries": entries,
            })

    # kurumi
    csv_in = OUT_DIR / f"voicepeak_lines_{KURUMI_KEY}.csv"
    json_in = OUT_DIR / f"voicepeak_filename_map_{KURUMI_KEY}.json"
    if csv_in.exists() and json_in.exists():
        entries = collect_batch(csv_in, json_in)
        batches.append({
            "label": KURUMI_KEY,
            "category": "kurumi",
            "phase": 1,  # phase1 扱い (元プランどおり)
            "csv_in": csv_in,
            "json_in": json_in,
            "entries": entries,
        })

    # 2) 全件 / フル横断ユニーク数
    all_entries_with_label = []  # (label, fname, speech)
    total_count = 0
    full_unique_set = set()
    full_speech_to_files = defaultdict(list)  # speech -> [(label, fname.wav)]
    for b in batches:
        for fname, speech in b["entries"]:
            all_entries_with_label.append((b["label"], fname, speech))
            full_unique_set.add(speech)
            full_speech_to_files[speech].append((b["label"], f"{fname}.wav"))
            total_count += 1

    full_unique_count = len(full_unique_set)

    # 3) カテゴリ × フェーズ単位 unique 化 + 出力
    cat_results = []  # (label, category, phase, original, unique, reduction)
    cat_unique_total = 0

    for b in batches:
        unique_speeches, expand = unique_ize(b["entries"])
        original = len(b["entries"])
        unique = len(unique_speeches)
        reduction = original - unique
        cat_unique_total += unique

        # 出力ファイル名
        if b["label"] == KURUMI_KEY:
            csv_out = OUT_DIR / f"voicepeak_lines_unique_{KURUMI_KEY}.csv"
            json_out = OUT_DIR / f"voicepeak_unique_expand_{KURUMI_KEY}.json"
        else:
            csv_out = OUT_DIR / (
                f"voicepeak_lines_unique_phase{b['phase']}_{b['category']}.csv"
            )
            json_out = OUT_DIR / (
                f"voicepeak_unique_expand_{b['category']}_phase{b['phase']}.json"
            )

        write_csv(csv_out, unique_speeches)
        write_json(json_out, expand)

        cat_results.append({
            "label": b["label"],
            "category": b["category"],
            "phase": b["phase"],
            "original": original,
            "unique": unique,
            "reduction": reduction,
            "csv_out": csv_out.name,
            "json_out": json_out.name,
        })

    # 4) Top 20 重複 (フル横断、 出現回数の多い順)
    speech_counts = [
        (sp, len(files), files)
        for sp, files in full_speech_to_files.items()
    ]
    speech_counts.sort(key=lambda x: (-x[1], x[0]))
    top20 = [r for r in speech_counts if r[1] >= 2][:20]

    # 5) カテゴリ間 / フェーズ間 重複
    cross_batch_dup_count = 0
    cross_examples = []  # 上位 10 例
    for sp, cnt, files in speech_counts:
        labels = {l for (l, _) in files}
        if len(labels) >= 2:
            cross_batch_dup_count += 1
            if len(cross_examples) < 10:
                cross_examples.append((sp, sorted(labels), cnt))

    # 6) DUPLICATE-ANALYSIS.md
    md_lines: list[str] = []
    md_lines.append("# Speech 重複分析レポート (2026-05-12)")
    md_lines.append("")
    md_lines.append("> 自動生成: `tools/voicepeak/_build_unique_csvs.py`")
    md_lines.append(">")
    md_lines.append("> 既存 `voicepeak_lines_phase{1,2}_*.csv` / `voicepeak_lines_kurumi_dai1_5.csv` / 各 map JSON は温存。 unique 化結果は `voicepeak_lines_unique_*.csv` / `voicepeak_unique_expand_*.json` に並列配置。")
    md_lines.append("")

    full_reduction = total_count - full_unique_count
    full_pct = full_reduction / total_count * 100 if total_count else 0
    cat_reduction = total_count - cat_unique_total
    cat_pct = cat_reduction / total_count * 100 if total_count else 0

    md_lines.append("## 全体統計")
    md_lines.append("")
    md_lines.append(f"- 全件数: **{total_count}** (= 907 本編 + 5 くるみ)")
    md_lines.append(f"- ユニーク speech 数 (フル横断): **{full_unique_count}** → 削減 {full_reduction} 件 ({full_pct:.1f}%)")
    md_lines.append(f"- ユニーク speech 数 (カテゴリ × フェーズ単位): **{cat_unique_total}** → 削減 {cat_reduction} 件 ({cat_pct:.1f}%)")
    md_lines.append(f"- カテゴリ × フェーズ間で重複している speech 数: **{cross_batch_dup_count}** 件 (= フル横断時にさらに削減できる対象)")
    md_lines.append(f"- **採用方針: (a) カテゴリ × フェーズ単位 独立 unique 化** (試聴フロー維持優先)")
    md_lines.append("")

    md_lines.append("## カテゴリ × フェーズ別 ユニーク化結果")
    md_lines.append("")
    md_lines.append("| カテゴリ | Phase | 元件数 | ユニーク後 | 削減 | 削減率 |")
    md_lines.append("|---|---|---:|---:|---:|---:|")
    for r in cat_results:
        if r["category"] == "kurumi":
            cat_label = "くるみ"
            phase_label = "Phase 1"
        else:
            cat_label = r["category"]
            phase_label = f"Phase {r['phase']}"
        pct = r["reduction"] / r["original"] * 100 if r["original"] else 0
        md_lines.append(
            f"| {cat_label} | {phase_label} | {r['original']} | "
            f"{r['unique']} | {r['reduction']} | {pct:.1f}% |"
        )
    md_lines.append(
        f"| **合計** | - | **{total_count}** | "
        f"**{cat_unique_total}** | **{cat_reduction}** | **{cat_pct:.1f}%** |"
    )
    md_lines.append("")

    md_lines.append("## 重複 Top 20 (フル横断、 出現回数の多い順)")
    md_lines.append("")
    if not top20:
        md_lines.append("(重複なし)")
    else:
        md_lines.append("| # | speech | 回数 | 対応ファイル名 |")
        md_lines.append("|---:|---|---:|---|")
        for i, (sp, cnt, files) in enumerate(top20, start=1):
            file_list = ", ".join(f for (_, f) in files)
            md_lines.append(f"| {i} | {sp} | {cnt} | {file_list} |")
    md_lines.append("")

    md_lines.append("## カテゴリ × フェーズ間 重複 (フル横断 unique 化なら追加削減可能な speech)")
    md_lines.append("")
    md_lines.append(f"- 該当 speech 数: **{cross_batch_dup_count}**")
    md_lines.append("")
    if cross_examples:
        md_lines.append("代表例 (上位 10):")
        md_lines.append("")
        md_lines.append("| speech | 出現バッチ | 総出現数 |")
        md_lines.append("|---|---|---:|")
        for sp, labels, cnt in cross_examples:
            md_lines.append(f"| {sp} | {', '.join(labels)} | {cnt} |")
        md_lines.append("")

    md_lines.append("## (a) カテゴリ × フェーズ単位 vs (b) フル横断 比較")
    md_lines.append("")
    md_lines.append("| 方針 | ユニーク数 | 削減数 | 削減率 | 試聴フロー |")
    md_lines.append("|---|---:|---:|---:|---|")
    md_lines.append(
        f"| (a) カテゴリ × フェーズ単位 | {cat_unique_total} | {cat_reduction} | "
        f"{cat_pct:.1f}% | 既存と同じ (カテゴリ別バッチ試聴) |"
    )
    md_lines.append(
        f"| (b) フル横断 | {full_unique_count} | {full_reduction} | "
        f"{full_pct:.1f}% | 1 バッチ集約 (どのカテゴリで生成するか割り振り要) |"
    )
    md_lines.append("")
    md_lines.append("→ **採用: (a)**。 (b) との差 = " f"{cat_unique_total - full_unique_count} 件 (試聴フロー維持コストとトレードオフ)")
    md_lines.append("")

    md_lines.append("## 生成ファイル一覧")
    md_lines.append("")
    md_lines.append("### Unique CSV (VOICEPEAK インポート用)")
    md_lines.append("")
    for r in cat_results:
        md_lines.append(f"- `tools/voicepeak/{r['csv_out']}` ({r['unique']} 件)")
    md_lines.append("")
    md_lines.append("### 展開マッピング JSON (1 wav → 複数 q### への展開)")
    md_lines.append("")
    for r in cat_results:
        md_lines.append(f"- `tools/voicepeak/{r['json_out']}`")
    md_lines.append("")
    md_lines.append("### 展開スクリプト")
    md_lines.append("")
    md_lines.append("- `tools/voicepeak/Expand-VoicepeakUniqueWavs.ps1` (連番 wav → 全 q###.wav 展開)")
    md_lines.append("")

    md_path = OUT_DIR / "DUPLICATE-ANALYSIS.md"
    md_path.write_text("\n".join(md_lines), encoding="utf-8")

    # 7) コンソール サマリ
    print("=== 重複検出結果 ===")
    print(f"全件数             : {total_count}")
    print(f"フル横断 unique 数  : {full_unique_count} (削減 {full_reduction} 件 = {full_pct:.1f}%)")
    print(f"カテゴリ単位 unique : {cat_unique_total} (削減 {cat_reduction} 件 = {cat_pct:.1f}%)")
    print(f"カテゴリ間重複     : {cross_batch_dup_count} 件")
    print()
    print("=== カテゴリ × フェーズ別 ===")
    print(f"{'label':<32} {'orig':>6} {'uniq':>6} {'redu':>6}")
    for r in cat_results:
        print(f"{r['label']:<32} {r['original']:>6} {r['unique']:>6} {r['reduction']:>6}")
    print()
    print(f"-> {md_path}")
    print(f"-> {len(cat_results)} unique CSV + {len(cat_results)} expand JSON 出力")


if __name__ == "__main__":
    main()
