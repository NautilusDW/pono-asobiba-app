"""
sprite_splitter.py
アルファチャンネル付き画像から、連結している不透明オブジェクトを
個別の PIL.Image として抽出するモジュール。

従来 split_sprites.py の BFS ロジックを bytearray + deque で高速化し、
GUI / CLI 双方から再利用できるようにしたもの。PIL のみの依存。

使い方:
    from sprite_splitter import extract_sprites
    sprites = extract_sprites(img, min_size=20, padding=4, alpha_threshold=10)
    for s in sprites:
        s.image.save(f"out_{s.index:03d}.png")
"""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass
from typing import List, Tuple

from PIL import Image


@dataclass
class SpriteInfo:
    """抽出された 1 スプライトの情報。"""

    index: int           # 抽出順 (大きい順にソート済み)
    image: Image.Image   # 切り出した RGBA 画像 (padding 付き)
    bbox: Tuple[int, int, int, int]  # 元画像内の (left, top, right, bottom)
    area: int            # 連結成分の不透明ピクセル数


# 8-connectivity offsets as (dx, dy) — applied to column, row respectively in BFS.
_NEIGHBORS_8 = ((-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (1, -1), (-1, 1), (1, 1))


def extract_sprites(
    img: Image.Image,
    min_size: int = 20,
    padding: int = 4,
    alpha_threshold: int = 10,
) -> List[SpriteInfo]:
    """
    RGBA 画像から連結オブジェクトを検出して個別スプライトとして返す。

    Args:
        img: 入力画像 (RGBA に変換される)
        min_size: このサイズ (ピクセル) 未満の矩形はノイズとして除外
        padding: 切り出し時に bbox に加える余白ピクセル数
        alpha_threshold: この値を超えるアルファのピクセルを「不透明」と判定

    Returns:
        サイズ (面積) 降順にソートされた SpriteInfo のリスト。
    """
    if img.mode != "RGBA":
        img = img.convert("RGBA")

    w, h = img.size
    if w == 0 or h == 0:
        return []

    # アルファチャンネルを bytes に取り出し、O(1) アクセスを高速化
    alpha_band = img.split()[3]
    alpha_bytes = alpha_band.tobytes()  # len == w * h

    # visited flag as bytearray (0 = unvisited, 1 = visited)
    visited = bytearray(w * h)

    sprites_raw: List[Tuple[int, int, int, int, List[int]]] = []  # (minx, miny, maxx, maxy, indices)

    for y in range(h):
        row = y * w
        for x in range(w):
            idx = row + x
            if visited[idx]:
                continue
            if alpha_bytes[idx] <= alpha_threshold:
                visited[idx] = 1
                continue

            # BFS で連結した不透明ピクセルを収集
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

    # 面積 (component 数) で降順ソート
    sprites_raw.sort(key=lambda s: len(s[4]), reverse=True)

    # 各 component をマスクした個別 RGBA 画像に切り出す
    source_rgba = img.tobytes()  # len == w * h * 4
    results: List[SpriteInfo] = []

    for order, (min_x, min_y, max_x, max_y, component) in enumerate(sprites_raw):
        left = max(0, min_x - padding)
        top = max(0, min_y - padding)
        right = min(w, max_x + padding + 1)
        bottom = min(h, max_y + padding + 1)
        cw = right - left
        ch = bottom - top

        # 新規 RGBA バッファ (完全透明で初期化)
        buf = bytearray(cw * ch * 4)

        # component に属するピクセルだけをコピー
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
    """A 版と B 版 (左右反転) のペアを返す補助関数。"""
    return sprite_img, sprite_img.transpose(Image.FLIP_LEFT_RIGHT)
