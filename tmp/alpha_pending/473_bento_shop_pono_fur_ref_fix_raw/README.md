> ⚠️ **文字化けチェック**: この行が読めない場合、UTF-8 で開き直してください (VS Code: コマンドパレット → "Reopen with Encoding" → "UTF-8")。 詳細: AGENTS.md §0.1 / §4 ルール 7
> ℹ️ **PowerShell 5.1 注記**: 素の `Get-Content <file>` は CP932 解釈で化けて見えますが **false positive** (ファイル本体は UTF-8 で正常)。 読み直し手順は §0.1 参照。

# Bento Shop Pono Fur Reference Fix Raw

- Batch: `473_bento_shop_pono_fur_ref_fix_raw`
- 目的: user 添付スクショを参照し、ポノの頭身・長い毛・白いお腹・顔を作り直した raw 修正版。
- 生成: GPT Image 2 built-in imagegen
- 後処理: alpha 抜き、切り抜き、最適化なし。生成結果を raw のまま保存。

## 修正内容

- ポノを帽子なしにして、頭頂・耳・頬の長い毛を見せる方向へ修正。
- 添付スクショのポノに近い、長い毛束、丸い頭、広い耳、白い口元、白いお腹、短い手足の比率を優先。
- カウンター支え、右側の通路、別体の平積み棚は前回の構造修正版を維持。
- 男の子・女の子の白い店員帽、ショーケース、後ろ棚、弁当箱形状は維持。

## ファイル

- `shop_interior_pono_fur_ref_fix_variant01_raw.png`
  - 服付きのポノ案。
  - 前回より毛は増えているが、店員服の印象がやや強い。
- `shop_interior_pono_fur_ref_fix_variant02_raw.png`
  - 推奨案。
  - 帽子なしで、参照スクショの長い毛・白いお腹・丸い体が読みやすい。
- `review_contact_sheet.jpg`
  - 2案の確認用コンタクトシート。
