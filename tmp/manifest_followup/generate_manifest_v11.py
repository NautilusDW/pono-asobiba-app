from __future__ import annotations

import json
from copy import deepcopy
from datetime import datetime
from pathlib import Path


ROOT = Path(r"D:\AppDevelopment\pono-asobiba-app")
MANIFEST_V10 = ROOT / "quizland/data/_review/image_manifest.json"
DEDUPE = ROOT / "tmp/manifest_audit/dedupe_proposal.json"
OUT_DIR = ROOT / "tmp/manifest_followup/out"


def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def infer_context_tags(entry: dict) -> list[str]:
    save_path = entry["save_path"].replace("\\", "/")
    image_id = entry["id"]

    if "/illust/shape/" in save_path:
        return ["shape"]
    if "/illust/color/" in save_path:
        return ["color"]
    if "/illust/weather/" in save_path:
        if "snowflake" in image_id:
            return ["snowflake", "weather"]
        return ["weather"]
    if "/illust/animal/" in save_path:
        if image_id == "animal_penguin":
            return ["bird"]
        return ["animal"]

    if "/illust/stage/" in save_path:
        if "weather" in image_id:
            if "snowflake" in image_id:
                return ["snowflake", "weather"]
            return ["weather"]
        if "body" in image_id:
            return ["body"]
        if "opposite" in image_id:
            if "standing" in image_id:
                return ["posture"]
            if any(token in image_id for token in ["cry_smile", "praise"]):
                return ["emotion"]
            if "night_sky" in image_id:
                return ["time_of_day"]
            if "open_door" in image_id:
                return ["door"]
            return ["prop"]
        if "trivia" in image_id:
            if any(token in image_id for token in ["spider", "earthworm"]):
                return ["bug"]
            if any(token in image_id for token in ["birds", "flamingo"]):
                return ["bird"]
            if any(token in image_id for token in ["ocean", "dolphin"]):
                return ["fish"]
            if "huge_creatures" in image_id:
                return ["animal", "fish"]
            if any(token in image_id for token in ["lion", "cat", "rabbit", "koala", "cheetah", "bear", "elephant"]):
                return ["animal"]
            if "hatching_egg" in image_id:
                return ["animal", "bird"]
            if any(token in image_id for token in ["apple", "banana"]):
                return ["food"]
            if "snow" in image_id:
                return ["weather", "nature"]
            return ["nature"]
        return ["nature"]

    if "/illust/_sheets/" in save_path:
        if "shape" in image_id:
            return ["shape"]
        if "color" in image_id:
            return ["color"]
        if "weather" in image_id:
            if "snowflake" in image_id:
                return ["snowflake", "weather"]
            return ["weather"]
        if "body" in image_id:
            return ["body"]
        if "animal" in image_id:
            return ["animal"]
        if "count_total" in image_id:
            return ["food", "nature"]
        if "opposite_face_emotion" in image_id or "opposite_scold" in image_id:
            return ["emotion"]
        if "opposite_posture" in image_id:
            return ["posture"]
        if "opposite_door" in image_id:
            return ["door"]
        if "opposite_time_of_day" in image_id:
            return ["time_of_day"]
        if "opposite_old_new" in image_id:
            return ["prop"]
        if "trivia_animal_sound" in image_id or "trivia_egg_animal" in image_id:
            return ["animal", "bird"]
        if "trivia_big_fish" in image_id or "trivia_dolphin_friend" in image_id:
            return ["fish"]
        if "trivia_biggest_creature" in image_id:
            return ["animal", "fish"]
        if "trivia_birds" in image_id:
            return ["bird"]
        if "trivia_eight_eyes_bug" in image_id or "trivia_rain_bug" in image_id:
            return ["bug"]
        if "trivia_elephant_body_part" in image_id or "trivia_lion_feature" in image_id:
            return ["body", "animal"]
        if "trivia_fast_animal" in image_id or "trivia_hibernate_animal" in image_id:
            return ["animal"]
        if "trivia_koala_food" in image_id:
            return ["food", "plant"]
        if "trivia_rabbit_ear" in image_id:
            return ["animal"]
        if "trivia_winter_sky" in image_id:
            return ["weather", "nature"]
        return ["nature"]

    if image_id.startswith("snowflake_"):
        return ["snowflake", "weather"]
    if image_id == "snow_flake":
        return ["weather", "nature"]
    if image_id.startswith("face_"):
        if image_id in {
            "face_smile",
            "face_angry",
            "face_angry2",
            "face_scold",
            "face_glare",
            "face_speak",
            "face_draw",
            "face_sleep",
        }:
            return ["face", "emotion"]
        return ["face", "body"]
    if image_id.startswith("pose_"):
        return ["posture"]
    if image_id.startswith("door_"):
        return ["door"]
    if image_id.startswith("prop_"):
        return ["prop"]
    if image_id.startswith("sky_"):
        return ["time_of_day"]
    if image_id.startswith("part_"):
        return ["body", "animal"]
    if image_id.startswith("ear_"):
        return ["animal"]
    if image_id.startswith("color_dot_"):
        return ["color"]

    if image_id in {"neko", "inu", "buta", "kirin", "kuma", "lion", "zou"}:
        return ["animal"]
    if image_id in {"kabutomushi", "chocho", "batta", "semi", "kumo", "mimizu"}:
        return ["bug"]
    if image_id in {"maguro", "kujira", "jinbeizame", "sakana", "tako", "same", "bluewhale", "daiouika"}:
        return ["fish"]
    if image_id in {"taka", "penguin", "hato", "tsubame", "niwatori"}:
        return ["bird"]
    if image_id in {"banana", "ringo", "takenoko"}:
        return ["food"]
    if image_id == "eucalyptus_leaf":
        return ["plant"]
    if image_id == "cloud":
        return ["weather", "nature"]
    if image_id in {"smoke", "cotton", "star", "sky", "mountain", "ocean", "rain_drop", "sand", "ice"}:
        return ["nature"]
    if image_id in {
        "heart_organ",
        "brain",
        "skin",
        "stomach",
        "bone",
        "teeth",
        "lungs",
        "finger",
        "kaminoke",
        "clothes",
        "tsume",
        "mane",
        "horn",
        "wing",
        "hair",
    }:
        return ["body"]
    return ["nature"]


