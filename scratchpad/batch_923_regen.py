"""Batch:923 audit-regen — regenerate 14 voice files with Gemini 3.1 Aoede.

Steps per file:
1. Call Gemini 3.1 Flash TTS Preview with prebuilt voice Aoede
2. Receive base64 PCM (24kHz mono 16-bit), wrap to WAV, convert to MP3 (128k mono)
3. Whisper transcribe + keyword match
4. Up to 5 attempts; on success, write to target path

Output:
- scratchpad/batch_923_post_state.json — per-file final result
- scratchpad/batch_923_attempts.json — full attempt log
"""
import os
import sys
import json
import time
import base64
import hashlib
import struct
import io
from pathlib import Path
from typing import Optional

import requests
from pydub import AudioSegment

ROOT = Path("D:/AppDevelopment/pono-asobiba-app")
AUDIO_BASE = ROOT / "assets" / "audio" / "narration" / "maze"

# Read API key from .dev.vars
DEV_VARS = ROOT / ".dev.vars"
GEMINI_API_KEY = None
for line in DEV_VARS.read_text(encoding="utf-8").splitlines():
    if line.startswith("GEMINI_API_KEY="):
        GEMINI_API_KEY = line.split("=", 1)[1].strip()
        break
if not GEMINI_API_KEY:
    print("[fatal] no GEMINI_API_KEY in .dev.vars", file=sys.stderr)
    sys.exit(1)

MODEL = "gemini-3.1-flash-tts-preview"
VOICE = "Aoede"

# Each entry: (rel_path, text, style, [keywords_for_validation])
# Keywords use BOTH hiragana and kanji because whisper transcribes in kanji.
TARGETS = [
    ("flag/cmd_red_down_keep.mp3", "しろは そのまま あか さげて！", "[excitedly]",
     [["しろ", "白"], ["そのまま"], ["あか", "赤"], ["さげ", "下げ"]]),
    ("truefalse/start.mp3", "○か ×か、 どっちかな？", "[playfully]",
     [["どっち"]]),
    ("truefalse/correct.mp3", "せいかい！ すごいね！", "[excitedly]",
     [["せいかい", "正解"], ["すごい"]]),
    ("truefalse/wrong.mp3", "ざんねん、 ちがったよ", "[gently]",
     [["ざんねん", "残念"], ["ちがっ", "違っ"]]),
    ("simon/start.mp3", "よく みててね、 おなじ じゅんで タップするよ", "[gently]",
     [["みてて", "見てて"], ["おなじ", "同じ"], ["じゅん", "順"]]),
    ("simon/your_turn.mp3", "さあ、 きみの ばん！", "[excitedly]",
     [["きみ", "君"], ["ばん", "番"]]),
    ("simon/wrong.mp3", "あれれ、 ちがう おとだった", "[gently]",
     [["あれれ"], ["ちがう", "違う"]]),
    ("silhouette/start.mp3", "ちらっと だけ みえる よ。 なんの え かな？", "[gently]",
     [["ちらっと"], ["なんの", "何の"]]),
    ("silhouette/hint_more.mp3", "もうひとつ あなを あけたよ。 もう いちど みて？", "[gently]",
     [["もうひとつ", "もう一つ"], ["あな", "穴"], ["もういちど", "もう一度"]]),
    ("silhouette/correct.mp3", "せいかい！ よく わかったね！", "[excitedly]",
     [["せいかい", "正解"], ["わかっ", "分かっ"]]),
    ("silhouette/wrong.mp3", "ざんねん、 ちがったみたい", "[gently]",
     [["ざんねん", "残念"], ["ちがっ", "違っ"]]),
    ("oddone/start.mp3", "なかま はずれは どれかな？", "[playfully]",
     [["なかま", "仲間"], ["はずれ", "外れ"], ["どれ"]]),
    ("oddone/correct.mp3", "せいかい！ よく みつけたね！", "[excitedly]",
     [["せいかい", "正解"], ["みつけ", "見つけ"]]),
    ("oddone/wrong.mp3", "うーん、 ちがうかも", "[gently]",
     [["ちがう", "違う"]]),
]

