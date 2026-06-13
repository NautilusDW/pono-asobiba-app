> ⚠️ **文字化けチェック**: この行が読めない場合、UTF-8 で開き直してください (VS Code: コマンドパレット → "Reopen with Encoding" → "UTF-8")。 詳細: AGENTS.md §0.1 / §4 ルール 7
> ℹ️ **PowerShell 5.1 注記**: 素の `Get-Content <file>` は CP932 解釈で化けて見えますが **false positive** (ファイル本体は UTF-8 で正常)。 読み直し手順は §0.1 参照。

# Bento Shop Scale Apron Fix Raw

- Batch: `477_bento_shop_scale_apron_fix_raw`
- 目的: user 指摘「2番目はショーケースが窮屈 / 右側8個の弁当箱が小さすぎる / ポノがパンツ1丁みたい」を反映した raw 修正版。
- 生成: GPT Image 2 built-in imagegen
- 後処理: alpha 抜き、切り抜き、最適化なし。生成結果を raw のまま保存。

## 修正内容

- ショーケース内を6個程度に減らし、4+4の詰め込み配置を避けた。
- 右側の平積み棚は6個程度にして、ショーケース内の弁当箱と比べても極端に小さく見えない縮尺へ修正。
- ポノの黄色い服は、下だけのパンツ風ではなく、胸当てと肩ひものある前掛け / エプロンとして見える方向へ調整。
- カウンターは右側通路へ伸ばさず、ショーケース右端の支えで止まる構造を維持。

## ファイル

- `shop_interior_scale_apron_fix_variant01_raw.png`
  - 推奨案。
  - 16:9 店内背景、未透過 raw。
