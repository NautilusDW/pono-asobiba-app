"""Quick smoke test for --square option (delete after run)."""
import os
import sys
import tempfile

from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from split_sprites import split_sprites  # noqa: E402

img = Image.new("RGBA", (400, 200), (0, 0, 0, 0))
d = ImageDraw.Draw(img)
d.ellipse((10, 10, 90, 90), fill=(255, 0, 0, 255))           # ~80x80 square
d.rectangle((110, 30, 200, 170), fill=(0, 255, 0, 255))      # tall
d.rectangle((230, 60, 380, 130), fill=(0, 0, 255, 255))      # wide

src = os.path.join(tempfile.gettempdir(), "sq_test.png")
out_a = os.path.join(tempfile.gettempdir(), "sq_out_a")
out_b = os.path.join(tempfile.gettempdir(), "sq_out_b")
img.save(src)

print("--- square=False ---")
split_sprites(src, out_a, base_name="t", square=False)
print()
print("--- square=True ---")
split_sprites(src, out_b, base_name="t", square=True)

print("\nresults (square=True):")
ok = True
for fn in sorted(os.listdir(out_b)):
    im = Image.open(os.path.join(out_b, fn))
    is_sq = im.size[0] == im.size[1]
    print(f"  {fn}  {im.size}  1:1? {is_sq}")
    if not is_sq:
        ok = False
print("\nALL_SQUARE" if ok else "\nFAILURE")
