"""Initial verification of 13 voice files via faster-whisper.

Goal: confirm which of the 13 audit-flagged files still need regen.
- For each file: compute sha1, transcript with faster-whisper
- Output JSON to scratchpad/batch_923_pre_state.json
"""
import os
import sys
import json
import hashlib
from pathlib import Path

ROOT = Path("D:/AppDevelopment/pono-asobiba-app")
AUDIO_BASE = ROOT / "assets" / "audio" / "narration" / "maze"

TARGETS = [
    # path relative to AUDIO_BASE
    ("flag/cmd_red_down_keep.mp3", "しろは そのまま あか さげて！", ["しろ", "そのまま", "あか", "さげ"]),
    ("truefalse/start.mp3", "○か ×か、 どっちかな？", ["どっち"]),
    ("truefalse/correct.mp3", "せいかい！ すごいね！", ["せいかい", "すごい"]),
    ("truefalse/wrong.mp3", "ざんねん、 ちがったよ", ["ざんねん", "ちがっ"]),
    ("simon/start.mp3", "よく みててね、 おなじ じゅんで タップするよ", ["みてて", "おなじ", "じゅん"]),
    ("simon/your_turn.mp3", "さあ、 きみの ばん！", ["きみ", "ばん"]),
    ("simon/wrong.mp3", "あれれ、 ちがう おとだった", ["あれれ", "ちがう"]),
    ("silhouette/start.mp3", "ちらっと だけ みえる よ。 なんの え かな？", ["ちらっと", "なんの"]),
    ("silhouette/hint_more.mp3", "もうひとつ あなを あけたよ。 もう いちど みて？", ["もうひとつ", "あな", "もういちど"]),
    ("silhouette/correct.mp3", "せいかい！ よく わかったね！", ["せいかい", "わかっ"]),
    ("silhouette/wrong.mp3", "ざんねん、 ちがったみたい", ["ざんねん", "ちがっ"]),
    ("oddone/start.mp3", "なかま はずれは どれかな？", ["なかま", "はずれ", "どれ"]),
    ("oddone/correct.mp3", "せいかい！ よく みつけたね！", ["せいかい", "みつけ"]),
    ("oddone/wrong.mp3", "うーん、 ちがうかも", ["ちがう"]),
]


def sha1_of(p: Path) -> str:
    h = hashlib.sha1()
    with p.open("rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()


def main():
    from faster_whisper import WhisperModel
    print(f"[init] loading whisper model (large-v3)...", file=sys.stderr)
    model = WhisperModel("large-v3", device="cpu", compute_type="int8")

    results = []
    for rel, expected, kws in TARGETS:
        p = AUDIO_BASE / rel
        if not p.exists():
            results.append({"path": rel, "exists": False})
            continue
        sha = sha1_of(p)
        sz = p.stat().st_size
        try:
            segs, info = model.transcribe(str(p), language="ja", beam_size=1, vad_filter=False)
            text = "".join(s.text for s in segs).strip()
        except Exception as e:
            text = f"<ERROR: {e}>"
        kw_hit = [k for k in kws if k in text]
        kw_all = all(k in text for k in kws)
        results.append({
            "path": rel,
            "exists": True,
            "size": sz,
            "sha1": sha,
            "expected": expected,
            "kws": kws,
            "transcript": text,
            "kw_hit": kw_hit,
            "kw_all_match": kw_all,
        })
        print(f"[verify] {rel} -> '{text}' (kw_all_match={kw_all})", file=sys.stderr)

    out = ROOT / "scratchpad" / "batch_923_pre_state.json"
    out.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[done] wrote {out}", file=sys.stderr)


if __name__ == "__main__":
    main()
