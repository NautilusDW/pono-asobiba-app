"""
gen_potato_korokke_placeholders.py - bento/kitchen.html の potato mash / korokke shape チェーン用 placeholder PNG 生成

これは **placeholder** であり、 将来 fal.ai / Adobe Firefly / 手描きで本画像に差し替え予定。
差し替え時はファイル名同一で上書きするだけで kitchen.html の参照は変更不要。

既存の gen_cooking_placeholders.py とは独立して動作し、 既存ファイルには一切触れない。

生成対象 (7 枚):
  potato/potato_boiled_001.png         (380x220) 茹で上がった皮なしじゃがいも (薄黄色)
  potato/potato_mash_002.png           (380x220) 半分すりつぶされたじゃがいも
  potato/potato_mash_003.png           (380x220) 完全にすりつぶされたマッシュポテト
  potato/masher.png                    (220x260) マッシャー (木製手付き)
  korokke/prep/korokke_dough_001.png   (380x220) ひき肉混合後のべったり塊
  korokke/prep/korokke_shape_002.png   (380x220) 半分丸めた小判
  korokke/prep/korokke_shape_003.png   (380x220) 完成した小判形コロッケ生地
"""

import os
import math
import random
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

BASE_DIR = Path(__file__).resolve().parent.parent / "assets" / "images" / "bento" / "cooking"

# Reproducibility for scatter patterns
random.seed(20260603)


def ensure_dir(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)


def save_png(img: Image.Image, path: Path) -> None:
    ensure_dir(path)
    img.save(path, "PNG", optimize=True)


def soft_blur(img: Image.Image, radius: float = 1.2) -> Image.Image:
    return img.filter(ImageFilter.GaussianBlur(radius=radius))


# ---------------------------------------------------------------------------
# Shared bowl background (watercolor wooden bowl, top-down view)
# ---------------------------------------------------------------------------

def _draw_bowl(canvas_size=(380, 220), rim_rgb=(168, 116, 70), inner_rgb=(232, 200, 156)):
    """Draw a top-down wooden bowl. Returns the bowl image and the inner ellipse box."""
    W, H = canvas_size
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    # Outer rim
    pad_x, pad_y = 16, 22
    outer = [pad_x, pad_y, W - pad_x, H - pad_y]
    d.ellipse(outer, fill=(*rim_rgb, 245), outline=(44, 30, 18, 230), width=3)
    # Inner well
    inner_pad = 16
    inner = [outer[0] + inner_pad, outer[1] + inner_pad,
             outer[2] - inner_pad, outer[3] - inner_pad]
    d.ellipse(inner, fill=(*inner_rgb, 240), outline=(120, 80, 44, 200), width=2)
    # Highlight on rim (upper-left arc) - simulate by thin overlay
    hl = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    hd = ImageDraw.Draw(hl)
    hd.arc(outer, start=200, end=320, fill=(255, 240, 210, 180), width=3)
    img.alpha_composite(hl)
    return img, inner


# ---------------------------------------------------------------------------
# potato_boiled_001 : 茹でた皮なしじゃがいも (3-4個、 ボウルの中)
# ---------------------------------------------------------------------------

