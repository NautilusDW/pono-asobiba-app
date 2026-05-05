import json
import pathlib
import re
import subprocess
from collections import defaultdict

ROOT = pathlib.Path(r"d:\AppDevelopment\pono-asobiba-app")
TMP = ROOT / "tmp" / "manifest_audit"
TMP.mkdir(parents=True, exist_ok=True)


def load_json(relpath: str):
    path = ROOT / relpath
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return json.loads(path.read_text(encoding="utf-8-sig"))


node_code = r"""
const fs = require('fs');
const vm = require('vm');
const text = fs.readFileSync('quizland/data/questions.js','utf8');
const ctx = {};
vm.createContext(ctx);
vm.runInContext(text + '\nthis.OUT = { questions: QUIZLAND_QUESTIONS, colors: QUIZLAND_COLORS, categories: QUIZLAND_CATEGORIES };', ctx);
console.log(JSON.stringify(ctx.OUT));
"""
questions_data = json.loads(
    subprocess.check_output(
        ["node", "-e", node_code],
        cwd=str(ROOT),
        text=True,
        encoding="utf-8",
    )
)
questions = questions_data["questions"]
colors = questions_data["colors"]

assignment = load_json("tmp/codex_assignment_fixed.json")
illustration_list = load_json("quizland/data/_review/illustration-list.json")
sheets_index = load_json("quizland/data/_review/_sheets_index.json")
disk_inventory = load_json("quizland/data/_review/_disk_inventory.json")
choice_map_auto = load_json("tmp/choice_jp_to_id_fixed.json")["jp_to_id"]
choice_map_over = load_json("tmp/choice_jp_to_id_overrides_fixed.json")["jp_to_id"]
handoff_audit = load_json("quizland/data/_review/_handoff_audit.json")

all_quiz_pngs = disk_inventory["items"]
all_paths = {item["save_path"] for item in all_quiz_pngs}
legacy_paths = sorted(
    {
        p.relative_to(ROOT).as_posix()
        for base in ["assets/images/ocean", "assets/images/word"]
        for p in (ROOT / base).rglob("*.png")
    }
)


def choice_text_of(choice):
    return choice.get("text") if isinstance(choice, dict) else choice


def normalize_text(value):
    return (
        re.sub(r"\s+", "", str(value))
        .replace("葉", "は")
        .replace("つばさ", "はね")
        .replace("チョウチョ", "チョウ")
        .replace("ちょうちょ", "チョウ")
    )


norm_auto = {normalize_text(k): v for k, v in choice_map_auto.items()}
norm_over = {normalize_text(k): v for k, v in choice_map_over.items()}


def map_choice_text(text):
    if text in choice_map_over:
        return choice_map_over[text]
    if text in choice_map_auto:
        return choice_map_auto[text]
    normalized = normalize_text(text)
    if normalized in norm_over:
        return norm_over[normalized]
    if normalized in norm_auto:
        return norm_auto[normalized]
    return None


choice_refs = defaultdict(list)
for category, items in questions.items():
    for idx, question in enumerate(items):
        ref = f"{category}/level{question.get('level')}/idx{idx}"
        for choice in question.get("choices", []):
            choice_refs[choice_text_of(choice)].append(ref)

id_to_choice_labels = defaultdict(set)
for choice_text in choice_refs:
    mapped = map_choice_text(choice_text)
    if mapped:
        id_to_choice_labels[mapped].add(choice_text)

