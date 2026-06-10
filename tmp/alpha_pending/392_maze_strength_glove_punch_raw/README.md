> ⚠️ **文字化けチェック**: この行が読めない場合、UTF-8 で開き直してください (VS Code: コマンドパレット → "Reopen with Encoding" → "UTF-8")。 詳細: AGENTS.md §0.1 / §4 ルール 7
> ℹ️ **PowerShell 5.1 注記**: 素の `Get-Content <file>` は CP932 解釈で化けて見えますが **false positive** (ファイル本体は UTF-8 で正常)。 読み直し手順は AGENTS.md §0.1 参照。

# Maze Strength Glove Punch Raw

- `strength_glove_left_right_punch_raw.png`: 左右の岩くだき用グローブ raw シート。
- 左パネルが左手、右パネルが右手。
- Photoshop で alpha 抜き・切り出し後、必要なら以下の名前で配置:
  - `assets/images/maze/gimmicks/strength/glove_punch_left.png`
  - `assets/images/maze/gimmicks/strength/glove_punch_right.png`

今回の実装は既存 `glove_pair_item.png` を左右に分けてフォールバック表示し、右手/左手の交互パンチアニメーションを先に入れています。
