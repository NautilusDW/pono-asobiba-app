> ⚠️ **文字化けチェック**: この行が読めない場合、UTF-8 で開き直してください (VS Code: コマンドパレット → "Reopen with Encoding" → "UTF-8")。 詳細: AGENTS.md §0.1 / §4 ルール 8
> ℹ️ **PowerShell 5.1 注記**: 素の `Get-Content <file>` は CP932 解釈で化けて見えますが **false positive** (ファイル本体は UTF-8 で正常)。 読み直し手順は AGENTS.md §0.1 参照。

# StickerBook book_bonus Regen

Batch: `1000-stickerbook-book-bonus-regen`
Tool: built-in GPT Image 2 image generation

## Raw Files

- `raw/book_bonus_cover_friends_raw_1254x1254.png`
  - 1254 x 1254
  - 表紙用。ポノ、ママ、ハリネズミ、アヒルを一枚絵として再生成。
- `raw/book_bonus_inside_friends_raw_1228x1281.png`
  - 1228 x 1281
  - 中ページ用。ページ面のみ、下端にポノ、ハリネズミ、アヒル。

## Implemented Assets

- `assets/_PonoSubmarine/Art/UI/StickerBook3D/sb3d_book_bonus_cover_front_friends_20260701.webp`
  - 1254 x 1254
- `assets/_PonoSubmarine/Art/UI/StickerBook3D/sb3d_book_bonus_free_blank_page_friends_20260701.webp`
  - 1472 x 1536

## Notes

- 旧 `sb3d_book_bonus_cover_front_pono_mama_20260701.webp` / `sb3d_book_bonus_free_blank_page_pono_20260701.webp` は低品質版として削除し、`book_bonus` の参照から外した。
- `Prototypes/StickerBookThreeJS/main.js` の `ASSET_VERSION` と `index.html` の module query は `20260701-1000`。
