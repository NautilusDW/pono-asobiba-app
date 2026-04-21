"""Import emotion variants of hedgehog for contexts like 'lost/scared/sad'."""
from pathlib import Path
from PIL import Image

SRC_DIR = Path(r'D:\絵本\Pono_asset\headgehog\various')
DST_DIR = Path(r'd:\AppDevelopment\kids-writing-app\assets\images\characters\headgehog')
DST_DIR.mkdir(parents=True, exist_ok=True)

# (source_name, dest_name, target_height_px)
MAPPINGS = [
    ('headgehog03_011.png', 'headgehog_worried.png', 240),
    ('headgehog03_007.png', 'headgehog_crying.png',  240),
    ('headgehog03_004.png', 'headgehog_sad.png',     240),
    ('headgehog03_006.png', 'headgehog_surprised.png', 240),
]

for src_name, dst_name, target_h in MAPPINGS:
    src = SRC_DIR / src_name
    dst = DST_DIR / dst_name
    im = Image.open(src).convert('RGBA')
    w, h = im.size
    ratio = target_h / h
    nw = int(round(w * ratio))
    nh = target_h
    im2 = im.resize((nw, nh), Image.LANCZOS)
    im2.save(dst, 'PNG', optimize=True)
    print(f'{src_name:32s} -> {dst_name:28s} ({nw}x{nh})')
