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
  python split_sprites.py <入力PNG> [出力フォルダ] [base_name] [--flip-b] [--square] [--merge-gap N] [--merge-all]

例:
  python split_sprites.py OceanRocks.png output/
  python split_sprites.py OceanRocks.png              # → output/ に保存
  python split_sprites.py chair.png out/ chair --flip-b  # A/Bペア出力
  python split_sprites.py fruits.png out/ --square      # 全出力を1:1正方形に
  python split_sprites.py group.png out/ --merge-gap 30 # 30px以内なら同一スプライト扱い
  python split_sprites.py group.png out/ --merge-all    # 全部1ファイルにまとめる
"""

import os
import sys
from collections import deque
from dataclasses import dataclass
from datetime import datetime
from typing import List, Tuple

from PIL import Image, ImageFilter


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
    merge_gap: int = 0,
    merge_all: bool = False,
) -> List[SpriteInfo]:
    if img.mode != "RGBA":
        img = img.convert("RGBA")

    w, h = img.size
    if w == 0 or h == 0:
        return []

    alpha_band = img.split()[3]
    alpha_bytes = alpha_band.tobytes()
    visited = bytearray(w * h)

    # merge_gap > 0 なら alpha mask を膨張 (dilate) してから BFS する。
    # 連結性判定だけ膨張版を見て、 component に加える pixel は元 alpha に基づく。
    if merge_gap > 0:
        kernel = 2 * merge_gap + 1
        # MaxFilter で kernel 近傍の最大値 → alpha 境界が gap pixel 分外に広がる
        dilated_alpha = alpha_band.filter(ImageFilter.MaxFilter(kernel))
        bfs_alpha_bytes = dilated_alpha.tobytes()
    else:
        bfs_alpha_bytes = alpha_bytes

    sprites_raw: List[Tuple[int, int, int, int, List[int]]] = []

    for y in range(h):
        row = y * w
        for x in range(w):
            idx = row + x
            if visited[idx]:
                continue
            if bfs_alpha_bytes[idx] <= alpha_threshold:
                visited[idx] = 1
                continue

            queue = deque()
            queue.append(idx)
            visited[idx] = 1
            # 元 alpha が不透明な pixel だけを component に積む (膨張で広がった「間」は出力に含めない)
            component: List[int] = []
            if alpha_bytes[idx] > alpha_threshold:
                component.append(idx)
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
                        if not visited[nidx] and bfs_alpha_bytes[nidx] > alpha_threshold:
                            visited[nidx] = 1
                            queue.append(nidx)
                            if alpha_bytes[nidx] > alpha_threshold:
                                component.append(nidx)
                            if nx < min_x:
                                min_x = nx
                            elif nx > max_x:
                                max_x = nx
                            if ny < min_y:
                                min_y = ny
                            elif ny > max_y:
                                max_y = ny

            # component が空 (元 alpha が全部透明、膨張だけで繋がった) なら捨てる
            if not component:
                continue

            if (max_x - min_x + 1) < min_size or (max_y - min_y + 1) < min_size:
                continue

            sprites_raw.append((min_x, min_y, max_x, max_y, component))

    # merge_all=True なら全 component を 1 つに統合
    if merge_all and sprites_raw:
        all_min_x = min(s[0] for s in sprites_raw)
        all_min_y = min(s[1] for s in sprites_raw)
        all_max_x = max(s[2] for s in sprites_raw)
        all_max_y = max(s[3] for s in sprites_raw)
        all_pixels: List[int] = []
        for s in sprites_raw:
            all_pixels.extend(s[4])
        sprites_raw = [(all_min_x, all_min_y, all_max_x, all_max_y, all_pixels)]

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
    merge_gap=0,
    merge_all=False,
):
    """
    後方互換 wrapper。内部で sprite_splitter.extract_sprites を呼ぶ。
    関数シグネチャ、挙動、出力ファイル命名規則は従来通り。
    square=True で各出力PNGを1:1正方形 (透明パディング) に整形する。
    merge_gap>0 で指定 px 以内の sprite を結合 (alpha mask を膨張して BFS)。
    merge_all=True で全 sprite を 1 ファイルに統合 (merge_gap より優先される効果)。
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
        merge_gap=merge_gap,
        merge_all=merge_all,
    )

    base = base_name or os.path.splitext(os.path.basename(input_path))[0]
    ts = datetime.now().strftime('%Y%m%d-%H%M%S')

    def _finalize(im):
        return _to_square(im) if square else im

    for s in sprites:
        if flip_b:
            a_img, b_img = make_flipped_pair(s.image)
            a_img = _finalize(a_img)
            b_img = _finalize(b_img)
            out_a = os.path.join(output_dir, f"{base}_{ts}_{s.index:03d}_A.png")
            a_img.save(out_a)
            print(f"  saved: {out_a}  ({a_img.size[0]}x{a_img.size[1]})")
            out_b = os.path.join(output_dir, f"{base}_{ts}_{s.index:03d}_B.png")
            b_img.save(out_b)
            print(f"  saved: {out_b}  ({b_img.size[0]}x{b_img.size[1]})")
        else:
            out_img = _finalize(s.image)
            out_path = os.path.join(output_dir, f"{base}_{ts}_{s.index:03d}.png")
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
    # フラグ + 値付きフラグを拾ってから位置引数を解析
    bool_flags = {"--flip-b", "--square", "--merge-all"}
    raw = sys.argv[1:]
    flip_b = "--flip-b" in raw
    square = "--square" in raw
    merge_all = "--merge-all" in raw

    merge_gap = 0
    args: List[str] = []
    i = 0
    while i < len(raw):
        a = raw[i]
        if a in bool_flags:
            i += 1
            continue
        if a == "--merge-gap":
            if i + 1 >= len(raw):
                print("ERROR: --merge-gap には数値が必要です")
                sys.exit(2)
            try:
                merge_gap = int(raw[i + 1])
            except ValueError:
                print("ERROR: --merge-gap の値が整数ではありません: " + raw[i + 1])
                sys.exit(2)
            if merge_gap < 0:
                print("ERROR: --merge-gap は 0 以上にしてください")
                sys.exit(2)
            i += 2
            continue
        args.append(a)
        i += 1

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
        merge_gap=merge_gap,
        merge_all=merge_all,
    )
