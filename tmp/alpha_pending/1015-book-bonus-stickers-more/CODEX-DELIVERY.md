> ⚠️ **文字化けチェック**: この行が読めない場合、UTF-8 で開き直してください (VS Code: コマンドパレット → "Reopen with Encoding" → "UTF-8")。 詳細: AGENTS.md §0.1 / §4 ルール 8
> ℹ️ **PowerShell 5.1 注記**: 素の `Get-Content <file>` は CP932 解釈で化けて見えますが **false positive** (ファイル本体は UTF-8 で正常)。 読み直し手順は AGENTS.md §0.1 参照。

# Book Bonus Sticker Raw Candidates

Batch: `1015-book-bonus-stickers-more`
Date: 2026-07-01
Worker: Codex

## 目的

えほん購入特典シールの追加 raw 候補。既存の絵本表紙
`assets/_PonoSubmarine/Art/UI/StickerBook3D/sb3d_book_bonus_cover_front_friends_armfix_20260701.webp`
を正参照にして、ママ・ポノ・白いアヒル・ハリネズミの関係性を揃え直した。

## 参照

- 正参照: `sb3d_book_bonus_cover_front_friends_armfix_20260701.webp`
- 既存特典シール参照: `assets/ui/gacha/stickers/book_bonus_*_20260701.png`
- 方針: 白いアヒルを仲間として扱い、黄色いアヒル/ひよこは入れない

## Raw Files

- `raw/book_bonus_more_cover_friends_mama_raw_20260701.png`
  - 表紙構図寄せ。右上に木からのぞくママ、左下にポノ、中央に白いアヒル、右下にハリネズミ。
- `raw/book_bonus_more_storybook_present_raw_20260701.png`
  - ポノと白いアヒルが白紙の絵本を見せ、ママが木の陰から見守る案。
- `raw/book_bonus_more_white_duck_friend_raw_20260701.png`
  - 白いアヒルを主役にした仲間シール案。ポノとハリネズミを添える。
- `raw/book_bonus_more_storybook_charm_raw_20260701.png`
  - 白紙の絵本と、ポノ/白いアヒル/ハリネズミ/ママの小さなチャーム風案。

## メモ

- 直前の「ママ単体参照」寄せの生成は、絵本表紙のママと違って見えるため候補から外した。
- 4枚とも GPT Image 2 生成 raw。透明背景の die-cut sticker 想定だが、正式実装前に alpha/crop/最適化の確認が必要。
- まだ `assets/ui/gacha/stickers/` への配置、`assets/data/game-stickers.json` への登録、cache/sw 更新は行っていない。
