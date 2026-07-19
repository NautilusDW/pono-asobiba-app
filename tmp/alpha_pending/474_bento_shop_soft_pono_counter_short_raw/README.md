> ⚠️ **文字化けチェック**: この行が読めない場合、UTF-8 で開き直してください (VS Code: コマンドパレット → "Reopen with Encoding" → "UTF-8")。 詳細: AGENTS.md §0.1 / §4 ルール 7
> ℹ️ **PowerShell 5.1 注記**: 素の `Get-Content <file>` は CP932 解釈で化けて見えますが **false positive** (ファイル本体は UTF-8 で正常)。 読み直し手順は §0.1 参照。

# Bento Shop Soft Pono Counter Short Raw

- Batch: `474_bento_shop_soft_pono_counter_short_raw`
- 目的: user 指摘「毛が硬そう / 1枚目の黄色い服の方が柔らかそう / カウンターがまた伸びすぎ」を反映した raw 修正版。
- 生成: GPT Image 2 built-in imagegen
- 後処理: alpha 抜き、切り抜き、最適化なし。生成結果を raw のまま保存。

## 修正内容

- ポノは `473` の1案目に近い黄色い服の柔らかい印象を基準にし、硬い針状の毛束を避ける方向へ調整。
- 長い毛を強調しすぎず、丸い毛束・淡い水彩のぼかし・柔らかい輪郭を優先。
- カウンターは女の子の右側で支え付き収納に接続し、右側通路までは伸びない構造へ修正。
- 右側の平積み棚は独立した床置き棚として維持。

## ファイル

- `shop_interior_soft_pono_counter_short_variant01_raw.png`
  - 推奨案。
  - 16:9 店内背景、未透過 raw。
