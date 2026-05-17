"""Merge _phase2_dynamic_entries_v2.json into assets/tts/manifest.json.

Preserves existing entries and key ordering (Python dict insertion order).
"""
import json
from pathlib import Path

ROOT = Path(r"d:/AppDevelopment/pono-asobiba-app")
MANIFEST = ROOT / "assets/tts/manifest.json"
NEW_ENTRIES = ROOT / "tools/voicepeak/_phase2_dynamic_entries_v2.json"


def main():
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    new = json.loads(NEW_ENTRIES.read_text(encoding='utf-8'))

    entries = manifest['entries']
    before = len(entries)
    added = 0
    for key, val in new.items():
        if key in entries:
            print(f"SKIP duplicate: {key}")
            continue
        entries[key] = val
        added += 1

    # Sort keys alphabetically to keep manifest tidy
    sorted_entries = dict(sorted(entries.items()))
    manifest['entries'] = sorted_entries

    # Write with the same indentation style as existing
    out_text = json.dumps(manifest, ensure_ascii=False, indent=2) + "\n"
    MANIFEST.write_text(out_text, encoding='utf-8')

    print(f"Before: {before}, Added: {added}, After: {len(sorted_entries)}")


if __name__ == '__main__':
    main()