REUSE_ENTRIES = [
    {
        "id": "ude",
        "save_path": "assets/images/quizland/illust/choice/ude.png",
        "jp_labels": ["うで"],
        "context_tags": ["body"],
        "usage": ["stage", "choice"],
        "source_sheet": None,
        "subject_detailed": "ocean の既存アセット `Arm_normal_1.png` を quizland 用の romaji slug 名で再配置した reuse 画像。",
        "alternatives": ["assets/images/ocean/Arm/Arm_normal_1.png"],
        "status": "generated",
    },
    {
        "id": "ondokei",
        "save_path": "assets/images/quizland/illust/choice/ondokei.png",
        "jp_labels": ["おんどけい"],
        "context_tags": ["weather", "prop"],
        "usage": ["stage", "choice"],
        "source_sheet": None,
        "subject_detailed": "ocean の既存アセット `Thermometer_normal_1.png` を quizland 用の romaji slug 名で再配置した reuse 画像。",
        "alternatives": ["assets/images/ocean/Thermometer/Thermometer_normal_1.png"],
        "status": "generated",
    },
    {
        "id": "kaze",
        "save_path": "assets/images/quizland/illust/choice/kaze.png",
        "jp_labels": ["かぜ"],
        "context_tags": ["weather", "nature"],
        "usage": ["stage", "choice"],
        "source_sheet": None,
        "subject_detailed": "ocean の既存アセット `Wind_normal_1.png` を quizland 用の romaji slug 名で再配置した reuse 画像。",
        "alternatives": ["assets/images/ocean/Wind/Wind_normal_1.png"],
        "status": "generated",
    },
    {
        "id": "tatsumaki",
        "save_path": "assets/images/quizland/illust/choice/tatsumaki.png",
        "jp_labels": ["たつまき"],
        "context_tags": ["weather", "nature"],
        "usage": ["stage", "choice"],
        "source_sheet": None,
        "subject_detailed": "ocean の既存アセット `Tornado_normal_1.png` を quizland 用の romaji slug 名で再配置した reuse 画像。",
        "alternatives": ["assets/images/ocean/Tornado/Tornado_normal_1.png"],
        "status": "generated",
    },
    {
        "id": "te",
        "save_path": "assets/images/quizland/illust/choice/te.png",
        "jp_labels": ["て"],
        "context_tags": ["body"],
        "usage": ["stage", "choice"],
        "source_sheet": None,
        "subject_detailed": "ocean の既存アセット `Palm_normal_1.png` を quizland 用の romaji slug 名で再配置した reuse 画像。",
        "alternatives": ["assets/images/ocean/Palm/Palm_normal_1.png"],
        "status": "generated",
    },
    {
        "id": "hare",
        "save_path": "assets/images/quizland/illust/choice/hare.png",
        "jp_labels": ["はれ"],
        "context_tags": ["weather", "nature"],
        "usage": ["stage", "choice"],
        "source_sheet": None,
        "subject_detailed": "ocean の既存アセット `Sun_normal_1.png` を quizland 用の romaji slug 名で再配置した reuse 画像。",
        "alternatives": ["assets/images/ocean/Sun/Sun_normal_1.png"],
        "status": "generated",
    },
]


