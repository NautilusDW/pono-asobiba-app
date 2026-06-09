> ⚠️ **文字化けチェック**: この行が読めない場合、UTF-8 で開き直してください (VS Code: コマンドパレット → "Reopen with Encoding" → "UTF-8")。 詳細: AGENTS.md §0.1 / §4 ルール 7
> ℹ️ **PowerShell 5.1 注記**: 素の `Get-Content <file>` は CP932 解釈で化けて見えますが **false positive** (ファイル本体は UTF-8 で正常)。 読み直し手順は AGENTS.md §0.1 参照。

# Oto Touch Button Assets - Batch 364

オトタッチ用の追加ボタン素材です。既存 `assets/images/oto/buttons/` のステッチ風円ボタンを基準に、文字は正確性優先でローカル描画しています。

## 出力

- `sheet_katakana_doremi_4x2.png` - ド / レ / ミ / ファ / ソ / ラ / シ / ド
- `sheet_roman_cdefgabc_4x2.png` - C / D / E / F / G / A / B / C
- `sheet_animal_silhouettes_4x2.png` - cat / dog / cow / pig / horse / lion / frog / crow
- `preview_all_24_buttons.png` - 白背景プレビュー
- `btn_note_katakana_*.png` - 512x512 個別PNG 8枚
- `btn_note_roman_*.png` - 512x512 個別PNG 8枚
- `btn_note_animal_*.png` - 512x512 個別PNG 8枚
- `manifest.json` - note index とファイル対応

## 動物対応

オトタッチ本体 `oto/index.html` の `ANIMAL_FILES` と同じ順序です。

| idx | note | asset |
|---:|---|---|
| 0 | ド | `btn_note_animal_cat.png` |
| 1 | レ | `btn_note_animal_dog.png` |
| 2 | ミ | `btn_note_animal_cow.png` |
| 3 | ファ | `btn_note_animal_pig.png` |
| 4 | ソ | `btn_note_animal_horse.png` |
| 5 | ラ | `btn_note_animal_lion.png` |
| 6 | シ | `btn_note_animal_frog.png` |
| 7 | ド | `btn_note_animal_crow.png` |

## 備考

- AI 生成の文字崩れを避けるため、カタカナとローマ字は Noto Sans JP / Arial Bold で正確に描画。
- 動物シルエットは既存 `assets/images/ocean/*/*_normal_1.png` を元に輪郭化。
- 本番 `assets/` への配置と `sw.js` バンプは未実施。
