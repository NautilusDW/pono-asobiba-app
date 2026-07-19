"""Optimize OP_BG02.png and regenerate OP_BG02.webp.

User dropped a fresh 1915x669 PNG (~2.1MB RGBA) at
``assets/images/quizland/OP/OP_BG02.png``. The matching ``.webp`` is missing
on disk so the layout editor (which references ``OP_BG02.webp``) shows no
background. This script:

1. Resizes the source to 1600px wide (aspect-preserving).
2. Writes an optimized ``.webp`` (target < 600 KB, quality steps 85->80->75).
3. Re-saves the ``.png`` (also <= 600 KB if possible) to keep the on-disk
   copy lean.
4. Verifies the 5 recently-restored frame images still exist.

Only ``OP_BG02.png`` and ``OP_BG02.webp`` are written. Nothing else is
touched (per task spec).
"""

from __future__ import annotations

import os
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OP_DIR = ROOT / "assets" / "images" / "quizland" / "OP"
SRC_PNG = OP_DIR / "OP_BG02.png"
DST_PNG = OP_DIR / "OP_BG02.png"  # overwrite in place
DST_WEBP = OP_DIR / "OP_BG02.webp"

TARGET_W = 1600
SIZE_CAP_BYTES = 600 * 1024  # 600 KB

# Defensive: 5 frame images that were freshly restored - just confirm presence.
FRAME_FILES = [
    OP_DIR / "frame4_3.png",
    OP_DIR / "frame_1_1.png",
    OP_DIR / "レイヤー 0_20260507-173812_001.png",
    OP_DIR / "レイヤー 0_20260507-173858_001.png",
    OP_DIR / "レイヤー 0_20260507-173923_001.png",
]


def human_kb(n: int) -> str:
    return f"{n / 1024:.1f} KB"


def resize_keep_aspect(im: Image.Image, target_w: int) -> Image.Image:
    w, h = im.size
    if w <= target_w:
        return im
    new_h = round(h * target_w / w)
    return im.resize((target_w, new_h), Image.LANCZOS)


def save_webp(im_rgb: Image.Image, dst: Path, cap: int) -> tuple[int, int]:
    """Try q=85, fall back to 80, 75 until size <= cap. Returns (size, quality)."""
    last_size = -1
    last_q = -1
    for q in (85, 80, 75, 70):
        im_rgb.save(dst, format="WEBP", quality=q, method=6)
        size = dst.stat().st_size
        last_size, last_q = size, q
        if size <= cap:
            return size, q
    return last_size, last_q


def save_png(im_rgb: Image.Image, dst: Path, cap: int) -> tuple[int, str]:
    """Try optimized PNG; if too big, fall back to 256-color quantize."""
    # Pass 1: plain optimized RGB PNG
    im_rgb.save(dst, format="PNG", optimize=True, compress_level=9)
    size = dst.stat().st_size
    if size <= cap:
        return size, "rgb-optimize"

    # Pass 2: palette quantize (lossy but small)
    im_pal = im_rgb.quantize(colors=256, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.FLOYDSTEINBERG)
    im_pal.save(dst, format="PNG", optimize=True, compress_level=9)
    size = dst.stat().st_size
    return size, "palette-256"


def main() -> int:
    if not SRC_PNG.exists():
        print(f"[ERR] source missing: {SRC_PNG}")
        return 1

    orig_size_png = SRC_PNG.stat().st_size

    with Image.open(SRC_PNG) as im:
        im.load()
        orig_w, orig_h = im.size
        orig_mode = im.mode
        # BG is opaque - flatten alpha if any
        if im.mode != "RGB":
            im_rgb = im.convert("RGB")
        else:
            im_rgb = im.copy()

    print(f"[src] {SRC_PNG.name}: {orig_w}x{orig_h} {orig_mode} {human_kb(orig_size_png)}")

    im_resized = resize_keep_aspect(im_rgb, TARGET_W)
    new_w, new_h = im_resized.size
    print(f"[resize] -> {new_w}x{new_h} (aspect {new_w / new_h:.3f}, src {orig_w / orig_h:.3f})")

    # 1. WebP
    webp_size, webp_q = save_webp(im_resized, DST_WEBP, SIZE_CAP_BYTES)
    print(f"[webp] {DST_WEBP.name}: q={webp_q} -> {human_kb(webp_size)}"
          + ("  OK" if webp_size <= SIZE_CAP_BYTES else "  WARN over cap"))

    # 2. PNG (overwrite original in place)
    png_size, png_mode = save_png(im_resized, DST_PNG, SIZE_CAP_BYTES)
    print(f"[png ] {DST_PNG.name}: mode={png_mode} -> {human_kb(png_size)}"
          + ("  OK" if png_size <= SIZE_CAP_BYTES else "  WARN over cap"))

    # 3. Verify webp readable
    with Image.open(DST_WEBP) as v:
        v.load()
        print(f"[verify webp] size={v.size} mode={v.mode}")
    with Image.open(DST_PNG) as v:
        v.load()
        print(f"[verify png ] size={v.size} mode={v.mode}")

    # 4. Defensive frame check
    print("[frames] presence check:")
    missing = []
    for f in FRAME_FILES:
        ok = f.exists()
        size = f.stat().st_size if ok else 0
        print(f"  {'OK' if ok else 'MISSING'}  {f.name}  ({human_kb(size) if ok else '-'})")
        if not ok:
            missing.append(f.name)
    if missing:
        print(f"[WARN] missing frame files: {missing}")
    else:
        print("[frames] all 5 frame files present")

    # Summary table
    print("\n=== summary ===")
    print(f"{'file':<16} {'orig px':<12} {'new px':<12} {'orig KB':>10} {'new KB':>10}  fmt")
    print(f"{'OP_BG02.png':<16} {f'{orig_w}x{orig_h}':<12} {f'{new_w}x{new_h}':<12} "
          f"{orig_size_png/1024:>9.1f}K {png_size/1024:>9.1f}K  PNG ({png_mode})")
    print(f"{'OP_BG02.webp':<16} {'(from PNG)':<12} {f'{new_w}x{new_h}':<12} "
          f"{'-':>10} {webp_size/1024:>9.1f}K  WEBP q={webp_q}")

    all_under_cap = webp_size <= SIZE_CAP_BYTES and png_size <= SIZE_CAP_BYTES
    print(f"all under 600KB: {all_under_cap}")
    return 0 if all_under_cap and not missing else 0  # warnings ok, only fatal if save failed


if __name__ == "__main__":
    raise SystemExit(main())
