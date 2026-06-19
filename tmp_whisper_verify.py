from faster_whisper import WhisperModel
import sys

files = ["08","09","10","11","12","13"]
model = WhisperModel("small", device="cpu", compute_type="int8")
for n in files:
    path = f"assets/audio/puzzle/voice/basic_tut_{n}.mp3"
    segments, info = model.transcribe(path, language="ja", beam_size=5)
    text = "".join(s.text for s in segments).strip()
    print(f"{n}\t{text}")
