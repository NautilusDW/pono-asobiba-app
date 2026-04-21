"""Import & resize IceBat cave mook frames.

Mapping (IceBat — cave zone zako, assigned to た/タ行):
  idle    <- 009 (neutral floating pose, mouth closed)
  stagger <- 006 (sparkle hit recoil, good "ouch" pose)
  atk windup[0] <- 004 (wings down, orb forming above horn)
  atk windup[1] <- 002 (wings up, orb bright blue)
  atk strike    <- 001 (beam firing from horn to right)

Source frames are right-facing (beam shoots right). BATTLE_ENEMIES entry sets
flipped:true so the bat faces the hero (on the left).
Target max dim = 240 px (bat is a cave zako, roughly Imp scale, not boss-sized).
"""
from PIL import Image
import os

SRC_DIR = r'D:/ポノのおへや/Mojikaki/Battle/normal'
DST_DIR = r'd:/AppDevelopment/kids-writing-app/assets/images/monsters/chars/IceBat'
os.makedirs(DST_DIR, exist_ok=True)

MAX_DIM = 240

mapping = [
    ('009', 'icebat_idle.png'),
    ('006', 'icebat_stagger.png'),
    ('004', 'icebat_atk_1.png'),
    ('002', 'icebat_atk_2.png'),
    ('001', 'icebat_atk_strike.png'),
]

for src_num, dst_name in mapping:
    src_path = os.path.join(SRC_DIR, f'icebat_{src_num}.png')
    dst_path = os.path.join(DST_DIR, dst_name)
    im = Image.open(src_path).convert('RGBA')
    w, h = im.size
    scale = min(MAX_DIM / max(w, h), 1.0)
    new_size = (int(w * scale), int(h * scale))
    if scale < 1.0:
        im = im.resize(new_size, Image.LANCZOS)
    im.save(dst_path, 'PNG', optimize=True)
    print(f'{src_num} -> {dst_name}: {new_size}, {os.path.getsize(dst_path)} bytes')

print('Done.')
