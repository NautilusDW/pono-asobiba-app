#!/usr/bin/env python3
"""
auto_optimize_image.py — assets/images/ 配下に新規配置された画像を自動最適化する。

3 つの実行モード:
  --hook            Claude Code PostToolUse フックから呼ばれる。stdin に JSON payload。
                    対象ツール (Write/Edit/Bash) の destination を抽出し、assets/images/
                    配下の画像なら最適化。失敗しても exit 0 (ツールチェーン非阻害)。
  --scan            assets/images/ 配下を再帰走査して全体を一度に最適化。
                    運用開始時やサイズ閾値を変えた後の一括補正用。
  <path> [path...]  指定パスのみ最適化 (手動)。
  --allow-jpeg-rename
                    手動モードで alpha なし PNG を JPG に変換 (拡張子変更) する。
                    省略時は **拡張子保持で安全** (alpha 判定誤りで透明 PNG を
                    誤って JPG 化するリスクを排除する。 また、 既存の
                    <img src="*.png"> 参照を勝手に壊すことを防ぐ)。

最適化ポリシー (assets/images/story/README.md の既存慣行に準拠):
  - alpha 持ち (RGBA/LA/透過 P): PNG のまま。max 辺 1200px に LANCZOS リサイズ、
    PIL optimize=True, compress_level=9。
  - alpha 無し (RGB): max 1600w で再圧縮。
    - フック / scan / 手動 (--allow-jpeg-rename なし) → 元拡張子を保持。
    - 手動 + --allow-jpeg-rename のみ .png → .jpg 化を許可 (opt-in)。
  - 600KB 以下 かつ 幅 1600 以下 はスキップ (既に target 適合)。
  - 再圧縮後 5% 以上削れない場合は原本を戻す (無駄な品質低下防止)。

副次ファイル:
  scripts/.image_opt_cache.json  処理済みファイルの (mtime, size) を記録、再実行時スキップ
  scripts/.image_opt_cache.log   例外時のみ append、通常は無音
  assets/_orig_image_backup/     原本バックアップ (既存 optimize_quiz_sound_images.py と同場所)

環境変数 PONO_SKIP_IMG_OPT=1 で即時 exit (緊急停止スイッチ)。
"""
from __future__ import annotations
import contextlib
import json
import os
import re
import shlex
import shutil
import sys
import time
import traceback
from pathlib import Path
from typing import Iterable, Optional

try:
    from PIL import Image
except ImportError:
    sys.stderr.write("Pillow not installed. pip install Pillow\n")
    sys.exit(0)  # 無音 exit (フック経由で他ツールを阻害しない)

ROOT = Path(__file__).resolve().parent.parent
ASSETS_IMAGES = (ROOT / "assets" / "images").resolve()
MAZE_IMAGE_STAGES = (ROOT / "maze" / "imageStages").resolve()
# 監視対象ルート (ここに新ディレクトリを足すだけで scan / hook が広がる)
WATCH_ROOTS = [ASSETS_IMAGES, MAZE_IMAGE_STAGES]
BACKUP_DIR = ROOT / "assets" / "_orig_image_backup"
CACHE_PATH = Path(__file__).resolve().parent / ".image_opt_cache.json"
CACHE_LOCK = Path(__file__).resolve().parent / ".image_opt_cache.lock"
LOG_PATH = Path(__file__).resolve().parent / ".image_opt_cache.log"

# 圧縮パラメータ
JPEG_MAX_WIDTH = 1600
JPEG_QUALITY = 88
PNG_MAX_SIDE = 1200
SKIP_SIZE_BYTES = 600_000   # これ以下はスキップ
MIN_SAVING_RATIO = 0.05     # 5%以上削れなければ原本を戻す

VALID_EXTS = {".png", ".jpg", ".jpeg", ".webp"}


def _log_error(msg: str) -> None:
    """例外時のみ log.  通常フローでは呼ばれない。"""
    try:
        with LOG_PATH.open("a", encoding="utf-8") as f:
            f.write(msg.rstrip() + "\n")
    except Exception:
        pass  # ログ書き込み失敗まで握り潰す (フック阻害回避)


