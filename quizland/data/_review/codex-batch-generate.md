# Codex / GPT Image 2 バッチ生成指示

このディレクトリの `illustration-list.json` を読み込み、`sheets[]` と `items[]` の各エントリで以下を実行してください。

## シート方式の処理フロー

JSON の `sheets[]` 配列の各エントリで:
1. `prompt` を gpt-image-1 (= GPT Image 2) に送信、`size` で指定
2. 戻り値の PNG を `output_path` に一旦保存
3. Pillow で `crops[].bbox` 通りに切り出し、各 `save_path` に保存
4. 切り出し後、シート PNG は残しても削除しても OK (デバッグ用に残す推奨)

`items[]` 配列の各エントリは従来通り個別生成。

合計 API 呼出: 3 (シート) + 18 (個別) = **21 calls**

## 個別生成 (items[])

1. `prompt` の文字列を GPT Image 2 (gpt-image-1 model) に送信
2. パラメータ:
   - size: `size` フィールドの値 (例: "1024x1024")
   - quality: "high"
   - background: "transparent"
3. 生成結果の PNG を `save_path` の絶対パスに保存
   - パスはプロジェクトルート (`d:/AppDevelopment/pono-asobiba-app/`) からの相対パス
   - フルパス: `d:/AppDevelopment/pono-asobiba-app/<save_path>`
4. 失敗したアイテムは `id` と理由を `_failed.json` に追記

## 進捗トラッキング
処理済みアイテムは `_completed.json` に id 配列を追記し、再実行時にスキップする (idempotent)。

## カテゴリ別の合計
- sheets: 3 (color×8 + shape×8 + weather×4 = 20 crops)
- animal: 11 (個別生成)
- body: 7 (個別生成)
- 合計 API 呼出: **21** (シート3 + 個別18) → 出力 38 ファイル

## Python 例 (シート + 切り出し)

```python
from openai import OpenAI
import base64, json
from pathlib import Path
from PIL import Image
from io import BytesIO

client = OpenAI()
PROJECT_ROOT = Path('d:/AppDevelopment/pono-asobiba-app')

with open('illustration-list.json') as f:
    data = json.load(f)

# 1. Sheets
for sheet in data.get('sheets', []):
    out = PROJECT_ROOT / sheet['output_path']
    if out.exists():
        print(f"Skip sheet (exists): {sheet['sheet_id']}")
    else:
        out.parent.mkdir(parents=True, exist_ok=True)
        response = client.images.generate(
            model='gpt-image-1',
            prompt=sheet['prompt'],
            size=sheet['size'],
            quality='high',
            background='transparent',
            n=1
        )
        out.write_bytes(base64.b64decode(response.data[0].b64_json))
        print(f"Generated sheet: {out}")

    # 2. Crop each cell
    sheet_img = Image.open(out)
    for crop in sheet['crops']:
        x, y, w, h = crop['bbox']
        cell = sheet_img.crop((x, y, x+w, y+h))
        crop_path = PROJECT_ROOT / crop['save_path']
        crop_path.parent.mkdir(parents=True, exist_ok=True)
        cell.save(crop_path, 'PNG')
        print(f"Cropped: {crop['id']} -> {crop_path}")

# 3. Individual items (animals + body)
for item in data.get('items', []):
    full_path = PROJECT_ROOT / item['save_path']
    if full_path.exists():
        print(f"Skip (exists): {item['id']}")
        continue
    full_path.parent.mkdir(parents=True, exist_ok=True)
    response = client.images.generate(
        model='gpt-image-1',
        prompt=item['prompt'],
        size=item['size'],
        quality='high',
        background='transparent',
        n=1
    )
    full_path.write_bytes(base64.b64decode(response.data[0].b64_json))
    print(f"Generated: {item['id']} -> {full_path}")
```

(API キーは環境変数 `OPENAI_API_KEY` で設定)
