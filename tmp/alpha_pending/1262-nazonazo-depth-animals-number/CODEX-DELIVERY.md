> ⚠️ **文字化けチェック**: この行が読めない場合、UTF-8 で開き直してください (VS Code: コマンドパレット → "Reopen with Encoding" → "UTF-8")。 詳細: AGENTS.md §0.1 / §4 ルール 8
> ℹ️

# batch:1262 GPT Image 2 raw delivery

Built-in GPT Image 2 で生成した未加工 raw と、その採用・加工記録です。alpha 化、フレーム正規化、WebP 最適化、runtime 接続まで完了しています。

## 推奨 raw

- `raw/jungle_flying_butterfly_3frame_raw_v2_selected.png`
  - 左向きを固定した青いチョウ3コマ。上羽・中間・下羽だけを変化。
- `raw/jungle_animal_elephant_trunk_3frame_raw.png`
  - 正面大型ゾウ3コマ。体・耳・足を固定し、鼻だけ左・中央・右へ変化。
- `raw/jungle_animal_giraffe_full_raw_v2_selected.png`
  - 全身と足元の葉を余白内に収め、左右の切れた木を撤去。暗い目＋小さなハイライトへ修正した採用候補。

`raw/jungle_flying_butterfly_3frame_raw.png` はコマ間の向きと体型が不揃い、`raw/jungle_animal_giraffe_full_raw_v1.png` は目が白く見えやすいため、不採用比較用です。`raw/jungle_flying_butterfly_canonical_raw.png` は採用sheetのキャラクター基準として生成した中間素材です。

## 共通生成条件

- Pono の描き込みが多いジャングル背景に合う、絵本の水彩＋マットなガッシュ。
- 白目なし。暗い目に小さなハイライトのみ。
- 3コマは同一カメラ・向き・縮尺・中心・光。
- 画面端へ木や葉を接触させず、全輪郭と安全余白を保持。
- 文字・ロゴ・透かし・影・余計な動物なし。
- チョウは `#ff00ff`、ゾウ/キリンは `#0000ff` の均一 chroma 背景。

## 加工・接続済み

- `processed/` に chroma 除去後と正規化後の PNG を保存。
- `asset-report.json` に3コマごとの alpha bbox、中心、接地位置、端接触の有無を記録。
- `assets/images/nazonazo-tunnel/jungle_flying_butterfly_3frame_20260712_v2.webp`
- `assets/images/nazonazo-tunnel/jungle_animal_elephant_trunk_3frame_20260712.webp`
- `assets/images/nazonazo-tunnel/jungle_animal_giraffe_full_20260712.webp`
- すべて透明端あり、3MB未満。チョウとゾウは1536×512の3コマsheet、キリンは512×768の全身画像。