@contextlib.contextmanager
def _cache_lock(timeout_s: float = 3.0):
    """ロストアップデート対策の単純なファイルロック。

    O_CREAT|O_EXCL でロックファイルを作る。既に存在すれば短いスリープ後に再試行。
    timeout_s で諦めて lock 無しで進む (フックがハングするより worst-case で
    lost-update を許容したほうが安全)。
    """
    fd = None
    deadline = time.time() + timeout_s
    while True:
        try:
            fd = os.open(str(CACHE_LOCK), os.O_CREAT | os.O_EXCL | os.O_WRONLY)
            break
        except FileExistsError:
            # 古い stale lock (5 分以上) は奪取
            try:
                age = time.time() - CACHE_LOCK.stat().st_mtime
                if age > 300:
                    CACHE_LOCK.unlink(missing_ok=True)
                    continue
            except Exception:
                pass
            if time.time() > deadline:
                fd = None
                break
            time.sleep(0.05)
        except Exception:
            fd = None
            break
    try:
        yield (fd is not None)
    finally:
        if fd is not None:
            try:
                os.close(fd)
            except Exception:
                pass
            try:
                CACHE_LOCK.unlink(missing_ok=True)
            except Exception:
                pass


def _load_cache() -> dict:
    if not CACHE_PATH.exists():
        return {}
    try:
        return json.loads(CACHE_PATH.read_text(encoding="utf-8"))
    except Exception:
        return {}


def _save_cache(cache: dict) -> None:
    try:
        tmp = CACHE_PATH.with_suffix(".json.tmp")
        tmp.write_text(json.dumps(cache, ensure_ascii=False, indent=2), encoding="utf-8")
        os.replace(tmp, CACHE_PATH)
    except Exception as e:
        _log_error(f"cache save failed: {e}")


def _cache_key(path: Path) -> str:
    try:
        return str(path.resolve().relative_to(ROOT)).replace("\\", "/")
    except ValueError:
        return str(path.resolve()).replace("\\", "/")


def _is_under_watched_dir(path: Path) -> bool:
    """assets/images/ または maze/imageStages/ の配下なら True。"""
    try:
        rp = path.resolve()
        for root in WATCH_ROOTS:
            if root in rp.parents or rp == root:
                return True
        return False
    except Exception:
        return False


# 後方互換 (旧名で参照されている場合に備える)
_is_under_assets_images = _is_under_watched_dir


def _has_alpha(im: "Image.Image") -> bool:
    """画像が有意な透過を持っているかを判定。"""
    if im.mode in ("RGBA", "LA"):
        # alpha チャネルの最小値を見て、実質全不透明なら alpha 扱いしない
        try:
            alpha = im.getchannel("A")
            if alpha.getextrema()[0] == 255:
                return False
        except Exception:
            pass
        return True
    if im.mode == "P" and "transparency" in im.info:
        return True
    return False


def _backup_original(path: Path) -> None:
    """assets/_orig_image_backup/<relpath> に原本をコピー (既存あればスキップ)。"""
    try:
        rel = path.resolve().relative_to(ROOT)
    except ValueError:
        return
    bk = BACKUP_DIR / rel
    bk.parent.mkdir(parents=True, exist_ok=True)
    if not bk.exists():
        shutil.copy2(path, bk)


