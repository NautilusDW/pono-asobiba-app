> ⚠️ **文字化けチェック**: この行が読めない場合、UTF-8 で開き直してください (VS Code: コマンドパレット → "Reopen with Encoding" → "UTF-8")。 詳細: AGENTS.md §0.1 / §4 ルール 7
> ℹ️ **PowerShell 5.1 注記**: 素の `Get-Content <file>` は CP932 解釈で化けて見えますが **false positive** (ファイル本体は UTF-8 で正常)。 読み直し手順は AGENTS.md §0.1 参照。

# OtoTouch Rhythm Rival Reaction Sheets

Created by Codex with the built-in Image2 image generation route. These are raw generated PNGs only.
No alpha removal, cropping, or local retouching has been performed.

## Files

- `dj_kerock_reactions_3x3_raw.png`
  - DJ ケロック: idle point, smug taunt, DJ attack, laugh, surprise, frustration, dizzy defeat, panic, impressed thumbs-up.
- `neji_maestro_reactions_3x3_raw.png`
  - ネジマエストロ: conductor idle, smug baton point, gear-note attack, laugh, surprise, steam frustration, drooping defeat, malfunction panic, impressed bow.
- `beat_king_gaohn_reactions_3x3_raw.png`
  - ビートキング ガオーン: boss idle, royal taunt, drum attack, happy roar, surprise, frustration, defeated sit, panic, impressed thumbs-up.

## Intended Use

Each sheet is a 3x3 grid for game-screen real-time reactions:

1. Normal / idle
2. Taunt / cheeky line
3. Attack / note drop
4. Happy when player misses
5. Surprised when player succeeds
6. Frustrated
7. Defeated
8. Panic / losing streak
9. Respect / impressed

Next step: user alpha-removes and crops the panels locally, then final assets can be placed under `assets/images/oto/rhythm/rivals/`.
