> ⚠️ **文字化けチェック**: この行が読めない場合、UTF-8 で開き直してください (VS Code: コマンドパレット → "Reopen with Encoding" → "UTF-8")。 詳細: AGENTS.md §0.1 / §4 ルール 8
> ℹ️ **PowerShell 5.1 注記**: 素の `Get-Content <file>` は CP932 解釈で化けて見えますが **false positive** (ファイル本体は UTF-8 で正常)。 読み直し手順は AGENTS.md §0.1 参照。

# StickerBook Mama Arm Fix

Batch: `1001-stickerbook-mama-arm-fix`
Tool: built-in GPT Image 2 image edit

## Raw File

- `raw/book_bonus_cover_mama_arm_fix_raw_1254x1254.png`
  - 1254 x 1254
  - `book_bonus` 表紙のママの腕だけを自然な向きへ修正。

## Implemented Asset

- `assets/_PonoSubmarine/Art/UI/StickerBook3D/sb3d_book_bonus_cover_front_friends_armfix_20260701.webp`
  - 1254 x 1254

## Notes

- 中ページは変更なし。
- 旧 `sb3d_book_bonus_cover_front_friends_20260701.webp` は腕の向きが不自然だったため削除し、`book_bonus` の表紙参照を armfix 版へ差し替えた。
- `Prototypes/StickerBookThreeJS/main.js` の `ASSET_VERSION` と `index.html` の module query は `20260701-1001`。
