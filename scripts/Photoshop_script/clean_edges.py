"""
clean_edges.py
スクリーンショット等のジャギジャギな輪郭を自動検出・除去し、
アンチエイリアス付きの透過 PNG を書き出すスクリプト。

3 つの処理モードを搭載:
  1. rembg モード (デフォルト)
     意味ベースの AI モデル (U2Net / ISNet / BiRefNet) で前景抽出。
     複雑な写真・イラスト背景に強い。
  2. --auto-fake-bg モード
     生成 AI が出力する "ニセ透明背景" (単色 + 市松模様) を
     色ベースで自動除去。rembg が混乱するケースに有効。
  3. --bbox x,y,w,h モード
     被写体を手動で矩形指定。指定範囲だけ rembg をかける。

いずれのモードも最後に S カーブ + Gaussian blur でアルファを整え、
アンチエイリアスの効いた縁に仕上げる。

使い方:
  pip install rembg pillow onnxruntime numpy

  # 基本: rembg で一枚処理
  python clean_edges.py input.png

  # フォルダ一括
  python clean_edges.py assets/raw/ -o assets/cleaned/

  # フォルダ再帰
  python clean_edges.py assets/raw/ -o assets/cleaned/ --recursive

  # rembg モデル切替 (複雑背景には BiRefNet)
  python clean_edges.py input.png --model birefnet-general

  # 生成 AI の ニセ透明背景 を色ベースで除去
  python clean_edges.py input.png --auto-fake-bg

  # 被写体を手動で矩形指定して rembg
  python clean_edges.py input.png --bbox 100,80,400,300

  # 処理結果をウィンドウで確認してから保存
  python clean_edges.py input.png --preview

モデルの使い分け目安:
  - u2net              : 軽量・速い。シンプルな前景向け
  - isnet-general-use  : デフォルト。バランス型 (推奨)
  - birefnet-general   : 2024 最新 SOTA。複雑背景で最強、その分重い

初回実行時、選択モデルが ~/.u2net/ に自動ダウンロードされる
(オフライン環境では事前に実行してキャッシュしておくこと)。
"""

import argparse
import sys
from pathlib import Path

from PIL import Image, ImageFilter

try:
    import numpy as np
except ImportError:
    print("Error: numpy is not installed. Run: pip install numpy", file=sys.stderr)
    sys.exit(1)


