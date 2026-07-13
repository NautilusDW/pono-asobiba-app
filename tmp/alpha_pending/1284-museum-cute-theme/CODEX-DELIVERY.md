> ⚠️ **文字化けチェック**: この行が読めない場合、UTF-8 で開き直してください (VS Code: コマンドパレット → "Reopen with Encoding" → "UTF-8")。 詳細: AGENTS.md §0.1 / §4 ルール 8
> ℹ️ **PowerShell 5.1 注記**: 素の `Get-Content <file>` は CP932 解釈で化けて見えますが false positive です。必ず UTF-8 で読み直してください。

# batch:1284-museum-cute-theme — GPT Image 2 raw delivery

## 採用raw

- `raw/sticker-exhibition-map-cute-gpt-image2-20260713-raw.png`
  - 1672×941 RGB / 2.7MB
  - 既存マップの8区画・階段・カメラを維持し、明るい木・クリーム・ミント・桃色の絵本調へ編集。
- `raw/sticker-exhibition-room-cute-gpt-image2-20260713-raw.png`
  - 1672×941 RGB / 1.7MB
  - 中央のカルーセル安全領域と正面遠近を維持し、木のおもちゃミュージアムへ編集。
- `raw/sticker-carousel-frame-cute-gpt-image2-20260713-raw.png`
  - 1448×1086 RGB / 1.6MB
  - 額・展示面・台座・空の銘板位置を維持した明るい木と若草色の額。外側の市松模様はrawへ焼き込まれている。

## プロンプト方針

GPT Image 2 built-in editを使用。共通指定は「既存構図・カメラ・UI安全領域を固定」「ミュージアムらしい展示・額・階段を残す」「シールちょうに合う明るい木、クリーム、淡いミント／空色／桃色、葉・花・星の控えめな絵本調」「文字・UI・人物・ロゴ・暗い洋館・深い赤茶・ネオンを追加しない」。額はマップ／館内背景を追加の画風参照にした。

## 実装済み派生

- `Prototypes/StickerExhibitionCarousel/assets/sticker-exhibition-map-cute-20260713.webp`
- `Prototypes/StickerExhibitionCarousel/assets/sticker-exhibition-room-bg-cute-20260713.webp`
- `Prototypes/StickerExhibitionCarousel/assets/sticker-carousel-frame-cute-20260713.webp`

マップ／背景はq92 WebPへ最適化。額はraw外側の市松模様を境界連結判定で除去し、soft alphaを付けてalpha_q100 WebPへ最適化した。LP用ギャラリー／マップ画像も実画面から1280×720で再撮影し、versioned WebPへ保存済み。
