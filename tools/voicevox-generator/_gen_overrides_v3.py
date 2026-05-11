# -*- coding: utf-8 -*-
"""Generate accent_overrides.json (cycle 3, dict-strengthened v3)."""
import json
import sys
import io
from datetime import datetime, timezone

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8")

INPUT = r"D:\ポノのおへや\Dr.owl'quiz\NA\問題文\accent_input_20260511110417.json"

with open(INPUT, encoding="utf-8") as f:
    data = json.load(f)

# Standard target accents (per task spec, child-friendly, NHK based, dictionary-aligned).
# Map: mora_signature -> (target_accent, confidence, note, force_needs_listen)
TARGETS = {
    # Single-word colors (dict aligned: アカ/アオ/キイロ/ミドリ → 平板)
    "アカ":     (0, "high", "平板 (NHK)", False),
    "アオ":     (0, "high", "平板 (NHK)", False),
    "キイロ":   (0, "high", "平板 (NHK 辞書整合)", False),
    "ミドリ":   (0, "high", "平板 (NHK 辞書整合)", False),
    # Counting numbers
    "フタツ":   (2, "high", "中高 ふた'つ", False),
    "イツツ":   (2, "high", "中高 いつ'つ", False),
    "ナナツ":   (2, "high", "中高 なな'つ", False),
    "ココノツ": (2, "high", "中高 ここ'のつ", False),
    "ミッツ":   (1, "high", "頭高 み'っつ", False),
    "ヨッツ":   (1, "high", "頭高 よ'っつ", False),
    "ムッツ":   (1, "high", "頭高 む'っつ", False),
    "ヤッツ":   (1, "high", "頭高 や'っつ", False),
    # Digits
    "ニ":       (1, "high", "頭高 に' (1モーラは accent=1 強制)", True),
    "サン":     (1, "high", "頭高 さ'ん (撥音含む2モーラは頭高)", True),
    "ヨン":     (1, "high", "頭高 よ'ん", True),
    "ゴ":       (1, "high", "頭高 ご' (1モーラは accent=1 強制)", True),
    "ハチ":     (1, "high", "頭高 は'ち", False),
    "キュウ":   (1, "high", "頭高 きゅ'う", False),
    "ジュウ":   (1, "high", "頭高 じゅ'う", False),
    "イチ":     (1, "high", "頭高 い'ち", False),
    # Adjectives
    "アカイ":   (0, "high", "平板 (子供向け; NHK は 0 / 2 併存、平板を採用)", False),
    "マルイ":   (0, "high", "平板 (NHK)", False),
    "チイサイ": (3, "high", "中高 ち~~いさ'い (NHK 標準は 3)", False),
    "ヤサシイ": (0, "high", "平板 (NHK 標準は 0)", False),
    "オオキイ": (3, "high", "中高 おおき'い (NHK 標準は 3)", False),
    "オオキイノ": (3, "high", "中高 おおき'いの (5モーラ「大きいの」)", False),
    # Nouns / verb phrases
    "マンナカ":   (0, "high", "平板 (まんなか NHK 平板)", False),
    "マンナカワ": (0, "high", "平板 (5モーラ「真ん中は」、辞書「真ん中」反映、平板維持)", False),
    "ナニイロ":   (0, "high", "平板 (4モーラ「何色」、辞書反映)", False),
    "リンゴ":     (0, "high", "平板 (NHK)", False),
    "リンゴワ":   (0, "high", "平板 (4モーラ「りんごは」、平板維持)", False),
    "イクツ":     (1, "high", "頭高 い'くつ", False),
    "ハンタイ":   (0, "high", "平板 (はんたい NHK 平板)", False),
    "ハンタイワ": (0, "high", "平板 (5モーラ「反対は」、平板維持)", False),
    "イキ":       (0, "high", "平板 (息) — 子供向け平板優先", False),
    "イキオ":     (0, "high", "平板 いきお (3モーラ「息を」、子供向け平板)", False),
    "スウ":       (1, "high", "頭高 す'う (動詞「吸う」)", False),
    "スウノワ":   (2, "high", "中高 すう'のは (4モーラ、辞書「吸う」+「のは」)", False),
    "ノワ":       (2, "high", "尾高 のは'", False),
    "カラダ":     (0, "high", "平板 (からだ NHK 平板 0)", False),
    "カラダノ":   (0, "high", "平板 (4モーラ「体の」、平板維持)", False),
    "ドコ":       (1, "high", "頭高 ど'こ", False),
    "ハイ":       (1, "high", "頭高 は'い (医学用語「肺」)", True),
    "イ":         (1, "high", "頭高 い' (1モーラ、accent=1 強制)", True),
    "ココロ":     (2, "medium", "中高 ここ'ろ (NHK 2/3 併存→2 採用)", True),
    "ユビ":       (2, "high", "尾高 ゆび'", False),
    "ゾオキ":     (1, "high", "頭高 ぞ'おき (臓器)", False),
    "ゾオキノ":   (1, "high", "頭高 ぞ'おきの (4モーラ「臓器の」)", False),
    "ゾウキ":     (1, "high", "頭高 ぞ'うき (臓器)", False),
    "ゾウキノ":   (1, "high", "頭高 ぞ'うきの", False),
    "イブクロ":   (0, "medium", "平板 (NHK 0/3 併存、子供向けは 0 平板優勢)", False),
    "イブクロノ": (0, "medium", "平板 (5モーラ「胃袋の」、子供向けは平板優勢)", True),
    "ニノ":       (1, "high", "頭高 に'の", False),
    "ツギ":       (1, "high", "頭高 つ'ぎ", False),
    "ツギワ":     (1, "high", "頭高 つ'ぎは (次は)", False),
}


