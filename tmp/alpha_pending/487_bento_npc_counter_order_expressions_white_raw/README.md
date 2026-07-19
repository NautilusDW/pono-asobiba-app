> ⚠️ **文字化けチェック**: この行が読めない場合、UTF-8 で開き直してください (VS Code: コマンドパレット → "Reopen with Encoding" → "UTF-8")。 詳細: AGENTS.md §0.1 / §4 ルール 7
> ℹ️ **PowerShell 5.1 注記**: 素の `Get-Content <file>` は CP932 解釈で化けて見えますが **false positive** (ファイル本体は UTF-8 で正常)。 読み直し手順は §0.1 参照。

# Bento NPC Counter Order Expressions White Raw

- Batch: `487_bento_npc_counter_order_expressions_white_raw`
- 目的: user 要望「それぞれの動物がカウンター越しに頼む感じの画角で、必要な表情と共に白バック」を反映。
- 生成: GPT Image 2 built-in imagegen
- 後処理: alpha 抜き、切り抜きなし。生成 raw をそのまま保存。

## 方針

- 1体につき1枚の表情シート。全動物を1枚に詰めない。
- 白バック、円枠なし、ラベルなし、カウンター/机なし。
- カウンター越しに注文しているように、腰上/上半身の画角で、手や前足を下端近くに置く。
- 後でユーザーが Photoshop で alpha 抜き・切り出しする前提。

## 表情配置

各シートは 2列 x 3段。右下は空白。

1. 左上: `request` / 最初のお願い。期待している表情。
2. 右上: `happy` / 通常の喜び。
3. 左中: `super_happy` / perfect 時の大げさな喜び。
4. 右中: `almost` / 惜しい時。困り笑い、少し不安。
5. 左下: `sad` / 外した時。泣きすぎないしょんぼり。
6. 右下: 空白。

## ファイル

- `npc_risu_counter_5expressions_white_raw.png`
- `npc_inu_counter_5expressions_white_raw.png`
- `npc_ahiru_counter_5expressions_white_raw.png`
- `npc_shika_counter_5expressions_white_raw.png`
- `npc_lesser_panda_counter_5expressions_white_raw.png`
- `npc_neko_counter_5expressions_white_raw.png`
- `review_contact_sheet.jpg`
