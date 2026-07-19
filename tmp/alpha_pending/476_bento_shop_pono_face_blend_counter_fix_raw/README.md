> ⚠️ **文字化けチェック**: この行が読めない場合、UTF-8 で開き直してください (VS Code: コマンドパレット → "Reopen with Encoding" → "UTF-8")。 詳細: AGENTS.md §0.1 / §4 ルール 7
> ℹ️ **PowerShell 5.1 注記**: 素の `Get-Content <file>` は CP932 解釈で化けて見えますが **false positive** (ファイル本体は UTF-8 で正常)。 読み直し手順は §0.1 参照。

# Bento Shop Pono Face Blend Counter Fix Raw

- Batch: `476_bento_shop_pono_face_blend_counter_fix_raw`
- 目的: user 指摘「顔が境界線で浮いて見える / 首元を体につなげる / 頭の影を体に落とさない / カウンターが元に戻っている」を反映した raw 修正版。
- 生成: GPT Image 2 built-in imagegen
- 後処理: alpha 抜き、切り抜き、最適化なし。生成結果を raw のまま保存。

## 修正内容

- ポノの下あご・首元に濃い輪郭線や影を入れず、頭下の毛を胸の毛へなじませる方向で調整。
- 顔を別パーツのように貼り付けず、ぬいぐるみ本体として一体感が出るように修正。
- 白シャツなし、首を立てない丸いぬいぐるみ体型を維持。
- カウンターはショーケース右端で明確に止め、右側の床通路を空ける構造に修正。
- 右側の平積み棚は独立した床置き棚として維持。

## ファイル

- `shop_interior_pono_face_blend_counter_fix_variant01_raw.png`
  - ポノのつながりは改善したが、カウンターがまだやや長めに見える案。
- `shop_interior_pono_face_blend_counter_fix_variant02_raw.png`
  - 推奨案。
  - ポノの頭下の影が薄く、カウンターが短く止まり、右側通路が広く見える。
- `review_contact_sheet.jpg`
  - 2案の確認用コンタクトシート。
