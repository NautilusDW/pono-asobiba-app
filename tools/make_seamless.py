"""
make_seamless.py — シームレステクスチャ生成ツール
=====================================================
非シームレスな画像をオフセット-ブレンド法でシームレス化します。

使い方:
  python make_seamless.py input.png
  python make_seamless.py input.png output.png
  python make_seamless.py *.png            # フォルダ内全PNG

依存: Pillow (pip install Pillow)
"""

import sys
import os
import glob
from PIL import Image, ImageFilter


def make_seamless(input_path: str, output_path: str | None = None, blend_ratio: float = 0.15) -> str:
    """
    画像をシームレスタイル化して保存する。

    アルゴリズム:
    1. 画像を上下左右に 50% オフセットしてシフト版を作る
    2. 元画像とシフト版を水平・垂直それぞれ端部でグラジェントブレンド
    3. これによりタイル境界のつなぎ目が消える

    Args:
        input_path:   入力画像パス
        output_path:  出力パス (省略時は入力名 + '_seamless.png')
        blend_ratio:  ブレンド幅 (画像の短辺に対する比率, デフォルト 15%)

    Returns:
        保存したファイルパス
    """
    img = Image.open(input_path).convert("RGBA")
    w, h = img.size

    # ── 1. 50% オフセット版を作る ──────────────────────────────────────
    shifted = Image.new("RGBA", (w, h))
    hw, hh = w // 2, h // 2
    shifted.paste(img.crop((hw, hh, w,  h)),  (0,   0))
    shifted.paste(img.crop((0,  hh, hw, h)),  (hw,  0))
    shifted.paste(img.crop((hw, 0,  w,  hh)), (0,  hh))
    shifted.paste(img.crop((0,  0,  hw, hh)), (hw, hh))

    # ── 2. 水平ブレンド（左右つなぎ目）──────────────────────────────────
    blend_px = max(4, int(min(w, h) * blend_ratio))
    result = _blend_h(img, shifted, blend_px)

    # ── 3. 垂直ブレンド（上下つなぎ目）──────────────────────────────────
    result = _blend_v(result, blend_px)

    # ── 4. 保存 ───────────────────────────────────────────────────────
    out = output_path or (os.path.splitext(input_path)[0] + "_seamless.png")
    result.save(out)
    print(f"  ✓  {os.path.basename(input_path)}  →  {os.path.basename(out)}")
    return out


def _blend_h(img: Image.Image, shifted: Image.Image, blend_px: int) -> Image.Image:
    """左右境界をブレンドしてシームレス化（水平方向）"""
    from PIL import ImageChops
    w, h = img.size

    # 左端 blend_px 列: shifted → img へグラジェント
    # 右端 blend_px 列: img → shifted へグラジェント
    result = img.copy()
    for x in range(blend_px):
        alpha = x / blend_px          # 0.0 (左端) → 1.0 (blend_px 列目)
        for y in range(h):
            # 左端領域: shifted(x) と img(x) を混ぜる
            lx = x
            sp = shifted.getpixel((lx, y))
            ip = img.getpixel((lx, y))
            blended = _lerp_pixel(sp, ip, alpha)
            result.putpixel((lx, y), blended)

            # 右端領域
            rx = w - 1 - x
            sp2 = shifted.getpixel((rx, y))
            ip2 = img.getpixel((rx, y))
            blended2 = _lerp_pixel(ip2, sp2, alpha)
            result.putpixel((rx, y), blended2)

    return result


def _blend_v(img: Image.Image, blend_px: int) -> Image.Image:
    """上下境界をブレンドしてシームレス化（垂直方向）"""
    w, h = img.size
    result = img.copy()

    # 縦 50% シフト版を作る
    shifted_v = Image.new("RGBA", (w, h))
    hh = h // 2
    shifted_v.paste(img.crop((0, hh, w, h)), (0, 0))
    shifted_v.paste(img.crop((0, 0,  w, hh)), (0, hh))

    for y in range(blend_px):
        alpha = y / blend_px
        for x in range(w):
            # 上端
            ty = y
            sp = shifted_v.getpixel((x, ty))
            ip = img.getpixel((x, ty))
            result.putpixel((x, ty), _lerp_pixel(sp, ip, alpha))

            # 下端
            by = h - 1 - y
            sp2 = shifted_v.getpixel((x, by))
            ip2 = img.getpixel((x, by))
            result.putpixel((x, by), _lerp_pixel(ip2, sp2, alpha))

    return result


def _lerp_pixel(a: tuple, b: tuple, t: float) -> tuple:
    """2ピクセル間を線形補間（RGBA）"""
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(4))


def _process_file(path: str) -> None:
    """単一ファイルを処理。エラーは報告してスキップ。"""
    try:
        # 出力先を assets/textures/ に変更
        base = os.path.splitext(os.path.basename(path))[0]
        script_dir = os.path.dirname(os.path.abspath(__file__))
        textures_dir = os.path.join(script_dir, "..", "assets", "textures")
        os.makedirs(textures_dir, exist_ok=True)
        out = os.path.join(textures_dir, base + "_seamless.png")
        make_seamless(path, out)
    except Exception as e:
        print(f"  ✗  {path}: {e}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(0)

    args = sys.argv[1:]

    # 出力先が明示指定されているか（引数が2つかつ最後が .png）
    if len(args) == 2 and args[1].lower().endswith(".png") and not glob.glob(args[1]):
        # make_seamless.py input.png output.png
        make_seamless(args[0], args[1])
    else:
        # バッチ処理: glob 展開
        files = []
        for pattern in args:
            matched = glob.glob(pattern)
            if matched:
                files.extend(matched)
            else:
                files.append(pattern)  # ファイルが存在しなければそのまま渡してエラーを出す

        print(f"処理対象: {len(files)} ファイル")
        for f in files:
            _process_file(f)
        print("完了")
