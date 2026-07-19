> ⚠️ **文字化けチェック**: この行が読めない場合、UTF-8 で開き直してください (VS Code: コマンドパレット → "Reopen with Encoding" → "UTF-8")。 詳細: AGENTS.md §0.1 / §4 ルール 7
> ℹ️ **PowerShell 5.1 注記**: 素の `Get-Content <file>` は CP932 解釈で化けて見えますが **false positive** (ファイル本体は UTF-8 で正常)。 読み直し手順は AGENTS.md §0.1 参照。

# Sea Album Stage 1 Raw Assets

Generated with built-in image generation for `[batch:535-sea-album-stage1-base]`.

Files:
- `stage1_tidepool_asset_sheet_raw.png`
  - raw white-background sprite sheet
  - includes submarine, straight food shot, bomb-style food orb, hermit crab, shrimp, sea star, goby, sea anemone, horseshoe crab boss
  - no alpha, no crop
- `stage1_tidepool_background_raw.png`
  - raw full-bleed Stage 1 shallow tidepool background
  - copied and optimized for current implementation as `assets/images/sea-album/stage1/stage1_tidepool_background.png`

After user alpha/crop, place final PNGs here:

```text
assets/images/sea-album/stage1/player_submarine.png
assets/images/sea-album/stage1/hermit_crab.png
assets/images/sea-album/stage1/shrimp.png
assets/images/sea-album/stage1/sea_star.png
assets/images/sea-album/stage1/tidepool_goby.png
assets/images/sea-album/stage1/sea_anemone.png
assets/images/sea-album/stage1/horseshoe_crab_boss.png
```

`sea-album/index.html` currently uses canvas fallback drawings. After these alpha PNGs are placed, change `USE_ALPHA_SPRITES` near the top of the script from `false` to `true`.
