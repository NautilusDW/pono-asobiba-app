"""Re-cut the 'さいごの もんだい!' sunburst balloon.

Key fix vs the rejected attempt: cloud and rays/stars are masked SEPARATELY then
combined with max(), so the dark vignette in the gaps between rays and in the
corners stays TRANSPARENT (it is not baked into a solid disc silhouette).
"""
import os
import numpy as np
from PIL import Image
from scipy.ndimage import (binary_opening, binary_fill_holes, label,
                           gaussian_filter, generate_binary_structure)

SRC = "D:/ポノのおへや/Dr.owl'quiz/No/ChatGPT Image 2026年6月14日 15_54_22.png"
OUT_WEBP = "d:/AppDevelopment/pono-asobiba-app/assets/images/quizland/final_q_balloon.webp"
DBG = "d:/AppDevelopment/pono-asobiba-app/.claude"


def disk(r):
    y, x = np.ogrid[-r:r + 1, -r:r + 1]
    return (x * x + y * y) <= r * r


def smoothstep(x, lo, hi):
    t = np.clip((x - lo) / (hi - lo), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def build_alpha(rgb, ray_lo=115.0, ray_hi=185.0, cloud_thr=150.0,
                open_r=22, feather=1.2):
    a = rgb.astype(np.float32)
    lum = 0.299 * a[:, :, 0] + 0.587 * a[:, :, 1] + 0.114 * a[:, :, 2]

    # 2. Ray/star alpha: soft ramp. Dark gaps + vignette -> 0, bright gold -> 255.
    ray_alpha = smoothstep(lum, ray_lo, ray_hi) * 255.0

    # 3. Cloud solid mask. Open with a disk big enough to erase thin rays/stars
    #    but keep the compact central cloud blob; then largest CC + fill holes.
    bright = lum > cloud_thr
    opened = binary_opening(bright, structure=disk(open_r))
    lbl, n = label(opened, structure=generate_binary_structure(2, 2))
    cloud_solid = np.zeros_like(opened)
    if n > 0:
        sizes = np.bincount(lbl.ravel())
        sizes[0] = 0
        biggest = sizes.argmax()
        cloud_solid = (lbl == biggest)
        cloud_solid = binary_fill_holes(cloud_solid)

    # 4. Combine.
    alpha = np.maximum(np.where(cloud_solid, 255.0, 0.0), ray_alpha)

    # 5. Light feather for crisp anti-aliased edges, then re-assert cloud
    #    interior to 255 so the body is not eroded.
    alpha = gaussian_filter(alpha, sigma=feather)
    alpha[cloud_solid] = 255.0

    return np.clip(alpha, 0, 255).astype(np.uint8), cloud_solid, ray_alpha


def main():
    im = Image.open(SRC).convert('RGB')
    rgb = np.asarray(im)
    alpha, cloud_solid, ray_alpha = build_alpha(rgb)

    rgba = np.dstack([rgb, alpha])

    # 6. Auto-crop to alpha>0 bbox + ~10px padding.
    ys, xs = np.where(alpha > 0)
    pad = 10
    y0 = max(ys.min() - pad, 0)
    y1 = min(ys.max() + 1 + pad, alpha.shape[0])
    x0 = max(xs.min() - pad, 0)
    x1 = min(xs.max() + 1 + pad, alpha.shape[1])
    cropped = rgba[y0:y1, x0:x1]
    print('cropped px:', cropped.shape[1], 'x', cropped.shape[0])

    out = Image.fromarray(cropped, 'RGBA')

    # Downscale. The art is dense gold-gradient sunburst; WebP floor is high,
    # so to honor the "under ~120 KB" hard target we land at ~600px (still well
    # above the ~46vw render size on any device). LANCZOS, quality 82.
    target_w = 600
    quality = 82
    if out.width > target_w:
        h = round(out.height * target_w / out.width)
        out = out.resize((target_w, h), Image.LANCZOS)
    print('final px:', out.width, 'x', out.height)

    out.save(OUT_WEBP, 'WEBP', quality=quality, method=6)
    sz = os.path.getsize(OUT_WEBP)
    print('webp bytes:', sz, f'({sz/1024:.1f} KB)')

    # Debug: cloud mask + transparency check around gaps.
    Image.fromarray((cloud_solid * 255).astype(np.uint8)).save(
        os.path.join(DBG, 'recut_dbg_cloudmask.png'))
    print('cloud px count:', int(cloud_solid.sum()))


if __name__ == '__main__':
    main()
