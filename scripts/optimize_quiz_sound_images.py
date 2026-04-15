#!/usr/bin/env python3
"""
音当てクイズで使う動物イラストを最大 512px にリサイズし、PNG を最適化する。
- 元ファイルは _orig_image_backup/ に退避
- 表示は最大 ~150px なので 512px で十分
- PNG quantize (256色) でファイルサイズを削減
"""
import os, json, shutil
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
BACKUP = ROOT / 'assets' / '_orig_image_backup'
JSON_PATH = ROOT / 'assets' / 'data' / 'quiz-sound-animals.json'
MAX_SIDE = 512

def main():
    data = json.loads(JSON_PATH.read_text(encoding='utf-8'))
    total_before = total_after = 0
    for a in data['animals']:
        p = ROOT / a['img']
        if not p.exists():
            print(f'  - skip (missing): {a["id"]}')
            continue
        size_before = p.stat().st_size
        total_before += size_before

        im = Image.open(p).convert('RGBA')
        w, h = im.size
        if max(w, h) > MAX_SIDE:
            scale = MAX_SIDE / max(w, h)
            new_size = (max(1, round(w * scale)), max(1, round(h * scale)))
            im = im.resize(new_size, Image.LANCZOS)

        # backup
        rel = p.relative_to(ROOT)
        bk = BACKUP / rel
        bk.parent.mkdir(parents=True, exist_ok=True)
        if not bk.exists():
            shutil.copy2(p, bk)

        # PNG 最適化保存
        im.save(p, format='PNG', optimize=True, compress_level=9)
        size_after = p.stat().st_size
        total_after += size_after
        delta = (size_before - size_after) / 1024
        print(f'  {a["id"]:10s} {w}×{h} → {im.size}  {size_before//1024}KB → {size_after//1024}KB ({delta:+.0f}KB)')

    print(f'\nTotal: {total_before//1024}KB → {total_after//1024}KB ({(total_before-total_after)//1024}KB saved)')

if __name__ == '__main__':
    main()
