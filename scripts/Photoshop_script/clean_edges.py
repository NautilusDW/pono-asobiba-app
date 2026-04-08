"""
clean_edges.py
スクリーンショット等のジャギジャギな輪郭を自動検出・除去し、
アンチエイリアス付きの透過 PNG を書き出すスクリプト。

背景は単色である必要なし（グラデーション・UI・写真背景 OK）。
rembg の意味ベースセグメンテーション (U2Net / ISNet / BiRefNet) を
使って前景を抽出し、アルファチャンネルを滑らかに整える。

使い方:
  pip install rembg pillow onnxruntime

  # 単一ファイル
  python clean_edges.py input.png

  # フォルダ一括 (非再帰)
  python clean_edges.py assets/raw/ -o assets/cleaned/

  # フォルダ再帰
  python clean_edges.py assets/raw/ -o assets/cleaned/ --recursive

  # モデル切替 (複雑背景用に BiRefNet)
  python clean_edges.py input.png --model birefnet-general

  # alpha matting OFF (速度優先)
  python clean_edges.py input.png --no-matting

モデルの使い分け目安:
  - u2net              : 軽量・速い。シンプルな前景向け
  - isnet-general-use  : デフォルト。バランス型 (推奨)
  - birefnet-general   : 2024 最新 SOTA。複雑背景で最強、その分重い

初回実行時、選択モデルが ~/.u2net/ に自動ダウンロードされる
(オフライン環境では事前に実行してキャッシュしておくこと)。
"""

import argparse
import os
import sys
from pathlib import Path

from PIL import Image, ImageFilter

try:
    from rembg import remove, new_session
except ImportError:
    print("Error: rembg is not installed. Run: pip install rembg pillow onnxruntime", file=sys.stderr)
    sys.exit(1)


SUPPORTED_EXTS = {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff", ".tif"}


def smooth_alpha(img: Image.Image, blur_radius: float = 0.6) -> Image.Image:
    """
    アルファチャンネルだけを軽くぼかし、S カーブで押し込んで
    ジャギ由来のザラつきを除去しつつセミ透明縁を保つ。
    """
    if img.mode != "RGBA":
        img = img.convert("RGBA")

    r, g, b, a = img.split()

    # 1) Gaussian blur で段差を溶かす
    a_blur = a.filter(ImageFilter.GaussianBlur(radius=blur_radius))

    # 2) S カーブ (contrast curve) で 0/255 近傍を引き締める
    #    中央値 128 付近はそのまま、両端はさらに押し込む
    lut = []
    for i in range(256):
        # ロジスティック風: ゲイン 1.3 で縁のハレーションを抑える
        x = (i - 128) / 128.0
        y = 1.0 / (1.0 + pow(2.718281828, -x * 7.0))
        lut.append(max(0, min(255, int(y * 255))))
    a_curved = a_blur.point(lut)

    return Image.merge("RGBA", (r, g, b, a_curved))


def clean_one(
    input_path: Path,
    output_path: Path,
    session,
    use_matting: bool,
    blur_radius: float,
) -> None:
    print(f"  > {input_path.name}", flush=True)
    with Image.open(input_path) as im:
        im = im.convert("RGBA")

        kwargs = {"session": session}
        if use_matting:
            kwargs.update(
                dict(
                    alpha_matting=True,
                    alpha_matting_foreground_threshold=240,
                    alpha_matting_background_threshold=20,
                    alpha_matting_erode_size=5,
                )
            )

        cut = remove(im, **kwargs)

        cut = smooth_alpha(cut, blur_radius=blur_radius)

        output_path.parent.mkdir(parents=True, exist_ok=True)
        cut.save(output_path, "PNG")


def collect_inputs(src: Path, recursive: bool):
    if src.is_file():
        if src.suffix.lower() in SUPPORTED_EXTS:
            return [src]
        print(f"Error: unsupported extension: {src.suffix}", file=sys.stderr)
        sys.exit(1)
    if src.is_dir():
        it = src.rglob("*") if recursive else src.iterdir()
        return sorted(p for p in it if p.is_file() and p.suffix.lower() in SUPPORTED_EXTS)
    print(f"Error: input not found: {src}", file=sys.stderr)
    sys.exit(1)


def main():
    ap = argparse.ArgumentParser(description="Clean jaggy edges in PNG screenshots using rembg.")
    ap.add_argument("input", type=Path, help="Input file or directory")
    ap.add_argument("-o", "--output-dir", type=Path, default=None, help="Output directory (default: same as input)")
    ap.add_argument(
        "--model",
        default="isnet-general-use",
        choices=[
            "u2net",
            "u2netp",
            "u2net_human_seg",
            "isnet-general-use",
            "isnet-anime",
            "birefnet-general",
            "birefnet-general-lite",
            "birefnet-portrait",
        ],
        help="rembg segmentation model (default: isnet-general-use)",
    )
    ap.add_argument("--no-matting", action="store_true", help="Disable alpha matting (faster, coarser edges)")
    ap.add_argument("--blur", type=float, default=0.6, help="Alpha smoothing blur radius (default: 0.6)")
    ap.add_argument("-r", "--recursive", action="store_true", help="Recurse into subdirectories")
    ap.add_argument("--suffix", default="_clean", help='Output filename suffix (default: "_clean")')
    args = ap.parse_args()

    inputs = collect_inputs(args.input, args.recursive)
    if not inputs:
        print("No images found.")
        return

    print(f"Loading model: {args.model} ...", flush=True)
    session = new_session(args.model)

    print(f"Processing {len(inputs)} image(s):", flush=True)
    for src in inputs:
        if args.output_dir:
            if args.input.is_dir():
                rel = src.relative_to(args.input)
                out = args.output_dir / rel.with_name(rel.stem + args.suffix + ".png")
            else:
                out = args.output_dir / (src.stem + args.suffix + ".png")
        else:
            out = src.with_name(src.stem + args.suffix + ".png")

        try:
            clean_one(src, out, session, use_matting=not args.no_matting, blur_radius=args.blur)
        except Exception as e:
            print(f"    ! failed: {e}", file=sys.stderr)

    print("Done.")


if __name__ == "__main__":
    main()
