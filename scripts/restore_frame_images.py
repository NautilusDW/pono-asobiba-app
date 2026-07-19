#!/usr/bin/env python3
"""
restore_frame_images.py — Quizland OP フレーム画像 5 種を git blob から復旧 + リサイズ。

経緯:
  assets/images/quizland/OP/ 配下の 5 種フレーム画像が disk から消失した。
  git commit 99cf466 に blob として残存しているので抽出。
  ただし元サイズ 2.0〜2.6MB と大きく、エディタサムネが破損するため
  auto_optimize_image.py の SKIP 条件 (600KB / PNG 1200px) に収まる
  ように圧縮してから書き出す。

ポリシー:
  - PNG のまま保存 (透過チャネル維持、装飾木枠を保つ)
  - 最大幅 1000px (アスペクト維持、元が 1000px 以下なら原寸保持)
  - PIL optimize=True, compress_level=9
"""
from __future__ import annotations

import subprocess
import sys
from io import BytesIO
from pathlib import Path

from PIL import Image

REPO_ROOT = Path(__file__).resolve().parent.parent
COMMIT = "99cf466"
MAX_WIDTH = 1000
TARGET_BYTES = 600_000  # auto_optimize_image.py の SKIP 閾値
# 600KB を超えた場合の追い込み幅 (px)。順に試行する。
RETRY_WIDTHS = [900, 800, 720, 640, 560, 480]

# disk 上の相対パス (POSIX 形式)。git ls-tree の出力と一致させる。
TARGETS = [
    "assets/images/quizland/OP/frame4_3.png",
    "assets/images/quizland/OP/frame_1_1.png",
    "assets/images/quizland/OP/レイヤー 0_20260507-173812_001.png",
    "assets/images/quizland/OP/レイヤー 0_20260507-173858_001.png",
    "assets/images/quizland/OP/レイヤー 0_20260507-173923_001.png",
]


def fetch_blob(rel_path: str) -> bytes:
    """git show <commit>:<path> でバイナリ取得。"""
    spec = f"{COMMIT}:{rel_path}"
    proc = subprocess.run(
        ["git", "show", spec],
        cwd=REPO_ROOT,
        capture_output=True,
        check=True,
    )
    return proc.stdout


def _resize_to_width(im: Image.Image, target_w: int) -> Image.Image:
    w, h = im.size
    if w <= target_w:
        return im
    new_h = round(h * target_w / w)
    return im.resize((target_w, new_h), Image.LANCZOS)


def _save_png(im: Image.Image, path: Path) -> int:
    """PNG として保存しバイトサイズを返す。"""
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path, format="PNG", optimize=True, compress_level=9)
    return path.stat().st_size


def _save_png_quantized(im: Image.Image, path: Path, colors: int = 256) -> int:
    """256 色 palette 化して PNG 保存。alpha も保持される (P + tRNS)。"""
    path.parent.mkdir(parents=True, exist_ok=True)
    pal = im.quantize(colors=colors, method=2)  # 2=median cut, RGBA OK
    pal.save(path, format="PNG", optimize=True, compress_level=9)
    return path.stat().st_size


def restore_one(rel_path: str) -> dict:
    blob = fetch_blob(rel_path)
    orig_kb = len(blob) / 1024
    im = Image.open(BytesIO(blob))
    orig_size = im.size

    out_path = REPO_ROOT / rel_path
    candidate = _resize_to_width(im, MAX_WIDTH)
    final_size = candidate.size
    mode_used = "RGBA"

    # Step 1: 通常 RGBA PNG で保存
    bytes_used = _save_png(candidate, out_path)

    # Step 2: TARGET_BYTES 超なら 256 色 palette 化 (画質はほぼ維持)
    if bytes_used > TARGET_BYTES:
        bytes_used = _save_png_quantized(candidate, out_path, colors=256)
        mode_used = "P256"

    # Step 3: それでも超える場合のみ幅を段階的に縮める (palette 維持)
    if bytes_used > TARGET_BYTES:
        for w_try in RETRY_WIDTHS:
            cand = _resize_to_width(im, w_try)
            bytes_used = _save_png_quantized(cand, out_path, colors=256)
            final_size = cand.size
            mode_used = f"P256@{w_try}"
            if bytes_used <= TARGET_BYTES:
                break

    new_kb = bytes_used / 1024
    return {
        "path": rel_path,
        "orig_size": orig_size,
        "new_size": final_size,
        "orig_kb": orig_kb,
        "new_kb": new_kb,
        "mode": mode_used,
    }


def main() -> int:
    rows = []
    for rel in TARGETS:
        try:
            rows.append(restore_one(rel))
        except Exception as e:  # noqa: BLE001
            print(f"[ERROR] {rel}: {e}", file=sys.stderr)
            return 1

    print()
    print(f"{'file':<55} {'orig px':>14} {'new px':>14} {'orig KB':>10} {'new KB':>10} {'mode':>6}")
    print("-" * 115)
    all_ok = True
    for r in rows:
        ow, oh = r["orig_size"]
        nw, nh = r["new_size"]
        name = Path(r["path"]).name
        ok = r["new_kb"] < 600
        all_ok = all_ok and ok
        marker = "" if ok else "  <-- OVER 600KB"
        print(
            f"{name:<55} {ow:>5}x{oh:<8} {nw:>5}x{nh:<8} "
            f"{r['orig_kb']:>10.1f} {r['new_kb']:>10.1f} {r['mode']:>6}{marker}"
        )

    if not all_ok:
        print("\n[WARN] Some files exceed 600KB. Consider reducing MAX_WIDTH.", file=sys.stderr)
        return 2
    print("\n[OK] All restored files are under 600KB.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
