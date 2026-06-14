"""Verify the recut webp: composite over backgrounds + stacked with sibling.
Also measure halo/corner darkness and inter-ray gap transparency numerically.
"""
import os
import numpy as np
from PIL import Image

WEBP = "d:/AppDevelopment/pono-asobiba-app/assets/images/quizland/final_q_balloon.webp"
SIB = "d:/AppDevelopment/pono-asobiba-app/assets/images/quizland/qno_plate_5.png"
DBG = "d:/AppDevelopment/pono-asobiba-app/.claude"

BGS = {
    'gray': (0x88, 0x88, 0x88),
    'paper': (0xfd, 0xf3, 0xd8),
    'teal': (0x16, 0x50, 0x5a),
}


def composite(fg, bg_rgb):
    fg = fg.convert('RGBA')
    bg = Image.new('RGBA', fg.size, bg_rgb + (255,))
    return Image.alpha_composite(bg, fg).convert('RGB')


def main():
    fg = Image.open(WEBP).convert('RGBA')
    arr = np.asarray(fg)
    alpha = arr[:, :, 3]
    h, w = alpha.shape
    print('webp dims:', w, 'x', h, 'bytes', os.path.getsize(WEBP))

    # Corner transparency (should be ~0).
    cs = 30
    for name, (yy, xx) in {'TL': (slice(0, cs), slice(0, cs)),
                           'TR': (slice(0, cs), slice(w - cs, w)),
                           'BL': (slice(h - cs, h), slice(0, cs)),
                           'BR': (slice(h - cs, h), slice(w - cs, w))}.items():
        print(f'corner {name} mean alpha:', round(float(alpha[yy, xx].mean()), 2),
              'max:', int(alpha[yy, xx].max()))

    # Mid-band inter-ray gap sampling: ring region away from center cloud.
    # Count semi-opaque pixels in a band that should be mostly gaps.
    yc, xc = h / 2, w / 2
    yy, xx = np.mgrid[0:h, 0:w]
    r = np.sqrt(((yy - yc) / (h / 2)) ** 2 + ((xx - xc) / (w / 2)) ** 2)
    outer = (r > 0.78)  # corners / outermost ring, mostly gaps
    if outer.sum():
        print('outer-ring frac alpha>40:',
              round(float((alpha[outer] > 40).mean()), 4),
              'mean alpha:', round(float(alpha[outer].mean()), 2))

    for name, bg in BGS.items():
        composite(fg, bg).save(os.path.join(DBG, f'recut_over_{name}.png'))

    # Stacked composite with sibling below, over teal.
    sib = Image.open(SIB).convert('RGBA')
    teal = BGS['teal']
    tw = max(fg.width, sib.width)
    gap = 20
    canvas = Image.new('RGBA', (tw, fg.height + sib.height + gap), teal + (255,))
    canvas.alpha_composite(fg, ((tw - fg.width) // 2, 0))
    canvas.alpha_composite(sib, ((tw - sib.width) // 2, fg.height + gap))
    canvas.convert('RGB').save(os.path.join(DBG, 'recut_stacked_with_sibling.png'))
    print('saved composites')


if __name__ == '__main__':
    main()
