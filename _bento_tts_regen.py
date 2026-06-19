"""
Bento tutorial TTS regenerator with whisper verification loop.

For each target ID:
  1. POST to /api/ai-tts -> {audio: base64 WAV}
  2. Decode WAV -> save candidate to assets/audio/bento/tutorial/<id>_candidate_<N>.wav
  3. Transcribe with faster-whisper (ja, base)
  4. loose_match: keyword 60% or substring
  5. On match: convert WAV->MP3, overwrite <id>.mp3, delete candidate WAV.
     On miss: delete candidate, retry with reword (up to 3 attempts).

Outputs a JSON report at _bento_tts_regen_report.json for the parent agent.
"""
import base64
import json
import os
import re
import subprocess
import sys
import time
import urllib.request
import urllib.error

ROOT = r"d:\AppDevelopment\pono-asobiba-app"
OUT_DIR = os.path.join(ROOT, "assets", "audio", "bento", "tutorial")
TTS_URL = "https://pono.kodama-no-mori.com/api/ai-tts"
REPORT_PATH = os.path.join(ROOT, "_bento_tts_regen_report.json")

TARGETS = [
    {
        "id": "sk_intro_01",
        "expected": "たべものには 3つの なかまが あるよ",
        "rewords": [
            "たべものには 3つの なかまが あるよ。",
            "みんな、たべものには 3つの なかまが あるよ。",
            "たべものは 3つの なかまに わかれるよ。",
        ],
        "keywords": ["たべもの", "3つ", "なかま"],
    },
    {
        "id": "sk_intro_02",
        "expected": "あかは からだを つくる なかま おにくや おさかなや たまごだよ",
        "rewords": [
            "あかは からだを つくる なかま。おにくや おさかなや、たまごだよ。",
            "あかい たべものは からだを つくる なかま。おにくや おさかな、たまごだよ。",
            "あかい いろの たべものは からだを つくる なかま。おにく、おさかな、たまごだよ。",
        ],
        "keywords": ["あか", "からだ", "つくる", "なかま", "おにく", "おさかな", "たまご"],
    },
    {
        "id": "sk_intro_03",
        "expected": "きいろは あそぶ ちからに なるよ ごはんや めんや じゃがいもだよ",
        "rewords": [
            "きいろは あそぶ ちからに なるよ。ごはんや めんや、じゃがいもだよ。",
            "きいろい たべものは あそぶ ちからに なるよ。ごはんや めん、じゃがいもだよ。",
            "きいろは げんきに あそぶ ちからに なるよ。ごはん、めん、じゃがいもだよ。",
        ],
        "keywords": ["きいろ", "あそぶ", "ちから", "ごはん", "めん", "じゃがいも"],
    },
    {
        "id": "sk_intro_04",
        "expected": "みどりは からだの ちょうしを ととのえるよ やさいや くだものだよ",
        "rewords": [
            "みどりは からだの ちょうしを ととのえるよ。やさいや、くだものだよ。",
            "みどりい たべものは からだの ちょうしを ととのえるよ。やさいや くだものだよ。",
            "みどりは からだの ちょうしを よくするよ。やさいや くだものだよ。",
        ],
        "keywords": ["みどり", "からだ", "ちょうし", "ととのえる", "やさい", "くだもの"],
    },
    {
        "id": "sk_intro_05",
        "expected": "あか きいろ みどりを ひとつずつ いれてみよう",
        "rewords": [
            "あか、きいろ、みどりを ひとつずつ いれてみよう。",
            "あかと きいろと みどりを ひとつずつ いれてみよう。",
            "あかと きいろと みどり、ひとつずつ いれて みようね。",
        ],
        "keywords": ["あか", "きいろ", "みどり", "ひとつ", "いれて"],
    },
    {
        "id": "okazu_more_01",
        "expected": "すきな おかずを もっと いれても いいよ おわったら おかずOKを おしてね",
        "rewords": [
            "すきな おかずを もっと いれても いいよ。おわったら、おかずOKを おしてね。",
            "すきな おかずを、もっと いれても いいよ。おわったら 『おかずOK』を おしてね。",
            "すきな おかずを たくさん いれても いいよ。おわったら、おかずOK を おしてね。",
        ],
        "keywords": ["すき", "おかず", "もっと", "いれ", "おわったら", "おして"],
    },
]


def normalize(s: str) -> str:
    s = s.replace("、", "").replace("。", "").replace("・", "")
    s = s.replace(" ", "").replace("　", "").replace("\n", "")
    s = s.replace("「", "").replace("」", "").replace("『", "").replace("』", "")
    return s.lower()


def loose_match(actual: str, expected_keywords):
    actual_n = normalize(actual)
    if not actual_n:
        return False, 0, 0
    matched = sum(1 for kw in expected_keywords if normalize(kw) in actual_n)
    needed = max(1, int(len(expected_keywords) * 0.6 + 0.9999))  # ceil(60%)
    return matched >= needed, matched, len(expected_keywords)


