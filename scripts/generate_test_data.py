"""
Codespaces用軽量テストデータ生成スクリプト

実際のプロジェクトセーブデータからbase64画像・音声・アノテーションを
除去して軽量版を生成する。
"""

import json
import os
import shutil
import base64

# 1x1 transparent PNG (smallest valid PNG)
PLACEHOLDER_PNG_B64 = (
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4"
    "nGNgYPgPAAEDAQAIicLsAAAAASUVORK5CYII="
)

# Paths
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SAVES_DIR = os.path.join(PROJECT_ROOT, "saves")
OUTPUT_DIR = os.path.join(PROJECT_ROOT, "test-data")

# Source project
SOURCE_PROJECT = "AI使えるスタッフさん営業動画制作"
# Latest save file
SOURCE_SAVE = "20260222_205600_733_v1.0.json"


def strip_save_data(data: dict) -> dict:
    """セーブデータから重いバイナリデータを除去する"""

    # ai_images: base64 → placeholder
    ai_images = data.get("ai_images", {})
    for cut_id, img in ai_images.items():
        if isinstance(img, dict) and "data" in img:
            img["data"] = PLACEHOLDER_PNG_B64

    # ai_image_history: 全削除
    data["ai_image_history"] = {}

    # narration_audio: 全削除
    data["narration_audio"] = {}

    # cut_annotations: 全削除（49MB）
    data["cut_annotations"] = {}

    # lp_analyses: assets の data を placeholder に
    for analysis in data.get("lp_analyses", []):
        for asset in analysis.get("assets", []):
            if "data" in asset:
                asset["data"] = PLACEHOLDER_PNG_B64
        for ref in analysis.get("design_references", []):
            if "data" in ref:
                ref["data"] = PLACEHOLDER_PNG_B64

    # shot_generator_scenes: リセット
    data["shot_generator_scenes"] = {}

    return data


def create_minimal_index(original_index: list) -> list:
    """最新1エントリのみの _index.json を作成"""
    # 最新のエントリだけ残す（ファイル名を軽量版に変更）
    if not original_index:
        return []

    latest = original_index[-1].copy()
    latest["filename"] = SOURCE_SAVE
    return [latest]


def main():
    source_dir = os.path.join(SAVES_DIR, SOURCE_PROJECT)
    output_project_dir = os.path.join(OUTPUT_DIR, SOURCE_PROJECT)

    # Check source exists
    source_save_path = os.path.join(source_dir, SOURCE_SAVE)
    if not os.path.exists(source_save_path):
        print(f"Error: Source file not found: {source_save_path}")
        return

    # Clean output
    if os.path.exists(output_project_dir):
        shutil.rmtree(output_project_dir)
    os.makedirs(output_project_dir, exist_ok=True)

    # 1. Strip save data
    print(f"Reading {SOURCE_SAVE}...")
    with open(source_save_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    original_size = os.path.getsize(source_save_path)
    print(f"  Original size: {original_size / 1024 / 1024:.1f} MB")

    stripped = strip_save_data(data)

    output_save_path = os.path.join(output_project_dir, SOURCE_SAVE)
    with open(output_save_path, "w", encoding="utf-8") as f:
        json.dump(stripped, f, ensure_ascii=False, separators=(",", ":"))

    new_size = os.path.getsize(output_save_path)
    print(f"  Stripped size: {new_size / 1024:.1f} KB")
    print(f"  Reduction: {(1 - new_size / original_size) * 100:.1f}%")

    # 2. Create minimal _index.json
    index_path = os.path.join(source_dir, "_index.json")
    if os.path.exists(index_path):
        with open(index_path, "r", encoding="utf-8") as f:
            original_index = json.load(f)
        minimal_index = create_minimal_index(original_index)
        with open(os.path.join(output_project_dir, "_index.json"), "w", encoding="utf-8") as f:
            json.dump(minimal_index, f, ensure_ascii=False, indent=2)
        print(f"  _index.json: {len(original_index)} entries → 1 entry")

    # 3. Copy metadata files
    for meta_file in ("_chat.json", "_files.json"):
        src = os.path.join(source_dir, meta_file)
        if os.path.exists(src):
            shutil.copy2(src, os.path.join(output_project_dir, meta_file))
            print(f"  Copied {meta_file}")

    # 4. Summary
    total_size = sum(
        os.path.getsize(os.path.join(output_project_dir, f))
        for f in os.listdir(output_project_dir)
    )
    print(f"\nTotal test-data size: {total_size / 1024:.1f} KB")
    print(f"Output: {output_project_dir}")


if __name__ == "__main__":
    main()
