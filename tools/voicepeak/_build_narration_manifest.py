#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
assets/tts/manifest.json の `entries` に Quizland 問題本編 wav (assets/tts/quiz/q###_*.wav)
の登録エントリを追加生成するビルダー。

入力:
  - docs/quizland-voicevox-order/ORDER-FULL.md
      => Q### 単位の category 帰属 (### category: <cat>) と Q番号 -> ファイル名
  - quizland/data/questions.js
      => 各カテゴリの 0-origin idx (questions.js 配列の出現順 == Q番号の出現順)
  - assets/tts/quiz/  配下に実在する q###_*.wav ファイル一覧
  - assets/tts/manifest.json (既存)

出力:
  - assets/tts/manifest.json を「冪等」 に更新。
      * 既存 entries は温存。
      * 新規エントリ: key = "quizland:<category>:<idx>:<slot>", value = {"file": "quiz/q###_<slot>.wav"}
      * 重複 key は警告のみで上書きしない (既存値温存)。
      * 配置済の wav 1 件ごとに 1 entry。

slot 規則:
  - q       => 問題文       (suffix _q)
  - a/b/c/d => 選択肢 4 択   (suffix _a / _b / _c / _d)
  - q160 のみ補足版 q160_a_alt / q160_b_alt
      => slot を a_alt / b_alt として登録 (key "quizland:body:15:a_alt")

くるみ第 1-5 問目コール (kurumi_dai{1-5}mon.wav):
  - 既に SE_PATHS 経路 (assets/audio/sfx/quiz/) に配置済 + Narration とは独立に再生中。
  - manifest には登録しない (二重再生回避方針)。
  - assets/tts/quiz/ にコピーされていても skip。

エラーハンドリング:
  - file パス不正 (記号や ".." 含む) は SAFE_FILE_RE で弾く (Narration 側の resolveUrl と同期)。
  - category / idx 整合 NG => 警告 + skip。
  - 安全に何度でも再実行可能 (冪等)。

Usage:
  python tools/voicepeak/_build_narration_manifest.py
        [--manifest assets/tts/manifest.json]
        [--quiz-dir assets/tts/quiz]
        [--dry-run]
        [--verbose]
"""
import argparse
import json
import os
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_MANIFEST = ROOT / "assets" / "tts" / "manifest.json"
DEFAULT_QUIZ_DIR = ROOT / "assets" / "tts" / "quiz"
ORDER_FULL = ROOT / "docs" / "quizland-voicevox-order" / "ORDER-FULL.md"
QUESTIONS_JS = ROOT / "quizland" / "data" / "questions.js"

# Narration.js の SAFE_FILE_RE と完全一致 (^[a-zA-Z0-9_\-/]+\.wav$)
SAFE_FILE_RE = re.compile(r"^[a-zA-Z0-9_\-/]+\.wav$")

CATEGORY_RE = re.compile(r"^###\s*category:\s*([a-z_]+)")
QHEADER_RE = re.compile(r"^####\s*Q(\d+)\b")
WAV_NAME_RE = re.compile(r"^q(\d{3})_([a-d](?:_alt)?|q)\.wav$")


def parse_order_full():
    """
    ORDER-FULL.md をパースして Q番号 -> category のマップを構築する。

    返り値:
        q_to_category: dict[int -> str]   (例: 1 -> 'order_color', 145 -> 'body')
        category_q_order: dict[str -> list[int]]
            ORDER-FULL.md 内での Q番号の登場順 (= questions.js 上の idx 順を期待)
    """
    if not ORDER_FULL.exists():
        sys.exit(f"ERROR: ORDER-FULL.md が見つかりません: {ORDER_FULL}")

    text = ORDER_FULL.read_text(encoding="utf-8")
    q_to_category = {}
    category_q_order = {}
    current_cat = None

    for line in text.splitlines():
        m = CATEGORY_RE.match(line)
        if m:
            current_cat = m.group(1)
            category_q_order.setdefault(current_cat, [])
            continue
        m = QHEADER_RE.match(line)
        if m and current_cat:
            qnum = int(m.group(1))
            # Q160 / Q181 のような複数登場ケースは「初出 category」 を採用
            if qnum not in q_to_category:
                q_to_category[qnum] = current_cat
                category_q_order[current_cat].append(qnum)

    return q_to_category, category_q_order


def parse_questions_js_counts():
    """
    questions.js の各カテゴリ配列の長さを取得する (検証用)。

    返り値:
        dict[str -> int]   (例: 'order_color' -> 24, 'trivia' -> 26)
    """
    if not QUESTIONS_JS.exists():
        sys.exit(f"ERROR: questions.js が見つかりません: {QUESTIONS_JS}")

    text = QUESTIONS_JS.read_text(encoding="utf-8")
    cats = [
        "order_color", "count_total", "shape_name", "weather",
        "opposite", "trivia", "body", "number_sequence",
    ]
    out = {}
    for cat in cats:
        m = re.search(r"\b" + re.escape(cat) + r"\s*:\s*\[", text)
        if not m:
            continue
        # 配列の対応する ] までの範囲を取って、 そこに含まれる top-level エントリ
        # (= q: で始まる行 = 1 問につき 1 個ある必須プロパティ) を数える。
        start = m.end() - 1
        depth = 0
        end = None
        for i in range(start, len(text)):
            c = text[i]
            if c == '[':
                depth += 1
            elif c == ']':
                depth -= 1
                if depth == 0:
                    end = i
                    break
        if end is None:
            continue
        body = text[start:end + 1]
        # `q:` プロパティの数 (=問題数) を数える。 文字列内 false-positive を避けるため
        # 行頭 (空白後) の `q:` を厳密にマッチさせる
        n = len(re.findall(r"(?:^|[\s,{])q\s*:\s*[\"']", body))
        out[cat] = n
    return out


def build_q_to_idx(q_to_category, category_q_order, expected_counts, verbose=False):
    """
    Q番号 -> (category, idx) のマップを構築。

    idx は ORDER-FULL.md 内での category 内登場順 (questions.js の配列順と一致)。
    """
    q_to_idx = {}  # int -> (category, idx)
    for cat, qnums in category_q_order.items():
        # Q番号順に sort はしない: ORDER-FULL.md の出現順をそのまま採用
        # (Q181 は order_color の最後 idx=23 になる)
        for i, qnum in enumerate(qnums):
            q_to_idx[qnum] = (cat, i)
        if verbose:
            print(f"  [verify] {cat}: ORDER-FULL.md 内 {len(qnums)} 件 / questions.js {expected_counts.get(cat, '?')} 件",
                  file=sys.stderr)
        exp = expected_counts.get(cat)
        if exp is not None and exp != len(qnums):
            print(f"WARN: category {cat}: ORDER-FULL.md {len(qnums)} 件 vs questions.js {exp} 件 不一致",
                  file=sys.stderr)
    return q_to_idx


def list_wav_files(quiz_dir):
    """assets/tts/quiz/ 配下の q###_*.wav 一覧 (ファイル名のみ)。 存在しなければ空リスト。"""
    if not quiz_dir.exists():
        return []
    out = []
    for p in sorted(quiz_dir.iterdir()):
        if p.is_file() and p.suffix.lower() == ".wav":
            out.append(p.name)
    return out


def build_entries_from_wavs(wav_names, q_to_idx, verbose=False):
    """
    q###_*.wav リストから manifest entries (key -> {file: ...}) を生成。
    """
    entries = {}
    skipped = []
    for name in wav_names:
        # kurumi_dai*mon.wav は manifest 対象外 (SE 経路)
        if name.startswith("kurumi_dai") and name.endswith("mon.wav"):
            skipped.append((name, "kurumi_dai*mon.wav は SE 経路のため manifest 登録対象外"))
            continue
        m = WAV_NAME_RE.match(name)
        if not m:
            skipped.append((name, "ファイル名規則 q###_<slot>.wav に合致しない"))
            continue
        qnum = int(m.group(1))
        slot = m.group(2)  # q | a | b | c | d | a_alt | b_alt
        if qnum not in q_to_idx:
            skipped.append((name, f"Q{qnum:03d} が ORDER-FULL.md にない"))
            continue
        cat, idx = q_to_idx[qnum]
        key = f"quizland:{cat}:{idx}:{slot}"
        rel_file = f"quiz/{name}"
        if not SAFE_FILE_RE.match(rel_file):
            skipped.append((name, f"SAFE_FILE_RE で弾かれた: {rel_file}"))
            continue
        if key in entries:
            skipped.append((name, f"キー重複: {key} (前: {entries[key]['file']})"))
            continue
        entries[key] = {"file": rel_file}
    if verbose:
        for name, reason in skipped:
            print(f"  [skip] {name}: {reason}", file=sys.stderr)
    return entries, skipped


def merge_into_manifest(manifest_path, new_entries, dry_run=False, verbose=False):
    """
    既存 manifest.json を読み込み、 new_entries を加算した結果を書き戻す (冪等)。
    既存キーは温存 (上書き禁止)、 重複は警告のみ。
    """
    if manifest_path.exists():
        try:
            data = json.loads(manifest_path.read_text(encoding="utf-8"))
        except Exception as e:
            sys.exit(f"ERROR: 既存 manifest.json の JSON パース失敗: {e}")
    else:
        data = {"version": 1, "voice": "Leda", "entries": {}}
    if not isinstance(data, dict):
        sys.exit("ERROR: 既存 manifest.json の root が dict ではない")
    data.setdefault("version", 1)
    data.setdefault("entries", {})
    existing = data["entries"]

    added = 0
    kept = 0
    conflicts = []
    for key, value in new_entries.items():
        if key in existing:
            if existing[key] == value:
                kept += 1
            else:
                conflicts.append((key, existing[key], value))
            continue
        existing[key] = value
        added += 1

    if verbose:
        print(f"  [merge] 既存 entries: {len(existing) - added} (うち今回温存 {kept})",
              file=sys.stderr)
    if conflicts:
        print(f"WARN: {len(conflicts)} 件のキーで既存値と異なる新規値が来た (既存値温存):",
              file=sys.stderr)
        for k, old, new in conflicts[:10]:
            print(f"  - {k}: old={old} new={new}", file=sys.stderr)

    if dry_run:
        print(f"[dry-run] 追加予定 {added} 件 / 温存 {kept} 件 / 衝突 {len(conflicts)} 件",
              file=sys.stderr)
        return added, kept, len(conflicts)

    # entries を sort された順で書き直す (diff を読みやすく)
    sorted_entries = dict(sorted(data["entries"].items()))
    data["entries"] = sorted_entries

    text = json.dumps(data, ensure_ascii=False, indent=2) + "\n"
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    manifest_path.write_text(text, encoding="utf-8")
    return added, kept, len(conflicts)


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--manifest", default=str(DEFAULT_MANIFEST),
                    help=f"出力先 manifest.json (default: {DEFAULT_MANIFEST})")
    ap.add_argument("--quiz-dir", default=str(DEFAULT_QUIZ_DIR),
                    help=f"q###_*.wav 配置済ディレクトリ (default: {DEFAULT_QUIZ_DIR})")
    ap.add_argument("--dry-run", action="store_true", help="書き込みなし (検証のみ)")
    ap.add_argument("--verbose", action="store_true", help="詳細ログ")
    args = ap.parse_args()

    manifest_path = Path(args.manifest).resolve()
    quiz_dir = Path(args.quiz_dir).resolve()

    print(f"== Build-NarrationManifest ==", file=sys.stderr)
    print(f"  ROOT       : {ROOT}", file=sys.stderr)
    print(f"  manifest   : {manifest_path}", file=sys.stderr)
    print(f"  quiz dir   : {quiz_dir}", file=sys.stderr)
    print(f"  ORDER-FULL : {ORDER_FULL}", file=sys.stderr)
    print(f"  questions  : {QUESTIONS_JS}", file=sys.stderr)

    q_to_category, category_q_order = parse_order_full()
    expected_counts = parse_questions_js_counts()
    q_to_idx = build_q_to_idx(q_to_category, category_q_order,
                              expected_counts, verbose=args.verbose)

    wavs = list_wav_files(quiz_dir)
    print(f"  wavs found : {len(wavs)} (in {quiz_dir})", file=sys.stderr)

    new_entries, skipped = build_entries_from_wavs(wavs, q_to_idx,
                                                   verbose=args.verbose)
    print(f"  new entries: {len(new_entries)} ({len(skipped)} skipped)", file=sys.stderr)

    added, kept, conflicts = merge_into_manifest(manifest_path, new_entries,
                                                 dry_run=args.dry_run,
                                                 verbose=args.verbose)
    print(f"  result     : 追加 {added} / 温存 {kept} / 衝突 {conflicts}",
          file=sys.stderr)
    if args.dry_run:
        print(f"[dry-run] 書き込みは行いません", file=sys.stderr)
    else:
        print(f"OK: {manifest_path} を更新しました ({added} 件追加)", file=sys.stderr)


if __name__ == "__main__":
    main()
