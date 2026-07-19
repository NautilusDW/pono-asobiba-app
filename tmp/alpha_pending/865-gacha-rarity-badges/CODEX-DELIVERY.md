> ⚠️ **文字化けチェック**: この行が読めない場合、UTF-8 で開き直してください (VS Code: コマンドパレット → "Reopen with Encoding" → "UTF-8")。 詳細: AGENTS.md §0.1 / §4 ルール 8
> ℹ️ **PowerShell 5.1 注記**: 素の `Get-Content <file>` は CP932 解釈で化けて見えますが **false positive** (ファイル本体は UTF-8 で正常)。 読み直し手順は AGENTS.md §0.1 参照。

# batch:865-gacha-rarity-badges

ガチャ結果の右上ランク表示用に、GPT Image 2 で文字なし台座を 2 点生成しました。

- `daily_gacha_rarity_badge_rare_silver_raw.png`: レア用の銀色台座 raw
- `daily_gacha_rarity_badge_super_rainbow_gold_raw.png`: スーパーレア用の虹色 + 白金台座 raw

実装側では raw からクロマキー背景を透過し、512px PNG に縮小した以下のファイルを使用しています。`R` / `SR` の文字は生成画像へ焼き込まず、`play.html` のUIテキストで重ねています。例外理由: GPT Image 2 は文字崩れのリスクがあるため、見た目素材である台座のみを生成し、ユーザー指定の短いランク文字は通常UIテキストとして表示しています。

- `assets/ui/gacha/daily_gacha_rarity_badge_rare_silver_20260627.png`
- `assets/ui/gacha/daily_gacha_rarity_badge_super_rainbow_gold_20260627.png`