color_labels = {f"color_{k}": [k] for k in colors.keys()}
shape_labels = {
    "shape_circle": ["まる"],
    "shape_square": ["しかく"],
    "shape_triangle": ["さんかく"],
    "shape_star": ["ほし"],
    "shape_heart": ["ハート"],
    "shape_rectangle": ["ながしかく"],
    "shape_diamond": ["ダイヤのかたち"],
    "shape_oval": ["たまごがた"],
}
weather_folder_labels = {
    "weather_rainbow_count": ["にじ"],
    "weather_puddle": ["あめのあと", "みずたまり"],
    "weather_snowflake": ["つの が 6つ ある かたち", "ゆき"],
    "weather_typhoon": ["たいふう"],
}
animal_folder_labels = {
    "animal_penguin": ["ペンギン"],
}
legacy_choice_labels = {
    "face_draw": ["なく"],
    "face_sleep": ["がっかり"],
}
choice_label_override = {
    "ear_long_up": ["ながくて たっている"],
    "ear_pointed_small": ["とがって ちいさい"],
    "ear_round_short": ["まるくて みじかい"],
    "ear_round_small": ["まるい ちいさい"],
    "face_angry2": ["おこる"],
    "face_ear": ["みみ"],
    "face_nose": ["はな"],
    "neko": ["ねこ"],
    "snowflake_hex": ["つの が 6つ ある かたち"],
    "snowflake_star": ["ほし"],
    "star": ["ほし"],
}
stage_labels = {
    "stage_weather_cloud_sky": ["くもり", "くも"],
    "stage_weather_rain_from_cloud": ["あめ", "くも"],
    "stage_weather_rainbow_arc": ["にじ"],
    "stage_weather_puddle": ["みずたまり", "あめのあと"],
    "stage_weather_thunder": ["かみなり"],
    "stage_weather_snowflake_big": ["つの が 6つ ある かたち", "ゆき"],
    "stage_opposite_standing": ["たつ", "すわる"],
    "stage_opposite_open_door": ["あける", "しめる"],
    "stage_opposite_night_sky": ["よる", "あさ", "まよなか"],
    "stage_opposite_high_low": ["たかい", "ひくい"],
    "stage_opposite_thick_thin": ["ふとい", "ほそい"],
    "stage_opposite_hard_soft": ["かたい", "やわらかい"],
    "stage_opposite_strong_weak": ["つよい", "よわい"],
    "stage_opposite_cry_smile": ["なく", "わらう"],
    "stage_opposite_many_few": ["おおい", "すくない", "たくさん", "すこし"],
    "stage_opposite_light_heavy": ["かるい", "おもい"],
    "stage_opposite_bright_dark": ["あかるい", "くらい"],
    "stage_opposite_new_old": ["あたらしい", "ふるい"],
    "stage_opposite_praise": ["ほめる", "しかる"],
    "stage_trivia_ripe_banana": ["バナナ", "きいろ"],
    "stage_trivia_meowing_cat": ["ねこ", "ニャーニャー"],
    "stage_trivia_long_nose_elephant": ["ぞう", "はな"],
    "stage_trivia_snowy_landscape": ["ゆき"],
    "stage_trivia_hatching_egg": ["にわとり", "たまご"],
    "stage_trivia_red_apple": ["りんご", "あか"],
    "stage_trivia_rabbit": ["うさぎ", "ながくて たっている"],
    "stage_trivia_four_birds_silhouette": ["タカ", "ペンギン", "ハト", "ツバメ"],
    "stage_trivia_running_cheetah": ["チーター"],
    "stage_trivia_sleeping_bear_cave": ["クマ"],
    "stage_trivia_earthworm_after_rain": ["ミミズ"],
    "stage_trivia_koala_eucalyptus": ["ユーカリの は", "コアラ"],
    "stage_trivia_ocean_silhouettes_4": ["マグロ", "クジラ", "ジンベイザメ", "サメ"],
    "stage_trivia_dolphin": ["イルカ", "クジラ"],
    "stage_trivia_huge_creatures_compare": ["ゾウ", "ジンベイザメ", "シロナガスクジラ", "ダイオウイカ"],
    "stage_trivia_spider_eyes": ["クモ"],
    "stage_trivia_flamingo": ["フラミンゴ", "あかい たべものを たべる"],
    "stage_trivia_male_lion": ["ライオン", "たてがみ"],
    "stage_body_skin_wrap": ["ひふ"],
    "stage_body_heart_pump": ["しんぞう"],
    "stage_body_chewing_teeth": ["は"],
    "stage_body_lungs_breath": ["はい"],
    "stage_body_teeth_bone_compare": ["は", "ほね"],
}
count_labels = {
    "ringo": ["りんご"],
    "ichigo": ["いちご"],
    "hana": ["おはな"],
    "hoshi": ["おほしさま"],
    "mikan": ["みかん"],
}