def optimize_one(
    path: Path,
    *,
    dry_run: bool = False,
    allow_rename: bool = False,
    verbose: bool = False,
) -> dict:
    """1 ファイルを最適化して結果を dict で返す。

    allow_rename=True のとき alpha なし PNG を JPG に変換 (拡張子変更)。
    hook モードでは False (拡張子を保持して in-flight 参照を壊さない)。
    """
    result = {"path": str(path), "action": "skip", "before": 0, "after": 0, "new_path": None, "reason": ""}

    if not path.exists() or not path.is_file():
        result["reason"] = "missing"
        return result
    if path.suffix.lower() not in VALID_EXTS:
        result["reason"] = "non-image"
        return result
    if not _is_under_watched_dir(path):
        result["reason"] = "out-of-scope"
        return result

    size_before = path.stat().st_size
    result["before"] = size_before

    # 早期スキップ: サイズ小 かつ 幅が閾値以下
    if size_before < SKIP_SIZE_BYTES:
        try:
            with Image.open(path) as im:
                w = im.size[0]
            if w <= JPEG_MAX_WIDTH:
                result["reason"] = f"already-small ({size_before // 1024}KB, {w}px)"
                return result
        except Exception as e:
            result["reason"] = f"stat-open-failed: {e}"
            return result

    try:
        im = Image.open(path)
        im.load()
    except Exception as e:
        result["reason"] = f"open-failed: {e}"
        _log_error(f"{path}: open failed — {e}")
        return result

    try:
        has_alpha = _has_alpha(im)
        orig_w, orig_h = im.size

        if dry_run:
            result["action"] = "would-optimize-png" if has_alpha else "would-optimize-jpeg"
            result["reason"] = f"{orig_w}x{orig_h} {size_before // 1024}KB alpha={has_alpha}"
            return result

        _backup_original(path)

        if has_alpha:
            # PNG 維持。max_side 1200 にリサイズ。
            target = im
            if max(orig_w, orig_h) > PNG_MAX_SIDE:
                scale = PNG_MAX_SIDE / max(orig_w, orig_h)
                new_size = (max(1, round(orig_w * scale)), max(1, round(orig_h * scale)))
                target = im.resize(new_size, Image.LANCZOS)
            # 保存は sibling tmp → 検証後 replace
            tmp = path.with_suffix(path.suffix + ".opt.tmp")
            target.save(tmp, format="PNG", optimize=True, compress_level=9)
            size_after = tmp.stat().st_size
            if size_after >= size_before * (1 - MIN_SAVING_RATIO):
                tmp.unlink(missing_ok=True)
                result["action"] = "skip"
                result["after"] = size_before
                result["reason"] = f"no-gain ({size_before // 1024}KB)"
                return result
            os.replace(tmp, path)
            result["action"] = "png"
            result["after"] = size_after
            result["new_path"] = str(path)
        else:
            # alpha なし: JPEG 化が望ましい。ただし hook / scan モード
            # (allow_rename=False) では、コード参照が壊れないよう拡張子は保持する。
            # 既存 .png は PNG として再圧縮、.webp は webp として再圧縮、.jpg/.jpeg はそのまま。
            keep_orig_extension = (not allow_rename) and path.suffix.lower() in {".png", ".webp", ".jpg", ".jpeg"}

            if keep_orig_extension:
                # 拡張子保持で in-place リサイズ + 再圧縮 (alpha なしなので RGB 化)。
                rgb = im.convert("RGB")
                if rgb.size[0] > JPEG_MAX_WIDTH:
                    scale = JPEG_MAX_WIDTH / rgb.size[0]
                    rgb = rgb.resize(
                        (JPEG_MAX_WIDTH, max(1, round(rgb.size[1] * scale))),
                        Image.LANCZOS,
                    )
                tmp = path.with_suffix(path.suffix + ".opt.tmp")
                ext_lower = path.suffix.lower()
                if ext_lower in (".jpg", ".jpeg"):
                    rgb.save(tmp, format="JPEG", quality=JPEG_QUALITY, optimize=True, progressive=True)
                elif ext_lower == ".webp":
                    rgb.save(tmp, format="WEBP", quality=JPEG_QUALITY, method=6)
                else:
                    rgb.save(tmp, format="PNG", optimize=True, compress_level=9)
                size_after = tmp.stat().st_size
                if size_after >= size_before * (1 - MIN_SAVING_RATIO):
                    tmp.unlink(missing_ok=True)
                    result["action"] = "skip"
                    result["after"] = size_before
                    result["reason"] = f"no-gain-png-resize ({size_before // 1024}KB)"
                    return result
                try:
                    os.replace(tmp, path)
                except Exception:
                    tmp.unlink(missing_ok=True)
                    raise
                result["action"] = "png"
                result["after"] = size_after
                result["new_path"] = str(path)
            else:
                # JPEG 化 (拡張子変更を許可、または既に jpg/jpeg)
                rgb = im.convert("RGB")
                if rgb.size[0] > JPEG_MAX_WIDTH:
                    scale = JPEG_MAX_WIDTH / rgb.size[0]
                    rgb = rgb.resize(
                        (JPEG_MAX_WIDTH, max(1, round(rgb.size[1] * scale))),
                        Image.LANCZOS,
                    )
                new_path = path.with_suffix(".jpg")
                tmp = new_path.with_suffix(new_path.suffix + ".opt.tmp")
                rgb.save(tmp, format="JPEG", quality=JPEG_QUALITY, optimize=True, progressive=True)
                size_after = tmp.stat().st_size
                if size_after >= size_before * (1 - MIN_SAVING_RATIO):
                    tmp.unlink(missing_ok=True)
                    result["action"] = "skip"
                    result["after"] = size_before
                    result["reason"] = f"no-gain ({size_before // 1024}KB)"
                    return result
                try:
                    os.replace(tmp, new_path)
                except Exception:
                    tmp.unlink(missing_ok=True)
                    raise
                # 元が png で new が jpg のときは原本 png を削除 (allow_rename 時のみ通る)
                if new_path != path and path.exists():
                    try:
                        path.unlink()
                    except Exception as e:
                        _log_error(f"{path}: old-unlink failed — {e}")
                result["action"] = "jpeg"
                result["after"] = size_after
                result["new_path"] = str(new_path)
    finally:
        try:
            im.close()
        except Exception:
            pass

    if verbose:
        pct = (1 - result["after"] / max(1, result["before"])) * 100
        sys.stdout.write(
            f"[{result['action']:5s}] {result['before'] // 1024:>6}KB -> {result['after'] // 1024:>6}KB ({pct:+5.1f}%)  {path.relative_to(ROOT)}\n"
        )
    return result


