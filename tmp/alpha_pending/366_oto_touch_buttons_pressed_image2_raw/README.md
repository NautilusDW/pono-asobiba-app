> ⚠️ **文字化けチェック**: この行が読めない場合、UTF-8 で開き直してください (VS Code: コマンドパレット → "Reopen with Encoding" → "UTF-8")。 詳細: AGENTS.md §0.1 / §4 ルール 7
> ℹ️ **PowerShell 5.1 注記**: 素の `Get-Content <file>` は CP932 解釈で化けて見えますが **false positive** (ファイル本体は UTF-8 で正常)。 読み直し手順は AGENTS.md §0.1 参照。

# Oto Touch Pressed Button Assets - Image 2 Raw

Image 2 で生成した押下状態 raw 素材です。ローカル生成、ローカル描画、アルファ抜き、切り抜き、文字の後描きはしていません。

## Files

- `sheet_katakana_doremi_pressed_image2_raw.png`
  - ド / レ / ミ / ファ / ソ / ラ / シ / ド
- `sheet_roman_cdefgabc_pressed_image2_raw.png`
  - C / D / E / F / G / A / B / C
- `sheet_animal_silhouettes_pressed_image2_raw.png`
  - cat / dog / cow / pig / horse / lion / frog / crow

## Pressed State Direction

- 通常状態より沈み込んだ丸ボタン
- 外側影は弱め
- 内側影は強め
- リムは少し圧縮
- ハイライトは小さめ・低め
- 中央の文字/モチーフも少し inset に見える

## Notes

- 通常状態は `tmp/alpha_pending/364_oto_touch_buttons_image2_raw/`。
- 本番 `assets/images/oto/buttons/` への配置と `sw.js` バンプは未実施。