source_sheet_override = {
    "assets/images/quizland/illust/choice/cloud.png": "choice_weather_cloud_set",
    "assets/images/quizland/illust/choice/face_draw.png": "choice_opposite_face_emotion_set",
    "assets/images/quizland/illust/choice/face_sleep.png": "choice_opposite_face_emotion_set",
}
subject_override = {
    "assets/images/quizland/illust/choice/face_draw.png": "推測: 旧ファイル名だが内容は泣いている子どもの顔。涙がぽろっと流れ、口が「へ」の字の泣き顔。",
    "assets/images/quizland/illust/choice/face_sleep.png": "推測: 旧ファイル名だが内容はがっかりしている子どもの顔。目と眉が下がり、涙なしのしょんぼり顔。",
    "assets/images/quizland/illust/_sheets/sheet_colors.png": "8色の色チップを4x2で並べたシート。赤・青・黄・緑・ピンク・オレンジ・紫・みずいろ。",
    "assets/images/quizland/illust/_sheets/sheet_shapes.png": "8つの基本図形を4x2で並べたシート。まる・しかく・さんかく・ほし・ハート・ながしかく・ダイヤのかたち・たまごがた。",
    "assets/images/quizland/illust/_sheets/sheet_weather.png": "4つの天気情景を2x2で並べたシート。にじ、みずたまり、雪の結晶、台風の渦。",
    "assets/images/quizland/illust/animal/animal_penguin.png": "ペンギン1羽の全身。雪の上で立つ、丸みのある子ども向けのやさしい姿。",
    "assets/images/quizland/illust/weather/weather_rainbow_count.png": "7色の虹が弧を描く横長の情景。色の本数を数えやすい構図。",
    "assets/images/quizland/illust/weather/weather_puddle.png": "雨上がりの地面にできた小さなみずたまり。反射と波紋が少し見える。",
    "assets/images/quizland/illust/weather/weather_snowflake.png": "六角形を強調した大きな雪の結晶。白から水色の繊細な模様。",
    "assets/images/quizland/illust/weather/weather_typhoon.png": "上空から見た台風の渦。中央の目と白い渦巻きがわかる情景。",
}

subject_by_path = {}
source_sheet_by_path = {}
for sheet in assignment.get("sheets_existing_overwrite", []) + assignment.get("sheets_choice", []):
    subject_by_path[sheet["output_path"]] = sheet.get("subject_detailed") or sheet.get("purpose", "")
    for crop in sheet.get("crops", []):
        subject_by_path[crop["save_path"]] = crop.get("subject_detailed") or sheet.get("purpose", "")
        source_sheet_by_path[crop["save_path"]] = sheet["sheet_id"]
for stage in assignment.get("stages", []):
    subject_by_path[stage["save_path"]] = stage.get("subject_detailed") or stage.get("purpose", "")
for sheet in illustration_list.get("sheets", []):
    if sheet["output_path"] in all_paths:
        subject_by_path.setdefault(sheet["output_path"], sheet.get("purpose", ""))
    for crop in sheet.get("crops", []):
        if crop["save_path"] in all_paths:
            subject_by_path.setdefault(crop["save_path"], crop.get("id", ""))
            source_sheet_by_path.setdefault(crop["save_path"], sheet["sheet_id"])
for item in illustration_list.get("items", []):
    if item["save_path"] in all_paths:
        subject_by_path.setdefault(item["save_path"], item.get("prompt", ""))

subject_by_path.update(subject_override)
source_sheet_by_path.update(source_sheet_override)


def fallback_subject(item):
    path = item["save_path"]
    folder = item["folder"]
    item_id = item["id"]
    if path in subject_override:
        return subject_override[path]
    if folder == "color":
        return f"{item_id.replace('color_', '')} の単色カラーチップ1枚。丸みのある四角で、色を一目で識別できる。"
    if folder == "shape":
        return f"{shape_labels.get(item_id, [item_id])[0]} の基本図形1枚。中央配置で輪郭がはっきりしたシンプルな形。"
    if folder == "_sheets" and item_id.startswith("choice_"):
        return f"{item_id} の4択用シート。4つの選択肢を横並びでまとめた生成元。"
    if folder == "_sheets":
        return f"{item_id} の生成元シート。複数の素材を一覧できる構成。"
    if folder == "choice":
        return f"{item_id} の4択アイコン。小さく表示しても判別しやすい単体イラスト。"
    if folder == "stage":
        return f"{item_id} のステージ用情景イラスト。問題ボード中央で使う大きな絵。"
    return item_id


