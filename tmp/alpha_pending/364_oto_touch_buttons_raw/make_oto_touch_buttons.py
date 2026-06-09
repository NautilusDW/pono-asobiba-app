from __future__ import annotations

import json
import math
from collections import deque
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent
CELL = 512
SCALE = 2
BASE_CACHE: dict[str, Image.Image] = {}

FONT_JP = Path(r"C:\Windows\Fonts\NotoSansJP-VF.ttf")
FONT_LATIN = Path(r"C:\Windows\Fonts\arialbd.ttf")


NOTE_COLORS = {
    "do": "#FF5A6E",
    "re": "#FF9A3C",
    "mi": "#FFD23F",
    "fa": "#5BD96B",
    "so": "#3FD0E0",
    "la": "#5A7CFF",
    "si": "#A56BFF",
    "do_high": "#FF7AC6",
}

NOTE_ORDER = [
    ("do", "ド", "C", "c"),
    ("re", "レ", "D", "d"),
    ("mi", "ミ", "E", "e"),
    ("fa", "ファ", "F", "f"),
    ("so", "ソ", "G", "g"),
    ("la", "ラ", "A", "a"),
    ("si", "シ", "B", "b"),
    ("do_high", "ド", "C", "c_high"),
]

ANIMALS = [
    ("cat", "Cat/Cat_normal_1.png", "#7C8796"),
    ("dog", "Dog/Dog_normal_1.png", "#B8794A"),
    ("cow", "Cow/Cow_normal_1.png", "#3E4A58"),
    ("pig", "Pig/Pig_normal_1.png", "#F27FA7"),
    ("horse", "Horse/Horse_normal_1.png", "#A66B3D"),
    ("lion", "Lion/Lion_normal_1.png", "#D99A2F"),
    ("frog", "Frog/Frog_normal_1.png", "#4CB85F"),
    ("crow", "Crow/Crow_normal_1.png", "#384155"),
]


def hex_to_rgb(color: str) -> tuple[int, int, int]:
    color = color.lstrip("#")
    return tuple(int(color[i : i + 2], 16) for i in (0, 2, 4))


def mix(a: tuple[int, int, int], b: tuple[int, int, int], t: float) -> tuple[int, int, int]:
    return tuple(round(a[i] * (1 - t) + b[i] * t) for i in range(3))


def radial_gradient(size: int, center: tuple[float, float], inner: str, outer: str) -> Image.Image:
    inner_rgb = hex_to_rgb(inner)
    outer_rgb = hex_to_rgb(outer)
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    pix = img.load()
    max_dist = math.hypot(max(center[0], size - center[0]), max(center[1], size - center[1]))
    for y in range(size):
        for x in range(size):
            d = math.hypot(x - center[0], y - center[1]) / max_dist
            rgb = mix(inner_rgb, outer_rgb, min(1, d * 1.45))
            pix[x, y] = (*rgb, 255)
    return img


