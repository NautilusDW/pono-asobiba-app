> ⚠️ **文字化けチェック**: この行が読めない場合、UTF-8 で開き直してください (VS Code: コマンドパレット → "Reopen with Encoding" → "UTF-8")。 詳細: AGENTS.md §0.1 / §4 ルール 7
> ℹ️ **PowerShell 5.1 注記**: 素の `Get-Content <file>` は CP932 解釈で化けて見えますが **false positive** (ファイル本体は UTF-8 で正常)。 読み直し手順は §0.1 参照。

# Sea Album Stage 1 Raw Assets

Batch: `536-sea-album-scroll-submarine-expressions`

## Raw Files

- `stage1_tidepool_scroll_panorama_raw.png`
  - 横スクロール用の浅瀬背景 raw。
  - 実装用には最適化済みコピーを `assets/images/sea-album/stage1/stage1_tidepool_scroll_panorama.png` に配置済み。
- `stage1_creature_expression_sheet_raw.png`
  - 6行 x 3列の表情シート raw。
  - 列は左から `normal` / `eating` / `happy`。
  - 行は上から `hermit_crab` / `shrimp` / `sea_star` / `tidepool_goby` / `sea_anemone` / `horseshoe_crab_boss`。

## Important

- 潜水艦は生成・切り出し不要です。
- ゲーム本体は既存素材 `assets/images/ocean/Submarine/Submarine_003.png` を使うように変更済みです。
- アルファ抜きと切り出しは Codex 側では行っていません。

## Final Crop Targets

切り出し後、最終 PNG は以下の名前にしてください。

```text
assets/images/sea-album/stage1/hermit_crab_normal.png
assets/images/sea-album/stage1/hermit_crab_eating.png
assets/images/sea-album/stage1/hermit_crab_happy.png
assets/images/sea-album/stage1/shrimp_normal.png
assets/images/sea-album/stage1/shrimp_eating.png
assets/images/sea-album/stage1/shrimp_happy.png
assets/images/sea-album/stage1/sea_star_normal.png
assets/images/sea-album/stage1/sea_star_eating.png
assets/images/sea-album/stage1/sea_star_happy.png
assets/images/sea-album/stage1/tidepool_goby_normal.png
assets/images/sea-album/stage1/tidepool_goby_eating.png
assets/images/sea-album/stage1/tidepool_goby_happy.png
assets/images/sea-album/stage1/sea_anemone_normal.png
assets/images/sea-album/stage1/sea_anemone_eating.png
assets/images/sea-album/stage1/sea_anemone_happy.png
assets/images/sea-album/stage1/horseshoe_crab_boss_normal.png
assets/images/sea-album/stage1/horseshoe_crab_boss_eating.png
assets/images/sea-album/stage1/horseshoe_crab_boss_happy.png
```

これらを配置したら、`sea-album/index.html` の `USE_ALPHA_SPRITES` を `true` にすると、表情ごとの PNG を読みます。
