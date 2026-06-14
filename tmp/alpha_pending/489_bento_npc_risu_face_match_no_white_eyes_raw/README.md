> ⚠️ **文字化けチェック**: この行が読めない場合、UTF-8 で開き直してください (VS Code: コマンドパレット → "Reopen with Encoding" → "UTF-8")。 詳細: AGENTS.md §0.1 / §4 ルール 7
> ℹ️ **PowerShell 5.1 注記**: 素の `Get-Content <file>` は CP932 解釈で化けて見えますが **false positive** (ファイル本体は UTF-8 で正常)。 読み直し手順は §0.1 参照。

# Bento NPC Risu Face Match No White Eyes Raw

- Batch: `489_bento_npc_risu_face_match_no_white_eyes_raw`
- 目的: user 指摘「リスも。今まで出てきたのと顔が違う感じなので調べて」を反映。
- 生成: GPT Image 2 built-in imagegen
- 後処理: alpha 抜き、切り抜きなし。生成 raw をそのまま保存。

## 参照した既存リス

- `maze/imageStages/animals/risu_01.png`
- `maze/imageStages/animals/risu_02.png`
- `maze/imageStages/animals/risu_goal.png`
- `assets/zukan/animals/sunlit_forest/squirrel.png`
- `assets/images/puzzle/partners/partner_risu.webp`
- batch 487 の旧リス

## 方針

- batch 487 の形式を維持。
- 1体につき1枚の表情シート。
- 白バック、円枠なし、ラベルなし、カウンター/机なし。
- カウンター越しに注文しているように、腰上/上半身の画角。
- 既存リス寄せで、赤茶色、細めの顔、クリーム色の口元/胸、大きな巻き尾、少し尖った耳に調整。
- 目は黒い点目に寄せ、白い白目・白い光点・星目を避ける。

## 表情配置

各シートは 2列 x 3段。右下は空白。

1. 左上: `request` / 最初のお願い。期待している表情。
2. 右上: `happy` / 通常の喜び。
3. 左中: `super_happy` / perfect 時の大げさな喜び。
4. 右中: `almost` / 惜しい時。困り笑い、少し不安。
5. 左下: `sad` / 外した時。泣きすぎないしょんぼり。
6. 右下: 空白。

## ファイル

- `npc_risu_counter_5expressions_face_match_no_white_eyes_raw.png`
- `reference_contact_sheet.jpg`
- `review_contact_sheet.jpg`
