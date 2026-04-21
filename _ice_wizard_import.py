"""Import & resize Ice Wizard boss frames into the deploy tree.

Mapping (Ice Wizard — cave boss, replaces は行 wind boss):
  idle    <- 007 (tall standing pose w/ glowing eyes)
  stagger <- 006 (knocked down, crystals scattered)
  atk windup[0] <- 001 (summoning crystals, arms spread)
  atk windup[1] <- 005 (raising crystal staff)
  atk strike    <- 002 (beam released from right hand)

All source frames are right-facing, so BATTLE_ENEMIES entry will set flipped:true.
Target max dim = 360 px (matches Golem / LavaGolem scale; cave boss should feel big).
Preserves RGBA transparency.
"""
from PIL import Image
import os

SRC_DIR = r'D:/ポノのおへや/Mojikaki/Battle/Boss/Boss02'
DST_DIR = r'd:/AppDevelopment/kids-writing-app/assets/images/monsters/chars/IceWizard'
os.makedirs(DST_DIR, exist_ok=True)

MAX_DIM = 360

mapping = [
    ('007', 'ice_wizard_idle.png'),
    ('006', 'ice_wizard_stagger.png'),
    ('001', 'ice_wizard_atk_1.png'),
    ('005', 'ice_wizard_atk_2.png'),
    ('002', 'ice_wizard_atk_strike.png'),
]

for src_num, dst_name in mapping:
    src_path = os.path.join(SRC_DIR, f'こおりのまどうし_{src_num}.png')
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
