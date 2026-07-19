"""Copy Japanese-named voice mp3 files into the puzzle voice asset folder with English IDs.

Run once. Idempotent (overwrites with shutil.copy2).
"""
import shutil
import sys
from pathlib import Path

SRC = Path(r"D:/ポノのおへや/Puzzle/OP/NA")
DST = Path(r"d:/AppDevelopment/pono-asobiba-app/assets/audio/puzzle/voice")

MAPPING = {
    "tut_01.mp3":         "ピースを ゆびで そっと うごかしてみよう！.mp3",
    "tut_02.mp3":         "ただしい ばしょに もっていくと、パチッ ってはまるよ。.mp3",
    "tut_03.mp3":         "ぜんぶ はめたら、できあがり！ さあ あそぼう！.mp3",
    "clear_01.mp3":       "やったね！ じょうずに できたね。.mp3",
    "clear_02.mp3":       "すごい！ ぜんぶ ピッタリ あったよ！.mp3",
    "clear_03.mp3":       "できた できた〜！ よく がんばったね。.mp3",
    "clear_04.mp3":       "わぁ きれいに できたね！.mp3",
    "clear_05.mp3":       "だいせいこう！ もう ひとつ やってみる？.mp3",
    "all_clear_01.mp3":   "すごーい！ ぜーんぶ できちゃった！.mp3",
    "all_clear_02.mp3":   "やった〜！ パズル めいじん だね！.mp3",
    "hint.mp3":           "ヒントだよ。よく みててね.mp3",
    "next_nudge_01.mp3":  "つぎへ ボタン、おしてみよう！.mp3",
    "next_nudge_02.mp3":  "もう ひとつ あそぼうよ。つぎへ おしてね。.mp3",
    "next_nudge_03.mp3":  "つぎの パズルが まってるよ！.mp3",
}

def main() -> int:
    if not SRC.exists():
        print(f"ERROR: source not found: {SRC}", file=sys.stderr)
        return 1
    DST.mkdir(parents=True, exist_ok=True)

    src_files = {f.name: f for f in SRC.iterdir() if f.is_file()}

    missing = []
    copied = []
    for dest_name, src_name in MAPPING.items():
        src_path = src_files.get(src_name)
        if src_path is None:
            missing.append(src_name)
            continue
        dst_path = DST / dest_name
        shutil.copy2(src_path, dst_path)
        copied.append((src_name, dest_name, dst_path.stat().st_size))

    for src_name, dest_name, size in copied:
        print(f"OK  {dest_name:<22} <- {src_name}  ({size} bytes)")
    if missing:
        print("MISSING:", file=sys.stderr)
        for name in missing:
            print(f"  - {name}", file=sys.stderr)
        return 2
    print(f"\nCopied {len(copied)} files to {DST}")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
