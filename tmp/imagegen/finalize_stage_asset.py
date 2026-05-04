from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--width", type=int, required=True)
    parser.add_argument("--height", type=int, required=True)
    parser.add_argument("--padding", type=int, default=48)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    src = Path(args.input)
    dst = Path(args.output)
    dst.parent.mkdir(parents=True, exist_ok=True)

    image = Image.open(src).convert("RGB")
    max_w = max(1, args.width - args.padding * 2)
    max_h = max(1, args.height - args.padding * 2)
    scale = min(max_w / image.width, max_h / image.height)
    resized = image.resize(
        (
            max(1, round(image.width * scale)),
            max(1, round(image.height * scale)),
        ),
        Image.LANCZOS,
    )

    canvas = Image.new("RGB", (args.width, args.height), (255, 255, 255))
    x = (args.width - resized.width) // 2
    y = (args.height - resized.height) // 2
    canvas.paste(resized, (x, y))
    canvas.save(dst)


if __name__ == "__main__":
    main()
