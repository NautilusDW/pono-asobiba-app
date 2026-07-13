> ⚠️ **文字化けチェック**: この行が読めない場合、UTF-8 で開き直してください (VS Code: コマンドパレット → "Reopen with Encoding" → "UTF-8")。 詳細: AGENTS.md §0.1 / §4 ルール 8
> ℹ️ **PowerShell 5.1 注記**: 素の `Get-Content <file>` は CP932 解釈で化けて見えますが **false positive** (ファイル本体は UTF-8 で正常)。 読み直し手順は AGENTS.md §0.1 参照。

# 1276 タイトル／シールちょう 押下ボタン

## 目的

通常画は変えず、指やEnter／Spaceで押している短い間だけ、木枠の内面が物理的に沈んだと分かるGPT Image 2押下画へ切り替える。選択中／モード中の永続状態とは分離する。

## 共通GPT Image 2 edit brief

- use case: `precise-object-edit`
- input: 各normal assetをedit targetにする
- preserve: canvas寸法、外周alpha silhouette、木枠形状、全日本語文字、icon、sparkle、色、配置、縮尺、camera、top-left lighting
- change only pressed depth: cream faceを暖色のまま約0.92〜0.96 brightnessへ、上／左の内側seam shadowを強化、下側の浮いたhighlightと外影を圧縮、face内の内容を表示上2〜3px下げる
- avoid: 全体scale、crop、zoom、rotation、灰色disabled tint、文字の書き直し／誤字、icon追加削除、blur、extra text、logo、watermark
- raw: `raw/`へ非破壊保存。最終実装版はnormalのalpha maskとnative寸法を正本に派生する

## StickerBook 8点

1. `mode_view_pressed` — 868×272
2. `mode_paste_pressed` — final 868×272
3. `cover_pressed` — 868×272
4. `museum_pressed` — 868×272
5. `settings_pressed` — 320×320
6. `prev_pressed` — 320×320
7. `next_pressed` — 320×320
8. `page_label_pressed` — 620×190

## タイトル 7点

1. `daily_gacha_entry_pressed` — 1839×568。焼込文字は完全固定、新しい残数badgeはHTML側なので画像へ追加しない
2. `book_unlock_plate_pressed` — 1973×632。別icon／HTML文字は画像へ追加しない
3. `daily_challenge_maze_pressed` — 1773×680
4. `daily_challenge_quizland_pressed` — 1773×680
5. `daily_challenge_oto_pressed` — 1773×680
6. `daily_challenge_puzzle_pressed` — 1773×680
7. `daily_challenge_bento_pressed` — 1773×680

## 再利用／非生成

- 右下3ボタン: 既存joined pressed 3枚を維持
- ゲームcard: 既存`play_button_pressed.webp`を親`.game-card:active`へ正しく接続
- プロフィール: dynamic avatar／どんぐりと合成するため既存2px沈み込みCSSを維持
- 設定内もどる等: 既存CSS押下を維持
- 非表示album切替／未使用back asset: dead assetを増やさない

## 生成・実装結果

- GPT Image 2 built-in editを15回実行。rawはすべてRGB PNG（native alphaなし）として`raw/`へ非破壊保存。
- StickerBook raw: 横長4点 1677〜2179×722〜938、正方形3点 1254×1254、page label 1759×894。
- タイトルraw: gacha 2140×735、book plate 2180×721、daily 5点 2017〜2045×769〜780。
- 最終版は各normalのalpha channel／native canvas寸法を正本として、生成画のvisible button面をcrop＋Lanczos scale後にalpha mergeした。通常→押下で透明外形は完全一致する。
- StickerBook 8点はRGBA PNG、145〜398KB。タイトル7点はalpha WebP、195〜270KB。全点3MB未満。
- 比較シート: `/tmp/stickerbook_pressed_pairs_1276.png`、`/tmp/title_pressed_pairs_1276.png`。誤字、矢印方向、icon欠損、枠切れ、gray disabled誤読なし。
- コード接続: StickerBookは8押下画＋best-effort prefetch＋CSS fallback、タイトルはgacha／book／daily 5押下画、既存game-card pressed再配線、既存bottom-nav/profile維持、splash CSS押下。
