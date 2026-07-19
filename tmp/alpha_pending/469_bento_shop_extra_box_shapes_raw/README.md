> ⚠️ **文字化けチェック**: この行が読めない場合、UTF-8 で開き直してください (VS Code: コマンドパレット → "Reopen with Encoding" → "UTF-8")。 詳細: AGENTS.md §0.1 / §4 ルール 7
> ℹ️ **PowerShell 5.1 注記**: 素の `Get-Content <file>` は CP932 解釈で化けて見えますが **false positive** (ファイル本体は UTF-8 で正常)。 読み直し手順は §0.1 参照。

# Bento Shop Extra Box Shapes Raw

- Batch: `469_bento_shop_extra_box_shapes_raw`
- 目的: お弁当屋さん店内背景に、今後追加予定の「お弁当箱の形」と「蓋」を3-4種類混ぜた raw 案。
- 生成: GPT Image 2 built-in imagegen
- 後処理: alpha 抜き、切り抜き、最適化なし。生成結果を raw のまま保存。

## 追加した箱の方向性

- うさぎ耳型の丸い弁当箱 + 蓋
- 花びら / スカラップ丸型の弁当箱 + 蓋
- 細長い二段風の角丸弁当箱 + 蓋
- 葉っぱ / 雲っぽい丸みの弁当箱 + 蓋

## ファイル

- `shop_interior_extra_box_shapes_variant01_raw.png`
  - ポノ、男の子、女の子入り。
  - 箱と蓋の見本が見やすいが、ショーケース内がやや箱見本寄り。
- `shop_interior_extra_box_shapes_variant02_raw.png`
  - ショーケース内の中身入り弁当と追加形状の混ざり方は良い。
  - ただしポノが抜けているため参考案。
- `shop_interior_extra_box_shapes_variant03_raw.png`
  - 推奨案。
  - ポノ、男の子、女の子が入り、ショーケース、後ろ棚、右側の腰下平積みに新しい箱形状と蓋が自然に混ざっている。
- `review_contact_sheet.jpg`
  - 上記3案の確認用コンタクトシート。