NEED_GENERATION = [
    ("きり", "kiri", ["weather", "nature"], "朝に出る白い霧。小さな水の粒が空気にふわっと浮かぶ、やさしいもやの情景。"),
    ("もよう", "moyou", ["nature"], "指もんではない一般的な模様。葉ではなく、布や紙にあるような単純なくり返し模様として見分けやすく描く。"),
    ("さくら", "sakura", ["plant", "nature"], "ピンクの花びらがついた桜の花。子どもでも一目で桜と分かる花つきの枝。"),
    ("くさ", "kusa", ["plant", "nature"], "地面から生えた若草の束。低く広がる草むらで、木や竹に見えない形。"),
    ("たけ", "take", ["plant"], "節のある竹の茎と細長い笹の葉。緑の竹だとすぐ分かる構図。"),
    ("まつのき", "matsu_no_ki", ["plant"], "針葉がついた松の木。丸い広葉樹に見えない、松らしい枝ぶりを優先する。"),
    ("ふじさん", "mt_fuji", ["nature"], "雪をかぶった富士山。左右対称に近い高い山の形で、日本一高い山として分かりやすく描く。"),
    ("きりしまやま", "mt_kirishima", ["nature"], "霧島山を表す山並み。火山らしい起伏を持つ複数の峰が見える構図。"),
    ("こうやさん", "mt_koya", ["nature"], "高野山を表すやさしい山の景色。低めの山並みと木々で、富士山型と区別する。"),
    ("のりくらさん", "mt_norikura", ["nature"], "乗鞍山を表すなだらかな山。広めの稜線で落ち着いた山容。"),
    ("ゆきやま", "snow_mountain", ["nature", "weather"], "山全体に雪が積もった雪山。山の地形が見えるまま白く覆われている。"),
    ("ゆきぐに", "snow_country", ["nature", "weather"], "雪がたくさん積もった町や村の景色。『雪国』と分かる家や道のある冬景色。"),
    ("ふゆのくに", "winter_country", ["nature", "weather"], "寒い季節の国や地域の景色。雪国ほど真っ白ではなく、冬らしい木や空気感を見せる。"),
    ("こおりのくに", "ice_country", ["nature", "weather"], "氷におおわれた国の景色。氷原や氷の山が目立つ冷たい世界。"),
    ("くもりのとき", "cloudy_time", ["weather", "nature"], "空一面に雲が広がるくもりの天気。雨や晴れに見えない曇天。"),
    ("はれのとき", "sunny_time", ["weather", "nature"], "太陽が出て明るい晴れの天気。青空と光で分かりやすく描く。"),
    ("ゆきのとき", "snowy_time", ["weather", "nature"], "雪が降っている天気。空から雪が舞う冬の情景。"),
    ("よるだけ", "night_only", ["time_of_day"], "夜だけに見える星空や月夜の情景。昼や夕方と誤解されない夜の表現。"),
    ("ねむいから", "sleepy_reason", ["emotion"], "眠くてあくびやとろんとした表情になっている子どもの様子。"),
    ("たべている", "eating_action", ["posture"], "食べ物を口にはこんで食べている動作。"),
    ("はしっている", "running_action", ["posture"], "元気に走っている動作。足が前後に開き、走る姿勢がはっきり分かる。"),
    ("やすんでいる", "resting_action", ["posture"], "座る・横になるなど、休んでいる状態のやさしい動作。"),
    ("わからない", "dont_know", ["emotion"], "首をかしげて困っている『わからない』の表情。推測で、感情寄りの表現として扱う。"),
    ("てもん", "temon", ["body"], "手のひらや手の甲にある線やしわを示したイメージ。実在語ではなく、誤答用の体パーツ文脈。"),
    ("コケコッコー", "sound_kokekokko", ["bird"], "にわとりの鳴き声を表すイメージ。鳥の文脈で見分けやすくする。"),
    ("モーモー", "sound_momo", ["animal"], "うしの鳴き声を表すイメージ。動物の鳴き声として分かりやすく描く。"),
    ("ワンワン", "sound_wanwan", ["animal"], "いぬの鳴き声を表すイメージ。動物の鳴き声として分かりやすく描く。"),
    ("おおあめ", "heavy_rain", ["weather", "nature"], "雨が強くたくさん降っている大雨の情景。"),
    ("おなか", "belly_part", ["body"], "おなかの前面。丸みのある胴体の中央を示す。"),
    ("かた", "shoulder_part", ["body"], "肩の部分のクローズアップ。首の付け根から腕のつながりが分かる。"),
    ("かみ", "hair_part", ["body"], "頭の髪の毛を示すクローズアップ。"),
    ("じしん", "earthquake", ["nature"], "地面がゆれている様子。家や物がガタガタする地震の表現。"),
    ("つなみ", "tsunami", ["nature", "weather"], "大きな波が押しよせる津波。普通の波より強い災害表現。"),
    ("なみ", "wave", ["nature"], "海のなみ。ふつうの波として見えるやさしい海の表現。"),
    ("とけい", "clock", ["prop"], "丸いアナログ時計。"),
    ("ものさし", "ruler", ["prop"], "まっすぐなものさし。目盛りが分かる文房具。"),
    ("コップ", "cup", ["prop"], "シンプルなコップ一つ。"),
]