def _extract_paths_from_bash(command: str) -> list[Path]:
    """cp/mv/copy/move コマンドの最後のトークン (destination) を抽出。

    複雑なシェル構文は扱わない (the common happy path で十分)。
    """
    out: list[Path] = []
    # && / ; / | / || で区切られた各サブコマンドを個別に見る (single | も含む)
    for sub in re.split(r"&&|\|\||;|\|", command):
        sub = sub.strip()
        if not sub:
            continue
        # Windows のバックスラッシュ区切り絶対パスは shlex(posix=True) でエスケープ扱い
        # されて潰れるので、事前に / へ正規化する。drive letter は維持される。
        sub_normalized = sub.replace("\\", "/")
        try:
            tokens = shlex.split(sub_normalized, posix=True)
        except ValueError:
            continue
        if not tokens:
            continue
        head = Path(tokens[0]).name.lower()
        if head in ("cp", "mv", "copy", "move", "install"):
            # dest = 最後の non-flag token
            non_flag = [t for t in tokens[1:] if not t.startswith("-")]
            if len(non_flag) >= 2:
                out.append(Path(non_flag[-1]))
    return out


def _extract_paths_from_payload(payload: dict) -> list[Path]:
    """Claude Code hook stdin JSON から候補パスを抜く。"""
    out: list[Path] = []
    tool = payload.get("tool_name") or payload.get("tool", "")
    ti = payload.get("tool_input") or {}
    if tool in ("Write", "Edit", "NotebookEdit"):
        fp = ti.get("file_path")
        if fp:
            out.append(Path(fp))
    elif tool == "Bash":
        cmd = ti.get("command", "")
        if cmd:
            out.extend(_extract_paths_from_bash(cmd))
    # 相対パスは ROOT 起点で解決
    normalized: list[Path] = []
    for p in out:
        if not p.is_absolute():
            p = (ROOT / p).resolve()
        else:
            p = p.resolve()
        normalized.append(p)
    return normalized


def run_hook_mode() -> int:
    """PostToolUse フックとして呼ばれた時のエントリ。

    - stdin JSON payload を読む (parse 失敗なら無音 exit)
    - Write/Edit/Bash の destination path を抽出
    - assets/images/ 配下 かつ 画像拡張子 のみ optimize_one
    - 例外は .image_opt_cache.log に記録して exit 0
    """
    if os.environ.get("PONO_SKIP_IMG_OPT") == "1":
        return 0
    raw = sys.stdin.read()
    if not raw.strip():
        return 0
    try:
        payload = json.loads(raw)
    except Exception:
        return 0

    try:
        candidates = _extract_paths_from_payload(payload)
    except Exception as e:
        _log_error(f"extract failed: {e}")
        return 0

    if not candidates:
        return 0

    # cache の load → mutate → save をロックで囲んで lost-update を防ぐ。
    # ロック取得失敗時 (3秒で諦め) は cache 無し前提で動作 (重複処理は許容)。
    with _cache_lock(timeout_s=3.0):
        cache = _load_cache()
        cache_dirty = False
        for path in candidates:
            try:
                if not path.exists() or not path.is_file():
                    continue
                if path.suffix.lower() not in VALID_EXTS:
                    continue
                if not _is_under_watched_dir(path):
                    continue
                key = _cache_key(path)
                st = path.stat()
                stamp = f"{st.st_mtime_ns}:{st.st_size}"
                if cache.get(key) == stamp:
                    continue
                r = optimize_one(path, allow_rename=False, verbose=False)
                # cache は最終 mtime/size で記録 (最適化後が最新)。
                # rename された場合は new_path を使う (現状 hook では rename しないが防御的に)。
                target = Path(r.get("new_path") or path)
                if target.exists():
                    st2 = target.stat()
                    cache[_cache_key(target)] = f"{st2.st_mtime_ns}:{st2.st_size}"
                    cache_dirty = True
            except Exception as e:
                _log_error(f"{path}: hook loop failed — {e}\n{traceback.format_exc()}")
        if cache_dirty:
            _save_cache(cache)
    return 0