sheet_crop_labels = defaultdict(set)
for item in all_quiz_pngs:
    item_id = item["id"]
    labels = set(id_to_choice_labels.get(item_id, set()))
    if item_id in legacy_choice_labels:
        labels |= set(legacy_choice_labels[item_id])
    if item_id in choice_label_override:
        labels |= set(choice_label_override[item_id])
    if item_id in color_labels:
        labels |= set(color_labels[item_id])
    if item_id in shape_labels:
        labels |= set(shape_labels[item_id])
    if item_id in weather_folder_labels:
        labels |= set(weather_folder_labels[item_id])
    if item_id in animal_folder_labels:
        labels |= set(animal_folder_labels[item_id])
    if item_id in stage_labels:
        labels |= set(stage_labels[item_id])
    if item_id in count_labels:
        labels |= set(count_labels[item_id])
    if item["save_path"] in source_sheet_by_path:
        sheet_crop_labels[source_sheet_by_path[item["save_path"]]] |= labels
    item["_labels"] = sorted(labels)

for item in all_quiz_pngs:
    if item["folder"] == "_sheets":
        item["_labels"] = sorted(sheet_crop_labels.get(item["id"], []))

special_concepts = {
    "face_draw": {"emotion:cry"},
    "face_sleep": {"emotion:disappointed"},
    "face_smile": {"emotion:smile"},
    "face_angry": {"emotion:angry"},
    "face_angry2": {"emotion:angry"},
    "weather_rainbow_count": {"weather:rainbow"},
    "weather_puddle": {"weather:puddle"},
    "weather_snowflake": {"weather:snowflake"},
    "weather_typhoon": {"weather:hurricane"},
    "animal_penguin": {"bird:penguin"},
    "stage_weather_cloud_sky": {"weather:cloud"},
    "stage_weather_rain_from_cloud": {"weather:rain"},
    "stage_weather_rainbow_arc": {"weather:rainbow"},
    "stage_weather_puddle": {"weather:puddle"},
    "stage_weather_thunder": {"weather:thunder"},
    "stage_weather_snowflake_big": {"weather:snowflake"},
    "stage_opposite_cry_smile": {"emotion:cry", "emotion:smile"},
    "stage_trivia_ripe_banana": {"food:banana"},
    "stage_trivia_meowing_cat": {"animal:cat"},
    "stage_trivia_long_nose_elephant": {"animal:elephant", "body:nose"},
    "stage_trivia_snowy_landscape": {"weather:snowflake"},
    "stage_trivia_hatching_egg": {"animal:chicken"},
    "stage_trivia_red_apple": {"food:apple", "color:red"},
    "stage_trivia_rabbit": {"animal:rabbit"},
    "stage_trivia_four_birds_silhouette": {"bird:eagle", "bird:penguin", "bird:pigeon", "bird:swallow"},
    "stage_trivia_running_cheetah": {"animal:cheetah"},
    "stage_trivia_sleeping_bear_cave": {"animal:bear"},
    "stage_trivia_earthworm_after_rain": {"animal:earthworm"},
    "stage_trivia_koala_eucalyptus": {"food:eucalyptus_leaf"},
    "stage_trivia_ocean_silhouettes_4": {"fish:tuna", "animal:whale", "fish:whale_shark", "fish:shark"},
    "stage_trivia_dolphin": {"animal:dolphin", "animal:whale"},
    "stage_trivia_huge_creatures_compare": {"animal:elephant", "fish:whale_shark", "animal:blue_whale", "animal:giant_squid"},
    "stage_trivia_spider_eyes": {"animal:spider", "body:eye"},
    "stage_trivia_flamingo": {"bird:flamingo"},
    "stage_trivia_male_lion": {"animal:lion"},
    "stage_body_skin_wrap": {"body:skin"},
    "stage_body_heart_pump": {"body:heart"},
    "stage_body_chewing_teeth": {"body:teeth", "body:mouth"},
    "stage_body_lungs_breath": {"body:lungs"},
    "stage_body_teeth_bone_compare": {"body:teeth", "body:bone"},
}


