"""
split_sprites.py
アルファチャンネル付きPNGから、繋がっていないオブジェクトを
自動検出して個別PNGに分割保存するスクリプト。

使い方:
  pip install Pillow
  python split_sprites.py <入力PNG> [出力フォルダ] [base_name] [--flip-b]

例:
  python split_sprites.py OceanRocks.png output/
  python split_sprites.py OceanRocks.png              # → output/ に保存
  python split_sprites.py chair.png out/ chair --flip-b  # A/Bペア出力
"""

import sys
import os
from PIL import Image

def split_sprites(input_path, output_dir=None, base_name=None, min_size=20, padding=4, alpha_threshold=10, flip_b=False):
    img = Image.open(input_path).convert('RGBA')
    pixels = img.load()
    w, h = img.size

    if output_dir is None:
        output_dir = 'output'
    os.makedirs(output_dir, exist_ok=True)

    visited = [[False] * w for _ in range(h)]
    sprites = []

    for y in range(h):
        for x in range(w):
            if visited[y][x] or pixels[x, y][3] <= alpha_threshold:
                continue

            # BFS で連結した不透明ピクセルをすべて収集
            queue = [(x, y)]
            visited[y][x] = True
            component = [(x, y)]
            head = 0

            while head < len(queue):
                cx, cy = queue[head]; head += 1
                for dx, dy in [(-1,0),(1,0),(0,-1),(0,1),
                                (-1,-1),(1,-1),(-1,1),(1,1)]:
                    nx, ny = cx+dx, cy+dy
                    if 0 <= nx < w and 0 <= ny < h \
                            and not visited[ny][nx] \
                            and pixels[nx, ny][3] > alpha_threshold:
                        visited[ny][nx] = True
                        queue.append((nx, ny))
                        component.append((nx, ny))

            xs = [p[0] for p in component]
            ys = [p[1] for p in component]
            min_x, max_x = min(xs), max(xs)
            min_y, max_y = min(ys), max(ys)

            # 小さすぎるノイズは無視
            if (max_x - min_x + 1) < min_size or (max_y - min_y + 1) < min_size:
                continue

            # このコンポーネントのピクセルだけを残し、他は透明にする
            # （バウンディングボックス内に別オブジェクトが混入しない）
            component_set = set(component)
            left   = max(0, min_x - padding)
            top    = max(0, min_y - padding)
            right  = min(w, max_x + padding + 1)
            bottom = min(h, max_y + padding + 1)
            cw, ch = right - left, bottom - top
            masked = Image.new('RGBA', (cw, ch), (0, 0, 0, 0))
            for (px, py) in component:
                masked.putpixel((px - left, py - top), pixels[px, py])
            sprites.append(masked)

    # 大きい順に並べて保存
    sprites.sort(key=lambda s: s.size[0] * s.size[1], reverse=True)
    base = base_name or os.path.splitext(os.path.basename(input_path))[0]

    for i, sprite in enumerate(sprites):
        if flip_b:
            # A/B両方出力
            out_a = os.path.join(output_dir, f'{base}_{i+1:03d}_A.png')
            sprite.save(out_a)
            print(f'  saved: {out_a}  ({sprite.size[0]}x{sprite.size[1]})')

            flipped = sprite.transpose(Image.FLIP_LEFT_RIGHT)
            out_b = os.path.join(output_dir, f'{base}_{i+1:03d}_B.png')
            flipped.save(out_b)
            print(f'  saved: {out_b}  ({flipped.size[0]}x{flipped.size[1]})')
        else:
            # 従来通り単一出力
            out_path = os.path.join(output_dir, f'{base}_{i+1:03d}.png')
            sprite.save(out_path)
            print(f'  saved: {out_path}  ({sprite.size[0]}x{sprite.size[1]})')

    total = len(sprites) * (2 if flip_b else 1)
    mode = ' (A/B pairs)' if flip_b else ''
    print(f'\n{total} files from {len(sprites)} sprites{mode} in {input_path}')
    return sprites

if __name__ == '__main__':
    # --flip-b フラグを拾ってから位置引数を解析
    args = [a for a in sys.argv[1:] if a != '--flip-b']
    flip_b = '--flip-b' in sys.argv

    if len(args) < 1:
        print(__doc__)
        sys.exit(1)

    input_file = args[0]
    output_folder = args[1] if len(args) > 1 else 'output'
    custom_name   = args[2] if len(args) > 2 else None
    split_sprites(input_file, output_folder, base_name=custom_name, flip_b=flip_b)
