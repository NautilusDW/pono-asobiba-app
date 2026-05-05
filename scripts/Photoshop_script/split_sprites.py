"""
split_sprites.py
アルファチャンネル付きPNGから、繋がっていないオブジェクトを
自動検出して個別PNGに分割保存するスクリプト。

このファイルは Photoshop の Scripts フォルダに単独で置けば動くよう
sprite_splitter.py のロジックを内包した自己完結版になっている。
リポジトリ canonical は scripts/Photoshop_script/sprite_splitter.py
で、変更時は両方を同期すること。

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
from collections import deque
from dataclasses import dataclass
from typing import List, Tuple

from PIL import Image


# ── sprite_splitter.py から取り込んだコア (canonical = sprite_splitter.py) ──

@dataclass
class SpriteInfo:
    index: int
    image: Image.Image
    bbox: Tuple[int, int, int, int]
    area: int


_NEIGHBORS_8 = ((-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (1, -1), (-1, 1), (1, 1))


def extract_sprites(
    img: Image.Image,
    min_size: int = 20,
    padding: int = 4,
    alpha_threshold: int = 10,
) -> List[SpriteInfo]:
    if img.mode != "RGBA":
        img = img.convert("RGBA")

    w, h = img.size
    if w == 0 or h == 0:
        return []

    alpha_band = img.split()[3]
    alpha_bytes = alpha_band.tobytes()
    visited = bytearray(w * h)

    sprites_raw: List[Tuple[int, int, int, int, List[int]]] = []

    for y in range(h):
        row = y * w
        for x in range(w):
            idx = row + x
            if visited[idx]:
                continue
            if alpha_bytes[idx] <= alpha_threshold:
                visited[idx] = 1
                continue

            queue = deque()
            queue.append(idx)
            visited[idx] = 1
            component: List[int] = [idx]
            min_x = max_x = x
            min_y = max_y = y

            while queue:
                cur = queue.popleft()
                cy, cx = divmod(cur, w)
                for dx, dy in _NEIGHBORS_8:
                    nx = cx + dx
                    ny = cy + dy
                    if 0 <= nx < w and 0 <= ny < h:
                        nidx = ny * w + nx
                        if not visited[nidx] and alpha_bytes[nidx] > alpha_threshold:
                            visited[nidx] = 1
                            queue.append(nidx)
                            component.append(nidx)
                            if nx < min_x:
                                min_x = nx
                            elif nx > max_x:
                                max_x = nx
                            if ny < min_y:
                                min_y = ny
                            elif ny > max_y:
                                max_y = ny

            if (max_x - min_x + 1) < min_size or (max_y - min_y + 1) < min_size:
                continue

            sprites_raw.append((min_x, min_y, max_x, max_y, component))

    sprites_raw.sort(key=lambda s: len(s[4]), reverse=True)

    source_rgba = img.tobytes()
    results: List[SpriteInfo] = []

    for order, (min_x, min_y, max_x, max_y, component) in enumerate(sprites_raw):
        left = max(0, min_x - padding)
        top = max(0, min_y - padding)
        right = min(w, max_x + padding + 1)
        bottom = min(h, max_y + padding + 1)
        cw = right - left
        ch = bottom - top

        buf = bytearray(cw * ch * 4)
        for pidx in component:
            py, px = divmod(pidx, w)
            dst_x = px - left
            dst_y = py - top
            dst = (dst_y * cw + dst_x) * 4
            src = pidx * 4
            buf[dst]     = source_rgba[src]
            buf[dst + 1] = source_rgba[src + 1]
            buf[dst + 2] = source_rgba[src + 2]
            buf[dst + 3] = source_rgba[src + 3]

        sprite_img = Image.frombytes("RGBA", (cw, ch), bytes(buf))
        results.append(
            SpriteInfo(
                index=order + 1,
                image=sprite_img,
                bbox=(left, top, right, bottom),
                area=len(component),
            )
        )

    return results


def make_flipped_pair(sprite_img: Image.Image) -> Tuple[Image.Image, Image.Image]:
    return sprite_img, sprite_img.transpose(Image.FLIP_LEFT_RIGHT)


# ── Photoshop / CLI ラッパー ──


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