def concepts_for(item):
    item_id = item["id"]
    concepts = set(special_concepts.get(item_id, set()))
    if item_id.startswith("color_"):
        concepts.add("color:" + item_id.split("_", 1)[1])
    elif item_id.startswith("color_dot_"):
        concepts.add("color:" + item_id.split("_", 2)[2])
    elif item_id.startswith("shape_"):
        concepts.add("shape:" + item_id.split("_", 1)[1])
    elif item_id == "cloud":
        concepts.add("weather:cloud")
    elif item_id == "rain_drop":
        concepts.add("weather:rain")
    elif item_id in {"snow_flake", "snowflake_round", "snowflake_star", "snowflake_hex", "snowflake_square"}:
        concepts.add("weather:snowflake")
    elif item_id == "sky":
        concepts.add("weather:sky")
    elif item_id == "mountain":
        concepts.add("nature:mountain")
    elif item_id == "ocean":
        concepts.add("nature:ocean")
    elif item_id == "neko":
        concepts.add("animal:cat")
    elif item_id == "inu":
        concepts.add("animal:dog")
    elif item_id == "ushi":
        concepts.add("animal:cow")
    elif item_id == "niwatori":
        concepts.add("animal:chicken")
    elif item_id == "zou":
        concepts.add("animal:elephant")
    elif item_id == "usagi":
        concepts.add("animal:rabbit")
    elif item_id == "kuma":
        concepts.add("animal:bear")
    elif item_id == "kirin":
        concepts.add("animal:giraffe")
    elif item_id == "lion":
        concepts.add("animal:lion")
    elif item_id == "iruka":
        concepts.add("animal:dolphin")
    elif item_id == "kujira":
        concepts.add("animal:whale")
    elif item_id == "banana":
        concepts.add("food:banana")
    elif item_id == "ringo":
        concepts.add("food:apple")
    elif item_id == "ichigo":
        concepts.add("food:strawberry")
    elif item_id == "mikan":
        concepts.add("food:mikan")
    elif item_id in {"hoshi", "star"}:
        concepts.add("shape:star")
    elif item_id == "hana":
        concepts.add("nature:flower")
    elif item_id == "maguro":
        concepts.add("fish:tuna")
    elif item_id == "jinbeizame":
        concepts.add("fish:whale_shark")
    elif item_id == "same":
        concepts.add("fish:shark")
    elif item_id == "sakana":
        concepts.add("fish:generic")
    elif item_id == "tako":
        concepts.add("animal:octopus")
    elif item_id == "bluewhale":
        concepts.add("animal:blue_whale")
    elif item_id == "daiouika":
        concepts.add("animal:giant_squid")
    elif item_id == "penguin":
        concepts.add("bird:penguin")
    elif item_id == "taka":
        concepts.add("bird:eagle")
    elif item_id == "hato":
        concepts.add("bird:pigeon")
    elif item_id == "tsubame":
        concepts.add("bird:swallow")
    elif item_id == "cheetah":
        concepts.add("animal:cheetah")
    elif item_id == "mimizu":
        concepts.add("animal:earthworm")
    elif item_id == "kabutomushi":
        concepts.add("animal:beetle")
    elif item_id == "semi":
        concepts.add("animal:cicada")
    elif item_id == "chocho":
        concepts.add("animal:butterfly")
    elif item_id == "kumo":
        concepts.add("animal:spider")
    elif item_id == "batta":
        concepts.add("animal:grasshopper")
    elif item_id == "eucalyptus_leaf":
        concepts.add("food:eucalyptus_leaf")
    elif item_id == "takenoko":
        concepts.add("food:bamboo_shoot")
    elif item_id in {"part_nose", "face_nose"}:
        concepts.add("body:nose")
    elif item_id in {"part_ear", "face_ear"}:
        concepts.add("body:ear")
    elif item_id == "part_leg":
        concepts.add("body:leg")
    elif item_id == "part_tail":
        concepts.add("body:tail")
    elif item_id == "face_eye":
        concepts.add("body:eye")
    elif item_id == "face_mouth":
        concepts.add("body:mouth")
    elif item_id == "face_cheek":
        concepts.add("body:cheek")
    elif item_id == "face_forehead":
        concepts.add("body:forehead")
    elif item_id == "clothes":
        concepts.add("body:clothes")
    elif item_id == "skin":
        concepts.add("body:skin")
    elif item_id == "bone":
        concepts.add("body:bone")
    elif item_id in {"hair", "kaminoke"}:
        concepts.add("body:hair")
    elif item_id == "heart_organ":
        concepts.add("body:heart")
    elif item_id == "brain":
        concepts.add("body:brain")
    elif item_id == "stomach":
        concepts.add("body:stomach")
    elif item_id == "teeth":
        concepts.add("body:teeth")
    elif item_id == "lungs":
        concepts.add("body:lungs")
    elif item_id == "finger":
        concepts.add("body:finger")
    elif item_id == "tsume":
        concepts.add("body:nail")
    return concepts


