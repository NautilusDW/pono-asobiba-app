> ⚠️ **文字化けチェック**: この行が読めない場合、UTF-8 で開き直してください (VS Code: コマンドパレット → "Reopen with Encoding" → "UTF-8")。 詳細: AGENTS.md §0.1 / §4 ルール 7
> ℹ️ **PowerShell 5.1 注記**: 素の `Get-Content <file>` は CP932 解釈で化けて見えますが **false positive** (ファイル本体は UTF-8 で正常)。 読み直し手順は §0.1 参照。

# Bento NPC Shika Original Sparkle Kept Raw

- Batch: `491_bento_npc_shika_original_sparkle_kept_raw`
- 目的: user 指摘「鹿はおかしい。目の中のキラキラは残しておいていい」を反映。
- 元画像: `tmp/alpha_pending/487_bento_npc_counter_order_expressions_white_raw/npc_shika_counter_5expressions_white_raw.png`
- 後処理: alpha 抜き、切り抜きなし。

## 方針

- batch 488 の黒い点目版は採用しない。
- 鹿は batch 487 の元鹿を復帰させる。
- 目の中のキラキラ/ハイライトは残す。
- 顔、体、表情、構図、耳、手足は元画像のまま。

## ファイル

- `npc_shika_counter_5expressions_original_sparkle_kept_raw.png`
- `review_contact_sheet.jpg`
- `original_eye_crop_review.jpg`