MAX_ATTEMPTS = 5


def call_gemini_tts(styled_text: str) -> tuple[Optional[bytes], dict]:
    """Call Gemini 3.1 TTS, return (pcm_bytes, debug_dict). PCM is 24kHz mono 16-bit LE."""
    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        + MODEL + ":generateContent?key=" + GEMINI_API_KEY
    )
    payload = {
        "contents": [{"parts": [{"text": styled_text}]}],
        "generationConfig": {
            "responseModalities": ["AUDIO"],
            "speechConfig": {
                "voiceConfig": {"prebuiltVoiceConfig": {"voiceName": VOICE}}
            },
        },
        "safetySettings": [
            {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_CIVIC_INTEGRITY", "threshold": "BLOCK_NONE"},
        ],
    }
    debug = {"model": MODEL, "voice": VOICE}
    try:
        r = requests.post(url, json=payload, timeout=90)
    except Exception as e:
        debug["error"] = f"requests-fail: {e}"
        return None, debug
    debug["status"] = r.status_code
    try:
        data = r.json()
    except Exception as e:
        debug["error"] = f"json-fail: {e}"
        return None, debug
    if r.status_code != 200:
        debug["error"] = data.get("error", {}).get("message", "non-200")
        debug["body"] = json.dumps(data)[:500]
        return None, debug
    try:
        parts = data["candidates"][0]["content"]["parts"]
        for p in parts:
            if p.get("inlineData", {}).get("data"):
                pcm_b64 = p["inlineData"]["data"]
                debug["mime"] = p["inlineData"].get("mimeType", "")
                debug["finishReason"] = data["candidates"][0].get("finishReason")
                return base64.b64decode(pcm_b64), debug
    except Exception as e:
        debug["error"] = f"parse-fail: {e}"
        debug["body"] = json.dumps(data)[:500]
        return None, debug
    debug["error"] = "no-audio-part"
    debug["finishReason"] = data["candidates"][0].get("finishReason") if data.get("candidates") else None
    return None, debug


def pcm_to_mp3(pcm_bytes: bytes, sample_rate: int = 24000) -> bytes:
    """Wrap PCM LE 16-bit mono into WAV, convert to MP3 128k mono."""
    # Construct WAV
    n_samples = len(pcm_bytes) // 2
    byte_rate = sample_rate * 1 * 2
    block_align = 1 * 2
    bits_per_sample = 16
    wav = io.BytesIO()
    wav.write(b"RIFF")
    wav.write(struct.pack("<I", 36 + len(pcm_bytes)))
    wav.write(b"WAVE")
    wav.write(b"fmt ")
    wav.write(struct.pack("<I", 16))
    wav.write(struct.pack("<H", 1))  # PCM
    wav.write(struct.pack("<H", 1))  # channels
    wav.write(struct.pack("<I", sample_rate))
    wav.write(struct.pack("<I", byte_rate))
    wav.write(struct.pack("<H", block_align))
    wav.write(struct.pack("<H", bits_per_sample))
    wav.write(b"data")
    wav.write(struct.pack("<I", len(pcm_bytes)))
    wav.write(pcm_bytes)
    wav.seek(0)
    seg = AudioSegment.from_wav(wav)
    # Trim leading/trailing silence to keep voices tight (similar to siblings)
    # pydub helper
    out = io.BytesIO()
    seg.export(out, format="mp3", bitrate="64k", parameters=["-ar", "24000", "-ac", "1"])
    return out.getvalue()


def sha1_of(data: bytes) -> str:
    return hashlib.sha1(data).hexdigest()


def whisper_transcribe(model, mp3_path: Path) -> str:
    segs, _ = model.transcribe(str(mp3_path), language="ja", beam_size=1, vad_filter=False)
    return "".join(s.text for s in segs).strip()


def keyword_match(text: str, kw_groups: list) -> tuple[bool, list]:
    """kw_groups: list of lists; each inner list = OR-alternatives. All groups must match (AND)."""
    hits = []
    all_ok = True
    for group in kw_groups:
        matched = next((k for k in group if k in text), None)
        if matched:
            hits.append(matched)
        else:
            all_ok = False
            hits.append(None)
    return all_ok, hits


def main():
    from faster_whisper import WhisperModel
    print("[init] loading whisper large-v3 ...", file=sys.stderr)
    wmodel = WhisperModel("large-v3", device="cpu", compute_type="int8")

    final_results = []
    attempts_log = []

    for rel, text, style, kws in TARGETS:
        target_path = AUDIO_BASE / rel
        styled_text = f"{style} {text}"
        success = False
        attempts = []
        for attempt_i in range(1, MAX_ATTEMPTS + 1):
            print(f"[gen] {rel} attempt={attempt_i} ...", file=sys.stderr)
            pcm, debug = call_gemini_tts(styled_text)
            entry = {
                "attempt": attempt_i,
                "ok": False,
                "debug": debug,
                "transcript": None,
                "kw_hit": None,
                "size_mp3": None,
                "sha1_mp3": None,
            }
            if not pcm:
                entry["error"] = debug.get("error", "no-pcm")
                attempts.append(entry)
                if "QUOTA" in str(debug.get("error", "")).upper() or debug.get("status") == 429:
                    print("[gen] rate-limit, sleep 15s", file=sys.stderr)
                    time.sleep(15)
                else:
                    time.sleep(2)
                continue
            try:
                mp3_bytes = pcm_to_mp3(pcm)
            except Exception as e:
                entry["error"] = f"mp3-fail: {e}"
                attempts.append(entry)
                continue
            # write temp file for whisper
            tmp_path = ROOT / "scratchpad" / f"_tmp_{rel.replace('/', '_')}"
            tmp_path.write_bytes(mp3_bytes)
            try:
                tx = whisper_transcribe(wmodel, tmp_path)
            except Exception as e:
                tx = f"<whisper-error: {e}>"
            entry["transcript"] = tx
            entry["size_mp3"] = len(mp3_bytes)
            entry["sha1_mp3"] = sha1_of(mp3_bytes)
            kw_ok, kw_hits = keyword_match(tx, kws)
            entry["kw_hit"] = kw_hits
            entry["kw_ok"] = kw_ok
            if kw_ok:
                # write to target
                target_path.parent.mkdir(parents=True, exist_ok=True)
                target_path.write_bytes(mp3_bytes)
                entry["ok"] = True
                attempts.append(entry)
                final_results.append({
                    "path": rel,
                    "ok": True,
                    "attempts_used": attempt_i,
                    "final_transcript": tx,
                    "final_size": len(mp3_bytes),
                    "final_sha1": sha1_of(mp3_bytes),
                    "tts_model": MODEL,
                    "voice": VOICE,
                    "kw_hits": kw_hits,
                })
                try:
                    tmp_path.unlink()
                except Exception:
                    pass
                print(f"[ok] {rel} attempt={attempt_i} tx='{tx}'", file=sys.stderr)
                success = True
                break
            else:
                attempts.append(entry)
                print(f"[retry] {rel} attempt={attempt_i} tx='{tx}' kw_hits={kw_hits}", file=sys.stderr)
                try:
                    tmp_path.unlink()
                except Exception:
                    pass
                time.sleep(1)

        attempts_log.append({"path": rel, "attempts": attempts})
        if not success:
            final_results.append({
                "path": rel,
                "ok": False,
                "attempts_used": MAX_ATTEMPTS,
                "tts_model": MODEL,
                "voice": VOICE,
                "last_transcript": attempts[-1].get("transcript") if attempts else None,
                "last_error": attempts[-1].get("error") if attempts else None,
            })
            print(f"[FAIL] {rel}", file=sys.stderr)

    out1 = ROOT / "scratchpad" / "batch_923_post_state.json"
    out2 = ROOT / "scratchpad" / "batch_923_attempts.json"
    out1.write_text(json.dumps(final_results, ensure_ascii=False, indent=2), encoding="utf-8")
    out2.write_text(json.dumps(attempts_log, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[done] wrote {out1} / {out2}", file=sys.stderr)


if __name__ == "__main__":
    main()
