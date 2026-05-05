from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--size", type=int, default=512)
    parser.add_argument("--padding", type=int, default=44)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    src = Path(args.input)
    dst = Path(args.output)
    dst.parent.mkdir(parents=True, exist_ok=True)

    image = Image.open(src).convert("RGBA")
    alpha = image.getchannel("A")
    bbox = alpha.getbbox()
    if bbox:
        image = image.crop(bbox)

    max_w = max(1, args.size - args.padding * 2)
    max_h = max(1, args.size - args.padding * 2)
    scale = min(max_w / image.width, max_h / image.height)
    resized = image.resize(
        (
            max(1, round(image.width * scale)),
            max(1, round(image.height * scale)),
        ),
        Image.LANCZOS,
    )

    canvas = Image.new("RGBA", (args.size, args.size), (0, 0, 0, 0))
    x = (args.size - resized.width) // 2
    y = (args.size - resized.height) // 2
    canvas.alpha_composite(resized, (x, y))
    canvas.save(dst)


if __name__ == "__main__":
    main()
