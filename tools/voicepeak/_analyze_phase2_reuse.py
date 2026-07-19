"""
Analyze phase2 reuse for 5 categories: shape_name / weather / opposite / body / trivia.

For each category:
- Parse questions.js to extract question list + choices[answer] (correct text)
- Parse phase2 CSV (flat list of wrong-choice texts in question order, 3 lines per question for 4-choice questions)
- Build "correct answer text -> q###_letter wav" map from manifest (already-generated phase1 wavs)
- For each phase2 wrong-choice text, look up if it matches some existing correct-answer text
- Output: dynamic manifest entries `quizland:<cat>:<idx>:<a|b|c|d>` -> reused wav path

The choice letter mapping for wrong choices:
- answer=0 -> wrong choices are choices[1], choices[2], choices[3] = b, c, d
- answer=1 -> wrong choices are choices[0], choices[2], choices[3] = a, c, d
- answer=2 -> wrong choices are choices[0], choices[1], choices[3] = a, b, d
- answer=3 -> wrong choices are choices[0], choices[1], choices[2] = a, b, c
"""

import json
import re
from pathlib import Path

ROOT = Path(r"d:/AppDevelopment/pono-asobiba-app")
QUESTIONS_JS = ROOT / "quizland/data/questions.js"
MANIFEST = ROOT / "assets/tts/manifest.json"

# Canonical Q### offset per category (per MEMORY.md feedback_questions_js_q_number_canonical_source.md)
# shape_name has 22 questions with q067 skipped (Q67 deleted), so index 18+ uses 50+i offset
CATEGORIES = {
    'shape_name': {'q_base': 49, 'count': 22, 'gap_after_idx': 17, 'gap_size': 1},  # q049..q066 (0-17), q068..q071 (18-21)
    'weather':    {'q_base': 110, 'count': 24},
    'opposite':   {'q_base': 134, 'count': 24},
    'body':       {'q_base': 158, 'count': 24},
    'trivia':     {'q_base': 84, 'count': 26},
}

LETTER_MAP = ['a', 'b', 'c', 'd']


def idx_to_qno(cat, idx):
    info = CATEGORIES[cat]
    base = info['q_base']
    qno = base + idx
    if 'gap_after_idx' in info and idx > info['gap_after_idx']:
        qno += info['gap_size']
    return qno


def parse_questions_js():
    """Extract per-category question lists with normalized choice texts."""
    text = QUESTIONS_JS.read_text(encoding='utf-8')
    # Find each category block
    out = {}
    for cat in CATEGORIES:
        # Match: cat: [ ... ],   then the next category or closing
        # Use regex with negative-lookahead-safe parsing
        # Simpler: find "  cat: [" and walk braces
        m = re.search(rf"\n  {cat}: \[\n", text)
        if not m:
            print(f"WARN: cannot find category {cat}")
            continue
        start = m.end()
        # Walk to find matching closing ]
        depth = 1
        i = start
        while i < len(text) and depth > 0:
            c = text[i]
            if c == '[':
                depth += 1
            elif c == ']':
                depth -= 1
            i += 1
        body = text[start:i-1]
        # Now parse each top-level {...} block (questions)
        questions = []
        depth = 0
        cur_start = None
        for j, c in enumerate(body):
            if c == '{':
                if depth == 0:
                    cur_start = j
                depth += 1
            elif c == '}':
                depth -= 1
                if depth == 0 and cur_start is not None:
                    questions.append(body[cur_start:j+1])
                    cur_start = None
        out[cat] = questions
    return out


def extract_answer_and_choices(qblock):
    """From one question JS literal, extract answer index and choice texts."""
    # answer:N
    am = re.search(r"\banswer\s*:\s*(\d+)", qblock)
    if not am:
        return None, None
    answer = int(am.group(1))
    # choices: [...] - find the choices array (handle nested braces for {text,image})
    cm = re.search(r"\bchoices\s*:\s*\[", qblock)
    if not cm:
        return answer, None
    start = cm.end()
    depth = 1
    i = start
    while i < len(qblock) and depth > 0:
        c = qblock[i]
        if c == '[':
            depth += 1
        elif c == ']':
            depth -= 1
        i += 1
    choices_body = qblock[start:i-1]
    # Parse top-level choices: either bare string 'foo' or object {text:'foo', image:'...'}
    choices = []
    j = 0
    n = len(choices_body)
    while j < n:
        # Skip whitespace and commas
        while j < n and choices_body[j] in ' \t\n,':
            j += 1
        if j >= n:
            break
        if choices_body[j] == "'":
            # Find matching '
            k = j + 1
            while k < n and choices_body[k] != "'":
                if choices_body[k] == '\\':
                    k += 2
                else:
                    k += 1
            choices.append(choices_body[j+1:k])
            j = k + 1
        elif choices_body[j] == '"':
            k = j + 1
            while k < n and choices_body[k] != '"':
                if choices_body[k] == '\\':
                    k += 2
                else:
                    k += 1
            choices.append(choices_body[j+1:k])
            j = k + 1
        elif choices_body[j] == '{':
            # Object {text:'...', image:'...'}: extract text
            depth = 1
            k = j + 1
            while k < n and depth > 0:
                if choices_body[k] == '{':
                    depth += 1
                elif choices_body[k] == '}':
                    depth -= 1
                k += 1
            obj_body = choices_body[j+1:k-1]
            tm = re.search(r"\btext\s*:\s*'([^']*)'", obj_body)
            if not tm:
                tm = re.search(r'\btext\s*:\s*"([^"]*)"', obj_body)
            choices.append(tm.group(1) if tm else '')
            j = k
        else:
            j += 1
    return answer, choices


