from __future__ import annotations

import json
from copy import deepcopy
from datetime import datetime
from pathlib import Path


ROOT = Path(r"D:\AppDevelopment\pono-asobiba-app")
MANIFEST_V10 = ROOT / "quizland/data/_review/image_manifest.json"
MISSING = ROOT / "quizland/data/_review/missing_labels_categorized.json"
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
        return ["weather"]
    if "/illust/animal/" in save_path:
        if "penguin" in image_id or any(x in image_id for x in ["taka", "hato", "tsubame", "niwatori"]):
            return ["bird"]
        return ["animal"]
    if "/illust/stage/" in save_path:
        if "weather" in image_id:
            return ["weather"]
        if "body" in image_id:
            return ["body"]
        if "opposite" in image_id:
            if any(x in image_id for x in ["standing", "cry_smile"]):
                return ["posture"] if "standing" in image_id else ["emotion"]
            if any(x in image_id for x in ["night_sky", "bright_dark"]):
                return ["time_of_day"] if "night_sky" in image_id else ["prop"]
            if "open_door" in image_id:
                return ["door"]
            return ["prop"]
        if "trivia" in image_id:
            if any(x in image_id for x in ["spider", "earthworm"]):
                return ["bug"]
            if any(x in image_id for x in ["dolphin", "ocean", "whale", "shark"]):
                return ["fish"]
            if any(x in image_id for x in ["birds", "flamingo", "lion", "cat", "rabbit", "koala", "cheetah", "bear", "elephant"]):
                if "birds" in image_id or "flamingo" in image_id:
                    return ["bird"]
                return ["animal"]
            if any(x in image_id for x in ["apple", "banana"]):
                return ["food"]
            if "snow" in image_id:
                return ["weather", "nature"]
        return ["other"]

    if "/illust/_sheets/" in save_path:
        if "weather" in image_id:
            return ["weather"]
        if "shape" in image_id:
            return ["shape"]
        if "color" in image_id:
            return ["color"]
        if "body" in image_id:
            return ["body"]
        if "animal" in image_id:
            return ["animal"]
        if "opposite" in image_id:
            return ["other"]
        if "trivia" in image_id:
            return ["other"]
        return ["other"]

    if image_id.startswith("snowflake_"):
        return ["snowflake", "weather"]
    if image_id in {"snow_flake"}:
        return ["weather", "nature"]
    if image_id.startswith("face_"):
        if image_id in {"face_smile", "face_angry", "face_angry2", "face_scold", "face_glare", "face_speak", "face_draw", "face_sleep"}:
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
    if image_id in {"eucalyptus_leaf"}:
        return ["plant"]
    if image_id == "cloud":
        return ["weather", "nature"]
    if image_id in {"smoke", "cotton", "star", "sky", "mountain", "ocean", "rain_drop", "sand", "ice"}:
        return ["nature"]
    if image_id in {"heart_organ", "brain", "skin", "stomach", "bone", "teeth", "lungs", "finger", "kaminoke", "clothes", "tsume", "mane", "horn", "wing", "hair"}:
        return ["body"]
    return ["other"]


REUSE_ENTRIES = [
    {
        "id": "arm_emoji",
        "save_path": "assets/images/ocean/Arm/Arm_normal_1.png",
        "jp_labels": ["うで"],
        "context_tags": ["body"],
        "usage": ["stage", "choice"],
        "source_sheet": None,
        "subject_detailed": "腕のクローズアップ。既存 ocean/ から reuse",
        "alternatives": [],
        "status": "generated",
    },
    {
        "id": "thermometer_emoji",
        "save_path": "assets/images/ocean/Thermometer/Thermometer_normal_1.png",
        "jp_labels": ["おんどけい"],
        "context_tags": ["nature", "weather"],
        "usage": ["stage", "choice"],
        "source_sheet": None,
        "subject_detailed": "温度計のシンプルな既存アイコン。既存 ocean/ から reuse",
        "alternatives": [],
        "status": "generated",
    },
    {
        "id": "wind_emoji",
        "save_path": "assets/images/ocean/Wind/Wind_normal_1.png",
        "jp_labels": ["かぜ"],
        "context_tags": ["weather", "nature"],
        "usage": ["stage", "choice"],
        "source_sheet": None,
        "subject_detailed": "風を表す渦線の既存アイコン。既存 ocean/ から reuse",
        "alternatives": [],
        "status": "generated",
    },
    {
        "id": "tornado_emoji",
        "save_path": "assets/images/ocean/Tornado/Tornado_normal_1.png",
        "jp_labels": ["たつまき"],
        "context_tags": ["weather", "nature"],
        "usage": ["stage", "choice"],
        "source_sheet": None,
        "subject_detailed": "たつまきの既存アイコン。既存 ocean/ から reuse",
        "alternatives": [],
        "status": "generated",
    },
    {
        "id": "hand_emoji",
        "save_path": "assets/images/ocean/Palm/Palm_normal_1.png",
        "jp_labels": ["て"],
        "context_tags": ["body"],
        "usage": ["stage", "choice"],
        "source_sheet": None,
        "subject_detailed": "手のひらの既存アイコン。既存 ocean/ から reuse",
        "alternatives": [],
        "status": "generated",
    },
    {
        "id": "sunny_emoji",
        "save_path": "assets/images/ocean/Sun/Sun_normal_1.png",
        "jp_labels": ["はれ"],
        "context_tags": ["weather", "nature"],
        "usage": ["stage", "choice"],
        "source_sheet": None,
        "subject_detailed": "晴れを表す太陽アイコン。既存 ocean/ から reuse",
        "alternatives": [],
        "status": "generated",
    },
]


