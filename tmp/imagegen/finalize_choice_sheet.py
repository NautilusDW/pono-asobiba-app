from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--sheet-out", required=True)
    parser.add_argument("--item-out-dir", required=True)
    parser.add_argument("--names", nargs=4, required=True)
    parser.add_argument("--cell-size", type=int, default=512)
    parser.add_argument("--inner-max", type=int, default=456)
    return parser.parse_args()


def fit_crop(crop: Image.Image, inner_max: int) -> Image.Image:
    if crop.width <= inner_max and crop.height <= inner_max:
        return crop
    scale = min(inner_max / crop.width, inner_max / crop.height)
    return crop.resize(
        (max(1, round(crop.width * scale)), max(1, round(crop.height * scale))),
        Image.LANCZOS,
    )


def main() -> None:
    args = parse_args()
    src = Path(args.input)
    sheet_out = Path(args.sheet_out)
    item_out_dir = Path(args.item_out_dir)
    sheet_out.parent.mkdir(parents=True, exist_ok=True)
    item_out_dir.mkdir(parents=True, exist_ok=True)

    im = Image.open(src).convert("RGBA")
    w, h = im.size
    edges = [round(i * w / 4) for i in range(5)]
    cell_size = args.cell_size
    inner_max = args.inner_max
    cells: list[Image.Image] = []

    for i, name in enumerate(args.names):
        tile = im.crop((edges[i], 0, edges[i + 1], h))
        alpha = tile.getchannel("A")
        bbox = alpha.getbbox()
        crop = tile.crop(bbox) if bbox else Image.new("RGBA", (1, 1), (0, 0, 0, 0))
        crop = fit_crop(crop, inner_max)
        cell = Image.new("RGBA", (cell_size, cell_size), (0, 0, 0, 0))
        x = (cell_size - crop.width) // 2
        y = (cell_size - crop.height) // 2
        cell.alpha_composite(crop, (x, y))
        cell.save(item_out_dir / name)
        cells.append(cell)

    sheet = Image.new("RGBA", (cell_size * 4, cell_size), (0, 0, 0, 0))
    for i, cell in enumerate(cells):
        sheet.alpha_composite(cell, (i * cell_size, 0))
    sheet.save(sheet_out)


if __name__ == "__main__":
    main()