def call_tts(text: str):
    body = json.dumps({"text": text, "voice": "Aoede", "stylePrompt": "[gently]"}).encode("utf-8")
    req = urllib.request.Request(
        TTS_URL,
        data=body,
        headers={
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "application/json",
            "Origin": "https://pono.kodama-no-mori.com",
            "Referer": "https://pono.kodama-no-mori.com/",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=90) as resp:
            raw = resp.read()
    except urllib.error.HTTPError as e:
        return {"error": f"HTTP {e.code}", "body": e.read().decode("utf-8", "replace")[:500]}
    except Exception as e:
        return {"error": f"net {type(e).__name__}: {e}"}
    try:
        obj = json.loads(raw)
    except Exception as e:
        return {"error": f"json decode: {e}", "body": raw[:300].decode("utf-8", "replace")}
    if "error" in obj:
        return {"error": str(obj.get("error"))[:300], "raw": obj}
    audio_b64 = obj.get("audio")
    if not audio_b64:
        return {"error": "no audio field", "raw_keys": list(obj.keys())}
    try:
        wav_bytes = base64.b64decode(audio_b64)
    except Exception as e:
        return {"error": f"b64 decode: {e}"}
    return {"wav": wav_bytes}


def wav_to_mp3(wav_path: str, mp3_path: str) -> bool:
    r = subprocess.run(
        ["ffmpeg", "-y", "-i", wav_path, "-codec:a", "libmp3lame", "-qscale:a", "4", mp3_path],
        capture_output=True,
    )
    return r.returncode == 0 and os.path.exists(mp3_path) and os.path.getsize(mp3_path) > 200


def mp3_duration(mp3_path: str) -> float:
    r = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", mp3_path],
        capture_output=True, text=True,
    )
    try:
        return round(float(r.stdout.strip()), 2)
    except Exception:
        return 0.0


def main():
    print("Loading whisper base model (ja)...", flush=True)
    from faster_whisper import WhisperModel
    model = WhisperModel("base", device="cpu", compute_type="int8")
    print("Model ready.", flush=True)

    results = []
    for tgt in TARGETS:
        tid = tgt["id"]
        expected = tgt["expected"]
        keywords = tgt["keywords"]
        rewords = tgt["rewords"]
        print(f"\n=== {tid} ===  expected: {expected}", flush=True)
        attempts_log = []
        accepted = None
        max_attempts = max(3, len(rewords))
        for attempt in range(1, max_attempts + 1):
            text_in = rewords[min(attempt - 1, len(rewords) - 1)]
            print(f"  attempt {attempt}/{max_attempts}  text='{text_in}'", flush=True)
            tts = call_tts(text_in)
            if "error" in tts:
                print(f"    TTS error: {tts['error']}", flush=True)
                attempts_log.append({
                    "attempt": attempt, "text_in": text_in,
                    "tts_error": tts["error"], "transcribed": None,
                    "matched": False,
                })
                time.sleep(2)
                continue
            wav_path = os.path.join(OUT_DIR, f"{tid}_candidate_{attempt}.wav")
            with open(wav_path, "wb") as f:
                f.write(tts["wav"])
            # whisper
            try:
                segments, info = model.transcribe(wav_path, language="ja", beam_size=1)
                transcribed = "".join(seg.text for seg in segments).strip()
            except Exception as e:
                transcribed = f"<whisper error: {e}>"
            print(f"    whisper: '{transcribed}'", flush=True)
            ok, matched_n, total_n = loose_match(transcribed, keywords)
            print(f"    match: {ok} ({matched_n}/{total_n} keywords)", flush=True)
            attempts_log.append({
                "attempt": attempt,
                "text_in": text_in,
                "transcribed": transcribed,
                "matched": ok,
                "kw_hit": matched_n,
                "kw_total": total_n,
            })
            if ok:
                # convert to mp3, overwrite real file
                final_mp3 = os.path.join(OUT_DIR, f"{tid}.mp3")
                tmp_mp3 = os.path.join(OUT_DIR, f"{tid}_candidate_{attempt}.mp3")
                if not wav_to_mp3(wav_path, tmp_mp3):
                    print("    ffmpeg conversion failed", flush=True)
                    try: os.remove(wav_path)
                    except: pass
                    continue
                # atomic replace
                try:
                    os.replace(tmp_mp3, final_mp3)
                except Exception as e:
                    print(f"    replace failed: {e}", flush=True)
                    continue
                try: os.remove(wav_path)
                except: pass
                dur = mp3_duration(final_mp3)
                accepted = {
                    "attempt": attempt,
                    "text_in": text_in,
                    "transcribed": transcribed,
                    "duration": dur,
                }
                print(f"    ACCEPTED  duration={dur}s", flush=True)
                break
            else:
                # cleanup candidate
                try: os.remove(wav_path)
                except: pass
                time.sleep(1)
        results.append({
            "id": tid,
            "expected": expected,
            "attempts": attempts_log,
            "accepted": accepted,
            "status": "accepted" if accepted else "skipped",
        })

    # final cleanup: any stray candidate files
    leftovers = []
    for f in os.listdir(OUT_DIR):
        if "_candidate_" in f:
            try:
                os.remove(os.path.join(OUT_DIR, f))
            except Exception as e:
                leftovers.append(f"{f}: {e}")

    report = {
        "results": results,
        "leftovers": leftovers,
    }
    with open(REPORT_PATH, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    print(f"\nReport: {REPORT_PATH}", flush=True)
    # summary
    for r in results:
        st = "OK " if r["status"] == "accepted" else "SKIP"
        print(f"  {st} {r['id']}", flush=True)


if __name__ == "__main__":
    main()
