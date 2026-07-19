"""
gen_cooking_placeholders.py - bento/kitchen.html の Phase B 用 functional placeholder PNG 生成

これは **placeholder** であり、 将来 fal.ai / Adobe Firefly / 手描きで本画像に差し替え予定。
差し替え時はファイル名同一で上書きするだけで kitchen.html の参照は変更不要。

詳細プロンプトは tmp/Bento/cooking_assets_brief.md を参照。

生成対象 (8 枚):
  salmon/salmon_001_back_raw.png       (380x220)
  salmon/salmon_002_back_mid.png       (380x220)
  salmon/salmon_003_back_done.png      (380x220)
  oil/oil_jar_still.png                (200x280)
  oil/oil_jar_tilted.png               (280x260)
  oil/oil_layer.png                    (400x260)
  salt/salt_shaker_still.png           (180x260)
  salt/salt_shaker_sprinkling.png      (220x260)
"""

import os
import math
import random
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

# Output base directory (absolute path, relative to repo root)
BASE_DIR = Path(__file__).resolve().parent.parent / "assets" / "images" / "bento" / "cooking"

# Reproducibility for scatter patterns
random.seed(20260603)


def ensure_dir(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)


def save_png(img: Image.Image, path: Path) -> None:
    ensure_dir(path)
    img.save(path, "PNG", optimize=True)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def watercolor_blob(size, fill_rgba, outline_rgba=(44, 44, 44, 230), outline_w=2):
    """Create a soft-edged rounded rect/ellipse with subtle blur for watercolor look."""
    img = Image.new("RGBA", size, (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.ellipse([0, 0, size[0] - 1, size[1] - 1], fill=fill_rgba, outline=outline_rgba, width=outline_w)
    return img


def soft_blur(img: Image.Image, radius: float = 1.2) -> Image.Image:
    return img.filter(ImageFilter.GaussianBlur(radius=radius))


# ---------------------------------------------------------------------------
# Salmon back (3 stages)
# ---------------------------------------------------------------------------

def _draw_salmon_back(skin_top_rgb, skin_bot_rgb, grill_marks=False, grill_color=None):
    """Draw a salmon steak seen from the skin side.

    Layout: an ellipse-ish steak ~380x180 centred; top 60% is skin, bottom 40%
    shows a thin pinkish fillet edge.
    """
    W, H = 380, 220
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # Steak silhouette (rounded irregular ellipse)
    pad_x, pad_y = 10, 20
    body_box = [pad_x, pad_y, W - pad_x, H - pad_y]

    # Fillet edge (bottom) - light pink
    fillet_color = (248, 176, 165, 235)
    d.ellipse(body_box, fill=fillet_color)

    # Skin (top portion) - clipped ellipse via two-tone gradient simulated by stripes
    skin_top = list(skin_top_rgb) + [240]
    skin_bot = list(skin_bot_rgb) + [240]
    skin_top_y = pad_y
    skin_bot_y = pad_y + int((H - 2 * pad_y) * 0.62)  # skin covers top 62%
    band_count = 32
    for i in range(band_count):
        t = i / (band_count - 1)
        r = int(skin_top[0] * (1 - t) + skin_bot[0] * t)
        g = int(skin_top[1] * (1 - t) + skin_bot[1] * t)
        b = int(skin_top[2] * (1 - t) + skin_bot[2] * t)
        a = 240
        y0 = skin_top_y + int((skin_bot_y - skin_top_y) * (i / band_count))
        y1 = skin_top_y + int((skin_bot_y - skin_top_y) * ((i + 1) / band_count)) + 1
        # Clip to body ellipse by drawing on a masked layer
        band = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        bd = ImageDraw.Draw(band)
        bd.rectangle([0, y0, W, y1], fill=(r, g, b, a))
        mask = Image.new("L", (W, H), 0)
        md = ImageDraw.Draw(mask)
        md.ellipse(body_box, fill=255)
        img.paste(band, (0, 0), mask)

    # Scale pattern on skin (small diamonds)
    scale_layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    sd = ImageDraw.Draw(scale_layer)
    scale_color = (
        max(skin_top_rgb[0] - 30, 0),
        max(skin_top_rgb[1] - 30, 0),
        max(skin_top_rgb[2] - 30, 0),
        160,
    )
    rows = 6
    for row in range(rows):
        y = skin_top_y + 6 + row * 10
        offset = 7 if row % 2 else 0
        for x in range(pad_x + 20, W - pad_x - 20, 14):
            cx = x + offset
            cy = y
            sd.polygon(
                [(cx, cy - 3), (cx + 5, cy), (cx, cy + 3), (cx - 5, cy)],
                outline=scale_color,
                fill=(scale_color[0], scale_color[1], scale_color[2], 60),
            )
    # Mask scales to body ellipse
    mask = Image.new("L", (W, H), 0)
    ImageDraw.Draw(mask).ellipse(body_box, fill=255)
    img.paste(scale_layer, (0, 0), mask)

    # Optional grill marks (darker arcs across skin)
    if grill_marks and grill_color is not None:
        gl = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        gd = ImageDraw.Draw(gl)
        for i, x_off in enumerate([90, 170, 250]):
            gd.arc(
                [x_off - 40, skin_top_y + 10, x_off + 40, skin_bot_y - 5],
                start=200,
                end=340,
                fill=grill_color + (170,),
                width=3,
            )
        mask2 = Image.new("L", (W, H), 0)
        ImageDraw.Draw(mask2).ellipse(body_box, fill=255)
        img.paste(gl, (0, 0), mask2)

    # Outline of the whole steak
    d.ellipse(body_box, outline=(44, 44, 44, 230), width=2)

    # Slight watercolor softness
    img = soft_blur(img, radius=0.8)
    return img


def gen_salmon_back_raw() -> Image.Image:
    # Silver-grey skin
    return _draw_salmon_back(skin_top_rgb=(123, 134, 143), skin_bot_rgb=(176, 185, 192))


def gen_salmon_back_mid() -> Image.Image:
    # Lightly browned skin
    return _draw_salmon_back(skin_top_rgb=(140, 112, 80), skin_bot_rgb=(184, 144, 112))


def gen_salmon_back_done() -> Image.Image:
    # Deeply roasted skin + grill marks
    return _draw_salmon_back(
        skin_top_rgb=(92, 58, 32),
        skin_bot_rgb=(140, 85, 48),
        grill_marks=True,
        grill_color=(60, 30, 15),
    )


# ---------------------------------------------------------------------------
# Oil jar (still, tilted, layer)
# ---------------------------------------------------------------------------

def _draw_jar(canvas_size, jar_box, cap_h=30, oil_color=(240, 192, 64, 200),
              fill_ratio=0.7, cap_color=(192, 192, 192, 240)):
    """Draw a simple glass jar with golden oil inside."""
    img = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    x0, y0, x1, y1 = jar_box
    # Cap
    cap_box = [x0 + 6, y0, x1 - 6, y0 + cap_h]
    d.rounded_rectangle(cap_box, radius=4, fill=cap_color, outline=(44, 44, 44, 230), width=2)
    # Glass body
    glass_box = [x0, y0 + cap_h, x1, y1]
    d.rounded_rectangle(glass_box, radius=14,
                        fill=(255, 255, 255, 60),
                        outline=(44, 44, 44, 230), width=2)
    # Oil fill (bottom portion)
    glass_h = (y1) - (y0 + cap_h)
    oil_top_y = (y0 + cap_h) + int(glass_h * (1 - fill_ratio))
    oil_box = [x0 + 2, oil_top_y, x1 - 2, y1 - 2]
    d.rounded_rectangle(oil_box, radius=12, fill=oil_color)
    # Oil meniscus highlight
    d.line([(x0 + 8, oil_top_y + 2), (x1 - 8, oil_top_y + 2)],
           fill=(255, 240, 180, 200), width=2)
    # Glass highlight
    d.line([(x0 + 8, y0 + cap_h + 8), (x0 + 8, y1 - 10)],
           fill=(255, 255, 255, 140), width=2)
    return img


def gen_oil_jar_still() -> Image.Image:
    W, H = 200, 280
    img = _draw_jar(
        canvas_size=(W, H),
        jar_box=(40, 20, 160, 260),
        cap_h=30,
        oil_color=(240, 192, 64, 210),
        fill_ratio=0.7,
        cap_color=(139, 90, 43, 240),  # cork-brown cap
    )
    return soft_blur(img, radius=0.6)


def gen_oil_jar_tilted() -> Image.Image:
    """Render jar straight, then rotate ~60deg clockwise; draw oil drops on canvas."""
    W, H = 280, 260
    canvas = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    # Build jar on its own canvas
    jar_canvas = Image.new("RGBA", (200, 280), (0, 0, 0, 0))
    jar = _draw_jar(
        canvas_size=(200, 280),
        jar_box=(40, 20, 160, 260),
        cap_h=30,
        oil_color=(240, 192, 64, 210),
        fill_ratio=0.55,  # less oil because some is pouring
        cap_color=(139, 90, 43, 240),
    )
    jar_canvas.alpha_composite(jar)
    # Rotate -60 deg (counter-clockwise so the mouth tilts to the right)
    rotated = jar_canvas.rotate(-60, resample=Image.BICUBIC, expand=True)
    # Paste centered-left on canvas
    rx, ry = rotated.size
    paste_x = (W - rx) // 2 - 20
    paste_y = (H - ry) // 2 - 10
    canvas.alpha_composite(rotated, (paste_x, paste_y))
    # Oil drops near jar mouth (bottom-right area)
    d = ImageDraw.Draw(canvas)
    drops = [
        (W - 70, H - 100, 14, 22),
        (W - 55, H - 70, 10, 16),
        (W - 45, H - 40, 8, 12),
    ]
    for cx, cy, rw, rh in drops:
        d.ellipse([cx - rw, cy - rh, cx + rw, cy + rh],
                  fill=(240, 192, 64, 220), outline=(44, 44, 44, 200), width=1)
        d.ellipse([cx - rw // 3, cy - rh // 2, cx, cy - rh // 4],
                  fill=(255, 240, 180, 180))
    return soft_blur(canvas, radius=0.6)


def gen_oil_layer() -> Image.Image:
    W, H = 400, 260
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    # Build radial-ish gradient by drawing concentric ellipses
    cx, cy = W // 2, H // 2
    rx_max, ry_max = 190, 100
    steps = 36
    for i in range(steps, 0, -1):
        t = i / steps
        rx = int(rx_max * t)
        ry = int(ry_max * t)
        # Inner brighter yellow -> outer darker amber
        r = int(244 * t + 224 * (1 - t))
        g = int(208 * t + 160 * (1 - t))
        b = int(96 * t + 48 * (1 - t))
        a = int(140 * (1 - (1 - t) ** 2)) + 30
        layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        ld = ImageDraw.Draw(layer)
        ld.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=(r, g, b, a))
        img.alpha_composite(layer)
    # Surface ripples (thin white ellipses)
    d = ImageDraw.Draw(img)
    for dy, w in [(-25, 1), (0, 2), (28, 1)]:
        d.ellipse([cx - 150, cy + dy - 5, cx + 150, cy + dy + 5],
                  outline=(255, 255, 255, 150), width=w)
    # Soft outer outline
    d.ellipse([cx - rx_max, cy - ry_max, cx + rx_max, cy + ry_max],
              outline=(160, 110, 30, 160), width=2)
    return soft_blur(img, radius=1.4)


# ---------------------------------------------------------------------------
# Salt shaker (still, sprinkling)
# ---------------------------------------------------------------------------

def _draw_salt_jar(canvas_size, jar_box, cap_h=50):
    W, H = canvas_size
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    x0, y0, x1, y1 = jar_box

    # Cap (silver) with rounded top
    cap_box = [x0 + 4, y0, x1 - 4, y0 + cap_h]
    d.rounded_rectangle(cap_box, radius=12,
                        fill=(192, 192, 192, 245),
                        outline=(44, 44, 44, 230), width=2)
    # Cap shading
    d.line([(x0 + 10, y0 + 6), (x1 - 10, y0 + 6)],
           fill=(255, 255, 255, 200), width=2)
    # Holes on cap (5 small circles)
    hole_y = y0 + cap_h // 2
    cap_cx = (x0 + x1) // 2
    for i, off in enumerate([-22, -11, 0, 11, 22]):
        d.ellipse([cap_cx + off - 2, hole_y - 2, cap_cx + off + 2, hole_y + 2],
                  fill=(60, 60, 60, 230))

    # Glass body
    glass_box = [x0, y0 + cap_h, x1, y1]
    d.rounded_rectangle(glass_box, radius=10,
                        fill=(255, 255, 255, 50),
                        outline=(44, 44, 44, 230), width=2)

    # Salt grains inside (small white circles)
    inner = [x0 + 6, y0 + cap_h + 8, x1 - 6, y1 - 6]
    mask = Image.new("L", (W, H), 0)
    ImageDraw.Draw(mask).rounded_rectangle(glass_box, radius=10, fill=255)
    grains = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(grains)
    for _ in range(60):
        gx = random.randint(inner[0], inner[2])
        gy = random.randint(inner[1] + (inner[3] - inner[1]) // 3, inner[3])  # settle in bottom 2/3
        gr = random.choice([2, 2, 3])
        gd.ellipse([gx - gr, gy - gr, gx + gr, gy + gr],
                   fill=(255, 255, 255, 240), outline=(180, 180, 180, 180))
    img.paste(grains, (0, 0), mask)

    # Glass highlight line
    d.line([(x0 + 6, y0 + cap_h + 12), (x0 + 6, y1 - 12)],
           fill=(255, 255, 255, 130), width=2)
    return img


def gen_salt_shaker_still() -> Image.Image:
    W, H = 180, 260
    img = _draw_salt_jar(
        canvas_size=(W, H),
        jar_box=(35, 20, 145, 245),
        cap_h=50,
    )
    return soft_blur(img, radius=0.5)


def gen_salt_shaker_sprinkling() -> Image.Image:
    W, H = 220, 260
    canvas = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    # Build still jar
    jar_canvas = Image.new("RGBA", (180, 260), (0, 0, 0, 0))
    jar_canvas.alpha_composite(_draw_salt_jar(
        canvas_size=(180, 260),
        jar_box=(35, 20, 145, 245),
        cap_h=50,
    ))
    # Tilt 45 deg counter-clockwise so the cap points lower-right
    rotated = jar_canvas.rotate(-45, resample=Image.BICUBIC, expand=True)
    rx, ry = rotated.size
    paste_x = (W - rx) // 2 - 10
    paste_y = (H - ry) // 2 - 30
    canvas.alpha_composite(rotated, (paste_x, paste_y))
    # Sprinkled salt grains falling toward bottom-right
    d = ImageDraw.Draw(canvas)
    for _ in range(14):
        gx = random.randint(W - 110, W - 10)
        gy = random.randint(H - 90, H - 5)
        gr = random.choice([2, 3, 3, 4])
        d.ellipse([gx - gr, gy - gr, gx + gr, gy + gr],
                  fill=(255, 255, 255, 240),
                  outline=(170, 170, 170, 200))
    return soft_blur(canvas, radius=0.5)


# ---------------------------------------------------------------------------
# Driver
# ---------------------------------------------------------------------------

OUTPUTS = [
    ("salmon/salmon_001_back_raw.png", gen_salmon_back_raw),
    ("salmon/salmon_002_back_mid.png", gen_salmon_back_mid),
    ("salmon/salmon_003_back_done.png", gen_salmon_back_done),
    ("oil/oil_jar_still.png", gen_oil_jar_still),
    ("oil/oil_jar_tilted.png", gen_oil_jar_tilted),
    ("oil/oil_layer.png", gen_oil_layer),
    ("salt/salt_shaker_still.png", gen_salt_shaker_still),
    ("salt/salt_shaker_sprinkling.png", gen_salt_shaker_sprinkling),
]


def main() -> None:
    print(f"Output base: {BASE_DIR}")
    if not BASE_DIR.exists():
        raise SystemExit(f"ERROR: cooking dir does not exist: {BASE_DIR}")
    results = []
    for rel_path, fn in OUTPUTS:
        out_path = BASE_DIR / rel_path
        img = fn()
        save_png(img, out_path)
        size_kb = out_path.stat().st_size / 1024
        results.append((str(out_path), img.size, size_kb))
        print(f"  wrote {rel_path:42s} {img.size[0]}x{img.size[1]}  {size_kb:6.1f} KB")
    print(f"\nDone. {len(results)} placeholder PNGs generated.")


if __name__ == "__main__":
    main()
