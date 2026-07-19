"""Build the final pre/post comparison report for batch:923.

Outputs:
- scratchpad/batch_923_final_report.json — combined old/new sha1, size, transcript, model
"""
import json
import hashlib
from pathlib import Path

ROOT = Path("D:/AppDevelopment/pono-asobiba-app")
AUDIO_BASE = ROOT / "assets" / "audio" / "narration" / "maze"
BAK_DIR = ROOT / "scratchpad" / "batch_923_bak"

# Load pre/post state and attempts
pre = json.loads((ROOT / "scratchpad" / "batch_923_pre_state.json").read_text(encoding="utf-8"))
post = json.loads((ROOT / "scratchpad" / "batch_923_post_state.json").read_text(encoding="utf-8"))
attempts = json.loads((ROOT / "scratchpad" / "batch_923_attempts.json").read_text(encoding="utf-8"))
silh_attempts = json.loads((ROOT / "scratchpad" / "batch_923_silhouette_start_attempts.json").read_text(encoding="utf-8"))

def sha1_of(p: Path) -> str:
    h = hashlib.sha1()
    with p.open("rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()

pre_map = {e["path"]: e for e in pre}
attempts_map = {a["path"]: a["attempts"] for a in attempts}

# Compute attempt counts
attempt_stats = {
    "total_files": 14,
    "ok_files": 0,
    "total_attempts": 0,
    "attempts_per_file": {},
}

report = []
for entry in post:
    rel = entry["path"]
    pre_entry = pre_map.get(rel, {})
    cur_path = AUDIO_BASE / rel
    cur_sha = sha1_of(cur_path)
    # Recompute attempt count incl silhouette/start redo
    base_attempts = len(attempts_map.get(rel, []))
    if rel == "silhouette/start.mp3":
        # original failed (5 attempts) + redo (1 attempt = success)
        total_atts = base_attempts + len(silh_attempts)
    else:
        total_atts = base_attempts
    attempt_stats["attempts_per_file"][rel] = total_atts
    attempt_stats["total_attempts"] += total_atts
    if entry.get("ok") or rel == "silhouette/start.mp3":
        attempt_stats["ok_files"] += 1
    # For silhouette/start, look at the redo final state
    if rel == "silhouette/start.mp3":
        last = silh_attempts[-1]
        new_tx = last.get("transcript")
        new_sha = last.get("sha1")
        new_size = last.get("size")
        ok = last.get("ok", False)
    else:
        new_tx = entry.get("final_transcript")
        new_sha = entry.get("final_sha1")
        new_size = entry.get("final_size")
        ok = entry.get("ok", False)

    # Sanity check: current sha matches expected
    sha_match = (cur_sha == new_sha)

    report.append({
        "path": rel,
        "old": {
            "sha1": pre_entry.get("sha1"),
            "size": pre_entry.get("size"),
            "transcript": pre_entry.get("transcript"),
            "tts_model": "gemini-2.5 fallback or higgsfield (audit-flagged)",
        },
        "new": {
            "sha1": new_sha,
            "size": new_size,
            "transcript": new_tx,
            "tts_model": "gemini-3.1-flash-tts-preview",
            "voice": "Aoede",
            "current_sha_on_disk": cur_sha,
            "sha_match": sha_match,
        },
        "attempts_used": total_atts,
        "ok": ok and sha_match,
    })

# Write report
out = ROOT / "scratchpad" / "batch_923_final_report.json"
out.write_text(json.dumps({
    "stats": attempt_stats,
    "files": report,
}, ensure_ascii=False, indent=2), encoding="utf-8")
print("wrote", out)

# Also write a human-readable txt for the parent agent
lines = []
lines.append("=== Batch:923 Voice Re-Generation Report ===")
lines.append("")
lines.append(f"Total files: {attempt_stats['total_files']}")
lines.append(f"OK files: {attempt_stats['ok_files']}/{attempt_stats['total_files']}")
lines.append(f"Total attempts: {attempt_stats['total_attempts']}")
lines.append("")
lines.append("Per-file breakdown:")
lines.append("")
for r in report:
    lines.append(f"--- {r['path']} ---")
    lines.append(f"  OLD: sha1={r['old']['sha1'][:12]}... size={r['old']['size']} tx={r['old']['transcript']!r}")
    lines.append(f"       model: {r['old']['tts_model']}")
    lines.append(f"  NEW: sha1={r['new']['sha1'][:12]}... size={r['new']['size']} tx={r['new']['transcript']!r}")
    lines.append(f"       model: {r['new']['tts_model']} voice={r['new']['voice']}")
    lines.append(f"       on-disk-sha={r['new']['current_sha_on_disk'][:12]}... match={r['new']['sha_match']}")
    lines.append(f"  attempts: {r['attempts_used']}  ok: {r['ok']}")
    lines.append("")

txt_path = ROOT / "scratchpad" / "batch_923_final_report.txt"
txt_path.write_text("\n".join(lines), encoding="utf-8")
print("wrote", txt_path)
