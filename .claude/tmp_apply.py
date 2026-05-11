import json, sys, io
sys.stdout.reconfigure(encoding='utf-8')

src = r"D:\ポノのおへや\Dr.owl'quiz\op-layout-2026-05-11-06-49-00.json"
dst = r"d:\AppDevelopment\pono-asobiba-app\quizland\saved-layout.json"

with open(src, 'r', encoding='utf-8') as f:
    src_data = json.load(f)
with open(dst, 'r', encoding='utf-8') as f:
    dst_data = json.load(f)

new_layout = src_data['layout']

# Capture pre-counts
before_total_keys = len(dst_data.keys())
before_other_keys = sorted([k for k in dst_data.keys() if k != '__op_layout'])
before_pv = {vc: list(dst_data['__op_layout'][vc]['kurumi']['perVariant'].keys()) for vc in ['B','C','D']}

# Preserve guard: ensure new layout has all 13 perVariant entries; if any missing, keep old
EXPECTED_VARIANTS = ['kurumi_001','kurumi_hi','kurumi_wave','kurumi_hooray','kurumi_wink','kurumi_clasp','kurumi_idea','kurumi_point','kurumi_calm','kurumi_pray','kurumi_book','kurumi_cheer','kurumi_greet']
for vc in ['B','C','D']:
    new_pv = new_layout[vc]['kurumi'].get('perVariant', {})
    cur_pv = dst_data['__op_layout'][vc]['kurumi'].get('perVariant', {})
    merged_pv = {}
    for k in EXPECTED_VARIANTS:
        if k in new_pv:
            merged_pv[k] = new_pv[k]
        elif k in cur_pv:
            print(f"[preserve] {vc}.kurumi.perVariant.{k} missing in new -> keeping old")
            merged_pv[k] = cur_pv[k]
        else:
            print(f"[warn] {vc}.kurumi.perVariant.{k} missing in BOTH")
    new_layout[vc]['kurumi']['perVariant'] = merged_pv

# Replace __op_layout B/C/D only
for vc in ['B','C','D']:
    dst_data['__op_layout'][vc] = new_layout[vc]

# Sanity: post checks
after_total_keys = len(dst_data.keys())
after_other_keys = sorted([k for k in dst_data.keys() if k != '__op_layout'])
after_pv = {vc: list(dst_data['__op_layout'][vc]['kurumi']['perVariant'].keys()) for vc in ['B','C','D']}

assert before_total_keys == after_total_keys, f"top-level key count changed: {before_total_keys} -> {after_total_keys}"
assert before_other_keys == after_other_keys, "non-__op_layout keys changed!"
for vc in ['B','C','D']:
    assert len(after_pv[vc]) == 13, f"{vc} perVariant count != 13"
    assert set(after_pv[vc]) == set(EXPECTED_VARIANTS), f"{vc} perVariant set mismatch"

# Write back. Need to preserve formatting style of original. Let's check original indent.
# We'll use indent=2 (common for this file) — verify after.
with open(dst, 'w', encoding='utf-8') as f:
    json.dump(dst_data, f, ensure_ascii=False, indent=2)
    f.write('\n')

print("OK total_keys:", after_total_keys)
print("OK perVariant counts:", {vc: len(after_pv[vc]) for vc in ['B','C','D']})
print("OK preserved", len(after_other_keys), "non-__op_layout keys")
