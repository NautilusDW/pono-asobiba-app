> ⚠️ **文字化けチェック**: この行が読めない場合、UTF-8 で開き直してください (VS Code: コマンドパレット → "Reopen with Encoding" → "UTF-8")。 詳細: AGENTS.md §0.1 / §4 ルール 7
> ℹ️ **PowerShell 5.1 注記**: 素の `Get-Content <file>` は CP932 解釈で化けて見えますが **false positive** (ファイル本体は UTF-8 で正常)。 読み直し手順は §0.1 参照。

# Bento Shop Counter Support Fix Raw

- Batch: `472_bento_shop_counter_support_fix_raw`
- 目的: user 指摘「カウンターの長さに無理がある / 宙に浮いている」を反映した raw 修正版。
- 生成: GPT Image 2 built-in imagegen
- 後処理: alpha 抜き、切り抜き、最適化なし。生成結果を raw のまま保存。

## 修正内容

- 女の子の右側でカウンターが自然に終わるように調整。
- カウンター右端に収納台 / 側板 / 支えを入れ、木の板が宙に浮いて見えない構造へ修正。
- ショーケース右側から右の平積み棚まで、スタッフが通れる木床の空き通路を維持。
- 右側の平積み棚は、メインカウンターとは別の床置き棚として分離。

## ファイル

- `shop_interior_counter_support_fix_variant01_raw.png`
  - 推奨案。
  - 16:9 店内背景、未透過 raw。
