# -*- coding: utf-8 -*-
"""K1 — ORDER-FULL.md  Q### / q### normalization to QUIZLAND_CATEGORIES canonical order.

Strategy:
  1. Replace literal category-range tokens like "Q24〜Q47" with their new range
     (e.g. "Q25〜Q48") in one pass. The number_sequence range "Q72〜Q83" has no
     rule so it is preserved verbatim.
  2. Split the file into named sections by their leading "### category: <name>"
     headers, then apply a per-section old->new Q###/q### map using a placeholder
     scheme so we never double-convert.
  3. For the intro (everything before the first "### category:" header) and the
     summary tail (everything after the last "### category:" body, including the
     "## まとめ" block and the trailing "### category: order_color (補足)"), we
     apply per-category-aware individual Q-number remapping, while protecting any
     "QNN〜QMM" range tokens that the step-1 literal pass already handled.

number_sequence (Q72-Q83) section is intentionally skipped (it's already
canonical Q72-Q83 from Z11b).
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

PATH = Path(r"d:\AppDevelopment\pono-asobiba-app\docs\quizland-voicevox-order\ORDER-FULL.md")


# ---------- Per-section maps for the per-question category blocks ----------
def _build(old_lo: int, old_hi: int, new_lo: int, extras: dict | None = None) -> dict:
    m = {old_lo + i: new_lo + i for i in range(old_hi - old_lo + 1)}
    if extras:
        m.update(extras)
    return m


SECTION_MAPS: dict[str, dict[int, int]] = {
    # order_color keeps Q1-Q23 (identity) and adds Q181 -> Q24 (the 補足 section
    # also matches name "order_color" so it reuses this same map).
    "order_color":  _build(1, 23, 1, extras={181: 24}),
    "count_total":  _build(24, 47, 25),
    "shape_name":   _build(48, 70, 49),
    "weather":      _build(71, 94, 110),
    "opposite":     _build(95, 118, 134),
    "trivia":       _build(119, 144, 84),
    "body":         _build(145, 168, 158),
    # number_sequence -- intentionally skipped.
}


# ---------- Intro & summary: literal "QNN〜QMM" range rewrites ----------
INTRO_RANGE_REWRITES: list[tuple[str, str]] = [
    # All zenkaku-tilde (〜) range tokens that appear in the intro and summary.
    # Q01-Q23 unchanged (order_color base).
    ("Q24〜Q47",  "Q25〜Q48"),
    ("Q48〜Q70",  "Q49〜Q71"),
    ("Q71〜Q94",  "Q110〜Q133"),
    ("Q95〜Q118", "Q134〜Q157"),
    ("Q119〜Q144", "Q84〜Q109"),
    ("Q145〜Q168", "Q158〜Q181"),
    # number_sequence (Q72〜Q83) is canonical — keep as is.
    # File-naming range "Q01〜Q180" and "q001〜q180" are historic descriptive
    # bounds. With Q181 collapsed into Q24 there is no longer a hole; total span
    # is Q01〜Q181 / q001〜q181 across the 181 questions.
    ("Q01〜Q180",  "Q01〜Q181"),
    ("q001〜q180", "q001〜q181"),
]


# ---------- Individual-Q remap for intro & summary (single Q-number tokens) ----------
# The same per-category map but expressed as a single flat dict that covers ALL
# old Q-numbers (excluding 72-83 number_sequence, which stay as-is). Used for
# isolated Q-number mentions like "Q160" inside prose.
def _flatten_global_map() -> dict[int, int]:
    flat: dict[int, int] = {}
    flat.update(_build(1, 23, 1, extras={181: 24}))   # order_color (181 -> 24)
    flat.update(_build(24, 47, 25))                    # count_total
    flat.update(_build(48, 70, 49))                    # shape_name
    flat.update(_build(71, 94, 110))                   # weather  (overrides 72-83 -> weather)
    flat.update(_build(95, 118, 134))                  # opposite
    flat.update(_build(119, 144, 84))                  # trivia
    flat.update(_build(145, 168, 158))                 # body
    # number_sequence Q72-Q83 already mapped to weather (Q111-Q122) by the line
    # above. For isolated intro/summary mentions we want WEATHER semantics for the
    # OLD numbering. Since the intro never references number_sequence individually
    # (only via the range "Q72〜Q83"), and we protect ranges before the individual
    # pass, this is safe.
    return flat


GLOBAL_INDIVIDUAL_MAP = _flatten_global_map()


# ---------- Helpers ----------
SECTION_HEADER_RE = re.compile(r"^### category:\s*(\S+)", re.MULTILINE)
# Also detect top-level "## " headers so we can locate the summary tail that sits
# between the number_sequence section's per-question block and the trailing
# "### category: order_color (補足)" section.
H2_RE = re.compile(r"^## ", re.MULTILINE)
# For Q### we use a lookbehind/lookahead that disallows word chars, but for the
# trailing side we explicitly forbid a digit (so "Q1" inside "Q10" is not matched).
Q_BIG_RE = re.compile(r"(?<![A-Za-z0-9_])Q(\d{1,3})(?!\d)")
# For q### (the audio file id) we likewise allow following "_" since e.g.
# "q024_q.wav" puts an underscore right after the 3 digits. The trailing side
# only needs to forbid a 4th digit.
Q_SMALL_RE = re.compile(r"(?<![A-Za-z0-9])q(\d{3})(?!\d)")


def find_section_spans(text: str) -> list[tuple[str, int, int]]:
    matches = list(SECTION_HEADER_RE.finditer(text))
    spans: list[tuple[str, int, int]] = []
    for i, m in enumerate(matches):
        name = m.group(1).strip()
        start = m.start()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        spans.append((name, start, end))
    return spans


def convert_block_with_map(block: str, mapping: dict[int, int]) -> tuple[str, int, int]:
    """Placeholder-based rewrite that avoids double-conversion."""
    big_count = 0
    small_count = 0

    def big_repl(m: re.Match) -> str:
        nonlocal big_count
        old = int(m.group(1))
        if old not in mapping:
            return m.group(0)
        new = mapping[old]
        big_count += 1
        return f"\x00QBIG{new}\x00"

    def small_repl(m: re.Match) -> str:
        nonlocal small_count
        old = int(m.group(1))
        if old not in mapping:
            return m.group(0)
        new = mapping[old]
        small_count += 1
        return f"\x00QSML{new:03d}\x00"

    block = Q_BIG_RE.sub(big_repl, block)
    block = Q_SMALL_RE.sub(small_repl, block)

    block = re.sub(r"\x00QBIG(\d+)\x00", lambda m: f"Q{int(m.group(1)):02d}" if int(m.group(1)) < 100 else f"Q{int(m.group(1))}", block)
    block = re.sub(r"\x00QSML(\d{3})\x00", lambda m: f"q{m.group(1)}", block)

    return block, big_count, small_count


# Protect ANY range token: Q###〜Q### OR q###〜q###. Individual remap must not
# touch a number that's part of such a range (the literal-range pass above has
# already handled the bracket-Q ranges that needed shifting; everything else is
# a descriptive bounds reference that must stay literal).
RANGE_PROTECT_RE = re.compile(r"[Qq]\d{1,3}〜[Qq]\d{1,3}")


def rewrite_intro_or_summary_block(block: str) -> tuple[str, int, int, int]:
    """Step 1: rewrite literal "QNN〜QMM" tokens.
       Step 2: protect remaining "QNN〜QMM" range tokens, then apply individual
               GLOBAL_INDIVIDUAL_MAP rewrite to single Q-numbers.
       Step 3: also rewrite q### file-name references (e.g. q160_a.wav).
    """
    range_repl = 0
    for old, new in INTRO_RANGE_REWRITES:
        if old == new:
            continue
        c = block.count(old)
        if c:
            block = block.replace(old, new)
            range_repl += c

    # Protect any remaining "QNN〜QMM" tokens so the single-Q pass doesn't touch them.
    protected: list[str] = []

    def _protect(m: re.Match) -> str:
        protected.append(m.group(0))
        return f"\x00RANGE{len(protected) - 1}\x00"

    block = RANGE_PROTECT_RE.sub(_protect, block)

    # Apply per-category-aware individual single-Q rewrite.
    block, big_c, small_c = convert_block_with_map(block, GLOBAL_INDIVIDUAL_MAP)

    # Restore protected ranges.
    for i, val in enumerate(protected):
        block = block.replace(f"\x00RANGE{i}\x00", val)

    return block, range_repl, big_c, small_c


# ---------- main ----------
def main() -> int:
    text = PATH.read_text(encoding="utf-8")
    original_ends_nl = text.endswith("\n")

    # Compute section spans against the ORIGINAL text.
    spans = find_section_spans(text)
    if not spans:
        print("ERROR: no '### category:' headers found", file=sys.stderr)
        return 1

    # Sections processed bottom-up so indices stay valid.
    section_reports: list[tuple[str, int, int]] = []

    # Determine intro span and summary-tail spans.
    intro_start, intro_end = 0, spans[0][1]
    # Per-question blocks: each (name, start, end) from spans EXCEPT the last
    # "order_color (補足)" which is part of the trailing/summary region.
    # We treat the supplementary order_color section as a regular order_color
    # section (it uses the same map), but the "## まとめ" prose block in front
    # of it belongs to the summary tail and gets the intro-style treatment.

    # Find boundary between body of file (last per-question section before tail)
    # and the trailing summary. The tail starts after the last per-question
    # section ends and before the trailing 補足 section's content begins.
    # Concretely: the last "### category:" header is the 補足 section, and just
    # before it lies "## まとめ ... ## 納品物 ..." prose.

    # We split as follows:
    #   intro            = text[0 : spans[0].start]
    #   sections         = each span (per_question category)
    #   summary_between_last_section_and_supp =
    #       text[spans[-2].end : spans[-1].start]    (i.e. text after
    #       number_sequence end up to the 補足 header) -- this is the prose
    #       "## 同音異義" + "## まとめ" + "### カテゴリ別集計" table + "## 確認事項"
    #       + "## 納品物".
    #   supp_section     = spans[-1] (order_color 補足) — processed as order_color.
    # No special handling needed for content after the supp section (the file
    # ends inside the supp section).

    edits: list[tuple[int, int, str, str]] = []

    # --- intro ---
    intro_block = text[intro_start:intro_end]
    new_intro, intro_rng, intro_big, intro_small = rewrite_intro_or_summary_block(intro_block)
    edits.append((intro_start, intro_end, new_intro, "intro"))
    section_reports.append((f"intro (literal ranges={intro_rng})", intro_big, intro_small))

    # --- per-category sections ---
    # Identify the summary tail span: from end of penultimate-after-last block
    # to start of last (supp) section's header. We rely on the section list:
    #   spans[-1]  = "order_color (補足: ...)"  -> handled as a section with map.
    #   spans[-2]  = "number_sequence"          -> skipped.
    #   spans[-3]  = "body"                     -> last "real" per-question block.
    # The "summary" prose is between spans[-2].end and spans[-1].start.

    # The number_sequence section's span runs from its "### category:" header
    # all the way to the trailing 補足 "### category:" header — but the section's
    # actual per-question content ends well before that, at the first "## " H2
    # heading after the number_sequence header (e.g. "## 同音異義の補足版").
    # We split the number_sequence span at that H2: content above is the
    # number_sequence section (skipped), content below is the summary tail.
    ns_name, ns_start, ns_end = spans[-2]
    assert ns_name == "number_sequence", f"unexpected penultimate section {ns_name!r}"
    h2_after_ns = H2_RE.search(text, pos=ns_start + 1)
    if h2_after_ns is None or h2_after_ns.start() >= ns_end:
        # No H2 boundary — degenerate; treat full ns span as skipped.
        summary_start = ns_end
    else:
        summary_start = h2_after_ns.start()
    supp_start = spans[-1][1]            # start of 補足 header

    # Process each category section.
    for name, start, end in spans:
        if name == "number_sequence":
            section_reports.append((f"section:{name} (SKIPPED)", 0, 0))
            continue
        mapping = SECTION_MAPS.get(name)
        if mapping is None:
            section_reports.append((f"section:{name} (UNKNOWN MAP)", 0, 0))
            continue
        block = text[start:end]
        new_block, big_c, small_c = convert_block_with_map(block, mapping)
        edits.append((start, end, new_block, f"section:{name}"))
        section_reports.append((f"section:{name}", big_c, small_c))

    # --- summary prose between number_sequence's per-question content and the
    #     trailing supp header. This is the "## 同音異義" + "## まとめ" +
    #     "### カテゴリ別集計" + "## 確認事項" + "## 納品物" prose region. ---
    summary_block = text[summary_start:supp_start]
    new_summary, sum_rng, sum_big, sum_small = rewrite_intro_or_summary_block(summary_block)
    edits.append((summary_start, supp_start, new_summary, "summary"))
    section_reports.append((f"summary (literal ranges={sum_rng})", sum_big, sum_small))

    # Apply edits bottom-up.
    edits.sort(key=lambda e: e[0], reverse=True)
    for start, end, new_block, _name in edits:
        text = text[:start] + new_block + text[end:]

    if original_ends_nl and not text.endswith("\n"):
        text += "\n"

    PATH.write_text(text, encoding="utf-8")

    print("=== K1 conversion report ===")
    for name, b, s in section_reports:
        print(f"  {name:48s}  Q### replaced: {b:4d}    q### replaced: {s:4d}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
