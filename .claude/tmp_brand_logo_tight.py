"""Tight-crop processor for brand_logo.

- Open source PNG (RGB or RGBA)
- Compute alpha from min-channel luminance (white -> transparent)
- Unpremultiply-style halo removal: rescale RGB by 1/alpha so semi-transparent
  pixels don't carry white halo
- Trim transparent bbox + 8 px safety padding
- Output 1x (cap width at 1920) and @2x (cap width at 3840)
- Verify orange + teal palette presence
"""
import os
from PIL import Image
import numpy as np

SRC = r"d:/AppDevelopment/pono-asobiba-app/tmp/alpha_pending/705-lp-brand-logo-raw/brand_logo_d_full_body_raw_attempt_02_corrected_po.png"
OUT_1X = r"d:/AppDevelopment/pono-asobiba-app/assets/lp/hero/brand_logo.png"
OUT_2X = r"d:/AppDevelopment/pono-asobiba-app/assets/lp/hero/brand_logo@2x.png"

WHITE_HI = 248          # >= this on min-channel = fully transparent
WHITE_LO = 210          # <= this = fully opaque
PADDING = 8

ORANGE = (0xF2, 0x91, 0x5A)
TEAL = (0x24, 0xBB, 0xA7)
COLOR_TOL = 35          # per-channel max delta to count a "near" pixel


def to_rgba_with_halo_removal(img: Image.Image) -> Image.Image:
    im = img.convert("RGBA")
    arr = np.array(im).astype(np.float32)  # H, W, 4
    r, g, b, a = arr[..., 0], arr[..., 1], arr[..., 2], arr[..., 3]

    # Min-channel luminance: white => high min, colored ink => low min
    min_ch = np.minimum(np.minimum(r, g), b)

    # Map [WHITE_LO, WHITE_HI] -> alpha [255, 0]
    new_alpha = np.clip(
        (WHITE_HI - min_ch) / (WHITE_HI - WHITE_LO) * 255.0,
        0.0, 255.0,
    )
    # Pixels already alpha=0 stay 0
    new_alpha = np.minimum(new_alpha, a)

    # Unpremultiply-style halo removal: pull RGB away from white by alpha ratio
    # new_rgb = white + (rgb - white) / (alpha/255)
    a_norm = np.clip(new_alpha / 255.0, 1e-3, 1.0)
    for ch_idx in range(3):
        ch = arr[..., ch_idx]
        ch = 255.0 + (ch - 255.0) / a_norm
        arr[..., ch_idx] = np.clip(ch, 0.0, 255.0)

    arr[..., 3] = new_alpha

    # Force fully-transparent pixels to neutral RGB to avoid bleed on resample
    fully_transparent = new_alpha < 1.0
    for ch_idx in range(3):
        arr[..., ch_idx] = np.where(fully_transparent, 255.0, arr[..., ch_idx])

    return Image.fromarray(arr.astype(np.uint8), mode="RGBA")


def trim_with_padding(im: Image.Image, pad: int) -> Image.Image:
    arr = np.array(im)
    alpha = arr[..., 3]
    ys, xs = np.where(alpha > 4)
    if ys.size == 0:
        return im
    y0, y1 = ys.min(), ys.max() + 1
    x0, x1 = xs.min(), xs.max() + 1
    H, W = alpha.shape
    y0 = max(0, y0 - pad)
    x0 = max(0, x0 - pad)
    y1 = min(H, y1 + pad)
    x1 = min(W, x1 + pad)
    return im.crop((x0, y0, x1, y1))


def cap_width(im: Image.Image, max_w: int) -> Image.Image:
    w, h = im.size
    if w <= max_w:
        return im
    new_h = round(h * (max_w / w))
    return im.resize((max_w, new_h), Image.LANCZOS)


def color_present(arr: np.ndarray, target, tol: int) -> int:
    r, g, b, a = arr[..., 0], arr[..., 1], arr[..., 2], arr[..., 3]
    mask = (
        (np.abs(r.astype(int) - target[0]) <= tol)
        & (np.abs(g.astype(int) - target[1]) <= tol)
        & (np.abs(b.astype(int) - target[2]) <= tol)
        & (a > 200)
    )
    return int(mask.sum())


def main():
    src = Image.open(SRC)
    src_w, src_h = src.size
    src_aspect = src_w / src_h
    print(f"source: {src_w}x{src_h} mode={src.mode} aspect={src_aspect:.3f}")

    rgba = to_rgba_with_halo_removal(src)
    trimmed = trim_with_padding(rgba, PADDING)
    tw, th = trimmed.size
    trim_aspect = tw / th
    print(f"trimmed: {tw}x{th} aspect={trim_aspect:.3f} (pad={PADDING}px)")

    out_2x = cap_width(trimmed, 3840)
    out_1x = cap_width(trimmed, 1920)

    os.makedirs(os.path.dirname(OUT_1X), exist_ok=True)
    out_1x.save(OUT_1X, "PNG", optimize=True)
    out_2x.save(OUT_2X, "PNG", optimize=True)

    print(f"out 1x: {out_1x.size} -> {OUT_1X}")
    print(f"out 2x: {out_2x.size} -> {OUT_2X}")

    # Color presence verification on the 2x output
    arr2 = np.array(out_2x)
    orange_px = color_present(arr2, ORANGE, COLOR_TOL)
    teal_px = color_present(arr2, TEAL, COLOR_TOL)
    total_opaque = int((arr2[..., 3] > 200).sum())
    print(f"orange#F2915A near-pixels: {orange_px} ({100*orange_px/max(total_opaque,1):.2f}% of opaque)")
    print(f"teal  #24BBA7 near-pixels: {teal_px} ({100*teal_px/max(total_opaque,1):.2f}% of opaque)")
    print(f"opaque pixel count: {total_opaque}")

    # Output sizes
    print(f"1x file: {os.path.getsize(OUT_1X)} bytes")
    print(f"2x file: {os.path.getsize(OUT_2X)} bytes")


if __name__ == "__main__":
    main()
