#!/usr/bin/env python3
"""Normalize generated alpha assets into runtime WebP files without altering raw outputs."""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[3]
BATCH = ROOT / "tmp/alpha_pending/1262-nazonazo-depth-animals-number"
PROCESSED = BATCH / "processed"
ASSETS = ROOT / "assets/images/nazonazo-tunnel"


def alpha_bbox(image: Image.Image, threshold: int = 12) -> tuple[int, int, int, int]:
    alpha = image.getchannel("A").point(lambda value: 255 if value > threshold else 0)
    bbox = alpha.getbbox()
    if not bbox:
        raise ValueError("asset contains no visible alpha")
    return bbox


def split_equal(image: Image.Image, count: int) -> list[Image.Image]:
    frames: list[Image.Image] = []
    for index in range(count):
        left = round(image.width * index / count)
        right = round(image.width * (index + 1) / count)
        frames.append(image.crop((left, 0, right, image.height)))
    return frames


def place_centered(subject: Image.Image, canvas_size: tuple[int, int], max_size: tuple[int, int]) -> Image.Image:
    scale = min(max_size[0] / subject.width, max_size[1] / subject.height)
    size = (max(1, round(subject.width * scale)), max(1, round(subject.height * scale)))
    resized = subject.resize(size, Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
    canvas.alpha_composite(resized, ((canvas_size[0] - size[0]) // 2, (canvas_size[1] - size[1]) // 2))
    return canvas


def normalize_butterfly() -> tuple[Image.Image, list[dict[str, object]]]:
    source = Image.open(PROCESSED / "jungle_flying_butterfly_3frame_alpha.png").convert("RGBA")
    frames = []
    for frame in split_equal(source, 3):
        bbox = alpha_bbox(frame)
        subject = frame.crop(bbox)
        frames.append(place_centered(subject, (512, 512), (390, 390)))
    sheet = Image.new("RGBA", (1536, 512), (0, 0, 0, 0))
    for index, frame in enumerate(frames):
        sheet.alpha_composite(frame, (index * 512, 0))
    return sheet, frame_metrics(frames)


def normalize_elephant() -> tuple[Image.Image, list[dict[str, object]]]:
    source = Image.open(PROCESSED / "jungle_animal_elephant_trunk_3frame_alpha.png").convert("RGBA")
    split = split_equal(source, 3)
    width = max(frame.width for frame in split)
    aligned = []
    for frame in split:
        canvas = Image.new("RGBA", (width, source.height), (0, 0, 0, 0))
        canvas.alpha_composite(frame, ((width - frame.width) // 2, 0))
        aligned.append(canvas)
    boxes = [alpha_bbox(frame) for frame in aligned]
    union = (
        min(box[0] for box in boxes),
        min(box[1] for box in boxes),
        max(box[2] for box in boxes),
        max(box[3] for box in boxes),
    )
    pad = max(12, round(max(union[2] - union[0], union[3] - union[1]) * 0.035))
    crop = (
        max(0, union[0] - pad),
        max(0, union[1] - pad),
        min(width, union[2] + pad),
        min(source.height, union[3] + pad),
    )
    frames = [place_centered(frame.crop(crop), (512, 512), (480, 480)) for frame in aligned]
    sheet = Image.new("RGBA", (1536, 512), (0, 0, 0, 0))
    for index, frame in enumerate(frames):
        sheet.alpha_composite(frame, (index * 512, 0))
    return sheet, frame_metrics(frames)


def normalize_giraffe() -> tuple[Image.Image, dict[str, object]]:
    source = Image.open(PROCESSED / "jungle_animal_giraffe_full_alpha.png").convert("RGBA")
    bbox = alpha_bbox(source)
    pad = max(14, round(max(bbox[2] - bbox[0], bbox[3] - bbox[1]) * 0.025))
    crop = (
        max(0, bbox[0] - pad),
        max(0, bbox[1] - pad),
        min(source.width, bbox[2] + pad),
        min(source.height, bbox[3] + pad),
    )
    final = place_centered(source.crop(crop), (512, 768), (488, 744))
    return final, image_metrics(final)


def image_metrics(image: Image.Image) -> dict[str, object]:
    bbox = alpha_bbox(image)
    alpha = image.getchannel("A")
    alpha_values = alpha.get_flattened_data() if hasattr(alpha, "get_flattened_data") else alpha.getdata()
    visible = sum(1 for value in alpha_values if value > 12)
    return {
        "bbox": list(bbox),
        "center": [round((bbox[0] + bbox[2]) / 2, 2), round((bbox[1] + bbox[3]) / 2, 2)],
        "width": bbox[2] - bbox[0],
        "height": bbox[3] - bbox[1],
        "area": visible,
        "anchorY": round(bbox[3] / image.height * 100, 4),
        "edgeAlpha": any(
            alpha.getpixel((x, y)) > 12
            for x in range(image.width)
            for y in (0, image.height - 1)
        ) or any(
            alpha.getpixel((x, y)) > 12
            for y in range(image.height)
            for x in (0, image.width - 1)
        ),
    }


def frame_metrics(frames: list[Image.Image]) -> list[dict[str, object]]:
    return [image_metrics(frame) for frame in frames]


def save_asset(image: Image.Image, processed_name: str, asset_name: str) -> None:
    processed_path = PROCESSED / processed_name
    asset_path = ASSETS / asset_name
    image.save(processed_path, "PNG", optimize=True)
    image.save(asset_path, "WEBP", quality=88, method=6, exact=True)


def main() -> None:
    PROCESSED.mkdir(parents=True, exist_ok=True)
    ASSETS.mkdir(parents=True, exist_ok=True)
    butterfly, butterfly_frames = normalize_butterfly()
    elephant, elephant_frames = normalize_elephant()
    giraffe, giraffe_metrics = normalize_giraffe()
    save_asset(
        butterfly,
        "jungle_flying_butterfly_3frame_normalized.png",
        "jungle_flying_butterfly_3frame_20260712_v2.webp",
    )
    save_asset(
        elephant,
        "jungle_animal_elephant_trunk_3frame_normalized.png",
        "jungle_animal_elephant_trunk_3frame_20260712.webp",
    )
    save_asset(
        giraffe,
        "jungle_animal_giraffe_full_normalized.png",
        "jungle_animal_giraffe_full_20260712.webp",
    )
    report = {
        "butterfly": {
            "asset": "jungle_flying_butterfly_3frame_20260712_v2.webp",
            "size": [butterfly.width, butterfly.height],
            "frames": butterfly_frames,
        },
        "elephant": {
            "asset": "jungle_animal_elephant_trunk_3frame_20260712.webp",
            "size": [elephant.width, elephant.height],
            "frames": elephant_frames,
        },
        "giraffe": {
            "asset": "jungle_animal_giraffe_full_20260712.webp",
            "size": [giraffe.width, giraffe.height],
            "metrics": giraffe_metrics,
        },
    }
    (BATCH / "asset-report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
