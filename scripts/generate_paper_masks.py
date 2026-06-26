# -*- coding: utf-8 -*-
"""
Generate cream paper masks aligned exactly to menu_card_base_0{1-4}.webp.

Problem fixed:
  Existing wood_panel_mask{1-4}.png have aspect ratios (~8:1 to ~9:1) that do
  not match the panel images (~5.8:1). When CSS mask-image stretches the mask
  to cover the panel, the white-alpha area overflows the cream paper region
  and leaks into the wood frame, causing background peek to show on the
  wooden border.

Solution (plan case C):
  Generate masks with EXACT same pixel size and aspect as each panel, by
  threshold-extracting the cream area from the panel itself.

Output:
  assets/ui/menu_card_paper_mask_0{1-4}.png  (RGBA, same size as panel,
                                              alpha=255 over cream paper)
"""
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SRC_DIR = ROOT / "assets" / "ui"

# Measured cream color of all 4 panels (avg ~R253 G243 B216).
CREAM = np.array([253, 243, 216], dtype=np.int16)
# Distance threshold in RGB Euclidean space. Wood frame is R~150-230 G~70-200
# B~40-150 so distance from cream is >>80. Threshold 60 keeps cream-side
# tolerance loose without bleeding into wood.
THRESHOLD = 60
# Erode by 1 px to add a 1px safety margin away from the cream/wood seam.
ERODE_PX = 1
# Gaussian blur to retain torn-paper soft edges (in pixels).
BLUR_RADIUS = 2.0


def generate(panel_idx: int) -> None:
    src_path = SRC_DIR / f"menu_card_base_0{panel_idx}.webp"
    dst_path = SRC_DIR / f"menu_card_paper_mask_0{panel_idx}.png"

    src = Image.open(src_path).convert("RGBA")
    arr = np.array(src)
    rgb = arr[..., :3].astype(np.int32)
    alpha_src = arr[..., 3]
    diff = rgb - CREAM.astype(np.int32)
    dist_sq = (diff * diff).sum(axis=-1)
    # Compare squared distance against squared threshold to avoid sqrt of
    # large unsigned overflow on edge pixels.
    mask = ((dist_sq < THRESHOLD * THRESHOLD) & (alpha_src > 200)).astype(np.uint8) * 255

    mask_img = Image.fromarray(mask, mode="L")
    if ERODE_PX > 0:
        # MinFilter erodes (shrinks white area) — kernel size must be odd.
        mask_img = mask_img.filter(ImageFilter.MinFilter(2 * ERODE_PX + 1))
    if BLUR_RADIUS > 0:
        mask_img = mask_img.filter(ImageFilter.GaussianBlur(BLUR_RADIUS))

    out = Image.new("RGBA", src.size, (255, 255, 255, 0))
    out.putalpha(mask_img)
    out.save(dst_path, optimize=True)
    coverage = float((np.array(mask_img) > 128).mean()) * 100.0
    print(
        f"generated {dst_path.name} size={src.size} coverage={coverage:.1f}%"
    )


def main() -> None:
    for i in range(1, 5):
        generate(i)


if __name__ == "__main__":
    main()