def capsule(size: tuple[int, int], color: str) -> Image.Image:
    w, h = size
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle((0, 0, w - 1, h - 1), radius=h // 2, fill=color)
    draw.rounded_rectangle((2, 2, w - 3, max(2, h // 2)), radius=h // 3, fill=(255, 255, 255, 95))
    return img


def draw_stitches(base: Image.Image, accent: str) -> None:
    size = base.size[0]
    stitch = capsule((42 * SCALE, 13 * SCALE), accent)
    center = size / 2
    radius = 190 * SCALE
    for i in range(32):
        angle = 2 * math.pi * i / 32
        x = center + math.cos(angle) * radius
        y = center + math.sin(angle) * radius
        rotated = stitch.rotate(math.degrees(angle) + 90, resample=Image.Resampling.BICUBIC, expand=True)
        base.alpha_composite(rotated, (round(x - rotated.width / 2), round(y - rotated.height / 2)))


def make_button_base(accent: str) -> Image.Image:
    if accent in BASE_CACHE:
        return BASE_CACHE[accent].copy()

    size = CELL * SCALE
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))

    shadow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.ellipse(
        (54 * SCALE, 68 * SCALE, 458 * SCALE, 472 * SCALE),
        fill=(55, 42, 25, 70),
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(12 * SCALE))
    img.alpha_composite(shadow)

    circle_mask = Image.new("L", (size, size), 0)
    md = ImageDraw.Draw(circle_mask)
    md.ellipse((38 * SCALE, 30 * SCALE, 474 * SCALE, 466 * SCALE), fill=255)
    cream = radial_gradient(size, (198 * SCALE, 156 * SCALE), "#FFF6D7", "#F2C985")
    img.alpha_composite(Image.composite(cream, Image.new("RGBA", (size, size), (0, 0, 0, 0)), circle_mask))

    d = ImageDraw.Draw(img)
    d.ellipse((38 * SCALE, 30 * SCALE, 474 * SCALE, 466 * SCALE), outline=(132, 91, 42, 130), width=4 * SCALE)
    d.ellipse((57 * SCALE, 49 * SCALE, 455 * SCALE, 447 * SCALE), outline=(255, 255, 255, 120), width=3 * SCALE)

    draw_stitches(img, accent)

    gloss = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    gd = ImageDraw.Draw(gloss)
    gd.ellipse((82 * SCALE, 58 * SCALE, 290 * SCALE, 180 * SCALE), fill=(255, 255, 255, 48))
    gloss = gloss.filter(ImageFilter.GaussianBlur(7 * SCALE))
    img.alpha_composite(gloss)

    BASE_CACHE[accent] = img.copy()
    return img


def font(path: Path, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(path), size * SCALE)


def text_bbox(draw: ImageDraw.ImageDraw, xy: tuple[int, int], text: str, fnt: ImageFont.FreeTypeFont, stroke: int) -> tuple[int, int, int, int]:
    return draw.textbbox(xy, text, font=fnt, stroke_width=stroke)


def draw_centered_text(img: Image.Image, text: str, accent: str, jp: bool) -> None:
    size = img.size[0]
    draw = ImageDraw.Draw(img)
    if jp:
        fnt = font(FONT_JP, 154 if len(text) == 1 else 114)
    else:
        fnt = font(FONT_LATIN, 196 if len(text) == 1 else 170)

    stroke = 8 * SCALE
    bbox = text_bbox(draw, (0, 0), text, fnt, stroke)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    x = (size - tw) / 2 - bbox[0]
    y = (size - th) / 2 - bbox[1] - (7 * SCALE if jp else 2 * SCALE)

    shadow_layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow_layer)
    sd.text((x + 8 * SCALE, y + 10 * SCALE), text, font=fnt, fill=(80, 44, 28, 95), stroke_width=stroke, stroke_fill=(80, 44, 28, 80))
    shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(3 * SCALE))
    img.alpha_composite(shadow_layer)

    outline = mix(hex_to_rgb(accent), (65, 40, 30), 0.28)
    draw.text((x, y), text, font=fnt, fill=accent, stroke_width=stroke, stroke_fill=outline)
    draw.text((x - 4 * SCALE, y - 5 * SCALE), text, font=fnt, fill=(255, 255, 255, 78), stroke_width=1 * SCALE, stroke_fill=(255, 255, 255, 40))

    sparkle = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    sp = ImageDraw.Draw(sparkle)
    sp.ellipse((158 * SCALE, 124 * SCALE, 184 * SCALE, 150 * SCALE), fill=(255, 255, 255, 160))
    sp.ellipse((198 * SCALE, 102 * SCALE, 211 * SCALE, 115 * SCALE), fill=(255, 255, 255, 120))
    img.alpha_composite(sparkle)


def trim_to_alpha(img: Image.Image) -> Image.Image:
    alpha = img.getchannel("A")
    bbox = alpha.point(lambda p: 255 if p > 10 else 0).getbbox()
    if not bbox:
        return img
    return img.crop(bbox)


def border_foreground_alpha(src: Image.Image) -> Image.Image:
    rgb = src.convert("RGB")
    w, h = rgb.size
    pix = rgb.load()
    visited = bytearray(w * h)
    q: deque[tuple[int, int]] = deque()

    def is_background(x: int, y: int) -> bool:
        r, g, b = pix[x, y]
        return r > 232 and g > 232 and b > 232

    def add(x: int, y: int) -> None:
        if x < 0 or y < 0 or x >= w or y >= h:
            return
        idx = y * w + x
        if visited[idx] or not is_background(x, y):
            return
        visited[idx] = 1
        q.append((x, y))

    for x in range(w):
        add(x, 0)
        add(x, h - 1)
    for y in range(h):
        add(0, y)
        add(w - 1, y)

    while q:
        x, y = q.popleft()
        add(x + 1, y)
        add(x - 1, y)
        add(x, y + 1)
        add(x, y - 1)

    alpha = Image.new("L", (w, h), 0)
    ap = alpha.load()
    for y in range(h):
        row = y * w
        for x in range(w):
            ap[x, y] = 0 if visited[row + x] else 255
    return alpha.filter(ImageFilter.GaussianBlur(0.7))


def source_foreground_alpha(src: Image.Image) -> Image.Image:
    alpha = src.getchannel("A")
    bbox = alpha.point(lambda p: 255 if p > 10 else 0).getbbox()
    if bbox and bbox != (0, 0, src.width, src.height):
        return alpha
    return border_foreground_alpha(src)


def crop_to_mask(src: Image.Image, mask: Image.Image) -> tuple[Image.Image, Image.Image]:
    bbox = mask.point(lambda p: 255 if p > 10 else 0).getbbox()
    if not bbox:
        return src, mask
    return src.crop(bbox), mask.crop(bbox)


