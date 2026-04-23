"""
storyboard generator の action_log.jsonl が pono-asobiba 側の session_id で
どの程度汚染されているかを計測する一回限りの監査スクリプト。

出力のみ。削除・書き換えは行わない。
"""
from __future__ import annotations

import json
import sys
from collections import Counter
from pathlib import Path

if sys.stdout.encoding != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")

CLAUDE_PROJECTS = Path.home() / ".claude" / "projects"
STORYBOARD_DIR = CLAUDE_PROJECTS / "d--AppDevelopment-storyboard-generator"
PONO_DIR = CLAUDE_PROJECTS / "d--AppDevelopment-pono-asobiba-app"
PONO_OLD_DIR = CLAUDE_PROJECTS / "D--AppDevelopment-kids-writing-app"

ACTION_LOG = Path("d:/AppDevelopment/storyboard generator/logs/action_log.jsonl")


def collect_session_ids(project_dir: Path) -> set[str]:
    if not project_dir.is_dir():
        return set()
    return {p.stem for p in project_dir.glob("*.jsonl")}


def main() -> None:
    storyboard_ids = collect_session_ids(STORYBOARD_DIR)
    pono_ids = collect_session_ids(PONO_DIR)
    pono_old_ids = collect_session_ids(PONO_OLD_DIR)

    print(f"[legit storyboard session_ids]   {len(storyboard_ids)}")
    print(f"[pono-asobiba-app session_ids]   {len(pono_ids)}")
    print(f"[kids-writing-app session_ids]   {len(pono_old_ids)}")
    print(f"[action_log]                     {ACTION_LOG}")
    if not ACTION_LOG.exists():
        print("action_log.jsonl not found")
        return

    buckets: Counter[str] = Counter()
    ts_by_bucket: dict[str, list[str]] = {}
    unknown_ids: Counter[str] = Counter()
    total = 0

    with ACTION_LOG.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            total += 1
            try:
                entry = json.loads(line)
            except json.JSONDecodeError:
                buckets["__malformed__"] += 1
                continue
            sid = entry.get("session_id", "")
            ts = entry.get("timestamp", "")
            if sid in storyboard_ids:
                bucket = "legit_storyboard"
            elif sid in pono_ids:
                bucket = "pono_current"
            elif sid in pono_old_ids:
                bucket = "pono_old"
            else:
                bucket = "unknown"
                unknown_ids[sid] += 1
            buckets[bucket] += 1
            ts_by_bucket.setdefault(bucket, []).append(ts)

    print()
    print(f"total entries: {total}")
    for name, n in buckets.most_common():
        stamps = sorted(t for t in ts_by_bucket.get(name, []) if t)
        first = stamps[0] if stamps else ""
        last = stamps[-1] if stamps else ""
        print(f"  {name:20s} {n:6d}   first={first}   last={last}")

    if unknown_ids:
        print()
        print(f"[unknown session_ids] {len(unknown_ids)} distinct")
        for sid, n in unknown_ids.most_common(5):
            print(f"  {sid}  x {n}")


if __name__ == "__main__":
    main()
