# Codex バッチ生成指示

このディレクトリの `illustration-list.json` を読み込み、各エントリの `prompt` を使って GPT Image 2 で画像を生成してください。

## 全体構成

JSON には2種類のエントリがあります:

| 種別 | 配列 | 件数 | 備考 |
|---|---|---|---|
| シート (複数まとめ) | `sheets[]` | 7 | 1枚生成 → ローカルで切り出し (color×8 + shape×8 + weather×4 + count_total×5 + weather_emoji×10 + body_emoji×9 + animal_extras×9 = 53 crops) |
| 個別 (1枚ずつ) | `items[]` | 18 | そのまま生成 (animal×11 + body×7) |

→ **生成画像数: 7 シート + 18 個別 = 25枚**
→ **最終ファイル数: 53 (切り出し) + 18 (個別) = 71 PNG**

## シート方式の処理フロー (`sheets[]`)

各 sheet エントリで:

1. `prompt` を使って GPT Image 2 で 1枚画像を生成 (サイズは `size` フィールド指定)
2. 生成画像を `output_path` (例: `assets/images/quizland/illust/_sheets/sheet_colors.png`) に保存
3. `crops[]` の各エントリの `bbox` ([x, y, width, height]) で切り出して、各 `save_path` に保存
4. 切り出し後、シート PNG (`output_path`) はデバッグ用に残してOK

例 (色チップ):
- `prompt` で 2048×1024 の 8色チップグリッドを 1枚生成
- bbox `[0, 0, 512, 512]` で「赤」を切り出して `color/color_red.png`
- bbox `[512, 0, 512, 512]` で「青」を切り出して `color/color_blue.png`
- ... 計8枚

## 個別生成のフロー (`items[]`)

各 item エントリで:

1. `prompt` を使って GPT Image 2 で画像生成 (サイズは `size` フィールド)
2. `save_path` (例: `assets/images/quizland/illust/animal/animal_penguin.png`) に保存

## パラメータ共通

すべての生成画像で:
- 透過 PNG (アルファチャンネル付き)
- 高品質
- テキストやラベルなし

## パスについて

`save_path` / `output_path` はプロジェクトルート (`d:/AppDevelopment/pono-asobiba-app/`) からの相対パスです。フルパスは:
```
d:/AppDevelopment/pono-asobiba-app/<save_path>
```

ディレクトリが存在しない場合は事前に作成してください。

## 進捗管理 (任意)

何らかの理由で生成が失敗した場合や中断した場合に再開できるよう、**既に保存先にファイルが存在する場合はスキップ** する idempotent な処理が望ましいです。

## カテゴリ別の合計

| カテゴリ | 場所 | 枚数 |
|---|---|---:|
| 色チップ (sheet) | `illust/color/` | 8 |
| 形 (sheet) | `illust/shape/` | 8 |
| 天気シーン (sheet) | `illust/weather/` | 4 |
| count_total (sheet) | `assets/images/word/` | 5 |
| weather_emoji (sheet) | `assets/images/ocean/<Weather>/` | 10 |
| body_emoji (sheet) | `assets/images/ocean/<Body>/` | 9 |
| animal_extras (sheet) | `assets/images/word/` | 9 |
| 動物 (個別) | `illust/animal/` | 11 |
| 体図解 (個別) | `illust/body/` | 7 |
| **合計** | | **71** |
