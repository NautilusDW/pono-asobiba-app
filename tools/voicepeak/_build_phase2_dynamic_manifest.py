"""
Build dynamic phase2 manifest entries for 5 categories using phase1 wav reuse.

For each phase2 hiragana word, find the equivalent phase1 wav (recorded with kanji speech
but same pronunciation). Use a manual translation table for accuracy.

Output: dynamic entries to be merged into assets/tts/manifest.json
"""

import json
from pathlib import Path

ROOT = Path(r"d:/AppDevelopment/pono-asobiba-app")
TOOLS = ROOT / "tools/voicepeak"

# Per-category manual reuse tables
# Each maps a phase2 hiragana key (from voicepeak_unique_expand_<cat>_phase2.json)
# to a (source_cat, source_phase1_key) tuple where the equivalent phase1 wav exists.

SHAPE_NAME_REUSE = {
    'まる':   ('shape_name', '丸'),
    'しかく': ('shape_name', '四角'),
    'さんかく': ('shape_name', '三角'),
    'ほし':   ('shape_name', '星'),
    'ハート': ('shape_name', 'ハート'),
    'よんこ': ('shape_name', '四個'),
    'さんこ': ('shape_name', '三個'),
    'ごこ':   ('shape_name', '五個'),
}

WEATHER_REUSE = {
    'くもり': ('weather', '曇り'),
    'あめ':   ('weather', '雨'),
    'ゆき':   ('weather', '雪'),
    'はれ':   ('weather', '晴れ'),
    'かみなり': ('weather', '雷'),
    'にじ':   ('weather', '虹'),
    'ほし':   ('shape_name', '星'),
    'たつまき': ('weather', '竜巻'),
    'たいふう': ('weather', '台風'),
    'まる':   ('shape_name', '丸'),
    'しかく': ('shape_name', '四角'),
}

OPPOSITE_REUSE = {
    'ちいさい': ('opposite', '小さい'),
    'やわらかい': ('opposite', '柔らかい'),
    'みじかい': ('opposite', '短い'),
    'おもい':   ('opposite', '重い'),
    'くらい':   ('opposite', 'くらい'),
    'おそい':   ('opposite', '遅い'),
    'ふるい':   ('opposite', '古い'),
    'よわい':   ('opposite', '弱い'),
    'すくない': ('opposite', '少ない'),
}

# Body phase1 single-word entries include a trailing period (e.g. "め。"). The period
# adds a brief pause but the word pronunciation itself is identical to the plain phase2
# hiragana ("め"). For wrong-choice playback this is acceptable, so we reuse them.
# This matches the task's "8 件再利用可" estimate for body.
BODY_REUSE = {
    'はな': ('body', 'はな。'),       # q162_a, q166_a
    'くち': ('body', '口。'),          # q159_c
    'みみ': ('body', '耳。'),          # q164_c, q169_c
    'め':   ('body', 'め。'),          # q158_b, q163_b
    'あし': ('body', 'あし。'),        # q161_a
    'て':   ('body', 'て。'),          # q160_c
    'すくない': ('opposite', '少ない'),
    # 'は' (teeth) -> phase1 'は。' q167_b
    # but 'は' appears in trivia phase2 only as part of 'ユーカリのは', not standalone.
    # body phase2 keys do not include standalone 'は', so no entry needed.
    # 'おなか' has no phase1 equivalent (only as part of 'おなかの 中で 空気が 動くから。' q178_a).
}

# Trivia phase2 — limited reuse. Cross-category candidates:
# - 'はな', 'みみ', 'あし' appear in trivia phase2 (Q86 elephant body parts).
# - body phase1 has 'はな。', 'あし。', '耳。' with periods — reuse acceptable.
# - 'あめ' (Q87 wrong choice) -> weather phase1 '雨' (no period).
# - 'ふたつ', 'ひとつ', 'よっつ' (Q107 tako hearts choices) -> count_total phase1 (pure hiragana).
# - 'クモ' (Q105 wrong choice maybe? actually answer of Q93 = クモ) -> trivia phase1 q093_a/q105_b
TRIVIA_REUSE = {
    'はな': ('body', 'はな。'),
    'みみ': ('body', '耳。'),
    'あし': ('body', 'あし。'),
    'あめ':   ('weather', '雨'),
    'ふたつ': ('count_total', 'ふたつ'),
    'ひとつ': ('count_total', 'ひとつ'),
    'よっつ': ('count_total', 'よっつ'),
    # Cross-cat color names from order_color phase1 (VOICEPEAK reads 赤/青 as あか/あお).
    'あか':   ('order_color', '赤'),
    'あお':   ('order_color', '青'),
}


REUSE_TABLES = {
    'shape_name': SHAPE_NAME_REUSE,
    'weather': WEATHER_REUSE,
    'opposite': OPPOSITE_REUSE,
    'body': BODY_REUSE,
    'trivia': TRIVIA_REUSE,
}


def load_phase1_expand(cat):
    p = TOOLS / f"voicepeak_unique_expand_{cat}_phase1.json"
    return json.loads(p.read_text(encoding='utf-8'))


