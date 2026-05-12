#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ORDER-FULL.md から speech 列を抽出し、 カテゴリ別 × 2 フェーズ で
VOICEPEAK 用 CSV / ファイル名マップ JSON を生成する。

Phase 1 (優先): 各問題の問題文 (q) + 正解選択肢 のみ
Phase 2 (後回し): 各問題の不正解選択肢 3 件
くるみ第 1〜5 問目コール 5 件は別バッチ (kurumi_dai1_5)

CSV: 1 列目 '女の子', 2 列目 speech, ヘッダなし, CRLF, UTF-8 BOM なし
JSON: 連番 (3 桁ゼロ) → ファイル名 (拡張子なし)

Q160 補足版:
  - questions.js / ORDER-FULL.md より Q160 の正解 = A
  - q160_a_alt (= 「ぞうきの はい」) → 正解の補足版 → phase 1
  - q160_b_alt (= 「いぶくろの い」) → 不正解の補足版 → phase 2
"""
import re
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "docs" / "quizland-voicevox-order" / "ORDER-FULL.md"
OUT_DIR = ROOT / "tools" / "voicepeak"

CATEGORY_RE = re.compile(r"^### category:\s*([a-z_]+)")
QHEADER_RE = re.compile(r"^####\s*Q(\d+)\s*[「『].*?[」』]\s*（正解:\s*([A-D])")
ROW_RE = re.compile(r"^\|\s*(q\d{3}_[qabcd](?:_alt)?)\.wav\s*\|\s*([^|]*?)\s*\|\s*(.*?)\s*\|\s*$")

CATEGORIES_PHASE1 = [
    "order_color",
    "count_total",
    "shape_name",
    "number_sequence",
    "opposite",
    "weather",
    "body",
    "trivia",
]


def parse_order_full():
    text = SRC.read_text(encoding="utf-8")
    lines = text.splitlines()

    # qid (int) → {category, answer_letter, parts: ordered list of (fname, speech)}
    questions = {}
    current_category = None
    current_qid = None

    for ln in lines:
        m_cat = CATEGORY_RE.match(ln)
        if m_cat:
            current_category = m_cat.group(1)
            continue
        m_q = QHEADER_RE.match(ln)
        if m_q:
            qid = int(m_q.group(1))
            ans_letter = m_q.group(2)
            current_qid = qid
            if qid not in questions:
                questions[qid] = {
                    "category": current_category,
                    "answer": ans_letter,
                    "parts": [],
                    "seen": set(),
                }
            continue
        m_row = ROW_RE.match(ln)
        if not m_row:
            continue
        fname = m_row.group(1)  # e.g. q001_q / q160_a_alt
        speech = m_row.group(3).strip()
        if not speech:
            continue
        # qid を fname から決定 (current_qid に頼らず堅牢に)
        qid_from_fname = int(fname[1:4])
        if qid_from_fname not in questions:
            # シナリオ: 補足版テーブル等で先に row が来るケース → 既に登録済みのはず
            # 念のため category=None で作成
            questions[qid_from_fname] = {
                "category": current_category,
                "answer": None,
                "parts": [],
                "seen": set(),
            }
        rec = questions[qid_from_fname]
        if fname in rec["seen"]:
            continue
        rec["seen"].add(fname)
        rec["parts"].append((fname, speech))

    return questions


def split_phase1_phase2(questions):
    """各 question を phase1 / phase2 のエントリリストに分解。

    Phase 1: q + 正解選択肢 (a/b/c/d のうち answer letter のもの)
             + Q160 の正解 alt (q160_a_alt)
    Phase 2: 不正解 3 件 + Q160 不正解 alt (q160_b_alt)
    """
    by_cat_phase1 = {c: [] for c in CATEGORIES_PHASE1}
    by_cat_phase2 = {c: [] for c in CATEGORIES_PHASE1}

    # qid 昇順
    for qid in sorted(questions.keys()):
        rec = questions[qid]
        cat = rec["category"]
        ans = rec["answer"]  # 'A' / 'B' / 'C' / 'D'
        if cat not in by_cat_phase1:
            print(f"WARN: 未知カテゴリ {cat} (qid={qid})", file=sys.stderr)
            continue
        ans_part = ans.lower() if ans else None  # 'a' / 'b' / 'c' / 'd'

        # parts: ordered list, q が先頭、続いて a/b/c/d、 alt は末尾 (ORDER-FULL.md の登場順)
        # phase 1 = q + 正解選択肢 + 正解 alt
        # phase 2 = 不正解選択肢 (a/b/c/d 自然順、 正解スキップ) + 不正解 alt
        for fname, speech in rec["parts"]:
            # fname の suffix を判定
            # q###_q       → 問題文 → phase 1
            # q###_X       → 選択肢 (X = a/b/c/d)
            # q###_X_alt   → 補足版 (Q160 のみ)
            tail = fname[5:]  # 'q' / 'a' / 'b' / 'c' / 'd' / 'a_alt' / 'b_alt'
            if tail == "q":
                by_cat_phase1[cat].append((fname, speech))
            elif tail in ("a", "b", "c", "d"):
                if ans_part and tail == ans_part:
                    by_cat_phase1[cat].append((fname, speech))
                else:
                    by_cat_phase2[cat].append((fname, speech))
            elif tail.endswith("_alt"):
                # Q160 alt: a_alt / b_alt
                letter = tail[0]  # 'a' / 'b'
                if ans_part and letter == ans_part:
                    by_cat_phase1[cat].append((fname, speech))
                else:
                    by_cat_phase2[cat].append((fname, speech))
            else:
                print(f"WARN: 未知 suffix {tail} (fname={fname})", file=sys.stderr)

    return by_cat_phase1, by_cat_phase2


def write_csv(path, entries):
    """1 列目 '女の子', 2 列目 speech, ヘッダなし, CRLF, UTF-8 BOM なし"""
    csv_lines = []
    for _, speech in entries:
        if '"' in speech or "," in speech or "\n" in speech:
            esc = speech.replace('"', '""')
            csv_lines.append(f'女の子,"{esc}"')
        else:
            csv_lines.append(f'女の子,{speech}')
    path.write_bytes("\r\n".join(csv_lines).encode("utf-8") + b"\r\n")


def write_json_map(path, entries):
    mapping = {}
    for idx, (fname, _) in enumerate(entries, start=1):
        mapping[f"{idx:03d}"] = fname
    path.write_text(
        json.dumps(mapping, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )


def main():
    questions = parse_order_full()

    # サニティ: 181 問期待
    qids = sorted(questions.keys())
    if len(qids) != 181:
        print(f"ERROR: questions {len(qids)} 件 (期待 181)", file=sys.stderr)
        print(f"  qids: {qids}", file=sys.stderr)
        sys.exit(1)

    # answer 全件 set 確認
    for qid, rec in questions.items():
        if not rec["answer"]:
            print(f"ERROR: Q{qid} に answer letter がない", file=sys.stderr)
            sys.exit(1)

    by_cat_phase1, by_cat_phase2 = split_phase1_phase2(questions)

    # カテゴリ別件数集計
    summary = []  # (category, q_count, phase1_count, phase2_count)
    cat_q_count = {c: 0 for c in CATEGORIES_PHASE1}
    for qid, rec in questions.items():
        cat_q_count[rec["category"]] += 1

    total_phase1 = 0
    total_phase2 = 0

    for cat in CATEGORIES_PHASE1:
        p1 = by_cat_phase1[cat]
        p2 = by_cat_phase2[cat]
        # 書き出し
        csv_p1 = OUT_DIR / f"voicepeak_lines_phase1_{cat}.csv"
        csv_p2 = OUT_DIR / f"voicepeak_lines_phase2_{cat}.csv"
        json_p1 = OUT_DIR / f"voicepeak_filename_map_phase1_{cat}.json"
        json_p2 = OUT_DIR / f"voicepeak_filename_map_phase2_{cat}.json"
        write_csv(csv_p1, p1)
        write_csv(csv_p2, p2)
        write_json_map(json_p1, p1)
        write_json_map(json_p2, p2)
        summary.append((cat, cat_q_count[cat], len(p1), len(p2)))
        total_phase1 += len(p1)
        total_phase2 += len(p2)

    # くるみ 第 1〜5 問目 (phase 1 only)
    kurumi_calls = [
        ("kurumi_dai1mon", "第1問目です"),
        ("kurumi_dai2mon", "第2問目です"),
        ("kurumi_dai3mon", "第3問目です"),
        ("kurumi_dai4mon", "第4問目です"),
        ("kurumi_dai5mon", "第5問目です"),
    ]
    write_csv(OUT_DIR / "voicepeak_lines_kurumi_dai1_5.csv", kurumi_calls)
    write_json_map(OUT_DIR / "voicepeak_filename_map_kurumi_dai1_5.json", kurumi_calls)

    total_kurumi = len(kurumi_calls)
    grand = total_phase1 + total_phase2 + total_kurumi

    # サマリ表示
    print("=== カテゴリ別件数 ===")
    print(f"{'category':<20} {'qN':>4} {'phase1':>8} {'phase2':>8}")
    for cat, qn, p1, p2 in summary:
        print(f"{cat:<20} {qn:>4} {p1:>8} {p2:>8}")
    print(f"{'kurumi_dai1_5':<20} {5:>4} {total_kurumi:>8} {'-':>8}")
    print(f"{'TOTAL':<20} {sum(cat_q_count.values())+5:>4} {total_phase1+total_kurumi:>8} {total_phase2:>8}")
    print()
    print(f"phase1 = {total_phase1} (本編) + {total_kurumi} (くるみ) = {total_phase1+total_kurumi}")
    print(f"phase2 = {total_phase2}")
    print(f"GRAND  = {grand} (期待 912)")

    if grand != 912:
        print("ERROR: 合計が 912 と一致しません", file=sys.stderr)
        sys.exit(1)

    # サマリレポート md を生成
    md = OUT_DIR / "BATCH-PLAN-PHASE1-PHASE2.md"
    write_summary_md(md, summary, total_phase1, total_phase2, total_kurumi, grand)
    print(f"\nOK: summary -> {md}")


def write_summary_md(path, summary, total_phase1, total_phase2, total_kurumi, grand):
    lines = []
    lines.append("# VOICEPEAK 録音バッチ計画 (Phase 1 + Phase 2 / カテゴリ別)")
    lines.append("")
    lines.append("> 作成: `tools/voicepeak/_build_phase12_by_category.py` 自動生成")
    lines.append(">")
    lines.append("> 出典: `docs/quizland-voicevox-order/ORDER-FULL.md` (907 件) + くるみ第 1〜5 問目コール 5 件")
    lines.append(">")
    lines.append("> CSV フォーマット: 1 列目固定 `女の子`、 2 列目 speech、 ヘッダなし、 UTF-8 (BOM なし)、 CRLF。 既存 `voicepeak_lines_test27.csv` 準拠。")
    lines.append("")
    lines.append("## 方針サマリ (2026-05-12 ユーザー指示)")
    lines.append("")
    lines.append("- バッチ単位は **カテゴリ別** (8 カテゴリ + くるみ)")
    lines.append("- **Phase 1** = 問題文 (`q###_q`) + **正解選択肢 1 件**。 まずここを優先生成・試聴 → 辞書追加 → 次バッチ。")
    lines.append("- **Phase 2** = 不正解選択肢 3 件。 Phase 1 が落ち着いた後にまとめて生成。")
    lines.append("- くるみ第 1〜5 問目 (5 件) は別バッチで先行生成 (Phase 1 と並列で OK)。")
    lines.append("- Q160 補足版: 正解 = A → `q160_a_alt` (= 「ぞうきの はい」) は **Phase 1**、 `q160_b_alt` (= 「いぶくろの い」) は **Phase 2** に振り分け済。")
    lines.append("")
    lines.append("## Phase 1 件数表 (q + 正解 + くるみ)")
    lines.append("")
    lines.append("| カテゴリ | 問題数 | Phase 1 件数 (q + 正解) |")
    lines.append("|---|---:|---:|")
    for cat, qn, p1, _ in summary:
        lines.append(f"| {cat} | {qn} | {p1} |")
    lines.append(f"| くるみ第 1〜5 問目 | 5 | {total_kurumi} |")
    lines.append(f"| **合計** | **{sum(s[1] for s in summary)+5}** | **{total_phase1+total_kurumi}** |")
    lines.append("")
    lines.append("## Phase 2 件数表 (不正解 3 件 / 問)")
    lines.append("")
    lines.append("| カテゴリ | 問題数 | Phase 2 件数 (不正解) |")
    lines.append("|---|---:|---:|")
    for cat, qn, _, p2 in summary:
        lines.append(f"| {cat} | {qn} | {p2} |")
    lines.append(f"| **合計** | **{sum(s[1] for s in summary)}** | **{total_phase2}** |")
    lines.append("")
    lines.append("## 全件検算")
    lines.append("")
    lines.append(f"- Phase 1 (本編 q + 正解): {total_phase1}")
    lines.append(f"- Phase 1 (くるみ): {total_kurumi}")
    lines.append(f"- Phase 2 (不正解): {total_phase2}")
    lines.append(f"- **合計**: {total_phase1} + {total_phase2} + {total_kurumi} = **{grand}**")
    lines.append(f"- 期待値: 907 (本編) + 5 (くるみ) = **912** {'OK' if grand == 912 else 'NG'}")
    lines.append("")
    lines.append("## 推奨試聴順 (Phase 1)")
    lines.append("")
    lines.append("件数の少ないカテゴリから始めて、 辞書追加・パラメータ微調整を素早く回す方針。")
    lines.append("")
    lines.append("1. **くるみ 第 1〜5 問目 (5 件)**: 単純な定型句、 「だいいちもん〜だいごもん」 の数字読みだけ確認すれば足りる。 ここでくるみプリセットの基本パラメータを最終確定。")
    lines.append("2. **number_sequence (24 件)**: 12 問 × 2、 数字 1〜10 + 「つぎ / まえ / あいだ」 のみで語彙が極小。 「いち〜じゅう」 の音読み統一の効きを早期に確認。")
    lines.append("3. **order_color (48 件)**: 24 問 × 2、 色名 (あか/あお/きいろ/みどり/ピンク/オレンジ/むらさき/みずいろ) と 「ひだり/みぎから N ばんめ」 のみ。 似た語が多いのでアクセント差の確認に最適。")
    lines.append("4. **count_total (48 件)**: 24 問 × 2、 和語数詞 (ひとつ〜ここのつ + じゅっこ) の発音確認。 number_sequence の音読みと比較しやすいタイミングで実施。")
    lines.append("5. **shape_name (46 件)** → **weather (48 件)** → **body (49 件)** → **opposite (48 件)** → **trivia (52 件)**: 語彙が増えるので、 辞書 (75 語) を一通り効かせた状態で長文を試聴。 特に opposite はカギ括弧除去の効きを、 trivia は固有名詞 (チーター / ジンベイザメ / フラミンゴ etc.) の読みを重点確認。")
    lines.append("")
    lines.append("## 推奨ワークフロー (1 バッチあたりのサイクル)")
    lines.append("")
    lines.append("```")
    lines.append("[1] CSV を VOICEPEAK GUI にインポート")
    lines.append("    - voicepeak_lines_phase1_<category>.csv")
    lines.append("    - 1 行 = 1 セリフとして取り込み")
    lines.append("[2] 全行を一括書き出し (連番 wav)")
    lines.append("[3] 連番 wav → q###_X.wav にリネーム")
    lines.append("    - voicepeak_filename_map_phase1_<category>.json を参照")
    lines.append("[4] 試聴 → 読み崩れがあればユーザー辞書 (voicepeak_user_dict.csv) を更新")
    lines.append("    - csv 編集 → Convert-VoicepeakUserDictCsvToVdc2.ps1 で .vdc2 化")
    lines.append("    - VOICEPEAK GUI でユーザー辞書を再インポート")
    lines.append("[5] 該当行のみ再生成 → リネーム → 上書き")
    lines.append("[6] OK なら次のカテゴリへ")
    lines.append("```")
    lines.append("")
    lines.append("Phase 2 は Phase 1 で確定したプリセット + 辞書をそのまま流用するだけなので、")
    lines.append("カテゴリ別に分けてあるが連続で 8 カテゴリ一気に回しても OK。")
    lines.append("")
    lines.append("## 生成ファイル一覧")
    lines.append("")
    lines.append("### Phase 1 (9 ファイル × 2 = 18 ファイル)")
    lines.append("")
    for cat, _, _, _ in summary:
        lines.append(f"- `tools/voicepeak/voicepeak_lines_phase1_{cat}.csv` + `voicepeak_filename_map_phase1_{cat}.json`")
    lines.append(f"- `tools/voicepeak/voicepeak_lines_kurumi_dai1_5.csv` + `voicepeak_filename_map_kurumi_dai1_5.json`")
    lines.append("")
    lines.append("### Phase 2 (8 ファイル × 2 = 16 ファイル)")
    lines.append("")
    for cat, _, _, _ in summary:
        lines.append(f"- `tools/voicepeak/voicepeak_lines_phase2_{cat}.csv` + `voicepeak_filename_map_phase2_{cat}.json`")
    lines.append("")
    lines.append("### 計画ドキュメント")
    lines.append("")
    lines.append("- `tools/voicepeak/BATCH-PLAN-PHASE1-PHASE2.md` (本ファイル)")
    lines.append("")
    lines.append(f"**合計**: 18 (Phase 1) + 16 (Phase 2) + 1 (計画 md) = **35 ファイル**")
    lines.append("")
    path.write_text("\n".join(lines), encoding="utf-8")


if __name__ == "__main__":
    main()
