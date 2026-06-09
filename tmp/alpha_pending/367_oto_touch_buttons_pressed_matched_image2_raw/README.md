> ⚠️ **文字化けチェック**: この行が読めない場合、UTF-8 で開き直してください (VS Code: コマンドパレット → "Reopen with Encoding" → "UTF-8")。 詳細: AGENTS.md §0.1 / §4 ルール 7
> ℹ️ **PowerShell 5.1 注記**: 素の `Get-Content <file>` は CP932 解釈で化けて見えますが **false positive** (ファイル本体は UTF-8 で正常)。 読み直し手順は AGENTS.md §0.1 参照。

# Oto Touch Pressed Button Sheets - Matched Image 2 Raw

`tmp/alpha_pending/364_oto_touch_buttons_image2_raw/` の通常状態ボタンを参照して、GPT Image 2 の image-to-image 編集で作成した押下状態 raw シートです。

`tmp/alpha_pending/366_oto_touch_buttons_pressed_image2_raw/` は押下状態としては作られていたものの、元画像と比べてボタンの大きさ・形状差が大きかったため、この `367` を採用版として作り直しました。

## Files

- `sheet_katakana_doremi_pressed_matched_image2_raw.png`
- `sheet_roman_cdefgabc_pressed_matched_image2_raw.png`
- `sheet_animal_silhouettes_pressed_matched_image2_raw.png`

## Notes

- ローカル生成、ローカル描画、リサイズ、切り抜き、アルファ抜きは行っていません。
- Image 2 の出力を raw PNG として保存しています。
- 3 枚ともキャンバスは元画像と同じ `1774x887` です。
- 外接範囲の最終チェック:
  - カタカナ: content delta `-5px / +8px`
  - ローマ字: content delta `-4px / -2px`
  - 動物シルエット: content delta `-3px / -4px`