NEED_GENERATION = [
    ("きり", "kiri", ["weather", "nature"], "朝の白い霧。ふわっとした白いもやが低く漂う。"),
    ("もよう", "moyou", ["nature"], "自然物の表面にある模様。葉脈や斑点のような繰り返しパターン。"),
    ("さくら", "sakura", ["plant", "nature"], "淡いピンクのさくらの花びらと小さな花房。"),
    ("くさ", "kusa", ["plant", "nature"], "やわらかい緑の草むら。数本の葉が上に伸びる。"),
    ("たけ", "take", ["plant"], "まっすぐ伸びた竹の茎。節が見える緑の竹。"),
    ("まつのき", "matsu_no_ki", ["plant"], "丸みのある松の木。濃い緑の葉と茶色い幹。"),
    ("ふじさん", "mt_fuji", ["nature", "place"], "雪をかぶった左右対称の富士山。"),
    ("きりしまやま", "mt_kirishima", ["nature", "place"], "火山らしい稜線のある山。噴火口を連想できる形。"),
    ("こうやさん", "mt_koya", ["nature", "place"], "高野山をイメージした穏やかな山並みと杉の木。"),
    ("のりくらさん", "mt_norikura", ["nature", "place"], "高原の広がる山。なだらかな頂き。"),
    ("ゆきやま", "snow_mountain", ["nature", "weather"], "山全体に雪が積もった寒い山。"),
    ("ゆきぐに", "snow_country", ["nature", "weather"], "雪に包まれた町や家。"),
    ("ふゆのくに", "winter_country", ["nature", "weather"], "冬の寒い国の景色。雪と裸の木。"),
    ("こおりのくに", "ice_country", ["nature", "weather"], "氷の地面や氷山がある冷たい国。"),
    ("くもりのとき", "cloudy_time", ["weather", "nature"], "空が雲でおおわれたくもりの天気。"),
    ("はれのとき", "sunny_time", ["weather", "nature"], "太陽が出ているはれの天気。"),
    ("ゆきのとき", "snowy_time", ["weather", "nature"], "空から雪がふっている天気。"),
    ("よるだけ", "night_only", ["time_of_day"], "夜の暗い空に月と星だけが見える。"),
    ("ねむいから", "sleepy_reason", ["emotion"], "眠そうな子ども。まぶたが重くあくびしている。"),
    ("たべている", "eating_action", ["action"], "食べ物を口に運んで食べている動作。"),
    ("はしっている", "running_action", ["action"], "元気に走っている動作。"),
    ("やすんでいる", "resting_action", ["action"], "座るか横になって休んでいる動作。"),
    ("わからない", "dont_know", ["abstract"], "困って首をかしげる子ども。わからない様子。"),
    ("てもん", "temon", ["body"], "手のひらの線や手の紋のイメージ。開いた手のクローズアップ。"),
    ("コケコッコー", "sound_kokekokko", ["sound"], "にわとりが元気に鳴いている様子。"),
    ("モーモー", "sound_momo", ["sound"], "うしが鳴いている様子。"),
    ("ワンワン", "sound_wanwan", ["sound"], "いぬが鳴いている様子。"),
    ("おおあめ", "heavy_rain", ["weather", "nature"], "雨が強くふっている様子。"),
    ("おなか", "belly_part", ["body"], "おなかのクローズアップ。丸いおへそつき。"),
    ("かた", "shoulder_part", ["body"], "肩のクローズアップ。首から肩にかけた上半身。"),
    ("かみ", "hair_part", ["body"], "頭のかみの毛のクローズアップ。"),
    ("じしん", "earthquake", ["nature"], "地面がゆれている様子。家や地面がガタガタ。"),
    ("つなみ", "tsunami", ["nature", "weather"], "大きな海の波が押し寄せる様子。"),
    ("なみ", "wave", ["nature"], "海の青い波がひとつ大きく立っている。"),
    ("とけい", "clock", ["object"], "丸いアナログ時計。"),
    ("ものさし", "ruler", ["object"], "まっすぐなものさし。木か黄色の定規。"),
    ("コップ", "cup", ["object"], "シンプルなコップ一つ。"),
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
