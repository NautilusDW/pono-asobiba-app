> ⚠️ **文字化けチェック**: この行が読めない場合、UTF-8 で開き直してください (VS Code: コマンドパレット → "Reopen with Encoding" → "UTF-8")。 詳細: AGENTS.md §0.1 / §4 ルール 8
> ℹ️ **PowerShell 5.1 注記**: 素の `Get-Content <file>` は CP932 解釈で化けて見えますが **false positive** (ファイル本体は UTF-8 で正常)。 読み直し手順は §0.1 参照。

# batch:869-gacha-rarity-lettermarks

ガチャ結果の R / SR 表示を、台座付きバッジではなく文字そのものを装飾した lettermark へ差し替えました。

## Raw

- `daily_gacha_rarity_lettermark_r_silver_raw.png`: レア用の銀色 R lettermark raw
- `daily_gacha_rarity_lettermark_sr_rainbow_gold_raw.png`: スーパーレア用の虹色 + 白金 SR lettermark raw

## Implemented assets

- `assets/ui/gacha/daily_gacha_rarity_lettermark_r_silver_20260628.png`
- `assets/ui/gacha/daily_gacha_rarity_lettermark_sr_rainbow_gold_20260628.png`

ユーザー指摘の「透けている」見え方を抑えるため、最終PNGは文字本体の alpha を硬めにし、可視領域の 99% 以上が不透明になるように調整済みです。

## UI behavior

- レア / スーパーレア時のみシール右上に lettermark を表示します。
- 下の名前プレートには、レア度別の喜び一言と出たシール名を表示します。
  - 通常: `やったね！`
  - レア: `すごいね！`
  - スーパーレア: `やったー！すごい！`

例外理由: 今回はユーザーから生成素材の実装まで一括依頼があったため、raw 納品に加えて `play.html` への組み込みと最終PNG配置まで実施しています。