def generate_new_entries() -> list[dict]:
    entries = []
    for jp_label, image_id, tags, subject in NEED_GENERATION:
        save_path = f"assets/images/quizland/illust/choice/{image_id}.png"
        exists = (ROOT / save_path).exists()
        entries.append(
            {
                "id": image_id,
                "save_path": save_path,
                "jp_labels": [jp_label],
                "context_tags": tags,
                "usage": ["choice"],
                "source_sheet": None,
                "subject_detailed": subject,
                "alternatives": [],
                "status": "generated" if exists else "planned",
            }
        )
    return entries


def main() -> None:
    manifest = load_json(MANIFEST_V10)
    images = deepcopy(manifest["images"])
    for entry in images:
        entry["context_tags"] = infer_context_tags(entry)

    images.extend(deepcopy(REUSE_ENTRIES))
    images.extend(generate_new_entries())

    manifest_v11 = {
        "version": "1.1",
        "generated_at": datetime.now().astimezone().isoformat(timespec="seconds"),
        "images": images,
    }

    gaps = {"generated_at": datetime.now().date().isoformat(), "missing_choices": []}
    dedupe = load_json(DEDUPE)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    (OUT_DIR / "image_manifest.json").write_text(
        json.dumps(manifest_v11, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    (OUT_DIR / "gaps.json").write_text(
        json.dumps(gaps, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    (OUT_DIR / "dedupe_proposal.json").write_text(
        json.dumps(dedupe, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    print(f"images={len(images)}")
    print(f"need_generation={len(NEED_GENERATION)}")


if __name__ == "__main__":
    main()