def load_phase2_expand(cat):
    p = TOOLS / f"voicepeak_unique_expand_{cat}_phase2.json"
    return json.loads(p.read_text(encoding='utf-8'))


def get_first_wav(phase1_data, key):
    """Return the first wav file (relative to assets/tts/quiz/) for a phase1 key, or None."""
    wavs = phase1_data.get(key, [])
    if not wavs:
        return None
    return wavs[0]


def parse_qno_letter(wav_filename):
    """e.g., 'q049_a.wav' -> (49, 'a'), 'q173_a_alt.wav' -> (173, 'a_alt')"""
    base = wav_filename.replace('.wav', '')
    if not base.startswith('q'):
        return None, None
    parts = base[1:].split('_', 1)
    return int(parts[0]), parts[1] if len(parts) > 1 else None


def qno_to_cat_idx(qno):
    """Canonical Q### scheme per MEMORY.md:
       order_color Q1-24 / count_total Q25-48 / shape_name Q49-71 (skip Q67) /
       number_sequence Q72-83 / trivia Q84-109 / weather Q110-133 /
       opposite Q134-157 / body Q158-181."""
    if 1 <= qno <= 24:
        return 'order_color', qno - 1
    if 25 <= qno <= 48:
        return 'count_total', qno - 25
    if 49 <= qno <= 71:
        if qno == 67:
            return None, None
        if qno < 67:
            return 'shape_name', qno - 49
        return 'shape_name', qno - 49 - 1
    if 72 <= qno <= 83:
        return 'number_sequence', qno - 72
    if 84 <= qno <= 109:
        return 'trivia', qno - 84
    if 110 <= qno <= 133:
        return 'weather', qno - 110
    if 134 <= qno <= 157:
        return 'opposite', qno - 134
    if 158 <= qno <= 181:
        return 'body', qno - 158
    return None, None


def main():
    manifest_path = ROOT / "assets/tts/manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
    existing_keys = set(manifest['entries'].keys())

    quiz_dir = ROOT / "assets/tts/quiz"
    existing_wavs = set(p.name for p in quiz_dir.glob("*.wav"))

    phase1_cache = {}
    for cat in ['shape_name', 'weather', 'opposite', 'body', 'trivia',
                'count_total', 'order_color', 'number_sequence']:
        phase1_cache[cat] = load_phase1_expand(cat)

    summary = {}
    new_entries = {}
    miss_keys_by_cat = {}

    for target_cat, reuse_table in REUSE_TABLES.items():
        phase2 = load_phase2_expand(target_cat)
        add_count = 0
        skip_existing = 0
        miss_words = []
        miss_targets = 0
        for hiragana_key, target_wavs in phase2.items():
            mapping = reuse_table.get(hiragana_key)
            if mapping is None:
                miss_words.append((hiragana_key, len(target_wavs)))
                miss_targets += len(target_wavs)
                continue
            src_cat, src_key = mapping
            src_wav = get_first_wav(phase1_cache[src_cat], src_key)
            if src_wav is None:
                print(f"  WARN {target_cat}:{hiragana_key!r} -> ({src_cat},{src_key!r}) has no phase1 wavs")
                miss_words.append((hiragana_key, len(target_wavs)))
                miss_targets += len(target_wavs)
                continue
            if src_wav not in existing_wavs:
                print(f"  WARN {target_cat}:{hiragana_key!r} -> {src_wav} NOT ON DISK")
                miss_words.append((hiragana_key, len(target_wavs)))
                miss_targets += len(target_wavs)
                continue
            wav_path = f"quiz/{src_wav}"

            for tgt in target_wavs:
                qno, letter = parse_qno_letter(tgt)
                if qno is None:
                    continue
                cat, idx = qno_to_cat_idx(qno)
                if cat is None:
                    continue
                key = f"quizland:{cat}:{idx}:{letter}"
                if key in existing_keys:
                    skip_existing += 1
                    continue
                if key in new_entries:
                    continue
                new_entries[key] = {"file": wav_path}
                add_count += 1

        summary[target_cat] = {
            'add': add_count,
            'skip_existing': skip_existing,
            'miss_words': len(miss_words),
            'miss_targets': miss_targets,
        }
        miss_keys_by_cat[target_cat] = miss_words

    print("=== SUMMARY ===")
    total_add = 0
    total_miss = 0
    for cat, s in summary.items():
        print(f"  {cat:11}: add={s['add']:3d}, skip_existing={s['skip_existing']:3d}, "
              f"miss_words={s['miss_words']:3d}, miss_targets={s['miss_targets']:3d}")
        total_add += s['add']
        total_miss += s['miss_targets']
    print(f"  {'TOTAL':11}: add={total_add}, miss_targets={total_miss}")

    out_path = TOOLS / "_phase2_dynamic_entries_v2.json"
    out_path.write_text(json.dumps(new_entries, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f"\nWrote {len(new_entries)} new entries to {out_path}")


if __name__ == '__main__':
    main()