def run_scan_mode(dry_run: bool = False) -> int:
    """WATCH_ROOTS 配下 (assets/images/ + maze/imageStages/) を全走査。"""
    cache = _load_cache()
    total_before = total_after = 0
    count = 0
    seen: set[Path] = set()
    for root in WATCH_ROOTS:
        if not root.exists():
            continue
        for path in root.rglob("*"):
            if not path.is_file():
                continue
            if path.suffix.lower() not in VALID_EXTS:
                continue
            rp = path.resolve()
            if rp in seen:
                continue
            seen.add(rp)
            try:
                # allow_rename=False で運用: 既存の .png 参照を壊さないよう拡張子は保持。
                # (alpha なし PNG は in-place で resize + 再圧縮、JPEG 化はしない)
                r = optimize_one(path, dry_run=dry_run, allow_rename=False, verbose=False)
                action = r["action"]
                if action.startswith("would-optimize") or action in ("png", "jpeg"):
                    total_before += r["before"]
                    if action in ("png", "jpeg"):
                        total_after += r["after"]
                        new = Path(r["new_path"]) if r["new_path"] else path
                        if new.exists():
                            st = new.stat()
                            cache[_cache_key(new)] = f"{st.st_mtime_ns}:{st.st_size}"
                    else:
                        total_after += r["before"]
                    count += 1
                    rel = path.relative_to(ROOT)
                    if action.startswith("would-optimize"):
                        sys.stdout.write(f"[dry  ] {r['before'] // 1024:>7}KB  {rel}  ({r['reason']})\n")
                    else:
                        pct = (1 - r["after"] / max(1, r["before"])) * 100
                        sys.stdout.write(
                            f"[{action:5s}] {r['before'] // 1024:>7}KB -> {r['after'] // 1024:>6}KB ({pct:+5.1f}%)  {rel}\n"
                        )
            except Exception as e:
                _log_error(f"{path}: scan failed -- {e}")
    if not dry_run and count:
        _save_cache(cache)
    saved = total_before - total_after
    sys.stdout.write(
        f"\nTotal: {count} files, {total_before // 1024}KB -> {total_after // 1024}KB ({saved // 1024}KB saved)\n"
    )
    return 0


def run_manual_mode(paths: Iterable[str], allow_rename: bool = False) -> int:
    """手動モード: パス配列を最適化。

    安全性デフォルト = allow_rename=False (拡張子保持)。 alpha なし PNG は
    PNG 形式のまま再圧縮する。
    JPEG 化したい場合は呼び出し元 (main) が --allow-jpeg-rename フラグを
    検出して allow_rename=True で渡す。 これにより:
      - 透過意図のある PNG (一見 alpha なしだが実は背景透過用にエクスポートされた等) を
        誤って JPG 化するリスクを回避
      - 既存の <img src="*.png"> 参照を勝手に壊すことを防止
    """
    cache = _load_cache()
    for pstr in paths:
        p = Path(pstr)
        if not p.is_absolute():
            p = (ROOT / p).resolve()
        r = optimize_one(p, allow_rename=allow_rename, verbose=True)
        if r["action"] in ("png", "jpeg"):
            new = Path(r["new_path"]) if r["new_path"] else p
            if new.exists():
                st = new.stat()
                cache[_cache_key(new)] = f"{st.st_mtime_ns}:{st.st_size}"
    _save_cache(cache)
    return 0


def _ensure_utf8_stdio() -> None:
    """Windows cp932 環境で日本語を含む __doc__ を出力するとクラッシュするので
    stdout/stderr を UTF-8 に再構成する。再構成失敗時は無視 (フック阻害回避)。"""
    for stream_name in ("stdout", "stderr"):
        stream = getattr(sys, stream_name, None)
        if stream is None:
            continue
        try:
            stream.reconfigure(encoding="utf-8", errors="replace")
        except Exception:
            pass


def main() -> int:
    _ensure_utf8_stdio()
    args = sys.argv[1:]
    if not args:
        try:
            sys.stderr.write(__doc__ or "")
        except Exception:
            pass
        return 1
    if args[0] == "--hook":
        return run_hook_mode()
    if args[0] == "--scan":
        dry = "--dry-run" in args
        return run_scan_mode(dry_run=dry)
    if args[0] == "--help" or args[0] == "-h":
        try:
            sys.stdout.write(__doc__ or "")
        except Exception:
            pass
        return 0
    # 手動モード: alpha なし PNG を JPG に rename したい場合のみ
    # --allow-jpeg-rename を明示的に付ける。 デフォルトは拡張子保持で安全。
    allow_rename = "--allow-jpeg-rename" in args
    paths = [a for a in args if not a.startswith("--")]
    return run_manual_mode(paths, allow_rename=allow_rename)


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as e:
        _log_error(f"top-level: {e}\n{traceback.format_exc()}")
        sys.exit(0)  # フック阻害防止のため常に 0
