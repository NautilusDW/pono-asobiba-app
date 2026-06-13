> ⚠️ **文字化けチェック**: この行が読めない場合、UTF-8 で開き直してください (VS Code: コマンドパレット → "Reopen with Encoding" → "UTF-8")。 詳細: AGENTS.md §0.1 / §4 ルール 7
> ℹ️ **PowerShell 5.1 注記**: 素の `Get-Content <file>` は CP932 解釈で化けて見えますが **false positive** (ファイル本体は UTF-8 で正常)。 読み直し手順は §0.1 参照。

# Bento Shop Staff Side Order Background Raw

- Batch: `485_bento_shop_staff_side_order_bg_raw`
- 目的: user 要望「動物たちが入ってきてカウンターで注文する背景。お客さん側ではなく、カウンター越しの景色。少し外も見える感じ」を反映。
- 生成: GPT Image 2 built-in imagegen
- 後処理: alpha 抜き、切り抜きなし。生成 raw をそのまま保存。

## 方針

- 店員側からカウンター越しに客側を見る構図。
- 後から動物スプライトと吹き出しを載せるため、中央の床と入口付近を空ける。
- 既存の絵本風お弁当屋さんテイスト、木のカウンター、植物、パステル弁当箱を維持。
- 人間、ポノ、動物、吹き出し、文字は入れない。

## ファイル

- `staff_side_order_bg_variant01_raw.png`
  - 入口と外の見え方が強い案。
  - 左右の棚もあり、背景としての情報量が多め。
- `staff_side_order_bg_variant02_raw.png`
  - 推奨案。
  - 中央が広く空いており、動物の入場・停止・注文吹き出しを重ねやすい。
- `review_contact_sheet.jpg`
  - 2案を並べた確認用。