SUPPORTED_EXTS = {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff", ".tif"}


# ---------------------------------------------------------------------------
# Alpha smoothing (shared by all modes)
# ---------------------------------------------------------------------------

def _shrink_alpha(a: Image.Image, shrink_px: float) -> Image.Image:
    """
    Erode the alpha channel by `shrink_px` pixels (supports fractional values).

    Implementation:
      - If scipy is available, use Euclidean distance transform for
        smooth sub-pixel shrink: each pixel's alpha is multiplied by
        clamp(distance_to_background - shrink_px + 1, 0, 1).
      - Fallback (no scipy): integer rounding + iterative MinFilter.
    """
    try:
        shrink_px = float(shrink_px)
    except (TypeError, ValueError):
        return a
    if shrink_px <= 0:
        return a

    try:
        from scipy.ndimage import distance_transform_edt  # type: ignore
    except ImportError:
        # Fallback to integer MinFilter erosion
        n = int(round(shrink_px))
        out = a
        for _ in range(n):
            out = out.filter(ImageFilter.MinFilter(3))
        return out

    arr = np.array(a, dtype=np.uint8)
    if arr.size == 0:
        return a

    # Foreground = alpha > 0; treat partial alphas as fg too
    fg_mask = arr > 0
    if not fg_mask.any():
        return a

    # Distance from each fg pixel to the nearest background pixel
    dist = distance_transform_edt(fg_mask)

    # Pixels with dist >= shrink_px stay full strength.
    # Pixels with dist < shrink_px get faded out smoothly.
    # factor = clip(dist - (shrink_px - 1), 0, 1)
    #   - dist=shrink_px → factor=1 (fully kept)
    #   - dist=shrink_px-1 → factor=0 (eroded away)
    factor = np.clip(dist - (shrink_px - 1.0), 0.0, 1.0)
    new_alpha = (arr.astype(np.float32) * factor).astype(np.uint8)
    return Image.fromarray(new_alpha, mode="L")


def smooth_alpha(
    img: Image.Image,
    blur_radius: float = 0.6,
    shrink_px: int = 0,
) -> Image.Image:
    """
    アルファチャンネルだけを処理して縁を整える:
      1. shrink (erosion) で縁を内側に引っ込める (背景フリンジ対策)
      2. Gaussian blur で段差を溶かす
      3. S カーブで 0/255 近傍を引き締める
    """
    if img.mode != "RGBA":
        img = img.convert("RGBA")

    r, g, b, a = img.split()

    # 1) Erode (shrink) the alpha mask
    a = _shrink_alpha(a, shrink_px)

    # 2) Gaussian blur で段差を溶かす
    a_blur = a.filter(ImageFilter.GaussianBlur(radius=blur_radius))

    # 3) S カーブ (contrast curve) で 0/255 近傍を引き締める
    lut = []
    for i in range(256):
        x = (i - 128) / 128.0
        y = 1.0 / (1.0 + pow(2.718281828, -x * 7.0))
        lut.append(max(0, min(255, int(y * 255))))
    a_curved = a_blur.point(lut)

    return Image.merge("RGBA", (r, g, b, a_curved))


def _light_smooth(
    img: Image.Image,
    blur_radius: float = 0.5,
    shrink_px: int = 0,
) -> Image.Image:
    """
    S カーブを使わない軽いアルファスムージング。
    距離変換フェザリング済みマスクを潰さないよう、ぼかしだけ適用。
    shrink_px > 0 のときは MinFilter で縁を引っ込めてからぼかす。
    """
    if img.mode != "RGBA":
        img = img.convert("RGBA")
    r, g, b, a = img.split()
    a = _shrink_alpha(a, shrink_px)
    if blur_radius > 0:
        a = a.filter(ImageFilter.GaussianBlur(radius=blur_radius))
    return Image.merge("RGBA", (r, g, b, a))


# ---------------------------------------------------------------------------
# Mode 1: rembg (semantic segmentation)
# ---------------------------------------------------------------------------

def process_rembg(
    img: Image.Image,
    session,
    use_matting: bool,
    bbox: tuple = None,
) -> Image.Image:
    """
    rembg で前景抽出。bbox 指定時はその矩形だけをクロップしてから処理し、
    結果を元サイズのキャンバスに貼り戻す (周囲は完全透明)。
    """
    from rembg import remove

    kwargs = {}
    if use_matting:
        kwargs.update(
            dict(
                alpha_matting=True,
                alpha_matting_foreground_threshold=240,
                alpha_matting_background_threshold=20,
                alpha_matting_erode_size=5,
            )
        )
    kwargs["session"] = session

    if bbox:
        x, y, w, h = bbox
        x2, y2 = x + w, y + h
        # Clamp
        x = max(0, x); y = max(0, y)
        x2 = min(img.width, x2); y2 = min(img.height, y2)
        if x2 <= x or y2 <= y:
            raise ValueError(f"Invalid bbox: {bbox}")
        crop = img.crop((x, y, x2, y2))
        cut = remove(crop, **kwargs)
        result = Image.new("RGBA", img.size, (0, 0, 0, 0))
        result.paste(cut, (x, y), cut if cut.mode == "RGBA" else None)
        return result

    return remove(img, **kwargs)


# ---------------------------------------------------------------------------
# Mode 2: auto-fake-bg (color-based: uniform border + checker pattern)
# ---------------------------------------------------------------------------

def _border_connected(candidate: "np.ndarray") -> "np.ndarray":
    """
    candidate (bool mask) のうち、画像の縁に接続している連結成分だけを True に。
    scipy があれば ndimage.label を使う。無ければ反復膨張でフォールバック。
    """
    h, w = candidate.shape
    try:
        from scipy import ndimage  # type: ignore

        labels, _ = ndimage.label(candidate, structure=np.ones((3, 3), dtype=np.uint8))
        border_labels = set()
        border_labels.update(labels[0, :].tolist())
        border_labels.update(labels[-1, :].tolist())
        border_labels.update(labels[:, 0].tolist())
        border_labels.update(labels[:, -1].tolist())
        border_labels.discard(0)
        if not border_labels:
            return np.zeros_like(candidate)
        return np.isin(labels, list(border_labels))
    except ImportError:
        # Fallback: 反復膨張 (BFS をフラットに展開)
        result = np.zeros_like(candidate)
        result[0, :] = candidate[0, :]
        result[-1, :] = candidate[-1, :]
        result[:, 0] = candidate[:, 0]
        result[:, -1] = candidate[:, -1]
        for _ in range(max(h, w)):
            new = result.copy()
            new[1:, :] |= result[:-1, :] & candidate[1:, :]
            new[:-1, :] |= result[1:, :] & candidate[:-1, :]
            new[:, 1:] |= result[:, :-1] & candidate[:, 1:]
            new[:, :-1] |= result[:, 1:] & candidate[:, :-1]
            if np.array_equal(new, result):
                break
            result = new
        return result


def _feather_mask(bg_mask: "np.ndarray", feather_px: float) -> "np.ndarray":
    """
    背景マスクを距離変換でフェザリングし、0.0-1.0 の前景率 (float32) を返す。
    feather_px は縁のグラデーション幅 (ピクセル)。
    scipy が無ければガウスぼかしで近似。
    """
    fg_mask = ~bg_mask
    if feather_px <= 0:
        return fg_mask.astype(np.float32)
    try:
        from scipy import ndimage  # type: ignore

        dist_in = ndimage.distance_transform_edt(fg_mask)
        dist_out = ndimage.distance_transform_edt(~fg_mask)
        signed = dist_in - dist_out  # >0 前景内部, <0 背景内部
        # 縁 (signed=0) を中心に feather_px の範囲でグラデーション
        alpha = np.clip((signed + feather_px) / (2.0 * feather_px), 0.0, 1.0)
        return alpha.astype(np.float32)
    except ImportError:
        # フォールバック: PIL の GaussianBlur で近似
        from PIL import ImageFilter as _IF
        im = Image.fromarray((fg_mask.astype(np.uint8) * 255), mode="L")
        im = im.filter(_IF.GaussianBlur(radius=max(0.5, feather_px)))
        return np.array(im, dtype=np.float32) / 255.0


def process_auto_fake_bg(
    img: Image.Image,
    border_tolerance: int = 32,
    gray_tolerance: int = 18,
    gray_saturation_max: int = 22,
    gray_brightness_min: int = 140,
    feather: float = 1.5,
    remove_checker: bool = True,
) -> Image.Image:
    """
    生成 AI の "ニセ透明背景" を色ベースで除去する。

    Step 1: 画像の四辺からピクセルをサンプルし、それに近い色をマスク候補に
    Step 2: 低彩度・高明度 (市松模様のグレー) もマスク候補に追加 (オプション)
    Step 3: 候補のうち 画像の縁に連結している領域 だけを背景確定
            (→ 魚の目の白など孤立した島は前景として残る)
    Step 4: 距離変換で縁をフェザリング (→ ジャギ解消)
    """
    rgba = np.array(img.convert("RGBA"))
    h, w = rgba.shape[:2]
    rgb = rgba[:, :, :3].astype(np.int16)
    alpha = rgba[:, :, 3].astype(np.float32) / 255.0

    # --- Step 1: border color candidate ----------------------------------
    border_samples = np.concatenate([
        rgb[0, :, :].reshape(-1, 3),
        rgb[-1, :, :].reshape(-1, 3),
        rgb[:, 0, :].reshape(-1, 3),
        rgb[:, -1, :].reshape(-1, 3),
    ])

    # バケット量子化 (R>>4, G>>4, B>>4) で上位 K 個を抽出
    buckets = {}
    for px in border_samples:
        key = (int(px[0]) >> 4, int(px[1]) >> 4, int(px[2]) >> 4)
        buckets[key] = buckets.get(key, 0) + 1
    top_border = sorted(buckets.items(), key=lambda kv: -kv[1])[:8]
    border_colors = np.array(
        [[(k[0] << 4) + 8, (k[1] << 4) + 8, (k[2] << 4) + 8] for k, _ in top_border],
        dtype=np.int16,
    )

    candidate = np.zeros((h, w), dtype=bool)
    for bc in border_colors:
        diff = np.max(np.abs(rgb - bc.reshape(1, 1, 3)), axis=2)
        candidate |= diff <= border_tolerance

    # --- Step 2: checker gray candidate ----------------------------------
    if remove_checker:
        r_ch, g_ch, b_ch = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
        brightness = (r_ch + g_ch + b_ch) // 3
        saturation = (
            np.maximum(np.maximum(r_ch, g_ch), b_ch)
            - np.minimum(np.minimum(r_ch, g_ch), b_ch)
        )
        gray_region = (saturation <= gray_saturation_max) & (brightness >= gray_brightness_min)

        # 既にマーク済みでないグレー候補から頻出明度 2-4 色を検出
        pending_gray = gray_region & ~candidate
        if pending_gray.sum() > 100:
            gb = brightness[pending_gray]
            hist, bin_edges = np.histogram(gb, bins=range(gray_brightness_min, 256, 4))
            top_idx = np.argsort(hist)[::-1][:4]
            top_grays = [
                (bin_edges[i] + bin_edges[i + 1]) // 2
                for i in top_idx
                if hist[i] > 20
            ]
            for tg in top_grays:
                diff = np.abs(brightness - tg)
                gray_pixel = (diff <= gray_tolerance) & gray_region
                candidate |= gray_pixel

    # --- Step 3: keep only border-connected parts (preserves eye whites) -
    bg_mask = _border_connected(candidate)

    # --- Step 4: feathered alpha -----------------------------------------
    fg_ratio = _feather_mask(bg_mask, feather_px=feather)
    new_alpha = np.clip(fg_ratio * alpha, 0.0, 1.0) * 255.0

    result = rgba.copy()
    result[:, :, 3] = new_alpha.astype(np.uint8)
    return Image.fromarray(result, mode="RGBA")


# ---------------------------------------------------------------------------
# Preview window (tkinter)
# ---------------------------------------------------------------------------

def checker_composite(img: Image.Image, tile: int = 16) -> Image.Image:
    """アルファがわかりやすいように市松模様の上に合成した画像を返す (表示専用)。
    numpy でベクトル化。大きな画像でも即座に生成される。"""
    if img.mode != "RGBA":
        img = img.convert("RGBA")
    w, h = img.size
    ys = np.arange(h).reshape(-1, 1)
    xs = np.arange(w).reshape(1, -1)
    mask = (((xs // tile) + (ys // tile)) % 2 == 0)
    arr = np.empty((h, w, 3), dtype=np.uint8)
    arr[mask] = (240, 240, 240)
    arr[~mask] = (200, 200, 200)
    bg = Image.fromarray(arr, mode="RGB")
    bg.paste(img, mask=img.split()[3])
    return bg


def show_preview(original: Image.Image, result: Image.Image, title: str) -> bool:
    """
    tkinter で原画像と処理結果を左右並びで表示。
    [Save] で True, [Skip] で False を返す。
    """
    try:
        import tkinter as tk
        from PIL import ImageTk
    except ImportError:
        print("    ! tkinter not available, skipping preview", file=sys.stderr)
        return True

    max_w, max_h = 700, 600

    def fit(im):
        im = im.copy()
        im.thumbnail((max_w, max_h))
        return im

    left = fit(original.convert("RGBA"))
    right = fit(checker_composite(result))

    win = tk.Tk()
    win.title(f"Preview - {title}")
    win.configure(bg="#222")

    frame = tk.Frame(win, bg="#222")
    frame.pack(padx=10, pady=10)

    tk.Label(frame, text="Original", fg="white", bg="#222").grid(row=0, column=0)
    tk.Label(frame, text="Result", fg="white", bg="#222").grid(row=0, column=1)

    photo_l = ImageTk.PhotoImage(left)
    photo_r = ImageTk.PhotoImage(right)

    lbl_l = tk.Label(frame, image=photo_l, bg="#222")
    lbl_l.image = photo_l
    lbl_l.grid(row=1, column=0, padx=8)

    lbl_r = tk.Label(frame, image=photo_r, bg="#222")
    lbl_r.image = photo_r
    lbl_r.grid(row=1, column=1, padx=8)

    decision = {"save": False}

    def on_save():
        decision["save"] = True
        win.destroy()

    def on_skip():
        decision["save"] = False
        win.destroy()

    btn_frame = tk.Frame(win, bg="#222")
    btn_frame.pack(pady=(0, 12))
    tk.Button(btn_frame, text="Save", width=12, command=on_save).pack(side=tk.LEFT, padx=6)
    tk.Button(btn_frame, text="Skip", width=12, command=on_skip).pack(side=tk.LEFT, padx=6)

    win.bind("<Return>", lambda e: on_save())
    win.bind("<Escape>", lambda e: on_skip())

    win.mainloop()
    return decision["save"]


# ---------------------------------------------------------------------------
# Orchestration
# ---------------------------------------------------------------------------

def clean_one(
    input_path: Path,
    output_path: Path,
    session,
    use_matting: bool,
    blur_radius: float,
    mode: str,
    bbox: tuple = None,
    preview: bool = False,
) -> None:
    print(f"  > {input_path.name}", flush=True)
    with Image.open(input_path) as im:
        original = im.convert("RGBA")

        if mode == "auto-fake-bg":
            cut = process_auto_fake_bg(original)
            # auto-fake-bg は既にフェザリング済みなので、軽いぼかしだけ
            if blur_radius > 0:
                cut = _light_smooth(cut, blur_radius=blur_radius)
        else:
            cut = process_rembg(original, session=session, use_matting=use_matting, bbox=bbox)
            cut = smooth_alpha(cut, blur_radius=blur_radius)

        if preview:
            ok = show_preview(original, cut, title=input_path.name)
            if not ok:
                print("    (skipped by user)")
                return

        output_path.parent.mkdir(parents=True, exist_ok=True)
        cut.save(output_path, "PNG")
        print(f"    saved: {output_path}")


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


def parse_bbox(s: str) -> tuple:
    try:
        parts = [int(v.strip()) for v in s.split(",")]
        if len(parts) != 4:
            raise ValueError
        return tuple(parts)
    except Exception:
        raise argparse.ArgumentTypeError(
            f"bbox must be 'x,y,w,h' (four integers), got: {s!r}"
        )


def main():
    ap = argparse.ArgumentParser(
        description="Clean jaggy edges in PNG screenshots (rembg / color-based / manual bbox).",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
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

    # New modes
    ap.add_argument(
        "--auto-fake-bg",
        action="store_true",
        help="Color-based mode: remove uniform border colors + checker pattern grays. "
             "Use for AI-generated images with fake transparency grids.",
    )
    ap.add_argument(
        "--bbox",
        type=parse_bbox,
        default=None,
        metavar="X,Y,W,H",
        help="Process only this rectangle with rembg, rest becomes transparent.",
    )
    ap.add_argument(
        "--preview",
        action="store_true",
        help="Show a tkinter window with before/after before saving each image.",
    )

    args = ap.parse_args()

    if args.auto_fake_bg and args.bbox:
        print("Error: --auto-fake-bg and --bbox cannot be used together.", file=sys.stderr)
        sys.exit(2)

    mode = "auto-fake-bg" if args.auto_fake_bg else "rembg"

    inputs = collect_inputs(args.input, args.recursive)
    if not inputs:
        print("No images found.")
        return

    session = None
    if mode == "rembg":
        try:
            from rembg import new_session
        except ImportError:
            print("Error: rembg is not installed. Run: pip install rembg pillow onnxruntime", file=sys.stderr)
            sys.exit(1)
        print(f"Loading model: {args.model} ...", flush=True)
        session = new_session(args.model)
    else:
        print("Using color-based auto-fake-bg mode (no AI model loaded).", flush=True)

    print(f"Processing {len(inputs)} image(s) [mode={mode}]:", flush=True)
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
            clean_one(
                src,
                out,
                session=session,
                use_matting=not args.no_matting,
                blur_radius=args.blur,
                mode=mode,
                bbox=args.bbox,
                preview=args.preview,
            )
        except Exception as e:
            print(f"    ! failed: {e}", file=sys.stderr)

    print("Done.")


if __name__ == "__main__":
    main()
