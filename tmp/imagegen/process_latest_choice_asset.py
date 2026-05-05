from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path


ROOT = Path(r"D:\AppDevelopment\pono-asobiba-app")
GENERATED_ROOT = Path(r"C:\Users\surfe\.codex\generated_images")
REMOVE_CHROMA = Path(r"C:\Users\surfe\.codex\skills\.system\imagegen\scripts\remove_chroma_key.py")
FINALIZE = ROOT / "tmp/imagegen/finalize_choice_asset.py"
TMP_DIR = ROOT / "tmp/imagegen/generated_alpha"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True)
    parser.add_argument("--padding", type=int, default=44)
    return parser.parse_args()


def latest_generated_file() -> Path:
    files = [p for p in GENERATED_ROOT.rglob("*") if p.is_file()]
    if not files:
        raise FileNotFoundError("No generated images found.")
    return max(files, key=lambda p: p.stat().st_mtime)


def main() -> None:
    args = parse_args()
    latest = latest_generated_file()
    output = Path(args.output)
    TMP_DIR.mkdir(parents=True, exist_ok=True)
    alpha_out = TMP_DIR / f"{output.stem}_alpha.png"

    subprocess.run(
        [
            sys.executable,
            str(REMOVE_CHROMA),
            "--input",
            str(latest),
            "--out",
            str(alpha_out),
            "--auto-key",
            "border",
            "--soft-matte",
            "--transparent-threshold",
            "12",
            "--opaque-threshold",
            "220",
            "--despill",
            "--force",
        ],
        check=True,
    )
    subprocess.run(
        [
            sys.executable,
            str(FINALIZE),
            "--input",
            str(alpha_out),
            "--output",
            str(output),
            "--padding",
            str(args.padding),
        ],
        check=True,
    )
    print(output)


if __name__ == "__main__":
    main()
