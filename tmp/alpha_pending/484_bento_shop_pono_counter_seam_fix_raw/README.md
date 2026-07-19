> ⚠️ **文字化けチェック**: この行が読めない場合、UTF-8 で開き直してください (VS Code: コマンドパレット → "Reopen with Encoding" → "UTF-8")。 詳細: AGENTS.md §0.1 / §4 ルール 7
> ℹ️ **PowerShell 5.1 注記**: 素の `Get-Content <file>` は CP932 解釈で化けて見えますが **false positive** (ファイル本体は UTF-8 で正常)。 読み直し手順は §0.1 参照。

# Bento Shop Pono Counter Seam Fix Raw

- Batch: `484_bento_shop_pono_counter_seam_fix_raw`
- 目的: user 指定「大きさは `shop_interior_pono_1_1x_slightly_up_variant03_more_up.png` が良い。カウンターとの境目が透けているのでそこだけ直す」を反映。
- 生成: なし。batch 483 の `variant03_more_up` と同じポノサイズ・位置で再合成。
- 後処理: alpha 抜き、切り抜きなし。既存 alpha 付きポノ素材の合成と、カウンター前景の不透明復元のみ実施。

## ファイル

- `shop_interior_pono_1_1x_variant03_counter_seam_fixed.png`
  - 推奨案。
  - `variant03_more_up` のサイズと位置を維持し、カウンター境目のフェザー/半透明なじませを廃止。
  - 元背景のカウンターを不透明で前景復元し、ポノ前だけ透けて見える問題を修正。
- `shop_interior_pono_1_1x_variant03_counter_seam_fixed_lowcut_compare.png`
  - 比較案。カウンターの切り位置を少し低くして、ポノの手元を少し多めに残した版。
- `review_contact_sheet.jpg`
  - 元の `variant03_more_up`、推奨修正版、比較案を並べ、右側に境目の拡大を付けた確認用。
