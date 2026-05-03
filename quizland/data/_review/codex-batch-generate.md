# Codex / GPT Image 2 バッチ生成指示

このディレクトリの `illustration-list.json` を読み込み、`items` 配列の各エントリで以下を実行してください:

1. `prompt` の文字列を GPT Image 2 (gpt-image-2 model) に送信
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
- color: 8
- shape: 8
- animal: 11
- weather: 4
- body: 7
- 合計: 38

## OpenAI API 呼び出し例 (Python)
```python
from openai import OpenAI
import base64, json
from pathlib import Path

client = OpenAI()

with open('illustration-list.json') as f:
    data = json.load(f)

PROJECT_ROOT = Path('d:/AppDevelopment/pono-asobiba-app')

for item in data['items']:
    full_path = PROJECT_ROOT / item['save_path']
    if full_path.exists():
        print(f"Skip (exists): {item['id']}")
        continue

    full_path.parent.mkdir(parents=True, exist_ok=True)

    response = client.images.generate(
        model='gpt-image-1',  # GPT Image 2 系統
        prompt=item['prompt'],
        size=item['size'],
        quality='high',
        background='transparent',
        n=1
    )

    img_b64 = response.data[0].b64_json
    full_path.write_bytes(base64.b64decode(img_b64))
    print(f"Generated: {item['id']} -> {full_path}")
```

(API キーは環境変数 `OPENAI_API_KEY` で設定)
