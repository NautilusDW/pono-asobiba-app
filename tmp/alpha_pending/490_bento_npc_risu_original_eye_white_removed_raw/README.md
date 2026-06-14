> ⚠️ **文字化けチェック**: この行が読めない場合、UTF-8 で開き直してください (VS Code: コマンドパレット → "Reopen with Encoding" → "UTF-8")。 詳細: AGENTS.md §0.1 / §4 ルール 7
> ℹ️ **PowerShell 5.1 注記**: 素の `Get-Content <file>` は CP932 解釈で化けて見えますが **false positive** (ファイル本体は UTF-8 で正常)。 読み直し手順は §0.1 参照。

# Bento NPC Risu Original Eye White Removed Raw

- Batch: `490_bento_npc_risu_original_eye_white_removed_raw`
- 目的: user 指摘「白目の部分だけ無くしてって言ったの」を反映。
- 元画像: `tmp/alpha_pending/487_bento_npc_counter_order_expressions_white_raw/npc_risu_counter_5expressions_white_raw.png`
- 後処理: 元画像の顔、体、表情、構図、しっぽ、耳は維持。目の白いハイライト部分のみ除去。
- alpha 抜き、切り抜きなし。

## 方針

- batch 489 のような顔の再生成/顔立ち変更はしない。
- batch 487 のリスをそのままベースにする。
- 検出した10個の目の領域だけを処理する。
- 白い白目/白いハイライトが残らないように、目の内部を黒から濃茶の点目に整える。

## ファイル

- `npc_risu_counter_5expressions_original_eye_white_removed_raw.png`
- `review_contact_sheet.jpg`
- `detected_eye_regions_review.jpg`