def determine_target(sig, mora_count):
    if mora_count == 1:
        spec = TARGETS.get(sig)
        if spec:
            # Force accent=1 for 1-mora regardless of map
            return (1, spec[1], spec[2], True)
        return (1, "high", "1モーラ語は accent=1 強制", True)
    return TARGETS.get(sig)


def needs_listen_for_item(item_id):
    if item_id in {"q160_a", "q160_b", "q160_c", "q160_d", "q160_a_alt", "q160_b_alt"}:
        return True
    if item_id in {"q170_a", "q170_b", "q170_c", "q170_d"}:
        return True
    return None


out_items = []
patches_total = 0
needs_listen_count = 0
medium_conf_count = 0
nan_iro_status = None
one_mora_results = []
unknown_sigs = []

for item in data["items"]:
    item_id = item["id"]
    text = item.get("text", "")
    aq = item.get("audio_query", {})
    aps = aq.get("accent_phrases", [])

    item_patches = []
    item_needs_listen_force = False

    for i, ph in enumerate(aps):
        moras = ph.get("moras", [])
        sig = "".join(m.get("text", "") for m in moras)
        n = len(moras)
        cur_accent = ph.get("accent")

        spec = determine_target(sig, n)
        if spec is None:
            unknown_sigs.append((item_id, i, sig, n, cur_accent))
            continue

        target_accent, conf, note, nl_override = spec

        if n == 1:
            one_mora_results.append((item_id, sig, cur_accent, target_accent))

        if cur_accent != target_accent:
            item_patches.append({
                "phrase_index": i,
                "mora_signature": sig,
                "accent": target_accent,
                "confidence": conf,
                "note": note,
            })
            patches_total += 1
            if conf == "medium":
                medium_conf_count += 1

        if nl_override is True:
            item_needs_listen_force = True

    forced = needs_listen_for_item(item_id)
    if forced is not None:
        needs_listen = forced
    else:
        needs_listen = item_needs_listen_force

    if needs_listen:
        needs_listen_count += 1

    out_item = {
        "id": item_id,
        "text": text,
        "patches": item_patches,
        "needs_listen": needs_listen,
    }

    if item_id == "q001_q":
        if len(aps) >= 2:
            sig2 = "".join(m.get("text", "") for m in aps[1].get("moras", []))
            if sig2 == "ナンショク":
                nan_iro_status = "FAILED (still ナンショク)"
                out_item["warning"] = (
                    "⚠ 辞書「何色 → ナニイロ」が VOICEVOX に反映されていません "
                    "(まだ「ナンショク」と推定中)。VOICEVOX エディタの "
                    "「設定→読み方&アクセント辞書」で user_dict 一括登録ボタンを押下、"
                    "または辞書再インポート/再起動が必要"
                )
            elif sig2 == "ナニイロ":
                nan_iro_status = "OK (ナニイロ反映済み)"
            else:
                nan_iro_status = f"OTHER ({sig2})"

    out_items.append(out_item)

now = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

result = {
    "schema_version": 1,
    "speaker_id": data.get("speaker_id", 10),
    "source": "docs/quizland-voicevox-order/COWORK-TEST-ORDER.md (漢字混じり版、辞書 65 語強化版 v3)",
    "generated_by": "Claude Code (3 サイクル目)",
    "generated_at": now,
    "items": out_items,
}

OUT1 = r"d:\AppDevelopment\pono-asobiba-app\tools\voicevox-generator\accent_overrides.json"
OUT2 = r"D:\ポノのおへや\Dr.owl'quiz\NA\問題文\accent_overrides.json"

for path in (OUT1, OUT2):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    print(f"WROTE: {path}")

print("\n=== SUMMARY ===")
print(f"Total items: {len(out_items)}")
print(f"Total patches: {patches_total}")
print(f"  (cycle 1: 18, cycle 2: 20, cycle 3: {patches_total})")
print(f"needs_listen items: {needs_listen_count}")
print(f"medium confidence patches: {medium_conf_count}")
print(f"\nナニイロ status: {nan_iro_status}")
print("\n1モーラ語 結果:")
for it_id, sig, cur, tgt in one_mora_results:
    mark = "(patch)" if cur != tgt else "(no patch)"
    print(f"  {it_id}: sig={sig!r} cur={cur} tgt={tgt} {mark}")
if unknown_sigs:
    print("\n[!] Unknown signatures (no spec, no patch):")
    for it_id, i, sig, n, cur in unknown_sigs:
        print(f"  {it_id} phrase[{i}]: sig={sig!r} n={n} accent={cur}")
