> ⚠️ **文字化けチェック**: この行が読めない場合、UTF-8 で開き直してください (VS Code: コマンドパレット → "Reopen with Encoding" → "UTF-8")。 詳細: AGENTS.md §0.1 / §4 ルール 7
> ℹ️ **PowerShell 5.1 注記**: 素の `Get-Content <file>` は CP932 解釈で化けて見えますが **false positive** (ファイル本体は UTF-8 で正常)。 読み直し手順は §0.1 参照。

# Bento Shop Pono 1.1x Slightly Up Raw

- Batch: `483_bento_shop_pono_1_1x_slightly_up_raw`
- 目的: user 指摘「めっちゃ惜しい。全体的に1.1倍、ほんのちょっと上に」を反映。
- 生成: なし。batch 479 の背景に既存 `assets/images/bento/ui/decor_pono_front.png` を再合成。
- 後処理: alpha 抜き、切り抜きなし。既存 alpha 付きポノ素材の合成と、カウンター前景の復元のみ実施。

## ファイル

- `shop_interior_pono_1_1x_slightly_up_variant02_recommended.png`
  - 推奨案。
  - batch 482 の高さ156pxから約1.1倍の172pxへ拡大。下端はほぼ維持し、頭と顔が少し上に出る自然な調整。
- `shop_interior_pono_1_1x_slightly_up_variant03_more_up.png`
  - 高さ172pxのまま、さらに少し上へ上げた比較案。
- `shop_interior_pono_1_1x_slightly_up_variant04_soft_mid.png`
  - 高さ168pxの中間比較案。
- `review_contact_sheet.jpg`
  - batch 482 の推奨案と今回3案を並べた確認用。
