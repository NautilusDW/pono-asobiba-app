> ⚠️ **文字化けチェック**: この行が読めない場合、UTF-8 で開き直してください (VS Code: コマンドパレット → "Reopen with Encoding" → "UTF-8")。 詳細: AGENTS.md §0.1 / §4 ルール 7
> ℹ️ **PowerShell 5.1 注記**: 素の `Get-Content <file>` は CP932 解釈で化けて見えますが **false positive** (ファイル本体は UTF-8 で正常)。 読み直し手順は §0.1 参照。

# Bento Shop Customer Background And Pono Edge Fix Raw

- Batch: `486_bento_shop_customer_bg_and_pono_edge_fix_raw`
- 目的: user 指摘「ポノが切れている」「お客さん側画面の外は木だけがいい」「左カウンター上の3点の順番が逆」を反映。
- 生成: お客さん側背景のみ GPT Image 2 built-in imagegen 編集生成。
- 後処理: alpha 抜き、切り抜きなし。ポノ側は既存 alpha 素材の合成調整のみ。

## 推奨ファイル

- `pono_variant03_size_counter_opaque_paws_on_top_recommended.png`
  - batch 483 の `variant03_more_up` と同じポノサイズ・位置。
  - カウンター境目は不透明にしつつ、ポノの両手だけを上に戻して、ぶつ切りではなく手を置いている形に調整。
- `staff_side_order_bg_variant02_trees_only_counter_order_fixed_raw.png`
  - お客さん側注文背景の修正版。
  - 外は木だけにし、左カウンター上の3点を左から「かご・鉢・箸立て」に修正。

## 比較用

- `pono_counter_edge_review_contact_sheet.jpg`
  - ポノの元案、切れすぎ案、修正案の比較。
- `staff_side_order_bg_review_contact_sheet.jpg`
  - お客さん側背景の元案と修正版の比較。
- `pono_variant03_size_counter_edge_opaque_paws_visible.png`
  - 参考案。カウンター境目のみ不透明にした版。
- `pono_variant03_size_counter_edge_opaque_soft_occlusion.png`
  - 参考案。カウンター前景を少し低めに戻した版。
