from __future__ import annotations

from pathlib import Path

from PIL import Image


SCREENSHOTS = [
    Path("Prototypes/StickerBookThreeJS/screenshots/desktop.png"),
    Path("Prototypes/StickerBookThreeJS/screenshots/mobile.png"),
    Path("Prototypes/StickerBookThreeJS/screenshots/desktop_start.png"),
    Path("Prototypes/StickerBookThreeJS/screenshots/desktop_end.png"),
]


def check(path: Path) -> None:
    image = Image.open(path).convert("RGBA")
    width, height = image.size
    pixels = image.get_flattened_data() if hasattr(image, "get_flattened_data") else image.getdata()
    bright = 0
    saturated = 0
    non_dark = 0
    for r, g, b, a in pixels:
        if r + g + b > 180:
            bright += 1
        if max(r, g, b) - min(r, g, b) > 20 and r + g + b > 90:
            saturated += 1
        if r + g + b > 60:
            non_dark += 1

    total = width * height
    bright_ratio = bright / total
    saturated_ratio = saturated / total
    non_dark_ratio = non_dark / total

    if bright_ratio < 0.10:
        raise AssertionError(f"{path}: too few bright page pixels ({bright_ratio:.3f})")
    if saturated_ratio < 0.02:
        raise AssertionError(f"{path}: too few colored asset pixels ({saturated_ratio:.3f})")
    if non_dark_ratio < 0.25:
        raise AssertionError(f"{path}: screenshot appears mostly blank ({non_dark_ratio:.3f})")

    print(
        f"{path.name}: ok {width}x{height} "
        f"bright={bright_ratio:.3f} color={saturated_ratio:.3f} non_dark={non_dark_ratio:.3f}"
    )


for screenshot in SCREENSHOTS:
    check(screenshot)
