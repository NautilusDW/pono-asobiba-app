"""Import & resize new hedgehog assets from D:/絵本/Pono_asset/headgehog/various.

Pose mapping (selected after visual inspection):
  heagehog_001 -> headgehog_front.png              (arms open, front)  — maze walking tile
  heagehog_002 -> headgehog_smilewavinghands.png   (both arms up cheer) — rescue celebration
  heagehog_004 -> headgehog_side.png               (side standing)
  heagehog_008 -> headgehog_back.png               (side-back view)
  heagehog_010 -> headgehog_wavehand_front01.png   (one hand wave, cute) — writing/drawing peek deco

Target: assets/images/characters/headgehog/*.png
        assets/images/characters/headgehog_wavehand_front01.png (top-level)

All outputs RGBA PNG, max dim 320px for deco, 240px for char tiles.
"""
from PIL import Image
import os

SRC_DIR = r'D:/絵本/Pono_asset/headgehog/various'
CHAR_DIR = r'd:/AppDevelopment/kids-writing-app/assets/images/characters'
HEDGE_DIR = os.path.join(CHAR_DIR, 'headgehog')
os.makedirs(HEDGE_DIR, exist_ok=True)

MAPPINGS = [
    ('heagehog_001.png', os.path.join(HEDGE_DIR, 'headgehog_front.png'),             240),
    ('heagehog_002.png', os.path.join(HEDGE_DIR, 'headgehog_smilewavinghands.png'),  240),
    ('heagehog_004.png', os.path.join(HEDGE_DIR, 'headgehog_side.png'),              240),
    ('heagehog_008.png', os.path.join(HEDGE_DIR, 'headgehog_back.png'),              240),
    ('heagehog_010.png', os.path.join(CHAR_DIR,  'headgehog_wavehand_front01.png'),  320),
]

for src_name, dst_path, max_dim in MAPPINGS:
    src_path = os.path.join(SRC_DIR, src_name)
    im = Image.open(src_path).convert('RGBA')
    w, h = im.size
    scale = min(max_dim / max(w, h), 1.0)
    new_size = (int(w * scale), int(h * scale))
    if scale < 1.0:
        im = im.resize(new_size, Image.LANCZOS)
    im.save(dst_path, 'PNG', optimize=True)
    print(f'{src_name} -> {os.path.relpath(dst_path, CHAR_DIR)}: {new_size}, {os.path.getsize(dst_path)} bytes')

print('Done.')
