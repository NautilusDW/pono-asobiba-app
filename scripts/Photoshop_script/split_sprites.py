"""
split_sprites.py
アルファチャンネル付きPNGから、繋がっていないオブジェクトを
自動検出して個別PNGに分割保存するスクリプト。

注意: コアロジックは sprite_splitter.extract_sprites() に移動しました。
このファイルは CLI 後方互換のための薄いラッパーです。

使い方:
  pip install Pillow
  python split_sprites.py <入力PNG> [出力フォルダ] [base_name] [--flip-b] [--square]

例:
  python split_sprites.py OceanRocks.png output/
  python split_sprites.py OceanRocks.png              # → output/ に保存
  python split_sprites.py chair.png out/ chair --flip-b  # A/Bペア出力
  python split_sprites.py fruits.png out/ --square      # 全出力を1:1正方形に
"""

import os
import sys
from pathlib import Path

from PIL import Image

# Same-directory import
_HERE = Path(__file__).resolve().parent
if str(_HERE) not in sys.path:
    sys.path.insert(0, str(_HERE))

from sprite_splitter import extract_sprites, make_flipped_pair  # noqa: E402


def _to_square(img: Image.Image) -> Image.Image:
    """長辺に合わせた透明正方形キャンバスへセンター配置して返す。"""
    w, h = img.size
    if w == h:
        return img
    side = max(w, h)
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.paste(img, ((side - w) // 2, (side - h) // 2))
    return canvas


def split_sprites(
    input_path,
    output_dir=None,
    base_name=None,
    min_size=20,
    padding=4,
    alpha_threshold=10,
    flip_b=False,
    square=False,
):
    """
    後方互換 wrapper。内部で sprite_splitter.extract_sprites を呼ぶ。
    関数シグネチャ、挙動、出力ファイル命名規則は従来通り。
    square=True で各出力PNGを1:1正方形 (透明パディング) に整形する。
    """
    img = Image.open(input_path).convert("RGBA")

    if output_dir is None:
        output_dir = "output"
    os.makedirs(output_dir, exist_ok=True)

    sprites = extract_sprites(
        img,
        min_size=min_size,
        padding=padding,
        alpha_threshold=alpha_threshold,
    )

    base = base_name or os.path.splitext(os.path.basename(input_path))[0]

    def _finalize(im):
        return _to_square(im) if square else im

    for s in sprites:
        if flip_b:
            a_img, b_img = make_flipped_pair(s.image)
            a_img = _finalize(a_img)
            b_img = _finalize(b_img)
            out_a = os.path.join(output_dir, f"{base}_{s.index:03d}_A.png")
            a_img.save(out_a)
            print(f"  saved: {out_a}  ({a_img.size[0]}x{a_img.size[1]})")
            out_b = os.path.join(output_dir, f"{base}_{s.index:03d}_B.png")
            b_img.save(out_b)
            print(f"  saved: {out_b}  ({b_img.size[0]}x{b_img.size[1]})")
        else:
            out_img = _finalize(s.image)
            out_path = os.path.join(output_dir, f"{base}_{s.index:03d}.png")
            out_img.save(out_path)
            print(f"  saved: {out_path}  ({out_img.size[0]}x{out_img.size[1]})")

    total = len(sprites) * (2 if flip_b else 1)
    parts = []
    if flip_b:
        parts.append("A/B pairs")
    if square:
        parts.append("1:1 square")
    mode = f" ({', '.join(parts)})" if parts else ""
    print(f"\n{total} files from {len(sprites)} sprites{mode} in {input_path}")
    # 既存スクリプトとの互換のため、Image オブジェクトのリストを返す
    return [s.image for s in sprites]


if __name__ == "__main__":
    # フラグを拾ってから位置引数を解析
    flags = {"--flip-b", "--square"}
    args = [a for a in sys.argv[1:] if a not in flags]
    flip_b = "--flip-b" in sys.argv
    square = "--square" in sys.argv

    if len(args) < 1:
        print(__doc__)
        sys.exit(1)

    input_file = args[0]
    output_folder = args[1] if len(args) > 1 else "output"
    custom_name = args[2] if len(args) > 2 else None
    split_sprites(
        input_file,
        output_folder,
        base_name=custom_name,
        flip_b=flip_b,
        square=square,
    )
