import json, sys
sys.stdout.reconfigure(encoding='utf-8')

src = r"D:\ポノのおへや\Dr.owl'quiz\op-layout-2026-05-11-06-49-00.json"
dst = r"d:\AppDevelopment\pono-asobiba-app\quizland\saved-layout.json"

with open(src, 'r', encoding='utf-8') as f:
    src_data = json.load(f)
with open(dst, 'r', encoding='utf-8') as f:
    dst_data = json.load(f)

new_layout = src_data['layout']
cur_layout = dst_data['__op_layout']

def diff(path, a, b, out):
    if type(a) != type(b):
        out.append((path, a, b))
        return
    if isinstance(a, dict):
        keys = set(a.keys()) | set(b.keys())
        for k in sorted(keys):
            if k not in a:
                out.append((path + '.' + k, '<missing>', b[k]))
            elif k not in b:
                out.append((path + '.' + k, a[k], '<missing>'))
            else:
                diff(path + '.' + k, a[k], b[k], out)
    elif isinstance(a, list):
        if len(a) != len(b):
            out.append((path, f'list len {len(a)}', f'list len {len(b)}'))
        for i, (x, y) in enumerate(zip(a, b)):
            diff(f'{path}[{i}]', x, y, out)
    else:
        if a != b:
            out.append((path, a, b))

diffs = []
diff('__op_layout', cur_layout, new_layout, diffs)
print(f"Total diff entries: {len(diffs)}")
for path, old, new in diffs:
    print(f"  {path}")
    print(f"    OLD (v934): {json.dumps(old, ensure_ascii=False)}")
    print(f"    NEW (06-49-00): {json.dumps(new, ensure_ascii=False)}")

# Also show unchanged kurumi.perVariant counts as sanity check
print()
print("=== Sanity (kurumi.perVariant counts) ===")
for vc in ['B', 'C', 'D']:
    print(f"  {vc}: cur={len(cur_layout[vc]['kurumi']['perVariant'])} new={len(new_layout[vc]['kurumi']['perVariant'])}")
