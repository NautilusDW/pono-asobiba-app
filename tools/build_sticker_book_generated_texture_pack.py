from __future__ import annotations

import math
import shutil
from collections import deque
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "_PonoSubmarine" / "Art" / "UI" / "StickerBook3D"
SOURCE = OUT / "sb3d_image2_texture_source.png"
LEGACY_SOURCE = Path.home() / ".codex" / "generated_images" / "019ecb83-8764-7c23-b4e8-ae51b1681ed0" / "ig_06dc925544b6692c016a3027672514819188a4a33bc316024e.png"
SEA_ALBUM_STAGE1 = ROOT / "assets" / "images" / "sea-album" / "stage1"

PAGE_W = 1472
PAGE_H = 1536
SPINE_W = 256
PAGE_RADIUS_PX = 92
THICKNESS_W = PAGE_W
THICKNESS_H = 256
RING_PIXELS = [170, 370, 570, 770, 970, 1170, 1370]
THICKNESS_LEVELS = {
    "empty": 12,
    "small": THICKNESS_H,
    "half": THICKNESS_H,
    "mostly": THICKNESS_H,
    "full": THICKNESS_H,
}
IMAGE2_THICKNESS_SOURCES = {
    "start": OUT / "sb3d_image2_thickness_spread_start_alpha.png",
    "mid": OUT / "sb3d_image2_thickness_spread_mid_alpha.png",
    "end": OUT / "sb3d_image2_thickness_spread_end_alpha.png",
}
IMAGE2_THIN_THICKNESS_ATLAS = OUT / "sb3d_image2_thickness_atlas_thin_alpha.png"
IMAGE2_BALANCED_THICKNESS_STRIP_ATLAS = OUT / "sb3d_image2_thickness_strip_atlas_balanced_alpha.png"

VARIANTS = {
    "boy": {
        "inside_left_source": OUT / "sb3d_boy_inside_left_source.png",
        "inside_right_source": OUT / "sb3d_boy_inside_right_source.png",
        "cover_front_source": OUT / "sb3d_boy_cover_front_source.png",
        "cover_back_source": OUT / "sb3d_boy_cover_back_source.png",
        "title_lines": ("ぼうけん", "シールずかん"),
        "title_fill": "385867",
        "title_stroke": "f8ecd0",
        "spine_gradient": ("6c9594", "c3dfd9", "6d9594"),
        "spine_outline": "f3ecd0",
        "tab_left_colors": ["f29835", "e86f52", "4cb8c8", "5c83d2", "77af49"],
        "tab_right_colors": ["f08a2f", "e1a434", "78ba52", "4ca9d4", "58bbb0"],
        "tab_accent": "fff6d8",
        "inside_cover_palette": ("f7efd8", "d3b067", "88b9ca"),
        "page_palette": {
            "top": "fff8dc",
            "bottom": "f2e2b1",
            "frame": "d7b65e",
            "accent": "277e90",
            "accent2": "e59a38",
            "card": "fffaf0",
            "card_alt": "edf8f6",
            "ink": "35505b",
        },
        "left_title": ("しおだまり ずかん", "ステージ1 / みつけたもの"),
        "right_title": ("ぼうけんメモ", "ステージ1 / なかよしカード"),
    },
    "girl": {
        "inside_left_source": OUT / "sb3d_girl_inside_left_source.png",
        "inside_right_source": OUT / "sb3d_girl_inside_right_source.png",
        "cover_front_source": OUT / "sb3d_girl_cover_front_source.png",
        "cover_back_source": OUT / "sb3d_girl_cover_back_source.png",
        "title_lines": ("うみのおともだち", "シールずかん"),
        "title_fill": "8f4d72",
        "title_stroke": "fff2fb",
        "spine_gradient": ("97d8d4", "f8d2e2", "98d8d4"),
        "spine_outline": "fff3fb",
        "tab_left_colors": ["ff9ab9", "82d7de", "a88cf3", "ffbe8f", "98cf68"],
        "tab_right_colors": ["ff8fbb", "8ddde3", "caa0f7", "ffd47c", "79d0c8"],
        "tab_accent": "fff4fb",
        "inside_cover_palette": ("fff4f8", "e6a4c4", "9edee1"),
        "page_palette": {
            "top": "fff6f8",
            "bottom": "f2e8c8",
            "frame": "e2a4bd",
            "accent": "4faab2",
            "accent2": "b486e8",
            "card": "fffafb",
            "card_alt": "eefafa",
            "ink": "5e5368",
        },
        "left_title": ("うみの なかま", "ステージ1 / みつけたもの"),
        "right_title": ("きらきらメモ", "ステージ1 / なかよしカード"),
    },
}

PAGE_ITEMS = {
    "left": [
        ("ヤドカリ", "かいのカギをくれる", SEA_ALBUM_STAGE1 / "hermit_crab_happy.png"),
        ("エビ", "すばやく およぐ", SEA_ALBUM_STAGE1 / "shrimp_happy.png"),
        ("ヒトデ", "いわに ぴたり", SEA_ALBUM_STAGE1 / "sea_star_happy.png"),
        ("イソギンチャク", "ゆらゆら まつ", SEA_ALBUM_STAGE1 / "sea_anemone_happy.png"),
        ("貝宝箱", "あけると ひかる", SEA_ALBUM_STAGE1 / "item_shell_chest_open.png"),
        ("貝のカギ", "たからばこの カギ", SEA_ALBUM_STAGE1 / "item_shell_key.png"),
    ],
    "right": [
        ("ハゼ", "すなに かくれる", SEA_ALBUM_STAGE1 / "tidepool_goby_happy.png"),
        ("カブトガニ", "おくで まっている", SEA_ALBUM_STAGE1 / "horseshoe_crab_boss_happy.png"),
        ("すなだんご", "なかよしの しるし", SEA_ALBUM_STAGE1 / "item_sandball.png"),
        ("ヤドカリメモ", "もういちど あいさつ", SEA_ALBUM_STAGE1 / "hermit_crab_normal.png"),
        ("エビメモ", "えさを みつけた", SEA_ALBUM_STAGE1 / "shrimp_eating.png"),
        ("ヒトデメモ", "にこにこ かんさつ", SEA_ALBUM_STAGE1 / "sea_star_eating.png"),
    ],
}


def rgba(hex_value: str, alpha: int = 255) -> tuple[int, int, int, int]:
    hex_value = hex_value.strip("#")
    return (
        int(hex_value[0:2], 16),
        int(hex_value[2:4], 16),
        int(hex_value[4:6], 16),
        alpha,
    )


def blend_rgb(a: str, b: str, t: float) -> tuple[int, int, int, int]:
    ca = rgba(a)
    cb = rgba(b)
    return (
        int(ca[0] + (cb[0] - ca[0]) * t),
        int(ca[1] + (cb[1] - ca[1]) * t),
        int(ca[2] + (cb[2] - ca[2]) * t),
        255,
    )


def source_reference_path() -> Path | None:
    if SOURCE.exists():
        return SOURCE
    if LEGACY_SOURCE.exists():
        return LEGACY_SOURCE
    return None


def load_font(size: int, bold: bool = True) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        Path("C:/Windows/Fonts/meiryob.ttc") if bold else Path("C:/Windows/Fonts/meiryo.ttc"),
        Path("C:/Windows/Fonts/yu Gothic UI Semibold.ttf"),
        Path("C:/Windows/Fonts/arialbd.ttf") if bold else Path("C:/Windows/Fonts/arial.ttf"),
    ]
    for candidate in candidates:
        if candidate.exists():
            try:
                return ImageFont.truetype(str(candidate), size=size)
            except OSError:
                continue
    return ImageFont.load_default()


