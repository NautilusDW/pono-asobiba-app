> ⚠️ **文字化けチェック**: この行が読めない場合、UTF-8 で開き直してください (VS Code: コマンドパレット → "Reopen with Encoding" → "UTF-8")。 詳細: AGENTS.md §0.1 / §4 ルール 7
> ℹ️ **PowerShell 5.1 注記**: 素の `Get-Content <file>` は CP932 解釈で化けて見えますが **false positive** (ファイル本体は UTF-8 で正常)。 読み直し手順は §0.1 参照。

# Bento Shop Back Shelf Small Pono Ref Raw

- Batch: `479_bento_shop_back_shelf_small_pono_ref_raw`
- 目的: user 指摘「後ろの弁当箱がデカすぎ / ポノがポノに見えない」を反映した raw / 合成候補。
- 生成: GPT Image 2 built-in imagegen
- 後処理: alpha 抜き、切り抜きなし。

## 修正内容

- 後ろ棚のうさぎ型、花型、細長型、雲/葉型の弁当箱を小さい見本サイズへ縮小。
- 生成でポノを描かせる案とは別に、ポノなし背景を生成し、既存の正しい `assets/images/bento/ui/decor_pono_front.png` を合成した案を作成。
- 合成案は、ポノの顔・毛・体型を生成に任せず、既存素材そのものを使うため、ポノの見た目が安定する。

## ファイル

- `shop_interior_back_shelf_small_pono_ref_variant01_raw.png`
  - 生成内でポノも描いた案。
  - 後ろ棚の箱は小さくなったが、ポノはまだ生成ズレがある。
- `shop_interior_back_shelf_small_no_pono_base_raw.png`
  - ポノなし背景。
  - 既存ポノ素材を後から載せるためのベース。
- `shop_interior_back_shelf_small_exact_pono_composite_variant02.png`
  - 推奨案。
  - `decor_pono_front.png` を合成した案。ポノの大きさは控えめ。
- `shop_interior_back_shelf_small_exact_pono_composite_variant03.png`
  - 既存ポノを少し大きめに合成した案。
- `review_contact_sheet.jpg`
  - 上記4案の確認用コンタクトシート。