def load_silhouette(path: Path, fill: str, max_size: tuple[int, int]) -> Image.Image:
    src = Image.open(path).convert("RGBA")
    src_alpha = source_foreground_alpha(src)
    src, src_alpha = crop_to_mask(src, src_alpha)
    src.thumbnail(max_size, Image.Resampling.LANCZOS)
    src_alpha.thumbnail(max_size, Image.Resampling.LANCZOS)
    alpha = src_alpha.filter(ImageFilter.GaussianBlur(0.35 * SCALE))
    solid = Image.new("RGBA", src.size, (*hex_to_rgb(fill), 255))
    solid.putalpha(alpha)

    rim = Image.new("RGBA", src.size, (255, 255, 255, 0))
    rim.putalpha(alpha.filter(ImageFilter.GaussianBlur(2 * SCALE)))
    solid = Image.alpha_composite(rim, solid)
    return solid


def make_text_button(note_key: str, label: str, jp: bool) -> Image.Image:
    accent = NOTE_COLORS[note_key]
    img = make_button_base(accent)
    draw_centered_text(img, label, accent, jp)
    return img.resize((CELL, CELL), Image.Resampling.LANCZOS)


def make_animal_button(animal_id: str, rel_path: str, color: str, note_key: str) -> Image.Image:
    accent = NOTE_COLORS[note_key]
    img = make_button_base(accent)
    size = img.size[0]

    shadow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    animal_path = ROOT / "assets" / "images" / "ocean" / rel_path
    silhouette = load_silhouette(animal_path, color, (275 * SCALE, 230 * SCALE))

    sx = round((size - silhouette.width) / 2)
    sy = round((size - silhouette.height) / 2 + 10 * SCALE)

    sd = Image.new("RGBA", silhouette.size, (0, 0, 0, 0))
    sd.putalpha(silhouette.getchannel("A"))
    sd = sd.filter(ImageFilter.GaussianBlur(5 * SCALE))
    shadow_fill = Image.new("RGBA", silhouette.size, (66, 44, 28, 85))
    shadow_fill.putalpha(sd.getchannel("A"))
    shadow.alpha_composite(shadow_fill, (sx + 8 * SCALE, sy + 10 * SCALE))
    img.alpha_composite(shadow)
    img.alpha_composite(silhouette, (sx, sy))

    hi = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    hd = ImageDraw.Draw(hi)
    hd.ellipse((174 * SCALE, 138 * SCALE, 220 * SCALE, 170 * SCALE), fill=(255, 255, 255, 85))
    img.alpha_composite(hi)

    return img.resize((CELL, CELL), Image.Resampling.LANCZOS)


def save_sheet(items: list[tuple[str, Image.Image]], filename: str) -> None:
    sheet = Image.new("RGBA", (CELL * 4, CELL * 2), (0, 0, 0, 0))
    for idx, (_, img) in enumerate(items):
        x = (idx % 4) * CELL
        y = (idx // 4) * CELL
        sheet.alpha_composite(img, (x, y))
    sheet.save(OUT / filename)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)

    katakana_items = []
    roman_items = []
    animal_items = []

    for key, kana, roman, roman_file_key in NOTE_ORDER:
        img = make_text_button(key, kana, True)
        name = f"btn_note_katakana_{key}.png"
        img.save(OUT / name)
        katakana_items.append((name, img))

        img = make_text_button(key, roman, False)
        name = f"btn_note_roman_{roman_file_key}.png"
        img.save(OUT / name)
        roman_items.append((name, img))

    for (animal_id, rel, color), (note_key, _, _, _) in zip(ANIMALS, NOTE_ORDER):
        img = make_animal_button(animal_id, rel, color, note_key)
        name = f"btn_note_animal_{animal_id}.png"
        img.save(OUT / name)
        animal_items.append((name, img))

    save_sheet(katakana_items, "sheet_katakana_doremi_4x2.png")
    save_sheet(roman_items, "sheet_roman_cdefgabc_4x2.png")
    save_sheet(animal_items, "sheet_animal_silhouettes_4x2.png")

    all_items = katakana_items + roman_items + animal_items
    preview = Image.new("RGBA", (CELL * 8, CELL * 3), (255, 255, 255, 255))
    for idx, (_, img) in enumerate(all_items):
        x = (idx % 8) * CELL
        y = (idx // 8) * CELL
        preview.alpha_composite(img, (x, y))
    preview.save(OUT / "preview_all_24_buttons.png")

    manifest = {
        "batch": "364-oto-touch-button-assets",
        "styleReference": "assets/images/oto/buttons existing stitch-style circular buttons",
        "cellSize": CELL,
        "sheets": [
            "sheet_katakana_doremi_4x2.png",
            "sheet_roman_cdefgabc_4x2.png",
            "sheet_animal_silhouettes_4x2.png",
        ],
        "katakana": [name for name, _ in katakana_items],
        "roman": [name for name, _ in roman_items],
        "animalNoteMapping": [
            {"idx": i, "note": NOTE_ORDER[i][1], "animal": animal_id, "source": str(ROOT / "assets" / "images" / "ocean" / rel)}
            for i, (animal_id, rel, _) in enumerate(ANIMALS)
        ],
        "animals": [name for name, _ in animal_items],
        "notes": [
            "Text was rendered locally for exact katakana/roman output.",
            "Animal silhouettes use existing oto ANIMAL_FILES order: cat, dog, cow, pig, horse, lion, frog, crow.",
        ],
    }
    (OUT / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