def fit_font(text: str, max_width: int, start_size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for size in range(start_size, 9, -4):
        font = load_font(size)
        bbox = font.getbbox(text)
        if bbox[2] - bbox[0] <= max_width:
            return font
    return load_font(12)


def add_soft_grain(image: Image.Image, strength: int = 12) -> Image.Image:
    low_w = max(1, image.width // 8)
    low_h = max(1, image.height // 8)
    noise = Image.new("L", (low_w, low_h), 128)
    pixels = noise.load()
    for y in range(low_h):
        for x in range(low_w):
            hash_value = (x * 73856093) ^ (y * 19349663) ^ ((x + y) * 83492791)
            jitter = (hash_value & 255) - 128
            wave = math.sin(x * 0.43 + y * 0.31) * 18
            pixels[x, y] = max(0, min(255, 128 + int(jitter * 0.44 + wave)))

    noise = noise.resize(image.size, Image.Resampling.BICUBIC)
    light = Image.new("RGBA", image.size, rgba("fffbe9", 0))
    light.putalpha(noise.point(lambda p: max(0, p - 132) * strength // 123))
    dark = Image.new("RGBA", image.size, rgba("7c6735", 0))
    dark.putalpha(noise.point(lambda p: max(0, 124 - p) * strength // 123))
    image = Image.alpha_composite(Image.alpha_composite(image, light), dark)

    fiber = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(fiber)
    for y in range(-80, image.height + 80, 42):
        offset = int(math.sin(y * 0.017) * 22)
        draw.line(
            (offset, y, image.width + offset, y + int(math.sin(y * 0.031) * 18)),
            fill=rgba("b99f62", 12),
            width=2,
        )
    for x in range(-120, image.width + 120, 96):
        draw.line((x, -20, x + 90, image.height + 20), fill=rgba("ffffff", 7), width=3)
    return Image.alpha_composite(image, fiber.filter(ImageFilter.GaussianBlur(1.2)))


def save_runtime_png(image: Image.Image, path: Path, *, opaque: bool = False, palette: bool = False) -> None:
    output = image
    if palette:
        output = image.convert("RGB").quantize(colors=256, method=Image.Quantize.MEDIANCUT)
    elif opaque:
        output = image.convert("RGB")
    output.save(path, optimize=True, compress_level=9)


def make_paper_base(top: str = "fff7dc", bottom: str = "f6e5b8") -> Image.Image:
    image = Image.new("RGBA", (PAGE_W, PAGE_H), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    for y in range(PAGE_H):
        t = y / max(1, PAGE_H - 1)
        draw.line((0, y, PAGE_W, y), fill=blend_rgb(top, bottom, t))

    glow = Image.new("RGBA", image.size, (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    glow_draw.ellipse((-260, -280, PAGE_W * 0.75, PAGE_H * 0.45), fill=rgba("ffffff", 38))
    glow_draw.ellipse((PAGE_W * 0.25, PAGE_H * 0.62, PAGE_W + 220, PAGE_H + 210), fill=rgba("e4c778", 28))
    vignette = Image.new("RGBA", image.size, (0, 0, 0, 0))
    vignette_draw = ImageDraw.Draw(vignette)
    vignette_draw.rounded_rectangle((34, 34, PAGE_W - 34, PAGE_H - 34), radius=70, outline=rgba("8b7138", 30), width=10)
    image = Image.alpha_composite(image, glow.filter(ImageFilter.GaussianBlur(32)))
    image = Image.alpha_composite(image, vignette.filter(ImageFilter.GaussianBlur(14)))
    return add_soft_grain(image, strength=16)


def detect_art_bbox(image: Image.Image) -> tuple[int, int, int, int]:
    small_w = 256
    small_h = max(160, round(image.height * small_w / image.width))
    small = image.convert("RGBA").resize((small_w, small_h), Image.Resampling.LANCZOS)
    pixels = small.load()
    w, h = small.size
    corners = [pixels[0, 0], pixels[w - 1, 0], pixels[0, h - 1], pixels[w - 1, h - 1]]
    bg = tuple(sum(c[i] for c in corners) // len(corners) for i in range(3))

    visited = bytearray(w * h)
    queue: deque[tuple[int, int]] = deque()

    def is_background(pixel: tuple[int, int, int, int]) -> bool:
        if pixel[3] < 12:
            return True
        return sum(abs(pixel[i] - bg[i]) for i in range(3)) <= 72

    def push(x: int, y: int) -> None:
        idx = y * w + x
        if visited[idx]:
            return
        visited[idx] = 1
        queue.append((x, y))

    for x in range(w):
        if is_background(pixels[x, 0]):
            push(x, 0)
        if is_background(pixels[x, h - 1]):
            push(x, h - 1)
    for y in range(h):
        if is_background(pixels[0, y]):
            push(0, y)
        if is_background(pixels[w - 1, y]):
            push(w - 1, y)

    while queue:
        x, y = queue.popleft()
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if 0 <= nx < w and 0 <= ny < h:
                idx = ny * w + nx
                if not visited[idx] and is_background(pixels[nx, ny]):
                    visited[idx] = 1
                    queue.append((nx, ny))

    min_x, min_y = w, h
    max_x, max_y = -1, -1
    for y in range(h):
        for x in range(w):
            if not visited[y * w + x]:
                min_x = min(min_x, x)
                min_y = min(min_y, y)
                max_x = max(max_x, x)
                max_y = max(max_y, y)

    if max_x < min_x or max_y < min_y:
        return (0, 0, image.width, image.height)

    scale_x = image.width / w
    scale_y = image.height / h
    left = max(0, int((min_x - 2) * scale_x))
    top = max(0, int((min_y - 2) * scale_y))
    right = min(image.width, int((max_x + 3) * scale_x))
    bottom = min(image.height, int((max_y + 3) * scale_y))
    return (left, top, right, bottom)


def blend_inner_strip(image: Image.Image, side: str, *, style: str, width: int) -> Image.Image:
    result = image.copy()
    if style == "page":
        donor_gap = 170
        donor_width = 6
        seam = 28
    else:
        donor_gap = 132
        donor_width = 88
        seam = 44

    if side == "left":
        donor = result.crop((donor_gap, 0, donor_gap + donor_width, result.height))
        donor = donor.resize((width, result.height), Image.Resampling.BICUBIC)
        mask = Image.new("L", (width, result.height), 0)
        mask_pixels = mask.load()
        for x in range(width):
            opacity = 255 if x < width - seam else int(255 * (1 - (x - (width - seam)) / max(1, seam - 1)))
            for y in range(result.height):
                mask_pixels[x, y] = opacity
        result.paste(donor, (0, 0), mask)
        if style == "page":
            overlay = ImageDraw.Draw(result)
            overlay.line((50, 56, 50, result.height - 56), fill=rgba("e2cf92", 110), width=5)
            overlay.line((90, 64, 90, result.height - 64), fill=rgba("d7c27c", 70), width=2)
    else:
        donor = result.crop((result.width - donor_gap - donor_width, 0, result.width - donor_gap, result.height))
        donor = donor.resize((width, result.height), Image.Resampling.BICUBIC)
        mask = Image.new("L", (width, result.height), 0)
        mask_pixels = mask.load()
        for x in range(width):
            opacity = 255 if x >= seam else int(255 * (x / max(1, seam - 1)))
            for y in range(result.height):
                mask_pixels[x, y] = opacity
        result.paste(donor, (result.width - width, 0), mask)
        if style == "page":
            overlay = ImageDraw.Draw(result)
            overlay.line((result.width - 50, 56, result.width - 50, result.height - 56), fill=rgba("e2cf92", 110), width=5)
            overlay.line((result.width - 90, 64, result.width - 90, result.height - 64), fill=rgba("d7c27c", 70), width=2)
    return result


def prepare_source_texture(source_path: Path, *, inner_side: str, crop_outer_bg: bool) -> Image.Image:
    image = Image.open(source_path).convert("RGBA")
    if crop_outer_bg:
        image = image.crop(detect_art_bbox(image))
    else:
        trim = 96
        if inner_side == "left":
            image = image.crop((trim, 0, image.width, image.height))
        else:
            image = image.crop((0, 0, image.width - trim, image.height))
    image = ImageOps.fit(image, (PAGE_W, PAGE_H), method=Image.Resampling.LANCZOS, centering=(0.5, 0.5))
    style = "page" if crop_outer_bg else "cover"
    if style == "cover":
        return image
    return blend_inner_strip(image, inner_side, style=style, width=132)


def add_cover_title(image: Image.Image, lines: tuple[str, str], fill: str, stroke: str) -> Image.Image:
    result = image.copy()
    draw = ImageDraw.Draw(result)
    box = (220, 108, PAGE_W - 220, 432)
    line1_font = fit_font(lines[0], box[2] - box[0] - 20, 94)
    line2_font = fit_font(lines[1], box[2] - box[0] - 20, 76)

    def center_text(text: str, font: ImageFont.ImageFont, y: int) -> None:
        bbox = draw.textbbox((0, 0), text, font=font, stroke_width=6)
        text_w = bbox[2] - bbox[0]
        x = (PAGE_W - text_w) / 2
        draw.text(
            (x, y),
            text,
            font=font,
            fill=rgba(fill),
            stroke_width=6,
            stroke_fill=rgba(stroke),
        )

    center_text(lines[0], line1_font, box[1] + 28)
    center_text(lines[1], line2_font, box[1] + 164)
    return result


def draw_flower(draw: ImageDraw.ImageDraw, cx: int, cy: int, scale: int, color: tuple[int, int, int, int]) -> None:
    for angle in range(0, 360, 72):
        rad = math.radians(angle)
        px = cx + math.cos(rad) * scale * 0.85
        py = cy + math.sin(rad) * scale * 0.85
        draw.ellipse((px - scale, py - scale, px + scale, py + scale), fill=color)
    draw.ellipse((cx - scale * 0.45, cy - scale * 0.45, cx + scale * 0.45, cy + scale * 0.45), fill=rgba("fff4aa", 210))


def make_page_back() -> Image.Image:
    base = make_paper_base("fff7de", "f3dfb1")
    draw = ImageDraw.Draw(base)
    draw.rounded_rectangle((42, 42, PAGE_W - 42, PAGE_H - 42), radius=62, outline=rgba("d6b76b", 72), width=4)
    draw.rounded_rectangle((110, 132, PAGE_W - 110, PAGE_H - 124), radius=58, fill=rgba("fff8dd", 118), outline=rgba("d6b76b", 46), width=2)
    for y in range(230, PAGE_H - 180, 58):
        draw.line((160, y, PAGE_W - 160, y), fill=rgba("d4b56f", 55), width=2)
    return base


def draw_centered_text(
    draw: ImageDraw.ImageDraw,
    text: str,
    y: int,
    font: ImageFont.ImageFont,
    fill: tuple[int, int, int, int],
    *,
    x1: int = 0,
    x2: int = PAGE_W,
    stroke_width: int = 0,
    stroke_fill: tuple[int, int, int, int] | None = None,
) -> None:
    bbox = draw.textbbox((0, 0), text, font=font, stroke_width=stroke_width)
    text_w = bbox[2] - bbox[0]
    draw.text(
        ((x1 + x2 - text_w) / 2 - bbox[0], y - bbox[1]),
        text,
        font=font,
        fill=fill,
        stroke_width=stroke_width,
        stroke_fill=stroke_fill or fill,
    )


def draw_page_shell(page: Image.Image, variant_name: str, page_side: str) -> tuple[int, int, int, int]:
    palette = VARIANTS[variant_name]["page_palette"]
    binding_side = "right" if page_side == "left" else "left"
    draw = ImageDraw.Draw(page)
    draw.rounded_rectangle((34, 34, PAGE_W - 34, PAGE_H - 34), radius=78, outline=rgba(palette["frame"], 108), width=8)
    draw.rounded_rectangle((68, 70, PAGE_W - 68, PAGE_H - 70), radius=58, outline=rgba("ffffff", 76), width=3)

    if binding_side == "left":
        strip = (48, 72, 174, PAGE_H - 72)
        content = (206, 86, PAGE_W - 88, PAGE_H - 92)
        guide_x = strip[2] + 28
    else:
        strip = (PAGE_W - 174, 72, PAGE_W - 48, PAGE_H - 72)
        content = (88, 86, PAGE_W - 206, PAGE_H - 92)
        guide_x = strip[0] - 28

    strip_layer = Image.new("RGBA", page.size, (0, 0, 0, 0))
    strip_draw = ImageDraw.Draw(strip_layer)
    strip_draw.rounded_rectangle(strip, radius=46, fill=rgba("fff8de", 94), outline=rgba(palette["frame"], 82), width=4)
    for offset in (28, 58, 88):
        if binding_side == "left":
            x = strip[0] + offset
        else:
            x = strip[2] - offset
        strip_draw.line((x, strip[1] + 24, x, strip[3] - 24), fill=rgba(palette["frame"], 36), width=3)
    page.alpha_composite(strip_layer.filter(ImageFilter.GaussianBlur(0.18)))

    # The 3D page geometry cuts the actual binder holes. The texture only marks the safe content edge.
    draw.line((guide_x, 132, guide_x, PAGE_H - 132), fill=rgba(palette["frame"], 54), width=3)
    draw.line((guide_x + (-12 if binding_side == "right" else 12), 172, guide_x + (-12 if binding_side == "right" else 12), PAGE_H - 172), fill=rgba("ffffff", 54), width=2)

    return content


def draw_asset_sticker(page: Image.Image, path: Path, box: tuple[int, int, int, int]) -> None:
    x1, y1, x2, y2 = box
    max_w = max(1, x2 - x1)
    max_h = max(1, y2 - y1)
    if not path.exists():
        fallback = ImageDraw.Draw(page)
        fallback.ellipse((x1 + 34, y1 + 26, x2 - 34, y2 - 26), fill=rgba("a6dce0", 190), outline=rgba("ffffff", 235), width=14)
        fallback.ellipse((x1 + 96, y1 + 82, x1 + 136, y1 + 122), fill=rgba("ffffff", 215))
        return

    asset = Image.open(path).convert("RGBA")
    alpha_bbox = asset.getchannel("A").getbbox()
    if alpha_bbox:
        asset = asset.crop(alpha_bbox)
    asset.thumbnail((max_w - 44, max_h - 42), Image.Resampling.LANCZOS)

    pad = 28
    tile = Image.new("RGBA", (asset.width + pad * 2, asset.height + pad * 2), (0, 0, 0, 0))
    tile.alpha_composite(asset, (pad, pad))
    alpha = tile.getchannel("A")
    outline_alpha = alpha.filter(ImageFilter.MaxFilter(25)).filter(ImageFilter.GaussianBlur(1.4))
    shadow_alpha = alpha.filter(ImageFilter.GaussianBlur(9))

    outline = Image.new("RGBA", tile.size, rgba("fffdf2", 255))
    outline.putalpha(outline_alpha)
    shadow = Image.new("RGBA", tile.size, rgba("17343a", 82))
    shadow.putalpha(shadow_alpha)

    paste_x = x1 + (max_w - tile.width) // 2
    paste_y = y1 + (max_h - tile.height) // 2
    page.alpha_composite(shadow, (paste_x + 10, paste_y + 15))
    page.alpha_composite(outline, (paste_x, paste_y))
    page.alpha_composite(tile, (paste_x, paste_y))


def draw_badge(draw: ImageDraw.ImageDraw, rect: tuple[int, int, int, int], text: str, palette: dict[str, str], index: int) -> None:
    x1, y1, x2, y2 = rect
    fill = palette["accent"] if index % 2 == 0 else palette["accent2"]
    draw.rounded_rectangle((x1, y1, x2, y2), radius=20, fill=rgba(fill, 226))
    font = fit_font(text, x2 - x1 - 16, 34)
    draw_centered_text(draw, text, y1 + 9, font, rgba("fffdf6"), x1=x1, x2=x2)


def draw_album_card(
    page: Image.Image,
    rect: tuple[int, int, int, int],
    item: tuple[str, str, Path],
    palette: dict[str, str],
    index: int,
) -> None:
    x1, y1, x2, y2 = rect
    w = x2 - x1
    draw = ImageDraw.Draw(page)
    shadow = Image.new("RGBA", page.size, (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    shadow_draw.rounded_rectangle((x1 + 10, y1 + 14, x2 + 10, y2 + 14), radius=34, fill=rgba("1b2f2e", 40))
    page.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(7)))

    fill = palette["card"] if index % 2 == 0 else palette["card_alt"]
    draw.rounded_rectangle((x1, y1, x2, y2), radius=34, fill=rgba(fill, 245), outline=rgba(palette["frame"], 118), width=4)
    draw.rounded_rectangle((x1 + 14, y1 + 14, x2 - 14, y2 - 14), radius=26, outline=rgba("ffffff", 112), width=2)

    label, note, asset_path = item
    number = f"{index + 1:02d}"
    draw_badge(draw, (x1 + 20, y1 + 18, x1 + 108, y1 + 66), number, palette, index)
    label_font = fit_font(label, w - 154, 42)
    draw.text((x1 + 128, y1 + 19), label, font=label_font, fill=rgba(palette["ink"]))

    note_font = fit_font(note, w - 74, 29)
    draw.text((x1 + 36, y2 - 58), note, font=note_font, fill=rgba(palette["ink"], 210))
    draw.line((x1 + 34, y2 - 74, x2 - 34, y2 - 74), fill=rgba(palette["frame"], 48), width=2)

    asset_box = (x1 + 28, y1 + 78, x2 - 28, y2 - 84)
    draw_asset_sticker(page, asset_path, asset_box)


def draw_album_footer(draw: ImageDraw.ImageDraw, content: tuple[int, int, int, int], palette: dict[str, str], page_side: str) -> None:
    x1, _y1, x2, y2 = content
    footer_y = y2 - 42
    draw.line((x1 + 6, footer_y, x2 - 6, footer_y), fill=rgba(palette["frame"], 48), width=2)
    font = load_font(26)
    label = "ひだりページ" if page_side == "left" else "みぎページ"
    draw.text((x1 + 14, footer_y + 12), label, font=font, fill=rgba(palette["ink"], 164))
    for i in range(6):
        cx = x2 - 190 + i * 30
        cy = footer_y + 27
        color = palette["accent"] if i < 4 else palette["frame"]
        draw.ellipse((cx - 8, cy - 8, cx + 8, cy + 8), fill=rgba(color, 160))


def draw_album_list(page: Image.Image, content: tuple[int, int, int, int], palette: dict[str, str]) -> None:
    draw = ImageDraw.Draw(page)
    x1, y1, x2, _y2 = content
    all_items = PAGE_ITEMS["left"] + PAGE_ITEMS["right"]
    grid_top = y1 + 266
    gap_x = 34
    gap_y = 18
    col_w = (x2 - x1 - gap_x) // 2
    row_h = 128
    name_font = load_font(34)
    note_font = load_font(24)

    for index, item in enumerate(all_items):
        col = index % 2
        row = index // 2
        rx1 = x1 + col * (col_w + gap_x)
        ry1 = grid_top + row * (row_h + gap_y)
        rx2 = rx1 + col_w
        ry2 = ry1 + row_h
        fill = palette["card"] if index % 2 == 0 else palette["card_alt"]
        draw.rounded_rectangle((rx1, ry1, rx2, ry2), radius=28, fill=rgba(fill, 236), outline=rgba(palette["frame"], 104), width=3)

        number = f"{index + 1:02d}"
        badge_fill = palette["accent"] if index < 6 else palette["accent2"]
        draw.rounded_rectangle((rx1 + 14, ry1 + 18, rx1 + 82, ry1 + 60), radius=17, fill=rgba(badge_fill, 228))
        draw_centered_text(draw, number, ry1 + 24, load_font(25), rgba("fffdf6"), x1=rx1 + 14, x2=rx1 + 82)
        draw_asset_sticker(page, item[2], (rx1 + 92, ry1 + 12, rx1 + 198, ry2 - 12))

        label_font = fit_font(item[0], col_w - 222, 34)
        draw.text((rx1 + 214, ry1 + 22), item[0], font=label_font, fill=rgba(palette["ink"]))
        note_fit = fit_font(item[1], col_w - 222, 24)
        draw.text((rx1 + 214, ry1 + 72), item[1], font=note_fit or note_font, fill=rgba(palette["ink"], 196))


def draw_free_sticker_page(page: Image.Image, content: tuple[int, int, int, int], palette: dict[str, str]) -> None:
    draw = ImageDraw.Draw(page)
    x1, y1, x2, y2 = content
    field = (x1 + 20, y1 + 268, x2 - 20, y2 - 86)
    fx1, fy1, fx2, fy2 = field
    draw.rounded_rectangle(field, radius=46, fill=rgba("fffdf4", 214), outline=rgba(palette["frame"], 120), width=5)
    draw.rounded_rectangle((fx1 + 18, fy1 + 18, fx2 - 18, fy2 - 18), radius=34, outline=rgba("ffffff", 120), width=3)

    for x in range(fx1 + 86, fx2 - 60, 128):
        draw.line((x, fy1 + 46, x, fy2 - 46), fill=rgba(palette["frame"], 22), width=2)
    for y in range(fy1 + 90, fy2 - 48, 116):
        draw.line((fx1 + 50, y, fx2 - 50, y), fill=rgba(palette["frame"], 20), width=2)

    tape_fill = palette["accent2"]
    for rect, angle_text in [
        ((fx1 + 52, fy1 + 34, fx1 + 232, fy1 + 84), "すきなところに"),
        ((fx2 - 270, fy2 - 88, fx2 - 58, fy2 - 38), "はってね"),
    ]:
        draw.rounded_rectangle(rect, radius=18, fill=rgba(tape_fill, 190), outline=rgba("fffdf6", 130), width=2)
        font = fit_font(angle_text, rect[2] - rect[0] - 20, 27)
        draw_centered_text(draw, angle_text, rect[1] + 10, font, rgba("fffdf6"), x1=rect[0], x2=rect[2])

    sticker_specs = [
        (PAGE_ITEMS["left"][0][2], (fx1 + 92, fy1 + 118, fx1 + 352, fy1 + 334)),
        (PAGE_ITEMS["left"][2][2], (fx1 + 412, fy1 + 86, fx1 + 650, fy1 + 300)),
        (PAGE_ITEMS["right"][0][2], (fx2 - 470, fy1 + 116, fx2 - 154, fy1 + 330)),
        (PAGE_ITEMS["left"][4][2], (fx1 + 130, fy1 + 422, fx1 + 402, fy1 + 672)),
        (PAGE_ITEMS["right"][1][2], (fx1 + 492, fy1 + 388, fx1 + 810, fy1 + 646)),
        (PAGE_ITEMS["right"][2][2], (fx2 - 342, fy1 + 466, fx2 - 112, fy1 + 676)),
        (PAGE_ITEMS["left"][1][2], (fx1 + 370, fy2 - 288, fx1 + 622, fy2 - 86)),
        (PAGE_ITEMS["left"][5][2], (fx2 - 322, fy2 - 314, fx2 - 112, fy2 - 100)),
    ]
    for path, box in sticker_specs:
        draw_asset_sticker(page, path, box)


def make_production_album_page(variant_name: str, page_side: str) -> Image.Image:
    cfg = VARIANTS[variant_name]
    palette = cfg["page_palette"]
    page = make_paper_base(palette["top"], palette["bottom"])
    content = draw_page_shell(page, variant_name, page_side)
    draw = ImageDraw.Draw(page)
    x1, y1, x2, y2 = content

    title, subtitle = cfg["left_title"] if page_side == "left" else cfg["right_title"]
    title_font = fit_font(title, x2 - x1 - 80, 70)
    subtitle_font = fit_font(subtitle, x2 - x1 - 80, 34)
    draw.rounded_rectangle((x1 + 8, y1 + 10, x2 - 8, y1 + 170), radius=38, fill=rgba("fffdf3", 158), outline=rgba(palette["frame"], 72), width=3)
    draw_centered_text(draw, title, y1 + 34, title_font, rgba(palette["ink"]), x1=x1, x2=x2, stroke_width=2, stroke_fill=rgba("fff8e8", 190))
    draw_centered_text(draw, subtitle, y1 + 116, subtitle_font, rgba(palette["accent"], 230), x1=x1, x2=x2)

    chip_font = load_font(25)
    chips = ("しゃしん", "メモ", "シール")
    chip_x = x1 + 52
    for i, chip in enumerate(chips):
        chip_w = 122
        chip_y = y1 + 188
        chip_fill = palette["accent"] if i == 0 else ("ffffff" if i == 1 else palette["accent2"])
        text_fill = "fffdf8" if i != 1 else palette["ink"]
        draw.rounded_rectangle((chip_x, chip_y, chip_x + chip_w, chip_y + 45), radius=18, fill=rgba(chip_fill, 212), outline=rgba(palette["frame"], 74), width=2)
        draw_centered_text(draw, chip, chip_y + 8, chip_font, rgba(text_fill), x1=chip_x, x2=chip_x + chip_w)
        chip_x += chip_w + 18

    if page_side == "left":
        draw_album_list(page, content, palette)
    else:
        draw_free_sticker_page(page, content, palette)

    draw_album_footer(draw, content, palette, page_side)
    return page


def make_cover_inside_page(variant_name: str) -> Image.Image:
    base_hex, border_hex, accent_hex = VARIANTS[variant_name]["inside_cover_palette"]
    page = make_paper_base(base_hex, "f1e3bd")
    draw = ImageDraw.Draw(page)
    draw.rounded_rectangle((34, 34, PAGE_W - 34, PAGE_H - 34), radius=72, fill=rgba(base_hex, 190), outline=rgba(border_hex, 110), width=6)
    draw.rounded_rectangle((82, 92, PAGE_W - 82, PAGE_H - 92), radius=56, outline=rgba(border_hex, 62), width=3)

    for i, y in enumerate(range(180, PAGE_H - 120, 220)):
        x = 180 + (i % 2) * 120
        if variant_name == "boy":
            draw.ellipse((x - 22, y - 22, x + 22, y + 22), outline=rgba(accent_hex, 86), width=4)
            draw.line((x, y - 24, x, y + 24), fill=rgba(accent_hex, 68), width=3)
            draw.line((x - 24, y, x + 24, y), fill=rgba(accent_hex, 68), width=3)
        else:
            draw.ellipse((x - 26, y - 18, x + 26, y + 18), fill=rgba(accent_hex, 48), outline=rgba(border_hex, 84), width=3)
            draw.ellipse((x - 10, y - 10, x + 10, y + 10), fill=rgba("fffdf8", 164))
        draw.ellipse((PAGE_W - x - 22, y - 22, PAGE_W - x + 22, y + 22), fill=rgba(accent_hex, 34))

    for x, y, s in [(220, 120, 18), (PAGE_W - 220, 144, 16), (280, PAGE_H - 128, 18), (PAGE_W - 280, PAGE_H - 148, 16)]:
        draw_flower(draw, x, y, s, rgba("fff6df", 104 if variant_name == "girl" else 72))

    return page


def make_front_cover(variant_name: str) -> Image.Image:
    cfg = VARIANTS[variant_name]
    return make_source_based_cover(
        cfg["cover_front_source"],
        variant_name,
        title_lines=cfg["title_lines"],
        title_fill=cfg["title_fill"],
        title_stroke=cfg["title_stroke"],
    )


def make_back_cover(variant_name: str) -> Image.Image:
    cfg = VARIANTS[variant_name]
    return make_source_based_cover(
        cfg["cover_back_source"],
        variant_name,
        title_lines=("うみの", "きろく"),
        title_fill=cfg["title_fill"],
        title_stroke=cfg["title_stroke"],
    )


def make_source_based_cover(
    source_path: Path,
    variant_name: str,
    *,
    title_lines: tuple[str, str],
    title_fill: str,
    title_stroke: str,
) -> Image.Image:
    palette = VARIANTS[variant_name]["page_palette"]
    if not source_path.exists():
        return make_paper_base(palette["top"], palette["bottom"])

    source = Image.open(source_path).convert("RGBA")
    # The original GPT cover sources are narrower than the actual Three.js page.
    # Resize them into the target page ratio as one integrated cover instead of
    # placing a smaller poster on top of a blurred background.
    page = source.resize((PAGE_W, PAGE_H), Image.Resampling.LANCZOS)

    shade = Image.new("RGBA", page.size, (0, 0, 0, 0))
    shade_draw = ImageDraw.Draw(shade)
    shade_draw.rectangle((0, 0, 92, PAGE_H), fill=rgba("03191f", 28))
    shade_draw.rectangle((PAGE_W - 58, 0, PAGE_W, PAGE_H), fill=rgba("03191f", 18))
    page = Image.alpha_composite(page, shade.filter(ImageFilter.GaussianBlur(18)))

    draw = ImageDraw.Draw(page)
    draw.rounded_rectangle((16, 16, PAGE_W - 16, PAGE_H - 16), radius=PAGE_RADIUS_PX, outline=rgba("fff4cb", 142), width=5)
    draw.rounded_rectangle((48, 48, PAGE_W - 48, PAGE_H - 48), radius=70, outline=rgba("b98531", 116), width=5)

    label_box = (PAGE_W // 2 - 330, 178, PAGE_W // 2 + 330, 438)
    label_layer = Image.new("RGBA", page.size, (0, 0, 0, 0))
    label_draw = ImageDraw.Draw(label_layer)
    label_draw.rounded_rectangle(label_box, radius=42, fill=rgba("fff1c4", 86), outline=rgba("b68628", 112), width=4)
    page.alpha_composite(label_layer.filter(ImageFilter.GaussianBlur(0.4)))
    draw = ImageDraw.Draw(page)
    line1_font = fit_font(title_lines[0], label_box[2] - label_box[0] - 34, 76)
    line2_font = fit_font(title_lines[1], label_box[2] - label_box[0] - 34, 64)
    draw_centered_text(draw, title_lines[0], label_box[1] + 36, line1_font, rgba(title_fill), x1=label_box[0], x2=label_box[2], stroke_width=4, stroke_fill=rgba(title_stroke, 220))
    draw_centered_text(draw, title_lines[1], label_box[1] + 142, line2_font, rgba(title_fill), x1=label_box[0], x2=label_box[2], stroke_width=4, stroke_fill=rgba(title_stroke, 220))

    mask = Image.new("L", page.size, 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.rounded_rectangle((0, 0, PAGE_W, PAGE_H), radius=PAGE_RADIUS_PX, fill=255)
    page.putalpha(mask)
    return page


def make_spine(variant_name: str) -> Image.Image:
    left_hex, mid_hex, right_hex = VARIANTS[variant_name]["spine_gradient"]
    outline_hex = VARIANTS[variant_name]["spine_outline"]
    spine = Image.new("RGBA", (SPINE_W, PAGE_H), (0, 0, 0, 0))
    base = Image.new("RGBA", spine.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(base)
    for x in range(SPINE_W):
        t = x / max(1, SPINE_W - 1)
        if t < 0.5:
            color = blend_rgb(left_hex, mid_hex, t * 2)
        else:
            color = blend_rgb(mid_hex, right_hex, (t - 0.5) * 2)
        draw.line((x, 24, x, PAGE_H - 24), fill=(color[0], color[1], color[2], 238))

    shadow = Image.new("RGBA", spine.size, (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    shadow_draw.rounded_rectangle((22, 20, SPINE_W - 22, PAGE_H - 20), radius=54, fill=rgba("17302d", 52))
    spine = Image.alpha_composite(spine, shadow.filter(ImageFilter.GaussianBlur(8)))
    spine = Image.alpha_composite(spine, base)
    draw = ImageDraw.Draw(spine)

    draw.rounded_rectangle((24, 18, SPINE_W - 24, PAGE_H - 18), radius=48, outline=rgba(outline_hex, 120), width=4)
    draw.rounded_rectangle((43, 46, SPINE_W - 43, PAGE_H - 46), radius=34, outline=rgba("45625f", 54), width=2)
    for x in range(58, SPINE_W - 54, 18):
        draw.line((x, 70, x, PAGE_H - 70), fill=rgba("385c58", 56), width=3)
        draw.line((x + 4, 72, x + 4, PAGE_H - 72), fill=rgba("f8fbf7", 34), width=2)

    for y in RING_PIXELS:
        socket_shadow = Image.new("RGBA", spine.size, (0, 0, 0, 0))
        socket_draw = ImageDraw.Draw(socket_shadow)
        socket_draw.rounded_rectangle((24, y - 24, 74, y + 24), radius=18, fill=rgba("17302d", 78))
        socket_draw.rounded_rectangle((SPINE_W - 74, y - 24, SPINE_W - 24, y + 24), radius=18, fill=rgba("17302d", 78))
        spine = Image.alpha_composite(spine, socket_shadow.filter(ImageFilter.GaussianBlur(3)))
        draw = ImageDraw.Draw(spine)
        draw.arc((28, y - 27, 82, y + 27), start=78, end=282, fill=rgba("dff4e9", 82), width=5)
        draw.arc((SPINE_W - 82, y - 27, SPINE_W - 28, y + 27), start=-102, end=102, fill=rgba("dff4e9", 82), width=5)
        draw.line((78, y, SPINE_W - 78, y), fill=rgba("17302d", 30), width=2)

    mask = Image.new("L", spine.size, 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.rounded_rectangle((24, 18, spine.width - 24, spine.height - 18), radius=48, fill=250)
    spine.putalpha(mask)
    return spine


def make_side_tabs(variant_name: str, side: str) -> Image.Image:
    w, h = 320, PAGE_H
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    palette_key = "tab_left_colors" if side == "left" else "tab_right_colors"
    colors = [rgba(hex_value) for hex_value in VARIANTS[variant_name][palette_key]]
    accent = rgba(VARIANTS[variant_name]["tab_accent"])
    ys = [120, 355, 590, 825, 1060]

    for i, y in enumerate(ys):
        tab_shadow = Image.new("RGBA", img.size, (0, 0, 0, 0))
        shadow_draw = ImageDraw.Draw(tab_shadow)
        body = (18, y, 302, y + 172)
        shadow_draw.rounded_rectangle(
            (body[0] + 8, body[1] + 14, body[2] + 10, body[3] + 15),
            radius=42,
            fill=rgba("24160c", 42),
        )
        img = Image.alpha_composite(img, tab_shadow.filter(ImageFilter.GaussianBlur(3)))
        draw = ImageDraw.Draw(img)

        draw.rounded_rectangle(body, radius=40, fill=colors[i], outline=rgba("fff6d8", 128), width=5)
        draw.rounded_rectangle((body[0] + 18, y + 15, body[2] - 28, y + 66), radius=25, fill=rgba("fff5ca", 40))
        draw.line((body[0] + 32, y + 31, body[2] - 48, y + 31), fill=rgba("ffffff", 34), width=3)
        if variant_name == "boy":
            marker_x = body[2] - 76 if side == "left" else body[0] + 76
            draw.ellipse((marker_x - 23, y + 58, marker_x + 23, y + 104), fill=accent)
            if i in (0, 2, 4):
                dot_x = body[0] + 76 if side == "left" else body[2] - 76
                draw.ellipse((dot_x - 11, y + 112, dot_x + 11, y + 134), fill=rgba("fff9e7", 96))
        else:
            pearl_x = body[2] - 76 if side == "left" else body[0] + 76
            draw.ellipse((pearl_x - 23, y + 58, pearl_x + 23, y + 104), fill=accent)
            flower_x = body[0] + 74 if side == "left" else body[2] - 74
            if i in (1, 3):
                draw_flower(draw, flower_x, y + 88, 12, rgba("fff6df", 132))
            else:
                draw.ellipse((flower_x - 10, y + 112, flower_x + 10, y + 132), fill=rgba("fff6df", 92))
    return img.filter(ImageFilter.GaussianBlur(0.18))


def make_layer_guide() -> Image.Image:
    tab_w = 320
    gutter_w = 192
    guide_w = tab_w + PAGE_W * 2 + gutter_w + tab_w
    img = Image.new("RGBA", (guide_w, PAGE_H), rgba("112126", 255))
    draw = ImageDraw.Draw(img)
    x_left_tab = 0
    x_left_page = tab_w
    x_gutter = x_left_page + PAGE_W
    x_right_page = x_gutter + gutter_w
    x_right_tab = x_right_page + PAGE_W

    draw.rectangle((x_left_page, 0, x_left_page + PAGE_W, PAGE_H), fill=rgba("c9df5b", 255))
    draw.rectangle((x_gutter, 0, x_gutter + gutter_w, PAGE_H), fill=rgba("8fb7ad", 255))
    draw.rectangle((x_right_page, 0, x_right_page + PAGE_W, PAGE_H), fill=rgba("f2b735", 255))
    draw.rectangle((x_left_tab, 0, x_left_tab + tab_w, PAGE_H), fill=rgba("47bcc6", 255))
    draw.rectangle((x_right_tab, 0, x_right_tab + tab_w, PAGE_H), fill=rgba("62c2b9", 255))

    for x, label in [
        (x_left_tab + 34, "left tabs transparent layer"),
        (x_left_page + 48, "left page front"),
        (x_gutter + 18, "spine / ring base"),
        (x_right_page + 48, "right page front"),
        (x_right_tab + 34, "right tabs transparent layer"),
    ]:
        draw.text((x, 30), label, fill=rgba("ffffff", 215))

    for x in [x_left_page, x_gutter, x_gutter + gutter_w, x_right_page + PAGE_W]:
        draw.line((x, 0, x, PAGE_H), fill=rgba("ffffff", 180), width=3)
    for y in RING_PIXELS:
        draw.line((x_gutter - 80, y, x_gutter + gutter_w + 80, y), fill=rgba("fff2a8", 180), width=3)
    return img


def make_page_thickness_strip(variant_name: str, side: str, level: str) -> Image.Image:
    image2_strip = make_image2_page_thickness_strip(side, level)
    if image2_strip is not None:
        return image2_strip

    palette = VARIANTS[variant_name]["page_palette"]
    visible_h = THICKNESS_LEVELS[level]
    img = Image.new("RGBA", (THICKNESS_W, THICKNESS_H), (0, 0, 0, 0))

    x_pad = 64
    y_top = 18
    x1 = x_pad + (10 if side == "left" else 0)
    x2 = THICKNESS_W - x_pad - (0 if side == "left" else 10)
    y2 = y_top + visible_h

    shadow = Image.new("RGBA", img.size, (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    shadow_draw.rounded_rectangle((x1 + 10, y_top + 10, x2 + 10, y2 + 18), radius=34, fill=rgba("1b211b", 46))
    img = Image.alpha_composite(img, shadow.filter(ImageFilter.GaussianBlur(8)))

    body = Image.new("RGBA", img.size, (0, 0, 0, 0))
    body_draw = ImageDraw.Draw(body)
    base_top = blend_rgb(palette["top"], "f8eac1", 0.48)
    base_bottom = blend_rgb(palette["bottom"], "d5bd7c", 0.42)
    for y in range(y_top, y2 + 1):
        t = (y - y_top) / max(1, visible_h)
        color = tuple(int(base_top[i] * (1 - t) + base_bottom[i] * t) for i in range(3))
        inset = int(math.sin(t * math.pi) * 14)
        body_draw.line((x1 + inset, y, x2 - inset, y), fill=(color[0], color[1], color[2], 222))

    mask = Image.new("L", img.size, 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.rounded_rectangle((x1, y_top, x2, y2), radius=42, fill=255)
    top_fade = Image.new("L", img.size, 0)
    fade_px = top_fade.load()
    for y in range(THICKNESS_H):
        if y < y_top:
            alpha = 0
        elif y < y_top + 18:
            alpha = int(255 * ((y - y_top) / 18))
        elif y <= y2:
            alpha = 255
        elif y <= y2 + 20:
            alpha = int(255 * (1 - (y - y2) / 20))
        else:
            alpha = 0
        for x in range(THICKNESS_W):
            fade_px[x, y] = alpha
    mask = ImageChops.multiply(mask, top_fade)
    body.putalpha(mask)
    img = Image.alpha_composite(img, body)

    draw = ImageDraw.Draw(img)
    line_count = max(3, int(visible_h / 14))
    for i in range(line_count):
        t = (i + 1) / (line_count + 1)
        y = y_top + int(visible_h * t)
        inset = int(math.sin(t * math.pi) * 15)
        alpha = 38 if i % 2 else 58
        draw.line((x1 + inset + 18, y, x2 - inset - 18, y), fill=rgba("9d874d", alpha), width=2)
        if i % 2 == 0:
            draw.line((x1 + inset + 24, y + 3, x2 - inset - 28, y + 3), fill=rgba("fff9dc", 28), width=1)

    edge_alpha = 76 if level == "thick" else 52
    draw.arc((x1, y_top - 4, x1 + 76, y2 + 10), start=95, end=266, fill=rgba(palette["frame"], edge_alpha), width=3)
    draw.arc((x2 - 76, y_top - 4, x2, y2 + 10), start=-86, end=86, fill=rgba(palette["frame"], edge_alpha), width=3)
    return img


def make_image2_page_thickness_strip(side: str, level: str) -> Image.Image | None:
    atlas_strip = make_image2_strip_atlas_page_thickness_strip(side, level)
    if atlas_strip is not None:
        return atlas_strip

    if level not in {"thin", "medium", "thick"}:
        return None

    if side == "left":
        state = {"thin": "start", "medium": "mid", "thick": "end"}[level]
    else:
        state = {"thin": "end", "medium": "mid", "thick": "start"}[level]

    source_path = IMAGE2_THICKNESS_SOURCES[state]
    if not source_path.exists():
        return None

    source = Image.open(source_path).convert("RGBA")
    w, h = source.size
    if side == "left":
        crop_box = (
            int(w * 0.065),
            int(h * 0.84),
            int(w * 0.455),
            int(h * 0.995),
        )
    else:
        crop_box = (
            int(w * 0.545),
            int(h * 0.84),
            int(w * 0.93),
            int(h * 0.995),
        )
    crop = source.crop(crop_box)
    crop = crop.resize((THICKNESS_W, THICKNESS_H), Image.Resampling.LANCZOS)

    # Keep only the lower underlay. The upper part overlaps the real page mesh
    # and is intentionally soft so it can hide under the page without a hard seam.
    alpha = crop.getchannel("A")
    fade = Image.new("L", crop.size, 0)
    fade_pixels = fade.load()
    for y in range(THICKNESS_H):
        if y < 22:
            a = int(255 * (y / 22))
        elif y > THICKNESS_H - 18:
            a = int(255 * (1 - (y - (THICKNESS_H - 18)) / 18))
        else:
            a = 255
        for x in range(THICKNESS_W):
            fade_pixels[x, y] = a
    crop.putalpha(ImageChops.multiply(alpha, fade))
    return crop


def make_image2_strip_atlas_page_thickness_strip(side: str, level: str) -> Image.Image | None:
    if not IMAGE2_BALANCED_THICKNESS_STRIP_ATLAS.exists():
        return None

    source = Image.open(IMAGE2_BALANCED_THICKNESS_STRIP_ATLAS).convert("RGBA")
    w, h = source.size
    panel_w = w // 2
    panel_h = h // 5
    row_for = {
        "empty": 0,
        "small": 1,
        "half": 2,
        "mostly": 3,
        "full": 4,
    }
    if level not in row_for:
        return None

    def crop_cell(row_name: str) -> Image.Image:
        row = row_for[row_name]
        col = 0 if side == "left" else 1
        cell = source.crop((col * panel_w, row * panel_h, (col + 1) * panel_w, (row + 1) * panel_h))
        bbox = cell.getchannel("A").getbbox()
        if bbox is None:
            return Image.new("RGBA", (THICKNESS_W, 1), (0, 0, 0, 0))
        x0, y0, x1, y1 = bbox
        pad = 8
        bbox = (
            max(0, x0 - pad),
            max(0, y0 - pad),
            min(cell.width, x1 + pad),
            min(cell.height, y1 + pad),
        )
        return cell.crop(bbox)

    def crop_first_alpha_span(row_name: str) -> Image.Image:
        row = row_for[row_name]
        col = 0 if side == "left" else 1
        cell = source.crop((col * panel_w, row * panel_h, (col + 1) * panel_w, (row + 1) * panel_h))
        alpha = cell.getchannel("A")
        spans: list[tuple[int, int]] = []
        in_span = False
        start_y = 0
        for y in range(cell.height):
            has_alpha = any(alpha.getpixel((x, y)) > 10 for x in range(cell.width))
            if has_alpha and not in_span:
                start_y = y
                in_span = True
            elif not has_alpha and in_span:
                spans.append((start_y, y))
                in_span = False
        if in_span:
            spans.append((start_y, cell.height))

        if not spans:
            return Image.new("RGBA", (THICKNESS_W, 1), (0, 0, 0, 0))

        y0, y1 = spans[0]
        pad = 8
        band = cell.crop((0, max(0, y0 - pad), cell.width, min(cell.height, y1 + pad)))
        bbox = band.getchannel("A").getbbox()
        if bbox is None:
            return Image.new("RGBA", (THICKNESS_W, 1), (0, 0, 0, 0))
        x0, by0, x1, by1 = bbox
        bbox = (
            max(0, x0 - pad),
            max(0, by0 - pad),
            min(band.width, x1 + pad),
            min(band.height, by1 + pad),
        )
        return band.crop(bbox)

    def lower_empty_edge(crop: Image.Image) -> Image.Image:
        edge_h = max(8, round(crop.height * 0.24))
        return crop.crop((0, crop.height - edge_h, crop.width, crop.height))

    if level == "empty":
        crop = lower_empty_edge(crop_cell("empty"))
        target_h = THICKNESS_LEVELS["empty"]
    else:
        # Use one tall source crop for every non-empty thickness asset. The
        # runtime scales this single strip instead of relying on multiple
        # cropped variants that throw away the upper page-stack detail.
        crop = crop_first_alpha_span("mostly")
        target_h = THICKNESS_H
    visible_h = min(THICKNESS_H, target_h)
    strip = crop.resize((THICKNESS_W, visible_h), Image.Resampling.LANCZOS)

    cap_w = min(strip.width // 5, max(96, int(visible_h * 3.1)))
    if cap_w > 0:
        fixed = strip.copy()
        if side == "left":
            cap = strip.crop((0, 0, cap_w, visible_h)).transpose(Image.Transpose.FLIP_LEFT_RIGHT)
            fixed.paste((0, 0, 0, 0), (strip.width - cap_w, 0, strip.width, visible_h))
            fixed.alpha_composite(cap, (strip.width - cap_w, 0))
        else:
            cap = strip.crop((strip.width - cap_w, 0, strip.width, visible_h)).transpose(
                Image.Transpose.FLIP_LEFT_RIGHT,
            )
            fixed.paste((0, 0, 0, 0), (0, 0, cap_w, visible_h))
            fixed.alpha_composite(cap, (0, 0))
        strip = fixed

    alpha = strip.getchannel("A")
    fade = Image.new("L", strip.size, 255)
    fade_pixels = fade.load()
    for y in range(visible_h):
        if y < 7:
            a = int(255 * (y / 7))
        elif y > visible_h - 5:
            a = int(255 * (1 - (y - (visible_h - 5)) / 5))
        else:
            a = 255
        for x in range(THICKNESS_W):
            fade_pixels[x, y] = a
    strip.putalpha(ImageChops.multiply(alpha, fade))

    corner_mask = Image.new("L", strip.size, 0)
    corner_draw = ImageDraw.Draw(corner_mask)
    corner_radius = max(14, int(visible_h * 0.48))
    corner_draw.rounded_rectangle(
        (0, 0, strip.width - 1, strip.height - 1),
        radius=corner_radius,
        fill=255,
    )
    strip.putalpha(ImageChops.multiply(strip.getchannel("A"), corner_mask))

    img = Image.new("RGBA", (THICKNESS_W, THICKNESS_H), (0, 0, 0, 0))
    img.alpha_composite(strip, (0, 0))
    return img


def save_variant_outputs(variant_name: str) -> None:
    inside_left = make_production_album_page(variant_name, "left")
    inside_right = make_production_album_page(variant_name, "right")
    cover_front = make_front_cover(variant_name)
    cover_back = make_back_cover(variant_name)
    cover_inside = make_cover_inside_page(variant_name)
    spine = make_spine(variant_name)
    tabs_left = make_side_tabs(variant_name, "left")
    tabs_right = make_side_tabs(variant_name, "right")
    thickness_assets = {
        (side, level): make_page_thickness_strip(variant_name, side, level)
        for side in ("left", "right")
        for level in THICKNESS_LEVELS
    }

    save_runtime_png(inside_left, OUT / f"sb3d_{variant_name}_page_left_generated.png", opaque=True)
    save_runtime_png(inside_right, OUT / f"sb3d_{variant_name}_page_right_generated.png", opaque=True)
    save_runtime_png(cover_front, OUT / f"sb3d_{variant_name}_cover_front_generated.png", palette=True)
    save_runtime_png(cover_back, OUT / f"sb3d_{variant_name}_cover_back_generated.png", palette=True)
    save_runtime_png(cover_inside, OUT / f"sb3d_{variant_name}_cover_inside_generated.png", opaque=True)
    save_runtime_png(spine, OUT / f"sb3d_{variant_name}_spine_generated.png")
    save_runtime_png(tabs_left, OUT / f"sb3d_{variant_name}_side_tabs_left_generated.png")
    save_runtime_png(tabs_right, OUT / f"sb3d_{variant_name}_side_tabs_right_generated.png")
    for (side, level), asset in thickness_assets.items():
        save_runtime_png(asset, OUT / f"sb3d_{variant_name}_page_thickness_{side}_{level}.png")

    if variant_name == "boy":
        save_runtime_png(inside_left, OUT / "sb3d_page_left_generated.png", opaque=True)
        save_runtime_png(inside_right, OUT / "sb3d_page_right_generated.png", opaque=True)
        save_runtime_png(spine, OUT / "sb3d_spine_generated.png")
        save_runtime_png(tabs_left, OUT / "sb3d_side_tabs_left_generated.png")
        save_runtime_png(tabs_right, OUT / "sb3d_side_tabs_right_generated.png")
        save_runtime_png(tabs_right, OUT / "sb3d_side_tabs_generated.png")
        for (side, level), asset in thickness_assets.items():
            save_runtime_png(asset, OUT / f"sb3d_page_thickness_{side}_{level}.png")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    reference_path = source_reference_path()
    if reference_path:
        shutil.copy2(reference_path, OUT / "sb3d_generated_style_reference.png")

    save_runtime_png(make_page_back(), OUT / "sb3d_page_back_generated.png", opaque=True)
    for variant_name in VARIANTS:
        save_variant_outputs(variant_name)
    save_runtime_png(make_layer_guide(), OUT / "sb3d_threejs_layer_guide.png", opaque=True)

    print("Generated texture pack:")
    for name in [
        "sb3d_generated_style_reference.png",
        "sb3d_boy_inside_left_source.png",
        "sb3d_boy_inside_right_source.png",
        "sb3d_boy_cover_front_source.png",
        "sb3d_boy_cover_back_source.png",
        "sb3d_girl_inside_left_source.png",
        "sb3d_girl_inside_right_source.png",
        "sb3d_girl_cover_front_source.png",
        "sb3d_girl_cover_back_source.png",
        "sb3d_boy_page_left_generated.png",
        "sb3d_boy_page_right_generated.png",
        "sb3d_boy_cover_front_generated.png",
        "sb3d_boy_cover_back_generated.png",
        "sb3d_boy_cover_inside_generated.png",
        "sb3d_boy_spine_generated.png",
        "sb3d_boy_side_tabs_left_generated.png",
        "sb3d_boy_side_tabs_right_generated.png",
        "sb3d_boy_page_thickness_left_empty.png",
        "sb3d_boy_page_thickness_left_small.png",
        "sb3d_boy_page_thickness_left_half.png",
        "sb3d_boy_page_thickness_left_mostly.png",
        "sb3d_boy_page_thickness_left_full.png",
        "sb3d_boy_page_thickness_right_empty.png",
        "sb3d_boy_page_thickness_right_small.png",
        "sb3d_boy_page_thickness_right_half.png",
        "sb3d_boy_page_thickness_right_mostly.png",
        "sb3d_boy_page_thickness_right_full.png",
        "sb3d_girl_page_left_generated.png",
        "sb3d_girl_page_right_generated.png",
        "sb3d_girl_cover_front_generated.png",
        "sb3d_girl_cover_back_generated.png",
        "sb3d_girl_cover_inside_generated.png",
        "sb3d_girl_spine_generated.png",
        "sb3d_girl_side_tabs_left_generated.png",
        "sb3d_girl_side_tabs_right_generated.png",
        "sb3d_girl_page_thickness_left_empty.png",
        "sb3d_girl_page_thickness_left_small.png",
        "sb3d_girl_page_thickness_left_half.png",
        "sb3d_girl_page_thickness_left_mostly.png",
        "sb3d_girl_page_thickness_left_full.png",
        "sb3d_girl_page_thickness_right_empty.png",
        "sb3d_girl_page_thickness_right_small.png",
        "sb3d_girl_page_thickness_right_half.png",
        "sb3d_girl_page_thickness_right_mostly.png",
        "sb3d_girl_page_thickness_right_full.png",
        "sb3d_page_back_generated.png",
        "sb3d_page_left_generated.png",
        "sb3d_page_right_generated.png",
        "sb3d_spine_generated.png",
        "sb3d_side_tabs_left_generated.png",
        "sb3d_side_tabs_right_generated.png",
        "sb3d_side_tabs_generated.png",
        "sb3d_threejs_layer_guide.png",
    ]:
        print(OUT / name)


if __name__ == "__main__":
    main()
