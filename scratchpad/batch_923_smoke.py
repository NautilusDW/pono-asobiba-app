"""Smoke test: 1 call to Gemini 3.1 TTS to confirm shape."""
import sys
sys.path.insert(0, "D:/AppDevelopment/pono-asobiba-app/scratchpad")
from batch_923_regen import call_gemini_tts, pcm_to_mp3, MODEL, VOICE

pcm, debug = call_gemini_tts("[gently] うーん、 ちがうかも")
print("debug:", debug, file=sys.stderr)
if pcm:
    print(f"got {len(pcm)} bytes PCM", file=sys.stderr)
    mp3 = pcm_to_mp3(pcm)
    out_path = "D:/AppDevelopment/pono-asobiba-app/scratchpad/_smoke.mp3"
    with open(out_path, "wb") as f:
        f.write(mp3)
    print(f"wrote {out_path} ({len(mp3)} bytes)", file=sys.stderr)
else:
    print("FAIL", file=sys.stderr)
    sys.exit(1)
