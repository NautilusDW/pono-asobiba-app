> ⚠️ **文字化けチェック**: この行が読めない場合、UTF-8 で開き直してください (VS Code: コマンドパレット → "Reopen with Encoding" → "UTF-8")。 詳細: AGENTS.md §0.1 / §4 ルール 7
> ℹ️ **PowerShell 5.1 注記**: 素の `Get-Content <file>` は CP932 解釈で化けて見えますが **false positive** (ファイル本体は UTF-8 で正常)。 読み直し手順は §0.1 参照。

# Bento Shop Pono Tiny Counter Continuous Raw

- Batch: `482_bento_shop_pono_tiny_counter_continuous_raw`
- 目的: user 指摘「268pxよりもっと小さく、顔は男の子と同じぐらい、身長は男の子の口ぐらい。ポノ前だけカウンターがえぐれないように」を反映。
- 生成: なし。batch 479 の背景に既存 `assets/images/bento/ui/decor_pono_front.png` を小さく合成。
- 後処理: alpha 抜き、切り抜きなし。既存 alpha 付きポノ素材の合成と、カウンター前景の復元のみ実施。

## ファイル

- `shop_interior_pono_tiny_counter_continuous_variant02_recommended.png`
  - 推奨案。
  - ポノ素材を高さ156pxに縮小。頭頂が男の子の口あたり、顔サイズも男の子に近い。
  - ポノの前に元背景のカウンターを戻し、カウンターがえぐれて見えないように調整。
- `shop_interior_pono_tiny_counter_continuous_variant03_smaller.png`
  - さらに小さい高さ144pxの比較案。
- `shop_interior_pono_tiny_counter_continuous_variant04_low.png`
  - 高さ160pxで少し低めに置いた比較案。
- `review_contact_sheet.jpg`
  - batch 481 の268px案と今回3案を並べた確認用。
