> ⚠️ **文字化けチェック**: この行が読めない場合、UTF-8 で開き直してください (VS Code: コマンドパレット → "Reopen with Encoding" → "UTF-8")。 詳細: AGENTS.md §0.1 / §4 ルール 8
> ℹ️ **PowerShell 5.1 注記**: 素の `Get-Content <file>` は CP932 解釈で化けて見えますが **false positive** (ファイル本体は UTF-8 で正常)。 読み直し手順は AGENTS.md §0.1 参照。

# 1274 シールちょう「ひょうし」ボタン

## raw候補 1

- `raw/sb3d_ui_button_cover_text_gpt_image2_20260713_raw.png`
- GPT Image 2 built-in edit
- 2058×764 RGB PNG / 1,691,000 bytes
- 3冊の閉じた表紙と「ひょうし」は良好。rawはnative alphaなしのため非破壊保持し、採用後に既存frame alphaを外周mask正本として868×272最終PNGへ派生する。

## 目的

上部の「ひょうし」ボタンを、既存の「みるモード」と同じ木枠・クリーム面・生成文字の完成ボタンへそろえる。旧リボンは使わず、閉じたシールちょうの表紙を選ぶ操作だと伝わる図へ変更する。

## GPT Image 2 edit brief

- edit target: `assets/_PonoSubmarine/Art/UI/StickerBook3D/sb3d_ui_button_mode_view_text_gpt_image2_20260623.png`
- asset type: 文字入りUIボタン完成画
- compatibility target: `みるモード`ボタンの枠・材質・比率・文字調
- composition: 左約38%に少し扇状に重なった3冊の閉じたシールちょう表紙。中央は水色、後ろはピンクと葉色。表紙に小さな星／ハート／葉のシールと短いリング綴じ。右約55%に正確な「ひょうし」。
- preserve: 3.19:1の横長比率、木枠、クリーム色の内面、丸角、ハイライト、外周の透明背景、太いこげ茶の丸い手描き文字
- avoid: リボン、宝石、服、着せ替え、人、目、開いた本、写真立て、余分な文字、英字、ロゴ、透かし

## 生成prompt

Use case: precise-object-edit
Asset type: child-facing Japanese PWA top control, fully baked button art
Input image: edit target and strict style/layout reference
Primary request: keep the entire wooden rounded frame, cream inset panel, lighting, watercolor-gouache texture, canvas ratio, outer transparency, and typographic style unchanged. Replace only the left eye/open-book illustration with three slightly fanned CLOSED sticker-album covers seen from the front: the largest sky-blue cover centered, with a smaller soft-pink and leaf-green cover behind it; give them short gold ring bindings and tiny star, heart, and leaf cover motifs. Replace only the right text with the exact hiragana 「ひょうし」 in the same bold dark-brown rounded hand-lettered style and visual size as the original.
Text (verbatim): 「ひょうし」
Constraints: the button must immediately mean “choose a cover”; left illustration about 38%, text about 55%; preserve generous padding; no other words.
Avoid: ribbon, bow, gemstone, clothing, dress-up imagery, people, eyes, open books, gallery frames, extra text, English, logo, watermark.

## follow-up（候補承認後）

- raw保存先: `raw/sb3d_ui_button_cover_text_gpt_image2_20260713_raw.png`
- 最終候補: `assets/_PonoSubmarine/Art/UI/StickerBook3D/sb3d_ui_button_cover_text_gpt_image2_20260713.png`

rawを保持したまま透過端を確認し、868×272へ整形、PNG最適化、versioned assetとして`assets/`へ配置、CSS接続、responsive寸法統一、SW/PAGE/PONOバンプ、回帰／staging確認を行う。

---

# 1274 シールミュージアムボタン

## 目的

端末依存のHTML fontと左へ寄りすぎたiconをやめ、`みるモード`／新`ひょうし`と同じ868×272木枠・生成文字の完成ボタンへそろえる。表示名は既存どおり2行「シール」「ミュージアム」。

## GPT Image 2 edit brief

- edit target: `assets/_PonoSubmarine/Art/UI/StickerBook3D/sb3d_ui_button_mode_view_text_gpt_image2_20260623.png`
- supporting icon reference: `assets/_PonoSubmarine/Art/UI/StickerBook3D/sb3d_ui_button_exhibition_gallery_20260704.png`
- composition: 左約36%の中央へ、金色の小さなmuseum展示室。中央に額入りの星シール、下に短い赤ロープ。左端へ寄せず、内枠から十分な余白を取る。右約58%へ2行文字。
- text verbatim: 1行目「シール」、2行目「ミュージアム」
- preserve: みるモードの木枠、クリーム面、太い濃茶の丸い手描き文字、比率、透明外周
- avoid: 左端密着、建物全景、人物、開いた本、目、リボン、余分な文字、英字、ロゴ、透かし

## 保存先

- raw: `raw/sb3d_ui_button_museum_text_gpt_image2_20260713_raw.png`
- 最終候補: `assets/_PonoSubmarine/Art/UI/StickerBook3D/sb3d_ui_button_museum_text_gpt_image2_20260713.png`

## raw候補 1 / 採用結果

- 1828×860 RGB PNG / 1,696,729 bytes
- 金色の展示室、中央の星シール、2行の「シール」「ミュージアム」が正確で、左寄りも解消されているため採用。
- raw 2点はそのまま非破壊保持。既存の`みるモード`完成ボタンから外周alphaだけをmask正本として再利用し、黒い生成余白を均等cropして868×272 RGBAへ整形した。
- 最終2点は、既存ボタンと同じ比率・透明な四隅・3MB未満を確認して`assets/`へ配置した。
