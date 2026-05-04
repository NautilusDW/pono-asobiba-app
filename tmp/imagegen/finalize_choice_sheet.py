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


def find_band_bboxes(alpha: Image.Image, band_count: int = 4, threshold: int = 8) -> list[tuple[int, int, int, int] | None]:
    w, h = alpha.size
    px = alpha.load()
    visited = bytearray(w * h)
    unions: list[tuple[int, int, int, int] | None] = [None] * band_count

    def idx(x: int, y: int) -> int:
        return y * w + x

    for y in range(h):
        for x in range(w):
            flat = idx(x, y)
            if visited[flat] or px[x, y] <= threshold:
                visited[flat] = 1
                continue
            stack = [(x, y)]
            visited[flat] = 1
            left = right = x
            top = bottom = y
            while stack:
                cx, cy = stack.pop()
                if cx < left:
                    left = cx
                if cx > right:
                    right = cx
                if cy < top:
                    top = cy
                if cy > bottom:
                    bottom = cy
                for nx, ny in ((cx - 1, cy), (cx + 1, cy), (cx, cy - 1), (cx, cy + 1)):
                    if 0 <= nx < w and 0 <= ny < h:
                        nflat = idx(nx, ny)
                        if not visited[nflat]:
                            visited[nflat] = 1
                            if px[nx, ny] > threshold:
                                stack.append((nx, ny))
            cx = (left + right) / 2
            band = min(band_count - 1, int(cx * band_count / w))
            bbox = (left, top, right + 1, bottom + 1)
            current = unions[band]
            if current is None:
                unions[band] = bbox
            else:
                unions[band] = (
                    min(current[0], bbox[0]),
                    min(current[1], bbox[1]),
                    max(current[2], bbox[2]),
                    max(current[3], bbox[3]),
                )
    return unions


def main() -> None:
    args = parse_args()
    src = Path(args.input)
    sheet_out = Path(args.sheet_out)
    item_out_dir = Path(args.item_out_dir)
    sheet_out.parent.mkdir(parents=True, exist_ok=True)
    item_out_dir.mkdir(parents=True, exist_ok=True)

    im = Image.open(src).convert("RGBA")
    cell_size = args.cell_size
    inner_max = args.inner_max
    cells: list[Image.Image] = []
    alpha = im.getchannel("A")
    band_bboxes = find_band_bboxes(alpha, band_count=len(args.names))

    for i, name in enumerate(args.names):
        bbox = band_bboxes[i]
        crop = im.crop(bbox) if bbox else Image.new("RGBA", (1, 1), (0, 0, 0, 0))
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