def gen_potato_boiled_001() -> Image.Image:
    W, H = 380, 220
    img, inner = _draw_bowl((W, H))
    d = ImageDraw.Draw(img)
    # Three pale-yellow boiled potatoes (oval lumps)
    potatoes = [
        (130, 110, 70, 50, -12),
        (210, 100, 76, 54, 8),
        (180, 145, 66, 46, -4),
    ]
    for (cx, cy, rw, rh, ang) in potatoes:
        lump = Image.new("RGBA", (rw * 2, rh * 2), (0, 0, 0, 0))
        ld = ImageDraw.Draw(lump)
        # Main body - pale buttery yellow
        ld.ellipse([4, 4, rw * 2 - 4, rh * 2 - 4],
                   fill=(248, 226, 168, 240),
                   outline=(168, 132, 64, 220), width=2)
        # Subtle shading - lower half slightly darker
        shade = Image.new("RGBA", (rw * 2, rh * 2), (0, 0, 0, 0))
        sd = ImageDraw.Draw(shade)
        sd.ellipse([8, rh, rw * 2 - 8, rh * 2 - 8],
                   fill=(220, 190, 120, 90))
        lump.alpha_composite(soft_blur(shade, radius=2.5))
        # Highlight blob upper-left
        hl = Image.new("RGBA", (rw * 2, rh * 2), (0, 0, 0, 0))
        hld = ImageDraw.Draw(hl)
        hld.ellipse([14, 10, 14 + rw // 2, 10 + rh // 3],
                    fill=(255, 248, 222, 180))
        lump.alpha_composite(soft_blur(hl, radius=2.0))
        rotated = lump.rotate(ang, resample=Image.BICUBIC, expand=True)
        rx, ry = rotated.size
        img.alpha_composite(rotated, (cx - rx // 2, cy - ry // 2))
    return soft_blur(img, radius=0.4)


# ---------------------------------------------------------------------------
# potato_mash_002 : 半分すりつぶしたじゃがいも
# ---------------------------------------------------------------------------

def gen_potato_mash_002() -> Image.Image:
    W, H = 380, 220
    img, inner = _draw_bowl((W, H))
    # Mound of partially mashed potato - one big lumpy yellow blob plus small chunks
    ix0, iy0, ix1, iy1 = inner
    cx, cy = (ix0 + ix1) // 2, (iy0 + iy1) // 2
    # Big mound
    mound = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    md = ImageDraw.Draw(mound)
    md.ellipse([cx - 110, cy - 50, cx + 110, cy + 50],
               fill=(250, 228, 170, 240),
               outline=(170, 132, 62, 200), width=2)
    # Inner texture lumps (smaller blobs to show partial mashing)
    for (dx, dy, rr) in [(-60, -16, 16), (-20, -22, 14), (28, -14, 18),
                          (60, 8, 14), (-40, 20, 16), (12, 22, 12), (52, -26, 12)]:
        md.ellipse([cx + dx - rr, cy + dy - rr, cx + dx + rr, cy + dy + rr],
                   fill=(240, 212, 144, 220),
                   outline=(150, 116, 56, 180), width=1)
    # Highlight
    hl = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    hld = ImageDraw.Draw(hl)
    hld.ellipse([cx - 70, cy - 38, cx - 10, cy - 18],
                fill=(255, 248, 222, 160))
    mound.alpha_composite(soft_blur(hl, radius=3.0))
    img.alpha_composite(soft_blur(mound, radius=0.6))
    return img


# ---------------------------------------------------------------------------
# potato_mash_003 : 完全にすりつぶしたマッシュポテト (滑らか)
# ---------------------------------------------------------------------------

def gen_potato_mash_003() -> Image.Image:
    W, H = 380, 220
    img, inner = _draw_bowl((W, H))
    ix0, iy0, ix1, iy1 = inner
    cx, cy = (ix0 + ix1) // 2, (iy0 + iy1) // 2
    # Smooth mound - softer edge, lighter color
    mound = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    md = ImageDraw.Draw(mound)
    md.ellipse([cx - 120, cy - 56, cx + 120, cy + 56],
               fill=(252, 232, 178, 245),
               outline=(170, 136, 70, 200), width=2)
    # Fine ripples (whisk / masher swirl marks)
    rip = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    rd = ImageDraw.Draw(rip)
    for i, ang_deg in enumerate(range(0, 360, 28)):
        ang = math.radians(ang_deg)
        x1 = cx + int(math.cos(ang) * 36)
        y1 = cy + int(math.sin(ang) * 18)
        x2 = cx + int(math.cos(ang) * 92)
        y2 = cy + int(math.sin(ang) * 42)
        rd.line([(x1, y1), (x2, y2)], fill=(228, 196, 130, 150), width=2)
    mound.alpha_composite(soft_blur(rip, radius=1.6))
    # Highlight band
    hl = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    hld = ImageDraw.Draw(hl)
    hld.ellipse([cx - 80, cy - 44, cx, cy - 20],
                fill=(255, 250, 230, 180))
    mound.alpha_composite(soft_blur(hl, radius=3.5))
    img.alpha_composite(soft_blur(mound, radius=0.5))
    return img


# ---------------------------------------------------------------------------
# masher : 木製手付きマッシャー (縦長 220x260)
# ---------------------------------------------------------------------------

def gen_masher() -> Image.Image:
    W, H = 220, 260
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    # Wooden handle (vertical rounded rect)
    handle_w = 28
    handle_x0 = (W - handle_w) // 2
    handle_x1 = handle_x0 + handle_w
    handle_y0 = 18
    handle_y1 = 168
    d.rounded_rectangle([handle_x0, handle_y0, handle_x1, handle_y1],
                        radius=12,
                        fill=(196, 148, 96, 245),
                        outline=(96, 60, 30, 230), width=2)
    # Handle grain stripes
    for sy in range(handle_y0 + 8, handle_y1 - 8, 14):
        d.line([(handle_x0 + 6, sy), (handle_x1 - 6, sy + 4)],
               fill=(140, 96, 52, 130), width=1)
    # Connecting rod
    rod_y0 = handle_y1 - 4
    rod_y1 = handle_y1 + 24
    d.rounded_rectangle([handle_x0 + 6, rod_y0, handle_x1 - 6, rod_y1],
                        radius=6,
                        fill=(170, 124, 76, 240),
                        outline=(80, 50, 26, 220), width=2)
    # Masher head - flat oval plate with holes (top-down look from side)
    head_y0 = rod_y1
    head_y1 = H - 18
    head_x0 = 22
    head_x1 = W - 22
    d.rounded_rectangle([head_x0, head_y0, head_x1, head_y1],
                        radius=18,
                        fill=(214, 184, 130, 245),
                        outline=(96, 60, 30, 230), width=2)
    # Holes in masher head
    hole_rows = [(head_y0 + 16, [50, 90, 130, 170]),
                 (head_y0 + 38, [40, 80, 120, 160]),
                 (head_y0 + 60, [50, 90, 130, 170])]
    for (hy, hxs) in hole_rows:
        for hx in hxs:
            if head_x0 + 6 < hx < head_x1 - 6 and hy < head_y1 - 8:
                d.ellipse([hx - 6, hy - 6, hx + 6, hy + 6],
                          fill=(110, 76, 40, 240),
                          outline=(60, 36, 18, 230), width=1)
    # Handle top knob
    d.ellipse([handle_x0 - 4, handle_y0 - 6, handle_x1 + 4, handle_y0 + 14],
              fill=(184, 132, 84, 245),
              outline=(96, 60, 30, 230), width=2)
    return soft_blur(img, radius=0.4)


# ---------------------------------------------------------------------------
# korokke dough/shape stages (380x220)
# ---------------------------------------------------------------------------

def _korokke_base_canvas():
    """Return blank tray-ish background (light wood)."""
    W, H = 380, 220
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    # Soft pale tray background ellipse to give containment cue
    d.ellipse([20, 30, W - 20, H - 30],
              fill=(244, 230, 204, 230),
              outline=(170, 140, 92, 200), width=2)
    return img


def gen_korokke_dough_001() -> Image.Image:
    """Sticky mound of mashed potato + minced meat (marbled yellow + brown)."""
    W, H = 380, 220
    img = _korokke_base_canvas()
    cx, cy = W // 2, H // 2
    mound = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    md = ImageDraw.Draw(mound)
    # Base mound - yellow
    md.ellipse([cx - 100, cy - 50, cx + 100, cy + 50],
               fill=(248, 224, 162, 245),
               outline=(150, 112, 50, 220), width=2)
    # Brown minced meat blobs scattered through (marbling)
    for (dx, dy, rr) in [(-58, -12, 14), (-22, 14, 12), (16, -22, 13),
                          (44, 6, 14), (-8, -8, 10), (62, -16, 11),
                          (-72, 8, 11), (24, 22, 12)]:
        md.ellipse([cx + dx - rr, cy + dy - rr, cx + dx + rr, cy + dy + rr],
                   fill=(126, 76, 44, 235),
                   outline=(70, 38, 20, 220), width=1)
    # Subtle highlight
    hl = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    hld = ImageDraw.Draw(hl)
    hld.ellipse([cx - 70, cy - 36, cx - 14, cy - 18],
                fill=(255, 246, 218, 150))
    mound.alpha_composite(soft_blur(hl, radius=3.0))
    img.alpha_composite(soft_blur(mound, radius=0.6))
    return img


def gen_korokke_shape_002() -> Image.Image:
    """Half-shaped: still lumpy oval but starting to look like a patty."""
    W, H = 380, 220
    img = _korokke_base_canvas()
    cx, cy = W // 2, H // 2
    patty = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    pd = ImageDraw.Draw(patty)
    # Flatter, more defined oval - golden/sandy with marbling
    pd.ellipse([cx - 90, cy - 38, cx + 90, cy + 38],
               fill=(244, 218, 158, 248),
               outline=(150, 110, 50, 230), width=2)
    # A few remaining brown specks (mince visible)
    for (dx, dy, rr) in [(-40, -8, 8), (12, 4, 9), (38, -10, 7),
                          (-18, 12, 7), (54, 8, 6), (-58, 6, 6)]:
        pd.ellipse([cx + dx - rr, cy + dy - rr, cx + dx + rr, cy + dy + rr],
                   fill=(140, 90, 54, 220),
                   outline=(80, 46, 24, 200), width=1)
    # Highlight along upper edge
    hl = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    hld = ImageDraw.Draw(hl)
    hld.ellipse([cx - 64, cy - 30, cx + 24, cy - 12],
                fill=(255, 246, 220, 170))
    patty.alpha_composite(soft_blur(hl, radius=3.0))
    img.alpha_composite(soft_blur(patty, radius=0.5))
    return img


def gen_korokke_shape_003() -> Image.Image:
    """Fully shaped oval/koban patty - smooth, even, ready for breading."""
    W, H = 380, 220
    img = _korokke_base_canvas()
    cx, cy = W // 2, H // 2
    patty = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    pd = ImageDraw.Draw(patty)
    # Clean koban oval - uniform color
    pd.ellipse([cx - 96, cy - 36, cx + 96, cy + 36],
               fill=(248, 224, 168, 250),
               outline=(154, 116, 56, 232), width=2)
    # Subtle inner ring (rim definition)
    pd.ellipse([cx - 84, cy - 28, cx + 84, cy + 28],
               outline=(184, 148, 86, 160), width=1)
    # Soft highlight
    hl = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    hld = ImageDraw.Draw(hl)
    hld.ellipse([cx - 72, cy - 30, cx + 4, cy - 14],
                fill=(255, 248, 224, 180))
    patty.alpha_composite(soft_blur(hl, radius=3.5))
    img.alpha_composite(soft_blur(patty, radius=0.4))
    return img


# ---------------------------------------------------------------------------
# Driver
# ---------------------------------------------------------------------------

OUTPUTS = [
    ("potato/potato_boiled_001.png", gen_potato_boiled_001),
    ("potato/potato_mash_002.png", gen_potato_mash_002),
    ("potato/potato_mash_003.png", gen_potato_mash_003),
    ("potato/masher.png", gen_masher),
    ("korokke/prep/korokke_dough_001.png", gen_korokke_dough_001),
    ("korokke/prep/korokke_shape_002.png", gen_korokke_shape_002),
    ("korokke/prep/korokke_shape_003.png", gen_korokke_shape_003),
]


def main() -> None:
    print(f"Output base: {BASE_DIR}")
    if not BASE_DIR.exists():
        raise SystemExit(f"ERROR: cooking dir does not exist: {BASE_DIR}")
    # Safety: refuse to overwrite if any target already exists (preserve hand-drawn art)
    skipped = []
    for rel_path, _ in OUTPUTS:
        out_path = BASE_DIR / rel_path
        if out_path.exists():
            skipped.append(rel_path)
    if skipped:
        print("Existing files detected; will NOT overwrite:")
        for s in skipped:
            print(f"  skip {s}")
    results = []
    for rel_path, fn in OUTPUTS:
        out_path = BASE_DIR / rel_path
        if out_path.exists():
            continue
        img = fn()
        save_png(img, out_path)
        size_kb = out_path.stat().st_size / 1024
        results.append((str(out_path), img.size, size_kb))
        print(f"  wrote {rel_path:48s} {img.size[0]}x{img.size[1]}  {size_kb:6.1f} KB")
    print(f"\nDone. {len(results)} new placeholder PNGs generated, {len(skipped)} skipped.")


if __name__ == "__main__":
    main()
