"""Batch:925 — Regenerate maze/janken voices (start + call_jan/ken/pon) with 1-shot continuous take.

Strategy:
- start.mp3: standalone "じゃんけん しよう！ どの てで いく？" (Aoede)
- call_jan/ken/pon: 1-shot "ジャン、 ケン、 ポン！" then pydub split_on_silence → 3 segments
- Voice=Aoede / Model=gemini-3.1-flash-tts-preview (tts_fallback=false)
- Whisper validates keywords each attempt; up to 5 retries
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
MAX_ATTEMPTS = 5

START_TEXT = "[playfully] じゃんけん しよう！ どの てで いく？"
ONESHOT_TEXT = "[playfully] ジャン、 ケン、 ポン！"

# start.mp3 keyword groups (AND of ORs)
START_KWS = [
    ["じゃんけん", "ジャンケン"],
    ["しよう", "いく", "行く"],
]

# Per-segment keywords for call_jan/ken/pon
CALL_KWS = {
    "call_jan.mp3": [["ジャン", "じゃん"]],
    "call_ken.mp3": [["ケン", "けん"]],
    "call_pon.mp3": [["ポン", "ぽん"]],
}


def call_gemini_tts(styled_text: str) -> tuple[Optional[bytes], dict]:
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


def pcm_to_wav_seg(pcm_bytes: bytes, sample_rate: int = 24000) -> AudioSegment:
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


def seg_to_mp3_bytes(seg: AudioSegment) -> bytes:
    out = io.BytesIO()
    seg.export(out, format="mp3", bitrate="64k", parameters=["-ar", "24000", "-ac", "1"])
    return out.getvalue()


def sha1_of(data: bytes) -> str:
    return hashlib.sha1(data).hexdigest()


def whisper_transcribe(model, mp3_path: Path) -> str:
    segs, _ = model.transcribe(str(mp3_path), language="ja", beam_size=1, vad_filter=False)
    return "".join(s.text for s in segs).strip()


def keyword_match(text: str, kw_groups: list) -> tuple[bool, list]:
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


def gen_start(wmodel):
    """Generate start.mp3 standalone, up to MAX_ATTEMPTS."""
    target = AUDIO_BASE / "start.mp3"
    attempts = []
    for i in range(1, MAX_ATTEMPTS + 1):
        print(f"[start] attempt {i} ...", file=sys.stderr)
        pcm, debug = call_gemini_tts(START_TEXT)
        entry = {"attempt": i, "debug": debug, "ok": False}
        if not pcm:
            entry["error"] = debug.get("error", "no-pcm")
            attempts.append(entry)
            if debug.get("status") == 429:
                time.sleep(15)
            else:
                time.sleep(2)
            continue
        seg = pcm_to_wav_seg(pcm)
        mp3_bytes = seg_to_mp3_bytes(seg)
        tmp = SCRATCH / "_tmp_start.mp3"
        tmp.write_bytes(mp3_bytes)
        try:
            tx = whisper_transcribe(wmodel, tmp)
        except Exception as e:
            tx = f"<wh-err: {e}>"
        entry["transcript"] = tx
        entry["duration_ms"] = len(seg)
        entry["size_mp3"] = len(mp3_bytes)
        entry["sha1"] = sha1_of(mp3_bytes)
        kw_ok, kw_hits = keyword_match(tx, START_KWS)
        entry["kw_hits"] = kw_hits
        entry["kw_ok"] = kw_ok
        if kw_ok:
            target.write_bytes(mp3_bytes)
            entry["ok"] = True
            attempts.append(entry)
            print(f"[start] OK attempt={i} tx='{tx}' dur={len(seg)}ms", file=sys.stderr)
            return {"ok": True, "attempts": attempts, "final": {
                "path": "start.mp3", "transcript": tx, "duration_ms": len(seg),
                "size": len(mp3_bytes), "sha1": sha1_of(mp3_bytes),
            }}
        attempts.append(entry)
        try:
            tmp.unlink()
        except Exception:
            pass
        print(f"[start] retry attempt={i} tx='{tx}' kw={kw_hits}", file=sys.stderr)
        time.sleep(1)
    return {"ok": False, "attempts": attempts}


def gen_oneshot_calls(wmodel):
    """Generate call_jan/ken/pon via 1-shot + segmentation."""
    attempts = []
    # split parameter sweeps to find 3 segments
    sweeps = [
        {"min_silence_len": 300, "silence_thresh": -40, "keep_silence": 80},
        {"min_silence_len": 250, "silence_thresh": -35, "keep_silence": 80},
        {"min_silence_len": 350, "silence_thresh": -45, "keep_silence": 100},
        {"min_silence_len": 200, "silence_thresh": -30, "keep_silence": 60},
        {"min_silence_len": 400, "silence_thresh": -50, "keep_silence": 100},
    ]
    for i in range(1, MAX_ATTEMPTS + 1):
        print(f"[oneshot] attempt {i} ...", file=sys.stderr)
        pcm, debug = call_gemini_tts(ONESHOT_TEXT)
        entry = {"attempt": i, "debug": debug, "ok": False, "segments_found": None}
        if not pcm:
            entry["error"] = debug.get("error", "no-pcm")
            attempts.append(entry)
            if debug.get("status") == 429:
                time.sleep(15)
            else:
                time.sleep(2)
            continue
        full_seg = pcm_to_wav_seg(pcm)
        entry["full_duration_ms"] = len(full_seg)
        # save full take for inspection
        full_mp3 = seg_to_mp3_bytes(full_seg)
        full_path = SCRATCH / f"_tmp_oneshot_{i}.mp3"
        full_path.write_bytes(full_mp3)
        entry["full_sha1"] = sha1_of(full_mp3)
        entry["full_size"] = len(full_mp3)
        # transcribe full for log
        try:
            tx_full = whisper_transcribe(wmodel, full_path)
        except Exception as e:
            tx_full = f"<wh-err: {e}>"
        entry["full_transcript"] = tx_full
        # try sweeps
        best = None
        for s_i, params in enumerate(sweeps):
            try:
                chunks = split_on_silence(full_seg, **params)
            except Exception as e:
                continue
            if len(chunks) == 3:
                best = (params, chunks)
                entry["sweep_used"] = params
                entry["segments_found"] = 3
                break
            else:
                # log first sweep result
                if s_i == 0:
                    entry["first_sweep_count"] = len(chunks)
        if not best:
            entry["error"] = f"segmentation-failed; got non-3 across all sweeps"
            attempts.append(entry)
            print(f"[oneshot] retry attempt={i} segmentation failed", file=sys.stderr)
            try:
                full_path.unlink()
            except Exception:
                pass
            time.sleep(1)
            continue
        # validate each segment with whisper
        params, chunks = best
        seg_results = []
        all_ok = True
        for ci, (chunk, fname) in enumerate(zip(chunks, ["call_jan.mp3", "call_ken.mp3", "call_pon.mp3"])):
            mp3 = seg_to_mp3_bytes(chunk)
            tmp = SCRATCH / f"_tmp_seg_{i}_{fname}"
            tmp.write_bytes(mp3)
            try:
                tx = whisper_transcribe(wmodel, tmp)
            except Exception as e:
                tx = f"<wh-err: {e}>"
            ok, hits = keyword_match(tx, CALL_KWS[fname])
            seg_results.append({
                "fname": fname,
                "idx": ci,
                "duration_ms": len(chunk),
                "size": len(mp3),
                "sha1": sha1_of(mp3),
                "transcript": tx,
                "kw_hits": hits,
                "kw_ok": ok,
                "mp3_bytes_len": len(mp3),
            })
            if not ok:
                all_ok = False
            try:
                tmp.unlink()
            except Exception:
                pass
        entry["seg_results"] = seg_results
        if all_ok:
            # write all 3 to target
            for ci, (chunk, fname) in enumerate(zip(chunks, ["call_jan.mp3", "call_ken.mp3", "call_pon.mp3"])):
                mp3 = seg_to_mp3_bytes(chunk)
                (AUDIO_BASE / fname).write_bytes(mp3)
            entry["ok"] = True
            attempts.append(entry)
            print(f"[oneshot] OK attempt={i}", file=sys.stderr)
            return {"ok": True, "attempts": attempts, "final": seg_results, "full_transcript": tx_full,
                    "full_duration_ms": len(full_seg), "sweep_params": params}
        attempts.append(entry)
        print(f"[oneshot] retry attempt={i} seg-validation-failed", file=sys.stderr)
        try:
            full_path.unlink()
        except Exception:
            pass
        time.sleep(1)
    return {"ok": False, "attempts": attempts}


def main():
    from faster_whisper import WhisperModel
    print("[init] loading whisper large-v3 ...", file=sys.stderr)
    wmodel = WhisperModel("large-v3", device="cpu", compute_type="int8")

    # Probe first
    print("[probe] testing Gemini 3.1 quota ...", file=sys.stderr)
    pcm, dbg = call_gemini_tts("[gently] テスト")
    if not pcm:
        print(f"[fatal] probe failed: {dbg}", file=sys.stderr)
        out = SCRATCH / "batch_925_probe_fail.json"
        out.write_text(json.dumps(dbg, ensure_ascii=False, indent=2), encoding="utf-8")
        sys.exit(2)
    print(f"[probe] OK ({len(pcm)} bytes pcm)", file=sys.stderr)

    result = {"probe": "ok", "probe_pcm_size": len(pcm)}
    result["start"] = gen_start(wmodel)
    result["oneshot"] = gen_oneshot_calls(wmodel)

    out = SCRATCH / "batch_925_result.json"
    out.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[done] wrote {out}", file=sys.stderr)
    print(f"[done] start.ok={result['start'].get('ok')} oneshot.ok={result['oneshot'].get('ok')}", file=sys.stderr)


if __name__ == "__main__":
    main()