legacy_aliases = {
    "weather:cloud": {"cloud", "kumo"},
    "weather:rain": {"rain"},
    "weather:rainbow": {"rainbow", "niji"},
    "weather:thunder": {"thunder"},
    "weather:snowflake": {"snow", "snowflake"},
    "weather:hurricane": {"hurricane", "typhoon"},
    "nature:ocean": {"ocean", "umi"},
    "nature:mountain": {"mountain", "yama"},
    "food:apple": {"apple", "ringo"},
    "food:banana": {"banana"},
    "food:strawberry": {"strawberry", "ichigo"},
    "food:mikan": {"orange", "mikan"},
    "food:eucalyptus_leaf": {"eucalyptus"},
    "animal:cat": {"cat", "neko"},
    "animal:dog": {"dog", "inu"},
    "animal:cow": {"cow", "ushi"},
    "animal:chicken": {"chicken", "niwatori", "chick"},
    "animal:elephant": {"elephant", "zou"},
    "animal:rabbit": {"rabbit", "usagi"},
    "animal:bear": {"bear", "kuma"},
    "animal:giraffe": {"giraffe", "kirin"},
    "animal:lion": {"lion"},
    "animal:dolphin": {"iruka"},
    "animal:whale": {"kujira"},
    "animal:blue_whale": {"bluewhale"},
    "fish:tuna": {"maguro"},
    "fish:whale_shark": {"jinbeizame"},
    "fish:shark": {"shark", "same"},
    "animal:octopus": {"octpus", "tako", "ika"},
    "animal:giant_squid": {"ika", "squid", "daiouika"},
    "animal:spider": {"spider", "kumo", "arachnid"},
    "animal:butterfly": {"butterfly", "chocho"},
    "animal:cicada": {"cicada", "semi"},
    "animal:beetle": {"beetle", "kabutomushi", "rhinoceros"},
    "animal:grasshopper": {"grasshopper", "batta", "cricket"},
    "animal:earthworm": {"earthworm", "mimizu"},
    "bird:penguin": {"penguin"},
    "bird:eagle": {"eagle", "taka"},
    "bird:pigeon": {"pigeon", "hato"},
    "bird:swallow": {"swallow", "tsubame"},
    "bird:flamingo": {"flamingo"},
    "body:eye": {"eyes", "eye", "eyeballs"},
    "body:mouth": {"mouth", "mouthpart", "mouth_part"},
    "body:ear": {"ear", "earpart", "ear_part"},
    "body:nose": {"nose", "nosepart", "nose_part"},
    "body:teeth": {"teeth"},
    "body:tongue": {"tongue"},
    "body:heart": {"heart"},
    "body:skin": {"skin"},
    "body:bone": {"bone", "bones"},
    "body:lungs": {"lungs"},
    "body:finger": {"finger", "fingertip"},
    "shape:star": {"star", "hoshi"},
}
legacy_tokens = {
    path: {token for token in re.split(r"[^a-z0-9]+", path.lower()) if token}
    for path in legacy_paths
}

manifest_entries = []
for item in all_quiz_pngs:
    item_id = item["id"]
    path = item["save_path"]
    labels = item["_labels"] or [item_id]
    subject = subject_by_path.get(path) or fallback_subject(item)
    if item_id in {"stage_opposite_standing", "stage_opposite_open_door", "stage_opposite_night_sky"} and "推測" not in subject:
        subject = "推測: jp_labels には問題文側の語を含む。 " + subject
    usage = ["choice"] if item["folder"] == "choice" else ["stage"]
    if item["folder"] == "_sheets":
        usage = ["choice"] if item_id.startswith("choice_") else ["stage"]
    manifest_entries.append(
        {
            "id": item_id,
            "save_path": path,
            "jp_labels": labels,
            "usage": usage,
            "source_sheet": source_sheet_by_path.get(path),
            "subject_detailed": subject,
            "alternatives": [],
            "status": "generated",
            "_concepts": concepts_for(item),
        }
    )

