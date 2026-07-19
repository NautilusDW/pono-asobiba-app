> ⚠️ **文字化けチェック**: この行が読めない場合、UTF-8 で開き直してください (VS Code: コマンドパレット → "Reopen with Encoding" → "UTF-8")。 詳細: AGENTS.md §0.1 / §4 ルール 7
> ℹ️ **PowerShell 5.1 注記**: 素の `Get-Content <file>` は CP932 解釈で化けて見えますが **false positive** (ファイル本体は UTF-8 で正常)。 読み直し手順は §0.1 参照。

# Bento Shop Pono Design Walkway Fix Raw

- Batch: `471_bento_shop_pono_design_walkway_fix_raw`
- 目的: user 指摘「ポノのキャラデザ/等身がおかしい」「右側にお弁当箱を置くと出入りできない」を反映した raw 修正版。
- 生成: GPT Image 2 built-in imagegen
- 後処理: alpha 抜き、切り抜き、最適化なし。生成結果を raw のまま保存。

## 修正内容

- ポノを既存Bento用ポノに近い、丸い頭・短い胴・小さい手足のマスコット比率へ修正。
- ポノはカウンター奥から胸上だけ見える配置にし、背が高い人型の熊に見えないよう調整。
- 右側の平積み棚を壁寄りに離し、ショーケース右側にスタッフが通れる木床の空き通路を確保。
- 左下の床は、テーブルクロスに見えにくい低い自然素材マット寄りに維持。

## ファイル

- `shop_interior_pono_design_walkway_fix_variant01_raw.png`
  - 推奨案。
  - 16:9 店内背景、未透過 raw。
