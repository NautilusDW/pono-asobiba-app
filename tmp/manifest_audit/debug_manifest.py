import json, subprocess, pathlib, re
from collections import defaultdict
ROOT = pathlib.Path(r'd:\AppDevelopment\pono-asobiba-app')
TMP = ROOT / 'tmp' / 'manifest_audit'
TMP.mkdir(parents=True, exist_ok=True)

def load_json(path):
    return json.loads((ROOT / path).read_text(encoding='utf-8'))

node_code = r'''
const fs = require('fs');
const vm = require('vm');
const text = fs.readFileSync('quizland/data/questions.js','utf8');
const ctx = {};
vm.createContext(ctx);
vm.runInContext(text + '\nthis.OUT = { questions: QUIZLAND_QUESTIONS, colors: QUIZLAND_COLORS, categories: QUIZLAND_CATEGORIES };', ctx);
console.log(JSON.stringify(ctx.OUT));
'''
questions_data = json.loads(subprocess.check_output(['node', '-e', node_code], cwd=str(ROOT), text=True, encoding='utf-8'))
questions = questions_data['questions']
colors = questions_data['colors']

assignment = json.loads((ROOT / 'tmp' / 'codex_assignment_external.json').read_text(encoding='utf-8-sig'))
illustration_list = load_json('quizland/data/_review/illustration-list.json')
sheets_index = load_json('quizland/data/_review/_sheets_index.json')
disk_inventory = load_json('quizland/data/_review/_disk_inventory.json')
choice_map_auto = load_json('quizland/data/_review/_choice_jp_to_id.json')['jp_to_id']
choice_map_over = load_json('quizland/data/_review/_choice_jp_to_id_overrides.json')['jp_to_id']
handoff_audit = load_json('quizland/data/_review/_handoff_audit.json')

all_quiz_pngs = disk_inventory['items']
all_paths = {item['save_path'] for item in all_quiz_pngs}
legacy_paths = []
for base in ['assets/images/ocean', 'assets/images/word']:
    for p in (ROOT / base).rglob('*.png'):
        legacy_paths.append(p.relative_to(ROOT).as_posix())
legacy_paths = sorted(set(legacy_paths))

def normalize_text(s):
    return re.sub(r'\s+', '', s).replace('葉', 'は').replace('つばさ', 'はね').replace('チョウチョ', 'チョウ').replace('ちょうちょ', 'チョウ')

norm_auto = {normalize_text(k): v for k, v in choice_map_auto.items()}
norm_over = {normalize_text(k): v for k, v in choice_map_over.items()}

def map_choice_text(text):
    if text in choice_map_over:
        return choice_map_over[text]
    if text in choice_map_auto:
        return choice_map_auto[text]
    n = normalize_text(text)
    if n in norm_over:
        return norm_over[n]
    if n in norm_auto:
        return norm_auto[n]
    return None

choice_refs = defaultdict(list)
for cat, arr in questions.items():
    for idx, q in enumerate(arr):
        ref = f"{cat}/level{q.get('level')}/idx{idx}"
        for choice in q.get('choices', []):
            choice_refs[choice].append(ref)

id_to_choice_labels = defaultdict(set)
for choice in choice_refs:
    mapped = map_choice_text(choice)
    if mapped:
        id_to_choice_labels[mapped].add(choice)

print(type(illustration_list), list(illustration_list.keys())[:3])
for item in all_quiz_pngs[:3]:
    print(item)

for item in all_quiz_pngs:
    iid = item['id']
    labels = set()
    labels |= id_to_choice_labels.get(iid, set())
print('ok labels loop')