for entry in manifest_entries:
    alternatives = set()
    for other in manifest_entries:
        if other["save_path"] != entry["save_path"] and entry["_concepts"] & other["_concepts"]:
            alternatives.add(other["save_path"])
    for concept in entry["_concepts"]:
        for legacy_path, tokens in legacy_tokens.items():
            if tokens & legacy_aliases.get(concept, set()):
                alternatives.add(legacy_path)
    entry["alternatives"] = sorted(alternatives)

for entry in manifest_entries:
    del entry["_concepts"]

manifest = {
    "version": 1,
    "generated_at": "2026-05-05T00:00:00+09:00",
    "images": manifest_entries,
}

gaps = {
    "generated_at": "2026-05-05T00:00:00+09:00",
    "missing_choices": [],
}
for missing in handoff_audit["truly_missing"]:
    missing_id = missing["id"]
    choice_text = "なく" if missing_id == "face_cry" else "がっかり" if missing_id == "face_disappointed" else missing_id
    question_refs = choice_refs.get(choice_text, [])
    if not question_refs and missing_id in {"face_cry", "face_disappointed"}:
        question_refs = ["opposite/level2/idx14"]
    gap = {
        "choice_text": choice_text,
        "questions_using_it": question_refs,
        "suggested_id": missing_id,
        "suggested_save_path": missing["save_path"],
    }
    if missing_id == "face_cry":
        gap["existing_equivalents"] = ["assets/images/quizland/illust/choice/face_draw.png"]
    if missing_id == "face_disappointed":
        gap["existing_equivalents"] = ["assets/images/quizland/illust/choice/face_sleep.png"]
    gaps["missing_choices"].append(gap)

primary_override = {
    "face_eye": "choice_body_chew_set",
    "face_nose": "choice_body_smell_face_set",
    "face_mouth": "choice_body_see_face_set",
    "face_cheek": "choice_body_see_face_set",
    "face_ear": "choice_body_hear_face_set",
    "ringo": "sheet_count_total",
    "banana": "sheet_animal_extras",
    "cloud": "choice_weather_cloud_set",
    "color_dot_red": "choice_trivia_banana_color_set",
    "color_dot_blue": "choice_trivia_banana_color_set",
    "inu": "choice_trivia_animal_sound_set",
    "ushi": "choice_trivia_animal_sound_set",
    "niwatori": "choice_trivia_animal_sound_set",
    "part_tail": "choice_trivia_elephant_body_part_set",
    "chocho": "choice_trivia_rain_bug_set",
    "kabutomushi": "choice_trivia_rain_bug_set",
    "jinbeizame": "choice_trivia_big_fish_set",
    "same": "choice_trivia_big_fish_set",
    "skin": "choice_body_wrap_set",
    "bone": "choice_body_hardest_set",
    "heart_organ": "choice_body_pump_set",
    "stomach": "choice_body_pump_set",
    "teeth": "choice_body_chew_set",
    "kaminoke": "choice_body_chew_set",
}
dedupe = {
    "generated_at": "2026-05-05T00:00:00+09:00",
    "duplicates": [
        {
            "id": item_id,
            "sheets": sheets,
            "primary_sheet": primary_override.get(item_id, sheets[0]),
            "action": "primary を残し、他 sheet では同一 crop を再生成せず reference 化する",
        }
        for item_id, sheets in sorted(sheets_index["duplicates"].items())
    ],
}

(TMP / "image_manifest.json").write_text(
    json.dumps(manifest, ensure_ascii=False, indent=2),
    encoding="utf-8",
)
(TMP / "gaps.json").write_text(
    json.dumps(gaps, ensure_ascii=False, indent=2),
    encoding="utf-8",
)
(TMP / "dedupe_proposal.json").write_text(
    json.dumps(dedupe, ensure_ascii=False, indent=2),
    encoding="utf-8",
)

print(
    json.dumps(
        {
            "manifest_count": len(manifest_entries),
            "gap_count": len(gaps["missing_choices"]),
            "dedupe_count": len(dedupe["duplicates"]),
        },
        ensure_ascii=False,
        indent=2,
    )
)
