"""Re-run silhouette/start.mp3 with katakana-tolerant keyword.

whisper transcribed 'ちらっと' as 'チラッと' (katakana) on all 5 attempts of the previous run.
The audio is correct; the matcher was too strict. Re-do with katakana alternatives.
"""
import sys
import json
import hashlib
from pathlib import Path

sys.path.insert(0, "D:/AppDevelopment/pono-asobiba-app/scratchpad")
from batch_923_regen import (
    call_gemini_tts, pcm_to_mp3, MODEL, VOICE, AUDIO_BASE, ROOT,
    keyword_match, MAX_ATTEMPTS,
)
from faster_whisper import WhisperModel

REL = "silhouette/start.mp3"
TEXT = "ちらっと だけ みえる よ。 なんの え かな？"
STYLE = "[gently]"
# Accept hiragana OR katakana for ちらっと; accept hiragana OR kanji for なんの
KWS = [["ちらっと", "チラッと"], ["なんの", "何の"]]

print("[init] loading whisper large-v3 ...", file=sys.stderr)
wmodel = WhisperModel("large-v3", device="cpu", compute_type="int8")

target_path = AUDIO_BASE / REL
styled_text = f"{STYLE} {TEXT}"

attempts = []
for i in range(1, MAX_ATTEMPTS + 1):
    print(f"[gen] {REL} attempt={i}", file=sys.stderr)
    pcm, debug = call_gemini_tts(styled_text)
    entry = {"attempt": i, "debug": debug}
    if not pcm:
        entry["error"] = debug.get("error")
        attempts.append(entry)
        continue
    mp3 = pcm_to_mp3(pcm)
    tmp = ROOT / "scratchpad" / "_tmp_silh_start.mp3"
    tmp.write_bytes(mp3)
    segs, _ = wmodel.transcribe(str(tmp), language="ja", beam_size=1, vad_filter=False)
    tx = "".join(s.text for s in segs).strip()
    entry["transcript"] = tx
    kw_ok, kw_hits = keyword_match(tx, KWS)
    entry["kw_ok"] = kw_ok
    entry["kw_hits"] = kw_hits
    entry["sha1"] = hashlib.sha1(mp3).hexdigest()
    entry["size"] = len(mp3)
    print(f"[result] tx='{tx}' kw_ok={kw_ok}", file=sys.stderr)
    if kw_ok:
        target_path.write_bytes(mp3)
        entry["ok"] = True
        attempts.append(entry)
        print("[OK] wrote", target_path, file=sys.stderr)
        break
    attempts.append(entry)

out = ROOT / "scratchpad" / "batch_923_silhouette_start_attempts.json"
out.write_text(json.dumps(attempts, ensure_ascii=False, indent=2), encoding="utf-8")
