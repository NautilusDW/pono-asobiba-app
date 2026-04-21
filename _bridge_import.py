"""Import & resize bridge event images.

Source: D:/ポノのおへや/Mojikaki/ivent/Bridge_broken.png, Bridge_fixed.png (3168x1344 RGB)
Target: assets/images/puzzle/bridge_broken.png, bridge_fixed.png
Resize to max-width 720px (2x retina for ~360px display width), preserve aspect ratio.
Convert to PNG with optimize=True.
"""
from PIL import Image
import os

SRC_DIR = r'D:/ポノのおへや/Mojikaki/ivent'
DST_DIR = r'd:/AppDevelopment/kids-writing-app/assets/images/puzzle'
os.makedirs(DST_DIR, exist_ok=True)

MAX_WIDTH = 720

mapping = [
    ('Bridge_broken.png', 'bridge_broken.png'),
    ('Bridge_fixed.png',  'bridge_fixed.png'),
]

for src_name, dst_name in mapping:
    src_path = os.path.join(SRC_DIR, src_name)
    dst_path = os.path.join(DST_DIR, dst_name)
    im = Image.open(src_path)
    w, h = im.size
    scale = min(MAX_WIDTH / w, 1.0)
    new_size = (int(w * scale), int(h * scale))
    if scale < 1.0:
        im = im.resize(new_size, Image.LANCZOS)
    im.save(dst_path, 'PNG', optimize=True)
    print(f'{src_name} -> {dst_name}: {new_size}, {os.path.getsize(dst_path)} bytes')

print('Done.')
