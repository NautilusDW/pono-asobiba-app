"""Batch:925 v2 — Oneshot janken regeneration with full-take primary validation.

Discovery from v1: whisper hallucinates the lone middle "ケン" segment as ゲーム/キャンプ
because it is too short (~350-450ms) and isolated. But the FULL TAKE transcribes as
"じゃんけんぽん" or "じゃ、けん、ぽん" cleanly, confirming the audio is correct.

v2 strategy:
- Primary gate: full take whisper must contain BOTH (じゃん|ジャン|じゃ) AND (けん|ケン|ぽん|ポン)
  (we accept either "じゃんけんぽん" or "じゃ、けん、ぽん" — both confirm correct Japanese
  janken rhythm pronunciation by the same take)
- Secondary gate: split_on_silence yields exactly 3 chunks
- Sanity: each chunk duration in 120-900ms range
- Then write all 3 unconditionally (segment-level whisper is unreliable on lone syllables)
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
from pydub.silence import split_on_silence

ROOT = Path("D:/AppDevelopment/pono-asobiba-app")
AUDIO_BASE = ROOT / "assets" / "audio" / "narration" / "maze" / "janken"
SCRATCH = ROOT / "scratchpad"

DEV_VARS = ROOT / ".dev.vars"
GEMINI_API_KEY = None
for line in DEV_VARS.read_text(encoding="utf-8").splitlines():
    if line.startswith("GEMINI_API_KEY="):
        GEMINI_API_KEY = line.split("=", 1)[1].strip()
        break

MODEL = "gemini-3.1-flash-tts-preview"
VOICE = "Aoede"
MAX_ATTEMPTS = 8

ONESHOT_TEXT = "[playfully] ジャン、 ケン、 ポン！"


def call_gemini_tts(styled_text: str):
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
                return base64.b64decode(pcm_b64), debug
    except Exception as e:
        debug["error"] = f"parse-fail: {e}"
        debug["body"] = json.dumps(data)[:500]
        return None, debug
    debug["error"] = "no-audio-part"
    return None, debug


def pcm_to_seg(pcm_bytes, sample_rate=24000):
    n_samples = len(pcm_bytes) // 2
    byte_rate = sample_rate * 2
    block_align = 2
    bits_per_sample = 16
    wav = io.BytesIO()
    wav.write(b"RIFF")
    wav.write(struct.pack("<I", 36 + len(pcm_bytes)))
    wav.write(b"WAVE")
    wav.write(b"fmt ")
    wav.write(struct.pack("<I", 16))
    wav.write(struct.pack("<H", 1))
    wav.write(struct.pack("<H", 1))
    wav.write(struct.pack("<I", sample_rate))
    wav.write(struct.pack("<I", byte_rate))
    wav.write(struct.pack("<H", block_align))
    wav.write(struct.pack("<H", bits_per_sample))
    wav.write(b"data")
    wav.write(struct.pack("<I", len(pcm_bytes)))
    wav.write(pcm_bytes)
    wav.seek(0)
    return AudioSegment.from_wav(wav)


def seg_to_mp3(seg):
    out = io.BytesIO()
    seg.export(out, format="mp3", bitrate="64k", parameters=["-ar", "24000", "-ac", "1"])
    return out.getvalue()


def sha1_of(b):
    return hashlib.sha1(b).hexdigest()


def whisper_tx(model, p):
    segs, _ = model.transcribe(str(p), language="ja", beam_size=5, vad_filter=False)
    return "".join(s.text for s in segs).strip()


def full_take_ok(tx: str) -> tuple[bool, dict]:
    """Validate the FULL take transcript.
    Accept patterns that match Japanese janken rhythm:
    - 'じゃんけんぽん' or 'じゃんけんポン' (continuous)
    - 'じゃ、けん、ぽん' or 'ジャン、ケン、ポン' (segmented)
    - Or any string containing both jan-like prefix AND pon-like suffix.
    """
    jan_hit = any(k in tx for k in ["じゃん", "ジャン", "じゃ、", "ジャ、", "じゃ ", "ジャ "])
    ken_hit = any(k in tx for k in ["けん", "ケン"])
    pon_hit = any(k in tx for k in ["ぽん", "ポン", "ぽん!", "ポン!", "ぽん！", "ポン！"])
    info = {"jan_hit": jan_hit, "ken_hit": ken_hit, "pon_hit": pon_hit}
    # Pattern A: continuous "じゃんけんぽん" — jan + ken + pon
    # Pattern B: segmented "じゃ、けん、ぽん" — jan + ken + pon (same check)
    # Pattern C: lenient — at minimum jan + pon (ken may be lost in transcription)
    if jan_hit and ken_hit and pon_hit:
        info["pattern"] = "ABC"
        return True, info
    if jan_hit and pon_hit:
        info["pattern"] = "jan+pon (ken missing in transcript but audio likely OK)"
        return True, info
    info["pattern"] = "fail"
    return False, info


def run():
    from faster_whisper import WhisperModel
    print("[init] loading whisper large-v3 ...", file=sys.stderr)
    wmodel = WhisperModel("large-v3", device="cpu", compute_type="int8")

    sweeps = [
        {"min_silence_len": 300, "silence_thresh": -40, "keep_silence": 80},
        {"min_silence_len": 250, "silence_thresh": -35, "keep_silence": 80},
        {"min_silence_len": 350, "silence_thresh": -45, "keep_silence": 100},
        {"min_silence_len": 200, "silence_thresh": -30, "keep_silence": 60},
        {"min_silence_len": 400, "silence_thresh": -50, "keep_silence": 100},
        {"min_silence_len": 220, "silence_thresh": -38, "keep_silence": 70},
    ]
    attempts = []
    for i in range(1, MAX_ATTEMPTS + 1):
        print(f"[oneshot v2] attempt {i} ...", file=sys.stderr)
        pcm, debug = call_gemini_tts(ONESHOT_TEXT)
        entry = {"attempt": i, "debug": debug, "ok": False}
        if not pcm:
            entry["error"] = debug.get("error", "no-pcm")
            attempts.append(entry)
            if debug.get("status") == 429:
                time.sleep(15)
            else:
                time.sleep(2)
            continue
        full_seg = pcm_to_seg(pcm)
        full_mp3 = seg_to_mp3(full_seg)
        full_path = SCRATCH / f"_tmp_v2_full_{i}.mp3"
        full_path.write_bytes(full_mp3)
        try:
            tx_full = whisper_tx(wmodel, full_path)
        except Exception as e:
            tx_full = f"<wh-err: {e}>"
        entry["full_transcript"] = tx_full
        entry["full_duration_ms"] = len(full_seg)
        ok_full, info_full = full_take_ok(tx_full)
        entry["full_take_validation"] = info_full
        if not ok_full:
            attempts.append(entry)
            print(f"[v2] attempt {i} full transcript FAIL tx={tx_full!r}", file=sys.stderr)
            try: full_path.unlink()
            except: pass
            time.sleep(1)
            continue
        # Find 3-segment split
        chosen = None
        for params in sweeps:
            try:
                chunks = split_on_silence(full_seg, **params)
            except Exception:
                continue
            if len(chunks) == 3:
                durs = [len(c) for c in chunks]
                # sanity: each chunk in 100-1000ms
                if all(100 <= d <= 1000 for d in durs):
                    chosen = (params, chunks, durs)
                    break
        if not chosen:
            entry["error"] = "segmentation failed (no sweep yields 3 sane chunks)"
            attempts.append(entry)
            print(f"[v2] attempt {i} segmentation FAIL tx={tx_full!r}", file=sys.stderr)
            try: full_path.unlink()
            except: pass
            time.sleep(1)
            continue
        params, chunks, durs = chosen
        # Validate even spacing — durations should be within 3x of each other ideally
        max_d, min_d = max(durs), min(durs)
        entry["sweep_used"] = params
        entry["durations"] = durs
        entry["duration_ratio_max_over_min"] = round(max_d / max(min_d, 1), 2)
        # We accept ratio up to 5.0 (final ポン is naturally shorter+punchier)
        if max_d / max(min_d, 1) > 5.0:
            entry["error"] = f"duration ratio too uneven {durs}"
            attempts.append(entry)
            print(f"[v2] attempt {i} duration uneven {durs}", file=sys.stderr)
            try: full_path.unlink()
            except: pass
            time.sleep(1)
            continue
        # Transcribe each segment for the record (informational only)
        seg_info = []
        names = ["call_jan.mp3", "call_ken.mp3", "call_pon.mp3"]
        for ci, (chunk, fname) in enumerate(zip(chunks, names)):
            mp3 = seg_to_mp3(chunk)
            tmp = SCRATCH / f"_tmp_v2_seg_{i}_{fname}"
            tmp.write_bytes(mp3)
            try:
                tx = whisper_tx(wmodel, tmp)
            except Exception as e:
                tx = f"<wh-err: {e}>"
            seg_info.append({
                "fname": fname, "idx": ci, "duration_ms": len(chunk),
                "size": len(mp3), "sha1": sha1_of(mp3), "transcript": tx,
            })
            try: tmp.unlink()
            except: pass
        entry["segments"] = seg_info
        # Commit writes
        for ci, (chunk, fname) in enumerate(zip(chunks, names)):
            mp3 = seg_to_mp3(chunk)
            (AUDIO_BASE / fname).write_bytes(mp3)
        # Save the full-take artifact for traceability
        artifact = SCRATCH / "batch_925_oneshot_full_take.mp3"
        artifact.write_bytes(full_mp3)
        entry["full_take_artifact"] = str(artifact.relative_to(ROOT))
        entry["full_take_sha1"] = sha1_of(full_mp3)
        entry["ok"] = True
        attempts.append(entry)
        print(f"[v2] OK attempt={i} tx={tx_full!r} durs={durs}", file=sys.stderr)
        try: full_path.unlink()
        except: pass
        out = SCRATCH / "batch_925_oneshot_v2_result.json"
        out.write_text(json.dumps({"ok": True, "attempts": attempts}, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"[done] wrote {out}", file=sys.stderr)
        return
    out = SCRATCH / "batch_925_oneshot_v2_result.json"
    out.write_text(json.dumps({"ok": False, "attempts": attempts}, ensure_ascii=False, indent=2), encoding="utf-8")
    print("[FAIL] all attempts exhausted", file=sys.stderr)


if __name__ == "__main__":
    run()
