> ⚠️ **文字化けチェック**: この行が読めない場合、UTF-8 で開き直してください (VS Code: コマンドパレット → "Reopen with Encoding" → "UTF-8")。 詳細: AGENTS.md §0.1 / §4 ルール 7
> ℹ️ **PowerShell 5.1 注記**: 素の `Get-Content <file>` は CP932 解釈で化けて見えますが **false positive** (ファイル本体は UTF-8 で正常)。 読み直し手順は §0.1 参照。

# Bento Shop Pono Smaller Than Kids Raw

- Batch: `481_bento_shop_pono_smaller_than_kids_raw`
- 目的: user 指摘「ポノを子供たちよりちょっと小さくしてほしい」を反映。
- 生成: なし。batch 479 の背景に既存 `assets/images/bento/ui/decor_pono_front.png` をサイズ調整して合成。
- 後処理: alpha 抜き、切り抜きなし。既存 alpha 付きポノ素材の合成のみ実施。

## ファイル

- `shop_interior_pono_smaller_than_kids_front_variant02.png`
  - 推奨案。
  - batch 480 の大きめポノから縮小し、子どもたちより少し小さく見える高さに調整。
- `shop_interior_pono_smaller_than_kids_front_variant03.png`
  - さらに少し小さい比較案。
  - 左側の空間がやや戻るため、採用優先度は低め。
- `review_contact_sheet.jpg`
  - batch 480 の大きい案と今回2案を並べた確認用。
