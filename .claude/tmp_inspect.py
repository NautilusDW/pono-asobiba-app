import json, os, sys
sys.stdout.reconfigure(encoding='utf-8')

src = r"D:\ポノのおへや\Dr.owl'quiz\op-layout-2026-05-11-06-49-00.json"
dst = r"d:\AppDevelopment\pono-asobiba-app\quizland\saved-layout.json"

with open(src, 'r', encoding='utf-8') as f:
    src_data = json.load(f)

with open(dst, 'r', encoding='utf-8') as f:
    dst_data = json.load(f)

print("=== SRC layout structure ===")
print("schema:", src_data.get('schema'))
print("exportedAt:", src_data.get('exportedAt'))
src_layout = src_data['layout']
print("VC keys in src.layout:", list(src_layout.keys()))
for vc in src_layout.keys():
    print(f"  {vc}: {list(src_layout[vc].keys())}")
    if 'kurumi' in src_layout[vc]:
        kurumi = src_layout[vc]['kurumi']
        print(f"    kurumi keys: {list(kurumi.keys())}")
        if 'perVariant' in kurumi:
            pv = kurumi['perVariant']
            print(f"    perVariant entries ({len(pv)}): {list(pv.keys())}")

print()
print("=== DST top-level structure ===")
print("Total top-level keys:", len(dst_data.keys()))
print("Has __op_layout:", '__op_layout' in dst_data)
op = dst_data.get('__op_layout', {})
print("__op_layout keys:", list(op.keys()))
for vc in op.keys():
    print(f"  {vc}: {list(op[vc].keys()) if isinstance(op[vc], dict) else type(op[vc])}")
    if isinstance(op[vc], dict) and 'kurumi' in op[vc]:
        kurumi = op[vc]['kurumi']
        print(f"    kurumi keys: {list(kurumi.keys())}")
        if 'perVariant' in kurumi:
            pv = kurumi['perVariant']
            print(f"    perVariant entries ({len(pv)}): {list(pv.keys())}")
