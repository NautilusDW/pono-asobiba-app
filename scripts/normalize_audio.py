#!/usr/bin/env python3
"""
全BGM / SE のラウドネス正規化 (ffmpeg loudnorm)

- BGM (assets/audio/*, *_bgm*): -18 LUFS  (背景なので少し控えめ)
- SE  (assets/sounds/*):        -14 LUFS  (効果音は明瞭に)
- 元ファイルは assets/_orig_audio_backup/ に退避 (1度だけ)

Usage:
    python scripts/normalize_audio.py [--dry-run]
"""
import os, sys, shutil, subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BACKUP = ROOT / 'assets' / '_orig_audio_backup'
TARGETS = [ROOT / 'assets' / 'audio', ROOT / 'assets' / 'sounds']
EXTS = {'.mp3', '.wav', '.m4a'}
DRY = '--dry-run' in sys.argv

def is_bgm(rel_path: Path) -> bool:
    s = str(rel_path).lower()
    if 'audio/' in s.replace('\\', '/'):  # assets/audio/ or sounds/audio/
        return True
    if '_bgm' in s or 'bgm' in rel_path.stem.lower():
        return True
    return False

def loudnorm_args(target_lufs: float):
    return f'loudnorm=I={target_lufs}:LRA=11:TP=-1.5'

def process(src: Path, rel: Path):
    bgm = is_bgm(rel)
    target = -18 if bgm else -14
    backup_path = BACKUP / rel
    backup_path.parent.mkdir(parents=True, exist_ok=True)
    if not backup_path.exists():
        if DRY:
            print(f'  [backup] {rel}')
        else:
            shutil.copy2(src, backup_path)
    # ffmpeg in-place is unsafe → 同じ拡張子の temp ファイルに出力してから rename
    tmp = src.with_name(src.stem + '__norm__' + src.suffix)
    is_mp3 = src.suffix.lower() == '.mp3'
    cmd = [
        'ffmpeg', '-y', '-loglevel', 'error',
        '-i', str(backup_path),  # source from backup so re-runs don't double-process
        '-af', loudnorm_args(target),
    ]
    if is_mp3:
        cmd += ['-c:a', 'libmp3lame', '-b:a', '128k', '-f', 'mp3']
    else:
        cmd += ['-c:a', 'pcm_s16le', '-f', 'wav']
    cmd.append(str(tmp))
    label = 'BGM' if bgm else 'SE '
    print(f'  [{label} {target:+4.0f} LUFS] {rel}')
    if DRY:
        return
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        print(f'    !! ffmpeg failed: {r.stderr.strip()[:200]}')
        if tmp.exists(): tmp.unlink()
        return False
    # 置き換え
    src.unlink()
    tmp.rename(src)
    return True

def main():
    files = []
    for t in TARGETS:
        if not t.exists(): continue
        for p in t.rglob('*'):
            if p.is_file() and p.suffix.lower() in EXTS:
                files.append(p)
    files.sort()
    print(f'Targets: {len(files)} files'
          f' (BGM={-18} LUFS / SE={-14} LUFS)'
          f'{" DRY-RUN" if DRY else ""}')
    print(f'Backup dir: {BACKUP}')
    ok = fail = 0
    for src in files:
        rel = src.relative_to(ROOT / 'assets')
        try:
            res = process(src, rel)
            if res is False: fail += 1
            else: ok += 1
        except Exception as e:
            print(f'    !! exception: {e}')
            fail += 1
    print(f'Done: {ok} OK / {fail} FAIL')

if __name__ == '__main__':
    main()
