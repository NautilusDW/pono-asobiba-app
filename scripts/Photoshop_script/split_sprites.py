"""
split_sprites.py
アルファチャンネル付きPNGから、繋がっていないオブジェクトを
自動検出して個別PNGに分割保存するスクリプト。

注意: コアロジックは sprite_splitter.extract_sprites() に移動しました。
このファイルは CLI 後方互換のための薄いラッパーです。

使い方:
  pip install Pillow
  python split_sprites.py <入力PNG> [出力フォルダ] [base_name] [--flip-b]

例:
  python split_sprites.py OceanRocks.png output/
  python split_sprites.py OceanRocks.png              # → output/ に保存
  python split_sprites.py chair.png out/ chair --flip-b  # A/Bペア出力
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


def split_sprites(
    input_path,
    output_dir=None,
    base_name=None,
    min_size=20,
    padding=4,
    alpha_threshold=10,
    flip_b=False,
):
    """
    後方互換 wrapper。内部で sprite_splitter.extract_sprites を呼ぶ。
    関数シグネチャ、挙動、出力ファイル命名規則は従来通り。
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

    for s in sprites:
        if flip_b:
            a_img, b_img = make_flipped_pair(s.image)
            out_a = os.path.join(output_dir, f"{base}_{s.index:03d}_A.png")
            a_img.save(out_a)
            print(f"  saved: {out_a}  ({a_img.size[0]}x{a_img.size[1]})")
            out_b = os.path.join(output_dir, f"{base}_{s.index:03d}_B.png")
            b_img.save(out_b)
            print(f"  saved: {out_b}  ({b_img.size[0]}x{b_img.size[1]})")
        else:
            out_path = os.path.join(output_dir, f"{base}_{s.index:03d}.png")
            s.image.save(out_path)
            print(f"  saved: {out_path}  ({s.image.size[0]}x{s.image.size[1]})")

    total = len(sprites) * (2 if flip_b else 1)
    mode = " (A/B pairs)" if flip_b else ""
    print(f"\n{total} files from {len(sprites)} sprites{mode} in {input_path}")
    # 既存スクリプトとの互換のため、Image オブジェクトのリストを返す
    return [s.image for s in sprites]


if __name__ == "__main__":
    # --flip-b フラグを拾ってから位置引数を解析
    args = [a for a in sys.argv[1:] if a != "--flip-b"]
    flip_b = "--flip-b" in sys.argv

    if len(args) < 1:
        print(__doc__)
        sys.exit(1)

    input_file = args[0]
    output_folder = args[1] if len(args) > 1 else "output"
    custom_name = args[2] if len(args) > 2 else None
    split_sprites(input_file, output_folder, base_name=custom_name, flip_b=flip_b)