def read_phase2_csv(cat):
    p = ROOT / f"tools/voicepeak/voicepeak_lines_phase2_{cat}.csv"
    lines = []
    for line in p.read_text(encoding='utf-8').splitlines():
        if not line.strip():
            continue
        # Format: 女性4,<text>
        parts = line.split(',', 1)
        if len(parts) == 2:
            lines.append(parts[1])
    return lines


def main():
    # Load manifest
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    entries = manifest['entries']

    # Build "text -> [wav files]" lookup from existing manifest entries
    # We focus on phase1 correct-answer entries (cat:idx:[abcd]) — these are the recorded wavs
    # We also include phase1 :q entries but those are question audio, not answer audio
    # For reuse, we need text -> wav. We don't have text in manifest directly. We need to derive
    # the text from questions.js: each cat:idx:<letter> entry corresponds to choices[<letter idx>] of question idx.

    qblocks = parse_questions_js()
    # Build for each category: {idx: (answer, choices)}
    cat_data = {}
    for cat, blocks in qblocks.items():
        cat_data[cat] = {}
        for i, qb in enumerate(blocks):
            ans, ch = extract_answer_and_choices(qb)
            cat_data[cat][i] = (ans, ch)
        print(f"{cat}: parsed {len(blocks)} questions")

    # Build text -> wav file lookup from existing manifest + questions
    # For each existing manifest entry quizland:<cat>:<idx>:<letter>:
    #   letter == 'q' -> question audio, not a choice text
    #   letter in a/b/c/d -> choices[letter_idx] text -> file
    # Also g_num_*.wav are global number wavs (count_total uses them)
    text_to_wav = {}  # text -> wav file path (relative to assets/tts/)
    # Track g_num wavs separately (these contain digit texts like '3つ' implicitly)
    g_num_map = {}  # only useful if a phase2 wrong-choice text matches some count_total choice

    for key, val in entries.items():
        if not key.startswith('quizland:'):
            continue
        parts = key.split(':')
        # quizland:<cat>:<idx>:<letter>
        if len(parts) != 4:
            continue
        _, cat, idx_str, letter = parts
        if cat not in cat_data:
            # Also include count_total / order_color / number_sequence as cross-cat reuse sources
            # We don't have their questions parsed here, but we can still skip for now
            # Actually they are useful: e.g., count_total wrong wav for "3つ" could match shape_name "3こ"? unlikely.
            # Let's include them if we parse them too. For now skip.
            continue
        try:
            idx = int(idx_str)
        except:
            continue
        if letter == 'q':
            continue
        if letter not in LETTER_MAP and not letter.endswith('_alt'):
            continue
        # Strip _alt suffix if present
        letter_clean = letter.replace('_alt', '')
        if letter_clean not in LETTER_MAP:
            continue
        l_idx = LETTER_MAP.index(letter_clean)
        ans_and_choices = cat_data[cat].get(idx)
        if not ans_and_choices:
            continue
        ans, choices = ans_and_choices
        if not choices or l_idx >= len(choices):
            continue
        text = choices[l_idx]
        if not text:
            continue
        wav = val['file']
        # Register text -> wav (prefer first / shorter wav, or just keep first)
        if text not in text_to_wav:
            text_to_wav[text] = wav

    print(f"\ntext_to_wav lookup has {len(text_to_wav)} unique texts from existing manifest")

    # Now also parse order_color, count_total, number_sequence questions for cross-cat reuse source
    # (we already have them in cat_data only for the 5 target categories, but for source we need all)
    # Let's re-parse for these too
    text_all = QUESTIONS_JS.read_text(encoding='utf-8')
    extra_cats = ['order_color', 'count_total', 'number_sequence']
    extra_data = {}
    for cat in extra_cats:
        m = re.search(rf"\n  {cat}: \[\n", text_all)
        if not m:
            continue
        start = m.end()
        depth = 1
        i = start
        while i < len(text_all) and depth > 0:
            c = text_all[i]
            if c == '[':
                depth += 1
            elif c == ']':
                depth -= 1
            i += 1
        body = text_all[start:i-1]
        questions = []
        depth = 0
        cur_start = None
        for j, c in enumerate(body):
            if c == '{':
                if depth == 0:
                    cur_start = j
                depth += 1
            elif c == '}':
                depth -= 1
                if depth == 0 and cur_start is not None:
                    questions.append(body[cur_start:j+1])
                    cur_start = None
        extra_data[cat] = {}
        for i, qb in enumerate(questions):
            ans, ch = extract_answer_and_choices(qb)
            extra_data[cat][i] = (ans, ch)
        print(f"{cat} (extra): parsed {len(questions)} questions")

    # Add their correct-answer choice texts to text_to_wav from manifest
    for key, val in entries.items():
        if not key.startswith('quizland:'):
            continue
        parts = key.split(':')
        if len(parts) != 4:
            continue
        _, cat, idx_str, letter = parts
        if cat not in extra_data:
            continue
        try:
            idx = int(idx_str)
        except:
            continue
        if letter == 'q':
            continue
        letter_clean = letter.replace('_alt', '')
        if letter_clean not in LETTER_MAP:
            continue
        l_idx = LETTER_MAP.index(letter_clean)
        ac = extra_data[cat].get(idx)
        if not ac:
            continue
        ans, choices = ac
        if not choices or l_idx >= len(choices):
            continue
        text = choices[l_idx]
        if not text:
            continue
        wav = val['file']
        if text not in text_to_wav:
            text_to_wav[text] = wav

    print(f"text_to_wav (incl. cross-cat) = {len(text_to_wav)} unique texts")
    # Show some samples
    sample = sorted(text_to_wav.items())[:20]
    for t, w in sample:
        print(f"  {t!r} -> {w}")
    print('...')

    # Now process phase2 for each target category
    results = {}  # cat -> {idx: {letter: wav}}
    summary = {}
    for cat, info in CATEGORIES.items():
        results[cat] = {}
        phase2 = read_phase2_csv(cat)
        n_questions = info['count']
        # phase2 has 3 wrong-choice lines per question (assuming all 4-choice)
        expected = n_questions * 3
        if len(phase2) != expected:
            print(f"\nWARN {cat}: phase2 has {len(phase2)} lines, expected {expected}")
        # iterate through questions
        line_idx = 0
        reuse_count = 0
        miss_count = 0
        for q_idx in range(n_questions):
            ac = cat_data[cat].get(q_idx)
            if not ac:
                continue
            ans, choices = ac
            if not choices:
                continue
            # determine wrong letters
            wrong_letters = [LETTER_MAP[i] for i in range(4) if i != ans]
            for wl_idx, letter in enumerate(wrong_letters):
                if line_idx >= len(phase2):
                    break
                wrong_text = phase2[line_idx]
                # Verify match with questions.js choices[letter_idx]
                l_pos = LETTER_MAP.index(letter)
                expected_text = choices[l_pos] if l_pos < len(choices) else None
                # We trust phase2 CSV; check consistency
                # (some textual differences possible — but should match)
                if wrong_text in text_to_wav:
                    wav = text_to_wav[wrong_text]
                    # Don't self-reference: skip if wav is for same cat:idx
                    # Actually self-reference is fine if it's for same Q (won't happen since wrong != correct)
                    # But avoid pointing to a non-existent wav. Check the wav refers to a phase1 wav (not g_num for non-count cats).
                    if q_idx not in results[cat]:
                        results[cat][q_idx] = {}
                    results[cat][q_idx][letter] = wav
                    reuse_count += 1
                else:
                    miss_count += 1
                line_idx += 1
        summary[cat] = {'reuse': reuse_count, 'miss': miss_count, 'total': reuse_count + miss_count}
        print(f"\n{cat}: reuse={reuse_count}, miss={miss_count}, total={reuse_count+miss_count}")

    print("\n=== SUMMARY ===")
    total_reuse = 0
    total_miss = 0
    for cat, s in summary.items():
        print(f"  {cat}: reuse={s['reuse']:3d} / miss={s['miss']:3d} / total={s['total']:3d}")
        total_reuse += s['reuse']
        total_miss += s['miss']
    print(f"  TOTAL: reuse={total_reuse} / miss={total_miss} / total={total_reuse+total_miss}")

    # Output dynamic entries as JSON for the next step
    out_entries = {}
    for cat, idx_map in results.items():
        for idx, letters in idx_map.items():
            for letter, wav in letters.items():
                key = f"quizland:{cat}:{idx}:{letter}"
                out_entries[key] = {"file": wav}

    out_path = ROOT / "tools/voicepeak/_phase2_dynamic_entries.json"
    out_path.write_text(json.dumps(out_entries, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f"\nWrote {len(out_entries)} dynamic entries to {out_path}")


if __name__ == '__main__':
    main()
