> ⚠️ **文字化けチェック**: この行が読めない場合、UTF-8 で開き直してください (VS Code: コマンドパレット → "Reopen with Encoding" → "UTF-8")。 詳細: AGENTS.md §0.1 / §4 ルール 7
> ℹ️ **PowerShell 5.1 注記**: 素の `Get-Content <file>` は CP932 解釈で化けて見えますが **false positive** (ファイル本体は UTF-8 で正常)。 読み直し手順は §0.1 参照。

# Bento Shop Pono Hat Rug Raw

- Batch: `470_bento_shop_pono_hat_rug_raw`
- 目的: user 指定の「テイストが一番良い店内背景」をベースに、ポノ追加、帽子変更、左下ラグ調整を行った raw 案。
- 生成: GPT Image 2 built-in imagegen
- 後処理: alpha 抜き、切り抜き、最適化なし。生成結果を raw のまま保存。

## 修正内容

- ポノを左側の店員として追加。
- 男の子、女の子、ポノの帽子を、参照画像寄りの白いふくらみのある店員帽に変更。
- 左下の黄色いチェック柄ラグ / テーブルクロス風の見え方を避け、床マット寄りに変更。
- 既存のショーケース、後ろ棚、右側の平積み弁当箱の構成は維持。

## ファイル

- `shop_interior_pono_hat_rug_variant01_raw.png`
  - 推奨案。
  - 16:9 店内背景、未透過 raw。
