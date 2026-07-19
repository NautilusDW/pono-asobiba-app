> ⚠️ **文字化けチェック**: この行が読めない場合、UTF-8 で開き直してください (VS Code: コマンドパレット → "Reopen with Encoding" → "UTF-8")。 詳細: AGENTS.md §0.1 / §4 ルール 8
> ℹ️ **PowerShell 5.1 注記**: 素の `Get-Content <file>` は CP932 解釈で化けて見えますが **false positive** (ファイル本体は UTF-8 で正常)。 読み直し手順は AGENTS.md §0.1 参照。

# 1059 なぞなぞトンネル 町ステージ調整

- 目的: 町外れステージの手前草むらレイヤー差し替え、列車向き/タイヤ/駅チェックポイント実装修正。
- 生成: GPT Image 2 built-in。
- raw: `raw/town_foreground_low_saplings_raw_gpt_image2.png`
- processed: `processed/town_foreground_low_saplings_alpha.png`
- runtime: `assets/images/nazonazo-tunnel/town_foreground_low_saplings_20260703.webp`

注意:
- 生成プロンプトでは `#ff00ff` chroma-key を指定したが、出力は白背景寄りだった。
- 実装用は外周の白背景をローカルで透明化した。
- タイヤは新規生成ではなく、既存 raw sheet `1056-nazonazo-vehicle-town-assets/nazonazo_vehicle_wheels_sheet_chromakey_raw.png` から単輪で再クロップした。
